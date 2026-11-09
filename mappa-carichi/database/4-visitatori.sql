-- OBO Hub · ACCESSO VISITATORI (sola consultazione, per esterni: es. sales promoter)
-- Il visitatore entra da OBO Hub (link .../?visitatore) e vede tutte le app tranne Admin.
-- Eseguire nel SQL Editor di Supabase dopo 3-accesso-obo-hub.sql. Si può rieseguire.
-- Il visitatore entra con il proprio nome + la password visitatori, senza account e senza Authenticator,
-- e può SOLO vedere: tutto tranne Admin, anche Offerte e Download (nessun salvataggio). La password la imposta l'amministratore
-- in OBO Hub → Admin → Impostazioni.

create or replace function public.app_login_visitatore(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare vn text := left(btrim(coalesce(p->>'name', '')), 60); pw text := coalesce(p->>'pw', ''); atteso text;
begin
  perform public._throttle('visitatore');
  select value into atteso from public.app_settings where key = 'visitor_pw';
  if coalesce(atteso, '') = '' or length(atteso) < 6 then return jsonb_build_object('error', 'Accesso visitatori non attivo.'); end if;
  if length(vn) < 2 then return jsonb_build_object('error', 'Scrivi il tuo nome (almeno 2 caratteri).'); end if;
  if pw <> atteso then
    insert into public.app_attempts(k) values ('visitatore');
    return jsonb_build_object('error', 'Password visitatori errata.');
  end if;
  return jsonb_build_object('token', public._new_session(vn, 'visitor'), 'name', vn, 'role', 'visitor');
end $$;
grant execute on function public.app_login_visitatore(jsonb) to anon, authenticated;

-- password visitatori: la legge e la cambia solo l'amministratore di OBO Hub
create or replace function public.mappa_password_visitatori() returns text
language sql stable security definer set search_path = public as $$
  select case when public.e_admin() then (select value from public.app_settings where key = 'visitor_pw') else null end;
$$;
create or replace function public.mappa_imposta_password_visitatori(pw text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.e_admin() then raise exception 'NON_AUTORIZZATO'; end if;
  if coalesce(pw, '') <> '' and length(pw) < 6 then raise exception 'La password visitatori deve avere almeno 6 caratteri.'; end if;
  insert into public.app_settings(key, value) values ('visitor_pw', pw) on conflict (key) do update set value = excluded.value;
  delete from public.app_sessions where role = 'visitor'; -- chi era dentro con la vecchia password deve rientrare
end $$;
grant execute on function public.mappa_password_visitatori(), public.mappa_imposta_password_visitatori(text) to authenticated;

-- la vecchia password "visitatore" non vale più: finché l'admin non ne imposta una nuova l'accesso visitatori è chiuso
update public.app_settings set value = '' where key = 'visitor_pw' and value = 'visitatore';

-- I visitatori vedono tutto tranne Admin: anche la sezione Offerte (sola lettura).
-- Questa funzione sostituisce quella dello script delle offerte (che resta fuori da GitHub): stessi dati, in più il ruolo visitatore.
do $$ begin
  if to_regclass('public.app_offerte') is not null then
    execute $f$
      create or replace function public.app_offerte(p jsonb default '{}') returns jsonb
      language plpgsql security definer set search_path = public as $b$
      declare s public.app_sessions;
      begin
        s := public._sess(p->>'token');
        if s.role not in ('admin', 'visitor') then raise exception 'NON_AUTORIZZATO'; end if;
        return jsonb_build_object('items', (
          select coalesce(jsonb_agg(jsonb_build_object('o', oggetto, 's', stato, 'f', famiglia, 'p', to_jsonb(persone), 'm', mese, 'w', giorno, 't', tipo) order by id), '[]'::jsonb)
          from public.app_offerte));
      end $b$;
    $f$;
    revoke all on function public.app_offerte(jsonb) from public;
    grant execute on function public.app_offerte(jsonb) to anon, authenticated;
  end if;
end $$;

-- OBO Hub e Progettazione LPS controllano che la sessione visitatore sia ancora valida (senza registrare un accesso)
create or replace function public.app_visitatore_valido(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  begin s := public._sess(p->>'token'); exception when others then return jsonb_build_object('ok', false); end;
  if s.role <> 'visitor' then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'name', s.name);
end $$;
grant execute on function public.app_visitatore_valido(jsonb) to anon, authenticated;
