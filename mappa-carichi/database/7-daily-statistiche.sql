-- =====================================================================
-- Mappa Carichi · Daily task: statistiche per il Cruscotto (numero di attività, difficoltà, priorità)
-- Si esegue una volta in Supabase → SQL Editor, DOPO 6-daily-tempo.sql. Si può rieseguire.
-- Aggiunge solo una funzione di lettura: nessuna tabella, nessun dato viene creato, modificato o cancellato.
-- Restituisce solo totali per persona e giorno (nessun testo delle attività).
-- =====================================================================

create or replace function public.app_daily_stat(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; d1 date; d2 date;
begin
  s := public._sess(p->>'token');
  d1 := coalesce((p->>'from')::date, current_date - 120);
  d2 := coalesce((p->>'to')::date, current_date + 7);
  if d2 - d1 > 400 then d1 := d2 - 400; end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'person', person, 'day', to_char(day, 'YYYY-MM-DD'), 'ore', ore, 'n', n, 't', t,
      'k', k, 'sd', sd, 'pa', pa, 'pm', pm, 'pb', pb) order by day, person), '[]'::jsonb)
    from (select person, day,
                 coalesce(sum(ore), 0) as ore, sum(n) as n,
                 sum(case when kind = 'Tecnica' then n else 0 end) as t,
                 count(*) as k, sum(diff) as sd,
                 count(*) filter (where prio = 'Alta') as pa,
                 count(*) filter (where prio = 'Media') as pm,
                 count(*) filter (where prio = 'Bassa') as pb
          from public.app_daily where not annullata and day between d1 and d2 group by person, day) x));
end $$;

revoke all on function public.app_daily_stat(jsonb) from public;
grant execute on function public.app_daily_stat(jsonb) to anon, authenticated;
