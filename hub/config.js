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
// intro / intro_en: cosa fa l'app, per chi non l'ha ancora abilitata (scheda bloccata con «Richiedi l'accesso»).
// richiesta: id dell'app nella richiesta all'amministratore (tabella richieste_app, SQL 21); senza, l'app non si richiede.
export const APP = [
  {
    id: "progetti",
    nome: "Progetti",
    nome_en: "Projects",
    descrizione: "Un solo progetto con il numero CRM per tutte le app: LPS, zavorra WRR, torrette e carichi della Mappa, condiviso con i colleghi.",
    descrizione_en: "One project with the CRM number for all apps: LPS, WRR ballast, service outlets and workload map, shared with colleagues.",
    icona: "cartella",
    url: "progetti.html",
    visitatori: false,
    abilitataSe: () => true,
  },
  {
    id: "lps",
    nome: "Progettazione LPS",
    nome_en: "LPS Design",
    descrizione_en: "Lightning protection to CEI EN IEC 62305: risk assessment, 3D air-termination, down conductors, earthing, SPD, bill of materials and OBO details.",
    descrizione: "Protezione contro i fulmini secondo CEI EN IEC 62305: analisi del rischio, captazione 3D, calate, terra, SPD, computo e particolari OBO.",
    icona: "fulmine",
    url: "/appOBOtechHUB/",
    richiesta: "lps",
    intro: ["Analisi del rischio secondo CEI EN IEC 62305-2 e Guida CEI 81-29, con la relazione in Word.", "Edificio in 3D da disegni CAD, PDF, IFC o dalla mappa; captazione con sfera rotolante, maglia e aste OBO.", "Calate, distanza di separazione, isCon, impianto di terra e scelta degli SPD.", "Computo dei materiali con i codici OBO, particolari costruttivi e tavole per AutoCAD e ZWCAD.", "Impianti d'antenna su palo con calate isolate isCon."],
    intro_en: ["Risk assessment to IEC 62305-2 and the Italian CEI 81-29 guide, with the Word report.", "3D building from CAD, PDF, IFC or the map; air-termination with rolling sphere, mesh and OBO rods.", "Down conductors, separation distance, isCon, earthing and SPD selection.", "Bill of materials with OBO codes, construction details and drawings for AutoCAD and ZWCAD.", "Antenna masts with isCon insulated down conductors."],
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
    richiesta: "mappa",
    intro: ["Progetti dell'ufficio tecnico con giorni e ore per persona.", "Mappa dei carichi, calendario e cruscotto: chi è libero e chi è pieno.", "Daily task: le mail tecniche e commerciali gestite ogni giorno.", "Offerte e report delle attività dal CRM."],
    intro_en: ["Technical office projects with days and hours per person.", "Workload map, calendar and dashboard: who is free and who is busy.", "Daily tasks: technical and sales emails handled each day.", "Quotes and activity reports from the CRM."],
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
    richiesta: "prodotti",
    intro: ["Tutto il catalogo obo.it, aggiornato ogni notte.", "Ricerca per nome, codice o più codici insieme.", "Nuovi prodotti in evidenza e download in Excel."],
    intro_en: ["The whole obo.it catalogue, updated every night.", "Search by name, code or several codes at once.", "New products highlighted and Excel download."],
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
    id: "zavorra",
    nome: "Zavorra telai inverter WRR",
    nome_en: "WRR inverter frame ballast",
    descrizione: "Zavorra dei telai OBO Magic PV Mount WRR F e WRR D (tabelle delle istruzioni OBO): vento, apparecchi, controllo del telaio e archivio dei calcoli.",
    descrizione_en: "Ballast for OBO Magic PV Mount WRR F and WRR D frames (OBO tables): wind, devices, frame check and calculation archive.",
    icona: "zavorra",
    url: "zavorra-wrr/",
    // si abilita per persona (Amministrazione → Utenti → Cambia sezioni → Zavorra telai inverter WRR)
    richiesta: "zavorra",
    intro: ["Zavorra dei telai OBO Magic PV Mount WRR con le tabelle delle istruzioni OBO.", "Vento della località, apparecchiature appese al telaio e controllo del carico.", "Calcoli salvati nei progetti e relazione per il cliente in Word."],
    intro_en: ["Ballast for OBO Magic PV Mount WRR frames using the OBO instruction tables.", "Local wind, equipment hung on the frame and load check.", "Calculations saved in projects and a Word report for the customer."],
    abilitataSe: (sezioni) => sezioni.includes("app_zavorra"),
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
    descrizione_en: "For all OBO Hub apps: access requests, users, enabled apps and sections, saved projects, access log, backups and settings.",
    descrizione: "Per tutte le app di OBO Hub: richieste di accesso, utenti, app e sezioni abilitate, progetti salvati, registro degli accessi, copie di sicurezza e impostazioni.",
    icona: "admin",
    url: "/appOBOtechHUB/admin",
    soloAdmin: true,
  },
];
