-- =====================================================================
-- Mappa Carichi · 8) Offerte dall'export del CRM ("Closed Activities", da novembre 2026)
-- Si esegue una volta in Supabase → SQL Editor. Si può rieseguire. NON CANCELLA NULLA:
--  - le conversazioni già presenti restano;
--  - quelle del CRM si aggiungono (una riga per conversazione, chiave crm_id);
--  - se una conversazione arriva di nuovo, si aggiornano solo persone, ultimo giorno, numero di email e stato
--    (da IN VALUTAZIONE a EVASE), e la versione precedente va nello storico.
-- Importazione: solo Admin, dalla sezione Offerte → «Importa export CRM (.xlsx)».
-- ATTENZIONE: non rieseguire più il vecchio script 2-offerte.sql, perché svuota la tabella prima di ricaricarla.
-- =====================================================================

create table if not exists public.app_offerte (
  id       bigserial primary key,
  oggetto  text not null,
  stato    text not null,
  famiglia text not null,
  persone  text[] not null default '{}',
  mese     text,
  giorno   date,
  tipo     text not null default 'offerta'
);
alter table public.app_offerte add column if not exists giorno date;
alter table public.app_offerte add column if not exists tipo text not null default 'offerta';
alter table public.app_offerte add column if not exists crm_id text;
alter table public.app_offerte add column if not exists regarding text not null default '';
alter table public.app_offerte add column if not exists attivita int not null default 1;
alter table public.app_offerte add column if not exists fonte text not null default 'storico';
alter table public.app_offerte add column if not exists importato_at timestamptz;
create unique index if not exists app_offerte_crm_uq on public.app_offerte (crm_id);
alter table public.app_offerte enable row level security;
revoke all on public.app_offerte from anon, authenticated;

create table if not exists public.app_offerte_storico (
  sid        bigserial primary key,
  offerta    bigint not null,
  riga       jsonb not null,
  salvata_at timestamptz not null default now()
);
alter table public.app_offerte_storico enable row level security;
revoke all on public.app_offerte_storico from anon, authenticated;

-- lettura (Admin e Visitatori), con il progetto CRM collegato e il numero di email
create or replace function public.app_offerte(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions;
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin', 'visitor') then raise exception 'NON_AUTORIZZATO'; end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(jsonb_build_object('o', oggetto, 's', stato, 'f', famiglia, 'p', to_jsonb(persone), 'm', mese, 'w', giorno, 't', tipo,
      'r', nullif(regarding, ''), 'n', attivita, 'c', fonte) order by id), '[]'::jsonb)
    from public.app_offerte));
end $$;

-- importazione dall'export del CRM (righe già raggruppate per conversazione dal browser)
create or replace function public.app_offerte_importa(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; r jsonb; nuove int := 0; aggiornate int := 0; vecchia public.app_offerte; g date;
begin
  s := public._sess(p->>'token');
  if s.role <> 'admin' then raise exception 'NON_AUTORIZZATO'; end if;
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

revoke all on function public.app_offerte(jsonb), public.app_offerte_importa(jsonb) from public;
grant execute on function public.app_offerte(jsonb), public.app_offerte_importa(jsonb) to anon, authenticated;

-- controllo
select fonte, count(*) from public.app_offerte group by fonte;
