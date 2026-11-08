// Configurazione di OBO Hub.
// URL e chiave PUBBLICA (publishable) del progetto Supabase di Progettazione LPS: è pensata per stare nel sito,
// i dati sono protetti dalle regole RLS. Non mettere MAI qui la chiave "secret" o "service_role".
export const CONFIG = {
  supabaseUrl: "https://qzfosidvjsyivaibnadf.supabase.co",
  supabaseKey: "sb_publishable_4ZA8X-l1eNBTfhLahViHdg_Ih3aO38L",
  lps: "/lps/",
};

// Le app di OBO Hub. Per aggiungerne una nuova basta un elemento in più.
// abilitataSe: riceve le sezioni abilitate all'utente (Admin → Utenti → Cambia sezioni).
export const APP = [
  {
    id: "lps",
    nome: "Progettazione LPS",
    descrizione: "Protezione contro i fulmini secondo CEI EN IEC 62305: analisi del rischio, captazione 3D, calate, terra, SPD, computo e particolari OBO.",
    icona: "fulmine",
    url: "/lps/",
    abilitataSe: (sezioni) => sezioni.some((s) => !s.startsWith("app_")),
  },
  {
    id: "mappa",
    nome: "Mappa carichi ufficio tecnico",
    descrizione: "Chi lavora su cosa, quanto è carico e dove c'è spazio per darsi una mano: progetti, giorni, ore e offerte.",
    icona: "carichi",
    url: "mappa-carichi/",
    abilitataSe: (sezioni) => sezioni.includes("app_mappa"),
  },
  {
    id: "admin",
    nome: "Amministrazione",
    descrizione: "Richieste di accesso, utenti, app e sezioni abilitate, progetti salvati e registro degli accessi.",
    icona: "admin",
    url: "/lps/admin",
    soloAdmin: true,
  },
];
