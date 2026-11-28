/*
 * Icone di Torrette: un solo disegno per ogni concetto, uguale in tutta l'app (guida, catalogo, configurazione,
 * carrello, schede). Linee sottili 24×24 con angoli arrotondati, disegnate da noi. Al posto delle emoji.
 */
import React from "react";

export const PERCORSI = {
  massetto: <><rect x="3" y="6.5" width="18" height="3" rx=".6" /><path d="M3 9.5h18v4.5H3z" /><path d="M3 14h18v4.5H3z" /><path d="M6 18.5l4-4.5M11 18.5l4-4.5M16 18.5l4-4.5" /></>,
  flottante: <><rect x="3" y="6" width="18" height="3" rx=".6" /><path d="M12 6v3" /><path d="M7 9v7.5M17 9v7.5M5.5 16.5h3M15.5 16.5h3" /><path d="M3 19h18" /></>,
  seminato: <><rect x="3" y="6.5" width="18" height="12" rx="1" /><circle cx="7.5" cy="10.5" r=".9" /><circle cx="12.5" cy="9.5" r=".7" /><circle cx="16.5" cy="12" r="1" /><circle cx="9.5" cy="14.5" r=".8" /><circle cx="14" cy="15.5" r=".7" /><circle cx="6.5" cy="15.5" r=".6" /></>,
  quadrata: <rect x="5" y="5" width="14" height="14" rx="2" />,
  rotonda: <circle cx="12" cy="12" r="7.5" />,
  forma: <><rect x="3.5" y="7" width="9" height="9" rx="1.5" /><circle cx="16" cy="11.5" r="4.5" /></>,
  ip: <><path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z" /><path d="M9.5 12.5c0-1.6 1.1-3.2 2.5-4.6 1.4 1.4 2.5 3 2.5 4.6a2.5 2.5 0 01-5 0z" /></>,
  carico: <><path d="M8.5 7a3.5 3.5 0 017 0" /><path d="M6 9h12l2 11H4z" /></>,
  pavimento: <><path d="M3 15l9-5 9 5-9 5z" /><path d="M3 15v2.5l9 5 9-5V15" /></>,
  rivestimento: <><rect x="3" y="13" width="18" height="7" rx="1" /><path d="M3 9h18M7 5v4M12 5v4M17 5v4" /></>,
  altezza: <><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /><path d="M3 21h18" /></>,
  acustica: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></>,
  documento: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  foto: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  galleria: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  consiglio: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" /></>,
  configura: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  cerca: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  modifica: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  carrello: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.2a2 2 0 002 1.6h8.2a2 2 0 002-1.5L21.5 8H6" /></>,
  ricomincia: <><path d="M4 12a8 8 0 108-8 8.5 8.5 0 00-6 2.5L4 8" /><path d="M4 4v4h4" /></>,
  avviso: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
  ok: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chiudi: <path d="M6 6l12 12M18 6L6 18" />,
  energia: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  presa: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><path d="M12 7.5v2M12 14.5v2" /></>,
  dati: <><rect x="5" y="6" width="14" height="12" rx="1.5" /><path d="M9 18v-4h6v4M10 10h4" /></>,
  usb: <><path d="M12 3v13M9.5 5.5L12 3l2.5 2.5M8 10v2l4 2.5M16 8.5v3l-4 2.5" /><circle cx="12" cy="18.5" r="2" /></>,
  hdmi: <><path d="M4 8h16v5l-3 3H7l-3-3z" /><path d="M8 11.5h8" /></>,
  antenna: <><path d="M12 12v9M8.5 21h7" /><path d="M8.5 8.5a5 5 0 017 0M6 6a8.5 8.5 0 0112 0" /><circle cx="12" cy="11" r="1" /></>,
  cieco: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  ufficio: <><path d="M4 21V5l8-2v18M12 7h8v14" /><path d="M7 8h2M7 12h2M7 16h2M15 11h2M15 15h2" /></>,
  livella: <><rect x="3" y="9" width="18" height="6" rx="3" /><circle cx="12" cy="12" r="1.6" /><path d="M9 9v6M15 9v6" /></>,
  telaio: <><rect x="4" y="4" width="16" height="16" rx="1" /><rect x="8" y="8" width="8" height="8" /></>,
  disaccoppiata: <><rect x="4" y="5" width="16" height="5" rx="1" /><rect x="6" y="13" width="12" height="6" rx="1" /><path d="M9 10v3M15 10v3" /></>,
  scatola: <><path d="M3 8l9-4 9 4-9 4z" /><path d="M3 8v8l9 4 9-4V8M12 12v8" /></>,
  persone: <><circle cx="9" cy="7" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 018 14h2a4.5 4.5 0 014.5 4.5V20" /><circle cx="17" cy="8.5" r="2.4" /><path d="M16 14h1a4 4 0 014 4v2" /></>,
  trasporto: <><path d="M4 4h2.5l2 11h10" /><rect x="9.5" y="6.5" width="9.5" height="6.5" rx="1" /><circle cx="10" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></>,
  veicolo: <><path d="M3 16v-3.5l2-1 2.2-4.5h9.6l2.2 4.5 2 1V16z" /><circle cx="7.5" cy="16.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /><path d="M7 11.5h10" /></>,
  secco: <><path d="M14.5 3.5L11 11" /><path d="M7 12h8l2 9H5z" /><path d="M9 15.5v3M12 15.5v3" /></>,
  umido: <><path d="M12 3.5c-3.5 4.5-5.5 7.6-5.5 10.5a5.5 5.5 0 0011 0c0-2.9-2-6-5.5-10.5z" /><path d="M9.5 14.5a2.5 2.5 0 002.5 2.5" /></>,
  indifferente: <><rect x="3.5" y="7" width="9" height="9" rx="1.5" /><circle cx="16" cy="11.5" r="4.5" strokeDasharray="2 2" /></>,
};

export function Icona({ nome, size = 18, colore = "currentColor", spessore = 1.75, stile, titolo }) {
  const p = PERCORSI[nome];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth={spessore} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={titolo ? undefined : "true"} role={titolo ? "img" : undefined} style={{ flex: "none", ...(stile || {}) }}>
      {titolo && <title>{titolo}</title>}{p}
    </svg>
  );
}

/* Sezione dell'uscita dei cavi: pavimento, coperchio e cavo. Stessi colori e linee per tutte le uscite. */
const PAV = "#c5d9de", COP = "#41525d", CAVO = "#f39b00";
export function FiguraUscita({ tipo, size = 120 }) {
  const t = String(tipo || "");
  const cieca = /ciec/.test(t), tubo = /tubo/.test(t), spazzola = /angel|spazzol/.test(t);
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 120 66" aria-hidden="true" style={{ display: "block" }}>
      <rect x="0" y="40" width="120" height="26" fill={PAV} opacity=".55" />
      <path d="M0 40h120" stroke={COP} strokeWidth="1.2" opacity=".4" />
      <rect x="28" y="40" width="64" height="18" fill="#fff" stroke={COP} strokeWidth="1.2" opacity=".9" />
      <rect x="26" y="36.5" width="68" height="4" rx="1" fill={COP} />
      {cieca && <path d="M52 38.5h16" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />}
      {!cieca && !tubo && !spazzola && <>
        <rect x="80" y="31" width="13" height="6" rx="1.5" fill={COP} />
        <path d="M60 52c10 0 14-4 18-12 2-4 6-6 12-6h30" stroke={CAVO} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>}
      {tubo && <>
        <rect x="53" y="12" width="14" height="25" rx="2" fill="#fff" stroke={COP} strokeWidth="1.6" />
        <path d="M53 19h14M53 27h14" stroke={COP} strokeWidth="1" opacity=".5" />
        <path d="M60 52V8c0-3 2-5 6-5h20" stroke={CAVO} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>}
      {spazzola && <>
        <path d="M70 37V31M73 37V30M76 37V31M79 37V30M82 37V31" stroke={COP} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M60 52c8 0 12-5 15-14 2-5 7-7 13-7h32" stroke={CAVO} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>}
    </svg>
  );
}

export const DESCR_USCITA = (t) => {
  t = String(t || "");
  if (/ciec/.test(t)) return "Coperchio chiuso senza uscita: pozzetto di ispezione o prese usate raramente.";
  if (/tubo/.test(t)) return "I cavi escono dall'alto di un tubo che si alza: tenuta anche con le spine inserite, per la pulizia a umido (IP65/IP66).";
  if (/angel|spazzol/.test(t)) return "I cavi passano tra le setole di una spazzola ruotabile: coperchio chiuso anche in uso.";
  if (/vt2/.test(t)) return "Uscita laterale con sportellino VT2: i cavi escono di lato a coperchio chiuso.";
  return "I cavi escono di lato da una fessura: a coperchio chiuso la torretta resta a filo del pavimento (pulizia a secco).";
};
