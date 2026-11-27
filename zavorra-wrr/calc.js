// Calcolo zavorra telai inverter OBO Magic PV Mount (WRR F / WRR D)
// Fonte: istruzioni di montaggio OBO "Magic PV Mount inverter frame" (EN, 28/07/2026), cap. 11, tab. 5-8.
// Modulo puro: nessun accesso al DOM, usabile anche lato server o nei test.

import { DATI } from './dati.js';
// I numeri (telai, colonne, velocità, tabelle) stanno in dati.js, aggiornato dalla tabella condivisa: qui solo il calcolo.
export const COLS = DATI.colonne; // area frontale cm²
export const SPEEDS = DATI.velocita; // km/h
export const PRESS = DATI.pressioni; // kN/m²
export const FRAME_HEIGHT = DATI.altezzaTelaio; // mm, altezza totale telaio autoportante

// Valori tra parentesi = come pubblicati da OBO tra parentesi (da verificare)
export const TABLES = Object.fromEntries(
  Object.entries(DATI.tabelle).map(([k, righe]) => [k, righe.map((r) => r.map((c) => ({ v: parseFloat(String(c).replace(/[()]/g, '')), p: String(c).trim().startsWith('(') })))])
);

export const TABNO = DATI.numeroTabella;

// Probabili errori di stampa nelle tabelle pubblicate [riga, colonna, messaggio]
export const ANOM = {
  '1500-30': [[9, 5, '170 km/h / 11.500 cm²: 470 kg è inferiore al valore a 160 km/h (647); probabile errore di stampa (atteso ≈ 740)']],
  '1000-45': [[0, 1, '80 km/h / 2.500 cm²: 54 kg è superiore al valore della colonna 3.500 cm² (52); possibile errore di stampa']],
};

export const FRAMES = DATI.telai;
/** pressione cinetica del vento (kN/m²) = ½ · 1,25 kg/m³ · v² (stessi valori della colonna "Pressione" delle tabelle OBO) */
export const pressioneVento = (kmh) => 0.625 * (kmh / 3.6) ** 2 / 1000;
const famiglia = (fr) => (fr.wall ? 'W' : fr.double ? 'D' : 'F');

// Metodo di calcolo -> [scelta colonna area, scelta riga vento]
export const MODES = {
  prudent: ['upper', 'upper'],
  obo: ['closest', 'upper'],
  interp: ['interp', 'interp'],
};
export const MODE_LABELS = { prudent: 'Prudente', obo: 'Metodo OBO', interp: 'Intermedio' };

export const fmt = (n, d = 0) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });

export function defaultState() {
  return {
    frame: 'F1500',
    pitch: 30,
    wind: 120,
    calcMode: 'obo',
    devs: [{ d: 'Inverter', side: 'A', w: 1020, h: 795, kg: 95, q: 1 }],
  };
}

function colPick(area, mode) {
  if (area <= COLS[0]) return { kind: 'single', i: 0, note: area < COLS[0] ? 'area inferiore a 2.000 cm²: usata la colonna 2.000' : null };
  if (area > COLS[COLS.length - 1]) return { kind: 'out' };
  const hi = COLS.findIndex((c) => c >= area);
  const lo = hi - 1;
  if (COLS[hi] === area || mode === 'upper') return { kind: 'single', i: hi };
  if (mode === 'closest') return { kind: 'single', i: area - COLS[lo] <= COLS[hi] - area ? lo : hi };
  return { kind: 'interp', lo, hi, t: (area - COLS[lo]) / (COLS[hi] - COLS[lo]) };
}

function rowPick(v, mode) {
  if (v > SPEEDS[SPEEDS.length - 1]) return { kind: 'out' };
  if (v <= SPEEDS[0]) return { kind: 'single', i: 0, note: v < SPEEDS[0] ? 'vento inferiore a 80 km/h: usata la riga 80 km/h' : null };
  const hi = SPEEDS.findIndex((s) => s >= v);
  const lo = hi - 1;
  if (SPEEDS[hi] === v || mode === 'upper') return { kind: 'single', i: hi };
  return { kind: 'interp', lo, hi, t: (v * v - SPEEDS[lo] ** 2) / (SPEEDS[hi] ** 2 - SPEEDS[lo] ** 2) };
}

const weights = (pick) => (pick.kind === 'single' ? [[pick.i, 1]] : [[pick.lo, 1 - pick.t], [pick.hi, pick.t]]);

function lookup(tab, rp, cp) {
  let v = 0, p = false;
  const used = [];
  for (const [r, wr] of weights(rp))
    for (const [c, wc] of weights(cp)) {
      const w = wr * wc;
      if (w <= 0) continue;
      const cell = TABLES[tab][r][c];
      v += cell.v * w;
      p = p || cell.p;
      used.push([r, c]);
    }
  return { v, p, used };
}

/**
 * Calcola la zavorra.
 * @param {object} state  { frame, pitch, wind, calcMode, devs[] }
 * @param {number} [windOverride] velocità alternativa (per la tabella completa)
 */
export function compute(state, windOverride) {
  const fr = FRAMES[state.frame];
  const tab = `${fr.w}-${state.pitch}`;
  const [areaMode, windMode] = MODES[state.calcMode] || MODES.obo;
  const devs = (state.devs || []).filter((d) => d.w > 0 && d.h > 0 && d.q > 0);
  const sideArea = { A: 0, B: 0 };
  let weight = 0, maxW = 0, maxH = 0;
  devs.forEach((d) => {
    const s = fr.double ? d.side || 'A' : 'A';
    sideArea[s] += (d.w * d.h / 100) * d.q;
    weight += (+d.kg || 0) * d.q;
    maxW = Math.max(maxW, d.w);
    maxH = Math.max(maxH, d.h);
  });
  const area = Math.max(sideArea.A, sideArea.B);
  const wind = windOverride ?? state.wind;
  const cp = colPick(area, areaMode);
  const rp = rowPick(wind, windMode);
  const out = { fr, tab, devs, sideArea, area, weight, maxW, maxH, cp, rp, wind, areaMode, windMode };

  if (!devs.length) return { ...out, errCode: 'empty', err: "Inserisci almeno un'apparecchiatura con dimensioni e quantità." };
  if (maxW > fr.w)
    return {
      ...out,
      errCode: 'width',
      err: `Telaio ${fr.name} non idoneo: apparecchiatura larga ${fmt(maxW)} mm, telaio ${fmt(fr.w)} mm.`,
      suggest: maxW <= 1500 && fr.w < 1500 ? famiglia(fr) + '1500' : null,
    };
  if (fr.wall) {
    const q = pressioneVento(wind);
    return { ...out, wall: true, errCode: 'wall', err: null, q, force: q * area / 10000, total: 0, table: null, paren: false, used: [], raw: 0, perSide: null };
  }
  if (cp.kind === 'out')
    return { ...out, errCode: 'area', err: `Area frontale ${fmt(area)} cm² oltre la tabella OBO (max 11.500 cm²): calcolo non possibile con il metodo del manuale.` };
  if (rp.kind === 'out')
    return { ...out, errCode: 'wind', err: `Vento ${fmt(wind)} km/h oltre la tabella OBO (max 170 km/h): serve un calcolo strutturale specifico.` };

  const lk = lookup(tab, rp, cp);
  const raw = lk.v - weight;
  const total = Math.max(0, raw);
  return { ...out, table: lk.v, paren: lk.p, used: lk.used, raw, total, perSide: fr.double ? total / 2 : null };
}

/** Tabella completa 80-170 km/h con lo stesso metodo. */
export function windTable(state) {
  return SPEEDS.map((s, i) => {
    const r = compute(state, s);
    return {
      kmh: s,
      pressure: PRESS[i],
      table: r.err || r.wall ? null : r.table,
      ballast: r.err ? null : r.wall ? 0 : Math.ceil(r.total),
      force: r.wall ? r.force : null,
      perSide: r.err || !r.fr.double ? null : Math.ceil(r.perSide),
      verify: !r.err && r.paren,
    };
  });
}

/** Controllo dimensionale del telaio scelto. level: ok | warn | crit */
export function frameFit(r) {
  if (!r.devs.length) return null;
  const fr = r.fr;
  const side = (fr.w - r.maxW) / 2;
  const big = famiglia(fr) + '1500';
  const small = famiglia(fr) + '1000';
  const msgs = [];
  let level = 'ok', switchTo = null;
  if (r.maxW > fr.w) {
    level = 'crit';
    if (r.suggest) {
      const s = FRAMES[r.suggest];
      msgs.push(`✕ ${fr.name} non adatto: l'apparecchiatura più larga misura ${fmt(r.maxW)} mm, il telaio ${fmt(fr.w)} mm. Usa il ${s.name} (${s.code}).`);
      switchTo = r.suggest;
    } else msgs.push(`✕ Nessun telaio WRR adatto: l'apparecchiatura più larga misura ${fmt(r.maxW)} mm, oltre il massimo disponibile (1.500 mm). Contatta l'ufficio tecnico OBO.`);
  } else if (side < 50) {
    level = 'warn';
    msgs.push(`! ${fr.name} adatto in larghezza, ma con margine ridotto: ${fmt(r.maxW)} mm su ${fmt(fr.w)} mm, circa ${fmt(side)} mm liberi per lato. Verifica larghezza utile interna e spazi di ventilazione richiesti dal costruttore dell'inverter.`);
    if (fr.w < 1500) switchTo = big;
  } else {
    msgs.push(`✓ ${fr.name} adatto in larghezza: apparecchiatura più larga ${fmt(r.maxW)} mm su ${fmt(fr.w)} mm, circa ${fmt(side)} mm liberi per lato.`);
    if (fr.w === 1500 && r.maxW <= 900) {
      msgs.push(`Basta anche il telaio più piccolo ${FRAMES[small].name} (${FRAMES[small].code}): confronta la zavorra prima di scegliere.`);
      switchTo = small;
    }
  }
  if (r.errCode === 'area') {
    level = 'crit';
    msgs.push(`✕ Area frontale troppo grande per le tabelle OBO: ${fmt(r.area)} cm², massimo 11.500 cm²${fr.double ? ' per lato' : ''}.`);
  }
  const H = fr.h || FRAME_HEIGHT;
  if (r.maxH >= H) {
    level = 'crit';
    msgs.push(`✕ Troppo alta: l'apparecchiatura più alta misura ${fmt(r.maxH)} mm, il telaio è alto ${fmt(H)} mm in tutto.`);
  }
  return { level, msgs, switchTo, note: `Altezza: apparecchiatura più alta ${fmt(r.maxH)} mm. Il telaio è alto ${fmt(H)} mm${fr.wall ? '' : ' compresi piedi e tettoia'}; l'altezza utile ${fr.wall ? 'del telaio' : 'sotto la tettoia'} non è dichiarata da OBO, quindi va verificata.` };
}

/** Testo pronto da incollare nella mail al cliente. */
export function emailText(state) {
  const fr = FRAMES[state.frame];
  const devs = state.devs
    .filter((d) => d.q > 0)
    .map((d) => `${d.q} × ${d.d || 'apparecchiatura'} (${fmt(d.w)}×${fmt(d.h)} mm, ${fmt(d.kg, 1)} kg)`)
    .join(', ');
  if (fr.wall) {
    const l = [`Il calcolo considera: ${devs}; telaio a parete ${fr.name} (${fr.code}): non si zavorra, va fissato alla parete.`, '', 'km/h\tPressione kN/m²\tSpinta del vento sulle apparecchiature kN'];
    for (const row of windTable(state)) l.push(`${row.kmh}\t${fmt(row.pressure, 2)}\t${row.force == null ? '–' : fmt(row.force, 2)}`);
    l.push('', 'Spinta = pressione cinetica × area frontale, senza coefficienti di forza e di esposizione: indicativa, per scegliere tasselli e verificare la parete con il costruttore del fissaggio. Eventuali carichi da neve da valutare.');
    return l.join('\n');
  }
  const lines = [`Il calcolo considera: ${devs}; telaio ${fr.name} (${fr.code}); inclinazione ${state.pitch}°.`, ''];
  lines.push(fr.double ? 'km/h\tKg zavorra totale\tKg per lato' : 'km/h\tKg zavorra');
  let anyP = false;
  for (const row of windTable(state)) {
    if (row.ballast == null) { lines.push(`${row.kmh}\t–`); continue; }
    const st = row.verify ? '*' : '';
    anyP = anyP || row.verify;
    lines.push(fr.double ? `${row.kmh}\t${fmt(row.ballast)} kg${st}\t${fmt(row.perSide)} kg${st}` : `${row.kmh}\t${fmt(row.ballast)} kg${st}`);
  }
  lines.push('', 'Valori riferiti al solo carico del vento, eventuali carichi da neve da valutare' + (anyP ? '; i valori contrassegnati con * sono da verificare mediante calcolo strutturale specifico.' : '.'));
  return lines.join('\n');
}
