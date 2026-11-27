// Tabella dei dati di Zavorra WRR: zavorra-wrr/dati.js ↔ fogli «WRR telai» e «WRR zavorra» della tabella condivisa.
// Uso:  node strumenti/zavorra/tabella.mjs esporta <cartella>            → wrr_telai.csv, wrr_zavorra.csv
//       node strumenti/zavorra/tabella.mjs importa-json <file.json> [--prova]   (file: { wrr_telai: <lettura>, wrr_zavorra: <lettura> })
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { daLettura } from '../torrette/tabella.mjs';

const QUI = path.dirname(fileURLToPath(import.meta.url));
export const FILE_DATI = path.join(QUI, '../../zavorra-wrr/dati.js');
const INTESTAZIONE = "// Dati di Zavorra WRR (telai e tabelle OBO cap. 11, tab. 5-8): file generato da strumenti/zavorra/tabella.mjs\n// dalla tabella condivisa «Torrette OBO – Dati dei sistemi» (fogli WRR telai e WRR zavorra). Valori tra parentesi = pubblicati da OBO tra parentesi (da verificare).\n";
const si = (v) => (v ? 'sì' : 'no'), eSi = (v) => /^s[iì]|^true|^x$/i.test(String(v).trim());

export function esporta(D) {
  const telai = [['Chiave', 'Nome', 'Codice OBO', 'Larghezza mm', 'Bifacciale', 'A parete', 'Altezza mm']];
  for (const [k, f] of Object.entries(D.telai)) telai.push([k, f.name, f.code, f.w, si(f.double), si(f.wall), f.h ?? '']);
  const zav = [['Tabella (larghezza-inclinazione)', 'N. tabella OBO', 'Vento km/h', 'Pressione kN/m²', ...D.colonne.map((c) => `${c} cm²`)]];
  for (const [k, righe] of Object.entries(D.tabelle)) righe.forEach((r, i) => zav.push([k, D.numeroTabella[k] ?? '', D.velocita[i], D.pressioni[i], ...r]));
  return { wrr_telai: telai, wrr_zavorra: zav };
}
export function importa(base, F) {
  const D = structuredClone(base), diff = [], errori = [];
  const cambia = (dove, vecchio, nuovo, applica) => { if (String(vecchio ?? '') !== String(nuovo ?? '')) { applica(); diff.push(`${dove}: «${vecchio ?? ''}» → «${nuovo ?? ''}»`); } };
  (F.wrr_telai || []).slice(1).forEach((r, n) => {
    const k = String(r[0] || '').trim(); if (!k && r.every((x) => !String(x || '').trim())) return;
    if (!/^[A-Z][A-Z0-9]{1,11}$/.test(k)) { errori.push(`WRR telai, riga ${n + 2}: chiave «${k}» non valida (lettere maiuscole e cifre, es. F1500)`); return; }
    const w = Number(String(r[3]).replace(',', '.')), h = String(r[6] || '').trim() === '' ? undefined : Number(String(r[6]).replace(',', '.'));
    if (!(w > 0) || (h !== undefined && !(h > 0))) { errori.push(`WRR telai, riga ${n + 2}: larghezza o altezza non valida`); return; }
    const f = D.telai[k] || (D.telai[k] = {}), dove = `WRR telai ${k}`;
    cambia(`${dove} · Nome`, f.name, String(r[1]).trim(), () => { f.name = String(r[1]).trim(); });
    cambia(`${dove} · Codice`, f.code, String(r[2]).trim(), () => { f.code = String(r[2]).trim(); });
    cambia(`${dove} · Larghezza`, f.w, w, () => { f.w = w; });
    cambia(`${dove} · Bifacciale`, si(f.double), si(eSi(r[4])), () => { f.double = eSi(r[4]); });
    cambia(`${dove} · A parete`, si(f.wall), si(eSi(r[5])), () => { if (eSi(r[5])) f.wall = true; else delete f.wall; });
    cambia(`${dove} · Altezza`, f.h ?? '', h ?? '', () => { if (h === undefined) delete f.h; else f.h = h; });
  });
  (F.wrr_zavorra || []).slice(1).forEach((r, n) => {
    const k = String(r[0] || '').trim(), v = Number(r[2]); if (!k) return;
    const i = D.velocita.indexOf(v);
    if (!D.tabelle[k] || i < 0) { errori.push(`WRR zavorra, riga ${n + 2}: tabella «${k}» o velocità «${r[2]}» non previste (righe nuove non ammesse: scrivere a Claude)`); return; }
    D.colonne.forEach((c, j) => {
      const nuovo = String(r[4 + j] ?? '').trim().replace(',', '.');
      if (!/^\(?\d+(\.\d+)?\)?$/.test(nuovo)) { errori.push(`WRR zavorra, riga ${n + 2}, colonna ${c} cm²: «${nuovo}» non è un numero (le parentesi sono ammesse)`); return; }
      cambia(`WRR zavorra ${k} · ${v} km/h · ${c} cm²`, D.tabelle[k][i][j], nuovo, () => { D.tabelle[k][i][j] = nuovo; });
    });
  });
  return { D, diff, errori };
}
const csv = (righe) => righe.map((r) => r.map((v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n') + '\n';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , azione, arg = '.'] = process.argv, { DATI } = await import(pathToFileURL(FILE_DATI).href);
  if (azione === 'esporta') { const F = esporta(DATI); fs.mkdirSync(arg, { recursive: true }); Object.entries(F).forEach(([n, r]) => fs.writeFileSync(path.join(arg, `${n}.csv`), csv(r))); console.log(Object.entries(F).map(([n, r]) => `${n}: ${r.length - 1} righe`).join(', ')); }
  else if (azione === 'importa-json') {
    const letto = JSON.parse(fs.readFileSync(arg, 'utf8')), F = {}; ['wrr_telai', 'wrr_zavorra'].forEach((n) => { if (letto[n]) F[n] = daLettura(letto[n]); });
    const { D, diff, errori } = importa(DATI, F);
    console.log(diff.length ? diff.join('\n') : 'Nessuna differenza.'); if (errori.length) console.log('\nDA CONTROLLARE:\n' + errori.join('\n'));
    if (diff.length && !errori.length && !process.argv.includes('--prova')) { fs.writeFileSync(FILE_DATI, INTESTAZIONE + 'export const DATI = ' + JSON.stringify(D, null, 1) + ';\n'); console.log('\nAggiornato zavorra-wrr/dati.js: esegui node zavorra-wrr/calc.test.js'); }
  } else console.log('Uso: node strumenti/zavorra/tabella.mjs esporta <cartella> | importa-json <file.json> [--prova]');
}
