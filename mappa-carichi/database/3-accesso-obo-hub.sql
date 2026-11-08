-- Mappa carichi · ACCESSO SOLO DA OBO HUB (password + Microsoft Authenticator)
-- Eseguire nel SQL Editor di Supabase DOPO 1-database.sql (e dopo accessi.sql di Progettazione LPS). Si può rieseguire.
--
-- • Niente più password Admin/Guest/Visitatore della Mappa: si entra solo con l'accesso di OBO Hub (aal2).
-- • Il ruolo nella Mappa (Admin / Guest / Visitatore) e la persona collegata li decide l'amministratore
--   in OBO Hub → Admin → Utenti → "Mappa carichi".
-- • Nessun dato viene cancellato: persone, progetti e storico restano come sono.

alter table public.accessi_profili add column if not exists mappa_ruolo text not null default 'guest';
alter table public.accessi_profili drop constraint if exists accessi_profili_mappa_ruolo_check;
alter table public.accessi_profili add constraint accessi_profili_mappa_ruolo_check check (mappa_ruolo in ('admin', 'guest', 'visitor'));
alter table public.accessi_profili add column if not exists mappa_persona text not null default '';

-- Marco: Admin della Mappa, collegato alla sua persona
update public.accessi_profili set mappa_ruolo = 'admin', mappa_persona = 'Marco Lo Vetere'
where lower(email) = 'lovetere.marco@obo.it' and mappa_persona = '';

-- ---------- ingresso con l'accesso di OBO Hub ----------
create or replace function public.app_login_hub(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare pr public.accessi_profili; n text; vn text;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'Accedi da OBO Hub.', 'code', 'HUB'); end if;
  if not public.utente_abilitato() then return jsonb_build_object('error', 'Completa l''accesso in OBO Hub (password e codice Authenticator).', 'code', 'HUB'); end if;
  select * into pr from public.accessi_profili where utente = auth.uid();
  if not (pr.ruolo = 'admin' or 'tutte' = any(pr.sezioni) or 'app_mappa' = any(pr.sezioni)) then
    return jsonb_build_object('error', 'La Mappa carichi non è abilitata per il tuo account. Chiedi all''amministratore.', 'code', 'NO_APP');
  end if;

  if pr.mappa_ruolo = 'visitor' then
    vn := left(coalesce(nullif(btrim(pr.nome), ''), pr.email), 60);
    return jsonb_build_object('token', public._new_session(vn, 'visitor'), 'name', vn, 'role', 'visitor');
  end if;

  n := public._canon(pr.mappa_persona);
  if n is null and pr.mappa_ruolo = 'admin' then
    -- un Admin senza persona: la crea con il suo nome
    n := left(coalesce(nullif(btrim(pr.mappa_persona), ''), nullif(btrim(pr.nome), ''), pr.email), 80);
    insert into public.app_people(name, is_admin) values (n, true) on conflict (name) do update set is_admin = true;
  end if;
  if n is null then
    return jsonb_build_object('error', 'Il tuo account non è ancora collegato a una persona della Mappa. Chiedi all''amministratore.', 'code', 'NO_PERSONA');
  end if;
  if pr.mappa_ruolo = 'admin' then
    update public.app_people set is_admin = true, is_visitor = false where name = n and not is_admin;
    return jsonb_build_object('token', public._new_session(n, 'admin'), 'name', n, 'role', 'admin');
  end if;
  return jsonb_build_object('token', public._new_session(n, 'guest'), 'name', n, 'role', 'guest');
end $$;
grant execute on function public.app_login_hub(jsonb) to authenticated;
revoke execute on function public.app_login_hub(jsonb) from anon;

-- le vecchie password della Mappa non aprono più nulla
create or replace function public.app_login(p jsonb) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('error', 'Accesso solo da OBO Hub.');
$$;
create or replace function public.app_first_password(p jsonb) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('error', 'Accesso solo da OBO Hub.');
$$;
-- chiude le sessioni aperte con le vecchie password
delete from public.app_sessions;

-- ---------- per la pagina Admin di OBO Hub: elenco delle persone della Mappa ----------
create or replace function public.mappa_persone() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.e_admin() then
    coalesce((select jsonb_agg(jsonb_build_object('name', name, 'is_admin', is_admin, 'is_visitor', is_visitor) order by name) from public.app_people), '[]'::jsonb)
  else '[]'::jsonb end;
$$;
grant execute on function public.mappa_persone() to authenticated;

-- l'amministratore aggiunge una persona alla Mappa direttamente da OBO Hub
create or replace function public.mappa_aggiungi_persona(nome text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.e_admin() then raise exception 'NON_AUTORIZZATO'; end if;
  if length(btrim(coalesce(nome, ''))) < 2 then raise exception 'Nome non valido'; end if;
  insert into public.app_people(name) values (left(btrim(nome), 80)) on conflict (name) do nothing;
end $$;
grant execute on function public.mappa_aggiungi_persona(text) to authenticated;
