-- =====================================================================
-- Mappa Carichi - Ufficio Tecnico OBO Italia
-- Schema Supabase completo (database + gestione Admin). Si puo' rieseguire senza perdere dati.
-- Le tabelle NON sono accessibili direttamente dal browser (RLS attiva,
-- nessuna policy): tutto passa dalle funzioni app_* che controllano
-- ruolo e permessi sul server.
-- =====================================================================

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

create table if not exists public.app_people (
  name        text primary key,
  is_admin    boolean not null default false,
  is_visitor  boolean not null default false,  -- nome generico per l'accesso in sola consultazione
  personal_pw text,                       -- password personale del Guest (visibile solo agli admin)
  created_at  timestamptz not null default now()
);

create table if not exists public.app_projects (
  id         text primary key,
  person     text not null references public.app_people(name) on delete cascade on update cascade,
  name       text not null,
  crm        text not null default '',
  prio       text not null default 'Media' check (prio in ('Alta','Media','Bassa')),
  start_date text,
  days       numeric not null default 1,
  hpd        numeric not null default 8,
  dates      jsonb,
  example    boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.app_people add column if not exists is_visitor boolean not null default false;
create index if not exists app_projects_person_idx on public.app_projects(person);

create table if not exists public.app_sessions (
  token      uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null,
  created_at timestamptz not null default now()
);

-- il ruolo 'visitor' (sola consultazione) si aggiunge anche ai database creati prima
alter table public.app_sessions drop constraint if exists app_sessions_role_check;
alter table public.app_sessions add constraint app_sessions_role_check check (role in ('admin','guest','visitor'));

create table if not exists public.app_attempts (
  id bigserial primary key,
  k  text not null,
  at timestamptz not null default now()
);

-- accessi giornalieri (visibili solo all'Admin): una riga per persona e per giorno
create table if not exists public.app_access (
  day      date not null,
  name     text not null,
  role     text not null,
  n        int  not null default 0,
  first_at timestamptz not null default now(),
  last_at  timestamptz not null default now(),
  primary key (day, name)
);

alter table public.app_settings enable row level security;
alter table public.app_people   enable row level security;
alter table public.app_projects enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_access enable row level security;
alter table public.app_attempts enable row level security;
revoke all on public.app_settings, public.app_people, public.app_projects, public.app_sessions, public.app_attempts, public.app_access from anon, authenticated;

-- ---------- dati iniziali (solo la prima volta) ----------
do $seed$
begin
  if not exists (select 1 from public.app_settings where key = 'admin_pw') then
    insert into public.app_settings(key, value) values ('admin_pw','admin'), ('guest_pw','guest');
    insert into public.app_people(name, is_admin) values
      ('Marco Lo Vetere', true), ('Persona A', false), ('Persona B', false), ('Persona C', false)
      on conflict (name) do nothing;
    insert into public.app_projects(id, person, name, crm, prio, start_date, days, hpd, example)
    select v.id, v.person, v.name, v.crm, v.prio, to_char(date_trunc('week', current_date)::date + v.off, 'YYYY-MM-DD'), v.days, v.hpd, true
    from (values
      ('ex-1','Persona A','Revisione schede tecniche prodotto','P-2026-0101','Media',0,6,4),
      ('ex-2','Persona A','Offerta tecnica gara cantiere','P-2026-0102','Alta',2,4,5),
      ('ex-3','Persona B','Verifica norme per nuova serie','P-2026-0103','Alta',1,8,6),
      ('ex-4','Persona C','Supporto tecnico fiera di settore','P-2026-0104','Media',7,5,3),
      ('ex-5','Persona C','Aggiornamento disegni CAD','P-2026-0105','Bassa',0,10,2)
    ) as v(id, person, name, crm, prio, off, days, hpd)
    on conflict (id) do nothing;
  end if;
end
$seed$;

-- password standard dell'accesso Visitatore (modificabile dall'Admin)
insert into public.app_settings(key, value) values ('visitor_pw', 'visitatore') on conflict (key) do nothing;

-- nome generico "Visitatore": compare nell'elenco dei Guest e entra solo in consultazione
insert into public.app_people(name, is_visitor) values ('Visitatore', true)
  on conflict (name) do update set is_visitor = true, is_admin = false, personal_pw = null;

-- Luigi Tartaglione non e' piu Admin (se lo era)
update public.app_people set is_admin = false, personal_pw = null where name = 'Luigi Tartaglione' and is_admin;
delete from public.app_sessions where name = 'Luigi Tartaglione' and role = 'admin';

-- ---------- funzioni di servizio (non esposte) ----------
create or replace function public._sess(p_token text) returns public.app_sessions
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  begin
    select * into s from public.app_sessions where token = p_token::uuid and created_at > now() - interval '30 days';
  exception when others then s := null;
  end;
  if s.token is null then raise exception 'SESSIONE_SCADUTA'; end if;
  return s;
end $$;

create or replace function public._proj_json(r public.app_projects) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', r.id, 'person', r.person, 'name', r.name, 'crm', r.crm, 'prio', r.prio,
    'start', r.start_date, 'days', r.days, 'hpd', r.hpd, 'dates', r.dates, 'example', r.example));
$$;

create or replace function public._canon(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select name from public.app_people where lower(name) = lower(btrim(coalesce(p_name,''))) limit 1;
$$;

create or replace function public._throttle(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.app_attempts where at < now() - interval '1 day';
  if (select count(*) from public.app_attempts where k = lower(p_key) and at > now() - interval '10 minutes') >= 8 then
    raise exception 'TROPPI_TENTATIVI';
  end if;
end $$;

create or replace function public._new_session(p_name text, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  insert into public.app_sessions(name, role) values (p_name, p_role) returning token into t;
  perform public._log_access(p_name, p_role, true);
  return t::text;
end $$;

-- registra l'accesso del giorno (giorno secondo l'ora italiana); n conta gli ingressi con password
create or replace function public._log_access(p_name text, p_role text, p_login boolean) returns void
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Europe/Rome')::date; nm text := case when p_role = 'visitor' then p_name || ' (visitatore)' else p_name end;
begin
  if p_role = 'admin' then return; end if; -- gli Admin non vengono registrati
  insert into public.app_access(day, name, role, n) values (d, nm, p_role, case when p_login then 1 else 0 end)
  on conflict (day, name) do update
    set last_at = now(), role = excluded.role, n = public.app_access.n + case when p_login then 1 else 0 end
    where p_login or public.app_access.last_at < now() - interval '5 minutes';
end $$;

-- ---------- API ----------
-- elenco nomi per la schermata di accesso (nessun dato sensibile)
create or replace function public.app_public_people(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('people', coalesce(jsonb_agg(jsonb_build_object('name', name, 'is_admin', is_admin, 'is_visitor', is_visitor) order by name), '[]'::jsonb))
  from public.app_people;
$$;

create or replace function public.app_login(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n text; per public.app_people; pw text := coalesce(p->>'pw',''); vn text;
begin
  if p->>'role' = 'visitor' then
    perform public._throttle('visitatore');
    vn := left(btrim(coalesce(p->>'name','')), 60);
    if length(vn) < 2 then return jsonb_build_object('error','Scrivi il tuo nome (almeno 2 caratteri).'); end if;
    if pw <> (select value from public.app_settings where key='visitor_pw') then
      insert into public.app_attempts(k) values ('visitatore'); return jsonb_build_object('error','Password Visitatore errata.');
    end if;
    return jsonb_build_object('token', public._new_session(vn,'visitor'), 'name', vn, 'role', 'visitor');
  end if;
  n := public._canon(p->>'name');
  perform public._throttle(coalesce(n, 'sconosciuto'));
  if n is null then return jsonb_build_object('error','Nome non registrato.'); end if;
  select * into per from public.app_people where name = n;
  if p->>'role' = 'admin' then
    if not per.is_admin or pw <> (select value from public.app_settings where key='admin_pw') then
      insert into public.app_attempts(k) values (lower(n)); return jsonb_build_object('error','Password Admin errata.');
    end if;
    return jsonb_build_object('token', public._new_session(n,'admin'), 'name', n, 'role', 'admin');
  end if;
  if per.is_admin then return jsonb_build_object('error','Questo nome è un Admin: usa l''accesso Admin.'); end if;
  if per.is_visitor then
    if pw <> (select value from public.app_settings where key='visitor_pw') then
      insert into public.app_attempts(k) values (lower(n)); return jsonb_build_object('error','Password Visitatore errata.');
    end if;
    return jsonb_build_object('token', public._new_session(n,'visitor'), 'name', n, 'role', 'visitor');
  end if;
  if per.personal_pw is not null then
    if pw <> per.personal_pw then insert into public.app_attempts(k) values (lower(n)); return jsonb_build_object('error','Password errata.'); end if;
    return jsonb_build_object('token', public._new_session(n,'guest'), 'name', n, 'role', 'guest');
  end if;
  if pw <> (select value from public.app_settings where key='guest_pw') then
    insert into public.app_attempts(k) values (lower(n)); return jsonb_build_object('error','Password Guest errata.');
  end if;
  return jsonb_build_object('first', true, 'name', n);
end $$;

create or replace function public.app_first_password(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n text; per public.app_people; np text := coalesce(p->>'new','');
begin
  n := public._canon(p->>'name');
  perform public._throttle(coalesce(n, 'sconosciuto'));
  if n is null then return jsonb_build_object('error','Nome non registrato.'); end if;
  select * into per from public.app_people where name = n;
  if per.is_admin or per.personal_pw is not null then return jsonb_build_object('error','Password personale già impostata. Rientra con quella.'); end if;
  if coalesce(p->>'std','') <> (select value from public.app_settings where key='guest_pw') then
    insert into public.app_attempts(k) values (lower(n)); return jsonb_build_object('error','Password Guest errata.');
  end if;
  if length(np) < 4 then return jsonb_build_object('error','La nuova password deve avere almeno 4 caratteri.'); end if;
  if np in (select value from public.app_settings) then return jsonb_build_object('error','Scegli una password diversa da quella standard.'); end if;
  update public.app_people set personal_pw = np where name = n;
  return jsonb_build_object('token', public._new_session(n,'guest'), 'name', n, 'role', 'guest');
end $$;

create or replace function public.app_logout(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  begin delete from public.app_sessions where token = (p->>'token')::uuid; exception when others then null; end;
  return '{}'::jsonb;
end $$;

create or replace function public.app_state(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; out jsonb;
begin
  s := public._sess(p->>'token');
  perform public._log_access(s.name, s.role, false);
  out := jsonb_build_object(
    'role', s.role, 'name', s.name,
    'people',   (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'is_admin', is_admin, 'is_visitor', is_visitor) order by name), '[]'::jsonb) from public.app_people),
    'projects', (select coalesce(jsonb_agg(public._proj_json(r) order by r.updated_at, r.id), '[]'::jsonb) from public.app_projects r));
  if s.role = 'admin' then
    out := out || jsonb_build_object('secrets', jsonb_build_object(
      'admin', (select value from public.app_settings where key='admin_pw'),
      'guest', (select value from public.app_settings where key='guest_pw'),
      'visitor', (select value from public.app_settings where key='visitor_pw'),
      'personal', (select coalesce(jsonb_object_agg(name, personal_pw), '{}'::jsonb) from public.app_people where personal_pw is not null)));
  end if;
  return out;
end $$;

create or replace function public.app_projects_sync(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; j jsonb; pid text; per text; ex public.app_projects; denied int := 0; pr text; dups text[] := '{}';
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin','guest') then raise exception 'NON_AUTORIZZATO'; end if; -- il Visitatore non modifica nulla
  for j in select * from jsonb_array_elements(coalesce(p->'upserts','[]'::jsonb)) loop
    pid := left(btrim(coalesce(j->>'id','')), 64);
    if pid = '' or btrim(coalesce(j->>'name','')) = '' then denied := denied + 1; continue; end if;
    select * into ex from public.app_projects where id = pid;
    if s.role = 'guest' then
      if ex.id is not null and ex.person <> s.name then denied := denied + 1; continue; end if;
      per := s.name;
    else
      per := public._canon(j->>'person');
      if per is null then
        per := left(btrim(coalesce(j->>'person','')), 80);
        if per = '' then denied := denied + 1; continue; end if;
        insert into public.app_people(name) values (per) on conflict do nothing;
      end if;
    end if;
    -- il nome del progetto deve essere univoco (senza distinguere maiuscole/minuscole)
    if (ex.id is null or lower(btrim(ex.name)) <> lower(btrim(j->>'name')))
       and exists (select 1 from public.app_projects where lower(btrim(name)) = lower(btrim(j->>'name')) and id <> pid) then
      dups := dups || left(btrim(j->>'name'), 200); denied := denied + 1; continue;
    end if;
    pr := case when j->>'prio' in ('Alta','Media','Bassa') then j->>'prio' else 'Media' end;
    insert into public.app_projects(id, person, name, crm, prio, start_date, days, hpd, dates, example, updated_at)
    values (pid, per, left(btrim(j->>'name'), 200), left(coalesce(j->>'crm',''), 80), pr, j->>'start',
            coalesce((j->>'days')::numeric, 1), coalesce((j->>'hpd')::numeric, 8),
            case when jsonb_typeof(j->'dates') = 'object' then j->'dates' else null end,
            coalesce((j->>'example')::boolean, false), now())
    on conflict (id) do update set person = excluded.person, name = excluded.name, crm = excluded.crm, prio = excluded.prio,
      start_date = excluded.start_date, days = excluded.days, hpd = excluded.hpd, dates = excluded.dates,
      example = excluded.example, updated_at = now();
  end loop;
  for pid in select jsonb_array_elements_text(coalesce(p->'deletes','[]'::jsonb)) loop
    if s.role = 'admin' then delete from public.app_projects where id = pid;
    else delete from public.app_projects where id = pid and person = s.name; end if;
  end loop;
  return jsonb_build_object('denied', denied, 'dup', to_jsonb(dups));
end $$;

create or replace function public.app_people_sync(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; n text;
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  for n in select jsonb_array_elements_text(coalesce(p->'add','[]'::jsonb)) loop
    n := left(btrim(n), 80);
    if n <> '' and public._canon(n) is null then insert into public.app_people(name) values (n); end if;
  end loop;
  for n in select jsonb_array_elements_text(coalesce(p->'remove','[]'::jsonb)) loop
    n := public._canon(n);
    if n is not null then
      delete from public.app_sessions where name = n;
      delete from public.app_people where name = n and not is_admin and not is_visitor;
    end if;
  end loop;
  return '{}'::jsonb;
end $$;

create or replace function public.app_set_passwords(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; a text := coalesce(p->>'admin',''); g text := coalesce(p->>'guest',''); v text := coalesce(p->>'visitor','');
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  if length(a) < 4 or length(g) < 4 then return jsonb_build_object('error','Ogni password deve avere almeno 4 caratteri.'); end if;
  if a = g then return jsonb_build_object('error','La password Admin e la password Guest devono essere diverse.'); end if;
  if v <> '' then
    if length(v) < 4 then return jsonb_build_object('error','La password Visitatore deve avere almeno 4 caratteri.'); end if;
    if v = a or v = g then return jsonb_build_object('error','La password Visitatore deve essere diversa da quelle di Admin e Guest.'); end if;
    update public.app_settings set value = v where key = 'visitor_pw';
  end if;
  update public.app_settings set value = a where key = 'admin_pw';
  update public.app_settings set value = g where key = 'guest_pw';
  return '{}'::jsonb;
end $$;

create or replace function public.app_reset_guest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; n text;
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  n := public._canon(p->>'name');
  if n is not null then
    update public.app_people set personal_pw = null where name = n and not is_admin;
    delete from public.app_sessions where name = n and role = 'guest';
  end if;
  return '{}'::jsonb;
end $$;

-- gli accessi degli Admin non si conservano: elimina quelli gia' registrati
delete from public.app_access where role = 'admin';

-- elenco accessi (solo Admin)
create or replace function public.app_accessi(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(jsonb_build_object('d', day, 'n', name, 'r', role, 'c', n, 'f', first_at, 'l', last_at) order by day, first_at), '[]'::jsonb)
    from public.app_access where role <> 'admin' and day >= (now() at time zone 'Europe/Rome')::date - 120));
end $$;

-- permessi: solo le funzioni pubbliche app_* sono richiamabili dal browser
revoke all on function public._sess(text), public._proj_json(public.app_projects), public._canon(text), public._throttle(text), public._new_session(text,text), public._log_access(text,text,boolean) from public, anon, authenticated;
revoke all on function public.app_public_people(jsonb), public.app_login(jsonb), public.app_first_password(jsonb), public.app_logout(jsonb), public.app_state(jsonb),
  public.app_projects_sync(jsonb), public.app_people_sync(jsonb), public.app_set_passwords(jsonb), public.app_reset_guest(jsonb), public.app_accessi(jsonb) from public;
grant execute on function public.app_public_people(jsonb), public.app_login(jsonb), public.app_first_password(jsonb), public.app_logout(jsonb), public.app_state(jsonb),
  public.app_projects_sync(jsonb), public.app_people_sync(jsonb), public.app_set_passwords(jsonb), public.app_reset_guest(jsonb), public.app_accessi(jsonb) to anon, authenticated;

-- ---------- gestione Admin ----------
create or replace function public.app_admin_add(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; n text; raw text := left(btrim(coalesce(p->>'name','')), 80);
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  if raw = '' then return jsonb_build_object('error','Scrivi il nome.'); end if;
  n := public._canon(raw);
  if n is null then
    insert into public.app_people(name, is_admin) values (raw, true);
  else
    update public.app_people set is_admin = true, personal_pw = null where name = n;
    delete from public.app_sessions where name = n and role = 'guest';
  end if;
  return '{}'::jsonb;
end $$;

create or replace function public.app_admin_remove(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; n text;
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  n := public._canon(p->>'name');
  if n is null then return jsonb_build_object('error','Nome non trovato.'); end if;
  if n = s.name then return jsonb_build_object('error','Non puoi rimuovere te stesso.'); end if;
  if (select count(*) from public.app_people where is_admin) <= 1 then return jsonb_build_object('error','Deve restare almeno un Admin.'); end if;
  update public.app_people set is_admin = false where name = n;
  delete from public.app_sessions where name = n;
  return '{}'::jsonb;
end $$;

revoke all on function public.app_admin_add(jsonb), public.app_admin_remove(jsonb) from public;
grant execute on function public.app_admin_add(jsonb), public.app_admin_remove(jsonb) to anon, authenticated;
