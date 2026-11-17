-- =====================================================================
-- Mappa Carichi · Daily task: tempo di gestione per ogni attività e ore nella Mappa dei carichi
-- Si esegue una volta in Supabase → SQL Editor, DOPO 5-daily-task-e-persone.sql. Si può rieseguire.
-- Aggiunge solo una colonna e aggiorna le funzioni: nessun dato viene cancellato o modificato.
-- =====================================================================

alter table public.app_daily add column if not exists ore numeric(5,2) check (ore is null or (ore > 0 and ore <= 24));
alter table public.app_daily_storico add column if not exists ore numeric(5,2);

create or replace function public._daily_json(r public.app_daily) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object('id', r.id, 'person', r.person, 'day', to_char(r.day, 'YYYY-MM-DD'), 'kind', r.kind,
    'n', r.n, 'what', r.what, 'prio', r.prio, 'diff', r.diff, 'ore', r.ore);
$$;

-- salvataggio: ora chiede anche il tempo di gestione (ore, es. 0.25 = 15 minuti)
create or replace function public.app_daily_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; j jsonb := p->'item'; did text; ex public.app_daily; o numeric;
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
  o := nullif(j->>'ore','')::numeric;
  if o is null or o <= 0 or o > 24 then return jsonb_build_object('error', 'Indica il tempo di gestione.'); end if;
  if ex.id is not null then
    insert into public.app_daily_storico(id, person, day, kind, n, what, prio, diff, annullata, azione, ore)
    values (ex.id, ex.person, ex.day, ex.kind, ex.n, ex.what, ex.prio, ex.diff, ex.annullata, 'modifica', ex.ore);
  end if;
  insert into public.app_daily(id, person, day, kind, n, what, prio, diff, ore)
  values (did, s.name, (j->>'day')::date, j->>'kind', greatest(1, least(500, (j->>'n')::int)),
          left(btrim(coalesce(j->>'what','')), 2000), j->>'prio', greatest(1, least(5, (j->>'diff')::int)), round(o, 2))
  on conflict (id) do update set day = excluded.day, kind = excluded.kind, n = excluded.n, what = excluded.what,
    prio = excluded.prio, diff = excluded.diff, ore = excluded.ore, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.app_daily_annulla(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; ex public.app_daily;
begin
  s := public._sess(p->>'token');
  if s.role not in ('admin','guest') then raise exception 'NON_AUTORIZZATO'; end if;
  select * into ex from public.app_daily where id = p->>'id' and person = s.name and not annullata;
  if ex.id is null then return jsonb_build_object('ok', true); end if;
  insert into public.app_daily_storico(id, person, day, kind, n, what, prio, diff, annullata, azione, ore)
  values (ex.id, ex.person, ex.day, ex.kind, ex.n, ex.what, ex.prio, ex.diff, ex.annullata, 'annulla', ex.ore);
  update public.app_daily set annullata = true, annullata_at = now(), updated_at = now() where id = ex.id;
  return jsonb_build_object('ok', true);
end $$;

-- totali per persona e giorno (ore di gestione e numero di mail) per Mappa dei carichi e pagina Persone:
-- li vede chiunque sia entrato, come le ore dei progetti; il dettaglio delle mail resta visibile solo a chi le ha inserite e all'Admin
create or replace function public.app_daily_ore(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.app_sessions; d1 date; d2 date;
begin
  s := public._sess(p->>'token');
  d1 := coalesce((p->>'from')::date, current_date - 120);
  d2 := coalesce((p->>'to')::date, current_date + 7);
  if d2 - d1 > 400 then d1 := d2 - 400; end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(jsonb_build_object('person', person, 'day', to_char(day, 'YYYY-MM-DD'), 'ore', ore, 'n', n, 't', t) order by day, person), '[]'::jsonb)
    from (select person, day, coalesce(sum(ore), 0) as ore, sum(n) as n, sum(case when kind = 'Tecnica' then n else 0 end) as t
          from public.app_daily where not annullata and day between d1 and d2 group by person, day) x));
end $$;

revoke all on function public.app_daily_ore(jsonb) from public;
grant execute on function public.app_daily_ore(jsonb) to anon, authenticated;
