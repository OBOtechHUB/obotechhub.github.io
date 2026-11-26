-- =====================================================================
-- Mappa carichi · SQL 11 · Importazione dell'export CRM per tutti i colleghi (26/11/2026)
-- Richiesta di Marco: "rendilo visibile a tutti" (pulsante Importa export CRM).
-- Cambia SOLO il controllo del ruolo delle due funzioni di importazione:
-- ora possono importare l'admin e i colleghi; i visitatori restano in sola lettura.
-- L'importazione non cancella mai nulla: aggiunge le attività nuove (doppioni ignorati)
-- e aggiorna le conversazioni. Si può rieseguire. Prima servono SQL 8, 9 e 10.
-- =====================================================================

create or replace function public.app_offerte_importa(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; r jsonb; nuove int := 0; aggiornate int := 0; vecchia public.app_offerte; g date;
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin', 'guest') then raise exception 'NON_AUTORIZZATO'; end if; -- admin e colleghi (SQL 11), non i visitatori
  if jsonb_typeof(p->'righe') <> 'array' or jsonb_array_length(p->'righe') > 20000 then raise exception 'DATI_NON_VALIDI'; end if;
  for r in select * from jsonb_array_elements(p->'righe') loop
    if coalesce(r->>'crm_id', '') !~ '^crm-[a-z0-9]{1,20}$' or coalesce(trim(r->>'oggetto'), '') = '' then continue; end if;
    g := nullif(r->>'giorno', '')::date;
    select * into vecchia from public.app_offerte where crm_id = r->>'crm_id';
    if vecchia.id is null then
      insert into public.app_offerte (oggetto, stato, famiglia, persone, mese, giorno, tipo, crm_id, regarding, attivita, fonte, importato_at)
      values (left(r->>'oggetto', 500), coalesce(nullif(r->>'stato', ''), 'IN VALUTAZIONE'), coalesce(nullif(r->>'famiglia', ''), 'Non determinabile dall''oggetto'),
        coalesce(array(select jsonb_array_elements_text(r->'persone')), '{}'), nullif(r->>'mese', ''), g, coalesce(nullif(r->>'tipo', ''), 'offerta'),
        r->>'crm_id', left(coalesce(r->>'regarding', ''), 300), greatest(1, coalesce((r->>'attivita')::int, 1)), 'crm', now());
      nuove := nuove + 1;
    else
      insert into public.app_offerte_storico (offerta, riga) values (vecchia.id, to_jsonb(vecchia));
      update public.app_offerte set
        persone = array(select distinct x from unnest(vecchia.persone || coalesce(array(select jsonb_array_elements_text(r->'persone')), '{}')) x order by 1),
        giorno = greatest(vecchia.giorno, g), mese = to_char(greatest(vecchia.giorno, g), 'YYYY-MM'),
        stato = case when r->>'stato' = 'EVASE' then 'EVASE' else vecchia.stato end,
        attivita = greatest(vecchia.attivita, coalesce((r->>'attivita')::int, 1)),
        regarding = case when vecchia.regarding = '' then left(coalesce(r->>'regarding', ''), 300) else vecchia.regarding end,
        importato_at = now()
      where id = vecchia.id;
      aggiornate := aggiornate + 1;
    end if;
    vecchia := null;
  end loop;
  return jsonb_build_object('nuove', nuove, 'aggiornate', aggiornate);
end $$;

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

revoke all on function public.app_offerte_importa(jsonb), public.app_crm_attivita_importa(jsonb) from public;
grant execute on function public.app_offerte_importa(jsonb), public.app_crm_attivita_importa(jsonb) to anon, authenticated;

-- controllo: deve dire "admin e colleghi" per tutte e due
select p.proname as funzione,
       case when pg_get_functiondef(p.oid) like '%''admin'', ''guest''%' then 'admin e colleghi' else 'ANCORA SOLO ADMIN' end as chi_importa
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('app_offerte_importa', 'app_crm_attivita_importa');
