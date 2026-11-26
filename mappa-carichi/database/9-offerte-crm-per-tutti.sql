-- =====================================================================
-- Mappa carichi · SQL 9 · Offerte e Report CRM visibili a tutti (26/11/2026)
-- Richiesta di Marco: "permetti di vedere a tutti offerte e CRM".
-- Cambia SOLO le due funzioni di lettura: ora le usa ogni utente collegato
-- (admin, colleghi, visitatori). L'importazione resta solo per l'admin.
-- Non cancella e non modifica nessun dato. Si può rieseguire.
-- Prima serve l'SQL 8 (8-offerte-crm.sql).
-- =====================================================================

create or replace function public.app_offerte(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  s := public._sess(p->>'token');
  -- lettura per tutti gli utenti collegati (SQL 9, 26/11/2026); _sess blocca le sessioni non valide
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(jsonb_build_object('o', oggetto, 's', stato, 'f', famiglia, 'p', to_jsonb(persone), 'm', mese, 'w', giorno, 't', tipo,
      'r', nullif(regarding, ''), 'n', attivita, 'c', fonte) order by id), '[]'::jsonb)
    from public.app_offerte));
end $$;

create or replace function public.app_crm_attivita(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  s := public._sess(p->>'token');
  -- lettura per tutti gli utenti collegati (SQL 9, 26/11/2026); _sess blocca le sessioni non valide
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(jsonb_build_array(to_char(quando, 'YYYY-MM-DD HH24:MI'), persona, owner, oggetto, tipo, tema, pratica, regarding) order by quando desc), '[]'::jsonb)
    from public.app_crm_attivita));
end $$;

grant execute on function public.app_offerte(jsonb), public.app_crm_attivita(jsonb) to anon, authenticated;

-- controllo: le due funzioni non contengono più il blocco per ruolo
select p.proname as funzione,
       case when pg_get_functiondef(p.oid) like '%NON_AUTORIZZATO%' then 'ANCORA SOLO ADMIN/VISITATORI' else 'ok: visibile a tutti' end as stato
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('app_offerte', 'app_crm_attivita');
