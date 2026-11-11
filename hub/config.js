// Configurazione di OBO Hub.
// URL e chiave PUBBLICA (publishable) del progetto Supabase di Progettazione LPS: è pensata per stare nel sito,
// i dati sono protetti dalle regole RLS. Non mettere MAI qui la chiave "secret" o "service_role".
export const CONFIG = {
  supabaseUrl: "https://qzfosidvjsyivaibnadf.supabase.co",
  supabaseKey: "sb_publishable_4ZA8X-l1eNBTfhLahViHdg_Ih3aO38L",
  lps: "/appOBOtechHUB/",
};

// Le app di OBO Hub. Per aggiungerne una nuova basta un elemento in più.
// abilitataSe: riceve le sezioni abilitate all'utente (Admin → Utenti → Cambia sezioni).
export const APP = [
  {
    id: "lps",
    nome: "Progettazione LPS",
    nome_en: "LPS Design",
    descrizione_en: "Lightning protection to CEI EN IEC 62305: risk assessment, 3D air-termination, down conductors, earthing, SPD, bill of materials and OBO details.",
    descrizione: "Protezione contro i fulmini secondo CEI EN IEC 62305: analisi del rischio, captazione 3D, calate, terra, SPD, computo e particolari OBO.",
    icona: "fulmine",
    url: "/appOBOtechHUB/",
    abilitataSe: (sezioni) => sezioni.some((s) => !s.startsWith("app_")),
  },
  {
    id: "mappa",
    nome: "Mappa carichi ufficio tecnico",
    nome_en: "Technical office workload map",
    descrizione_en: "Who is working on what, how busy everyone is and where there is room to help: projects, days, hours and quotes.",
    descrizione: "Chi lavora su cosa, quanto è carico e dove c'è spazio per darsi una mano: progetti, giorni, ore e offerte.",
    icona: "carichi",
    url: "mappa-carichi/",
    abilitataSe: (sezioni) => sezioni.includes("app_mappa"),
  },
  {
    id: "prodotti",
    nome: "Prodotti OBO",
    nome_en: "OBO products",
    descrizione: "Tutto il catalogo di obo.it aggiornato ogni notte: ricerca di prodotti, articoli e notizie, più codici insieme e novità in evidenza.",
    descrizione_en: "The whole obo.it catalogue updated every night: search products, articles and news, several codes at once and new items highlighted.",
    icona: "prodotti",
    url: "prodotti/",
    // si abilita per persona (Amministrazione → Utenti → Cambia sezioni → Prodotti OBO); i visitatori la vedono
    abilitataSe: (sezioni) => sezioni.includes("app_prodotti"),
  },
  {
    id: "torrette",
    nome: "Configuratore torrette",
    nome_en: "Service outlet configurator",
    descrizione: "Torrette a pavimento OBO (GES R2, GESR9…): scegli famiglia, modello e configurazione e scarica la distinta con i codici.",
    descrizione_en: "OBO floor service outlets (GES R2, GESR9…): choose family, model and configuration and download the parts list with codes.",
    icona: "torretta",
    url: "torrette/",
    // In preparazione: per ora la vede solo l'amministratore. Quando sarà pronta: abilitataSe: (s) => s.includes("app_torrette")
    soloAdmin: true,
  },
  {
    id: "manutenzione",
    nome: "Manutenzione app",
    nome_en: "App maintenance",
    descrizione: "Metti in manutenzione un'app di OBO Hub o una sezione di Progettazione LPS, senza toccare i dati salvati.",
    descrizione_en: "Put an OBO Hub app or a section of LPS Design under maintenance, without touching saved data.",
    icona: "manutenzione",
    url: "manutenzione-admin.html",
    soloAdmin: true,
  },
  {
    id: "admin",
    nome: "Amministrazione",
    nome_en: "Administration",
    descrizione_en: "Access requests, users, enabled apps and sections, saved projects and access log.",
    descrizione: "Richieste di accesso, utenti, app e sezioni abilitate, progetti salvati e registro degli accessi.",
    icona: "admin",
    url: "/appOBOtechHUB/admin",
    soloAdmin: true,
  },
];
