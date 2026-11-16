-- =====================================================================
-- Mappa Carichi · Daily task (mail tecniche e commerciali) e Persone nei carichi
-- Si esegue una volta in Supabase → SQL Editor. Si può rieseguire: non cancella nulla.
-- Regole: ognuno inserisce, modifica ed elimina solo le proprie attività;
-- l'Admin vede le attività di tutti (report settimanale) ma non modifica quelle degli altri;
-- il Visitatore non vede questa sezione.
-- NIENTE SI CANCELLA: "Annulla" nasconde l'attività dal report ma la riga resta;
-- ogni modifica salva prima la versione precedente in app_daily_storico.
-- =====================================================================

create table if not exists public.app_daily (
  id         text primary key,
  person     text not null,                       -- nome della persona collegata (non si cancella se la persona viene tolta)
  day        date not null,
  kind       text not null check (kind in ('Tecnica','Commerciale')),
  n          int  not null check (n between 1 and 500),
  what       text not null default '',             -- quali mail: cliente, oggetto, richiesta
  prio       text not null check (prio in ('Alta','Media','Bassa')),
  diff       int  not null check (diff between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_daily add column if not exists annullata boolean not null default false;
alter table public.app_daily add column if not exists annullata_at timestamptz;

-- storico delle versioni precedenti (mai cancellato)
create table if not exists public.app_daily_storico (
  sid        bigserial primary key,
  id         text not null,
  person     text not null,
  day        date not null,
  kind       text not null,
  n          int  not null,
  what       text not null,
  prio       text not null,
  diff       int  not null,
  annullata  boolean not null default false,
  azione     text not null,                        -- 'modifica' o 'annulla'
  salvata_at timestamptz not null default now()
);
create index if not exists app_daily_storico_id_idx on public.app_daily_storico(id);
alter table public.app_daily_storico enable row level security;
revoke all on public.app_daily_storico from anon, authenticated;

create index if not exists app_daily_day_idx on public.app_daily(day);
create index if not exists app_daily_person_idx on public.app_daily(person);
alter table public.app_daily enable row level security;
revoke all on public.app_daily from anon, authenticated;

create or replace function public._daily_json(r public.app_daily) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object('id', r.id, 'person', r.person, 'day', to_char(r.day, 'YYYY-MM-DD'), 'kind', r.kind,
    'n', r.n, 'what', r.what, 'prio', r.prio, 'diff', r.diff);
$$;

-- elenco delle attività tra due date (from, to inclusi)
create or replace function public.app_daily_list(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; d1 date; d2 date;
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin','guest') then raise exception 'NON_AUTORIZZATO'; end if;
  d1 := coalesce((p->>'from')::date, current_date - 6);
  d2 := coalesce((p->>'to')::date, current_date);
  if d2 - d1 > 400 then d1 := d2 - 400; end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(public._daily_json(r) order by r.day, r.person, r.created_at), '[]'::jsonb)
    from public.app_daily r
    where not r.annullata and r.day between d1 and d2 and (s.role = 'admin' or r.person = s.name)));
end $$;

-- nuova attività o modifica di una propria attività
create or replace function public.app_daily_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; j jsonb := p->'item'; did text; ex public.app_daily;
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin','guest') then raise exception 'NON_AUTORIZZATO'; end if;
  did := left(btrim(coalesce(j->>'id','')), 64);
  if did = '' then return jsonb_build_object('error', 'Attività non valida.'); end if;
  select * into ex from public.app_daily where id = did;
  if ex.id is not null and ex.person <> s.name then raise exception 'NON_AUTORIZZATO'; end if;
  if ex.id is not null and ex.annullata then return jsonb_build_object('error', 'Attività annullata: inseriscine una nuova.'); end if;
  if coalesce(j->>'kind','') not in ('Tecnica','Commerciale') then return jsonb_build_object('error', 'Scegli se le mail sono tecniche o commerciali.'); end if;
  if coalesce(j->>'prio','') not in ('Alta','Media','Bassa') then return jsonb_build_object('error', 'Scegli la priorità.'); end if;
  if ex.id is not null then
    insert into public.app_daily_storico(id, person, day, kind, n, what, prio, diff, annullata, azione)
    values (ex.id, ex.person, ex.day, ex.kind, ex.n, ex.what, ex.prio, ex.diff, ex.annullata, 'modifica');
  end if;
  insert into public.app_daily(id, person, day, kind, n, what, prio, diff)
  values (did, s.name, (j->>'day')::date, j->>'kind', greatest(1, least(500, (j->>'n')::int)),
          left(btrim(coalesce(j->>'what','')), 2000), j->>'prio', greatest(1, least(5, (j->>'diff')::int)))
  on conflict (id) do update set day = excluded.day, kind = excluded.kind, n = excluded.n, what = excluded.what,
    prio = excluded.prio, diff = excluded.diff, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- "Annulla" di una propria attività: la riga resta nel database (annullata = true) e finisce anche nello storico
create or replace function public.app_daily_annulla(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; ex public.app_daily;
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin','guest') then raise exception 'NON_AUTORIZZATO'; end if;
  select * into ex from public.app_daily where id = p->>'id' and person = s.name and not annullata;
  if ex.id is null then return jsonb_build_object('ok', true); end if;
  insert into public.app_daily_storico(id, person, day, kind, n, what, prio, diff, annullata, azione)
  values (ex.id, ex.person, ex.day, ex.kind, ex.n, ex.what, ex.prio, ex.diff, ex.annullata, 'annulla');
  update public.app_daily set annullata = true, annullata_at = now(), updated_at = now() where id = ex.id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._daily_json(public.app_daily) from public, anon, authenticated;
revoke all on function public.app_daily_list(jsonb), public.app_daily_save(jsonb), public.app_daily_annulla(jsonb) from public;
grant execute on function public.app_daily_list(jsonb), public.app_daily_save(jsonb), public.app_daily_annulla(jsonb) to anon, authenticated;

-- =====================================================================
-- Persone nei carichi: l'Admin sceglie chi compare in mappa, calendario, dashboard e storico
-- (anche gli Admin: Sì o No). Chi è su "No" resta nell'elenco persone e i suoi progetti restano salvati:
-- non compare solo nelle viste dei carichi. Nessun dato viene cancellato.
-- Valore: oggetto JSON { "Nome Cognome": false } in app_settings; chi non è indicato compare (Sì).
-- =====================================================================
insert into public.app_settings(key, value) values ('carichi_persone', '{}') on conflict (key) do nothing;

create or replace function public.app_carichi_get(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  s := public._sess(p->>'token');
  return jsonb_build_object('persone', coalesce((select value::jsonb from public.app_settings where key = 'carichi_persone'), '{}'::jsonb));
end $$;

create or replace function public.app_carichi_set(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; n text;
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
  n := coalesce(public._canon(p->>'name'), left(btrim(coalesce(p->>'name','')), 80));
  if n = '' then return jsonb_build_object('error', 'Persona non valida.'); end if;
  insert into public.app_settings(key, value) values ('carichi_persone', '{}') on conflict (key) do nothing;
  update public.app_settings
     set value = (coalesce(value::jsonb, '{}'::jsonb) || jsonb_build_object(n, coalesce((p->>'si')::boolean, true)))::text
   where key = 'carichi_persone';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.app_carichi_get(jsonb), public.app_carichi_set(jsonb) from public;
grant execute on function public.app_carichi_get(jsonb), public.app_carichi_set(jsonb) to anon, authenticated;
