// Calcolo zavorra telai inverter OBO Magic PV Mount (WRR F / WRR D)
// Fonte: istruzioni di montaggio OBO "Magic PV Mount inverter frame" (EN, 28/07/2026), cap. 11, tab. 5-8.
// Modulo puro: nessun accesso al DOM, usabile anche lato server o nei test.

export const COLS = [2000, 2500, 3500, 5500, 7500, 11500]; // area frontale cm²
export const SPEEDS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 170]; // km/h
export const PRESS = [0.31, 0.39, 0.48, 0.58, 0.69, 0.82, 0.95, 1.09, 1.23, 1.39]; // kN/m²
export const FRAME_HEIGHT = 1554; // mm, altezza totale telaio autoportante

// Valori tra parentesi = come pubblicati da OBO tra parentesi (da verificare)
const RAW = {
  '1500-45': `33 38 48 68 89 129|61 67 80 106 132 183|92 100 116 148 180 243|127 136 156 194 233 309|165 176 199 245 291 (382)|206 219 246 300 (354) (461)|250 266 297 (359) (422) (546)|298 (316) (352) (423) (495) (638)|(349) (370) (410) (492) (573) (736)|(404) (427) (473) (564) (656) (840)`,
  '1000-45': `41 54 52 67 82 (143)|57 61 71 (98) (136) (213)|74 80 (101) (149) (196) (292)|(105) (119) (148) (206) (263) (378)|(148) (165) (199) (268) (336) (473)|(195) (215) (255) (336) (416) (577)|(245) (269) (315) (409) (502) (688)|(300) (326) (380) (487) (594) (808)|(358) (388) (449) (571) (693) (936)|(420) (454) (523) (660) (797) (1072)`,
  '1500-30': `11 16 26 46 67 107|33 39 52 78 104 155|58 66 82 113 145 209|85 95 114 154 191 268|115 126 149 195 241 (332)|148 161 188 242 295 (403)|183 198 229 292 (354) (478)|221 238 274 (346) (417) (560)|261 281 (322) (403) (485) (647)|304 (327) (373) (465) (556) (470)`,
  '1000-30': `12 17 28 48 68 109|30 36 49 75 100 152|49 57 73 105 136 (200)|70 80 99 138 176 (253)|94 105 128 174 (219) (311)|119 133 159 (213) (267) (374)|147 162 (193) (256) (318) (442)|176 (194) (230) (301) (373) (516)|(208) (228) (269) (350) (431) (594)|(241) (264) (310) (402) (494) (677)`,
};

export const TABLES = Object.fromEntries(
  Object.entries(RAW).map(([k, s]) => [
    k,
    s.split('|').map((r) => r.trim().split(/\s+/).map((c) => ({ v: parseFloat(c.replace(/[()]/g, '')), p: c.startsWith('(') }))),
  ])
);

export const TABNO = { '1500-45': 5, '1000-45': 6, '1500-30': 7, '1000-30': 8 };

// Probabili errori di stampa nelle tabelle pubblicate [riga, colonna, messaggio]
export const ANOM = {
  '1500-30': [[9, 5, '170 km/h / 11.500 cm²: 470 kg è inferiore al valore a 160 km/h (647); probabile errore di stampa (atteso ≈ 740)']],
  '1000-45': [[0, 1, '80 km/h / 2.500 cm²: 54 kg è superiore al valore della colonna 3.500 cm² (52); possibile errore di stampa']],
};

export const FRAMES = {
  F1500: { name: 'WRR F1500', code: '5904015', w: 1500, double: false },
  F1000: { name: 'WRR F1000', code: '5904013', w: 1000, double: false },
  D1500: { name: 'WRR D1500', code: '5904029', w: 1500, double: true },
  D1000: { name: 'WRR D1000', code: '5904026', w: 1000, double: true },
};

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
      suggest: maxW <= 1500 && fr.w < 1500 ? (fr.double ? 'D1500' : 'F1500') : null,
    };
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
      table: r.err ? null : r.table,
      ballast: r.err ? null : Math.ceil(r.total),
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
  const big = fr.double ? 'D1500' : 'F1500';
  const small = fr.double ? 'D1000' : 'F1000';
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
  if (r.maxH >= FRAME_HEIGHT) {
    level = 'crit';
    msgs.push(`✕ Troppo alta: l'apparecchiatura più alta misura ${fmt(r.maxH)} mm, il telaio è alto 1.554 mm in tutto.`);
  }
  return { level, msgs, switchTo, note: `Altezza: apparecchiatura più alta ${fmt(r.maxH)} mm. Il telaio è alto 1.554 mm compresi piedi e tettoia; l'altezza utile sotto la tettoia non è dichiarata da OBO, quindi va verificata.` };
}

/** Testo pronto da incollare nella mail al cliente. */
export function emailText(state) {
  const fr = FRAMES[state.frame];
  const devs = state.devs
    .filter((d) => d.q > 0)
    .map((d) => `${d.q} × ${d.d || 'apparecchiatura'} (${fmt(d.w)}×${fmt(d.h)} mm, ${fmt(d.kg, 1)} kg)`)
    .join(', ');
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
