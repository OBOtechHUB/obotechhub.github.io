/*
 * Conversione SPD: confronto tecnico tra uno SPD di un'altra marca e gli SPD OBO.
 * Gli SPD OBO vengono dal catalogo di Progettazione LPS (appOBOtechHUB/dati/obo-prodotti.json, dati tecnici di obo-bettermann.com).
 * Nessuna tabella di equivalenze copiata: la proposta nasce dal confronto dei valori tecnici
 * (tipo secondo EN 61643-11, poli, Uc, Up, Iimp, In, Imax, segnalazione a distanza).
 */

export const TIPI = ["1", "1+2", "2", "2+3", "3"];
export const POLI = ["1", "1+N", "2", "3", "3+N", "4"];
export const APPLICAZIONI = [["ac", "Rete AC"], ["pv", "Fotovoltaico"], ["dc", "DC"], ["dati", "Dati / segnali"]];

/** Numero da un testo con unità ("280 V", "1,5 kV", "12.5 kA"). */
export function numero(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = /-?\d+(?:[.,]\d+)?/.exec(String(v).replace(/\s/g, ""));
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Poli in forma unica: "3+NPE", "3+N-PE", "3+1" → "3+N"; "1+NPE" → "1+N". */
export function normPoli(v) {
  const s = String(v ?? "").toUpperCase().replace(/\s|-|\//g, "");
  if (!s) return "";
  if (/^3\+(N|1)/.test(s)) return "3+N";
  if (/^2\+N/.test(s)) return "2+N";
  if (/^1\+(N|NPE|1)/.test(s)) return "1+N";
  if (/^[1234]$/.test(s)) return s;
  if (/^4/.test(s)) return "4";
  return s;
}

/** Tipo in forma unica: "Type 1+2", "T1+T2", "Classe I+II", "B+C" → "1+2". */
export function normTipo(v) {
  let s = String(v ?? "").toUpperCase().replace(/\s/g, "").replace(/TYPE|TIPO|CLASSE|CLASS|SPD/g, "");
  s = s.replace(/T(?=[123])/g, "").replace(/III/g, "3").replace(/II/g, "2").replace(/I/g, "1");
  if (/^B\+C/.test(s)) return "1+2";
  if (/^C\+D/.test(s)) return "2+3";
  if (s === "B") return "1"; if (s === "C") return "2"; if (s === "D") return "3";
  const m = /^([123])(?:\+([123]))?/.exec(s);
  if (!m) return "";
  return m[2] ? `${m[1]}+${m[2]}` : m[1];
}

const sì = (v) => /^(yes|si|sì|true|1)$/i.test(String(v ?? "").trim());

/** Coppie etichetta/valore della variante ("Item no.", poi etichetta, valore, …). */
function datiVariante(v) {
  const out = {};
  const l = v?.valori ?? [], i = l.indexOf("Item no.");
  if (i < 0) return out;
  const coppie = l.slice(i + 1);
  // le etichette sono prima, poi i valori? Nel catalogo le coppie sono "etichetta, valore"
  for (let k = 0; k + 1 < coppie.length; k += 2) out[coppie[k]] = coppie[k + 1];
  return out;
}
/** Poli dal nome della variante (prevale sul prodotto: sotto uno stesso prodotto ci sono varianti con poli diversi). */
export function poliDaNome(nome) {
  const s = ` ${String(nome ?? "").toUpperCase()} `;
  if (/[\s-]3\+N(PE)?|3\+1\b|\bTT\b|\bTNS\b|TN-S|-TT\b/.test(s)) return "3+N";
  if (/[\s-]2\+N(PE)?/.test(s)) return "2+N";
  if (/[\s-]1\+N(PE)?|1\+1\b/.test(s)) return "1+N";
  if (/[\s-]3-?PH|[\s-]3PH|\bTNC\b|TN-C\b|[\s-]3[\s-]/.test(s)) return "3";
  if (/[\s-]4[\s-]|\b4P\b/.test(s)) return "4";
  if (/[\s-]2[\s-]/.test(s)) return "2";
  if (/[\s-]1[\s-]/.test(s)) return "1";
  return "";
}
const primo = (d, chiavi) => { for (const k of chiavi) if (d[k] !== undefined && d[k] !== "") return d[k]; return undefined; };

/** Applicazione dello SPD OBO dalle categorie e dai dati. */
function applicazioneObo(p, d) {
  // solo le categorie del catalogo: nei nomi "signalling" indica il contatto a distanza, non le linee dati
  const cat = (p.categorie || []).join(" ").toLowerCase();
  const nome = (p.nome || "").toLowerCase();
  if (/photovolt|solar|\bpv\b/.test(cat) || /photovoltaic|\bpv\b/.test(nome)) return "pv";
  if (/data|msr|mcr|lsa|measuring|telecom|network|knx|bus|transmission|tv-|sat|coax|antenna|signal-|instrument/.test(cat)) return "dati";
  if (/dc-power/.test(cat)) return "dc";
  if (d["Maximum continuous voltage DC"] && !d["Maximum continuous voltage AC"]) return "dc";
  return "ac";
}

/** Tutti gli articoli SPD OBO del catalogo, con i valori tecnici in forma confrontabile. */
export function spdObo(catalogo) {
  const out = [];
  for (const p of catalogo?.catalogo ?? []) {
    if (!(p.categorie || []).includes("surge-protection")) continue;
    const varianti = p.varianti?.length ? p.varianti : [{ codice: p.codice, tipo: p.nome, valori: [] }];
    for (const v of varianti) {
      if (!v.codice) continue;
      const dv = datiVariante(v), d = { ...p.datiTecnici, ...dv };
      const tipo = normTipo(primo(d, ["SPD to EN 61643-11", "SPD to IEC 61643-11"]));
      if (!tipo) continue; // accessori, basi, coperture
      const app = applicazioneObo(p, d);
      let up = numero(primo(d, ["Protection level [L-N]", "Protection level (L-N)", "Protection level (L-N / L/N-PE)", "Protection level", "Voltage protection level", "Combined voltage protection level [L-PE]", "Protection level [L-PE]", "Protection level @ C1", "Protection level wire-earth", "Protection level wire-wire"]));
      if (up !== null && up > 20) up = up / 1000; // V → kV
      const ucAc = numero(primo(d, ["Maximum continuous voltage AC", "Maximum continuous voltage (L-N)"]));
      const ucDc = numero(primo(d, ["Maximum continuous voltage DC", "Maximum continuous voltage DC (U CPV)", "Maximum PV voltage"]));
      const nome = `${v.tipo || p.nome}`.trim();
      out.push({
        codice: v.codice, nome, prodotto: p.nome, url: p.url, foto: p.foto, scheda: v.scheda || p.scheda,
        applicazione: app, tipo,
        poli: normPoli(primo(dv, ["Pole version", "Pole number", "Number of poles"]) || poliDaNome(nome) || primo(p.datiTecnici, ["Pole version", "Pole number", "Number of poles"])),
        uc: app === "pv" || app === "dc" ? (ucDc ?? ucAc) : (ucAc ?? ucDc),
        iimpPolo: numero(primo(d, ["Lightning surge current (10/350 μs)", "Lightning surge current (10/350 μs) [L-N]", "Lightning impulse current (10/350 μs)"])),
        iimpTot: numero(primo(d, ["Lightning surge current (10/350)", "Lightning surge current (10/350) [total]", "Lightning surge current (10/350 µs) [total]"])),
        inKa: numero(primo(d, ["Nominal discharge current (8/20 µs) [L-N]", "Nominal discharge current (8/20 µs)", "Nominal discharge current (8/20 μs)"])),
        imaxKa: numero(primo(d, ["Maximum discharge current (8/20 μs)", "Maximum discharge current (8/20 µs)", "Maximum discharge current (8/20 µs) [L-N]"])),
        upKv: up,
        // la segnalazione si legge dal nome della variante (FS = contatto a distanza), altrimenti dal prodotto
        segnalazione: /FS(\b|-|\d)|\+FS|PHFS/i.test(nome) || (!/FS/i.test(nome) && v.codice === p.codice && sì(d["Remote signalling"])),
        reti: ["TN-C", "TN-S", "TN-C-S", "TT"].filter((r) => sì(d[`${r} network form`])),
      });
    }
  }
  // un codice una volta sola
  const visti = new Set();
  return out.filter((x) => (visti.has(x.codice) ? false : (visti.add(x.codice), true)));
}

/** Compatibilità del tipo: "uguale", "superiore" (fa di più) o null (non adatto). */
export function compatTipo(altro, obo) {
  if (!altro || !obo) return null;
  if (altro === obo) return "uguale";
  const sup = { "1": ["1+2"], "2": ["1+2", "2+3"], "3": ["2+3"], "2+3": [], "1+2": [] };
  return (sup[altro] || []).includes(obo) ? "superiore" : null;
}

/**
 * Confronta uno SPD di altra marca con uno SPD OBO.
 * Ritorna { punteggio 0–100, esito "equivalente" | "simile" | "diverso", voci: [{ nome, testo, stato: "ok" | "attenzione" | "no" | "info" }] } oppure null se non confrontabile.
 */
export function confronta(a, o) {
  if (!a || !o) return null;
  const app = a.applicazione || "ac";
  if (app !== o.applicazione) return null;
  const tA = normTipo(a.tipo), ct = compatTipo(tA, o.tipo);
  if (tA && !ct) return null;
  const pA = normPoli(a.poli);
  let punti = 100;
  const voci = [];
  const v = (nome, testo, stato, meno = 0) => { voci.push({ nome, testo, stato }); punti -= meno; };
  const fmt = (n, u) => (n === null || n === undefined ? "—" : `${String(Math.round(n * 100) / 100).replace(".", ",")} ${u}`);

  if (tA) v("Tipo", ct === "uguale" ? `${o.tipo}, uguale` : `${o.tipo} invece di ${tA}: fa di più`, ct === "uguale" ? "ok" : "info", ct === "uguale" ? 0 : 5);
  else v("Tipo", `OBO ${o.tipo}; tipo dell'altro SPD non indicato`, "attenzione", 10);

  if (pA) {
    if (pA === o.poli) v("Poli", `${o.poli}, uguale`, "ok");
    else if ((pA === "3+N" && o.poli === "4") || (pA === "4" && o.poli === "3+N")) v("Poli", `${o.poli} invece di ${pA}: verifica il sistema (TT richiede 3+N)`, "attenzione", 15);
    else if (!o.poli) v("Poli", `Poli OBO non indicati (altro: ${pA})`, "attenzione", 12);
    else return null;
  } else if (o.poli) v("Poli", `OBO ${o.poli}; poli dell'altro SPD non indicati`, "attenzione", 8);

  const au = numero(a.uc);
  if (au !== null && o.uc !== null) {
    if (o.uc >= au * 0.98 && o.uc > au * 1.35) v("Uc", `${fmt(o.uc, "V")}, più alta del necessario (${fmt(au, "V")})`, "info", 6);
    else if (o.uc >= au * 0.98) v("Uc", `${fmt(o.uc, "V")} ≥ ${fmt(au, "V")}`, "ok");
    else if (o.uc >= au * 0.9) v("Uc", `${fmt(o.uc, "V")} un po' più bassa di ${fmt(au, "V")}`, "attenzione", 20);
    else return null;
  } else if (au !== null) v("Uc", `Uc OBO non indicata (altro ${fmt(au, "V")})`, "attenzione", 10);

  const aup = numero(a.up_kv ?? a.upKv);
  if (aup !== null && o.upKv !== null) {
    if (o.upKv <= aup + 0.05) v("Up", `${fmt(o.upKv, "kV")} ≤ ${fmt(aup, "kV")}${o.upKv < aup - 0.05 ? ": protegge meglio" : ""}`, "ok");
    else if (o.upKv <= aup + 0.3) v("Up", `${fmt(o.upKv, "kV")} più alto di ${fmt(aup, "kV")}: controlla la tenuta degli apparecchi`, "attenzione", 15);
    else v("Up", `${fmt(o.upKv, "kV")} molto più alto di ${fmt(aup, "kV")}`, "no", 40);
  } else if (aup !== null) v("Up", `Up OBO non indicato (altro ${fmt(aup, "kV")})`, "attenzione", 8);

  const ai = numero(a.iimp_polo ?? a.iimpPolo);
  if (ai !== null && ai > 0) {
    if (o.iimpPolo !== null && o.iimpPolo >= ai * 0.98) v("Iimp", `${fmt(o.iimpPolo, "kA")} per polo ≥ ${fmt(ai, "kA")}`, "ok");
    else if (o.iimpPolo !== null) v("Iimp", `${fmt(o.iimpPolo, "kA")} per polo, meno di ${fmt(ai, "kA")}`, "no", 40);
    else v("Iimp", `Iimp OBO non indicata (altro ${fmt(ai, "kA")})`, "attenzione", 15);
  }
  const ait = numero(a.iimp_tot ?? a.iimpTot);
  if (ait !== null && ait > 0 && o.iimpTot !== null) {
    if (o.iimpTot >= ait * 0.98) v("Iimp totale", `${fmt(o.iimpTot, "kA")} ≥ ${fmt(ait, "kA")}`, "ok");
    else v("Iimp totale", `${fmt(o.iimpTot, "kA")}, meno di ${fmt(ait, "kA")}`, "no", 30);
  }
  const an = numero(a.in_ka ?? a.inKa);
  if (an !== null && an > 0) {
    if (o.inKa !== null && o.inKa >= an * 0.95) v("In", `${fmt(o.inKa, "kA")} ≥ ${fmt(an, "kA")}`, "ok");
    else if (o.inKa !== null) v("In", `${fmt(o.inKa, "kA")}, meno di ${fmt(an, "kA")}`, "attenzione", 15);
    else v("In", `In OBO non indicata (altro ${fmt(an, "kA")})`, "attenzione", 5);
  }
  const am = numero(a.imax_ka ?? a.imaxKa);
  if (am !== null && am > 0 && o.imaxKa !== null) {
    if (o.imaxKa >= am * 0.95) v("Imax", `${fmt(o.imaxKa, "kA")} ≥ ${fmt(am, "kA")}`, "ok");
    else v("Imax", `${fmt(o.imaxKa, "kA")}, meno di ${fmt(am, "kA")}`, "attenzione", 10);
  }
  if (a.segnalazione === true && !o.segnalazione) v("Segnalazione", "Senza contatto di segnalazione a distanza (l'altro ce l'ha)", "attenzione", 12);
  else if (a.segnalazione === false && o.segnalazione) v("Segnalazione", "Con contatto di segnalazione a distanza in più", "info", 3);
  else if (a.segnalazione === true) v("Segnalazione", "Contatto di segnalazione a distanza", "ok");
  if (a.sistema && o.reti.length && !o.reti.includes(a.sistema)) v("Sistema", `Non indicato per ${a.sistema} (OBO: ${o.reti.join(", ")})`, "attenzione", 15);

  punti = Math.max(0, Math.min(100, punti));
  const esito = voci.some((x) => x.stato === "no") ? "diverso" : punti >= 88 ? "equivalente" : punti >= 65 ? "simile" : "diverso";
  return { punteggio: punti, esito, voci };
}

/** Le migliori proposte OBO (al massimo n), prima l'equivalente confermato da una persona. */
export function proposte(a, obo, n = 3) {
  const r = [];
  for (const o of obo) {
    const c = confronta(a, o);
    if (c && c.esito !== "diverso") r.push({ obo: o, ...c, confermato: !!a.codice_obo && a.codice_obo === o.codice });
  }
  if (a.codice_obo && !r.some((x) => x.confermato)) {
    const o = obo.find((x) => x.codice === a.codice_obo);
    if (o) r.push({ obo: o, ...(confronta({ ...a, tipo: "", poli: "" }, o) || { punteggio: 0, esito: "simile", voci: [] }), confermato: true });
  }
  // a parità: Up più basso, poi meno "di più" del necessario
  r.sort((x, y) => (y.confermato - x.confermato) || (y.punteggio - x.punteggio) || ((x.obo.upKv ?? 9) - (y.obo.upKv ?? 9)));
  return r.slice(0, n);
}

/** Codice in forma confrontabile (maiuscole, senza spazi e trattini). */
export const chiaveCodice = (c) => String(c ?? "").toUpperCase().replace(/[\s\-_.\/]/g, "");
