-- =====================================================================
-- Mappa carichi · SQL 10 · Import CRM incrementale senza doppioni (26/11/2026)
-- Richiesta di Marco: l'export del CRM va trattato come incrementale; se nel
-- file ci sono attività già importate (o ripetute) non vanno contate.
--
-- Cosa fa (non cancella nulla, si può rieseguire; prima servono SQL 8 e 9):
--  1. app_crm_attivita: nuova colonna crm_id (la conversazione della sezione Offerte).
--  2. app_crm_attivita_importa: ogni attività entra una sola volta (chiave = Activity id
--     del CRM); le righe ripetute nel file o già presenti vengono ignorate e contate a
--     parte ("doppioni"). Se un'attività già presente non aveva crm_id, lo completa.
--  3. Dopo ogni importazione il numero di email delle conversazioni toccate viene
--     ricalcolato dalle attività realmente presenti (niente più conteggi gonfiati o
--     persi con file parziali o sovrapposti).
-- =====================================================================

alter table public.app_crm_attivita add column if not exists crm_id text;
create index if not exists app_crm_attivita_crm_id on public.app_crm_attivita (crm_id);

create or replace function public.app_crm_attivita_importa(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; inviate int; uniche int; nuove int := 0; completate int := 0; toccate text[];
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin', 'guest') then raise exception 'NON_AUTORIZZATO'; end if; -- admin e colleghi (SQL 11), non i visitatori
  if jsonb_typeof(p->'righe') <> 'array' or jsonb_array_length(p->'righe') > 5000 then raise exception 'DATI_NON_VALIDI'; end if;
  inviate := jsonb_array_length(p->'righe');

  create temp table if not exists _crm_in (id text primary key, quando timestamp, persona text, owner text, oggetto text, tipo text, tema text, pratica text, regarding text, crm_id text) on commit drop;
  truncate _crm_in;
  -- una riga per Activity id (le ripetizioni nello stesso file si scartano qui)
  insert into _crm_in
  select distinct on (left(r->>'id', 60))
    left(r->>'id', 60), (r->>'quando')::timestamp, left(coalesce(r->>'persona', ''), 80), left(coalesce(r->>'owner', ''), 120), left(coalesce(r->>'oggetto', ''), 500),
    case when r->>'tipo' in ('Risposta', 'Inoltro', 'Nuova', 'Task') then r->>'tipo' else 'Nuova' end, left(coalesce(r->>'tema', 'Oggetto generico'), 80),
    left(coalesce(r->>'pratica', ''), 300), left(coalesce(r->>'regarding', ''), 300),
    case when coalesce(r->>'crm_id', '') ~ '^crm-[a-z0-9]{1,20}$' then r->>'crm_id' end
  from jsonb_array_elements(p->'righe') r
  where coalesce(r->>'id', '') <> '' and coalesce(r->>'quando', '') ~ '^\d{4}-\d{2}-\d{2}'
  order by left(r->>'id', 60);
  get diagnostics uniche = row_count;

  -- solo le attività nuove
  insert into public.app_crm_attivita (id, quando, persona, owner, oggetto, tipo, tema, pratica, regarding, crm_id)
  select i.id, i.quando, i.persona, i.owner, i.oggetto, i.tipo, i.tema, i.pratica, i.regarding, i.crm_id
  from _crm_in i where not exists (select 1 from public.app_crm_attivita a where a.id = i.id);
  get diagnostics nuove = row_count;

  -- attività già presenti senza conversazione collegata: si completa solo crm_id (il resto non cambia)
  update public.app_crm_attivita a set crm_id = i.crm_id
  from _crm_in i where a.id = i.id and a.crm_id is null and i.crm_id is not null;
  get diagnostics completate = row_count;

  -- conteggio email delle conversazioni toccate = attività presenti (mai sotto il valore storico se non ci sono attività)
  select coalesce(array_agg(distinct crm_id), '{}') into toccate from _crm_in where crm_id is not null;
  update public.app_offerte o set attivita = greatest(1, c.n)
  from (select crm_id, count(*)::int n from public.app_crm_attivita where crm_id = any(toccate) group by crm_id) c
  where o.crm_id = c.crm_id and o.attivita is distinct from greatest(1, c.n);

  return jsonb_build_object('nuove', nuove, 'doppioni', inviate - nuove, 'ripetute_nel_file', inviate - uniche, 'completate', completate);
end $$;

revoke all on function public.app_crm_attivita_importa(jsonb) from public;
grant execute on function public.app_crm_attivita_importa(jsonb) to anon, authenticated;

-- controllo
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'app_crm_attivita' and column_name = 'crm_id') as colonna_crm_id,
       (select count(*) from public.app_crm_attivita) as attivita_crm,
       (select count(*) from public.app_crm_attivita where crm_id is null) as attivita_senza_conversazione;
