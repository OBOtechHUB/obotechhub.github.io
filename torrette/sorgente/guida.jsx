// Guida «Trova la torretta giusta»: una domanda per schermata, con un disegno che spiega che cosa si chiede.
// I disegni sono fatti qui (SVG), con i colori del tema; le risposte diventano i filtri di `punteggio()`.
import React, { useMemo, useEffect, useRef } from "react";

// ───────────────────────── disegni ─────────────────────────
const C = { soletta: "var(--g-soletta)", massetto: "var(--g-massetto)", finito: "var(--g-finito)", metallo: "var(--g-metallo)", linea: "var(--g-linea)", quota: "var(--arancio)", vuoto: "var(--g-vuoto)", testo: "var(--testo)" };
const Tratteggio = ({ id }) => (
  <defs>
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke={C.linea} strokeWidth="1.2" opacity=".45" /></pattern>
    <pattern id={id + "p"} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.3" fill={C.linea} opacity=".35" /><circle cx="10" cy="10" r="1" fill={C.linea} opacity=".35" /></pattern>
    <pattern id={id + "s"} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.2" fill="#b5651d" opacity=".7" /><circle cx="11" cy="6" r="1.6" fill="#41525d" opacity=".7" /><circle cx="6" cy="12" r="1.9" fill="#f39b00" opacity=".7" /><circle cx="13" cy="13" r="1.2" fill="#7694a4" /></pattern>
  </defs>
);
const Etichetta = ({ x, y, children, fine }) => <text x={x} y={y} fontSize="15" fill={C.testo} textAnchor={fine ? "end" : "start"} fontWeight="600">{children}</text>;
const Richiamo = ({ y, children }) => <g><line x1="296" y1={y} x2="312" y2={y} stroke={C.linea} strokeWidth="1.2" /><circle cx="296" cy={y} r="2.2" fill={C.linea} /><Etichetta x={316} y={y + 5}>{children}</Etichetta></g>;
const Quota = ({ x, y1, y2, testo, sinistra }) => (
  <g stroke={C.quota} strokeWidth="1.6" fill="none">
    <line x1={x} y1={y1} x2={x} y2={y2} /><path d={`M${x - 4} ${y1 + 6}L${x} ${y1}L${x + 4} ${y1 + 6}M${x - 4} ${y2 - 6}L${x} ${y2}L${x + 4} ${y2 - 6}`} />
    <line x1={x - 9} y1={y1} x2={x + 9} y2={y1} /><line x1={x - 9} y1={y2} x2={x + 9} y2={y2} />
    {testo && <text x={sinistra ? x - 12 : x + 12} y={(y1 + y2) / 2 + 4} textAnchor={sinistra ? "end" : "start"} fontSize="16" fontWeight="700" fill={C.quota} stroke="none">{testo}</text>}
  </g>
);

/** Sezione del pavimento con la torretta dentro. tipo: massetto | flottante | seminato */
export function DisegnoPavimento({ tipo, h, compatto }) {
  const id = "tr" + tipo, top = 34, base = 132, W = 300;
  const flott = tipo === "flottante", sem = tipo === "seminato";
  return (
    <svg viewBox={compatto ? `0 0 ${W} 170` : `-92 0 ${W + 262} 170`} role="img" aria-label={flott ? "Sezione di un pavimento flottante: pannelli su piedini con il vuoto sotto" : sem ? "Sezione di un pavimento seminato colato sul massetto" : "Sezione di un pavimento con massetto"}>
      <Tratteggio id={id} />
      <rect x="0" y={base} width={W} height="38" fill={C.soletta} /><rect x="0" y={base} width={W} height="38" fill={`url(#${id})`} />
      {flott ? (
        <g>
          <rect x="0" y={top + 12} width={W} height={base - top - 12} fill={C.vuoto} />
          {[18, 96, 204, 282].map((x) => <g key={x}><rect x={x - 3} y={top + 12} width="6" height={base - top - 12} fill={C.metallo} /><rect x={x - 11} y={base - 5} width="22" height="5" fill={C.metallo} /><rect x={x - 9} y={top + 12} width="18" height="4" fill={C.metallo} /></g>)}
          <rect x="0" y={top} width={W} height="12" fill={C.massetto} stroke={C.linea} strokeWidth=".8" />
          {[96, 204].map((x) => <line key={x} x1={x} y1={top} x2={x} y2={top + 12} stroke={C.linea} strokeWidth=".8" />)}
        </g>
      ) : (
        <g><rect x="0" y={top + 6} width={W} height={base - top - 6} fill={C.massetto} /><rect x="0" y={top + 6} width={W} height={base - top - 6} fill={`url(#${id}p)`} /></g>
      )}
      <rect x="0" y={top - 6} width={W} height={flott ? 6 : 12} fill={sem ? C.massetto : C.finito} />{sem && <rect x="0" y={top - 6} width={W} height="12" fill={`url(#${id}s)`} />}
      {/* torretta */}
      <rect x="112" y={top - 6} width="76" height={flott ? 62 : 70} rx="3" fill="var(--carta)" stroke={C.metallo} strokeWidth="2.2" />
      <rect x="108" y={top - 8} width="84" height="7" rx="2" fill={C.metallo} />
      {[126, 146, 166].map((x) => <rect key={x} x={x} y={top + 14} width="12" height="20" rx="2" fill={C.quota} opacity=".85" />)}
      <path d={flott ? `M188 ${top + 44} H250 V${base - 8}` : `M188 ${top + 52} H300`} stroke={C.quota} strokeWidth="3" fill="none" strokeDasharray="1 0" opacity=".9" />
      {!compatto && <Quota x={-18} y1={top - 6} y2={base} testo={h ? `${h} mm` : "H"} sinistra />}
      {!compatto && <g><Richiamo y={top - 3}>{sem ? "seminato" : "pavimento finito"}</Richiamo><Richiamo y={(top + base) / 2 + 14}>{flott ? "vuoto per i cavi" : "massetto"}</Richiamo><Richiamo y={base + 18}>solaio grezzo</Richiamo></g>}
    </svg>
  );
}

/** Coperchio con il recesso riempito dal rivestimento. */
export function DisegnoRivestimento({ mm }) {
  const s = mm == null || mm === "" ? null : Number(mm), sp = s == null ? 16 : Math.max(0, Math.min(34, s * 1.3));
  return (
    <svg viewBox="0 0 400 150" role="img" aria-label="Particolare del coperchio della torretta con il rivestimento del pavimento dentro il recesso">
      <Tratteggio id="trr" />
      <rect x="0" y="74" width="300" height="76" fill={C.massetto} /><rect x="0" y="74" width="300" height="76" fill="url(#trrp)" />
      <rect x="0" y={74 - sp} width="88" height={sp} fill={C.finito} /><rect x="212" y={74 - sp} width="88" height={sp} fill={C.finito} />
      <rect x="92" y="74" width="116" height="60" rx="3" fill="var(--carta)" stroke={C.metallo} strokeWidth="2" />
      <path d={`M90 ${74 - sp} V78 H210 V${74 - sp}`} fill="none" stroke={C.metallo} strokeWidth="3.5" />
      {sp > 0 && <rect x="94" y={74 - sp} width="112" height={sp} fill={C.finito} />}
      {s === 0 && <rect x="90" y="70" width="120" height="6" rx="2" fill={C.metallo} />}
      {sp > 0 && <Quota x={318} y1={74 - sp} y2={74} testo={s == null ? "spessore" : `${s} mm`} />}
      <Etichetta x={150 - 44} y={74 - sp - 8}>{s === 0 ? "coperchio a vista" : "stesso rivestimento"}</Etichetta>
    </svg>
  );
}

/** Coperchio aperto visto dall'alto con le prese richieste. */
// Modul45: frutti quadrati 45 × 45 nella scatola OBO. Standard Italia: supporti come le scatole 504 (4 moduli) e 506
// (6 o 7 moduli secondo la serie civile) con moduli stretti 22,5 × 45; la torretta ne porta 1 da 504 oppure 2 da 506.
export function DisegnoPrese({ n, tipo }) {
  const k = Math.max(0, Math.min(16, Number(n) || 0)), ita = tipo === "ita";
  if (ita) {
    const due = k > 4, supporti = due ? [7, 7] : [4], mw = 15, mh = 34, gap = 2;
    const largS = (m) => m * mw + (m - 1) * gap + 16;
    return (
      <svg viewBox="0 0 300 150" role="img" aria-label={due ? "Due supporti 506 con 6 o 7 moduli standard Italia ciascuno" : "Un supporto 504 con 4 moduli standard Italia"}>
        {supporti.map((m, j) => {
          const w = largS(m), x0 = 150 - w / 2, y0 = due ? 12 + j * 64 : 40;
          return <g key={j}>
            <rect x={x0} y={y0} width={w} height={mh + 16} rx="6" fill="var(--carta)" stroke={C.metallo} strokeWidth="2.2" />
            {Array.from({ length: m }, (_, i) => { const x = x0 + 8 + i * (mw + gap), y = y0 + 8, sett = due && i === 6;
              return <g key={i}><rect x={x} y={y} width={mw} height={mh} rx="2" fill={sett ? "none" : C.vuoto} stroke={C.linea} strokeWidth="1" strokeDasharray={sett ? "3 2" : undefined} />
                {!sett && <g fill={C.quota}><circle cx={x + mw / 2} cy={y + 9} r="1.6" /><circle cx={x + mw / 2} cy={y + 17} r="1.6" /><circle cx={x + mw / 2} cy={y + 25} r="1.6" /></g>}</g>; })}
            <text x={x0 + w + 6} y={y0 + mh / 2 + 12} fontSize="11" fontWeight="700" fill={C.testo}>{due ? "506" : "504"}</text>
          </g>;
        })}
        <text x="150" y="146" textAnchor="middle" fontSize="11" fill={C.testo}>{due ? "2 × 506: 6 o 7 moduli ciascuno (7° secondo la serie)" : "1 × 504: fino a 4 moduli 22,5 × 45 mm"}</text>
      </svg>
    );
  }
  const tot0 = k || 4, per = Math.min(8, tot0), righe = tot0 > 8 ? 2 : 1, gap = 4, hh = Math.min(righe === 2 ? 44 : 56, (262 - (per - 1) * gap) / per), lw = hh;
  const larg = per * lw + (per - 1) * gap, x0 = 150 - larg / 2, y0 = righe === 2 ? 20 : 40;
  return (
    <svg viewBox="0 0 300 150" role="img" aria-label={`Scatola OBO con ${k || "i"} moduli Modul45 quadrati`}>
      <rect x={Math.max(6, x0 - 14)} y={y0 - 12} width={Math.min(288, larg + 28)} height={righe * hh + (righe - 1) * 8 + 24} rx="10" fill="var(--carta)" stroke={C.metallo} strokeWidth="2.5" />
      {Array.from({ length: tot0 }, (_, i) => {
        const r = Math.floor(i / per), c = i % per, x = x0 + c * (lw + gap), y = y0 + r * (hh + 8), cx = x + lw / 2, cy = y + hh / 2;
        return <g key={i} opacity={k ? 1 : .3}><rect x={x} y={y} width={lw} height={hh} rx="3" fill={C.vuoto} stroke={C.linea} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={hh * .3} fill="none" stroke={C.quota} strokeWidth="1.6" /><circle cx={cx - hh * .12} cy={cy} r="2.4" fill={C.quota} /><circle cx={cx + hh * .12} cy={cy} r="2.4" fill={C.quota} /></g>;
      })}
      <text x="150" y="146" textAnchor="middle" fontSize="11" fill={C.testo}>{tipo === "modul45" ? "Modul45®: moduli quadrati 45 × 45 mm" : "Scegli il sistema dei frutti"}</text>
    </svg>
  );
}
const Icona = ({ d, pieno }) => <svg viewBox="0 0 48 48" width="44" height="44" fill={pieno ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const ICONE = {
  persona: <><circle cx="24" cy="9" r="4" /><path d="M24 14v14M24 19l-8 6M24 19l8 5M24 28l-6 13M24 28l7 13" /></>,
  carrello: <><path d="M6 10h6l6 22h20" /><rect x="18" y="14" width="18" height="12" rx="1.500" /><circle cx="20" cy="38" r="3" /><circle cx="36" cy="38" r="3" /></>,
  auto: <><path d="M5 30v-6l5-2 5-9h16l6 9 6 2v6z" /><circle cx="14" cy="32" r="4" /><circle cx="34" cy="32" r="4" /><path d="M16 22h17" /></>,
  secco: <><path d="M30 6L18 26" /><path d="M10 28l10-4 6 6-4 10c-6 1-11-2-14-8z" /><path d="M14 34l4 4M19 30l5 5" /></>,
  umido: <><path d="M24 6c-7 9-11 15-11 21a11 11 0 0022 0c0-6-4-12-11-21z" /><path d="M18 28a6 6 0 006 6" /></>,
  quadrata: <><rect x="8" y="8" width="32" height="32" rx="3" /><rect x="15" y="15" width="18" height="18" rx="2" /></>,
  rotonda: <><circle cx="24" cy="24" r="17" /><circle cx="24" cy="24" r="9" /></>,
  boh: <><circle cx="24" cy="24" r="17" /><path d="M19 19a5 5 0 119 3c-2 2-4 3-4 6M24 34v.500" /></>,
};

// ───────────────────────── domande ─────────────────────────
const PASSI = [
  { id: "prese", titolo: "Quali frutti e quanti in ogni torretta?", aiuto: "Prima il sistema dei frutti (Modul45® o standard Italia), poi quanti: prese di corrente e prese dati contano insieme." },
  { id: "forma", titolo: "Che forma deve avere la torretta?", aiuto: "È solo una questione estetica: scegli quella che sta meglio con la posa del pavimento." },
  { id: "pavimento", titolo: "Com'è fatto il pavimento?", aiuto: "Guarda come sarà la struttura sotto il pavimento finito, nel punto dove va la torretta." },
  { id: "altezza", titolo: "Quanto spazio c'è sotto il pavimento?", aiuto: "È la misura H del disegno: dal solaio grezzo fino al piano del pavimento finito, in millimetri." },
  { id: "rivestimento", titolo: "Che rivestimento va nel coperchio?", aiuto: "Il coperchio può prendere lo stesso materiale del pavimento, così a torretta chiusa quasi non si vede. Serve lo spessore del rivestimento." },
  { id: "uso", titolo: "Che cosa ci passa sopra e come si pulisce?", aiuto: "Servono per scegliere la resistenza al carico e il grado di protezione dall'acqua." },
];
const RIVESTIMENTI = [["0", "Nessuno", "coperchio a vista"], ["5", "Fino a 5 mm", "moquette, PVC, linoleum"], ["10", "10 mm", "gres, parquet sottile"], ["15", "15 mm", "parquet, gres spesso"], ["20", "20 mm", "pietra, marmo"], ["25", "25 mm", "pietra spessa"]];
const ALTEZZE = [60, 80, 100, 120, 150, 200];

function Scelta({ attiva, onClick, titolo, testo, children, larga }) {
  return (
    <button type="button" className={"g-scelta" + (attiva ? " attiva" : "") + (larga ? " larga" : "")} aria-pressed={attiva} onClick={onClick}>
      {children && <div className="g-fig">{children}</div>}
      <div className="g-riga"><span className="g-spunta" aria-hidden="true">✓</span><div className="g-st"><b>{titolo}</b>{testo && <small>{testo}</small>}</div></div>
    </button>
  );
}

export default function Guida({ sistemi, punteggio, famiglie, foto, Caratteristiche, filtri, setFiltri, passo, setPasso, onSeleziona, onCatalogo }) {
  const set = (k, v) => setFiltri((p) => ({ ...p, [k]: p[k] === v ? "" : v }));
  const metti = (k, v) => setFiltri((p) => ({ ...p, [k]: v }));
  const ris = useMemo(() => {
    const r = sistemi.map(({ key, ...s }) => punteggio(key, s, filtri));
    return { ok: r.filter((x) => !x.problemi.length && !x.rinunce.length), parziali: r.filter((x) => !x.problemi.length && x.rinunce.length), ko: r.filter((x) => x.problemi.length) };
  }, [filtri]);
  const adatti = ris.ok.length + ris.parziali.length, fine = passo >= PASSI.length, P = PASSI[passo];
  const azzera = () => { setFiltri({ altezza: "", pavimento: "", lavaggio: "", carico: "", unitaCarico: "kN", forma: "", rivestimento: "", moduli: "", tipoPrese: "" }); setPasso(0); };
  const riassunto = [
    ["prese", (filtri.moduli || filtri.tipoPrese) && (filtri.tipoPrese === "ita" ? (filtri.moduli === "4" ? "Standard Italia · 1 × 504" : filtri.moduli ? "Standard Italia · 2 × 506" : "Standard Italia") : filtri.tipoPrese === "modul45" ? `${filtri.moduli ? filtri.moduli + " moduli " : ""}Modul45` : `${filtri.moduli} dispositivi`)],
    ["forma", filtri.forma && filtri.forma !== "indifferente" && (filtri.forma === "quadrata" ? "Quadrata" : "Rotonda")],
    ["pavimento", filtri.pavimento && { massetto: "Massetto", flottante: "Flottante", seminato: "Seminato" }[filtri.pavimento]],
    ["altezza", filtri.altezza && `H ${filtri.altezza} mm`],
    ["rivestimento", filtri.rivestimento !== "" && (filtri.rivestimento === "0" ? "Senza rivestimento" : `Rivestimento ${filtri.rivestimento} mm`)],
    ["uso", (filtri.carico || filtri.lavaggio) && [filtri.carico && `${filtri.carico} kN`, filtri.lavaggio === "umido" && "lavaggio con acqua"].filter(Boolean).join(", ")],
  ];
  const nPrese = Number(filtri.moduli) || 0;
  // a ogni domanda si torna in cima alla guida; la sezione «Progetto» della pagina si nasconde finché si risponde
  const radice = useRef(null), primo = useRef(true);
  useEffect(() => { if (primo.current) { primo.current = false; return; } if (radice.current) radice.current.scrollIntoView({ block: "start" }); }, [passo]);
  useEffect(() => { document.body.classList.add("guida-attiva"); return () => document.body.classList.remove("guida-attiva"); }, []);

  // nastro orizzontale: una scheda per domanda, si scorre con il dito o con i pulsanti
  const nastro = useRef(null), fermo = useRef(0), daNastro = useRef(false);
  const alScorrere = () => {
    clearTimeout(fermo.current);
    fermo.current = setTimeout(() => {
      const n = nastro.current; if (!n) return;
      const centro = n.scrollLeft + n.clientWidth / 2; let meglio = 0, dist = Infinity;
      Array.from(n.children).forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centro); if (d < dist) { dist = d; meglio = i; } });
      if (meglio !== passo) { daNastro.current = true; setPasso(meglio); }
    }, 90);
  };
  useEffect(() => {
    const n = nastro.current, c = n && n.children[passo]; if (!c) return;
    if (daNastro.current) { daNastro.current = false; return; }
    const ridotto = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    n.scrollTo({ left: c.offsetLeft - (n.clientWidth - c.offsetWidth) / 2, behavior: ridotto ? "auto" : "smooth" });
  }, [passo]);
  const corpo = (id) => {
    if (id === "pavimento") return (
              <div className="g-griglia tre">
                <Scelta attiva={filtri.pavimento === "massetto"} onClick={() => set("pavimento", "massetto")} titolo="Massetto" testo="Il pavimento è posato su un getto pieno: la scatola resta annegata nel massetto."><DisegnoPavimento tipo="massetto" compatto /></Scelta>
                <Scelta attiva={filtri.pavimento === "flottante"} onClick={() => set("pavimento", "flottante")} titolo="Flottante (sopraelevato)" testo="Pannelli appoggiati su piedini, con il vuoto sotto per i cavi."><DisegnoPavimento tipo="flottante" compatto /></Scelta>
                <Scelta attiva={filtri.pavimento === "seminato"} onClick={() => set("pavimento", "seminato")} titolo="Seminato o resina colata" testo="Pavimento colato e levigato in opera sopra il massetto."><DisegnoPavimento tipo="seminato" compatto /></Scelta>
              </div>
    );
    if (id === "altezza") return (
              <div className="g-due">
                <div className="g-tavola"><DisegnoPavimento tipo={filtri.pavimento || "massetto"} h={filtri.altezza} /></div>
                <div className="g-campi">
                  <label htmlFor="g-altezza">Altezza H in millimetri</label>
                  <div className="g-num"><input className="g" id="g-altezza" type="number" inputMode="numeric" min="30" max="600" placeholder="es. 120" value={filtri.altezza} onChange={(e) => metti("altezza", e.target.value)} /><span>mm</span></div>
                  <div className="g-rapide">{ALTEZZE.map((a) => <button type="button" key={a} className={"g-pill" + (String(filtri.altezza) === String(a) ? " attiva" : "")} onClick={() => metti("altezza", String(a))}>{a}</button>)}</div>
                  <p className="g-suggerimento">Non la conosci ancora? Lascia vuoto: vedrai per ogni sistema l'altezza minima che richiede.</p>
                </div>
              </div>
    );
    if (id === "rivestimento") return (
              <div className="g-due">
                <div className="g-tavola"><DisegnoRivestimento mm={filtri.rivestimento} /></div>
                <div className="g-campi">
                  <div className="g-griglia due">{RIVESTIMENTI.map(([v, t, d]) => <Scelta key={v} larga attiva={filtri.rivestimento === v} onClick={() => set("rivestimento", v)} titolo={t} testo={d} />)}</div>
                  <label htmlFor="g-riv">Oppure scrivi lo spessore</label>
                  <div className="g-num"><input className="g" id="g-riv" type="number" inputMode="numeric" min="0" max="60" placeholder="es. 12" value={filtri.rivestimento} onChange={(e) => metti("rivestimento", e.target.value)} /><span>mm</span></div>
                </div>
              </div>
    );
    if (id === "prese") return (
              <div className="g-due">
                <div className="g-tavola"><DisegnoPrese n={nPrese} tipo={filtri.tipoPrese} /></div>
                <div className="g-campi">
                  <label>Sistema dei frutti</label>
                  <div className="g-griglia due">
                    <Scelta larga attiva={filtri.tipoPrese === "modul45"} onClick={() => setFiltri((p) => ({ ...p, tipoPrese: p.tipoPrese === "modul45" ? "" : "modul45", moduli: p.tipoPrese === "modul45" ? p.moduli : "" }))} titolo="Modul45®" testo="frutti OBO quadrati 45 × 45 mm" />
                    <Scelta larga attiva={filtri.tipoPrese === "ita"} onClick={() => setFiltri((p) => ({ ...p, tipoPrese: p.tipoPrese === "ita" ? "" : "ita", moduli: p.tipoPrese === "ita" ? p.moduli : "" }))} titolo="Standard Italia" testo="frutti delle serie civili italiane, moduli 22,5 × 45 mm" />
                  </div>
                  {filtri.tipoPrese === "ita" ? <>
                    <label>Supporti per i frutti</label>
                    <div className="g-griglia due">
                      <Scelta larga attiva={filtri.moduli === "4"} onClick={() => metti("moduli", filtri.moduli === "4" ? "" : "4")} titolo="1 supporto 504" testo="fino a 4 moduli" />
                      <Scelta larga attiva={filtri.moduli === "12"} onClick={() => metti("moduli", filtri.moduli === "12" ? "" : "12")} titolo="2 supporti 506" testo="6 o 7 moduli ciascuno secondo la serie civile: 12–14 moduli" />
                    </div>
                    <p className="g-suggerimento">Secondo la torretta il box è già montato oppure va aggiunto sotto (box GTI 4 per il 504, GTI 14 per i due 506): lo scegli nella configurazione.</p>
                  </> : filtri.tipoPrese === "modul45" ? <>
                    <label>Numero di moduli Modul45®</label>
                    <div className="g-conta">
                      <button type="button" aria-label="Un modulo in meno" onClick={() => metti("moduli", nPrese > 1 ? String(nPrese - 1) : "")}>−</button>
                      <output aria-live="polite">{nPrese || "—"}</output>
                      <button type="button" aria-label="Un modulo in più" onClick={() => metti("moduli", String(Math.min(16, nPrese + 1)))}>+</button>
                    </div>
                    <div className="g-rapide">{[2, 4, 6, 8, 9, 12].map((a) => <button type="button" key={a} className={"g-pill" + (nPrese === a ? " attiva" : "")} onClick={() => metti("moduli", String(a))}>{a}</button>)}</div>
                  </> : <p className="g-suggerimento">Scegli il sistema: cambiano i supporti, il numero di frutti e il disegno.</p>}
                </div>
              </div>
    );
    if (id === "uso") return (
              <div className="g-campi larghi">
                <label>Che cosa passa sopra la torretta</label>
                <div className="g-griglia tre">
                  <Scelta attiva={filtri.carico === "1.5"} onClick={() => set("carico", "1.5")} titolo="Solo persone" testo="uffici, sale riunioni, abitazioni"><Icona d={ICONE.persona} /></Scelta>
                  <Scelta attiva={filtri.carico === "3"} onClick={() => set("carico", "3")} titolo="Carrelli e arredi pesanti" testo="negozi, hall, sale espositive"><Icona d={ICONE.carrello} /></Scelta>
                  <Scelta attiva={filtri.carico === "20"} onClick={() => set("carico", "20")} titolo="Veicoli e carichi pesanti" testo="showroom auto, stazioni, aeroporti (20 kN)"><Icona d={ICONE.auto} /></Scelta>
                </div>
                <label>Come si pulisce il pavimento</label>
                <div className="g-griglia due">
                  <Scelta attiva={filtri.lavaggio === ""} onClick={() => metti("lavaggio", "")} titolo="A secco o con panno umido" testo="aspirapolvere, scopa, panno strizzato"><Icona d={ICONE.secco} /></Scelta>
                  <Scelta attiva={filtri.lavaggio === "umido"} onClick={() => metti("lavaggio", "umido")} titolo="Con acqua" testo="lavapavimenti, secchio e straccio bagnato"><Icona d={ICONE.umido} /></Scelta>
                </div>
              </div>
    );
    if (id === "forma") return (
              <div className="g-griglia tre">
                <Scelta attiva={filtri.forma === "quadrata"} onClick={() => set("forma", "quadrata")} titolo="Quadrata" testo="segue le fughe di piastrelle e pannelli"><Icona d={ICONE.quadrata} /></Scelta>
                <Scelta attiva={filtri.forma === "rotonda"} onClick={() => set("forma", "rotonda")} titolo="Rotonda" testo="si taglia con una fresa a tazza: adatta a pietra e legno"><Icona d={ICONE.rotonda} /></Scelta>
                <Scelta attiva={!filtri.forma || filtri.forma === "indifferente"} onClick={() => metti("forma", "")} titolo="È lo stesso" testo="mostrami tutte e due"><Icona d={ICONE.boh} /></Scelta>
              </div>
    );
    return null;
  };

  const Scheda = ({ r, tipo }) => {
    const fam = famiglie.find((f) => f.sistemi.includes(r.key)), ft = fam && foto[fam.id];
    return (
      <article className={"g-ris " + tipo}>
        {ft && <img src={ft.scheda} alt="" loading="lazy" />}
        <div className="g-ris-c">
          <div className="g-ris-t"><h3>{r.label}</h3>{fam && <span className="g-fam">{fam.label}</span>}</div>
          <Caratteristiche chiavi={[r.key]} />
          {r.rinunce.map((x, i) => <p key={i} className="g-nota">⚠ <b>{x.campo}:</b> {x.motivo}</p>)}
          {r.problemi.map((x, i) => <p key={i} className="g-no">✕ <b>{x.campo}:</b> {x.motivo}</p>)}
        </div>
        {tipo !== "ko" && <button type="button" className="g-vai" onClick={() => onSeleziona(r.key)}>Configura <span aria-hidden="true">→</span></button>}
      </article>
    );
  };

  return (
    <div className="guida" ref={radice}>
      <div className="g-dentro">
        <ol className="g-passi" aria-label="Avanzamento">
          {PASSI.map((x, i) => <li key={x.id} className={i === passo ? "ora" : riassunto[i][1] ? "fatto" : ""}><button type="button" onClick={() => setPasso(i)} aria-current={i === passo ? "step" : undefined}><span>{i + 1}</span><em>{["Frutti", "Forma", "Pavimento", "Altezza", "Rivestimento", "Uso"][i]}</em></button></li>)}
          <li className={fine ? "ora" : ""}><button type="button" onClick={() => setPasso(PASSI.length)}><span>✓</span><em>Risultato</em></button></li>
        </ol>

        <div className="g-nastro" ref={nastro} onScroll={alScorrere}>
          {PASSI.map((X, i) => (
            <section className={"g-carta c" + i + (i === passo ? " ora" : "")} key={X.id} aria-label={X.titolo} onClick={() => { if (i !== passo) setPasso(i); }}>
              <p className="g-n">Domanda {i + 1} di {PASSI.length}</p>
              <h2>{X.titolo}</h2>
              <p className="g-aiuto">{X.aiuto}</p>
              {corpo(X.id)}
            </section>
          ))}
          <section className={"g-carta c6" + (fine ? " ora" : "")} aria-label="Risultato" onClick={() => { if (!fine) setPasso(PASSI.length); }}>
            <p className="g-n">Risultato</p>
            <h2>{ris.ok.length ? `${ris.ok.length} ${ris.ok.length === 1 ? "sistema adatto" : "sistemi adatti"}` : ris.parziali.length ? "Nessun sistema perfetto, ma questi ci vanno vicino" : "Nessun sistema con queste richieste"}</h2>
            <p className="g-aiuto">{adatti ? "Scegli un sistema e premi «Configura»: sceglierai finitura, scatola e accessori, con i codici OBO." : "Prova a togliere una richiesta: tocca una delle risposte qui sotto per cambiarla."}</p>
            <div className="g-riassunto">
              {riassunto.filter((x) => x[1]).map(([k, t]) => <button type="button" key={k} className="g-pill attiva" onClick={() => setPasso(PASSI.findIndex((x) => x.id === k))}>{t} <span aria-hidden="true">✎</span></button>)}
              {!riassunto.some((x) => x[1]) && <span className="g-suggerimento">Non hai dato nessuna risposta: vedi tutti i sistemi.</span>}
              <button type="button" className="g-pill" onClick={azzera}>Ricomincia da capo</button>
            </div>
            <div className="g-elenco">
              {ris.ok.map((r) => <Scheda key={r.key} r={r} tipo="ok" />)}
              {ris.parziali.length > 0 && <h4>Adatti con una rinuncia</h4>}
              {ris.parziali.map((r) => <Scheda key={r.key} r={r} tipo="parziale" />)}
              {ris.ko.length > 0 && <details><summary>Perché gli altri {ris.ko.length} sistemi non vanno bene</summary>{ris.ko.map((r) => <Scheda key={r.key} r={r} tipo="ko" />)}</details>}
            </div>
          </section>
        </div>
      </div>

      <div className="g-piede">
        <div className="g-dentro g-piede-riga">
          <button type="button" className="g-btn" disabled={passo === 0} onClick={() => setPasso(Math.max(0, passo - 1))}>← Indietro</button>
          <span className={"g-conteggio" + (adatti ? "" : " zero")} aria-live="polite"><b>{adatti}</b> {adatti === 1 ? "sistema adatto" : "sistemi adatti"}{!fine && <small> finora</small>}</span>
          {!fine
            ? <button type="button" className="g-btn primario" onClick={() => setPasso(passo + 1)}>{passo === PASSI.length - 1 ? "Vedi il risultato" : riassunto[passo][1] ? "Avanti →" : "Non lo so, avanti →"}</button>
            : <button type="button" className="g-btn" onClick={onCatalogo}>Sfoglia tutto il catalogo</button>}
        </div>
      </div>
    </div>
  );
}
