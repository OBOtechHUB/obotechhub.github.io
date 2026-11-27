import { useState, useEffect } from "react";
// Dati dei sistemi corretti dai colleghi nella tabella condivisa (strumenti/torrette/tabella.mjs): sostituiscono quelli scritti qui sotto.
import DATI_TABELLA from "./dati-sistemi.json";

// ─────────────────────────────────────────────────────────────────
// RESPONSIVE — hook e helpers
// ─────────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return {
    isMobile:  w < 600,
    isTablet:  w >= 600 && w < 960,
    isDesktop: w >= 960,
    w,
  };
}
// Shorthand usato ovunque nei componenti
const useM = useBreakpoint;

// ─────────────────────────────────────────────────────────────────
// PALETTE CORPORATE OBO BETTERMANN
// ─────────────────────────────────────────────────────────────────
const OBO = {
  orange:  "#C9400A",  // Primary — OBO Orange
  dark:    "#282a31",  // Secondary 1 — Dark Navy
  slate:   "#41525d",  // Secondary 2 — Slate
  mist:    "#7694a4",  // Secondary 3 — Mist Blue
  frost:   "#c5d9de",  // Secondary 4 — Frost
  cloud:   "#e4ebed",  // Secondary 5 — Cloud
  white:   "#ffffff",  // White
};


// ─────────────────────────────────────────────────────────────────
// DATABASE PRODOTTI
// Estratto da: Tab_-_torrette_-_31_07_24.xlsb
// Codici verificati dal file sono indicati senza asterisco.
// Codici con ⚠ = da verificare sul listino aggiornato.
// ─────────────────────────────────────────────────────────────────

// Piedini alternativi per cassette livellabili — sostituiscono i piedini standard
// quando l'altezza del massetto richiede un range di livellamento maggiore
const PIEDINI_RK_NEV2 = [
  { codice: "7405814", tipo: "RK NEV2 70",  hMin: 100, hMax: 150, desc: "Piedini alternativi — livellamento 100–150mm" },
  { codice: "7405815", tipo: "RK NEV2 110", hMin: 140, hMax: 190, desc: "Piedini alternativi — livellamento 140–190mm" },
  { codice: "7405816", tipo: "RK NEV2 150", hMin: 180, hMax: 230, desc: "Piedini alternativi — livellamento 180–230mm" },
  { codice: "7405817", tipo: "RK NEV2 190", hMin: 220, hMax: 270, desc: "Piedini alternativi — livellamento 220–270mm" },
  { codice: "7405818", tipo: "RK NEV2 230", hMin: 260, hMax: 310, desc: "Piedini alternativi — livellamento 260–310mm" },
  { codice: "7405819", tipo: "RK NEV2 270", hMin: 300, hMax: 355, desc: "Piedini alternativi — livellamento 300–355mm" },
];

const DB = {

  // ── GES 4 ──────────────────────────────────────────────────────
  // Dati verificati manualmente (2024-07)
  GES4: {
    label: "GES 4",
    famiglia: "GES",
    forma: "quadrata",
    dimensione: "217×217 mm",
    ip_chiuso: "IP40",
    ip_aperto: "IP20",
    carico: "2 kN (plastica) / 3 kN (acciaio)",
    rivestimento_max: "5 mm",
    note: "Plastica: 3 colori. Acciaio: variante M-2. Box GT I4 utilizzabile solo su flottante (h min. 110mm). Box MT4 6I utilizzabile anche su massetto (h 95–100mm).",
    pavimenti: ["massetto", "flottante"],
    // colonne: Torretta | Box portafrutti | Scatola massetto (solo se massetto + MT4 6I)
    colonne: ["Torretta", "Box portafrutti", "Scatola massetto"],
    righe: [
      {
        label: "GES4 U 7011 – Grigio ferro RAL 7011",
        finitura: "grigio", colore_ral: "RAL 7011", materiale: "plastica",
        codici: ["7405196", null, null],
        note_righe: ["GES4 U 7011", "scegli sotto ↓", "solo con MT4 6I (95–100mm)"]
      },
      {
        label: "GES4 U 9011 – Nero grafite RAL 9011",
        finitura: "nero", colore_ral: "RAL 9011", materiale: "plastica",
        codici: ["7405200", null, null],
        note_righe: ["GES4 U 9011", "scegli sotto ↓", "solo con MT4 6I (95–100mm)"]
      },
      {
        label: "GES4 U 1019 – Grigio beige RAL 1019",
        finitura: "beige", colore_ral: "RAL 1019", materiale: "plastica",
        codici: ["7405204", null, null],
        note_righe: ["GES4 U 1019", "scegli sotto ↓", "solo con MT4 6I (95–100mm)"]
      },
      {
        label: "GES4M-2 10U – Acciaio",
        finitura: "acciaio", colore_ral: "—", materiale: "acciaio",
        codici: ["7405191", null, null],
        note_righe: ["GES4M-2 10U", "scegli sotto ↓", "solo con MT4 6I (95–100mm)"]
      },
    ],
    // Logica box: MT4 6I → flottante + massetto; GT I4 → solo flottante
    box: [
      {
        codice: "7407577", tipo: "MT4 6I", desc: "6 moduli Modul45®",
        pavimenti_ok: ["flottante", "massetto"],
        nota: "Compatibile con massetto (h 95–100mm) e flottante (h min. 110mm)"
      },
      {
        codice: "7429194", tipo: "GT I4", desc: "4 prese standard italiano",
        pavimenti_ok: ["flottante"],
        nota: "Solo su pavimento flottante (h min. 110mm). Non installabile su massetto."
      },
    ],
    scatola_massetto: { codice: "7427430", tipo: "UDHOME BOX 4", desc: "Scatola per installazione su massetto" },
    altezze: {
      flottante: "min. 110 mm",
      massetto:  "95–100 mm (solo con MT4 6I)"
    },
  },

  // ── GES 9 ──────────────────────────────────────────────────────
  // Dati verificati manualmente (2024-07)
  // 3 gruppi: GT (box GTI14 fisso), 55U (MT45V0 fisso), VUOTA (box a scelta)
  GES9: {
    label: "GES 9",
    famiglia: "GES",
    forma: "quadrata",
    dimensione: "264×264 mm",
    ip_chiuso: "IP40",
    ip_aperto: "IP20",
    carico: "2 kN (plastica) / 3 kN (acciaio)",
    rivestimento_max: "10 mm (5 mm System55)",
    note: null,
    pavimenti: ["massetto", "flottante"],
    tipo: "gruppi",

    gruppi: [
      // ── GRUPPO 1: box GTI 14I pre-montato ─────────────────────
      {
        id: "GT",
        label: "Con box GTI 14I pre-montato",
        sottotitolo: "14 dispositivi standard Italia — box incluso, nessuna scelta aggiuntiva",
        righe: [
          { label: "GES9-3B U9011 GT — Nero grafite RAL 9011", finitura: "nero", colore_ral: "RAL 9011", materiale: "plastica", codice: "7405093" },
        ],
        box_fisso: { codice: null, tipo: "GTI 14I", desc: "14 dispositivi standard Italia (pre-montato)" },
        scatola_massetto: { codice: "7427434", tipo: "UDHOME BOX 9 EX", desc: "Regolazione h 110–125mm" },
        altezze: { flottante: "min. 110 mm", massetto: "110–125 mm" },
      },

      // ── GRUPPO 2: box MT45 V0 pre-montato (System55) ──────────
      {
        id: "55U",
        label: "Con box MT45 V0 pre-montato — System55",
        sottotitolo: "8 moduli Modul45® — richiede 2× telaio 7408670 (obbligatorio). Min. 55mm: soluzione unica nel mercato italiano.",
        righe: [
          { label: "GES9 55U V 7011 — Grigio ferro RAL 7011",  finitura: "grigio", colore_ral: "RAL 7011", materiale: "plastica", codice: "7405037" },
          { label: "GES9 55U V 9011 — Nero grafite RAL 9011",  finitura: "nero",   colore_ral: "RAL 9011", materiale: "plastica", codice: "7405039" },
        ],
        box_fisso: { codice: null, tipo: "MT45 V0", desc: "8 moduli Modul45® (pre-montato)" },
        accessorio_obbligatorio: { codice: "7408670", tipo: "Telaio MT45", desc: "Telaio 4 moduli Modul45®", qty: 2, nota: "Obbligatori 2 pezzi per completare il box" },
        scatola_massetto: { codice: "7410060", tipo: "UGD55 250-3 9R", desc: "Regolazione h 55–80mm" },
        altezze: { flottante: "min. 55 mm", massetto: "55–80 mm" },
      },

      // ── GRUPPO 3: torrette vuote, box a scelta ─────────────────
      {
        id: "VUOTA",
        label: "Vuota — scelta libera del box",
        sottotitolo: "Scegli il box e la scatola massetto in base all'altezza disponibile in cantiere",
        righe: [
          { label: "GES9-3B U 7011 — Grigio ferro RAL 7011", finitura: "grigio",  colore_ral: "RAL 7011", materiale: "plastica", codice: "7405077" },
          { label: "GES9-3B U 9011 — Nero grafite RAL 9011", finitura: "nero",    colore_ral: "RAL 9011", materiale: "plastica", codice: "7405079" },
          { label: "GES9M-2 10U — Acciaio inox",             finitura: "acciaio", colore_ral: "—",        materiale: "acciaio",  codice: "7405371" },
        ],
        box: [
          { codice: "7407578", tipo: "MT9 9I",  desc: "9 moduli Modul45®",                altezza_min: 105, pavimenti_ok: ["flottante","massetto"], nota: "Altezza min. installazione: 105mm" },
          { codice: "7407579", tipo: "MT9 12I", desc: "3 file da 4 Modul45® (12 totali)", altezza_min: 95,  pavimenti_ok: ["flottante","massetto"], nota: "Altezza min. installazione: 95mm" },
        ],
        scatole_massetto: [
          { codice: "7410068", tipo: "UZD 80125 250-4",   desc: "Regolazione h 80–125mm",  h_min: 80,  h_max: 125 },
          { codice: "7410070", tipo: "UZD 120165 250-4M", desc: "Regolazione h 120–165mm", h_min: 120, h_max: 165 },
          { codice: "7410072", tipo: "UZD 160205 250-4",  desc: "Regolazione h 160–205mm", h_min: 160, h_max: 205 },
        ],
        altezze: { flottante: "min. 95mm (MT9 12I) oppure min. 105mm (MT9 9I)" },
      },
    ],
  },

  // ── GRAF 9 ─────────────────────────────────────────────────────
  // Dati verificati manualmente (2024-07)
  // Solo massetto. DUG 350-3 R9 sempre obbligatorio.
  // Versione BA3: rivestibile 4mm inox, richiede coperchio 7428140 obbligatorio.
  GRAF9: {
    label: "GRAF 9",
    famiglia: "GES",
    forma: "rotonda",
    dimensione: "Ø 325 mm",
    ip_chiuso: "IP45",
    ip_aperto: "IP20",
    carico: "5 kN",
    rivestimento_max: "4 mm (solo versione BA3)",
    note: "Solo massetto. Uscita cavi tubo telescopico. DUG 350-3 R9 sempre obbligatorio.",
    pavimenti: ["massetto"],
    tipo: "gruppi",

    gruppi: [
      // ── GRUPPO 1: coperchio non rivestibile ───────────────────
      {
        id: "NR",
        label: "Coperchio non rivestibile",
        sottotitolo: "Finitura colore — nessun accessorio coperchio aggiuntivo",
        righe: [
          { label: "GRAF9-2 U 7011 — Grigio ferro RAL 7011", finitura: "grigio", colore_ral: "RAL 7011", materiale: "plastica", codice: "7405746" },
          { label: "GRAF9-2 U 9011 — Nero grafite RAL 9011", finitura: "nero",   colore_ral: "RAL 9011", materiale: "plastica", codice: "7405750" },
        ],
        box: [
          { codice: "7429196", tipo: "GTI 14I",  desc: "14 dispositivi standard Italia", altezza_min: 110, pavimenti_ok: ["massetto"], nota: "Altezza min. installazione: 110mm" },
          { codice: "7407579", tipo: "MT9 12I",  desc: "3 file da 4 Modul45® (12 totali)",             altezza_min: 100, pavimenti_ok: ["massetto"], nota: "Altezza min. installazione: 100mm (ipotetico)" },
        ],
        scatole_massetto: [
          { codice: "7410074", tipo: "UZD 80125 350-4",   desc: "Regolazione h 80–125mm",  h_min: 80,  h_max: 125 },
          { codice: "7410076", tipo: "UZD 120165 350-4M", desc: "Regolazione h 120–165mm", h_min: 120, h_max: 165 },
          { codice: "7410078", tipo: "UZD 160205 350-4",  desc: "Regolazione h 160–205mm", h_min: 160, h_max: 205 },
        ],
        accessorio_sempre: { codice: "7400549", tipo: "DUG 350-3 R9", desc: "Telaio di montaggio — sempre obbligatorio" },
        altezze: { massetto: "dipende da box e scatola scelti" },
      },

      // ── GRUPPO 2: coperchio rivestibile BA3 ───────────────────
      {
        id: "BA3",
        label: "Coperchio rivestibile — BA3",
        sottotitolo: "Inox rivestibile fino a 4mm — richiede coperchio 7428140 (obbligatorio)",
        righe: [
          { label: "GRAF9-2 BA3 — Inox rivestibile 4mm", finitura: "inox", colore_ral: "—", materiale: "acciaio inox", codice: "7405743" },
        ],
        accessorio_obbligatorio: { codice: "7428140", tipo: "Coperchio uscita cavi telescopica", desc: "Obbligatorio con versione BA3", qty: 1, nota: "Coperchio uscita cavi telescopica — obbligatorio con BA3" },
        box: [
          { codice: "7429196", tipo: "GTI 14I",  desc: "14 dispositivi standard Italia", altezza_min: 110, pavimenti_ok: ["massetto"], nota: "Altezza min. installazione: 110mm" },
          { codice: "7407579", tipo: "MT9 12I",  desc: "3 file da 4 Modul45® (12 totali)",             altezza_min: 100, pavimenti_ok: ["massetto"], nota: "Altezza min. installazione: 100mm (ipotetico)" },
        ],
        scatole_massetto: [
          { codice: "7410074", tipo: "UZD 80125 350-4",   desc: "Regolazione h 80–125mm",  h_min: 80,  h_max: 125 },
          { codice: "7410076", tipo: "UZD 120165 350-4M", desc: "Regolazione h 120–165mm", h_min: 120, h_max: 165 },
          { codice: "7410078", tipo: "UZD 160205 350-4",  desc: "Regolazione h 160–205mm", h_min: 160, h_max: 205 },
        ],
        accessorio_sempre: { codice: "7400549", tipo: "DUG 350-3 R9", desc: "Telaio di montaggio — sempre obbligatorio" },
        altezze: { massetto: "dipende da box e scatola scelti" },
      },
    ],
  },

  // ── UDHOME-ONE ─────────────────────────────────────────────────
  // Dati verificati (2024-07)
  // Torretta predisposta internamente per 1 Modul45.
  // Accessori interni: DTP UH1 C (aggiunge 1 keystone dati) oppure
  //   MT UH1 2M45 (sostituisce telaio → 2 Modul45).
  // Accessorio altezza: HE 60UH2 (7368418) aggiunge +10÷+60 mm.
  // Uscita Angel-Hair solo in versione Inox (BN / BN15).
  UDHOME_ONE: {
    label: "UDHOME-ONE",
    famiglia: "UDHOME",
    forma: "quadrata",
    dimensione: "140×140 mm",
    ip_chiuso: "IP40",
    ip_aperto: "IP20",
    carico: "15 kN",
    rivestimento_max: "Non rivestibile o 15 mm (per variante)",
    note: "All-in-one. 1 Modul45 preinstallato. Uscita laterale classica (GV/GM) o Angel-Hair spazzola ruotabile (BN). Accessori interni opzionali: DTP UH1 C (keystone dati) o MT UH1 2M45 (2 Modul45). Accessorio H: HE 60UH2 per +10÷+60 mm.",
    pavimenti: ["massetto", "flottante"],
    colonne: ["Torretta", "Accessori interni", "Accessorio H"],
    righe: [
      // ── Uscita laterale classica ────────────────────────────────
      {
        label: "Inox – Riv. 15mm – Uscita laterale classica",
        finitura: "inox", riv: 15, uscita: "laterale",
        codici: ["7368282", "—", "—"],
        note_righe: ["UDHOME-ONE GV15", "DTP UH1 C / MT UH1 2M45 (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Inox – Non rivestibile – Uscita laterale classica",
        finitura: "inox", riv: 0, uscita: "laterale",
        codici: ["7368280", "—", "—"],
        note_righe: ["UDHOME-ONE GV", "DTP UH1 C / MT UH1 2M45 (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Ottone – Riv. 15mm – Uscita laterale classica",
        finitura: "ottone", riv: 15, uscita: "laterale",
        codici: ["7368286", "—", "—"],
        note_righe: ["UDHOME-ONE GM15", "DTP UH1 C / MT UH1 2M45 (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Ottone – Non rivestibile – Uscita laterale classica",
        finitura: "ottone", riv: 0, uscita: "laterale",
        codici: ["7368284", "—", "—"],
        note_righe: ["UDHOME-ONE GM", "DTP UH1 C / MT UH1 2M45 (opz.)", "HE 60UH2 (opz.)"]
      },
      // ── Uscita Angel-Hair (spazzola ruotabile) — solo Inox ──────
      {
        label: "Inox – Riv. 15mm – Uscita Angel-Hair (spazzola ruotabile)",
        finitura: "inox", riv: 15, uscita: "angel-hair",
        codici: ["7368357", "—", "—"],
        note_righe: ["UDHOME-ONE BN15", "DTP UH1 C / MT UH1 2M45 (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Inox – Non rivestibile – Uscita Angel-Hair (spazzola ruotabile)",
        finitura: "inox", riv: 0, uscita: "angel-hair",
        codici: ["7368356", "—", "—"],
        note_righe: ["UDHOME-ONE BN", "DTP UH1 C / MT UH1 2M45 (opz.)", "HE 60UH2 (opz.)"]
      },
    ],
    accessori_interni: [
      { codice: "7368494", tipo: "DTP UH1 C", desc: "Aggiunge 1 presa dati keystone (affianca il Modul45)" },
      { codice: "7368485", tipo: "MT UH1 2M45", desc: "Sostituisce il telaio interno — permette 2 Modul45" },
    ],
    accessori_interni_esclusivi: true,
    accessorio_h: { codice: "7368418", tipo: "HE 60UH2", desc: "Accessorio altezza: +10÷+60 mm" },
    altezze: { massetto: "75–105 mm (+ HE 60UH2: fino a +60 mm)", flottante: "75–105 mm (+ HE 60UH2: fino a +60 mm)" },
  },

  // ── UDHOME 2 ───────────────────────────────────────────────────
  UDHOME2: {
    label: "UDHOME 2",
    famiglia: "UDHOME",
    forma: "quadrata",
    dimensione: "140×140 mm",
    ip_chiuso: "IP40 (lat.) / IP65 (tubo teles.)",
    ip_aperto: "IP20",
    carico: "15 kN",
    rivestimento_max: "Non rivestibile o 15 mm (per variante)",
    note: "All-in-one. 2 Modul45 preinstallati. Versione tubo telescopico: IP65 anche con spina inserita. Accessorio opzionale: DT UH2 C (aggiunge 2 keystone dati).",
    pavimenti: ["massetto", "flottante"],
    colonne: ["Torretta", "Accessori interni", "Accessori H"],
    righe: [
      // ── Uscita laterale classica ────────────────────────────────
      {
        label: "Inox – Riv. 15mm – Uscita laterale classica",
        finitura: "inox", riv: 15, uscita: "laterale",
        codici: ["7368340", "—", "—"],
        note_righe: ["UDHOME2 GV15", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Inox – Non rivestibile – Uscita laterale classica",
        finitura: "inox", riv: 0, uscita: "laterale",
        codici: ["7368342", "—", "—"],
        note_righe: ["UDHOME2 GV", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Ottone – Riv. 15mm – Uscita laterale classica",
        finitura: "ottone", riv: 15, uscita: "laterale",
        codici: ["7368346", "—", "—"],
        note_righe: ["UDHOME2 GM15", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Ottone – Non rivestibile – Uscita laterale classica",
        finitura: "ottone", riv: 0, uscita: "laterale",
        codici: ["7368348", "—", "—"],
        note_righe: ["UDHOME2 GM", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Inox – Non rivestibile – Uscita laterale VT2 (IP superiore)",
        finitura: "inox", riv: 0, uscita: "laterale-vt2",
        codici: ["7427097", "—", "—"],
        note_righe: ["UDHOME2 VT2 — IP superiore", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
      // ── Uscita Angel-Hair — solo Inox ───────────────────────────
      {
        label: "Inox – Riv. 15mm – Uscita Angel-Hair (spazzola ruotabile)",
        finitura: "inox", riv: 15, uscita: "angel-hair",
        codici: ["7368353", "—", "—"],
        note_righe: ["UDHOME2 BN15", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
      {
        label: "Inox – Non rivestibile – Uscita Angel-Hair (spazzola ruotabile)",
        finitura: "inox", riv: 0, uscita: "angel-hair",
        codici: ["7368352", "—", "—"],
        note_righe: ["UDHOME2 BN", "DT UH2 C (opz.)", "HE 60UH2 (opz.)"]
      },
    ],
    accessori_interni: [
      { codice: "7368474", tipo: "DT UH2 C", desc: "Aggiunge 2 prese dati keystone (affianca i 2 Modul45 preinstallati)" },
    ],
    accessorio_h: { codice: "7368418", tipo: "HE 60UH2", desc: "Accessorio altezza: +10÷+60 mm" },
    altezze: { massetto: "100–130 mm (+ HE 60UH2: fino a +60 mm)", flottante: "100–130 mm (+ HE 60UH2: fino a +60 mm)" },
  },

  // ── UDHOME 4 ───────────────────────────────────────────────────
  // Dati verificati (2024-07)
  // Versioni Inox: box pre-montato (I4 o 6I), nessuna scelta aggiuntiva.
  // Versione Ottone: vuota, box MT4 6I a scelta separata.
  // Accessorio altezza: HE60 UDHOME4 (7427440) +10÷+60 mm.
  UDHOME4: {
    label: "UDHOME 4",
    famiglia: "UDHOME",
    forma: "quadrata",
    dimensione: "199×199 mm",
    ip_chiuso: "IP40",
    ip_aperto: "IP20",
    carico: "3 kN",
    rivestimento_max: "15 mm",
    note: "Versioni Inox con box pre-montato (4 disp. ITA o 6 Modul45). Versione Ottone vuota, equipaggiabile con MT4 6I. Coperchio rivestibile 15 mm. Accessorio altezza HE60 UDHOME4 per +10÷+60 mm.",
    pavimenti: ["massetto", "flottante"],
    tipo: "gruppi",
    gruppi: [
      // ── GRUPPO 1: Inox con box I4 pre-montato (4 ITA) ──────────
      {
        id: "I4",
        label: "Inox – Box 4 dispositivi ITA pre-montato",
        sottotitolo: "4 prese standard italiano — box incluso, nessuna scelta aggiuntiva",
        righe: [
          { label: "Inox – Riv. 15mm – 4 disp. ITA", finitura: "inox", riv: 15, codice: "7427074" },
        ],
        box_fisso: { codice: null, tipo: "Box I4", desc: "4 dispositivi standard Italia (pre-montato)" },
        altezze: { massetto: "110–140 mm", flottante: "110–140 mm" },
      },
      // ── GRUPPO 2: Inox con box 6I pre-montato (6 Modul45) ──────
      {
        id: "6I",
        label: "Inox – Box 6 Modul45 pre-montato",
        sottotitolo: "6 Modul45® — box incluso, nessuna scelta aggiuntiva",
        righe: [
          { label: "Inox – Riv. 15mm – 6 Modul45", finitura: "inox", riv: 15, codice: "7427230" },
        ],
        box_fisso: { codice: null, tipo: "MT4 6I", desc: "6 Modul45® (pre-montato)" },
        altezze: { massetto: "110–125 mm", flottante: "110–125 mm" },
      },
      // ── GRUPPO 3: Ottone vuota — box a scelta ───────────────────
      {
        id: "VUOTA",
        label: "Ottone – Vuota (box a scelta)",
        sottotitolo: "Coperchio ottone riv. 15mm — scegli il box portafrutti",
        righe: [
          { label: "Ottone – Riv. 15mm – Vuota", finitura: "ottone", riv: 15, codice: "7427236" },
        ],
        box: [
          { codice: "7407577", tipo: "MT4 6I", desc: "6 Modul45®", altezza_min: 110, pavimenti_ok: ["massetto", "flottante"] },
        ],
        altezze: { massetto: "110–125 mm", flottante: "110–125 mm" },
      },
    ],
    accessorio_h: { codice: "7427440", tipo: "HE60 UDHOME4", desc: "Accessorio altezza: +10÷+60 mm" },
  },

  // ── UDHOME 9 ───────────────────────────────────────────────────
  // Dati verificati (2024-07)
  // Versioni Inox con box pre-montato: I14 (14 ITA, h max 140mm) e I12 (12 Modul45, h max 125mm).
  // Versioni vuote Ottone e Inox: box MT45 v0 + n.2 pz 7408670 (max 8 Modul45)
  //   oppure Ottone anche con GTI 14I (12 disp. ITA).
  // Accessorio altezza: HE60 UDHOME9 (7427444) +10÷+60 mm.
  UDHOME9: {
    label: "UDHOME 9",
    famiglia: "UDHOME",
    forma: "quadrata",
    dimensione: "243×243 mm",
    ip_chiuso: "IP40",
    ip_aperto: "IP20",
    carico: "3 kN",
    rivestimento_max: "15 mm",
    note: "Versioni Inox con box pre-montato (14 ITA o 12 Modul45). Versioni vuote (Ottone/Inox) equipaggiabili con MT45 v0 + ×2 7408670 (8 Modul45) o GTI 14I (12 ITA, solo Ottone). Coperchio rivestibile 15 mm.",
    pavimenti: ["massetto", "flottante"],
    tipo: "gruppi",
    gruppi: [
      // ── GRUPPO 1: Inox con box I14 pre-montato (14 ITA) ────────
      {
        id: "I14",
        label: "Inox – Box 14 dispositivi ITA pre-montato",
        sottotitolo: "Fino a 14 prese standard italiano — box incluso, nessuna scelta aggiuntiva",
        righe: [
          { label: "Inox – Riv. 15mm – 14 disp. ITA", finitura: "inox", riv: 15, codice: "7427076" },
        ],
        box_fisso: { codice: null, tipo: "Box I14", desc: "Fino a 14 dispositivi standard Italia (pre-montato)" },
        altezze: { massetto: "110–140 mm", flottante: "110–140 mm" },
      },
      // ── GRUPPO 2: Inox con box I12 pre-montato (12 Modul45) ────
      {
        id: "I12",
        label: "Inox – Box 12 Modul45 pre-montato",
        sottotitolo: "3 file da 4 Modul45® (12 totali) — box incluso, nessuna scelta aggiuntiva",
        righe: [
          { label: "Inox – Riv. 15mm – 12 Modul45", finitura: "inox", riv: 15, codice: "7427323" },
        ],
        box_fisso: { codice: null, tipo: "MT9 I12", desc: "3 file da 4 Modul45® — 12 totali (pre-montato)" },
        altezze: { massetto: "110–125 mm", flottante: "110–125 mm" },
      },
      // ── GRUPPO 3: Ottone vuota — MT45v0 o GTI14I a scelta ──────
      {
        id: "VUOTA_OTT",
        label: "Ottone – Vuota (box a scelta)",
        sottotitolo: "Coperchio ottone riv. 15mm — scegli il box portafrutti",
        righe: [
          { label: "Ottone – Riv. 15mm – Vuota", finitura: "ottone", riv: 15, codice: "7427328" },
        ],
        box: [
          {
            codice: "7408698", tipo: "MT45 v0", desc: "Fino a 8 Modul45® (richiede ×2 pz art. 7408670)",
            altezza_min: 110, pavimenti_ok: ["massetto", "flottante"],
          },
          {
            codice: "7407579", tipo: "MT9 12I", desc: "3 file da 4 Modul45® (12 totali)",
            altezza_min: 110, pavimenti_ok: ["massetto", "flottante"],
          },
          {
            codice: "7429196", tipo: "GTI 14I", desc: "Fino a 14 dispositivi standard Italia",
            altezza_min: 110, pavimenti_ok: ["massetto", "flottante"],
          },
        ],
        accessorio_obbligatorio_per_box: {
          "7408698": { codice: "7408670", tipo: "Acc. MT45 v0", desc: "Accessorio completamento MT45 v0", qty: 2 },
        },
        altezze: { massetto: "110–125 mm", flottante: "110–125 mm" },
      },

    ],
    accessorio_h: { codice: "7427444", tipo: "HE60 UDHOME9", desc: "Accessorio altezza: +10÷+60 mm" },
  },

  // ── CASSETTE LIVELLABILI dim. 4 / R4 ───────────────────────────
  // Codici verificati 2026-03
  CASS_LIV_4: {
    label: "Cassetta livellabile 4 / R4",
    famiglia: "Cassette livellabili",
    forma: "quadrata o rotonda",
    dimensione: "4: 199×199mm  |  R4: Ø 214mm",
    ip_chiuso: "IP40 (lat.) / IP66 (tubo teles.)",
    ip_aperto: "IP20",
    carico: "3 kN / 20 kN heavy",
    rivestimento_max: "20 o 25 mm",
    note: "Con piedini. Altezza regolazione: riv. 20mm → 105–150mm; riv. 25mm → 110–155mm. Versione tubo telescopico da completare con coperchio TUK2 GV art. 7428140.",
    pavimenti: ["massetto", "flottante"],
    colonne: ["Torretta", "Cop. tubo (se tubo)", "Box portafrutti", "Accessori massetto"],
    righe: [
      // ── QUADRATE dim. 4 (199×199mm) ─────────────────────────────
      // Inox
      {
        label: "Dim. 4 quadrata – Inox – Cieca (RKN3) – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "cieca",
        codici: ["7408950", "—", "—", "7400467"],
        note_righe: ["RKN3 4 VS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Inox – Cieca (RKN3) – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "cieca",
        codici: ["7408954", "—", "—", "7400467"],
        note_righe: ["RKN3 4 VS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Inox – Uscita laterale (RKSN2) – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "laterale",
        codici: ["7409208", "—", "—", "7400467"],
        note_righe: ["RKSN2 4 VS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Inox – Uscita laterale (RKSN2) – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["7409210", "—", "—", "7400467"],
        note_righe: ["RKSN2 4 VS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Inox – Tubo telescopico (RKFN3) – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "tubo",
        codici: ["7408960", "7428140", "—", "7400467"],
        note_righe: ["RKFN3 4 VS 20", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Inox – Tubo telescopico (RKFN3) – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "tubo",
        codici: ["7408962", "7428140", "—", "7400467"],
        note_righe: ["RKFN3 4 VS 25", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 250-3 9"]
      },
      // Ottone
      {
        label: "Dim. 4 quadrata – Ottone – Cieca (RKN3) – Riv. 20mm",
        forma: "quadrata", finitura: "ottone", riv: 20, uscita: "cieca",
        codici: ["7408952", "—", "—", "7400467"],
        note_righe: ["RKN3 4 MS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Ottone – Cieca (RKN3) – Riv. 25mm",
        forma: "quadrata", finitura: "ottone", riv: 25, uscita: "cieca",
        codici: ["7408956", "—", "—", "7400467"],
        note_righe: ["RKN3 4 MS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Ottone – Uscita laterale (RKSN2) – Riv. 20mm",
        forma: "quadrata", finitura: "ottone", riv: 20, uscita: "laterale",
        codici: ["7409202", "—", "—", "7400467"],
        note_righe: ["RKSN2 4 MS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 4 quadrata – Ottone – Uscita laterale (RKSN2) – Riv. 25mm",
        forma: "quadrata", finitura: "ottone", riv: 25, uscita: "laterale",
        codici: ["7409204", "—", "—", "7400467"],
        note_righe: ["RKSN2 4 MS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      // ── ROTONDE dim. R4 (Ø 214mm) ───────────────────────────────
      // Inox
      {
        label: "Dim. R4 rotonda – Inox – Cieca (RKR2) – Riv. 20mm",
        forma: "rotonda", finitura: "inox", riv: 20, uscita: "cieca",
        codici: ["7409088", "—", "—", "7400467"],
        note_righe: ["RKR2 4V 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Inox – Cieca (RKR2) – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "cieca",
        codici: ["7409090", "—", "—", "7400467"],
        note_righe: ["RKR2 4V 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Inox – Uscita laterale (RKS2) – Riv. 20mm",
        forma: "rotonda", finitura: "inox", riv: 20, uscita: "laterale",
        codici: ["7409258", "—", "—", "7400467"],
        note_righe: ["RKS2 R4 V20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Inox – Uscita laterale (RKS2) – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["7409260", "—", "—", "7400467"],
        note_righe: ["RKS2 R4 V25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Inox – Tubo telescopico (RKFR2) – Riv. 20mm",
        forma: "rotonda", finitura: "inox", riv: 20, uscita: "tubo",
        codici: ["7409422", "7428140", "—", "7400467"],
        note_righe: ["RKFR2 4 V20", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Inox – Tubo telescopico (RKFR2) – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "tubo",
        codici: ["7409424", "7428140", "—", "7400467"],
        note_righe: ["RKFR2 4 V25", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 250-3 9"]
      },
      // Ottone
      {
        label: "Dim. R4 rotonda – Ottone – Cieca (RKR2) – Riv. 20mm",
        forma: "rotonda", finitura: "ottone", riv: 20, uscita: "cieca",
        codici: ["7409082", "—", "—", "7400467"],
        note_righe: ["RKR2 4M 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Ottone – Cieca (RKR2) – Riv. 25mm",
        forma: "rotonda", finitura: "ottone", riv: 25, uscita: "cieca",
        codici: ["7409084", "—", "—", "7400467"],
        note_righe: ["RKR2 4M 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Ottone – Uscita laterale (RKS2) – Riv. 20mm",
        forma: "rotonda", finitura: "ottone", riv: 20, uscita: "laterale",
        codici: ["7409252", "—", "—", "7400467"],
        note_righe: ["RKS2 R4 M20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. R4 rotonda – Ottone – Uscita laterale (RKS2) – Riv. 25mm",
        forma: "rotonda", finitura: "ottone", riv: 25, uscita: "laterale",
        codici: ["7409254", "—", "—", "7400467"],
        note_righe: ["RKS2 R4 M25", "", "scegli box ↓", "DUG 250-3 9"]
      },
    ],
    box: [
      { codice: "7429194", tipo: "GTI 4",  desc: "Fino a 4 dispositivi standard Italia", pavimenti_ok: ["massetto", "flottante"] },
      { codice: "7407577", tipo: "MT4 6I", desc: "Fino a 6 Modul45®",                   pavimenti_ok: ["massetto", "flottante"] },
    ],
    estensioni: [
      { codice: "⚠7410134", desc: "Accessorio altezza fino a 240mm" },
      { codice: "⚠7410136", desc: "Accessorio altezza fino a 320mm" },
    ],
    piedini: PIEDINI_RK_NEV2,
    altezze: {
      flottante: "riv. 20mm: 105–150mm  |  riv. 25mm: 110–155mm",
      massetto:  "riv. 20mm: 105–150mm  |  riv. 25mm: 110–155mm"
    },
  },

  // ── CASSETTE LIVELLABILI dim. 9 / R9 ───────────────────────────
  // Codici verificati 2026-03
  CASS_LIV_9: {
    label: "Cassetta livellabile 9 / R9",
    famiglia: "Cassette livellabili",
    forma: "quadrata o rotonda",
    dimensione: "9: 243×243mm  |  R9: Ø 304mm",
    ip_chiuso: "IP40 (lat.) / IP66 (tubo teles.)",
    ip_aperto: "IP20",
    carico: "3 kN / 20 kN heavy",
    rivestimento_max: "20 o 25 mm",
    note: "Con piedini. Altezza regolazione: riv. 20mm → 105–150mm; riv. 25mm → 110–155mm. Versione tubo telescopico da completare con coperchio TUK2 GV art. 7428140.",
    pavimenti: ["massetto", "flottante"],
    colonne: ["Torretta", "Cop. tubo (se tubo)", "Box portafrutti", "Accessori flottante", "Accessori massetto"],
    righe: [
      // ── QUADRATE dim. 9 (243×243mm) ─────────────────────────────
      // Inox
      {
        label: "Dim. 9 quadrata – Inox – Cieca (RKN3) – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "cieca",
        codici: ["7408970", "—", "—", "7400467"],
        note_righe: ["RKN3 9 VS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Inox – Cieca (RKN3) – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "cieca",
        codici: ["7408974", "—", "—", "7400467"],
        note_righe: ["RKN3 9 VS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Inox – Uscita laterale (RKSN2) – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "laterale",
        codici: ["7409218", "—", "—", "7400467"],
        note_righe: ["RKSN2 9 VS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Inox – Uscita laterale (RKSN2) – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["7409220", "—", "—", "7400467"],
        note_righe: ["RKSN2 9 VS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Inox – Tubo telescopico (RKFN3) – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "tubo",
        codici: ["7408980", "7428140", "—", "7400467"],
        note_righe: ["RKFN3 9 VS 20", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Inox – Tubo telescopico (RKFN3) – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "tubo",
        codici: ["7408982", "7428140", "—", "7400467"],
        note_righe: ["RKFN3 9 VS 25", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 250-3 9"]
      },
      // Ottone
      {
        label: "Dim. 9 quadrata – Ottone – Cieca (RKN3) – Riv. 20mm",
        forma: "quadrata", finitura: "ottone", riv: 20, uscita: "cieca",
        codici: ["7408972", "—", "—", "7400467"],
        note_righe: ["RKN3 9 MS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Ottone – Cieca (RKN3) – Riv. 25mm",
        forma: "quadrata", finitura: "ottone", riv: 25, uscita: "cieca",
        codici: ["7408976", "—", "—", "7400467"],
        note_righe: ["RKN3 9 MS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Ottone – Uscita laterale (RKSN2) – Riv. 20mm",
        forma: "quadrata", finitura: "ottone", riv: 20, uscita: "laterale",
        codici: ["7409212", "—", "—", "7400467"],
        note_righe: ["RKSN2 9 MS 20", "", "scegli box ↓", "DUG 250-3 9"]
      },
      {
        label: "Dim. 9 quadrata – Ottone – Uscita laterale (RKSN2) – Riv. 25mm",
        forma: "quadrata", finitura: "ottone", riv: 25, uscita: "laterale",
        codici: ["7409214", "—", "—", "7400467"],
        note_righe: ["RKSN2 9 MS 25", "", "scegli box ↓", "DUG 250-3 9"]
      },
      // ── ROTONDE dim. R9 (Ø 304mm) ───────────────────────────────
      // Inox
      {
        label: "Dim. R9 rotonda – Inox – Cieca (RKR2) – Riv. 20mm",
        forma: "rotonda", finitura: "inox", riv: 20, uscita: "cieca",
        codici: ["7409128", "—", "—", "7400549"],
        note_righe: ["RKR2 9V 20", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Inox – Cieca (RKR2) – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "cieca",
        codici: ["7409130", "—", "—", "7400549"],
        note_righe: ["RKR2 9V 25", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Inox – Uscita laterale (RKS2) – Riv. 20mm",
        forma: "rotonda", finitura: "inox", riv: 20, uscita: "laterale",
        codici: ["7409278", "—", "—", "7400549"],
        note_righe: ["RKS2 R9 V20", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Inox – Uscita laterale (RKS2) – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["7409280", "—", "—", "7400549"],
        note_righe: ["RKS2 R9 V25", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Inox – Tubo telescopico (RKFR2) – Riv. 20mm",
        forma: "rotonda", finitura: "inox", riv: 20, uscita: "tubo",
        codici: ["7409430", "7428140", "—", "7400549"],
        note_righe: ["RKFR2 9 V20", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Inox – Tubo telescopico (RKFR2) – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "tubo",
        codici: ["7409432", "7428140", "—", "7400549"],
        note_righe: ["RKFR2 9 V25", "TUK2 GV (obbl.)", "scegli box ↓", "DUG 350-3 R9"]
      },
      // Ottone
      {
        label: "Dim. R9 rotonda – Ottone – Cieca (RKR2) – Riv. 20mm",
        forma: "rotonda", finitura: "ottone", riv: 20, uscita: "cieca",
        codici: ["7409122", "—", "—", "7400549"],
        note_righe: ["RKR2 9M 20", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Ottone – Cieca (RKR2) – Riv. 25mm",
        forma: "rotonda", finitura: "ottone", riv: 25, uscita: "cieca",
        codici: ["7409124", "—", "—", "7400549"],
        note_righe: ["RKR2 9M 25", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Ottone – Uscita laterale (RKS2) – Riv. 20mm",
        forma: "rotonda", finitura: "ottone", riv: 20, uscita: "laterale",
        codici: ["7409272", "—", "—", "7400549"],
        note_righe: ["RKS2 R9 M20", "", "scegli box ↓", "DUG 350-3 R9"]
      },
      {
        label: "Dim. R9 rotonda – Ottone – Uscita laterale (RKS2) – Riv. 25mm",
        forma: "rotonda", finitura: "ottone", riv: 25, uscita: "laterale",
        codici: ["7409274", "—", "—", "7400549"],
        note_righe: ["RKS2 R9 M25", "", "scegli box ↓", "DUG 350-3 R9"]
      },
    ],
    box: [
      { codice: "7429196", tipo: "GTI 14",   desc: "Fino a 14 dispositivi standard Italia",                         pavimenti_ok: ["massetto", "flottante"] },
      { codice: "7407579", tipo: "MT9 12I",  desc: "3 file da 4 Modul45® (12 totali)",                              pavimenti_ok: ["massetto", "flottante"] },
      { codice: "7408698", tipo: "MT45 V0",  desc: "Fino a 8 Modul45® (richiede ×2 pz art. 7408670)",              pavimenti_ok: ["massetto", "flottante"] },
    ],
    accessorio_obbligatorio_per_box: {
      "7408698": { codice: "7408670", tipo: "Acc. MT45 V0", desc: "Completamento MT45 V0", qty: 2 },
    },
    estensioni: [
      { codice: "⚠7410134", desc: "Accessorio altezza fino a 240mm" },
      { codice: "⚠7410136", desc: "Accessorio altezza fino a 320mm" },
    ],
    piedini: PIEDINI_RK_NEV2,
    altezze: {
      flottante: "riv. 20mm: 105–150mm  |  riv. 25mm: 110–155mm",
      massetto:  "riv. 20mm: 105–150mm  |  riv. 25mm: 110–155mm"
    },
  },

  // ── CASSETTE DISACCOPPIATE 4 / R4 ─────────────────────────────
  DISACC_4: {
    label: "Cassetta disaccoppiata 4 / R4",
    famiglia: "Cassette disaccoppiate",
    forma: "quadrata o rotonda",
    dimensione: "4: 199×199mm  |  R4: Ø 214mm",
    ip_chiuso: "IP40 (lat.) / IP66 (tubo teles.)",
    ip_aperto: "IP20",
    carico: "3 kN",
    rivestimento_max: "20 o 25 mm",
    note: "Senza piedini. Altezza min. 90mm. Flottante: culla DUG OBBLIGATORIA. ⚠ Accessorio flottante NON disponibile per versione R4 rotonda.",
    pavimenti: ["massetto", "flottante"],
    colonne: ["Torretta", "Cop. tubo (se tubo)", "Box portafrutti", "Accessori flottante", "Accessori massetto"],
    righe: [
      // verificato dal file: accessorio flottante 7428544 (DUG RK UAN 5)
      {
        label: "Dim. 4 quadrata – Inox – Uscita laterale – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "laterale",
        codici: ["⚠7408810", "—", "⚠7407577", "7428544", "⚠7410540"],
        note_righe: ["", "", "MT4 6I / GT I4", "DUG RK UAN 5 (verificato)", "NW 250-3 QK"]
      },
      {
        label: "Dim. 4 quadrata – Inox – Uscita laterale – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["⚠7408812", "—", "⚠7407577", "7428544", "⚠7410540"],
        note_righe: ["", "", "MT4 6I / GT I4", "DUG RK UAN 5", "NW 250-3 QK"]
      },
      {
        label: "Dim. R4 rotonda – Inox – Uscita laterale – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["⚠7408820", "—", "⚠7407577", "⚠N/D", "⚠7410556"],
        note_righe: ["", "", "MT4 6I / GT I4", "NON DISPONIBILE per rotonda", "NW 350-3 RK"]
      },
    ],
    avviso_rotonda_flottante: true,
    altezze: { massetto: "90mm min.", flottante: "90mm min." },
  },

  // ── CASSETTE DISACCOPPIATE 9 / R9 ─────────────────────────────
  DISACC_9: {
    label: "Cassetta disaccoppiata 9 / R9",
    famiglia: "Cassette disaccoppiate",
    forma: "quadrata o rotonda",
    dimensione: "9: 243×243mm  |  R9: Ø 304mm",
    ip_chiuso: "IP40 (lat.) / IP66 (tubo teles.)",
    ip_aperto: "IP20",
    carico: "3 kN",
    rivestimento_max: "20 o 25 mm",
    note: "Senza piedini. Altezza min. 90mm. ⚠ Accessorio flottante NON disponibile per versione R9 rotonda.",
    pavimenti: ["massetto", "flottante"],
    colonne: ["Torretta", "Cop. tubo (se tubo)", "Box portafrutti", "Accessori flottante", "Accessori massetto"],
    righe: [
      // verificato: 7409232
      {
        label: "Dim. 9 quadrata – Inox – Uscita laterale – Riv. 20mm",
        forma: "quadrata", finitura: "inox", riv: 20, uscita: "laterale",
        codici: ["7409232", "—", "⚠7407578", "⚠7428547", "⚠7410540"],
        note_righe: ["verificato", "", "MT9 9I / GT I14", "DUG RK UAN 9", "NW 250-3 QK"]
      },
      {
        label: "Dim. 9 quadrata – Inox – Uscita laterale – Riv. 25mm",
        forma: "quadrata", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["⚠7409234", "—", "⚠7407578", "⚠7428547", "⚠7410540"],
        note_righe: ["", "", "MT9 9I / GT I14", "DUG RK UAN 9", "NW 250-3 QK"]
      },
      {
        label: "Dim. R9 rotonda – Inox – Uscita laterale – Riv. 25mm",
        forma: "rotonda", finitura: "inox", riv: 25, uscita: "laterale",
        codici: ["⚠7409260", "—", "⚠7407578", "⚠N/D", "⚠7410556"],
        note_righe: ["", "", "MT9 9I / GT I14", "NON DISPONIBILE per rotonda", "NW 350-3 RK"]
      },
    ],
    avviso_rotonda_flottante: true,
    altezze: { massetto: "90mm min.", flottante: "90mm min." },
  },

  // ── CASSETTE PAVIMENTO SEMINATO ────────────────────────────────
  // Dati verificati 2026-03
  // Solo massetto. Inox, rivestibile 25 mm nella levigatura.
  // Scatola massetto dipende dalla dim. (250 o 350) della torretta scelta.
  // Altezza totale = reg. cassetta (73–113 mm) + 12,5 mm fisso + h scatola massetto.
  // Coperchio tubo 7428140 obbligatorio solo con versioni tubo telescopico.
  SEMINATO: {
    label: "Cassetta pav. seminato",
    famiglia: "Seminato",
    forma: "rotonda o quadrata",
    dimensione: "Rotonda: Ø ~250 mm  |  Quadrata: ~250×250 mm",
    ip_chiuso: "IP40 (lat./cieco) / IP66 (tubo teles.)",
    ip_aperto: "IP20",
    carico: "20 kN",
    rivestimento_max: "25 mm (nella levigatura)",
    note: "Solo installazione su MASSETTO. Acciaio inox. Rivestimento 25 mm nella levigatura a filo. Coperchio tubo telescopico (Art. 7428140) obbligatorio con versioni tubo.",
    pavimenti: ["massetto"],
    tipo: "gruppi",

    gruppi: [
      // ── GRUPPO 1: QUADRATA ────────────────────────────────────
      {
        id: "QUADRATA",
        label: "Quadrata",
        sottotitolo: "Scegli la variante di coperchio e la scatola massetto in base all'altezza disponibile",
        righe: [
          {
            label: "TRKN 9 VS 250 — Coperchio cieco – Dim. 250",
            finitura: "inox", uscita: "cieco", dim: "250",
            codice: "7409601",
          },
          {
            label: "TRKN 9 VS 350 — Coperchio cieco – Dim. 350",
            finitura: "inox", uscita: "cieco", dim: "350",
            codice: "7409621",
          },
          {
            label: "TRKSN 9 VS 250 — Uscita cavi laterale – Dim. 250",
            finitura: "inox", uscita: "laterale", dim: "250",
            codice: "7409603",
          },
          {
            label: "TRKSN 9 VS 350 — Uscita cavi laterale – Dim. 350",
            finitura: "inox", uscita: "laterale", dim: "350",
            codice: "7409623",
          },
          {
            label: "TRKFN 9 VS 250 — Tubo telescopico – Dim. 250",
            finitura: "inox", uscita: "tubo", dim: "250",
            codice: "7409605",
          },
          {
            label: "TRKFN 9 VS 350 — Tubo telescopico – Dim. 350",
            finitura: "inox", uscita: "tubo", dim: "350",
            codice: "7409625",
          },
        ],
        accessorio_obbligatorio_per_uscita: {
          tubo: { codice: "7428140", tipo: "TUK2 GV", desc: "Coperchio per tubo telescopico — obbligatorio", qty: 1 },
        },
        box: [
          { codice: "7408698", tipo: "MT45 V0",  desc: "8 Modul45® (richiede ×2 pz art. 7408670)", altezza_min: 85, pavimenti_ok: ["massetto"], nota: "⚠ Completare con 2× art. 7408670" },
          { codice: "7429196", tipo: "GT I14",   desc: "14 dispositivi standard Italia",            altezza_min: 85, pavimenti_ok: ["massetto"], nota: "" },
          { codice: "7407578", tipo: "MT9 9I",   desc: "9 Modul45®",                               altezza_min: 85, pavimenti_ok: ["massetto"], nota: "" },
          { codice: "7407579", tipo: "MT9 12I",  desc: "3 file da 4 Modul45® (12 totali)",                              altezza_min: 85, pavimenti_ok: ["massetto"], nota: "" },
        ],
        accessorio_obbligatorio_per_box: {
          "7408698": { codice: "7408670", tipo: "Acc. MT45 V0", desc: "Accessorio completamento MT45 V0", qty: 2 },
        },
        scatole_massetto: [
          // dim 250
          { codice: "7410060", tipo: "UGD55 250-3 9R",   desc: "h 55–80 mm",     h_min: 55,  h_max: 80,  dim: "250" },
          { codice: "7410068", tipo: "UZD 80125 250-4",  desc: "h 80–125 mm",    h_min: 80,  h_max: 125, dim: "250" },
          { codice: "7410070", tipo: "UZD 120165 250-4M",desc: "h 120–165 mm",   h_min: 120, h_max: 165, dim: "250" },
          { codice: "7410072", tipo: "UZD 160205 250-4", desc: "h 160–205 mm",   h_min: 160, h_max: 205, dim: "250" },
          // dim 350
          { codice: "7410062", tipo: "UGD55 350-3 9R",   desc: "h 55–80 mm",     h_min: 55,  h_max: 80,  dim: "350" },
          { codice: "7410074", tipo: "UZD 80125 350-4",  desc: "h 80–125 mm",    h_min: 80,  h_max: 125, dim: "350" },
          { codice: "7410076", tipo: "UZD 120165 350-4M",desc: "h 120–165 mm",   h_min: 120, h_max: 165, dim: "350" },
          { codice: "7410078", tipo: "UZD 160205 350-4", desc: "h 160–205 mm",   h_min: 160, h_max: 205, dim: "350" },
        ],
        altezze: { massetto: "dipende da scatola scelta (cassetta: 73–113 mm + 12,5 mm fisso + h scatola)" },
      },

      // ── GRUPPO 2: ROTONDA ─────────────────────────────────────
      {
        id: "ROTONDA",
        label: "Rotonda",
        sottotitolo: "Scegli la variante di coperchio e la scatola massetto in base all'altezza disponibile",
        righe: [
          {
            label: "TRKRN 9 VS 250 — Coperchio cieco – Dim. 250",
            finitura: "inox", uscita: "cieco", dim: "250",
            codice: "7409495",
          },
          {
            label: "TRKRN 9 VS 350 — Coperchio cieco – Dim. 350",
            finitura: "inox", uscita: "cieco", dim: "350",
            codice: "7409650",
          },
          {
            label: "TRKRFN 9 VS 250 — Tubo telescopico – Dim. 250",
            finitura: "inox", uscita: "tubo", dim: "250",
            codice: "7409497",
          },
          {
            label: "TRKRFN 9 VS 350 — Tubo telescopico – Dim. 350",
            finitura: "inox", uscita: "tubo", dim: "350",
            codice: "7409651",
          },
        ],
        accessorio_obbligatorio_per_uscita: {
          tubo: { codice: "7428140", tipo: "TUK2 GV", desc: "Coperchio per tubo telescopico — obbligatorio", qty: 1 },
        },
        box: [
          { codice: "7408698", tipo: "MT45 V0",  desc: "8 Modul45® (richiede ×2 pz art. 7408670)", altezza_min: 85, pavimenti_ok: ["massetto"], nota: "⚠ Completare con 2× art. 7408670" },
          { codice: "7429196", tipo: "GT I14",   desc: "14 dispositivi standard Italia",            altezza_min: 85, pavimenti_ok: ["massetto"], nota: "" },
          { codice: "7407578", tipo: "MT9 9I",   desc: "9 Modul45®",                               altezza_min: 85, pavimenti_ok: ["massetto"], nota: "" },
          { codice: "7407579", tipo: "MT9 12I",  desc: "3 file da 4 Modul45® (12 totali)",                              altezza_min: 85, pavimenti_ok: ["massetto"], nota: "" },
        ],
        accessorio_obbligatorio_per_box: {
          "7408698": { codice: "7408670", tipo: "Acc. MT45 V0", desc: "Accessorio completamento MT45 V0", qty: 2 },
        },
        scatole_massetto: [
          // dim 250
          { codice: "7410060", tipo: "UGD55 250-3 9R",   desc: "h 55–80 mm",     h_min: 55,  h_max: 80,  dim: "250" },
          { codice: "7410068", tipo: "UZD 80125 250-4",  desc: "h 80–125 mm",    h_min: 80,  h_max: 125, dim: "250" },
          { codice: "7410070", tipo: "UZD 120165 250-4M",desc: "h 120–165 mm",   h_min: 120, h_max: 165, dim: "250" },
          { codice: "7410072", tipo: "UZD 160205 250-4", desc: "h 160–205 mm",   h_min: 160, h_max: 205, dim: "250" },
          // dim 350
          { codice: "7410062", tipo: "UGD55 350-3 9R",   desc: "h 55–80 mm",     h_min: 55,  h_max: 80,  dim: "350" },
          { codice: "7410074", tipo: "UZD 80125 350-4",  desc: "h 80–125 mm",    h_min: 80,  h_max: 125, dim: "350" },
          { codice: "7410076", tipo: "UZD 120165 350-4M",desc: "h 120–165 mm",   h_min: 120, h_max: 165, dim: "350" },
          { codice: "7410078", tipo: "UZD 160205 350-4", desc: "h 160–205 mm",   h_min: 160, h_max: 205, dim: "350" },
        ],
        altezze: { massetto: "dipende da scatola scelta (cassetta: 73–113 mm + 12,5 mm fisso + h scatola)" },
      },
    ],
  },

  // ── GES R2 ─────────────────────────────────────────────────────
  // Dati verificati (2024-07)
  // Metallo: IP66, carico 20 kN. Plastica: IP40, carico 500 N.
  // Coperchio non rivestibile. Telaio integrato.
  GES_R2: {
    label: "GES R2",
    famiglia: "GES R2",
    forma: "rotonda",
    dimensione: "Ø 140 mm",
    ip_chiuso: "IP66 (metallo) / IP40 (plastica)",
    ip_aperto: "IP20",
    carico: "20 kN (metallo) / 500 N (plastica)",
    rivestimento_max: "Non rivestibile",
    note: "Versioni metallo: IP66, carico 20 kN — finiture Nero, Nichel ossidato, Nichel, Ottonato, Ramato, Cromato. Versioni plastica: IP40, 500 N — Grigio ferro RAL 7011 o Nero grafite RAL 9011.",
    pavimenti: ["massetto", "flottante"],
    tipo: "gruppi",
    gruppi: [
      // ── GRUPPO 1: Uscita laterale — metallo ─────────────────────
      {
        id: "LAT",
        label: "Uscita laterale — metallo (IP66 / 20 kN)",
        sottotitolo: "6 finiture disponibili — Nero, Nichel ox., Nichel, Ottonato, Ramato, Cromato",
        righe: [
          { label: "Nero RAL 9005",      finitura: "nero",    codice: "7408847" },
          { label: "Nichel ossidato",     finitura: "ni-o",    codice: "7408849" },
          { label: "Nichel",             finitura: "nichel",  codice: "7408850" },
          { label: "Ottonato",           finitura: "ottone",  codice: "7408852" },
          { label: "Ramato",             finitura: "rame",    codice: "7408854" },
          { label: "Cromato",            finitura: "cromo",   codice: "7408856" },
        ],
        altezze: { massetto: "85–130 mm", flottante: "85–130 mm" },
      },
      // ── GRUPPO 2: Tubo telescopico — metallo ────────────────────
      {
        id: "TUBO",
        label: "Tubo telescopico — metallo (IP66 / 20 kN)",
        sottotitolo: "6 finiture disponibili — Nero, Nichel ox., Nichel, Ottonato, Ramato, Cromato",
        righe: [
          { label: "Nero RAL 9005",      finitura: "nero",    codice: "7408857" },
          { label: "Nichel ossidato",     finitura: "ni-o",    codice: "7408859" },
          { label: "Nichel",             finitura: "nichel",  codice: "7408860" },
          { label: "Ottonato",           finitura: "ottone",  codice: "7408862" },
          { label: "Ramato",             finitura: "rame",    codice: "7408864" },
          { label: "Cromato",            finitura: "cromo",   codice: "7408866" },
        ],
        altezze: { massetto: "85–130 mm", flottante: "85–130 mm" },
      },
      // ── GRUPPO 3: Cieco con chiave sicurezza — metallo ──────────
      {
        id: "CIECO",
        label: "Cieco con chiave sicurezza ottagonale — metallo (IP66 / 20 kN)",
        sottotitolo: "5 finiture disponibili — Nichel ox., Nichel, Ottonato, Ramato, Cromato",
        righe: [
          { label: "Nichel ossidato",     finitura: "ni-o",    codice: "7408869" },
          { label: "Nichel",             finitura: "nichel",  codice: "7408870" },
          { label: "Ottonato",           finitura: "ottone",  codice: "7408872" },
          { label: "Ramato",             finitura: "rame",    codice: "7408874" },
          { label: "Cromato",            finitura: "cromo",   codice: "7408876" },
        ],
        altezze: { massetto: "85–130 mm", flottante: "85–130 mm" },
      },
      // ── GRUPPO 4: Plastica (IP40 / 500N) ────────────────────────
      {
        id: "PLAST",
        label: "Versione plastica (IP40 / 500 N)",
        sottotitolo: "Grigio ferro RAL 7011 o Nero grafite RAL 9011 — uscita laterale o cieco",
        righe: [
          { label: "Grigio ferro RAL 7011 – Uscita laterale", finitura: "grigio", uscita: "laterale", codice: "7405082" },
          { label: "Nero grafite RAL 9011 – Uscita laterale", finitura: "nero",   uscita: "laterale", codice: "7408084" },
          { label: "Grigio ferro RAL 7011 – Cieco",           finitura: "grigio", uscita: "cieco",    codice: "7405086" },
          { label: "Nero grafite RAL 9011 – Cieco",           finitura: "nero",   uscita: "cieco",    codice: "7405088" },
        ],
        altezze: { massetto: "85–130 mm", flottante: "85–130 mm" },
      },
    ],
  },
  // ── CASSETTE TELAIO ────────────────────────────────────────────
  // Solo massetto. Coperchio 288×288mm. Codici verificati 2026-05
  CASS_TEL: {
    label: "Cassette telaio",
    famiglia: "Cassette telaio",
    forma: "quadrata",
    dimensione: "288×288mm (coperchio)",
    ip_laterale: "IP40",
    ip_tubo: "IP44",
    ip_cieco: "IP44",
    carico: "⚠ da verificare",
    rivestimento_max: "fino a 28mm",
    note: "Solo pavimento massetto. Da completare con scatola da massetto. " +
          "Altezza totale = altezza scatola massetto + spessore rivestimento cassetta. " +
          "Uscita laterale: integrare con Art. 7407995 (uscita cavi inox). " +
          "Tubo telescopico: integrare con Art. 7428140 (coperchio TUK2 GV). " +
          "Coperchio cieco: solo pozzetto di ispezione, nessun box portafrutti.",
    pavimenti: ["massetto"],

    scatole_massetto: [
      { codice: "7410060", tipo: "UGD55 250-3 9R",   desc: "H 55–80mm",    h_min: 55,  h_max: 80  },
      { codice: "7410068", tipo: "UZD 80125 250-4",  desc: "H 80–125mm",   h_min: 80,  h_max: 125 },
      { codice: "7410070", tipo: "UZD 120165 250-4", desc: "H 120–165mm",  h_min: 120, h_max: 165 },
      { codice: "7410072", tipo: "UZD 160205 250-4", desc: "H 160–205mm",  h_min: 160, h_max: 205 },
    ],

    // Box portafrutti: da completare (in attesa di specifica OBO)
    box: [],
    box_note: "Da definire — in attesa di specifica compatibilità dispositivi.",

    colonne: ["Torretta", "Accessorio uscita", "Scatola massetto", "Box portafrutti"],
    righe: [
      // ── Inox – Uscita cavi laterale (IP40) ──────────────────────
      {
        label: "Inox – Uscita laterale (RKS 2V2) – Riv. fino a 13mm",
        uscita: "laterale", riv_max: 13,
        codici: ["7406550", "7407995", "→ scegli", "⚠ da definire"],
        note_righe: ["RKS 2V2 15", "Uscita cavi inox (obbl.)", "", ""]
      },
      {
        label: "Inox – Uscita laterale (RKS 2V2) – Riv. fino a 18mm",
        uscita: "laterale", riv_max: 18,
        codici: ["7406554", "7407995", "→ scegli", "⚠ da definire"],
        note_righe: ["RKS 2V2 20", "Uscita cavi inox (obbl.)", "", ""]
      },
      {
        label: "Inox – Uscita laterale (RKS 2V2) – Riv. fino a 23mm",
        uscita: "laterale", riv_max: 23,
        codici: ["7406558", "7407995", "→ scegli", "⚠ da definire"],
        note_righe: ["RKS 2V2 25", "Uscita cavi inox (obbl.)", "", ""]
      },
      {
        label: "Inox – Uscita laterale (RKS 2V2) – Riv. fino a 28mm",
        uscita: "laterale", riv_max: 28,
        codici: ["7406560", "7407995", "→ scegli", "⚠ da definire"],
        note_righe: ["RKS 2V2 30", "Uscita cavi inox (obbl.)", "", ""]
      },
      // ── Inox – Uscita tubo telescopico (IP44) ───────────────────
      {
        label: "Inox – Tubo telescopico (RKF3 V2) – Riv. fino a 8mm",
        uscita: "tubo", riv_max: 8,
        codici: ["7409402", "7428140", "→ scegli", "⚠ da definire"],
        note_righe: ["RKF3 V2 10", "TUK2 GV (obbl.)", "", ""]
      },
      {
        label: "Inox – Tubo telescopico (RKF3 V2) – Riv. fino a 13mm",
        uscita: "tubo", riv_max: 13,
        codici: ["7409404", "7428140", "→ scegli", "⚠ da definire"],
        note_righe: ["RKF3 V2 15", "TUK2 GV (obbl.)", "", ""]
      },
      {
        label: "Inox – Tubo telescopico (RKF3 V2) – Riv. fino a 18mm",
        uscita: "tubo", riv_max: 18,
        codici: ["7409406", "7428140", "→ scegli", "⚠ da definire"],
        note_righe: ["RKF3 V2 20", "TUK2 GV (obbl.)", "", ""]
      },
      {
        label: "Inox – Tubo telescopico (RKF3 V2) – Riv. fino a 23mm",
        uscita: "tubo", riv_max: 23,
        codici: ["7409408", "7428140", "→ scegli", "⚠ da definire"],
        note_righe: ["RKF3 V2 25", "TUK2 GV (obbl.)", "", ""]
      },
      {
        label: "Inox – Tubo telescopico (RKF3 V2) – Riv. fino a 28mm",
        uscita: "tubo", riv_max: 28,
        codici: ["7409410", "7428140", "→ scegli", "⚠ da definire"],
        note_righe: ["RKF3 V2 30", "TUK2 GV (obbl.)", "", ""]
      },
      // ── Inox – Coperchio cieco (IP44) — solo pozzetto ispezione ─
      {
        label: "Inox – Coperchio cieco (RK V2) – Riv. fino a 8mm",
        uscita: "cieco", riv_max: 8,
        codici: ["7406000", "—", "→ scegli", "—"],
        note_righe: ["RK V2 10", "Solo ispezione", "", "Nessun box"]
      },
      {
        label: "Inox – Coperchio cieco (RK V2) – Riv. fino a 13mm",
        uscita: "cieco", riv_max: 13,
        codici: ["7406004", "—", "→ scegli", "—"],
        note_righe: ["RK V2 15", "Solo ispezione", "", "Nessun box"]
      },
      {
        label: "Inox – Coperchio cieco (RK V2) – Riv. fino a 18mm",
        uscita: "cieco", riv_max: 18,
        codici: ["7406008", "—", "→ scegli", "—"],
        note_righe: ["RK V2 20", "Solo ispezione", "", "Nessun box"]
      },
      {
        label: "Inox – Coperchio cieco (RK V2) – Riv. fino a 23mm",
        uscita: "cieco", riv_max: 23,
        codici: ["7406012", "—", "→ scegli", "—"],
        note_righe: ["RK V2 25", "Solo ispezione", "", "Nessun box"]
      },
      {
        label: "Inox – Coperchio cieco (RK V2) – Riv. fino a 28mm",
        uscita: "cieco", riv_max: 28,
        codici: ["7406016", "—", "→ scegli", "—"],
        note_righe: ["RK V2 30", "Solo ispezione", "", "Nessun box"]
      },
    ],
  },
};
Object.keys(DATI_TABELLA).forEach(k => { DB[k] = DATI_TABELLA[k]; });


// ─────────────────────────────────────────────────────────────────
// CONFIGURAZIONE UI
// ─────────────────────────────────────────────────────────────────

const FAMIGLIE = [
  {
    id: "GES", label: "Torrette GES", colore: "#F39B00",
    sistemi: ["GES4","GES9","GRAF9"],
    icona: "⬛",
    descrizione: "Il grande classico delle installazioni sottopavimento: torrette quadrate e rotonde per uffici e ambienti professionali. Installabili su massetto o flottante, in plastica o metallo. Compatibili con Modul45® e standard Italia. Ideale per uffici, aree commerciali e showroom.",
    tag: ["Uffici","Plastica","Massetto/Flottante"],
  },
  {
    id: "UDHOME", label: "UDHOME (All-in-one)", colore: "#1A6EA0",
    sistemi: ["UDHOME_ONE","UDHOME2","UDHOME4","UDHOME9"],
    icona: "🏠",
    descrizione: "La torretta all-in-one per ambienti residenziali, hotel e uffici di rappresentanza. Scatola da incasso integrata con le stesse dimensioni del coperchio. Finiture in inox satinato o ottone massiccio. Coperchio rivestibile (4/9) o prefinito (ONE/2). Spazzola reversibile IP40.",
    tag: ["All-in-one","Inox/Ottone","Hotel","Residenziale","Filo pavimento"],
  },
  {
    id: "Cassette livellabili", label: "Cassette livellabili", colore: "#2E7D32",
    sistemi: ["CASS_LIV_4","CASS_LIV_9"],
    icona: "🔧",
    descrizione: "Cassette con piedini di regolazione per una perfetta integrazione in pavimentazioni di pregio: marmo, cotto, legno, seminato alla veneziana. Altezza min. 105 mm. IP66 con tubo telescopico. Versione heavy-duty fino a 20 kN (2.000 kg) per showroom, stazioni e aeroporti.",
    tag: ["Con piedini","Lavaggio secco/umido","Carichi pesanti","Pavimenti di pregio","Massetto","Filo pavimento"],
  },
  {
    id: "Cassette telaio", label: "Cassette telaio", colore: "#00695C",
    sistemi: ["CASS_TEL"],
    icona: "⬜",
    descrizione: "Cassette a telaio inox per pavimento massetto. Coperchio 288×288mm rivestibile. " +
                 "Disponibili con uscita cavi laterale (IP40), tubo telescopico (IP44) o coperchio cieco (IP44 — solo ispezione). " +
                 "Da abbinare a scatola da massetto con range di altezza da 55 a 205mm.",
    tag: ["Inox","Solo massetto","Rivestibile","Ispezione","IP40/IP44"],
  },
  {
    id: "Cassette disaccoppiate", label: "Cassette disaccoppiate", colore: "#6A1EA0",
    sistemi: ["DISACC_4","DISACC_9"],
    icona: "🔩",
    descrizione: "Variante senza piedini: il telaio superiore è separato dalla scatola da incasso, con regolazione possibile a pavimento finito. Altezza min. 90 mm, ideale quando l'altezza struttura è ridotta. Versione heavy-duty fino a 20 kN. Culla obbligatoria per pavimento flottante.",
    tag: ["Senza piedini","Flottante","Filo pavimento","Lavaggio secco/umido"],
  },
  {
    id: "Seminato", label: "Cassette pav. seminato", colore: "#9C2A2A",
    sistemi: ["SEMINATO"],
    icona: "🪨",
    descrizione: "Cassetta dedicata al pavimento seminato levigato alla veneziana. Solo massetto. Range di altezza 126–442 mm con recesso di 25 mm per la levigatura a filo. Versioni con uscita laterale, tubo telescopico o coperchio cieco.",
    tag: ["Massetto","Riv. 25 mm","Levigato","Filo pavimento"],
  },
  {
    id: "GES R2", label: "Torrette tonde GES R2", colore: "#006060",
    sistemi: ["GES_R2"],
    icona: "⭕",
    descrizione: "Torretta rotonda compatta Ø 140 mm: aspetto discreto, capacità di carico elevatissima e design ricercato. Metallo: IP66, 20 kN, 6 finiture pregiate (cromo, nichel, ottone, rame, nero, nichel ossidato). Plastica: IP40, 500 N. Ideale per showroom, supermercati e spazi comuni.",
    tag: ["Rotonda Ø 140 mm","IP66","2 tonnellate","6 finiture metallo"],
  },
];

function getColore(key) {
  for (const f of FAMIGLIE) if (f.sistemi.includes(key)) return f.colore;
  return "#282a31";
}
function getFamiglia(key) {
  for (const f of FAMIGLIE) if (f.sistemi.includes(key)) return f;
  return null;
}

function isBadge(codice) { return codice && codice.startsWith("⚠"); }
function cleanCode(codice) { return codice ? codice.replace(/^⚠/, "") : "—"; }

// ─────────────────────────────────────────────────────────────────
// PANNELLO DEV — stato sviluppo (solo per uso interno)
// ─────────────────────────────────────────────────────────────────

const DEV_STATO = {
  GES4:       { ok: true,  note: "Dati verificati 2024-07" },
  GES9:       { ok: true,  note: "Dati verificati 2024-07" },
  GRAF9:      { ok: true,  note: "Dati verificati 2024-07" },
  UDHOME_ONE: { ok: true,  note: "Dati verificati 2024-07" },
  UDHOME2:    { ok: true,  note: "Dati verificati 2024-07" },
  UDHOME4:    { ok: true,  note: "Dati verificati 2024-07" },
  UDHOME9:    { ok: true,  note: "Dati verificati 2024-07" },
  GES_R2:     { ok: true,  note: "Dati verificati 2024-07" },
  CASS_LIV_4: { ok: true,  note: "✓ Codici verificati 2026-05 — accessori massetto confermati, DUG RK rimosso" },
  CASS_LIV_9: { ok: true,  note: "✓ Codici verificati 2026-05 — accessori massetto confermati, DUG RK rimosso" },
  CASS_TEL:   { ok: false, note: "⚠ Box portafrutti da definire — torrette verificate 2026-05" },
  DISACC_4:   { ok: false, note: "⚠ Codici placeholder — da verificare sul listino" },
  DISACC_9:   { ok: false, note: "⚠ Codici placeholder — da verificare sul listino" },
  SEMINATO:   { ok: true,  note: "Dati verificati 2026-03" },
};

function DevLegenda({ righe, sistemaKey }) {
  const [aperto, setAperto] = useState(false);
  const stato = DEV_STATO[sistemaKey] || { ok: false, note: "Sistema non mappato" };

  // Conta codici verificati vs da verificare nella configurazione corrente
  const tuttiCodici = (righe || []).map(r => r.codice).filter(Boolean);
  const daVerif = tuttiCodici.filter(c => c.startsWith("⚠")).length;
  const verificati = tuttiCodici.filter(c => !c.startsWith("⚠") && c !== "—").length;

  return (
    <div style={{ marginTop: 20, border: "1px solid #2a2a2a", borderRadius: 3, fontSize: 11, fontFamily: "monospace" }}>
      {/* Intestazione cliccabile */}
      <div
        onClick={() => setAperto(v => !v)}
        style={{ background: "#282a31", color: "#7694a4", padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
      >
        <span style={{ letterSpacing: 1.5, textTransform: "uppercase", fontSize: 10 }}>
          🛠 Dev — Stato sistema{" "}
          <span style={{ color: stato.ok ? "#66BB6A" : "#FFCA28", fontWeight: 700 }}>
            {stato.ok ? "✓ COMPLETO" : "⚠ INCOMPLETO"}
          </span>
          {" "}·{" "}
          <span style={{ color: "#66BB6A" }}>{verificati} verificati</span>
          {daVerif > 0 && <span style={{ color: "#FFCA28" }}> · {daVerif} da verificare</span>}
        </span>
        <span style={{ color: "#888" }}>{aperto ? "▲" : "▼"}</span>
      </div>

      {aperto && (
        <div style={{ background: "#282a31", padding: "10px 14px", color: "#7694a4", lineHeight: 2 }}>
          {/* Nota sistema */}
          <div style={{ marginBottom: 8, color: stato.ok ? "#66BB6A" : "#FFCA28" }}>
            {stato.note}
          </div>

          {/* Legenda pill */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", borderTop: "1px solid #222", paddingTop: 8 }}>
            <span>
              <span style={{ background: "#1B3A20", border: "1px solid #2E7D32", padding: "1px 7px", borderRadius: 3, color: "#81C784" }}>1234567</span>
              {" "}= codice verificato sul listino
            </span>
            <span>
              <span style={{ background: "#3A2A00", border: "1px solid #FFCA28", padding: "1px 7px", borderRadius: 3, color: "#FFD54F" }}>⚠ 1234567</span>
              {" "}= da verificare sul listino
            </span>
            <span>
              <span style={{ background: "#444", border: "1px solid #555", padding: "1px 7px", borderRadius: 3, color: "#aaa" }}>—</span>
              {" "}= voce senza codice (incluso nel sistema)
            </span>
          </div>

          {/* Stato tutti i sistemi */}
          <div style={{ borderTop: "1px solid #222", paddingTop: 8, marginTop: 8 }}>
            <div style={{ color: "#888", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase", fontSize: 10 }}>Avanzamento globale</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(DEV_STATO).map(([key, s]) => (
                <span key={key} style={{
                  background: key === sistemaKey ? (s.ok ? "#1B3A20" : "#3A2800") : "#282a31",
                  border: `1px solid ${key === sistemaKey ? (s.ok ? "#2E7D32" : "#FFCA28") : "#41525d"}`,
                  color: s.ok ? "#66BB6A" : "#FFCA28",
                  padding: "2px 9px", borderRadius: 3,
                  fontWeight: key === sistemaKey ? 700 : 400,
                }}>
                  {s.ok ? "✓" : "⚠"} {key}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function Badge({ children, variant = "ok" }) {
  const styles = {
    ok:      { bg: "#E6F4EA", color: "#1B5E20", border: "#81C784" },
    warn:    { bg: "#FFF8E1", color: "#7A4F00", border: "#FFD54F" },
    neutral: { bg: "#e8e8e8", color: "#444",    border: "#CCC" },
    red:     { bg: "#FFEBEE", color: "#8B0000", border: "#EF9A9A" },
  };
  const s = styles[variant] || styles.neutral;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 3, padding: "1px 6px", fontSize: 11, fontWeight: 600,
      letterSpacing: 0.3, whiteSpace: "nowrap"
    }}>{children}</span>
  );
}

function CodicePill({ codice }) {
  if (!codice || codice === "—") return <span style={{ color: "#999", fontSize: 12 }}>—</span>;
  const isWarn = isBadge(codice);
  const clean = cleanCode(codice);
  const isNA = clean === "N/D";
  const dsUrl = DATASHEET[clean];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
      <span style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 12, fontWeight: 700,
        color: isNA ? "#c0392b" : isWarn ? "#7A4F00" : "#282a31",
        background: isNA ? "#FFEBEE" : isWarn ? "#FFF3CD" : "#F0F7E6",
        border: `1px solid ${isNA ? "#EF9A9A" : isWarn ? "#FFCA28" : "#A5D6A7"}`,
        borderRadius: 3, padding: "1px 6px",
        display: "inline-flex", alignItems: "center", gap: 3
      }}>
        {isWarn && <span style={{ fontSize: 10 }}>⚠</span>}
        {clean}
      </span>
      {dsUrl && (
        <a href={dsUrl} target="_blank" rel="noreferrer"
          title="Scarica datasheet PDF"
          onClick={e => e.stopPropagation()}
          style={{ fontSize:13, lineHeight:1, textDecoration:"none", opacity:0.7, transition:"opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity=1}
          onMouseLeave={e => e.currentTarget.style.opacity=0.7}
        >📄</a>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP COMPONENTS
// ─────────────────────────────────────────────────────────────────

function StepFamiglia({ onSelect }) {
  const [hover, setHover] = useState(null);
  const { isMobile, isTablet } = useM();
  return (
    <div>
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <div style={{ fontSize: 11, color: "#F39B00", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Step 1 di 3</div>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: "#282a31", margin: "0 0 6px", letterSpacing: -0.5 }}>Quale sistema stai cercando?</h2>
        {!isMobile && <p style={{ color: "#555", fontSize: 14, margin: 0, maxWidth: 520 }}>Seleziona la famiglia di prodotti. Ogni categoria è pensata per un tipo di installazione e ambiente specifico.</p>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(300px,1fr))", gap: isMobile ? 10 : 16 }}>
        {FAMIGLIE.map(f => (
          <button key={f.id} onClick={() => onSelect(f.id)}
            onMouseEnter={() => setHover(f.id)}
            onMouseLeave={() => setHover(null)}
            style={{
              background: "#fff", border: `1px solid ${hover === f.id ? f.colore : "#c5d9de"}`,
              borderTop: `3px solid ${f.colore}`, padding: 0, textAlign: "left", cursor: "pointer",
              transition: "all 0.15s", borderRadius: 3,
              boxShadow: hover === f.id ? `0 6px 24px ${f.colore}22` : "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "stretch",
            }}>
            {/* Foto di come rimane installata (dalla brochure OBO "Soluzioni di design") */}
            {FAMIGLIA_FOTO[f.id] ? (
              <div style={{ height: isMobile ? 84 : 150, width: isMobile ? 112 : "auto", flexShrink: 0, overflow: "hidden", borderRadius: isMobile ? "0 0 0 3px" : 0, background: "#e9eef0" }}>
                <img loading="lazy" src={FAMIGLIA_FOTO[f.id].scheda} alt={"Come rimane installata: " + f.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.parentElement.style.display="none"; }} />
              </div>
            ) : (!isMobile && FAMIGLIA_IMG[f.id] && (
              <div style={{ height: 80, overflow: "hidden", borderRadius: "3px 3px 0 0", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #f0f0f0" }}>
                <img referrerPolicy="no-referrer" loading="lazy" src={FAMIGLIA_IMG[f.id]} alt={f.label} style={{ maxHeight: 70, maxWidth: "100%", objectFit: "contain", padding: 6 }} onError={e => { e.target.parentElement.style.display="none"; }} />
              </div>
            ))}
            {/* Icona + titolo */}
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px 10px", display: "flex", alignItems: "center", gap: 10, flex: isMobile ? 1 : undefined }}>
              <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: "50%", background: `${f.colore}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 20, flexShrink: 0 }}>
                {f.icona}
              </div>
              <div>
                <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: "#282a31" }}>{f.label}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{f.sistemi.length} modell{f.sistemi.length > 1 ? "i" : "o"}</div>
              </div>
            </div>
            {/* Descrizione e tag — nascosti su mobile */}
            {!isMobile && <>
              <div style={{ padding: "0 18px 12px", fontSize: 12, color: "#555", lineHeight: 1.6, borderBottom: "1px solid #f0f0f0" }}>{f.descrizione}</div>
              <Caratteristiche chiavi={f.sistemi} stile={{ padding: "10px 18px 12px" }} />
            </>}
            {/* Arrow su mobile */}
            {isMobile && <span style={{ fontSize: 18, color: f.colore, paddingRight: 14 }}>›</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Descrizioni brevi per ciascun modello nel configuratore step 2
const SISTEMA_DESC = {
  GES4:
    "Torretta quadrata 217×217 mm, soluzione classica per uffici e ambienti professionali. " +
    "Installabile su massetto o pavimento flottante a partire da 55 mm. " +
    "Disponibile in plastica (carico 2 kN) o metallo (carico 3 kN). Rivestimento fino a 10 mm con moquette, linoleum o gres. " +
    "Adatta a lavaggio a secco; testata per non degradare l'isolamento acustico del solaio.",
  GES9:
    "Torretta quadrata grande 264×264 mm per massima capacità dispositivi: fino a 12 Modul45® o 14 prese standard Italia. " +
    "Installabile su massetto o flottante. Disponibile con box GTI 14I pre-montato, versione System55 (altezza min. 55 mm) o vuota. " +
    "In plastica (carico 2 kN) o metallo (carico 3 kN). Rivestimento fino a 10 mm. Adatta a lavaggio a secco.",
  GRAF9:
    "Torretta rotonda Ø 325 mm in alluminio pressofuso, ideale per showroom auto e aree commerciali ad alto traffico. " +
    "Solo massetto. Carico 5 kN. Versione con coperchio rivestibile (BA3) idonea al lavaggio bagnato meccanizzato (IP65): " +
    "il tubo telescopico sporge di 10 mm garantendo tenuta ai liquidi anche con spina inserita. " +
    "Stesso equipaggiamento dispositivi della GES9.",
  UDHOME_ONE:
    "Torretta all-in-one compatta 140×140 mm, la più sottile della gamma UDHOME: altezza min. 75 mm. " +
    "1 Modul45® + 1 presa dati preinstallati con separatore linee energia/dati già incluso. " +
    "Coperchio prefinito in inox satinato o ottone. Nuova uscita cavi con spazzola reversibile 180° che ripristina IP40 a torretta chiusa. " +
    "Carico fino a 15 kN. Lavaggio a secco. Adatta a residenziale, hotel e uffici di rappresentanza.",
  UDHOME2:
    "Torretta all-in-one 140×140 mm con 2 Modul45® preinstallati e separatore linee incluso. Altezza min. 95 mm. " +
    "Coperchio prefinito in inox satinato o ottone. Versione con tubo telescopico idonea al lavaggio bagnato (IP65). " +
    "Telaio dati opzionale installabile frontalmente per aggiungere 2 prese keystone. " +
    "Carico fino a 15 kN. Adatta a uffici, hotel e ambienti con esigenze di tenuta ai liquidi.",
  UDHOME4:
    "Torretta all-in-one 199×199 mm con coperchio rivestibile (recesso 15 mm) per gres, laminato o resina. Altezza min. 95 mm. " +
    "Versioni con box pre-montato ITA (4 prese) o Modul45® (6 moduli), oppure versione vuota con box a scelta. " +
    "Regolazione in altezza integrata +30 mm; ulteriori 60 mm con accessorio HE60. " +
    "Carico fino a 3 kN. Lavaggio a secco. Ideale per uffici e aree commerciali con pavimentazioni di pregio.",
  UDHOME9:
    "Torretta all-in-one 243×243 mm, la più capiente della gamma: fino a 14 prese standard Italia o 12 Modul45®. " +
    "Coperchio rivestibile (recesso 15 mm) per integrazione totale con il pavimento. Altezza min. 95 mm. " +
    "Disponibile con box pre-montato o versione vuota con box a scelta (incluso MT45 v0 fino a 24 moduli ITA). " +
    "Regolazione integrata +30 mm, espandibile +60 mm con accessorio HE60. " +
    "Carico fino a 3 kN. Lavaggio a secco. Adatta a open space, sale riunioni e aree con elevata richiesta di connessioni.",
  CASS_LIV_4:
    "Cassetta livellabile 6 Modul45® con piedini di regolazione: altezza min. 105 mm (cieco: 100 mm). " +
    "Disponibile quadrata 199×199 mm o rotonda Ø 214 mm, con finiture raffinate per marmo, cotto e pietra naturale. " +
    "Versione heavy-duty testata fino a 20 kN (2.000 kg), ideale per showroom, stazioni e aeroporti. " +
    "IP66 con coperchio tubo telescopico: idonea al lavaggio bagnato meccanizzato. " +
    "Testata per non degradare l'isolamento acustico del solaio.",
  CASS_LIV_9:
    "Cassetta livellabile 12 Modul45® con piedini di regolazione: altezza min. 105 mm (cieco: 100 mm). " +
    "Disponibile quadrata 243×243 mm o rotonda Ø 304 mm. " +
    "Versione heavy-duty testata fino a 20 kN (2.000 kg). " +
    "IP66 con coperchio tubo telescopico: idonea al lavaggio bagnato meccanizzato. " +
    "Perfetta per ambienti di pregio con pavimentazioni in pietra, marmo o ceramica.",
  DISACC_4:
    "Cassetta disaccoppiata 6 Modul45®: priva di piedini, il telaio superiore è separato dalla scatola da incasso. " +
    "Altezza min. 90 mm. La regolazione avviene a pavimento finito, riducendo l'altezza di installazione necessaria. " +
    "Quadrata 199×199 mm o rotonda Ø 214 mm. Culla obbligatoria su pavimento flottante (solo versione quadrata). " +
    "Carico 3 kN standard, versione heavy-duty fino a 20 kN.",
  DISACC_9:
    "Cassetta disaccoppiata 12 Modul45®: priva di piedini, il telaio superiore è separato dalla scatola da incasso. " +
    "Altezza min. 90 mm. La regolazione avviene a pavimento finito. " +
    "Quadrata 243×243 mm o rotonda Ø 304 mm. Culla obbligatoria su pavimento flottante (solo versione quadrata). " +
    "Carico 3 kN standard, versione heavy-duty fino a 20 kN.",
  SEMINATO:
    "Cassetta specifica per pavimento seminato levigato alla veneziana. Solo massetto. " +
    "Range di altezza 126–442 mm, con recesso di 25 mm per la levigatura. " +
    "Versioni con uscita laterale, tubo telescopico o coperchio cieco. " +
    "La struttura consente la levigatura del massetto fino a filo coperchio senza danni al sistema.",
  GES_R2:
    "Torretta rotonda compatta Ø 140 mm: la soluzione ideale dove servono aspetto discreto, elevata capacità di carico e versatilità. " +
    "Versione metallo: IP66 a coperchio chiuso, carico fino a 20 kN (2.000 kg), 6 finiture pregiate (cromo, nichel, ottone, rame, nero, nichel ossidato). " +
    "Versione plastica: IP40, carico 500 N, finitura grigio ferro o nero grafite. " +
    "Box pre-montato MT R2 1-1 per 2 Modul45®. Altezza min. 85 mm. Idonea al lavaggio bagnato meccanizzato. " +
    "Ideale per showroom auto, aree commerciali, supermercati e spazi comuni ad alta frequentazione.",
  CASS_TEL:
    "Cassetta a telaio inox per pavimento massetto: coperchio quadrato 288×288mm rivestibile con marmo, ceramica, parquet o qualsiasi finitura fino a 28mm. " +
    "Tre configurazioni: uscita cavi laterale (IP40, con Art. 7407995), tubo telescopico (IP44, con TUK2 GV) o coperchio cieco (IP44 — esclusivamente come pozzetto di ispezione). " +
    "Da abbinare obbligatoriamente a una scatola da massetto (UGD/UZD): altezza totale sistema = scatola + spessore rivestimento cassetta, " +
    "con range complessivo da 65mm (UGD55 + riv. 10mm) fino a oltre 230mm (UZD160205 + riv. 30mm). " +
    "Box portafrutti: disponibile per uscita laterale e tubo telescopico (in definizione).",
};

// URL immagini prodotto da obo.it — grafici prodotto ufficiali
// foto prodotto di obo.it (stesso indirizzo usato da Prodotti OBO e Zavorra WRR)
const OBO_IMG = (codice) => `https://www.obo.it/out/pictures/generated/product/1/794_794_75/${codice}_PG1.jpg`;

const SISTEMA_IMG = {
  GES4:       OBO_IMG("7405196"),   // GES4 (modulo apparecchi: la torretta non ha foto su obo.it)
  GES9:       OBO_IMG("7405371"),   // GES9M-2 acciaio (rappresentativo)
  GRAF9:      OBO_IMG("7405746"),   // GRAF9
  UDHOME_ONE: OBO_IMG("7368280"),   // UDHOME-ONE GV inox
  UDHOME2:    OBO_IMG("7368340"),   // UDHOME2 GV15 inox
  UDHOME4:    OBO_IMG("7427232"),   // UDHOME4 2V inox
  UDHOME9:    OBO_IMG("7427324"),   // UDHOME9 2V inox
  CASS_LIV_4: OBO_IMG("7408960"),   // cassetta livellabile 4
  CASS_LIV_9: OBO_IMG("7408976"),   // cassetta livellabile 9
  DISACC_4:   OBO_IMG("7409228"),   // disaccoppiata (RKSNUZD3 inox)
  DISACC_9:   OBO_IMG("7409232"),   // disaccoppiata 9
  SEMINATO:   OBO_IMG("7409601"),   // seminato quadrata
  GES_R2:     OBO_IMG("7408847"),   // GES R2 Nero (uscita laterale)
  CASS_TEL:   OBO_IMG("7406550"),   // RKS 2V2 15 — cassetta telaio uscita laterale
};

const FAMIGLIA_IMG = {
  "GES":                  OBO_IMG("7405371"),
  "UDHOME":               OBO_IMG("7368340"),
  "Cassette livellabili": OBO_IMG("7408960"),
  "Cassette disaccoppiate": OBO_IMG("7409232"),
  "Seminato":             OBO_IMG("7409601"),
  "GES R2":               OBO_IMG("7408847"),
  "Cassette telaio":      OBO_IMG("7406550"),
};

// ─────────────────────────────────────────────────────────────────
// DATASHEET — mappa codice articolo → URL PDF OBO
// Pattern: https://www.obo.it/datasheet/?file=SLUG-CODICE-it_IT.pdf
// ─────────────────────────────────────────────────────────────────
const DS_BASE = "https://www.obo.it/datasheet/?file=";
const DATASHEET = {
  // ── UDHOME-ONE ──────────────────────────────────────────────────
  "7368282": DS_BASE + "UDHOME-ONE_GV15-7368282-it_IT.pdf",
  "7368280": DS_BASE + "UDHOME-ONE_GV-7368280-it_IT.pdf",
  "7368286": DS_BASE + "UDHOME-ONE_GM15-7368286-it_IT.pdf",
  "7368284": DS_BASE + "UDHOME-ONE_GM-7368284-it_IT.pdf",
  "7368357": DS_BASE + "UDHOME-ONE_BN15-7368357-en_GB.pdf",
  "7368356": DS_BASE + "UDHOME-ONE_BN-7368356-en_GB.pdf",
  "7368494": DS_BASE + "DTP_UH1_C-7368494-it_IT.pdf",
  "7368485": DS_BASE + "MT_UH1_2M45-7368485-en_GB.pdf",
  "7368418": DS_BASE + "HE_60UH2-7368418-it_IT.pdf",
};


// ── Caratteristiche con icona: sempre le stesse cinque, nello stesso ordine, calcolate dai dati dei sistemi (DB).
// Se cambiano i dati di un sistema, le etichette cambiano da sole in tutte le schede (famiglie, modelli, ricerca).
const ICONE_CAR = {
  forma: <><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="16.5" cy="16.5" r="4.5"/></>,
  quadrata: <rect x="4" y="4" width="16" height="16" rx="2"/>,
  rotonda: <circle cx="12" cy="12" r="8.5"/>,
  ip: <><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.500-7.500-4.900-7.500-9.500V6z"/><path d="M12 8.500c-1.500 2-2.300 3.200-2.300 4.300a2.300 2.300 0 004.600 0c0-1.100-.800-2.300-2.300-4.300z"/></>,
  carico: <><path d="M7 9h10l3 11H4z"/><path d="M9.500 9a2.500 2.500 0 115 0"/></>,
  pavimento: <><path d="M3 8l9-4 9 4-9 4z"/><path d="M3 12.500l9 4 9-4"/><path d="M3 17l9 4 9-4"/></>,
  rivestimento: <><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M3 9h18M7 5v4M12 5v4M17 5v4"/></>,
};
function caratteristiche(chiavi) {
  const sis = chiavi.map(k => DB[k]).filter(Boolean);
  if (!sis.length) return [];
  const out = [];
  const testoForma = sis.map(x => x.forma || "").join(" ").toLowerCase();
  const q = testoForma.includes("quadrat"), r = testoForma.includes("rotond");
  if (q || r) out.push({ k: q && r ? "forma" : q ? "quadrata" : "rotonda", t: q && r ? "Quadrata o rotonda" : q ? "Quadrata" : "Rotonda", d: "Forma del coperchio" });
  const ip = [];
  sis.forEach(x => [x.ip_chiuso, x.ip_laterale, x.ip_tubo, x.ip_cieco].forEach(v => (String(v || "").match(/IP\s?(\d{2})/g) || []).forEach(m => ip.push(parseInt(m.replace(/\D/g, ""), 10)))));
  if (ip.length) { const a = Math.min(...ip), b = Math.max(...ip); out.push({ k: "ip", t: a === b ? `IP${a}` : `IP${a}–IP${b}`, d: "Grado di protezione a coperchio chiuso (dal minimo al massimo secondo la variante)" }); }
  const kn = [];
  sis.forEach(x => { const c = String(x.carico || ""); (c.match(/(\d+(?:[.,]\d+)?)\s*kN/gi) || []).forEach(m => kn.push(parseFloat(m.replace(",", ".")))); (c.match(/(\d+)\s*N\b/g) || []).forEach(m => kn.push(parseFloat(m) / 1000)); });
  if (kn.length) { const a = Math.min(...kn), b = Math.max(...kn), f = v => String(v).replace(".", ","); out.push({ k: "carico", t: a === b ? `${f(b)} kN` : `fino a ${f(b)} kN`, d: "Carico ammesso sul coperchio (valore massimo tra le varianti)" }); }
  const pav = new Set(); sis.forEach(x => (x.pavimenti || []).forEach(v => pav.add(v)));
  if (pav.size) out.push({ k: "pavimento", t: pav.has("massetto") && pav.has("flottante") ? "Massetto e flottante" : pav.has("flottante") ? "Solo flottante" : "Solo massetto", d: "Tipo di pavimento in cui si installa" });
  const mm = [];
  sis.forEach(x => (String(x.rivestimento_max || "").match(/(\d+)\s*mm/g) || []).forEach(m => mm.push(parseInt(m, 10))));
  if (mm.length) out.push({ k: "rivestimento", t: `Rivestibile fino a ${Math.max(...mm)} mm`, d: "Spessore massimo del rivestimento nel coperchio" });
  else if (sis.some(x => /non rivest/i.test(x.rivestimento_max || ""))) out.push({ k: "rivestimento", t: "Non rivestibile", d: "Il coperchio non prende il rivestimento del pavimento" });
  return out;
}
function Caratteristiche({ chiavi, stile }) {
  return (
    <div className="ufs-car" style={{ display: "flex", flexWrap: "wrap", gap: 6, ...(stile || {}) }}>
      {caratteristiche(chiavi).map(c => (
        <span key={c.k + c.t} title={c.d} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eef2f4", color: "#282a31", border: "1px solid #c5d9de", fontSize: 12, fontWeight: 600, padding: "3px 9px 3px 7px", borderRadius: 20, lineHeight: 1.3 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41525d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_CAR[c.k]}</svg>{c.t}
        </span>
      ))}
    </div>
  );
}

// Foto di ambiente e di posa prese dalla brochure OBO "Soluzioni di design per l'installazione elettrica"
// (ritagli in torrette/img/): scheda = foto sulla scheda della famiglia, ambiente = foto larga nel passo 2.
const FAMIGLIA_FOTO = {
  "GES": { scheda: "img/ges-scheda.jpg", ambiente: "img/ges-ambiente.jpg", testo: "Torretta a filo pavimento: chiusa resta solo il coperchio con il rivestimento del pavimento." },
  "UDHOME": { scheda: "img/udhome-scheda.jpg", ambiente: "img/udhome-ambiente.jpg", dettaglio: "img/udhome-dettaglio.jpg", testo: "Presa a pavimento a scomparsa: a coperchio chiuso si vede solo la cornice e l'uscita dei cavi." },
  "Cassette livellabili": { scheda: "img/livellabili-scheda.jpg", ambiente: "img/cassette-ambiente.jpg", dettaglio: "img/cassette-sezione.jpg", testo: "Cassetta nel massetto, regolata in altezza: il coperchio prende lo stesso rivestimento del pavimento." },
  "Cassette telaio": { scheda: "img/telaio-scheda.jpg", ambiente: "img/cassette-ambiente.jpg", testo: "Coperchio a filo, calpestabile, con lo stesso rivestimento del pavimento." },
  "Cassette disaccoppiate": { scheda: "img/disaccoppiate-scheda.jpg", ambiente: "img/cassette-ambiente.jpg", testo: "Cassetta con coperchio a filo del pavimento finito." },
  "Seminato": { scheda: "img/seminato-scheda.jpg", ambiente: "img/cassette-ambiente.jpg", testo: "A pavimento finito resta visibile solo l'uscita dei cavi." },
  "GES R2": { scheda: "img/gesr2-scheda.jpg", ambiente: "img/gesr2-ambiente.jpg", dettaglio: "img/gesr2-sezione.jpg", testo: "Torretta rotonda in metallo per carichi pesanti: a filo pavimento, ci si passa sopra anche con i veicoli." },
};

function FotoInstallata({ famigliaId, isMobile }) {
  const f = FAMIGLIA_FOTO[famigliaId];
  if (!f) return null;
  return (
    <div style={{ margin: "0 0 " + (isMobile ? 14 : 22) + "px", border: "1px solid #c5d9de", borderRadius: 3, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row" }}>
        <img loading="lazy" src={f.ambiente} alt="Come rimane installata" style={{ flex: "1 1 0", minWidth: 0, width: isMobile ? "100%" : undefined, height: isMobile ? 150 : 230, objectFit: "cover", display: "block" }} onError={e => { e.target.style.display="none"; }} />
        {f.dettaglio && !isMobile && <img loading="lazy" src={f.dettaglio} alt="Particolare" style={{ width: 300, height: 230, objectFit: "cover", display: "block", borderLeft: "3px solid #fff" }} onError={e => { e.target.style.display="none"; }} />}
      </div>
      <div style={{ padding: isMobile ? "8px 12px" : "10px 16px", fontSize: 13, color: "#41525d" }}><b style={{ color: "#282a31" }}>Come rimane installata.</b> {f.testo}</div>
    </div>
  );
}

function StepSistema({ famigliaId, onSelect, onBack }) {
  const fam = FAMIGLIE.find(f => f.id === famigliaId);
  const [hover, setHover] = useState(null);
  const { isMobile, isTablet } = useM();
  return (
    <div>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#F39B00", cursor:"pointer", fontSize:13, padding:"0 0 16px", fontWeight:700 }}>← Torna alla scelta famiglia</button>
      <div style={{ marginBottom: isMobile ? 16 : 28 }}>
        <div style={{ fontSize:11, color:"#F39B00", fontWeight:700, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Step 2 di 3</div>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight:900, color:"#282a31", margin:"0 0 4px" }}>{fam.label}</h2>
        {!isMobile && <p style={{ color:"#555", fontSize:14, margin:0 }}>Scegli il modello più adatto alle tue esigenze</p>}
      </div>
      <FotoInstallata famigliaId={famigliaId} isMobile={isMobile} />
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(300px,1fr))", gap: isMobile ? 10 : 16 }}>
        {fam.sistemi.map(key => {
          const s = DB[key];
          const specs = [
            { l:"IP chiuso", v: s.ip_chiuso || (s.ip_laterale ? `${s.ip_laterale}/${s.ip_tubo}` : "—") },
            { l:"Carico",    v: s.carico || "—" },
            { l:"Riv. max",  v: s.rivestimento_max || "—" },
            { l:"Altezza",   v: s.altezze ? Object.values(s.altezze)[0] : "—" },
          ];
          const isHover = hover === key;
          return (
            <button key={key} onClick={() => onSelect(key)}
              onMouseEnter={() => setHover(key)}
              onMouseLeave={() => setHover(null)}
              style={{
                background:"white", border:`1px solid ${isHover ? fam.colore : "#c5d9de"}`,
                borderTop:`3px solid ${fam.colore}`, padding:0, textAlign:"left", cursor:"pointer",
                transition:"all 0.15s", borderRadius:3,
                boxShadow: isHover ? `0 8px 28px ${fam.colore}25` : "0 1px 4px rgba(0,0,0,0.06)",
                display:"flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "stretch",
              }}>
              {/* Immagine — solo tablet+ */}
              {!isMobile && SISTEMA_IMG[key] && (
                <div style={{ height:100, overflow:"hidden", borderRadius:"3px 3px 0 0", background:"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid #f0f0f0" }}>
                  <img referrerPolicy="no-referrer" loading="lazy" src={SISTEMA_IMG[key]} alt={s.label} style={{ maxHeight:90, maxWidth:"100%", objectFit:"contain", padding:8 }} onError={e => { e.target.parentElement.style.display="none"; }} />
                </div>
              )}
              {/* Header */}
              <div style={{ padding: isMobile ? "12px 14px" : "14px 18px 8px", flex: isMobile ? 1 : undefined }}>
                <div style={{ fontSize: isMobile ? 14 : 20, fontWeight:900, color:"#282a31" }}>{s.label}</div>
                {!isMobile && <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{s.forma} · {s.dimensione}</div>}
                {!isMobile && <div style={{ fontSize:12, color:"#555", lineHeight:1.5, marginTop:6 }}>{SISTEMA_DESC[key]}</div>}
              </div>
              {/* Specs — solo tablet+ */}
              {!isMobile && (
                <Caratteristiche chiavi={[key]} stile={{ padding:"10px 18px", borderTop:"1px solid #f0f0f0", marginTop:"auto" }} />
              )}
              {/* CTA / arrow */}
              {isMobile
                ? <span style={{ fontSize:18, color:fam.colore, paddingRight:14 }}>›</span>
                : <div style={{ padding:"9px 18px", background: isHover ? `${fam.colore}0D` : "transparent" }}>
                    <span style={{ fontSize:12, color: isHover ? fam.colore : "#999", fontWeight:700 }}>
                      Configura →
                    </span>
                  </div>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RigaTabella({ label, codice, nota, bg }) {
  const { isMobile } = useM();
  return isMobile ? (
    <div style={{ padding:"10px 12px", borderTop:"1px solid #f0f0f0", background: bg||"white" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#282a31", flex:1, paddingRight:8 }}>{label}</span>
        <CodicePill codice={codice} />
      </div>
      {nota && <div style={{ fontSize:11, color:"#888" }}>{nota}</div>}
    </div>
  ) : (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 150px 1fr", padding:"10px 16px", borderTop:"1px solid #f0f0f0", background: bg||"white" }}>
      <span style={{ fontSize:13, fontWeight:600, color:"#282a31" }}>{label}</span>
      <span style={{ textAlign:"center" }}><CodicePill codice={codice} /></span>
      <span style={{ fontSize:12, color:"#555" }}>{nota}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CONFIGURATORE BOX PORTAFRUTTI — dispositivi Modul45
// ─────────────────────────────────────────────────────────────────

const DISPOSITIVI_M45 = [
  // ── ENERGIA ─────────────────────────────────────────────────────
  { id: "unel_w",  cat: "energia", label: "UNEL bianca",    desc: "Presa UNEL 2P+T bianca",         codice: "6120760", slot: 1,   colore: "#1565C0", emoji: "🔌" },
  { id: "unel_r",  cat: "energia", label: "UNEL rossa",     desc: "Presa UNEL 2P+T rossa",          codice: "6120761", slot: 1,   colore: "#C62828", emoji: "🔌" },
  { id: "unel_b",  cat: "energia", label: "UNEL nera",      desc: "Presa UNEL 2P+T nera",           codice: "6120762", slot: 1,   colore: "#212121", emoji: "🔌" },
  { id: "unel_a",  cat: "energia", label: "UNEL alluminio", desc: "Presa UNEL 2P+T alluminio",      codice: "6120763", slot: 1,   colore: "#78909C", emoji: "🔌" },
  { id: "bip_w",   cat: "energia", label: "Bipasso bianca", desc: "Presa bipasso 2P+T bianca",      codice: "6120746", slot: 0.5, colore: "#0277BD", emoji: "🔌" },
  { id: "bip_r",   cat: "energia", label: "Bipasso rossa",  desc: "Presa bipasso 2P+T rossa",       codice: "6120747", slot: 0.5, colore: "#AD1457", emoji: "🔌" },
  // ── DATI / MULTIMEDIALE ─────────────────────────────────────────
  { id: "rj45",    cat: "dati",    label: "2× RJ45",        desc: "Presa dati 2×RJ45 Cat.6A bianca",codice: "6119214", slot: 1,   colore: "#2E7D32", emoji: "🌐" },
  { id: "usbc",    cat: "dati",    label: "USB-A+C",        desc: "Presa USB-A + USB-C bianca",     codice: "6105306", slot: 0.5, colore: "#E65100", emoji: "⚡" },
  { id: "hdmi",    cat: "dati",    label: "HDMI",           desc: "Presa HDMI con cavo bianca",     codice: "6104826", slot: 1,   colore: "#37474F", emoji: "🖥" },
  { id: "tv",      cat: "dati",    label: "TV/Radio/SAT",   desc: "Presa TV/Radio/SAT bianca",      codice: "6105282", slot: 1,   colore: "#6A1EA0", emoji: "📡" },
  // ── CIECHI ──────────────────────────────────────────────────────
  { id: "ciec1",   cat: "cieco",   label: "Cieco 1M",       desc: "Coperchio cieco 1 modulo bianco",codice: "6117406", slot: 1,   colore: "#90A4AE", emoji: "⬜" },
  { id: "ciec05",  cat: "cieco",   label: "Cieco ½M",       desc: "Coperchio cieco ½ modulo bianco",codice: "6117414", slot: 0.5, colore: "#B0BEC5", emoji: "▫" },
];

// Struttura box: file × mezzi slot (ogni mezzo = ½ Modul45)
const BOX_LAYOUT = {
  "7407577": { label: "MT4 6I",        file: 2, mezziPerFila: 6  }, // 6 M45
  "7407578": { label: "MT9 9I",        file: 2, mezziPerFila: 9  }, // 9 M45
  "7407579": { label: "MT9 12I",       file: 3, mezziPerFila: 8  }, // 3 file × 4 M45
  "7408698": { label: "MT45 V0",       file: 2, mezziPerFila: 8, richiede_setto: true  }, // 8 M45
  "7427230": { label: "UDHOME4 6M45",  file: 2, mezziPerFila: 6  }, // 6 M45
  "7427323": { label: "UDHOME9 12M45", file: 3, mezziPerFila: 8  }, // 3 file × 4 M45
};

// Per box pre-montati senza codice articolo — mappa dal tipo
const BOX_LAYOUT_BY_TIPO = {
  "MT45 V0":       { label: "MT45 V0",      file: 2, mezziPerFila: 8, richiede_setto: true  },
  "MT4 6I":        { label: "MT4 6I",        file: 2, mezziPerFila: 6  },
  "MT9 I12":       { label: "MT9 12I",       file: 3, mezziPerFila: 8  },
  "MT9 12I":       { label: "MT9 12I",       file: 3, mezziPerFila: 8  },
  "MT9 9I":        { label: "MT9 9I",        file: 2, mezziPerFila: 9  },
  "UDHOME-ONE 1M": { label: "UDHOME-ONE",    file: 1, mezziPerFila: 2  },
  "UDHOME-ONE+K":  { label: "UDHOME-ONE + keystone", file: 1, mezziPerFila: 4, separatorePrima: 2  },
  "UDHOME-ONE 2M": { label: "UDHOME-ONE 2M", file: 1, mezziPerFila: 4  },
  "UDHOME2":       { label: "UDHOME 2",      file: 1, mezziPerFila: 4  },
  "UDHOME2+K":     { label: "UDHOME 2 + keystone",   file: 1, mezziPerFila: 6, separatorePrima: 4  },
  "MT R2 1-1":     { label: "MT R2 1-1",     file: 1, mezziPerFila: 4  },
  "MT R2 1-1+2C":  { label: "MT R2 1-1 + keystone",  file: 1, mezziPerFila: 6, separatorePrima: 4  },
};

// Tipi standard Italia — NON configurabili con Modul45
const BOX_ITA = new Set(["GTI 14I","GT I4","Box I4","Box I14","GT I14","GT I12"]);

// Risolve layout da codice o tipo; null se ITA o sconosciuto
function getBoxLayout(box) {
  if (!box) return null;
  if (BOX_ITA.has(box.tipo)) return null;
  const cod = box.codice ? cleanCode(box.codice) : null;
  const base = (cod && BOX_LAYOUT[cod]) ? BOX_LAYOUT[cod]
             : (box.tipo && BOX_LAYOUT_BY_TIPO[box.tipo]) ? BOX_LAYOUT_BY_TIPO[box.tipo]
             : null;
  if (!base) return null;
  return { ...base, slotFissi: box.slotFissi ?? [] };
}



function ConfiguratoreBox({ layout, onConferma, onAnnulla, colore }) {
  if (!layout) return null;

  const totMezzi = layout.file * layout.mezziPerFila;
  const slotFissi = layout.slotFissi ?? [];
  const { isMobile } = useM();

  const [slots, setSlots] = useState(() => {
    const arr = Array(totMezzi).fill(null);
    slotFissi.forEach(sf => { if (sf.idx < totMezzi) arr[sf.idx] = "__fisso__"; });
    return arr;
  });
  const [selDispositivo, setSelDispositivo] = useState(null); // id dispositivo selezionato dalla palette
  const [catAperta, setCatAperta] = useState("energia"); // categoria palette aperta

  const CAT_LABELS = { energia: "⚡ Energia", dati: "🌐 Dati / AV", cieco: "⬜ Ciechi" };
  const devPerCat = cat => DISPOSITIVI_M45.filter(d => d.cat === cat);

  const assegna = (idx) => {
    if (!selDispositivo) return;
    const dev = DISPOSITIVI_M45.find(d => d.id === selDispositivo);
    if (!dev) return;
    const n = dev.slot === 1 ? 2 : 1;
    // Verifica spazio
    for (let j = idx; j < idx + n; j++) {
      if (j >= totMezzi || (slots[j] !== null)) return;
    }
    setSlots(prev => {
      const next = [...prev];
      next[idx] = dev.id;
      for (let j = idx + 1; j < idx + n; j++) next[j] = "__cont__";
      return next;
    });
  };

  const rimuovi = (idx) => {
    setSlots(prev => {
      const next = [...prev];
      // Trova inizio del dispositivo (potrebbe essere __cont__)
      let start = idx;
      while (start > 0 && next[start] === "__cont__") start--;
      const dev = DISPOSITIVI_M45.find(d => d.id === next[start]);
      const n = dev?.slot === 1 ? 2 : 1;
      for (let j = start; j < start + n; j++) next[j] = null;
      return next;
    });
  };

  const svuota = () => {
    setSlots(prev => prev.map((v, i) => slotFissi.find(sf => sf.idx === i) ? "__fisso__" : null));
  };

  const slotsLiberi = slots.filter(v => v === null).length;

  const getRigheDispositivi = () => {
    const cont = {};
    slots.forEach(s => { if (s && s !== "__cont__" && s !== "__fisso__") cont[s] = (cont[s] || 0) + 1; });
    const righe = Object.entries(cont).map(([id, qty]) => {
      const dev = DISPOSITIVI_M45.find(d => d.id === id);
      return { label: `${dev.label} ×${qty}`, codice: dev.codice, nota: `${dev.desc} — ${qty} pz`, bg: "#F8F0FF", qty };
    });
    // Setto separatore MT45 V0
    if (layout.richiede_setto) {
      const ENERGIA = new Set(["unel_w","unel_r","unel_b","unel_a","bip_w","bip_r"]);
      const DATI    = new Set(["rj45","usbc","hdmi","tv"]);
      let settiNecessari = 0;
      for (let fila = 0; fila < layout.file; fila++) {
        const start = fila * layout.mezziPerFila;
        const devFila = [];
        for (let i = start; i < start + layout.mezziPerFila; i++) {
          const v = slots[i];
          if (v && v !== "__cont__" && v !== "__fisso__") devFila.push(v);
        }
        for (let j = 0; j < devFila.length - 1; j++) {
          const a = devFila[j], b = devFila[j + 1];
          if ((ENERGIA.has(a) && DATI.has(b)) || (DATI.has(a) && ENERGIA.has(b))) settiNecessari++;
        }
      }
      if (settiNecessari > 0) {
        righe.push({ label: `Setto separatore ×${settiNecessari}`, codice: "7408693", nota: `Obbligatorio tra energia e dati adiacenti — ${settiNecessari} pz`, bg: "#FFF8E1", qty: settiNecessari });
      }
    }
    return righe;
  };

  const renderSlot = (idx) => {
    const val = slots[idx];
    if (val === "__cont__") return null;
    if (val === "__fisso__") {
      const sf = slotFissi.find(s => s.idx === idx);
      return (
        <div style={{ width: isMobile?20:24, height: isMobile?44:52, background:`${sf?.colore ?? "#7694a4"}20`, border:`1px dashed ${sf?.colore ?? "#7694a4"}`, borderRadius:3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
          <span style={{ fontSize: isMobile?10:12 }}>{sf?.emoji ?? "🔒"}</span>
          <span style={{ fontSize:6, fontWeight:700, color:sf?.colore ?? "#7694a4", lineHeight:1, textAlign:"center" }}>{sf?.label ?? "fisso"}</span>
        </div>
      );
    }
    const dev = val ? DISPOSITIVI_M45.find(d => d.id === val) : null;
    const n = dev?.slot === 1 ? 2 : 1;
    const W = isMobile ? (n===2?42:20) : (n===2?52:24);
    const H = isMobile ? 44 : 52;
    const isEmpty = !dev;
    const isSelected = isEmpty && !!selDispositivo; // slot vuoto con dispositivo pronto da posizionare
    return (
      <div
        onClick={() => dev ? rimuovi(idx) : assegna(idx)}
        title={dev ? `${dev.label} — click per rimuovere` : selDispositivo ? "Click per posizionare" : "Seleziona prima un dispositivo dalla palette"}
        style={{ width:W, height:H, background: dev ? `${dev.colore}30` : isSelected ? "#E3F2FD" : "#e8eaed",
          border: `${isSelected?"2px dashed":"1px solid"} ${dev ? dev.colore : isSelected ? "#1565C0" : "#bbb"}`,
          borderRadius:3, cursor: dev||selDispositivo ? "pointer" : "default",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1,
          transition:"all 0.1s", flexShrink:0 }}>
        {dev
          ? <><span style={{ fontSize: isMobile?(n===2?12:10):(n===2?15:12) }}>{dev.emoji}</span>
              <span style={{ fontSize: isMobile?6:7, fontWeight:700, color:dev.colore, lineHeight:1, textAlign:"center", maxWidth:W-4, overflow:"hidden" }}>{dev.label}</span></>
          : <span style={{ fontSize: isMobile?12:14, color: isSelected?"#1565C0":"#aaa" }}>{isSelected?"▸":"+"}</span>
        }
      </div>
    );
  };

  const renderGriglia = () =>
    Array.from({ length: layout.file }, (_, fila) => (
      <div key={fila} style={{ display:"flex", alignItems:"center", gap:isMobile?2:3, marginBottom: fila < layout.file-1 ? (isMobile?4:6) : 0 }}>
        {Array.from({ length: layout.mezziPerFila }, (_, i) => {
          const idx = fila * layout.mezziPerFila + i;
          const sep = layout.separatorePrima && i === layout.separatorePrima;
          return (
            <React.Fragment key={idx}>
              {sep && <div style={{ width:1, height: isMobile?44:52, background:"#ccc", margin:`0 ${isMobile?3:5}px`, flexShrink:0 }} />}
              {renderSlot(idx)}
            </React.Fragment>
          );
        })}
      </div>
    ));

  // Setto live check
  const settiVivi = (() => {
    if (!layout.richiede_setto) return 0;
    const ENERGIA = new Set(["unel_w","unel_r","unel_b","unel_a","bip_w","bip_r"]);
    const DATI    = new Set(["rj45","usbc","hdmi","tv"]);
    let n = 0;
    for (let fila = 0; fila < layout.file; fila++) {
      const start = fila * layout.mezziPerFila;
      const devFila = [];
      for (let i = start; i < start + layout.mezziPerFila; i++) {
        const v = slots[i];
        if (v && v !== "__cont__" && v !== "__fisso__") devFila.push(v);
      }
      for (let j = 0; j < devFila.length - 1; j++) {
        const a = devFila[j], b = devFila[j + 1];
        if ((ENERGIA.has(a) && DATI.has(b)) || (DATI.has(a) && ENERGIA.has(b))) n++;
      }
    }
    return n;
  })();

  const selDev = selDispositivo ? DISPOSITIVI_M45.find(d => d.id === selDispositivo) : null;

  return (
    <div style={{ background:"#f5f5f5", border:"1px solid #C5CAE9", borderRadius:4, padding: isMobile?"12px":"16px 20px", marginTop:16 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#3F51B5", letterSpacing:1, textTransform:"uppercase" }}>⚙ Dispositivi — {layout.label}</div>
          <div style={{ fontSize:10, color:"#666", marginTop:2 }}>
            {slotsLiberi > 0 ? `${Math.floor(slotsLiberi/2)} Modul45 liberi` : "Box completo"}
            {selDev && <span style={{ color:"#1565C0", fontWeight:700 }}> · Posiziona: {selDev.emoji} {selDev.label}</span>}
          </div>
        </div>
        <button onClick={svuota} style={{ background:"none", border:"1px solid #ddd", color:"#666", padding:"4px 10px", cursor:"pointer", fontSize:10, borderRadius:2 }}>Svuota</button>
      </div>

      <div style={{ display:"flex", gap:12, flexDirection: isMobile?"column":"row" }}>

        {/* Griglia box */}
        <div style={{ background:"#eef0f2", padding: isMobile?"10px":"14px 16px", borderRadius:4, overflowX:"auto", flexShrink:0 }}>
          <div style={{ fontSize:9, color:"#777", letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>
            {layout.label} — {totMezzi/2} Modul45
          </div>
          {renderGriglia()}
        </div>

        {/* Palette dispositivi */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:9, color:"#777", letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>
            {selDev ? `▸ Clicca uno slot vuoto per posizionare: ${selDev.label}` : "Scegli un dispositivo poi clicca uno slot"}
          </div>
          {/* Tab categorie */}
          <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
            {Object.entries(CAT_LABELS).map(([cat, lbl]) => (
              <button key={cat} onClick={() => setCatAperta(cat)}
                style={{ padding:"4px 10px", border:`1px solid ${catAperta===cat?"#3F51B5":"#ddd"}`, background:catAperta===cat?"#3F51B5":"white", color:catAperta===cat?"white":"#555", cursor:"pointer", fontSize:10, fontWeight:700, borderRadius:12 }}>
                {lbl}
              </button>
            ))}
          </div>
          {/* Dispositivi categoria */}
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr", gap:5 }}>
            {devPerCat(catAperta).map(d => {
              const nSlot = d.slot === 1 ? 2 : 1;
              // Verifica se esiste almeno uno slot libero per questo dispositivo
              const haSpazio = slots.some((v, i) => {
                if (v !== null) return false;
                for (let j = i; j < i + nSlot; j++) { if (j >= totMezzi || slots[j] !== null) return false; }
                return true;
              });
              const isActive = selDispositivo === d.id;
              return (
                <button key={d.id} onClick={() => setSelDispositivo(isActive ? null : d.id)}
                  disabled={!haSpazio}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
                    background: isActive ? `${d.colore}18` : "white",
                    border:`2px solid ${isActive ? d.colore : "#e0e0e0"}`,
                    cursor: haSpazio?"pointer":"not-allowed", opacity:haSpazio?1:0.35,
                    borderRadius:3, textAlign:"left", transition:"all 0.1s" }}>
                  <div style={{ width: d.slot===1?18:10, height:18, background:d.colore, borderRadius:2, flexShrink:0 }} />
                  <span style={{ fontSize:13 }}>{d.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:isActive?700:500, color:"#282a31" }}>{d.label}</div>
                    <div style={{ fontSize:9, color:"#888" }}>{d.slot===1?"1 Modul45":"½ Modul45"} · {d.codice}</div>
                  </div>
                  {isActive && <span style={{ fontSize:12, color:d.colore }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Avviso setto */}
      {settiVivi > 0 && (
        <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:3, padding:"8px 12px", marginTop:12, fontSize:11, color:"#795548", display:"flex", alignItems:"center", gap:8 }}>
          <span>⚠</span>
          <span><strong>Setto separatore obbligatorio</strong> — {settiVivi} coppi{settiVivi>1?"e":"a"} energia/dati adiacenti. {settiVivi}× Art. 7408693 aggiunto al riepilogo.</span>
        </div>
      )}

      {/* Bottoni */}
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={() => onConferma(getRigheDispositivi())}
          style={{ background:colore, color:"white", border:"none", padding: isMobile?"9px 14px":"9px 20px", cursor:"pointer", fontSize:12, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", borderRadius:2, flex: isMobile?1:"unset" }}>
          ✓ Conferma
        </button>
        <button onClick={onAnnulla}
          style={{ background:"transparent", border:"1px solid #ddd", color:"#666", padding: isMobile?"9px 14px":"9px 16px", cursor:"pointer", fontSize:12, borderRadius:2, flex: isMobile?1:"unset" }}>
          Salta
        </button>
      </div>
    </div>
  );
}
function Riepilogo({ righe, altezza, estensioni, piedini, colore, onReset, onAddToCart, sistemaLabel, sistemaKey, boxScelto }) {
  const [statoBox, setStatoBox] = useState("idle");
  const [righeDispositivi, setRigheDispositivi] = useState([]);
  const [piediniAperti, setPiediniAperti] = useState(false);
  const { isMobile } = useM();

  const handleConfermaDispositivi = (rd) => { setRigheDispositivi(rd); setStatoBox("done"); };
  const righeFinali = statoBox === "done" && righeDispositivi.length > 0 ? [...righe, ...righeDispositivi] : righe;
  const boxLayout = getBoxLayout(boxScelto);
  const haLayoutBox = !!boxLayout;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:4, height:20, background:"#2E7D32", borderRadius:2 }} />
        <div style={{ fontSize: isMobile ? 11 : 13, fontWeight:800, color:"#282a31", letterSpacing:1, textTransform:"uppercase" }}>Riepilogo articoli</div>
        {!isMobile && <div style={{ fontSize:11, color:"#666" }}>— premi «Aggiungi al carrello» per salvare</div>}
      </div>

      {/* Tabella — intestazione solo su desktop */}
      <div style={{ border:"1px solid #e0e0e0", borderRadius:2, overflow:"hidden" }}>
        {!isMobile && (
          <div style={{ background:"#f5f5f5", display:"grid", gridTemplateColumns:"1fr 150px 1fr", padding:"8px 16px", fontSize:11, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase" }}>
            <span>Componente</span><span style={{textAlign:"center"}}>Codice</span><span>Note</span>
          </div>
        )}
        {righeFinali.map((r, i) => <RigaTabella key={i} label={r.label} codice={r.codice} nota={r.nota} bg={r.bg} />)}
      </div>

      {altezza && (
        <div style={{ marginTop:10, background:"#E6F4EA", border:"1px solid #A5D6A7", padding:"8px 12px", borderRadius:2, fontSize:12, color:"#1B5E20" }}>
          📐 <strong>Range altezza:</strong> {altezza}
        </div>
      )}

      {estensioni && estensioni.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Accessori opzionali — aumento altezza</div>
          {estensioni.map((e, i) => (
            <div key={i} style={{ background:"#f5f5f5", border:"1px solid #EEE", padding:"7px 12px", marginBottom:4, display:"flex", alignItems:"center", gap:10, borderRadius:2 }}>
              <CodicePill codice={e.codice} />
              <span style={{ fontSize:12, color:"#555" }}>{e.desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* PIEDINI ALTERNATIVI — solo per CASS_LIV */}
      {piedini && piedini.length > 0 && (
        <div style={{ marginTop:14 }}>
          <button onClick={() => setPiediniAperti(v => !v)}
            style={{ width:"100%", background:"#F3F8FF", border:"1px solid #BBDEFB", borderRadius: piediniAperti ? "3px 3px 0 0" : 3, padding:"9px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>📐</span>
              <span style={{ fontSize:10, fontWeight:700, color:"#1565C0", letterSpacing:1.5, textTransform:"uppercase" }}>
                Piedini alternativi (opzionale)
              </span>
              <span style={{ fontSize:10, color:"#555", fontWeight:400, textTransform:"none", letterSpacing:0 }}>
                — sostituire se l'altezza di livellamento richiesta supera il range standard
              </span>
            </div>
            <span style={{ fontSize:13, color:"#1565C0", transform: piediniAperti?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block", flexShrink:0 }}>▾</span>
          </button>
          {piediniAperti && (
            <div style={{ border:"1px solid #BBDEFB", borderTop:"none", borderRadius:"0 0 3px 3px", overflow:"hidden" }}>
              {!isMobile && (
                <div style={{ display:"grid", gridTemplateColumns:"130px 1fr 120px", padding:"6px 14px", background:"#E3F2FD", fontSize:9, fontWeight:700, color:"#1565C0", letterSpacing:1.5, textTransform:"uppercase" }}>
                  <span>Codice</span><span>Tipo / Range</span><span>Livellamento</span>
                </div>
              )}
              {piedini.map((p, i) => (
                isMobile ? (
                  <div key={i} style={{ padding:"9px 14px", borderTop: i>0?"1px solid #E3F2FD":"none", background:"white", display:"flex", alignItems:"center", gap:10 }}>
                    <CodicePill codice={p.codice} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#282a31" }}>{p.tipo}</div>
                      <div style={{ fontSize:10, color:"#555" }}>{p.hMin}–{p.hMax}mm</div>
                    </div>
                  </div>
                ) : (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"130px 1fr 120px", padding:"9px 14px", borderTop: i>0?"1px solid #EEF5FF":"none", background: i%2===0?"white":"#F8FBFF", alignItems:"center" }}>
                    <CodicePill codice={p.codice} />
                    <span style={{ fontSize:12, color:"#282a31", fontWeight:500 }}>{p.tipo} — {p.desc}</span>
                    <span style={{ fontSize:12, color:"#1565C0", fontWeight:700 }}>{p.hMin}–{p.hMax}mm</span>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {haLayoutBox && statoBox === "idle" && (
        <div style={{ marginTop:14, background:"#f5f5f5", border:"1px solid #C5CAE9", borderRadius:3, padding: isMobile ? "10px 12px" : "12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#3F51B5" }}>Vuoi configurare i dispositivi nel box?</div>
            {!isMobile && <div style={{ fontSize:11, color:"#666", marginTop:2 }}>Opzionale — aggiungi UNEL, Bipasso, RJ45, ecc.</div>}
          </div>
          <button onClick={() => setStatoBox("configuring")}
            style={{ background:"#3F51B5", color:"white", border:"none", padding: isMobile ? "8px 14px" : "8px 18px", cursor:"pointer", fontSize:12, fontWeight:700, borderRadius:2, whiteSpace:"nowrap" }}>
            ⚙ Configura box
          </button>
        </div>
      )}
      {haLayoutBox && statoBox === "configuring" && (
        <ConfiguratoreBox key={`${boxLayout.label}-${boxLayout.mezziPerFila}`} layout={boxLayout} colore={colore} onConferma={handleConfermaDispositivi} onAnnulla={() => setStatoBox("idle")} />
      )}
      {haLayoutBox && statoBox === "done" && (
        <div style={{ marginTop:10, background:"#E8F5E9", border:"1px solid #A5D6A7", borderRadius:3, padding:"10px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div style={{ fontSize:12, color:"#2E7D32", fontWeight:600 }}>✓ {righeDispositivi.length} tipo/i aggiunti</div>
          <button onClick={() => setStatoBox("configuring")} style={{ background:"none", border:"1px solid #A5D6A7", color:"#2E7D32", padding:"5px 10px", cursor:"pointer", fontSize:11, borderRadius:2 }}>Modifica</button>
        </div>
      )}

      <DevLegenda righe={righe} sistemaKey={sistemaKey} />

      <div style={{ marginTop:20, display:"flex", gap:10, flexWrap:"wrap" }}>
        {onAddToCart && (
          <button onClick={() => onAddToCart(righeFinali, sistemaLabel, altezza)}
            style={{ flex: isMobile ? 1 : "unset", background:"#1B5E20", color:"white", border:"none", padding: isMobile ? "12px 16px" : "12px 28px", cursor:"pointer", fontSize: isMobile ? 13 : 14, letterSpacing:1, textTransform:"uppercase", fontWeight:700, borderRadius:2 }}>
            + Aggiungi al carrello
          </button>
        )}
        <button onClick={onReset}
          style={{ flex: isMobile ? 1 : "unset", background:colore, color:"white", border:"none", padding: isMobile ? "12px 16px" : "12px 28px", cursor:"pointer", fontSize: isMobile ? 13 : 14, letterSpacing:1, textTransform:"uppercase", fontWeight:700, borderRadius:2 }}>
          ↺ Nuova config.
        </button>
      </div>
    </div>
  );
}


function AccessorioCheckbox({ acc, checked, onChange, colore, radio = false }) {
  const { isMobile } = useM();
  return (
    <button onClick={() => onChange(acc.codice)}
      style={{ background: checked?`${colore}0D`:"white", border:`2px solid ${checked?colore:"#c5d9de"}`, padding: isMobile ? "9px 12px" : "11px 16px", textAlign:"left", cursor:"pointer", transition:"all 0.12s", borderRadius:2, display:"flex", alignItems:"center", gap:10, width:"100%" }}>
      <div style={{ width:16, height:16, borderRadius: radio?"50%":3, flexShrink:0, border:`2px solid ${checked?colore:"#c5d9de"}`, background:checked?colore:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {checked && !radio && <span style={{ color:"white", fontSize:10, fontWeight:900 }}>✓</span>}
        {checked && radio  && <div style={{ width:5, height:5, borderRadius:"50%", background:"white" }} />}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight:checked?700:500, color:"#282a31" }}>{acc.tipo}</div>
        <div style={{ fontSize:10, color:"#666", marginTop:1 }}>{acc.desc}</div>
      </div>
      <CodicePill codice={acc.codice} />
    </button>
  );
}


function StepRigaGruppi({ s, colore, fam, onReset, onAddToCart, sistemaKey }) {
  const [selGruppo, setSelGruppo]   = useState(null);
  const [selUscita, setSelUscita]   = useState(null);
  const [selRiga,   setSelRiga]     = useState(null);
  const [selPav,    setSelPav]      = useState(null);
  const [selBox,    setSelBox]      = useState(null);
  const [selScatola,setSelScatola]  = useState(null);
  const [accH,      setAccH]        = useState(false);
  const [accInterni, setAccInterni]  = useState([]);

  const LABEL_USCITA = {
    "laterale":     "Uscita cavi laterale",
    "tubo":         "Tubo telescopico",
    "cieco":        "Coperchio cieco",
    "angel-hair":   "Uscita cavi con spazzola",
    "laterale-vt2": "Uscita cavi laterale (VT2)",
  };

  const gruppo = s.gruppi[selGruppo] ?? null;

  // Uscite distinte nel gruppo corrente
  const usciteDisponibili = gruppo?.righe
    ? [...new Set(gruppo.righe.map(r => r.uscita).filter(Boolean))]
    : [];
  const hasUscitaStep = usciteDisponibili.length > 1;
  const righeFiltrate = hasUscitaStep && selUscita
    ? gruppo.righe.filter(r => r.uscita === selUscita)
    : gruppo?.righe ?? [];

  const riga   = righeFiltrate[selRiga] ?? null;
  const hasAccH        = !!s.accessorio_h;
  const hasAccInterni  = !!(s.accessori_interni?.length);
  const hasBFGlobale   = !!s.box_fisso_globale;
  const hasScatolaSist = !!s.scatola_massetto;

  const toggleAccInterno = (codice) => setAccInterni(prev => prev.includes(codice) ? prev.filter(c => c !== codice) : [...prev, codice]);

  const handleGruppo  = (i) => { setSelGruppo(i); setSelUscita(null); setSelRiga(null); setSelPav(null); setSelBox(null); setSelScatola(null); setAccH(false); setAccInterni([]); };
  const handleUscita  = (u) => { setSelUscita(u); setSelRiga(null);   setSelPav(null);  setSelBox(null); setSelScatola(null); setAccH(false); setAccInterni([]); };
  const handleRiga    = (i) => { setSelRiga(i);   setSelPav(null);    setSelBox(null);  setSelScatola(null); setAccH(false); setAccInterni([]); };
  const handlePav     = (p) => { setSelPav(p);    setSelBox(null);    setSelScatola(null); };
  const handleBox     = (c) => { setSelBox(c);    setSelScatola(null); };

  // hasBoxLibero = gruppo con box a scelta (id VUOTA oppure qualsiasi gruppo con .box e senza .box_fisso)
  const hasBoxLibero    = !!(gruppo?.box && !gruppo?.box_fisso);
  const hasScatola      = selPav === "massetto";
  const boxScelto       = hasBoxLibero ? gruppo?.box?.find(b => b.codice === selBox) : null;

  // Box per configuratore dispositivi
  const boxPerConf = (() => {
    if (boxScelto) return boxScelto;
    if (gruppo?.box_fisso) return gruppo.box_fisso;
    if (s.box_fisso_globale) {
      // GES R2: MT R2 1-1 con eventuale MP R2 2C (2 keystone dati agli slot 4 e 5)
      if (s.box_fisso_globale.tipo === "MT R2 1-1") {
        const haKeystone = accInterni.includes("7408806"); // MP R2 2C
        return {
          ...s.box_fisso_globale,
          tipo: haKeystone ? "MT R2 1-1+2C" : "MT R2 1-1",
          slotFissi: haKeystone
            ? [{ idx: 4, label: "Keystone", colore: "#2E7D32", emoji: "🌐" },
               { idx: 5, label: "Keystone", colore: "#2E7D32", emoji: "🌐" }]
            : [],
        };
      }
      return s.box_fisso_globale;
    }
    return null;
  })();

  // Scatole filtrate per dim della riga (se la riga ha .dim), altrimenti tutte
  const rigaDim = riga?.dim ?? null;
  const scatoleFiltrate = gruppo?.scatole_massetto
    ? (rigaDim ? gruppo.scatole_massetto.filter(sc => sc.dim === rigaDim) : gruppo.scatole_massetto)
    : [];

  const scatolaSelta    = hasScatola && scatoleFiltrate.length > 0 ? scatoleFiltrate.find(sc => sc.codice === selScatola) : null;
  const scatolaFissa    = hasScatola && !hasBoxLibero ? gruppo?.scatola_massetto : null;

  // Se il sistema ha un solo pavimento (es. solo massetto), lo pre-selezioniamo
  const soloPavimento   = s.pavimenti?.length === 1 ? s.pavimenti[0] : null;
  const pavEffettivo    = selPav ?? soloPavimento;

  // Accessorio obbligatorio per uscita cavi (es. coperchio tubo seminato)
  const accPerUscita = riga?.uscita ? gruppo?.accessorio_obbligatorio_per_uscita?.[riga.uscita] : null;

  // Altezza effettiva — logica speciale per SEMINATO (cassetta: 73–113 + 12,5 fisso)
  const hasDimRiga = !!rigaDim;
  const getAltezza = () => {
    if (!pavEffettivo || !gruppo) return null;
    if (hasDimRiga && scatolaSelta) {
      // Seminato: altezza totale = (73–113) + 12.5 + h_scatola
      const hMin = Math.round(73 + 12.5 + scatolaSelta.h_min);
      const hMax = Math.round(113 + 12.5 + scatolaSelta.h_max);
      return `${hMin}–${hMax} mm`;
    }
    if (hasBoxLibero) {
      if (pavEffettivo === "flottante" && boxScelto) return `min. ${boxScelto.altezza_min}mm`;
      if (pavEffettivo === "massetto" && boxScelto && scatolaSelta) {
        const minEff = Math.max(boxScelto.altezza_min, scatolaSelta.h_min);
        return `${minEff}–${scatolaSelta.h_max}mm`;
      }
      return gruppo.altezze?.flottante ?? null;
    }
    return gruppo.altezze?.[pavEffettivo] ?? null;
  };

  // Costruisci righe riepilogo
  const getRigheRiepilogo = () => {
    if (!riga || !gruppo) return null;
    if (!pavEffettivo) return null;
    // Per sistemi con dim (seminato): serve la scatola per completare
    const needsScatolaDim = hasDimRiga && pavEffettivo === "massetto" && scatoleFiltrate.length > 0;
    if (needsScatolaDim && !selScatola) return null;
    // Per sistemi con box libero classico: serve box + scatola
    const needsScatola = hasBoxLibero && !hasDimRiga && pavEffettivo === "massetto" && scatoleFiltrate.length > 0;
    if (hasBoxLibero && !hasDimRiga && (!selBox || (needsScatola && !selScatola))) return null;

    const rows = [];
    rows.push({ label: "Torretta", codice: riga.codice, nota: riga.label, bg: "white" });

    // Accessorio obbligatorio per tipo uscita (es. coperchio tubo seminato)
    if (accPerUscita) {
      rows.push({ label: `${accPerUscita.tipo}${accPerUscita.qty > 1 ? ` ×${accPerUscita.qty}` : ""} (obbligatorio)`, codice: accPerUscita.codice, nota: accPerUscita.desc, bg: "#FFF8E1" });
    }

    // Box fisso a livello sistema (comune a tutti i gruppi, es. GES R2)
    if (hasBFGlobale) {
      const bf = s.box_fisso_globale;
      rows.push({ label: "Box portafrutti", codice: bf.codice, nota: `${bf.tipo} – ${bf.desc}`, bg: "#f0f5f6" });
    }

    // Accessori interni opzionali a livello sistema
    if (hasAccInterni) {
      s.accessori_interni.filter(a => accInterni.includes(a.codice)).forEach(a =>
        rows.push({ label: "Accessorio interno", codice: a.codice, nota: `${a.tipo} – ${a.desc}`, bg: "#F0F7FF" })
      );
    }

    // Scatola massetto a livello sistema (obbligatoria se massetto)
    if (hasScatolaSist && pavEffettivo === "massetto") {
      const sc = s.scatola_massetto;
      rows.push({ label: "Scatola massetto (obbligatoria)", codice: sc.codice, nota: `${sc.tipo} – ${sc.desc}`, bg: "#FFF8E1" });
    }

    if (gruppo.box_fisso) {
      rows.push({ label: "Box portafrutti", codice: gruppo.box_fisso.codice || "—", nota: `${gruppo.box_fisso.tipo} – ${gruppo.box_fisso.desc}`, bg: "#f0f5f6" });
    }
    if (gruppo.accessorio_obbligatorio) {
      const a = gruppo.accessorio_obbligatorio;
      rows.push({ label: `${a.tipo}${a.qty > 1 ? ` ×${a.qty}` : ""} (obbligatorio)`, codice: a.codice, nota: a.nota, bg: "#FFF8E1" });
    }
    if (boxScelto) {
      rows.push({ label: "Box portafrutti", codice: boxScelto.codice, nota: `${boxScelto.tipo} – ${boxScelto.desc}`, bg: "#f0f5f6" });
      const accPerBox = gruppo.accessorio_obbligatorio_per_box?.[boxScelto.codice];
      if (accPerBox) {
        rows.push({ label: `${accPerBox.tipo} ×${accPerBox.qty} (obbligatorio)`, codice: accPerBox.codice, nota: accPerBox.desc, bg: "#FFF8E1" });
      }
    }
    if (scatolaFissa) {
      rows.push({ label: "Scatola massetto", codice: scatolaFissa.codice, nota: `${scatolaFissa.tipo} – ${scatolaFissa.desc}`, bg: "white" });
    }
    if (scatolaSelta) {
      rows.push({ label: "Scatola massetto", codice: scatolaSelta.codice, nota: `${scatolaSelta.tipo} – ${scatolaSelta.desc}`, bg: "white" });
    }
    if (gruppo.accessorio_sempre) {
      const a = gruppo.accessorio_sempre;
      rows.push({ label: `${a.tipo} (sempre obbligatorio)`, codice: a.codice, nota: a.desc, bg: "#FFF3E0" });
    }
    if (hasAccH && accH) {
      const a = s.accessorio_h;
      rows.push({ label: "Accessorio altezza", codice: a.codice, nota: `${a.tipo} – ${a.desc}`, bg: "#F5FFF0" });
    }
    return rows;
  };

  const righeRiepilogo = getRigheRiepilogo();

  return (
    <div>
      {/* SCHEDA TECNICA */}
      <div style={{ background:"white", border:"1px solid #e0e0e0", padding:"16px 20px", marginBottom:20, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:12, borderRadius:3 }}>
        {[ {l:"Forma",v:s.forma},{l:"Dimensioni",v:s.dimensione},{l:"IP chiuso",v:s.ip_chiuso},{l:"Carico",v:s.carico},{l:"Riv. max",v:s.rivestimento_max} ].map((it,i)=>(
          <div key={i}>
            <div style={{ fontSize:10, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:2 }}>{it.l}</div>
            <div style={{ fontSize:14, fontWeight:700, color:colore }}>{it.v}</div>
          </div>
        ))}
      </div>

      {/* A — GRUPPO */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>A — Tipo di configurazione</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {s.gruppi.map((g, i) => (
            <button key={i} onClick={() => handleGruppo(i)}
              style={{ background:selGruppo===i?`${colore}12`:"white", border:`2px solid ${selGruppo===i?colore:"#c5d9de"}`, padding:"14px 18px", textAlign:"left", cursor:"pointer", transition:"all 0.12s", borderRadius:2 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${selGruppo===i?colore:"#c5d9de"}`, background:selGruppo===i?colore:"white", flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:14, fontWeight:selGruppo===i?700:500, color:"#282a31" }}>{g.label}</div>
                  <div style={{ fontSize:11, color:"#666", marginTop:3 }}>{g.sottotitolo}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* B — USCITA CAVI (solo se il gruppo ha più varianti di uscita) */}
      {selGruppo !== null && hasUscitaStep && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>B — Tipo di uscita cavi</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {usciteDisponibili.map(u => (
              <button key={u} onClick={() => handleUscita(u)}
                style={{ flex:"1 1 140px", padding:"13px 12px", border:`2px solid ${selUscita===u?colore:"#c5d9de"}`, background:selUscita===u?`${colore}10`:"white", cursor:"pointer", fontWeight:selUscita===u?800:500, fontSize:13, color:selUscita===u?colore:"#41525d", borderRadius:2, transition:"all 0.12s", textAlign:"center" }}>
                {LABEL_USCITA[u] ?? u}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* B/C — TORRETTA (filtrata per uscita se selezionata) */}
      {selGruppo !== null && (!hasUscitaStep || selUscita !== null) && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>{hasUscitaStep ? "C" : "B"} — Scegli la torretta</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {righeFiltrate.map((r, i) => (
              <button key={i} onClick={() => handleRiga(i)}
                style={{ background:selRiga===i?`${colore}12`:"white", border:`2px solid ${selRiga===i?colore:"#c5d9de"}`, padding:"11px 16px", textAlign:"left", cursor:"pointer", transition:"all 0.12s", borderRadius:2, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selRiga===i?colore:"#c5d9de"}`, background:selRiga===i?colore:"white", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:selRiga===i?700:500, color:"#282a31" }}>{r.label}</div>
                  <div style={{ fontSize:11, color:"#666" }}>{r.materiale}</div>
                </div>
                {selRiga===i && <CodicePill codice={r.codice} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* C/D — PAVIMENTO (solo se più di un pavimento disponibile) */}
      {selRiga !== null && !soloPavimento && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>{hasUscitaStep ? "D" : "C"} — Tipo di pavimento</div>
          <div style={{ display:"flex", gap:12 }}>
            {s.pavimenti.map(pav => (
              <button key={pav} onClick={() => handlePav(pav)}
                style={{ flex:1, padding:"14px 12px", border:`2px solid ${selPav===pav?colore:"#c5d9de"}`, background:selPav===pav?`${colore}10`:"white", cursor:"pointer", fontWeight:selPav===pav?800:500, fontSize:14, color:selPav===pav?colore:"#41525d", borderRadius:2, transition:"all 0.12s" }}>
                {pav==="massetto"?"🧱 Massetto":"🪵 Pav. flottante"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* C nota: se solo massetto, mostrare avviso */}
      {selRiga !== null && soloPavimento && (
        <div style={{ marginBottom:20, background:"#F3F8FF", border:"1px solid #BBDEFB", padding:"10px 14px", borderRadius:2, fontSize:12, color:"#1565C0" }}>
          🧱 Questo sistema è installabile <strong>solo su massetto</strong>.
        </div>
      )}

      {/* D — BOX portafrutti (tutti i sistemi con box libero) */}
      {hasBoxLibero && selRiga !== null && (selPav !== null || soloPavimento) && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
            {hasDimRiga ? "C" : "D"} — Scegli il box portafrutti
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {gruppo.box.map(b => (
              <button key={b.codice} onClick={() => handleBox(b.codice)}
                style={{ background:selBox===b.codice?`${colore}12`:"white", border:`2px solid ${selBox===b.codice?colore:"#c5d9de"}`, padding:"12px 16px", textAlign:"left", cursor:"pointer", transition:"all 0.12s", borderRadius:2, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selBox===b.codice?colore:"#c5d9de"}`, background:selBox===b.codice?colore:"white", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:selBox===b.codice?700:500, color:"#282a31" }}>{b.tipo} — {b.desc}</div>
                  <div style={{ fontSize:11, color:"#666" }}>{b.nota}</div>
                </div>
                <CodicePill codice={b.codice} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* E — SCATOLA MASSETTO classica (box libero, scatole non filtrate per dim) */}
      {hasBoxLibero && !hasDimRiga && selBox && pavEffettivo === "massetto" && scatoleFiltrate.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>E — Scatola massetto</div>
          <div style={{ fontSize:11, color:"#666", marginBottom:10 }}>
            Scegli in base all'altezza disponibile in cantiere. Min. effettivo = max(altezza box, h_min scatola).
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {scatoleFiltrate.map(sc => {
              const minEff = Math.max(boxScelto?.altezza_min ?? 0, sc.h_min);
              const disabled = boxScelto && sc.h_max < boxScelto.altezza_min;
              return (
                <button key={sc.codice} onClick={() => !disabled && setSelScatola(sc.codice)}
                  style={{ background:selScatola===sc.codice?`${colore}12`:disabled?"#e4ebed":"white", border:`2px solid ${selScatola===sc.codice?colore:"#c5d9de"}`, padding:"12px 16px", textAlign:"left", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.45:1, transition:"all 0.12s", borderRadius:2, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selScatola===sc.codice?colore:"#c5d9de"}`, background:selScatola===sc.codice?colore:"white", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:selScatola===sc.codice?700:500, color:disabled?"#7694a4":"#282a31" }}>{sc.tipo} — {sc.desc}</div>
                    {!disabled && <div style={{ fontSize:11, color:"#666" }}>Altezza effettiva: {minEff}–{sc.h_max}mm</div>}
                    {disabled && <div style={{ fontSize:11, color:"#c0392b" }}>Non compatibile con {boxScelto?.tipo}</div>}
                  </div>
                  <CodicePill codice={sc.codice} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* D — SCATOLA MASSETTO seminato (logica dim: filtrata per dim riga, senza dipendenza da box) */}
      {hasDimRiga && selBox && pavEffettivo === "massetto" && scatoleFiltrate.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>
            D — Scatola massetto{" "}
            <span style={{ fontWeight:400, color:"#888", fontSize:10, letterSpacing:0, textTransform:"none" }}>
              dim. {rigaDim} — altezza totale = 73–113 mm (cassetta) + 12,5 mm + h scatola
            </span>
          </div>
          <div style={{ fontSize:11, color:"#666", marginBottom:10 }}>
            Scegli in base all'altezza totale disponibile in cantiere.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {scatoleFiltrate.map(sc => {
              const hTotMin = Math.round(73 + 12.5 + sc.h_min);
              const hTotMax = Math.round(113 + 12.5 + sc.h_max);
              return (
                <button key={sc.codice} onClick={() => setSelScatola(sc.codice)}
                  style={{ background:selScatola===sc.codice?`${colore}12`:"white", border:`2px solid ${selScatola===sc.codice?colore:"#c5d9de"}`, padding:"12px 16px", textAlign:"left", cursor:"pointer", transition:"all 0.12s", borderRadius:2, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selScatola===sc.codice?colore:"#c5d9de"}`, background:selScatola===sc.codice?colore:"white", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:selScatola===sc.codice?700:500, color:"#282a31" }}>{sc.tipo} — {sc.desc}</div>
                    <div style={{ fontSize:11, color:"#666" }}>Altezza totale sistema: {hTotMin}–{hTotMax} mm</div>
                  </div>
                  <CodicePill codice={sc.codice} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACC INTERNI — opzionali a livello sistema, checkbox multi */}
      {hasAccInterni && righeRiepilogo && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            Accessori interni{" "}
            <span style={{ fontSize:10, fontWeight:400, color:"#888", letterSpacing:0, textTransform:"none" }}>(opzionali)</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {s.accessori_interni.map(acc => (
              <AccessorioCheckbox key={acc.codice} acc={acc} checked={accInterni.includes(acc.codice)} onChange={toggleAccInterno} colore={colore} />
            ))}
          </div>
        </div>
      )}

      {/* ACC H — opzionale, appare quando il riepilogo è pronto */}
      {hasAccH && righeRiepilogo && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            Accessorio altezza{" "}
            <span style={{ fontSize:10, fontWeight:400, color:"#888", letterSpacing:0, textTransform:"none" }}>(opzionale — solo se serve maggiore altezza)</span>
          </div>
          <div style={{ fontSize:11, color:"#666", marginBottom:10 }}>
            Con {s.accessorio_h.tipo} si estende il range di +10÷+60 mm aggiuntivi.
          </div>
          <AccessorioCheckbox
            acc={s.accessorio_h}
            checked={accH}
            onChange={() => setAccH(v => !v)}
            colore={colore}
          />
        </div>
      )}

      {/* RIEPILOGO */}
      {righeRiepilogo && (
        <Riepilogo righe={righeRiepilogo} altezza={getAltezza()} estensioni={s.estensioni} colore={colore} onReset={onReset} onAddToCart={onAddToCart} sistemaLabel={s.label} sistemaKey={sistemaKey} boxScelto={boxPerConf} />
      )}
    </div>
  );
}

// ── Checkbox accessorio opzionale ────────────────────────────────
// ── Configuratore standard (sistemi senza gruppi) ─────────────────
function StepRiga({ sistemaKey, onBack, onReset, onAddToCart }) {
  const [selectedRiga,      setSelectedRiga]      = useState(null);
  const [selectedPav,       setSelectedPav]       = useState(null);
  const [selectedBox,       setSelectedBox]       = useState(null);
  const [selUscita,         setSelUscita]         = useState(null);
  const [selScatola,        setSelScatola]        = useState(null);
  const [accInterni,        setAccInterni]        = useState([]);
  const [accHSelezionato,   setAccHSelezionato]   = useState(false);
  const [noteAperte,        setNoteAperte]        = useState(false);
  const { isMobile } = useM();

  const s      = DB[sistemaKey];
  const colore = getColore(sistemaKey);
  const fam    = getFamiglia(sistemaKey);

  // Se sistema usa logica "gruppi", delega a StepRigaGruppi
  if (s.tipo === "gruppi") {
    return (
      <div>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#F39B00", cursor:"pointer", fontSize:13, padding:"0 0 16px", fontWeight:600 }}>← Torna ai modelli</button>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, color:"#F39B00", fontWeight:700, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Step 3 di 3 — {fam.label}</div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:20 }}>
            {SISTEMA_IMG[sistemaKey] && (
              <img referrerPolicy="no-referrer" src={SISTEMA_IMG[sistemaKey]} alt={s.label}
                style={{ width:90, height:90, objectFit:"contain", background:"#f5f5f5", borderRadius:4, flexShrink:0, border:"1px solid #eee" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
            <div>
              <h2 style={{ fontSize:30, fontWeight:900, color:"#282a31", margin:"0 0 6px" }}>{s.label}</h2>
              {SISTEMA_DESC[sistemaKey] && (
                <p style={{ fontSize:13, color:"#333", margin:0, maxWidth:540, lineHeight:1.55 }}>{SISTEMA_DESC[sistemaKey]}</p>
              )}
            </div>
          </div>
        </div>
        <StepRigaGruppi s={s} colore={colore} fam={fam} onReset={onReset} onAddToCart={onAddToCart} sistemaKey={sistemaKey} />
      </div>
    );
  }

  // Uscite distinte disponibili nelle righe (se le righe hanno la prop .uscita)
  const LABEL_USCITA = {
    "laterale":     "Uscita cavi laterale",
    "tubo":         "Tubo telescopico",
    "cieco":        "Coperchio cieco",
    "angel-hair":   "Uscita cavi con spazzola",
    "laterale-vt2": "Uscita cavi laterale (VT2)",
  };
  const usciteDisponibili = s.righe
    ? [...new Set(s.righe.map(r => r.uscita).filter(Boolean))]
    : [];
  const hasUscitaStep = usciteDisponibili.length > 1;
  const righeFiltrate = hasUscitaStep && selUscita
    ? s.righe.filter(r => r.uscita === selUscita)
    : s.righe;

  const handleUscita = (u) => { setSelUscita(u); setSelectedRiga(null); setSelectedPav(null); setSelectedBox(null); setSelScatola(null); setAccInterni([]); setAccHSelezionato(false); };
  const riga = righeFiltrate ? righeFiltrate[selectedRiga] : null;

  const handleRiga = (i) => { setSelectedRiga(i); setSelectedPav(null); setSelectedBox(null); setSelScatola(null); setAccInterni([]); setAccHSelezionato(false); };
  const handlePav  = (pav) => { setSelectedPav(pav); setSelectedBox(null); setSelScatola(null); setAccInterni([]); setAccHSelezionato(false); };

  const accEsclusivi = !!s.accessori_interni_esclusivi;
  const toggleAccInterno = (codice) => {
    if (accEsclusivi) {
      setAccInterni(prev => prev.includes(codice) ? [] : [codice]);
    } else {
      setAccInterni(prev => prev.includes(codice) ? prev.filter(c => c !== codice) : [...prev, codice]);
    }
  };

  const boxDisponibili = s.box ? s.box.filter(b => !selectedPav || b.pavimenti_ok.includes(selectedPav)) : [];
  const hasBoxStep     = s.box && s.box.length > 0;
  const hasAccInterni  = s.accessori_interni && s.accessori_interni.length > 0;
  const hasAccH        = !!s.accessorio_h;

  const avviso = s.avviso_rotonda_flottante && riga?.forma === "rotonda" && selectedPav === "flottante"
    ? "⚠ Accessorio per pavimento flottante NON disponibile per la versione rotonda. Usare solo con massetto."
    : null;

  // Scatola a scelta (array) — usata da CASS_TEL — dichiarata prima di getAltezza che la usa
  const hasScatolaScelta = !!(s.scatole_massetto?.length);
  const scatolaSeltaTel  = hasScatolaScelta ? s.scatole_massetto.find(sc => sc.codice === selScatola) : null;

  const getAltezza = () => {
    if (!selectedPav || !s.altezze) {
      // CASS_TEL: calcola da scatola + riv_max riga
      if (hasScatolaScelta && scatolaSeltaTel && riga?.riv_max != null) {
        return `${scatolaSeltaTel.h_min + riga.riv_max}–${scatolaSeltaTel.h_max + riga.riv_max}mm`;
      }
      return null;
    }
    return s.altezze[selectedPav] ?? null;
  };

  const boxScelto       = s.box ? s.box.find(b => b.codice === selectedBox) : null;
  const scatolaMassetto = selectedPav === "massetto" && s.scatola_massetto ? s.scatola_massetto : null;

  // Accessorio obbligatorio legato al tipo di uscita — solo per CASS_TEL
  const ACC_USCITA_TEL = {
    "laterale": { codice: "7407995", tipo: "Uscita cavi inox",  desc: "Art. 7407995 — obbligatorio con uscita laterale" },
    "tubo":     { codice: "7428140", tipo: "Coperchio TUK2 GV", desc: "Art. 7428140 — obbligatorio con tubo telescopico" },
    "cieco":    null,
  };
  const accUscitaTel = sistemaKey === "CASS_TEL" && riga?.uscita
    ? (ACC_USCITA_TEL[riga.uscita] ?? null)
    : null;

  // Box per configuratore dispositivi con gestione keystone UDHOME-ONE e UDHOME2
  const boxPerConf = (() => {
    if (boxScelto) return boxScelto;
    if (s.box?.[0]) return s.box[0];
    if (sistemaKey === "UDHOME_ONE") {
      const haDTP  = accInterni.includes("7368494"); // DTP UH1 C — keystone dati
      const ha2M45 = accInterni.includes("7368485"); // MT UH1 2M45 — 2 Modul45
      if (ha2M45)  return { tipo: "UDHOME-ONE 2M", codice: null, slotFissi: [] };
      if (haDTP)   return { tipo: "UDHOME-ONE+K",  codice: null, slotFissi: [{ idx: 2, label: "Keystone", colore: "#2E7D32", emoji: "🌐" }] };
      return { tipo: "UDHOME-ONE 1M", codice: null, slotFissi: [] };
    }
    if (sistemaKey === "UDHOME2") {
      const haDT = accInterni.includes("7368474"); // DT UH2 C — 2 keystone
      return {
        tipo: haDT ? "UDHOME2+K" : "UDHOME2", codice: null,
        slotFissi: haDT
          ? [{ idx: 4, label: "Keystone", colore: "#2E7D32", emoji: "🌐" },
             { idx: 5, label: "Keystone", colore: "#2E7D32", emoji: "🌐" }]
          : [],
      };
    }
    return null;
  })();

  // Il riepilogo appare dopo: uscita (se necessario) + torretta + pavimento + eventuale box + eventuale scatola
  const showRiepilogo = (!hasUscitaStep || selUscita !== null) &&
    selectedRiga !== null && (selectedPav !== null || s.pavimenti?.length === 1) &&
    (!hasBoxStep || selectedBox !== null) &&
    (!hasScatolaScelta || selScatola !== null) &&
    !avviso;

  // Lettera progressiva per le sezioni opzionali
  const letteraPav  = hasUscitaStep ? "B" : "A";
  const letteraBox  = hasUscitaStep ? (hasBoxStep ? "D" : "—") : (hasBoxStep ? "C" : "—");
  const letteraBase = hasUscitaStep ? (hasBoxStep ? "E" : "D") : (hasBoxStep ? "D" : "C");
  const letteraH    = hasUscitaStep ? (hasBoxStep ? "F" : "E") : (hasBoxStep ? "E" : "D");

  const getRigheRiepilogo = () => {
    if (!showRiepilogo || !riga) return [];
    const rows = [];
    rows.push({ label: "Torretta", codice: riga.codici?.[0] ?? riga.codice, nota: riga.label, bg: "white" });
    if (accUscitaTel) {
      rows.push({ label: `${accUscitaTel.tipo} (obbligatorio)`, codice: accUscitaTel.codice, nota: accUscitaTel.desc, bg: "#FFF8E1" });
    }
    if (boxScelto) rows.push({ label: "Box portafrutti", codice: boxScelto.codice, nota: `${boxScelto.tipo} – ${boxScelto.desc}`, bg: "#f0f5f6" });
    if (s.box_note && riga?.uscita !== "cieco" && (!s.box || s.box.length === 0)) {
      rows.push({ label: "Box portafrutti", codice: "⚠ TBD", nota: s.box_note, bg: "#FFF3E0" });
    }
    if (scatolaMassetto) rows.push({ label: "Scatola massetto", codice: scatolaMassetto.codice, nota: `${scatolaMassetto.tipo} – ${scatolaMassetto.desc}`, bg: "white" });
    if (scatolaSeltaTel) {
      rows.push({ label: "Scatola massetto (obbligatoria)", codice: scatolaSeltaTel.codice, nota: `${scatolaSeltaTel.tipo} – ${scatolaSeltaTel.desc}`, bg: "#FFF8E1" });
    }
    if (selectedPav === "flottante") s.accessori_flottante?.forEach(a => rows.push({ label: "Accessorio flottante", codice: a.codice, nota: `${a.tipo} – ${a.desc}`, bg: "#F3F8FF" }));
    if (hasAccInterni) {
      s.accessori_interni.filter(a => accInterni.includes(a.codice)).forEach(a =>
        rows.push({ label: "Accessorio interno", codice: a.codice, nota: `${a.tipo} – ${a.desc}`, bg: "#F0F7FF" })
      );
    }
    if (hasAccH && accHSelezionato) {
      rows.push({ label: "Accessorio altezza", codice: s.accessorio_h.codice, nota: `${s.accessorio_h.tipo} – ${s.accessorio_h.desc}`, bg: "#F5FFF0" });
    }
    return rows;
  };

  return (
    <div>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#F39B00", cursor:"pointer", fontSize:13, padding:"0 0 12px", fontWeight:600 }}>← Torna ai modelli</button>

      {/* INTESTAZIONE */}
      <div style={{ marginBottom: isMobile ? 14 : 24 }}>
        <div style={{ fontSize:10, color:"#F39B00", fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Step 3 di 3 — {fam.label}</div>
        <div style={{ display:"flex", alignItems:"flex-start", gap: isMobile ? 10 : 20 }}>
          {SISTEMA_IMG[sistemaKey] && !isMobile && (
            <img referrerPolicy="no-referrer" src={SISTEMA_IMG[sistemaKey]} alt={s.label}
              style={{ width:80, height:80, objectFit:"contain", background:"#f5f5f5", borderRadius:4, flexShrink:0, border:"1px solid #eee" }}
              onError={e => { e.target.style.display="none"; }} />
          )}
          <div>
            <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight:900, color:"#282a31", margin:"0 0 6px", letterSpacing:-0.5 }}>{s.label}</h2>
            {!isMobile && SISTEMA_DESC[sistemaKey] && (
              <p style={{ fontSize:13, color:"#333", margin:0, maxWidth:540, lineHeight:1.55 }}>{SISTEMA_DESC[sistemaKey]}</p>
            )}
          </div>
        </div>
      </div>

      {/* SCHEDA TECNICA */}
      <div style={{ background:"white", border:"1px solid #e0e0e0", padding: isMobile ? "12px" : "16px 20px", marginBottom: s.note ? 0 : 16, display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(140px,1fr))", gap: isMobile ? 10 : 12, borderRadius: s.note ? "3px 3px 0 0" : 3 }}>
        {(() => {
          const ipCampi = s.ip_chiuso
            ? [{ l:"IP chiuso", v: s.ip_chiuso }]
            : riga?.uscita
              ? [{ l:"IP", v: riga.uscita==="laterale" ? s.ip_laterale : riga.uscita==="tubo" ? s.ip_tubo : s.ip_cieco }]
              : [
                  s.ip_laterale && { l:"IP lat.", v: s.ip_laterale },
                  s.ip_tubo    && { l:"IP tubo", v: s.ip_tubo },
                  s.ip_cieco   && { l:"IP cieco", v: s.ip_cieco },
                ].filter(Boolean);
          const rivVal = riga?.riv_max != null ? `${riga.riv_max}mm` : s.rivestimento_max ?? null;
          const altVal = getAltezza() || (hasScatolaScelta
            ? `${s.scatole_massetto[0].h_min}–${s.scatole_massetto[s.scatole_massetto.length-1].h_max + (riga?.riv_max ?? 28)}mm`
            : null);
          return [
            { l:"Forma",      v: s.forma },
            { l:"Dim.",       v: s.dimensione },
            ...ipCampi,
            { l:"Carico",     v: s.carico ?? "—" },
            rivVal ? { l:"Riv. max", v: rivVal } : null,
            altVal ? { l:"Altezza",  v: altVal } : null,
          ].filter(Boolean).map((it, i) => (
            <div key={i}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:1.5, textTransform:"uppercase", marginBottom:2, fontWeight:700 }}>{it.l}</div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight:700, color:colore }}>{it.v}</div>
            </div>
          ));
        })()}
      </div>

      {/* NOTE collassabili */}
      {s.note && (
        <div style={{ marginBottom:16, border:"1px solid #ddd", borderTop:"none", borderRadius:"0 0 2px 2px", overflow:"hidden" }}>
          <button onClick={() => setNoteAperte(v => !v)}
            style={{ width:"100%", background:"#f5f5f5", border:"none", borderTop:"1px solid #e8e8e8", padding:"8px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase" }}>ℹ Note di sistema</span>
            <span style={{ fontSize:13, color:"#888", transform: noteAperte?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>▾</span>
          </button>
          {noteAperte && <div style={{ background:"#FFFDF5", padding:"10px 14px", fontSize:12, color:"#7A4F00", lineHeight:1.7, borderTop:"1px solid #FFE082" }}>{s.note}</div>}
        </div>
      )}

      {/* A — USCITA CAVI */}
      {hasUscitaStep && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>A — Tipo di uscita cavi</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {usciteDisponibili.map(u => (
              <button key={u} onClick={() => handleUscita(u)}
                style={{ flex:"1 1 120px", padding: isMobile ? "10px 8px" : "13px 12px", border:`2px solid ${selUscita===u?colore:"#c5d9de"}`, background:selUscita===u?`${colore}10`:"white", cursor:"pointer", fontWeight:selUscita===u?800:500, fontSize: isMobile ? 12 : 13, color:selUscita===u?colore:"#41525d", borderRadius:2, transition:"all 0.12s" }}>
                {LABEL_USCITA[u] ?? u}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* B — TORRETTA */}
      {s.righe && (!hasUscitaStep || selUscita !== null) && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{hasUscitaStep ? "B" : "A"} — Scegli la torretta</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {righeFiltrate.map((r, i) => (
              <button key={i} onClick={() => handleRiga(i)}
                style={{ background:selectedRiga===i?`${colore}12`:"white", border:`2px solid ${selectedRiga===i?colore:"#c5d9de"}`, padding: isMobile ? "10px 12px" : "12px 16px", textAlign:"left", cursor:"pointer", transition:"all 0.12s", borderRadius:2, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selectedRiga===i?colore:"#c5d9de"}`, background:selectedRiga===i?colore:"white", flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight:selectedRiga===i?700:500, color:"#282a31" }}>{r.label}</div>
                  {r.materiale && <div style={{ fontSize:10, color:"#666", marginTop:1 }}>{r.materiale}{r.colore_ral?` · ${r.colore_ral}`:""}</div>}
                </div>
                {selectedRiga===i && r.codici?.[0] && <CodicePill codice={r.codici[0]} />}
                {selectedRiga===i && r.codice   && <CodicePill codice={r.codice} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PAVIMENTO */}
      {selectedRiga !== null && s.pavimenti?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{letteraPav} — Tipo di pavimento</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {s.pavimenti.map(pav => (
              <button key={pav} onClick={() => handlePav(pav)}
                style={{ flex:1, minWidth: isMobile ? "calc(50% - 4px)" : 120, padding: isMobile ? "10px 8px" : "14px 12px", border:`2px solid ${selectedPav===pav?colore:"#c5d9de"}`, background:selectedPav===pav?`${colore}10`:"white", cursor:"pointer", fontWeight:selectedPav===pav?800:500, fontSize: isMobile ? 12 : 14, color:selectedPav===pav?colore:"#41525d", borderRadius:2, transition:"all 0.12s" }}>
                {pav==="massetto"?"🧱 Massetto":pav==="flottante"?"🪵 Flottante":"🔲 Seminato"}
              </button>
            ))}
          </div>
        </div>
      )}

      {avviso && <div style={{ background:"#FFEBEE", border:"1px solid #EF9A9A", padding:"10px 12px", marginBottom:16, fontSize:12, color:"#8B0000", borderRadius:2, fontWeight:600 }}>{avviso}</div>}

      {/* BOX portafrutti */}
      {hasBoxStep && selectedPav !== null && !avviso && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{letteraBox} — Box portafrutti</div>
          {boxDisponibili.length === 0
            ? <div style={{ background:"#FFEBEE", border:"1px solid #EF9A9A", padding:"10px 12px", fontSize:12, color:"#8B0000", borderRadius:2 }}>Nessun box disponibile per questa combinazione.</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {boxDisponibili.map(b => (
                  <button key={b.codice} onClick={() => setSelectedBox(b.codice)}
                    style={{ background:selectedBox===b.codice?`${colore}12`:"white", border:`2px solid ${selectedBox===b.codice?colore:"#c5d9de"}`, padding: isMobile ? "10px 12px" : "12px 16px", textAlign:"left", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selectedBox===b.codice?colore:"#c5d9de"}`, background:selectedBox===b.codice?colore:"white", flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight:selectedBox===b.codice?700:500, color:"#282a31" }}>{b.tipo} — {b.desc}</div>
                      {b.nota && <div style={{ fontSize:10, color:"#666", marginTop:1 }}>{b.nota}</div>}
                    </div>
                    <CodicePill codice={b.codice} />
                  </button>
                ))}
              </div>
          }
        </div>
      )}

      {/* SCATOLA MASSETTO (CASS_TEL) */}
      {hasScatolaScelta && selectedRiga !== null && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            {hasUscitaStep ? "C" : "B"} — Scatola da massetto
            {!isMobile && <span style={{ fontWeight:400, color:"#888", fontSize:10, letterSpacing:0, textTransform:"none", marginLeft:8 }}>h scatola + {riga?.riv_max != null ? `${riga.riv_max}mm riv.` : "riv. cassetta"}</span>}
          </div>
          {isMobile && <div style={{ fontSize:10, color:"#888", marginBottom:8 }}>Altezza tot. = h scatola + {riga?.riv_max != null ? `${riga.riv_max}mm` : "riv."}</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {s.scatole_massetto.map(sc => {
              const hTotMin = sc.h_min + (riga?.riv_max ?? 0);
              const hTotMax = sc.h_max + (riga?.riv_max ?? 0);
              return (
                <button key={sc.codice} onClick={() => setSelScatola(sc.codice)}
                  style={{ background:selScatola===sc.codice?`${colore}12`:"white", border:`2px solid ${selScatola===sc.codice?colore:"#c5d9de"}`, padding: isMobile ? "10px 12px" : "12px 16px", textAlign:"left", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selScatola===sc.codice?colore:"#c5d9de"}`, background:selScatola===sc.codice?colore:"white", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight:selScatola===sc.codice?700:500, color:"#282a31" }}>{sc.tipo} — {sc.desc}</div>
                    <div style={{ fontSize:10, color:"#666", marginTop:1 }}>Altezza tot.: {hTotMin}–{hTotMax}mm</div>
                  </div>
                  <CodicePill codice={sc.codice} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACCESSORI INTERNI */}
      {hasAccInterni && showRiepilogo && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            {letteraBase} — Accessori interni <span style={{ fontSize:10, fontWeight:400, color:"#888", letterSpacing:0, textTransform:"none" }}>(opzionali)</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {s.accessori_interni.map(acc => (
              <AccessorioCheckbox key={acc.codice} acc={acc} checked={accInterni.includes(acc.codice)} onChange={toggleAccInterno} colore={colore} radio={accEsclusivi} />
            ))}
          </div>
        </div>
      )}

      {/* ACCESSORIO ALTEZZA */}
      {hasAccH && showRiepilogo && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            {letteraH} — Accessorio altezza <span style={{ fontSize:10, fontWeight:400, color:"#888", letterSpacing:0, textTransform:"none" }}>(opzionale)</span>
          </div>
          <AccessorioCheckbox acc={s.accessorio_h} checked={accHSelezionato} onChange={() => setAccHSelezionato(v => !v)} colore={colore} />
        </div>
      )}

      {showRiepilogo && <Riepilogo righe={getRigheRiepilogo()} altezza={getAltezza()} estensioni={s.estensioni} piedini={s.piedini} colore={colore} onReset={onReset} onAddToCart={onAddToCart} sistemaLabel={s.label} sistemaKey={sistemaKey} boxScelto={boxPerConf} />}
    </div>
  );
}


// ── Carrello virtuale ─────────────────────────────────────────────
function Carrello({ voci, onRimuovi, onSvuota, onChiudi }) {
  const [copiato, setCopiato] = useState(false);
  const [showDs, setShowDs] = useState(false);
  const [copiatoDs, setCopiatoDs] = useState(false);
  const [showCopiaMenu, setShowCopiaMenu] = useState(false);
  const { isMobile } = useM();

  // Raggruppa tutti gli articoli per codice e somma le quantità
  const distinta = {};
  voci.forEach(voce => {
    voce.righe.forEach(r => {
      const cod = cleanCode(r.codice);
      if (!cod || cod === "—" || cod === "N/D") return;
      if (!distinta[cod]) distinta[cod] = { codice: r.codice, label: r.label, nota: r.nota, qty: 0, voci: [] };
      distinta[cod].qty += 1;
      if (!distinta[cod].voci.includes(voce.label)) distinta[cod].voci.push(voce.label);
    });
  });
  const righe = Object.values(distinta);

  // Colonna codici per configurazione (una riga per codice, separatore vuoto tra config)
  const testoCodiciPerConfig = () => {
    return voci.map((v, i) => {
      const codici = v.righe
        .map(r => cleanCode(r.codice))
        .filter(c => c && c !== "—" && c !== "N/D");
      return (voci.length > 1 ? `// ${i+1}. ${v.label}\n` : "") + codici.join("\n");
    }).join("\n\n");
  };

  // Colonna quantità riepilogativa (una riga per codice: codice + riga vuota per qty)
  const testoQuantita = () => {
    return righe.map(r => `${cleanCode(r.codice)}\t${r.qty}`).join("\n");
  };

  const testoDistinta = () => {
    const lines = ["DISTINTA MATERIALI — OBO Bettermann", "=".repeat(44), ""];
    voci.forEach((v, i) => {
      lines.push(`[${i+1}] ${v.label}${v.altezza ? "  |  " + v.altezza : ""}`);
      v.righe.forEach(r => {
        const cod = cleanCode(r.codice);
        if (cod && cod !== "—" && cod !== "N/D")
          lines.push(`    ${cod.padEnd(10)}  ${r.label}`);
      });
      lines.push("");
    });
    lines.push("RIEPILOGO PER CODICE", "-".repeat(44));
    righe.forEach(r => lines.push(`  ${cleanCode(r.codice).padEnd(10)}  x${r.qty}  ${r.label}`));
    // Datasheet
    const dsLinks = righe
      .map(r => ({ cod: cleanCode(r.codice), url: DATASHEET[cleanCode(r.codice)] }))
      .filter(x => x.url);
    if (dsLinks.length > 0) {
      lines.push("", "DATASHEET", "-".repeat(44));
      dsLinks.forEach(x => lines.push(`  ${x.cod.padEnd(10)}  ${x.url}`));
    }
    return lines.join("\n");
  };

  const copiaStringa = (testo, setter) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(testo).then(() => { setter(true); setTimeout(() => setter(false), 2000); }).catch(() => copiaFallback(testo, setter));
    } else {
      copiaFallback(testo, setter);
    }
  };

  const copia = () => copiaStringa(testoDistinta(), setCopiato);

  const copiaFallback = (testo, setter) => {
    const ta = document.createElement("textarea");
    ta.value = testo;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try {
      document.execCommand("copy");
      setter(true); setTimeout(() => setter(false), 2000);
    } catch(e) {
      const w = window.open("", "_blank");
      if (w) { w.document.write("<pre>" + testo + "</pre>"); w.document.close(); }
    }
    document.body.removeChild(ta);
  };

  const scaricaDatasheet = () => setShowDs(ds => !ds);

  const dsLinks = righe
    .map(r => ({ cod: cleanCode(r.codice), label: r.label, url: DATASHEET[cleanCode(r.codice)] }))
    .filter(x => x.url);

  const dsCount = dsLinks.length;

  const copiaDs = () => {
    const testo = dsLinks.map(x => `${x.cod}  ${x.label}\n${x.url}`).join("\n\n");
    navigator.clipboard.writeText(testo).then(() => {
      setCopiatoDs(true);
      setTimeout(() => setCopiatoDs(false), 2000);
    });
  };

  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:1000, boxShadow:"0 -4px 24px rgba(0,0,0,0.18)" }}>

      {/* MODAL DATASHEET */}
      {showDs && dsLinks.length > 0 && (
        <div style={{ position:"absolute", bottom:"100%", right:0, width: isMobile ? "100vw" : 520, background:"white", border:"1px solid #c5d9de", borderRadius: isMobile ? 0 : "4px 4px 0 0", boxShadow:"0 -4px 20px rgba(0,0,0,0.15)", zIndex:10 }}>
          <div style={{ background:"#1B3A2D", color:"white", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>📄 Datasheet ({dsLinks.length})</span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={copiaDs} style={{ background:"#2E7D32", color:"white", border:"none", padding:"5px 10px", cursor:"pointer", fontSize:10, fontWeight:700, borderRadius:2 }}>
                {copiatoDs ? "✓ Copiato!" : "📋 Copia link"}
              </button>
              <button onClick={() => setShowDs(false)} style={{ background:"transparent", color:"#aaa", border:"1px solid #555", padding:"5px 8px", cursor:"pointer", fontSize:11, fontWeight:700, borderRadius:2 }}>✕</button>
            </div>
          </div>
          <div style={{ maxHeight: isMobile ? "50vh" : 280, overflowY:"auto", padding:"4px 0" }}>
            {dsLinks.map((x, i) => (
              <div key={i} style={{ padding:"9px 14px", borderBottom:"1px solid #f0f0f0", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:"'Courier New',monospace", fontSize:10, fontWeight:700, background:"#F0F7E6", border:"1px solid #A5D6A7", borderRadius:2, padding:"1px 6px", whiteSpace:"nowrap" }}>{x.cod}</span>
                <span style={{ fontSize:11, color:"#333", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{x.label}</span>
                <a href={x.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#1565C0", fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>PDF ↗</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:"#1B3A2D", color:"white", padding: isMobile ? "10px 12px" : "12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize: isMobile ? 12 : 14, fontWeight:800, letterSpacing:1, textTransform:"uppercase" }}>🛒</span>
          {!isMobile && <span style={{ fontSize:14, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>Carrello</span>}
          <span style={{ background:"#F39B00", color:"white", borderRadius:12, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{voci.length}</span>
        </div>
        <div style={{ display:"flex", gap: isMobile ? 5 : 8 }}>
          {voci.length > 0 && (<>
            {/* COPIA — pulsante split con dropdown */}
            <div style={{ position:"relative", display:"flex" }}>
              <button onClick={copia}
                style={{ background:"#2E7D32", color:"white", border:"none", borderRight:"1px solid #1B5E20", padding: isMobile ? "6px 10px" : "7px 14px", cursor:"pointer", fontSize: isMobile ? 10 : 11, fontWeight:700, borderRadius:"2px 0 0 2px" }}>
                {copiato ? "✓" : (isMobile ? "📋" : "📋 Copia distinta")}
              </button>
              <button onClick={() => setShowCopiaMenu(v => !v)}
                style={{ background:"#2E7D32", color:"white", border:"none", padding:"7px 8px", cursor:"pointer", fontSize:10, fontWeight:700, borderRadius:"0 2px 2px 0" }}
                title="Altre opzioni di copia">
                ▾
              </button>
              {showCopiaMenu && (
                <div style={{ position:"absolute", top:"100%", left:0, zIndex:200, background:"white", border:"1px solid #ddd", borderRadius:3, boxShadow:"0 4px 16px rgba(0,0,0,0.15)", minWidth:220, marginTop:2 }}
                  onMouseLeave={() => setShowCopiaMenu(false)}>
                  <div style={{ padding:"6px 12px", fontSize:9, fontWeight:700, color:"#888", letterSpacing:1.5, textTransform:"uppercase", borderBottom:"1px solid #f0f0f0" }}>
                    Opzioni di copia
                  </div>
                  {[
                    { label: "📋 Distinta completa",         fn: () => copiaStringa(testoDistinta(),         setCopiato),  desc: "Tutto: codici, qty, note" },
                    { label: "🔢 Solo codici (per config.)", fn: () => copiaStringa(testoCodiciPerConfig(), setCopiato),  desc: "Un codice per riga — incolla su colonna Excel" },
                    { label: "📊 Codici + quantità",         fn: () => copiaStringa(testoQuantita(),         setCopiato),  desc: "Codice TAB qty — una riga per codice univoco" },
                  ].map((item, i) => (
                    <button key={i} onClick={() => { item.fn(); setShowCopiaMenu(false); }}
                      style={{ display:"block", width:"100%", padding:"10px 14px", background:"none", border:"none", borderBottom: i<2?"1px solid #f5f5f5":"none", cursor:"pointer", textAlign:"left" }}
                      onMouseEnter={e => e.currentTarget.style.background="#f5f5f5"}
                      onMouseLeave={e => e.currentTarget.style.background="none"}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#282a31" }}>{item.label}</div>
                      <div style={{ fontSize:10, color:"#888", marginTop:1 }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {dsCount > 0 && (
              <button onClick={scaricaDatasheet} style={{ background:"#1565C0", color:"white", border:"none", padding: isMobile ? "6px 10px" : "7px 16px", cursor:"pointer", fontSize: isMobile ? 10 : 11, fontWeight:700, borderRadius:2 }}>
                {isMobile ? `📄 ${dsCount}` : `📄 Datasheet (${dsCount})`}
              </button>
            )}
            <button onClick={onSvuota} style={{ background:"transparent", color:"#ef9a9a", border:"1px solid #555", padding: isMobile ? "6px 8px" : "7px 12px", cursor:"pointer", fontSize: isMobile ? 10 : 11, fontWeight:700, borderRadius:2 }}>
              {isMobile ? "🗑" : "Svuota"}
            </button>
          </>)}
          <button onClick={onChiudi} style={{ background:"transparent", color:"#aaa", border:"1px solid #444", padding: isMobile ? "6px 8px" : "7px 12px", cursor:"pointer", fontSize: isMobile ? 10 : 11, fontWeight:700, borderRadius:2 }}>
            {voci.length === 0 ? "✕" : "▾"}
          </button>
        </div>
      </div>

      {/* CORPO */}
      <div style={{ background:"#F9F9F7", maxHeight: isMobile ? "60vh" : "50vh", overflowY:"auto", padding: voci.length ? (isMobile ? "12px" : "20px 28px") : (isMobile ? "12px" : "16px 28px") }}>
        {voci.length === 0 ? (
          <div style={{ color:"#666", fontSize:12, textAlign:"center", padding:"8px 0" }}>Nessuna configurazione. Completa una config e premi "+ Aggiungi al carrello".</div>
        ) : isMobile ? (
          /* MOBILE: stack verticale */
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Configurazioni ({voci.length})</div>
            {voci.map((v, i) => (
              <div key={v.id} style={{ background:"white", border:"1px solid #e0e0e0", borderLeft:"3px solid #1B5E20", padding:"10px 12px", marginBottom:8, borderRadius:2 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#282a31" }}>{i+1}. {v.label}</div>
                  <button onClick={() => onRimuovi(v.id)} style={{ background:"none", border:"none", color:"#bbb", cursor:"pointer", fontSize:15, padding:"0 0 0 8px" }}>✕</button>
                </div>
                {v.altezza && <div style={{ fontSize:10, color:"#666", marginBottom:6 }}>📐 {v.altezza}</div>}
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {v.righe.map((r, j) => { const cod=cleanCode(r.codice); if(!cod||cod==="—"||cod==="N/D") return null; return <CodicePill key={j} codice={r.codice} />; })}
                </div>
              </div>
            ))}
            <div style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", margin:"14px 0 8px" }}>Distinta riepilogativa</div>
            <div style={{ background:"white", border:"1px solid #e0e0e0", borderRadius:2, overflow:"hidden" }}>
              {righe.map((r, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderTop: i>0?"1px solid #f0f0f0":"none", background: i%2===0?"white":"#f8f8f8" }}>
                  <CodicePill codice={r.codice} />
                  <span style={{ fontSize:11, fontWeight:700, color:"#282a31" }}>×{r.qty}</span>
                  <span style={{ fontSize:11, color:"#555", flex:1 }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* DESKTOP: 2 colonne */
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Configurazioni ({voci.length})</div>
              {voci.map((v, i) => (
                <div key={v.id} style={{ background:"white", border:"1px solid #e0e0e0", borderLeft:"4px solid #1B5E20", padding:"10px 14px", marginBottom:8, borderRadius:2 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#282a31" }}>{i+1}. {v.label}</div>
                      {v.altezza && <div style={{ fontSize:11, color:"#666", marginTop:2 }}>📐 {v.altezza}</div>}
                      <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:4 }}>
                        {v.righe.map((r, j) => { const cod=cleanCode(r.codice); if(!cod||cod==="—"||cod==="N/D") return null; return <CodicePill key={j} codice={r.codice} />; })}
                      </div>
                    </div>
                    <button onClick={() => onRimuovi(v.id)} style={{ background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:16, padding:"0 4px" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Distinta riepilogativa</div>
              <div style={{ background:"white", border:"1px solid #e0e0e0", borderRadius:2, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"120px 40px 1fr", padding:"7px 14px", background:"#f5f5f5", fontSize:10, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase" }}>
                  <span>Codice</span><span style={{textAlign:"center"}}>Qty</span><span>Descrizione</span>
                </div>
                {righe.map((r, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"120px 40px 1fr", padding:"8px 14px", borderTop:"1px solid #f0f0f0", background: i%2===0?"white":"#f0f5f6" }}>
                    <span><CodicePill codice={r.codice} /></span>
                    <span style={{ textAlign:"center", fontSize:13, fontWeight:700 }}>×{r.qty}</span>
                    <span style={{ fontSize:12, color:"#555" }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}

// ─────────────────────────────────────────────────────────────────
// TROVA SISTEMA — ricerca inversa da vincoli di cantiere
// ─────────────────────────────────────────────────────────────────

const TUTTI_SISTEMI = Object.entries(DB).map(([key, s]) => ({ key, ...s }));

function punteggio(key, s, filtri) {
  const problemi = [];
  const rinunce  = [];

  // Altezza struttura pavimento
  if (filtri.altezza) {
    const h = parseInt(filtri.altezza);
    // Cerca altezza minima nel sistema
    let hMin = null;
    if (s.altezze) {
      const vals = Object.values(s.altezze).join(" ");
      const m = vals.match(/(\d+)/);
      if (m) hMin = parseInt(m[1]);
    }
    if (s.tipo === "gruppi" && s.gruppi) {
      s.gruppi.forEach(g => {
        if (g.altezze) {
          const vals = Object.values(g.altezze).join(" ");
          const m = vals.match(/(\d+)/);
          if (m && (hMin === null || parseInt(m[1]) < hMin)) hMin = parseInt(m[1]);
        }
        if (g.scatole_massetto) {
          g.scatole_massetto.forEach(sc => {
            const tot = sc.h_min + (key === "SEMINATO" ? Math.round(73 + 12.5) : 0);
            if (hMin === null || tot < hMin) hMin = tot;
          });
        }
      });
    }
    if (hMin !== null && h < hMin) {
      problemi.push({ campo: "Altezza struttura", motivo: `Altezza minima richiesta: ${hMin} mm (inserita: ${h} mm)` });
    }
  }

  // Pavimento (include seminato veneziano)
  if (filtri.pavimento && s.pavimenti) {
    if (filtri.pavimento === "seminato") {
      // Solo il sistema SEMINATO supporta il seminato veneziano
      if (key !== "SEMINATO") {
        problemi.push({ campo: "Pavimento", motivo: "Non compatibile con seminato veneziano" });
      }
    } else {
      // Se scelgo massetto o flottante, il sistema SEMINATO non è proponibile
      if (key === "SEMINATO") {
        problemi.push({ campo: "Pavimento", motivo: "Dedicato esclusivamente al seminato veneziano" });
      } else if (!s.pavimenti.includes(filtri.pavimento)) {
        problemi.push({ campo: "Pavimento", motivo: `Non compatibile con ${filtri.pavimento === "flottante" ? "pavimento flottante" : filtri.pavimento}` });
      }
    }
  }

  // Lavaggio
  if (filtri.lavaggio === "umido") {
    const ip = s.ip_chiuso ?? "";
    const ok = ip.includes("IP65") || ip.includes("IP66");
    if (!ok) rinunce.push({ campo: "Lavaggio", motivo: "Non idoneo a lavaggio umido/meccanizzato (IP < 65)" });
  }

  // Carico minimo — converte in kN se inserito in kg
  if (filtri.carico) {
    const valRaw = parseFloat(filtri.carico);
    const richKN = filtri.unitaCarico === "kg" ? valRaw / 100 : valRaw;
    const allKN = [...((s.carico ?? "").matchAll(/([\d.]+)\s*kN/g))].map(x => parseFloat(x[1]));
    const maxDisp = allKN.length ? Math.max(...allKN) : null;
    if (maxDisp !== null && richKN > maxDisp) {
      const dispLabel = filtri.unitaCarico === "kg" ? `${maxDisp * 100} kg` : `${maxDisp} kN`;
      const richLabel = filtri.unitaCarico === "kg" ? `${valRaw} kg` : `${valRaw} kN`;
      problemi.push({ campo: "Carico", motivo: `Max disponibile: ${dispLabel} (richiesto: ${richLabel})` });
    }
  }

  // Forma
  if (filtri.forma && filtri.forma !== "indifferente") {
    const f = (s.forma ?? "").toLowerCase();
    if (!f.includes(filtri.forma)) {
      rinunce.push({ campo: "Forma", motivo: `Disponibile in: ${s.forma}` });
    }
  }

  // Rivestimento
  if (filtri.rivestimento) {
    const riv = parseInt(filtri.rivestimento);
    const rv = s.rivestimento_max ?? "";
    if (rv === "Non rivestibile" && riv > 0) {
      problemi.push({ campo: "Rivestimento", motivo: `Non rivestibile (richiesto: ${riv} mm)` });
    } else {
      const m = rv.match(/(\d+)/g);
      const maxRiv = m ? Math.max(...m.map(Number)) : null;
      if (maxRiv !== null && riv > maxRiv) {
        problemi.push({ campo: "Rivestimento", motivo: `Rivestimento max: ${maxRiv} mm (richiesto: ${riv} mm)` });
      }
    }
  }

  // Prese — legge la capacità reale dai box del sistema
  if (filtri.moduli || filtri.tipoPrese) {
    const rich = filtri.moduli ? parseInt(filtri.moduli) : 0;

    // Raccoglie tutti i box disponibili nel sistema (fissi + liberi, in tutti i gruppi)
    const tuttiBox = [];
    const aggiungiBox = (b) => { if (b) tuttiBox.push(b); };

    if (s.box) s.box.forEach(aggiungiBox);
    if (s.box_fisso_globale) aggiungiBox(s.box_fisso_globale);
    if (s.tipo === "gruppi" && s.gruppi) {
      s.gruppi.forEach(g => {
        if (g.box) g.box.forEach(aggiungiBox);
        if (g.box_fisso) aggiungiBox(g.box_fisso);
      });
    }

    // Capacità da descrizione box: legge il numero dal desc/tipo
    // es. "14 dispositivi standard Italia" → {ita:14}, "12 moduli Modul45" → {m45:12}
    const capacita = { m45: 0, ita: 0 };
    tuttiBox.forEach(b => {
      const d = ((b.desc ?? "") + " " + (b.tipo ?? "")).toLowerCase();
      // Modul45
      const mM = d.match(/(\d+)\s*modul/);
      if (mM) capacita.m45 = Math.max(capacita.m45, parseInt(mM[1]));
      // Standard Italia
      const mI = d.match(/(\d+)\s*(?:dispositiv|prese?\s*standard|ita\b)/);
      if (mI) capacita.ita = Math.max(capacita.ita, parseInt(mI[1]));
    });

    // Aggiunta speciale: UDHOME-ONE e UDHOME2 hanno 1-2 Modul45 fissi (no box libero)
    if (key === "UDHOME_ONE") { capacita.m45 = Math.max(capacita.m45, 2); capacita.ita = 0; }
    if (key === "UDHOME2")    { capacita.m45 = Math.max(capacita.m45, 2); capacita.ita = 0; }

    if (filtri.tipoPrese === "ita") {
      if (capacita.ita === 0) {
        problemi.push({ campo: "Tipo prese", motivo: "Non compatibile con standard Italia" });
      } else if (rich > 0 && rich > capacita.ita) {
        problemi.push({ campo: "N. prese", motivo: `Max standard Italia: ${capacita.ita} (richieste: ${rich})` });
      }
    } else if (filtri.tipoPrese === "modul45") {
      if (capacita.m45 === 0) {
        problemi.push({ campo: "Tipo prese", motivo: "Non compatibile con Modul45®" });
      } else if (rich > 0 && rich > capacita.m45) {
        problemi.push({ campo: "N. prese", motivo: `Max Modul45®: ${capacita.m45} (richieste: ${rich})` });
      }
    } else if (rich > 0) {
      // Nessun tipo specificato: usa il massimo tra i due
      const maxDisp = Math.max(capacita.m45, capacita.ita);
      if (maxDisp > 0 && rich > maxDisp) {
        problemi.push({ campo: "N. prese", motivo: `Max dispositivi disponibili: ${maxDisp} (richieste: ${rich})` });
      }
    }
  }

  return { key, label: s.label, famiglia: s.famiglia, problemi, rinunce };
}

function FiltraSistema({ onSeleziona, filtri, setFiltri, risultati, setRisultati, mostraRinunce, setMostraRinunce }) {

  const set = (k, v) => setFiltri(prev => ({ ...prev, [k]: v }));
  const hasFiltri = Object.values(filtri).some(v => v !== "");

  const cerca = () => {
    const res = TUTTI_SISTEMI.map(({ key, ...s }) => punteggio(key, s, filtri));

    const ok       = res.filter(r => r.problemi.length === 0 && r.rinunce.length === 0);
    const parziali = res.filter(r => r.problemi.length === 0 && r.rinunce.length > 0);
    const ko       = res.filter(r => r.problemi.length > 0);

    setRisultati({ ok, parziali, ko });
    setMostraRinunce(ok.length === 0);
  };

  const reset = () => { setFiltri({ altezza:"", pavimento:"", lavaggio:"", carico:"", unitaCarico:"kN", forma:"", rivestimento:"", moduli:"", tipoPrese:"" }); setRisultati(null); setMostraRinunce(false); };

  const colFam = (fam) => { const f = FAMIGLIE.find(x => x.id === fam || x.sistemi.some(s => DB[s]?.famiglia === fam)); return f?.colore ?? "#7694a4"; };

  const CardRisultato = ({ r, tipo }) => {
    const colore = colFam(r.famiglia);
    const bg = tipo === "ok" ? "#F0FFF4" : tipo === "parziale" ? "#FFFDE7" : "#FFF0F0";
    const border = tipo === "ok" ? "#A5D6A7" : tipo === "parziale" ? "#FFE082" : "#FFCDD2";
    const fam = FAMIGLIE.find(f => f.sistemi.includes(r.key));
    return (
      <div style={{ background: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${colore}`, borderRadius: 3, padding: "14px 16px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#282a31" }}>{r.label}</span>
              <span style={{ fontSize: 10, background: `${colore}22`, color: colore, border: `1px solid ${colore}44`, borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>{r.famiglia}</span>
              {tipo === "ok"      && <span style={{ fontSize: 10, color: "#2E7D32", fontWeight: 700 }}>✓ Compatibile</span>}
              {tipo === "parziale"&& <span style={{ fontSize: 10, color: "#F57F17", fontWeight: 700 }}>⚠ Compatibile con rinunce</span>}
            </div>
            <Caratteristiche chiavi={[r.key]} stile={{ margin: "6px 0 4px" }} />
            {tipo !== "ok" && r.rinunce.map((rn, i) => (
              <div key={i} style={{ fontSize: 11, color: "#7A4F00", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 2, padding: "3px 8px", marginTop: 4, display: "inline-block", marginRight: 4 }}>
                ⚠ {rn.campo}: {rn.motivo}
              </div>
            ))}
            {r.problemi.map((p, i) => (
              <div key={i} style={{ fontSize: 11, color: "#8B0000", background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 2, padding: "3px 8px", marginTop: 4, display: "inline-block", marginRight: 4 }}>
                ✕ {p.campo}: {p.motivo}
              </div>
            ))}
          </div>
          {(tipo === "ok" || tipo === "parziale") && (
            <button onClick={() => onSeleziona(r.key)}
              style={{ background: colore, color: "white", border: "none", padding: "8px 16px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderRadius: 2, flexShrink: 0, whiteSpace: "nowrap" }}>
              Configura →
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 60px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: "#F39B00", fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>🔍 Trova sistema</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: "#282a31", margin: "0 0 6px" }}>Ricerca per vincoli di cantiere</h2>
        <p style={{ color: "#555", fontSize: 14, margin: 0 }}>Inserisci i requisiti del tuo progetto. Lascia vuoto ciò che è indifferente.</p>
      </div>

      {/* GRIGLIA FILTRI */}
      <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: 3, padding: "24px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>

          {/* Altezza struttura */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Altezza struttura pavimento (mm)</label>
            <input type="number" min="0" placeholder="es. 120"
              value={filtri.altezza} onChange={e => set("altezza", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "2px solid #ddd", borderRadius: 2, fontSize: 13, outline: "none", boxSizing: "border-box", borderColor: filtri.altezza ? "#F39B00" : "#c5d9de" }} />
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Dal piano grezzo al piano finito</div>
          </div>

          {/* Tipo pavimento */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Tipo di pavimento</label>
            <select value={filtri.pavimento} onChange={e => set("pavimento", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `2px solid ${filtri.pavimento ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", background: "white" }}>
              <option value="">Indifferente</option>
              <option value="massetto">Massetto</option>
              <option value="flottante">Flottante</option>
              <option value="seminato">Seminato veneziano</option>
            </select>
          </div>

          {/* Lavaggio */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Tipo di lavaggio</label>
            <select value={filtri.lavaggio} onChange={e => set("lavaggio", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `2px solid ${filtri.lavaggio ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", background: "white" }}>
              <option value="">Indifferente</option>
              <option value="secco">Secco</option>
              <option value="umido">Umido / meccanizzato (IP65+)</option>
            </select>
          </div>

          {/* Carico */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Carico minimo richiesto</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" min="0" placeholder={filtri.unitaCarico === "kg" ? "es. 500" : "es. 5"}
                value={filtri.carico} onChange={e => set("carico", e.target.value)}
                style={{ flex: 1, padding: "9px 12px", border: `2px solid ${filtri.carico ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <select value={filtri.unitaCarico} onChange={e => set("unitaCarico", e.target.value)}
                style={{ width: 64, padding: "9px 6px", border: `2px solid ${filtri.carico ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", background: "white", cursor: "pointer", textAlign: "center" }}>
                <option value="kN">kN</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          {/* Forma */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Forma preferita</label>
            <select value={filtri.forma} onChange={e => set("forma", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `2px solid ${filtri.forma ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", background: "white" }}>
              <option value="">Indifferente</option>
              <option value="quadrata">Quadrata</option>
              <option value="rotonda">Rotonda</option>
            </select>
          </div>

          {/* Rivestimento */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Spessore rivestimento (mm)</label>
            <input type="number" min="0" placeholder="es. 10"
              value={filtri.rivestimento} onChange={e => set("rivestimento", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `2px solid ${filtri.rivestimento ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Spessore della finitura pavimento</div>
          </div>

          {/* Tipo prese */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Tipo prese richieste</label>
            <select value={filtri.tipoPrese} onChange={e => set("tipoPrese", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `2px solid ${filtri.tipoPrese ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", background: "white" }}>
              <option value="">Indifferente</option>
              <option value="modul45">Modul45®</option>
              <option value="ita">Standard italiano (BTicino, Vimar, ecc.)</option>
            </select>
          </div>

          {/* N. prese */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>N. prese richieste</label>
            <input type="number" min="1" placeholder="es. 6"
              value={filtri.moduli} onChange={e => set("moduli", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `2px solid ${filtri.moduli ? "#F39B00" : "#c5d9de"}`, borderRadius: 2, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Modul45® o standard Italia in base alla scelta sopra</div>
          </div>

          {/* Seminato — campo rimosso dal pannello, gestito dal select pavimento */}

        </div>

        {/* BOTTONI */}
        <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center" }}>
          <button onClick={cerca} disabled={!hasFiltri}
            style={{ background: hasFiltri ? "#F39B00" : "#ccc", color: "white", border: "none", padding: "12px 32px", cursor: hasFiltri ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderRadius: 2 }}>
            🔍 Cerca sistemi compatibili
          </button>
          {hasFiltri && (
            <button onClick={reset} style={{ background: "transparent", border: "1px solid #ddd", color: "#666", padding: "12px 20px", cursor: "pointer", fontSize: 12, borderRadius: 2 }}>
              ✕ Azzera filtri
            </button>
          )}
        </div>
      </div>

      {/* RISULTATI */}
      {risultati && (
        <div>
          {/* Compatibili */}
          {risultati.ok.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2E7D32", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                ✓ Sistemi completamente compatibili ({risultati.ok.length})
              </div>
              {risultati.ok.map(r => <CardRisultato key={r.key} r={r} tipo="ok" />)}
            </div>
          )}

          {/* Parziali — mostrati sempre se non ci sono ok, o su richiesta */}
          {risultati.parziali.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F57F17", letterSpacing: 2, textTransform: "uppercase" }}>
                  ⚠ Compatibili con qualche rinuncia ({risultati.parziali.length})
                </div>
                {risultati.ok.length > 0 && (
                  <button onClick={() => setMostraRinunce(v => !v)}
                    style={{ background: "none", border: "1px solid #FFE082", color: "#F57F17", padding: "3px 10px", cursor: "pointer", fontSize: 11, borderRadius: 2 }}>
                    {mostraRinunce ? "Nascondi" : "Mostra"}
                  </button>
                )}
              </div>
              {(mostraRinunce || risultati.ok.length === 0) &&
                risultati.parziali.map(r => <CardRisultato key={r.key} r={r} tipo="parziale" />)
              }
            </div>
          )}

          {/* Nessun risultato */}
          {risultati.ok.length === 0 && risultati.parziali.length === 0 && (
            <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 3, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#8B0000", marginBottom: 8 }}>Nessun sistema compatibile</div>
              <div style={{ fontSize: 13, color: "#c0392b" }}>Prova a rilassare uno o più vincoli (es. carico, rivestimento o altezza) per trovare soluzioni alternative.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



// OBO Hub: il carrello arriva dal progetto (carrelloIniziale) e a ogni modifica viene passato alla pagina (onCarrello),
// che lo salva nel progetto unico e nel browser.
export default function Configuratore({ carrelloIniziale = [], onCarrello } = {}) {
  const [step, setStep] = useState(1);
  const [famiglia, setFamiglia] = useState(null);
  const [sistema, setSistema] = useState(null);
  const [carrello, setCarrello] = useState(carrelloIniziale);
  useEffect(() => { if (onCarrello) onCarrello(carrello); }, [carrello]);
  const [carrelloAperto, setCarrelloAperto] = useState(false);
  const [modalita, setModalita] = useState("wizard");
  const { isMobile, isTablet } = useM();

  const [filtri, setFiltri] = useState({
    altezza: "", pavimento: "", lavaggio: "", carico: "", unitaCarico: "kN",
    forma: "", rivestimento: "", moduli: "", tipoPrese: ""
  });
  const [risultatiTrova, setRisultatiTrova] = useState(null);
  const [mostraRinunceTrova, setMostraRinunceTrova] = useState(false);

  const reset = () => { setStep(1); setFamiglia(null); setSistema(null); };

  const vaiASistema = (key) => {
    const fam = getFamiglia(key);
    if (!fam) return;
    setFamiglia(fam.id);
    setSistema(key);
    setStep(3);
    setModalita("wizard");
  };

  const addToCart = (righe, label, altezza) => {
    const id = Date.now();
    setCarrello(prev => [...prev, { id, label, righe, altezza }]);
    setCarrelloAperto(true);
  };

  const removeFromCart = (id) => setCarrello(prev => prev.filter(v => v.id !== id));
  const famAttiva = FAMIGLIE.find(f => f.sistemi.includes(sistema));

  return (
    <div className="ufs-radice" style={{ fontFamily: "var(--font, Helvetica, Arial, sans-serif)", background: "var(--sfondo, #fff)" }}>

      {/* BARRA (stile OBO Hub: schede chiare con pillole arancio; il titolo è nella fascia della pagina) */}
      <div className="ufs-barra" style={{ background: "var(--carta, #fff)", borderBottom: "1px solid var(--bordo, #dee2e6)", position: "sticky", top: 56, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "8px 12px" : "10px 28px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div role="tablist" style={{ display: "flex", gap: 6 }}>
            {[["wizard", "Configura"], ["trova", "Trova dai requisiti"]].map(([k, t]) => (
              <button key={k} role="tab" aria-selected={modalita === k} onClick={() => setModalita(k)}
                style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${modalita === k ? "#F39B00" : "var(--bordo, #dee2e6)"}`, background: modalita === k ? "#F39B00" : "var(--carta, #fff)", color: modalita === k ? "#fff" : "var(--testo, #212529)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {t}
              </button>
            ))}
          </div>
          {famAttiva && !isMobile && (
            <span style={{ border: `1px solid ${famAttiva.colore}55`, color: famAttiva.colore, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{famAttiva.label}</span>
          )}
          <span style={{ flex: 1 }} />
          {modalita === "wizard" && step > 1 && (
            <button onClick={reset} title="Ricomincia" style={{ padding: "7px 12px", borderRadius: 999, border: "1px solid var(--bordo, #dee2e6)", background: "var(--carta, #fff)", color: "var(--testo, #212529)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>↺ Ricomincia</button>
          )}
          <button onClick={() => setCarrelloAperto(v => !v)}
            style={{ padding: "7px 14px", borderRadius: 999, border: "1px solid #F39B00", background: carrello.length > 0 ? "#F39B00" : "var(--carta, #fff)", color: carrello.length > 0 ? "#fff" : "#d98a00", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            Carrello{carrello.length > 0 && <span style={{ background: "#fff", color: "#d98a00", borderRadius: 999, padding: "0 7px", fontSize: 12 }}>{carrello.length}</span>}
          </button>
        </div>
        {modalita === "wizard" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0 12px" : "0 28px", display: "flex", alignItems: "center", gap: 4 }}>
            {["Famiglia", "Modello", "Configurazione"].map((label, i) => {
              const active = step === i + 1, done = step > i + 1;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ padding: "8px 8px 7px", display: "flex", alignItems: "center", gap: 6, borderBottom: active ? "3px solid #F39B00" : "3px solid transparent", cursor: done ? "pointer" : "default" }}
                    onClick={() => { if (done && i === 0) { setStep(1); setFamiglia(null); setSistema(null); } else if (done && i === 1) { setStep(2); setSistema(null); } }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#1d7a45" : active ? "#F39B00" : "var(--bordo, #dee2e6)", color: done || active ? "#fff" : "var(--tenue, #6c757d)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{done ? "✓" : i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? "var(--testo, #212529)" : "var(--tenue, #6c757d)" }}>{label}</span>
                  </div>
                  {i < 2 && <span style={{ color: "var(--tenue, #6c757d)", margin: "0 2px" }}>›</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTENUTO */}
      {modalita === "trova" ? (
        <FiltraSistema onSeleziona={vaiASistema} filtri={filtri} setFiltri={setFiltri} risultati={risultatiTrova} setRisultati={setRisultatiTrova} mostraRinunce={mostraRinunceTrova} setMostraRinunce={setMostraRinunceTrova} />
      ) : (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 12px 140px" : isTablet ? "24px 20px 130px" : "32px 28px 120px" }}>
        {step === 1 && <StepFamiglia onSelect={f => { setFamiglia(f); setStep(2); }} />}
        {step === 2 && <StepSistema famigliaId={famiglia} onSelect={s => { setSistema(s); setStep(3); }} onBack={() => setStep(1)} />}
        {step === 3 && <StepRiga sistemaKey={sistema} onBack={() => setStep(2)} onReset={reset} onAddToCart={addToCart} />}
      </div>
      )}

      {/* CARRELLO — pannello fisso in fondo */}
      {carrelloAperto && (
        <Carrello
          voci={carrello}
          onRimuovi={removeFromCart}
          onSvuota={() => setCarrello([])}
          onChiudi={() => setCarrelloAperto(false)}
        />
      )}
    </div>
  );
}
