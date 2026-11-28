// Tabella dei dati del Configuratore torrette: i dati dei sistemi (torrette/sorgente/dati-sistemi.json) diventano
// quattro fogli (Sistemi, Gruppi, Varianti, Componenti) che i colleghi correggono; `importa` riporta le correzioni nei dati.
// Uso:  node strumenti/torrette/tabella.mjs esporta <cartella>      → scrive i 4 CSV
//       node strumenti/torrette/tabella.mjs importa <cartella>      → legge i 4 CSV, aggiorna dati-sistemi.json, stampa le differenze
// La colonna ID dice a quale dato corrisponde la riga: non va cambiata. Riga nuova = ID vuoto (si aggiunge in fondo all'elenco).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
export const FILE_DATI = path.join(QUI, '../../torrette/sorgente/dati-sistemi.json');

const lista = (v) => (Array.isArray(v) ? v.join(', ') : v ?? '');
const daLista = (v) => String(v ?? '').split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : v; };

export const SISTEMI = [['Chiave', null], ['Nome', 'label'], ['Famiglia', 'famiglia'], ['Forma', 'forma'], ['Dimensione coperchio', 'dimensione'], ['IP chiuso', 'ip_chiuso'], ['IP aperto', 'ip_aperto'],
  ['IP uscita laterale', 'ip_laterale'], ['IP tubo telescopico', 'ip_tubo'], ['IP coperchio cieco', 'ip_cieco'], ['Carico', 'carico'], ['Recesso coperchio / rivestimento max', 'rivestimento_max'],
  ['Pavimenti (massetto, flottante)', 'pavimenti'], ['Altezza sistema su flottante', 'altezze.flottante'], ['Altezza sistema su massetto', 'altezze.massetto'], ['Note', 'note'], ['Nota sui box', 'box_note'], ['Isolamento acustico (sì = testata)', 'acustica']];
export const GRUPPI = [['ID', null], ['Sistema', null], ['Sigla gruppo', 'id'], ['Nome gruppo', 'label'], ['Sottotitolo', 'sottotitolo'], ['Altezza sistema su flottante', 'altezze.flottante'], ['Altezza sistema su massetto', 'altezze.massetto']];
export const VARIANTI = [['ID', null], ['Sistema', null], ['Gruppo', null], ['Descrizione variante', 'label'], ['Forma', 'forma'], ['Finitura', 'finitura'], ['Colore RAL', 'colore_ral'], ['Materiale', 'materiale'],
  ['Uscita cavi', 'uscita'], ['Recesso coperchio mm', 'riv'], ['Recesso max mm', 'riv_max'], ['Dimensione', 'dim'], ['Codice (sistemi a gruppi)', 'codice'],
  ['Significato delle colonne codice', null], ['Codice 1', 'codici.0'], ['Codice 2', 'codici.1'], ['Codice 3', 'codici.2'], ['Codice 4', 'codici.3'], ['Nota 1', 'note_righe.0'], ['Nota 2', 'note_righe.1'], ['Nota 3', 'note_righe.2'], ['Nota 4', 'note_righe.3']];
export const COMPONENTI = [['ID', null], ['Sistema', null], ['Gruppo', null], ['Ruolo', null], ['Codice', 'codice'], ['Tipo', 'tipo'], ['Descrizione', 'desc'], ['Altezza min mm', 'MIN'], ['Altezza max mm', 'MAX'],
  ['Pavimenti ammessi', 'pavimenti_ok'], ['Quantità', 'qty'], ['Dimensione', 'dim'], ['Nota', 'nota']];
const NUMERI = new Set(['riv', 'riv_max', 'qty', 'MIN', 'MAX']);
const CHIAVI_MIN = ['altezza_min', 'h_min', 'hMin'], CHIAVI_MAX = ['h_max', 'hMax'];
const RUOLI = { box: 'Box portafrutti da premontare', box_fisso: 'Box fisso (già compreso)', scatola_massetto: 'Scatola da massetto', scatole_massetto: 'Scatola da massetto', piedini: 'Piedini',
  estensioni: 'Estensione in altezza', accessori_interni: 'Accessorio interno', accessorio_h: 'Accessorio per l\'altezza', accessorio_obbligatorio: 'Accessorio obbligatorio', accessorio_sempre: 'Accessorio sempre compreso',
  accessorio_obbligatorio_per_box: 'Accessorio obbligatorio con il box', accessorio_obbligatorio_per_uscita: 'Accessorio obbligatorio con l\'uscita' };
// elenchi a cui si possono aggiungere righe nuove (Ruolo → nome dell'elenco nei dati)
const ELENCHI_NUOVI = { 'box portafrutti da premontare': 'box', 'scatola da massetto': 'scatole_massetto', piedini: 'piedini', 'estensione in altezza': 'estensioni', 'accessorio interno': 'accessori_interni' };

const leggi = (o, c) => c.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function scrivi(o, c, v) {
  const p = c.split('.'); let a = o;
  for (let i = 0; i < p.length - 1; i++) { if (a[p[i]] == null) a[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; a = a[p[i]]; }
  a[p[p.length - 1]] = v;
}
const aPercorso = (DB, id) => id.split('/').reduce((a, k) => (a == null ? a : a[k]), DB);
const cella = (o, campo) => {
  if (campo === 'MIN') return CHIAVI_MIN.map((k) => o[k]).find((v) => v != null) ?? '';
  if (campo === 'MAX') return CHIAVI_MAX.map((k) => o[k]).find((v) => v != null) ?? '';
  return lista(leggi(o, campo));
};

/** dati → { sistemi, gruppi, varianti, componenti }: ogni foglio è un elenco di righe (la prima è l'intestazione) */
export function esporta(DB) {
  const F = { sistemi: [SISTEMI.map((c) => c[0])], gruppi: [GRUPPI.map((c) => c[0])], varianti: [VARIANTI.map((c) => c[0])], componenti: [COMPONENTI.map((c) => c[0])] };
  for (const [k, s] of Object.entries(DB)) {
    F.sistemi.push(SISTEMI.map(([, c], i) => (i === 0 ? k : cella(s, c))));
    const varianti = (righe, base, g) => (righe || []).forEach((r, i) => F.varianti.push(VARIANTI.map(([t, c]) => (t === 'ID' ? `${base}/righe/${i}` : t === 'Sistema' ? s.label : t === 'Gruppo' ? (g ? g.label : '') : t.startsWith('Significato') ? lista(s.colonne) : cella(r, c)))));
    const componenti = (o, base, g) => {
      for (const [chiave, ruolo] of Object.entries(RUOLI)) {
        const v = o[chiave]; if (v == null) continue;
        const riga = (x, id, extra) => F.componenti.push(COMPONENTI.map(([t, c]) => (t === 'ID' ? id : t === 'Sistema' ? s.label : t === 'Gruppo' ? (g ? g.label : '') : t === 'Ruolo' ? ruolo + (extra ? ` ${extra}` : '') : cella(x, c))));
        if (Array.isArray(v)) v.forEach((x, i) => riga(x, `${base}/${chiave}/${i}`));
        else if (chiave.includes('_per_')) Object.entries(v).forEach(([q, x]) => riga(x, `${base}/${chiave}/${q}`, q));
        else riga(v, `${base}/${chiave}`);
      }
    };
    varianti(s.righe, k); componenti(s, k);
    (s.gruppi || []).forEach((g, j) => {
      F.gruppi.push(GRUPPI.map(([t, c]) => (t === 'ID' ? `${k}/gruppi/${j}` : t === 'Sistema' ? s.label : cella(g, c))));
      varianti(g.righe, `${k}/gruppi/${j}`, g); componenti(g, `${k}/gruppi/${j}`, g);
    });
  }
  return F;
}

/** valore di una cella come arriva dalla tabella condivisa (Claude Sheets): testo con apostrofo, numero, oggetto con formato */
export function testoCella(v) {
  if (v == null) return '';
  if (typeof v === 'object') return testoCella(v.value ?? v.number ?? v.markdown ?? v.shown ?? v.date ?? '');
  const t = String(v);
  return t.startsWith("'") ? t.slice(1) : t;
}
/** risposta di una lettura del foglio ({ rows: { "1": [...], "2": [...] } }) → elenco di righe */
export function daLettura(lettura) {
  const rows = (lettura && lettura.rows) || {}, n = Math.max(0, ...Object.keys(rows).map(Number)), out = [];
  for (let i = 1; i <= n; i++) out.push((rows[i] || []).map(testoCella));
  const larghezza = out[0] ? out[0].length : 0;
  return out.map((r) => { while (r.length < larghezza) r.push(''); return r; });
}

/** fogli corretti → nuova copia dei dati; `diff` elenca che cosa è cambiato, `errori` le righe non applicabili */
export function importa(base, F) {
  const DB = structuredClone(base), diff = [], errori = [];
  const applica = (o, id, colonne, riga, intest) => {
    colonne.forEach(([t, c]) => {
      if (!c) return;
      const i = intest.indexOf(t); if (i < 0) return;
      let nuovo = riga[i] == null ? '' : String(riga[i]).trim();
      let campo = c;
      if (c === 'MIN' || c === 'MAX') { const ch = c === 'MIN' ? CHIAVI_MIN : CHIAVI_MAX; campo = ch.find((k) => o[k] != null) || (o._el === 'piedini' || o.hMin != null || o.hMax != null ? ch[ch.length - 1] : c === 'MIN' && (o._el === 'box' || o.pavimenti_ok) ? 'altezza_min' : ch[c === 'MIN' ? 1 : 0]); }
      const vecchio = leggi(o, campo), testoVecchio = lista(vecchio);
      if (String(testoVecchio).trim() === nuovo) return;
      let valore = nuovo;
      if (NUMERI.has(c)) valore = nuovo === '' ? undefined : num(nuovo);
      else if (c === 'pavimenti' || c === 'pavimenti_ok') valore = daLista(nuovo);
      else if (nuovo === '') valore = c.startsWith('codici.') ? null : c.startsWith('note_righe.') ? '' : undefined;
      if (valore === undefined) { const p = campo.split('.'), padre = p.length > 1 ? leggi(o, p.slice(0, -1).join('.')) : o; if (padre) delete padre[p[p.length - 1]]; } else scrivi(o, campo, valore);
      diff.push(`${id} · ${t}: «${testoVecchio}» → «${nuovo}»`);
    });
  };
  const foglio = (nome, colonne, nuovaRiga) => {
    const righe = F[nome] || []; if (!righe.length) return;
    const intest = righe[0].map((x) => String(x).trim());
    righe.slice(1).forEach((riga, n) => {
      if (riga.every((x) => x == null || String(x).trim() === '')) return;
      const id = String(riga[intest.indexOf(nome === 'sistemi' ? 'Chiave' : 'ID')] ?? '').trim();
      let o = id ? aPercorso(DB, id) : null;
      if (!o && nuovaRiga) o = nuovaRiga(riga, intest, n + 2);
      if (!o) { errori.push(`${nome}, riga ${n + 2}: ${id ? `ID «${id}» non trovato` : 'riga nuova non collocabile (controlla Sistema, Gruppo e Ruolo)'}`); return; }
      applica(o, id || `${nome} riga ${n + 2} (nuova)`, colonne, riga, intest);
    });
  };
  const trova = (riga, intest) => {
    const nomeS = String(riga[intest.indexOf('Sistema')] ?? '').trim().toLowerCase(), nomeG = String(riga[intest.indexOf('Gruppo')] ?? '').trim().toLowerCase();
    const k = Object.keys(DB).find((x) => x.toLowerCase() === nomeS || String(DB[x].label).toLowerCase() === nomeS); if (!k) return null;
    const s = DB[k], g = nomeG ? (s.gruppi || []).find((x) => String(x.label).toLowerCase() === nomeG || String(x.id).toLowerCase() === nomeG) : null;
    return nomeG && !g ? null : g || s;
  };
  foglio('sistemi', SISTEMI);
  foglio('gruppi', GRUPPI);
  foglio('varianti', VARIANTI, (riga, intest) => { const p = trova(riga, intest); if (!p || (p.gruppi && !p.righe)) return null; const r = {}; (p.righe = p.righe || []).push(r); return r; });
  foglio('componenti', COMPONENTI, (riga, intest) => { const p = trova(riga, intest), el = ELENCHI_NUOVI[String(riga[intest.indexOf('Ruolo')] ?? '').trim().toLowerCase()]; if (!p || !el) return null; const r = {}; Object.defineProperty(r, '_el', { value: el, enumerable: false }); (p[el] = p[el] || []).push(r); return r; });
  return { DB, diff, errori };
}

// ---------- CSV ----------
const csv = (righe) => righe.map((r) => r.map((v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n') + '\n';
export function daCsv(t) {
  const righe = []; let riga = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { riga.push(c); c = ''; } else if (ch === '\n') { riga.push(c); righe.push(riga); riga = []; c = ''; } else if (ch !== '\r') c += ch; }
  if (c !== '' || riga.length) { riga.push(c); righe.push(riga); }
  return righe;
}
const NOMI = ['sistemi', 'gruppi', 'varianti', 'componenti'];
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , azione, cartella = '.'] = process.argv, base = JSON.parse(fs.readFileSync(FILE_DATI, 'utf8'));
  if (azione === 'esporta') { const F = esporta(base); fs.mkdirSync(cartella, { recursive: true }); NOMI.forEach((n) => fs.writeFileSync(path.join(cartella, `${n}.csv`), csv(F[n]))); console.log(NOMI.map((n) => `${n}: ${F[n].length - 1} righe`).join(', ')); }
  else if (azione === 'importa') {
    const F = {}; NOMI.forEach((n) => { const f = path.join(cartella, `${n}.csv`); if (fs.existsSync(f)) F[n] = daCsv(fs.readFileSync(f, 'utf8')); });
    const { DB, diff, errori } = importa(base, F);
    console.log(diff.length ? diff.join('\n') : 'Nessuna differenza.'); if (errori.length) console.log('\nDA CONTROLLARE:\n' + errori.join('\n'));
    if (diff.length && !process.argv.includes('--prova')) { fs.writeFileSync(FILE_DATI, JSON.stringify(DB, null, 1) + '\n'); console.log(`\nAggiornato ${path.relative(process.cwd(), FILE_DATI)}: ora esegui bash strumenti/torrette/compila.sh`); }
  } else if (azione === 'importa-json') {
    // file JSON { sistemi: <lettura>, gruppi: <lettura>, varianti: <lettura>, componenti: <lettura> } con le letture dei fogli
    const letto = JSON.parse(fs.readFileSync(cartella, 'utf8')), F = {}; NOMI.forEach((n) => { if (letto[n]) F[n] = daLettura(letto[n]); });
    const { DB, diff, errori } = importa(base, F);
    console.log(diff.length ? diff.join('\n') : 'Nessuna differenza.'); if (errori.length) console.log('\nDA CONTROLLARE:\n' + errori.join('\n'));
    if (diff.length && !process.argv.includes('--prova')) { fs.writeFileSync(FILE_DATI, JSON.stringify(DB, null, 1) + '\n'); console.log('\nAggiornato dati-sistemi.json: ora esegui bash strumenti/torrette/compila.sh'); }
  } else console.log('Uso: node strumenti/torrette/tabella.mjs esporta|importa <cartella> [--prova]  |  importa-json <file.json> [--prova]');
}
