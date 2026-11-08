/*
 * Catalogo del Configuratore torrette (OBO Hub).
 * Per aggiungere o correggere un prodotto si modifica SOLO questo file.
 *
 * Struttura:
 *   famiglia → modelli → scelte (gruppi di opzioni) → opzioni → articoli
 *   Ogni articolo: { codice, tipo, it, en, qta }   (qta = pezzi per una torretta)
 *   Un'opzione può avere "se": { idScelta: "idOpzione" } per comparire solo con quella combinazione,
 *   e "articoliPer": { idScelta: { idOpzione: [articoli] } } quando il codice dipende da un'altra scelta (es. finitura).
 *
 * Codici presi dai cataloghi OBO internazionali (GES R2, GESR9): DA VERIFICARE con il listino OBO Italia
 * prima di usarli in un'offerta. Dove manca il codice c'è "daCompletare".
 */
export const NOTA_DATI = {
  it: "Codici dai cataloghi OBO internazionali: verificali con il listino OBO Italia prima dell'offerta.",
  en: "Codes taken from OBO international catalogues: check them against the OBO Italia price list before quoting.",
};

const finiture = { ni: ["Nichel", "Nickel"], cuzn: ["Ottone", "Brass"], cu: ["Rame", "Copper"], cr: ["Cromo", "Chrome"] };
const opzFinitura = Object.entries(finiture).map(([id, [it, en]]) => ({ id, it, en }));

export const FAMIGLIE = [
  {
    id: "ges-r2",
    it: "Torrette tonde GES R2",
    en: "GES R2 round service outlets",
    descr_it: "Torretta tonda compatta Ø 140 mm per showroom, negozi e zone comuni. Metallo per pavimenti lavati a umido, plastica per moquette e pulizia a secco.",
    descr_en: "Compact round Ø 140 mm outlet for showrooms, shops and common areas. Metal for wet-cleaned floors, plastic for carpet and dry cleaning.",
    tag: ["Ø 140 mm", "Modul45", "Massetto / sopraelevato"],
    modelli: [
      {
        id: "ges-r2-metallo",
        it: "GES R2 in metallo (zama)",
        en: "GES R2 metal (die-cast zinc)",
        descr_it: "Per pavimenti di pregio e lavaggio a umido. Coperchio a cerniera, corpo a tubo o coperchio cieco.",
        descr_en: "For high-quality floors and wet cleaning. Hinged cover, tube body or blanking lid.",
        scelte: [
          { id: "posa", it: "Posa", en: "Installation", opzioni: [
            { id: "massetto", it: "Nel massetto", en: "In screed", nota_it: "Scatola regolabile 85–130 mm", nota_en: "Adjustable box 85–130 mm",
              articoli: [{ codice: "7428526", tipo: "UD GES R2", it: "Scatola per massetto regolabile in altezza", en: "Height-adjustable screed box", qta: 1 }] },
            { id: "sopraelevato", it: "Pavimento sopraelevato / galleggiante", en: "Raised / cavity floor", nota_it: "Foro Ø 120 mm, fissaggio con staffe", nota_en: "Ø 120 mm hole, fixed with brackets", articoli: [] },
          ] },
          { id: "coperchio", it: "Coperchio", en: "Lid", opzioni: [
            { id: "cerniera", it: "A cerniera", en: "Hinged cover", nota_it: "Con cursore di blocco, lavabile da chiuso", nota_en: "Locking slider, wet-cleanable when closed" },
            { id: "tubo", it: "Corpo a tubo", en: "Tube body", nota_it: "Per lavaggio a umido anche aperto", nota_en: "Wet cleaning even when open" },
            { id: "cieco", it: "Cieco", en: "Blanking lid", nota_it: "Si apre con chiave a brugola: aree pubbliche", nota_en: "Opened with an Allen key: public areas" },
          ] },
          { id: "finitura", it: "Finitura", en: "Finish", opzioni: opzFinitura },
          { id: "inserto", it: "Supporto apparecchi", en: "Device carrier", opzioni: [
            { id: "1-1", it: "2 apparecchi Modul45 singoli (1+1)", en: "2 single Modul45 devices (1+1)", nota_it: "Con separatore: adatto alle prese italiane", nota_en: "With partition: suits Italian sockets",
              articoli: [{ codice: "7408838", tipo: "MT R2 1-1", it: "Supporto apparecchi 1+1, vuoto", en: "Installation socket 1+1, empty", qta: 1 }] },
            { id: "vde", it: "Presa doppia Schuko (VDE)", en: "Double Schuko socket (VDE)",
              articoli: [{ codice: "7408832", tipo: "MT R2 VDE", it: "Supporto apparecchi con presa doppia VDE", en: "Installation socket, double VDE", qta: 1 }] },
            { id: "nf", it: "Presa doppia francese (NF)", en: "Double French socket (NF)",
              articoli: [{ codice: "7408834", tipo: "MT R2 NF", it: "Supporto apparecchi con presa doppia NF", en: "Installation socket, double NF", qta: 1 }] },
          ] },
          DATI_R2(),
        ],
        // codice del coperchio in base a coperchio + finitura
        articoliPer: {
          coperchio: {
            cerniera: perFinitura("GES R2", "Coperchio a cerniera", "Hinged cover", { ni: "7408850", cuzn: "7408852", cu: "7408854", cr: "7408856" }),
            tubo: perFinitura("GES R2T", "Corpo a tubo", "Tube body", { ni: "7408860", cuzn: "7408862", cu: "7408864", cr: "7408866" }),
            cieco: perFinitura("GES R2B", "Coperchio cieco", "Blanking lid", { ni: "7408870", cuzn: "7408872", cu: "7408874", cr: "7408876" }),
          },
        },
      },
      {
        id: "ges-r2-plastica",
        it: "GES R2 in plastica",
        en: "GES R2 plastic",
        descr_it: "Per uffici con moquette e pulizia a secco. Coperchio con uscita cavi.",
        descr_en: "For carpeted offices and dry cleaning. Lid with cord outlet.",
        scelte: [
          { id: "posa", it: "Posa", en: "Installation", opzioni: [
            { id: "massetto", it: "Nel massetto", en: "In screed", nota_it: "Scatola regolabile 85–130 mm", nota_en: "Adjustable box 85–130 mm",
              articoli: [{ codice: "7428526", tipo: "UD GES R2", it: "Scatola per massetto regolabile in altezza", en: "Height-adjustable screed box", qta: 1 }] },
            { id: "sopraelevato", it: "Pavimento sopraelevato / galleggiante", en: "Raised / cavity floor", articoli: [] },
          ] },
          { id: "coperchio", it: "Coperchio", en: "Lid", opzioni: [
            { id: "cerniera", it: "A cerniera con uscita cavi", en: "Hinged cover with cord outlet" },
            { id: "cieco", it: "Cieco con uscita cavi", en: "Blanking lid with cord outlet", nota_it: "Si apre solo con cacciavite", nota_en: "Opens with a screwdriver only" },
          ] },
          { id: "colore", it: "Colore", en: "Colour", opzioni: [
            { id: "7011", it: "Grigio ferro RAL 7011", en: "Iron grey RAL 7011" },
            { id: "9011", it: "Nero grafite RAL 9011", en: "Graphite black RAL 9011" },
          ] },
          { id: "inserto", it: "Supporto apparecchi", en: "Device carrier", opzioni: [
            { id: "1-1", it: "2 apparecchi Modul45 singoli (1+1)", en: "2 single Modul45 devices (1+1)",
              articoli: [{ codice: "7408838", tipo: "MT R2 1-1", it: "Supporto apparecchi 1+1, vuoto", en: "Installation socket 1+1, empty", qta: 1 }] },
            { id: "vde", it: "Presa doppia Schuko (VDE)", en: "Double Schuko socket (VDE)",
              articoli: [{ codice: "7408832", tipo: "MT R2 VDE", it: "Supporto apparecchi con presa doppia VDE", en: "Installation socket, double VDE", qta: 1 }] },
          ] },
          DATI_R2(),
        ],
        articoliPer: {
          coperchio: {
            cerniera: { colore: {
              "7011": [{ codice: "7405082", tipo: "GES R2 7011", it: "Coperchio a cerniera con uscita cavi, grigio ferro", en: "Hinged cover with cord outlet, iron grey", qta: 1 }],
              "9011": [{ codice: "7405084", tipo: "GES R2 9011", it: "Coperchio a cerniera con uscita cavi, nero grafite", en: "Hinged cover with cord outlet, graphite black", qta: 1 }],
            } },
            cieco: { colore: {
              "7011": [{ codice: "7405086", tipo: "GES R2B 7011", it: "Coperchio cieco con uscita cavi, grigio ferro", en: "Blanking lid with cord outlet, iron grey", qta: 1 }],
              "9011": [{ codice: "7405088", tipo: "GES R2B 9011", it: "Coperchio cieco con uscita cavi, nero grafite", en: "Blanking lid with cord outlet, graphite black", qta: 1 }],
            } },
          },
        },
      },
    ],
  },
  {
    id: "gesr9",
    it: "Torrette tonde GESR9",
    en: "GESR9 round service outlets",
    descr_it: "Torretta tonda grande per uffici: fino a 8 apparecchi Modul45 su due supporti verticali.",
    descr_en: "Large round outlet for offices: up to 8 Modul45 devices on two vertical carriers.",
    tag: ["Ø 325 mm", "8 × Modul45", "Massetto 55 mm"],
    modelli: [
      {
        id: "gesr9-55",
        it: "GESR9 per massetto da 55 mm",
        en: "GESR9 for 55 mm screed",
        descr_it: "Altezza fissa 55 mm, carico fino a 3.000–5.000 N, solo pulizia a secco.",
        descr_en: "Fixed 55 mm height, load up to 3,000–5,000 N, dry cleaning only.",
        scelte: [
          { id: "colore", it: "Colore", en: "Colour", opzioni: [
            { id: "7011", it: "Grigio ferro RAL 7011", en: "Iron grey RAL 7011",
              articoli: [{ codice: "7405047", tipo: "GESR9 55U V 7011", it: "Torretta tonda per massetto 55 mm, grigio ferro", en: "Round service outlet for 55 mm screed, iron grey", qta: 1 }] },
            { id: "9011", it: "Nero grafite RAL 9011", en: "Graphite black RAL 9011",
              articoli: [{ codice: "7405049", tipo: "GESR9 55U V 9011", it: "Torretta tonda per massetto 55 mm, nero grafite", en: "Round service outlet for 55 mm screed, graphite black", qta: 1 }] },
          ] },
          { id: "telai", it: "Telai porta-apparecchi (servono 2)", en: "Device frames (2 needed)", opzioni: [
            { id: "4", it: "2 × telaio da 4 apparecchi", en: "2 × frame for 4 devices",
              articoli: [{ codice: "7408670", tipo: "MT45V 4", it: "Telaio per 4 apparecchi Modul45", en: "Installation frame, 4 Modul45 devices", qta: 2 }] },
            { id: "3", it: "2 × telaio da 3 apparecchi", en: "2 × frame for 3 devices",
              articoli: [{ codice: "7408672", tipo: "MT45V 3", it: "Telaio per 3 apparecchi Modul45", en: "Installation frame, 3 Modul45 devices", qta: 2 }] },
            { id: "3+1", it: "2 × telaio 3+1 (energia + dati)", en: "2 × frame 3+1 (power + data)",
              articoli: [{ codice: "7408680", tipo: "MT45V 3+1", it: "Telaio combinato 3+1", en: "Installation frame, 3+1 combination", qta: 2 }] },
            { id: "2+2", it: "2 × telaio 2+2 (energia + dati)", en: "2 × frame 2+2 (power + data)",
              articoli: [{ codice: "7408682", tipo: "MT45V 2+2", it: "Telaio combinato 2+2", en: "Installation frame, 2+2 combination", qta: 2 }] },
          ] },
          { id: "dati", it: "Prese dati", en: "Data sockets", opzioni: [
            { id: "no", it: "Nessuna piastra dati", en: "No data plate", articoli: [] },
            { id: "2c", it: "Piastra per 2 prese dati tipo C", en: "Plate for 2 type C data sockets",
              articoli: [{ codice: "7408705", tipo: "MPMT45 2C", it: "Piastra per 2 prese dati tipo C", en: "Mounting plate, 2 × data socket type C", qta: 1 }] },
          ] },
        ],
      },
    ],
  },
  {
    id: "ges-quadrate",
    it: "Torrette quadrate GES",
    en: "GES square service outlets",
    descr_it: "Torrette quadrate GES 4 / GES 9 per uffici e aree commerciali, in plastica o metallo.",
    descr_en: "GES 4 / GES 9 square outlets for offices and commercial areas, plastic or metal.",
    tag: ["Quadrate", "Modul45", "Massetto / sopraelevato"],
    daCompletare: true,
    modelli: [],
  },
];

function perFinitura(tipo, it, en, codici) {
  const out = { finitura: {} };
  for (const [f, codice] of Object.entries(codici)) {
    const [fi, fe] = finiture[f];
    out.finitura[f] = [{ codice, tipo: `${tipo} ${f === "cuzn" ? "CuZn" : f[0].toUpperCase() + f.slice(1)}`, it: `${it}, ${fi.toLowerCase()}`, en: `${en}, ${fe.toLowerCase()}`, qta: 1 }];
  }
  return out;
}

function DATI_R2() {
  const piastra = (lettera, codice) => ({ id: lettera.toLowerCase(), it: `Piastra per 2 prese dati tipo ${lettera}`, en: `Plate for 2 type ${lettera} data sockets`,
    articoli: [{ codice, tipo: `MP R2 2${lettera}`, it: `Piastra per 2 moduli dati tipo ${lettera}`, en: `Mounting plate, type ${lettera} (2 modules)`, qta: 1 }] });
  return { id: "dati", it: "Prese dati (Keystone)", en: "Data sockets (Keystone)", opzioni: [
    { id: "no", it: "Nessuna", en: "None", articoli: [] },
    piastra("A", "7408802"), piastra("B", "7408804"), piastra("C", "7408806"), piastra("F", "7408808"),
  ] };
}

/** Moduli dati da aggiungere a una piastra (2 per piastra). */
export const MODULI_DATI = [
  { codice: "6117349", tipo: "ASM-C6 S", it: "Modulo di connessione Cat. 6 non schermato", en: "Connection module Cat. 6, unshielded" },
  { codice: "6117345", tipo: "ASM-C6 GS", it: "Modulo di connessione Cat. 6 schermato", en: "Connection module Cat. 6, shielded" },
  { codice: "6117348", tipo: "ASM-C6A", it: "Modulo di connessione Cat. 6A non schermato", en: "Connection module Cat. 6A, unshielded" },
  { codice: "6117346", tipo: "ASM-C6A G", it: "Modulo di connessione Cat. 6A schermato", en: "Connection module Cat. 6A, shielded" },
];
