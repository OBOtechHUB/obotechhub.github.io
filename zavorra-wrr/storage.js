// Archivio dei calcoli su Supabase (tabella public.calcoli_zavorra: SQL 14 + SQL 17 zavorra-progetti.sql).
// Un calcolo è un "progetto" della zavorra: si apre, si modifica e si salva da solo (ogni versione precedente
// va nello storico). Si può collegare a un progetto di Progettazione LPS: lo vedono anche i colleghi con cui
// quel progetto è condiviso. Nulla si cancella.

const TABLE = 'calcoli_zavorra';
const BASE = 'id, created_at, cliente, progetto, telaio, inclinazione, vento, metodo, risultato_kg, per_lato_kg, da_verificare, stato';
const NUOVI = ', progetto_lps, codice_crm, aggiornato_il';
const mancaSql = (e) => /column|schema cache|does not exist|telaio_check/i.test(e?.message || '');

export function createStorage(supabase) {
  if (!supabase) return null;
  let completo = true; // false finché non è eseguito il SQL 17

  return {
    get completo() { return completo; },
    async getUser() { const { data } = await supabase.auth.getUser(); return data?.user ?? null; },
    onAuthChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
      return () => data?.subscription?.unsubscribe();
    },

    async list() {
      let r = await supabase.from(TABLE).select(BASE + NUOVI).order('aggiornato_il', { ascending: false }).limit(300);
      if (r.error && mancaSql(r.error)) { completo = false; r = await supabase.from(TABLE).select(BASE).order('created_at', { ascending: false }).limit(300); }
      if (r.error) throw r.error;
      return r.data;
    },
    async get(id) {
      const { data, error } = await supabase.from(TABLE).select(BASE + (completo ? NUOVI : '')).eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },

    /** crea (senza id) o aggiorna il calcolo; restituisce l'id */
    async save({ id, cliente, progetto, codice, progettoLps, state, result, table }) {
      const row = {
        cliente: cliente || null,
        progetto: progetto || null,
        telaio: state.frame,
        inclinazione: state.pitch,
        vento: state.wind,
        metodo: state.calcMode,
        apparecchiature: structuredClone(state.devs),
        risultato_kg: !result || result.err ? null : Math.ceil(result.total),
        per_lato_kg: !result || result.err || result.perSide == null ? null : Math.ceil(result.perSide),
        da_verificare: !!result && !result.err && !!result.paren,
        tabella: table,
        stato: structuredClone(state),
      };
      if (completo) Object.assign(row, { codice_crm: codice || null, progetto_lps: progettoLps || null });
      const q = id ? supabase.from(TABLE).update(row).eq('id', id) : supabase.from(TABLE).insert(row);
      const { data, error } = await q.select('id').single();
      if (error) {
        if (mancaSql(error)) throw new Error(/W1000|W1500/.test(state.frame) || /telaio_check/.test(error.message) ? 'Per salvare i telai a parete e collegare i progetti va eseguito in Supabase il SQL 17 (zavorra-progetti.sql).' : 'Per collegare i progetti va eseguito in Supabase il SQL 17 (zavorra-progetti.sql).');
        throw error;
      }
      return data.id;
    },

    /** progetti di Progettazione LPS: miei e condivisi con me */
    async progettiLps() {
      const { data: u } = await supabase.auth.getUser(); if (!u?.user) return [];
      const [miei, cond] = await Promise.all([
        supabase.from('progetti').select('id, codice, nome').eq('utente', u.user.id).order('data_modifica', { ascending: false }).limit(300),
        supabase.rpc('progetti_condivisi_con_me'),
      ]);
      const out = (miei.data || []).map((p) => ({ ...p, condiviso: false }));
      for (const p of cond.error ? [] : cond.data || []) if (!out.some((x) => x.id === p.id)) out.push({ id: p.id, codice: p.codice, nome: p.nome, condiviso: true });
      return out;
    },

    // Regola di OBO Hub: i calcoli salvati non si cancellano (si tiene tutto lo storico).
    async remove() { throw new Error('I calcoli salvati restano nell\'archivio.'); },
  };
}
