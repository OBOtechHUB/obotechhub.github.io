// Archivio calcoli su Supabase (tabella public.calcoli_zavorra, vedi supabase/migrations).
// Ogni utente vede solo i propri calcoli grazie alle policy RLS.

const TABLE = 'calcoli_zavorra';

export function createStorage(supabase) {
  if (!supabase) return null;

  return {
    async getUser() {
      const { data } = await supabase.auth.getUser();
      return data?.user ?? null;
    },

    onAuthChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
      return () => data?.subscription?.unsubscribe();
    },

    async signIn(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) throw error;
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async list() {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, created_at, cliente, progetto, telaio, inclinazione, vento, metodo, risultato_kg, per_lato_kg, da_verificare, stato')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },

    async save({ cliente, progetto, state, result, table }) {
      const row = {
        cliente: cliente || null,
        progetto: progetto || null,
        telaio: state.frame,
        inclinazione: state.pitch,
        vento: state.wind,
        metodo: state.calcMode,
        apparecchiature: structuredClone(state.devs),
        risultato_kg: result.err ? null : Math.ceil(result.total),
        per_lato_kg: result.err || result.perSide == null ? null : Math.ceil(result.perSide),
        da_verificare: !result.err && !!result.paren,
        tabella: table,
        stato: structuredClone(state),
      };
      const { data, error } = await supabase.from(TABLE).insert(row).select('id').single();
      if (error) throw error;
      return data.id;
    },

    // Regola di OBO Hub: i calcoli salvati non si cancellano (si tiene tutto lo storico).
    async remove() { throw new Error('I calcoli salvati restano nell\'archivio.'); },
  };
}
