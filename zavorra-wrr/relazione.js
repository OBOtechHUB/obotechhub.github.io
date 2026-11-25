// Relazione per il cliente del calcolo della zavorra (OBO Magic PV Mount WRR).
// Modulo puro: dai dati del calcolo prepara un "documento" (blocchi) e lo scrive come pagina HTML da stampare/salvare
// in PDF oppure come file Word (.docx) senza librerie. Nessun testo delle istruzioni OBO è copiato: solo valori e riferimenti.
import { COLS, SPEEDS, FRAMES, TABNO, MODE_LABELS, fmt, compute, windTable } from './calc.js';

export const FONTE_URL = 'https://www.obo-bettermann.com/out/media/01-100_MA_Magic_PV_Mount_Wechselrichterrahmen_EN_2026-07-28.pdf';
const SOCIETA = 'OBO Bettermann S.r.l. · Via C. Ferrero 16 · 10098 Rivoli (TO) · Tel. +39 011 9548 811 · tecnico@obo.it · www.obo.it';

const tipo = (fr) => (fr.wall ? 'telaio a parete' : fr.double ? 'telaio autoportante bifacciale' : 'telaio autoportante monofacciale');
const kg = (v, d = 0) => `${fmt(v, d)} kg`;

/**
 * @param {object} d { state, cliente, riferimento, codice, progetto, luogo, autore, note, data (Date) }
 * @returns {{titolo:string, blocchi:Array}} blocchi: {h1|h2|p|tab|lista|risultato|nota}
 */
export function documento(d) {
  const state = d.state, fr = FRAMES[state.frame], r = compute(state), tab = windTable(state);
  const data = (d.data || new Date()).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const B = [];
  const titolo = 'Relazione di calcolo · Zavorra del telaio per inverter';
  // intestazione con i dati del progetto
  B.push({ t: 'dati', righe: [
    ['Cliente', d.cliente || '—'],
    ['Impianto / riferimento', [d.progetto, d.riferimento].filter(Boolean).join(' · ') || '—'],
    ['Luogo', d.luogo || '—'],
    ['Numero progetto', d.codice || '—'],
    ['Data', data],
    ['Redatto da', d.autore ? `${d.autore} · Ufficio tecnico OBO Italia` : 'Ufficio tecnico OBO Italia'],
  ] });

  B.push({ t: 'h2', x: '1. Oggetto' });
  B.push({ t: 'p', x: fr.wall
    ? `La presente relazione riporta la verifica indicativa dell'azione del vento sulle apparecchiature montate sul telaio OBO Magic PV Mount ${fr.name} (art. ${fr.code}), ${tipo(fr)}. Il telaio a parete non richiede zavorra: va fissato alla struttura di supporto con ancoraggi adeguati.`
    : `La presente relazione riporta il calcolo della zavorra necessaria a garantire la stabilità al vento del telaio OBO Magic PV Mount ${fr.name} (art. ${fr.code}), ${tipo(fr)}, con le apparecchiature elettriche indicate al punto 2, secondo il metodo delle istruzioni di montaggio OBO del telaio.` });

  B.push({ t: 'h2', x: '2. Dati di progetto' });
  B.push({ t: 'tab', intest: ['Dato', 'Valore'], righe: [
    ['Telaio', `${fr.name} · art. ${fr.code}`],
    ['Tipo', tipo(fr)],
    ['Larghezza utile del telaio', `${fmt(fr.w)} mm`],
    ...(fr.wall ? [] : [['Inclinazione della tettoia', `${state.pitch}°`]]),
    ['Velocità del vento di progetto', `${fmt(state.wind)} km/h`],
    ...(fr.wall ? [] : [['Criterio di lettura delle tabelle', MODE_LABELS[state.calcMode] || state.calcMode]]),
  ] });
  const devs = state.devs.filter((x) => x.q > 0);
  B.push({ t: 'p', x: 'Apparecchiature fissate al telaio (dati delle schede tecniche forniti dal cliente):' });
  B.push({ t: 'tab', intest: ['Apparecchiatura', ...(fr.double ? ['Lato'] : []), 'Larghezza mm', 'Altezza mm', 'Peso kg', 'Q.tà', 'Area frontale cm²'], num: true,
    righe: devs.length ? devs.map((x) => [x.d || 'Apparecchiatura', ...(fr.double ? [x.side || 'A'] : []), fmt(x.w), fmt(x.h), fmt(x.kg, 1), fmt(x.q), fmt(x.w * x.h / 100 * x.q)]) : [['Nessuna apparecchiatura inserita']] });
  B.push({ t: 'p', x: fr.double
    ? `Area frontale: lato A ${fmt(r.sideArea.A)} cm², lato B ${fmt(r.sideArea.B)} cm²; nel calcolo si considera il lato più caricato (${fmt(r.area)} cm²). Peso totale delle apparecchiature: ${kg(r.weight, 1)}.`
    : `Area frontale complessiva: ${fmt(r.area)} cm². Peso totale delle apparecchiature: ${kg(r.weight, 1)}.` });

  B.push({ t: 'h2', x: '3. Metodo di calcolo' });
  if (fr.wall) {
    B.push({ t: 'p', x: 'Per i telai a parete le istruzioni OBO non prevedono zavorra. Si riporta la spinta indicativa del vento sulle apparecchiature, utile per la scelta degli ancoraggi: spinta = pressione cinetica del vento × area frontale, con pressione cinetica q = ½ · ρ · v² (ρ = 1,25 kg/m³), senza coefficienti di forza e di esposizione.' });
  } else {
    B.push({ t: 'p', x: `Il valore di riferimento si ricava dalle tabelle del capitolo 11 delle istruzioni di montaggio OBO Magic PV Mount (tabella ${TABNO[r.tab] ?? '–'}: telaio da ${fmt(fr.w)} mm, inclinazione ${state.pitch}°) in funzione della velocità del vento e dell'area frontale delle apparecchiature. Le tabelle coprono velocità da ${SPEEDS[0]} a ${SPEEDS[SPEEDS.length - 1]} km/h e aree da ${fmt(COLS[0])} a ${fmt(COLS[COLS.length - 1])} cm².` });
    B.push({ t: 'p', x: `Zavorra = valore di tabella − peso delle apparecchiature${fr.double ? '; per il telaio bifacciale la zavorra si ripartisce in parti uguali sui due lati' : ''}. Se il peso delle apparecchiature supera il valore di tabella non è necessaria zavorra aggiuntiva.` });
  }

  B.push({ t: 'h2', x: '4. Risultato' });
  if (fr.wall) {
    B.push({ t: 'risultato', grande: '0 kg di zavorra', sotto: `Spinta indicativa del vento a ${fmt(state.wind)} km/h: ${fmt(r.force, 2)} kN (≈ ${kg(r.force * 102)}) su ${fmt(r.area / 10000, 2)} m² di apparecchiature` });
  } else if (r.err) {
    B.push({ t: 'risultato', grande: 'Non calcolabile', sotto: r.err, male: true });
  } else {
    B.push({ t: 'risultato', grande: `${kg(Math.ceil(r.total))}${r.paren ? ' *' : ''}`, sotto: fr.double ? `zavorra totale, pari a ${kg(Math.ceil(r.perSide))} per lato, distribuita in modo uniforme` : 'zavorra totale sul telaio' });
    B.push({ t: 'tab', intest: ['Passaggio', 'Valore'], righe: [
      ['Valore di tabella', `${kg(r.table, 1)}${r.paren ? ' *' : ''}`],
      ['Peso delle apparecchiature', `− ${kg(r.weight, 1)}`],
      ['Zavorra totale', `${kg(Math.max(0, r.raw), 1)}${r.raw < 0 ? ' (peso delle apparecchiature sufficiente)' : ''}`],
      ...(fr.double ? [['Zavorra per lato', kg(r.perSide, 1)]] : []),
    ] });
  }

  B.push({ t: 'h2', x: '5. Zavorra per le diverse velocità del vento' });
  B.push({ t: 'p', x: fr.wall ? 'Spinta indicativa del vento sulle apparecchiature in funzione della velocità:' : 'Per completezza si riporta la zavorra necessaria per tutte le velocità delle tabelle OBO, con le stesse apparecchiature:' });
  B.push({ t: 'tab', num: true, evid: !r.err && !fr.wall && r.rp && r.rp.kind === 'single' ? r.rp.i : -1,
    intest: fr.wall ? ['Vento km/h', 'Pressione kN/m²', 'Spinta kN'] : ['Vento km/h', 'Pressione kN/m²', 'Zavorra totale kg', ...(fr.double ? ['Per lato kg'] : [])],
    righe: tab.map((x) => fr.wall
      ? [String(x.kmh), fmt(x.pressure, 2), x.force == null ? '–' : fmt(x.force, 2)]
      : [String(x.kmh), fmt(x.pressure, 2), x.ballast == null ? '–' : fmt(x.ballast) + (x.verify ? ' *' : ''), ...(fr.double ? [x.perSide == null ? '–' : fmt(x.perSide) + (x.verify ? ' *' : '')] : [])]) });

  B.push({ t: 'h2', x: '6. Note e verifiche a cura del progettista' });
  const note = [];
  if (r.paren || tab.some((x) => x.verify)) note.push('I valori contrassegnati con * corrispondono a casi per i quali le tabelle OBO richiedono un calcolo strutturale specifico: vanno confermati con l\'ufficio tecnico OBO prima dell\'installazione.');
  if (!fr.wall && r.raw < 0) note.push('Il peso delle apparecchiature supera il valore di tabella: secondo il metodo OBO non è necessaria zavorra aggiuntiva.');
  if (fr.double && r.sideArea.A > 0 && r.sideArea.B === 0) note.push('Telaio bifacciale con apparecchiature su un solo lato: la zavorra va comunque distribuita in modo uniforme sui due lati.');
  note.push('Il calcolo usa il peso reale delle apparecchiature indicato: un peso inferiore aumenta la zavorra della stessa quantità.');
  note.push('I valori considerano il solo carico del vento. Restano da verificare a cura del progettista dell\'impianto: carico da neve (zona, quota, accumuli), velocità del vento di progetto per il sito (zona, quota, categoria di esposizione, altezza dell\'edificio), portata della copertura per peso di telaio, apparecchiature e zavorra, scorrimento sulla copertura, spazi di ventilazione richiesti dal costruttore delle apparecchiature.');
  if (fr.wall) note.push('La spinta è indicativa: la scelta degli ancoraggi e la verifica della parete spettano al costruttore del fissaggio o a un tecnico abilitato.');
  if (d.note) note.push(d.note);
  B.push({ t: 'lista', voci: note });

  B.push({ t: 'h2', x: '7. Riferimenti e limiti' });
  B.push({ t: 'p', x: 'Riferimento: OBO Bettermann, istruzioni di montaggio «Magic PV Mount – telaio per inverter», edizione 07/2026, capitolo 11.' });
  B.push({ t: 'p', x: 'La presente relazione è uno strumento di supporto alla scelta dei prodotti OBO e si basa sui dati forniti dal cliente. Non sostituisce la progettazione strutturale dell\'impianto, che resta a cura di un tecnico abilitato.' });
  return { titolo, blocchi: B, fr, r };
}

// ---------- pagina HTML (stampa / PDF) ----------
const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function paginaHTML(doc, logoUrl) {
  const corpo = doc.blocchi.map((b) => {
    if (b.t === 'dati') return `<table class="dati">${b.righe.map(([k, v]) => `<tr><th>${e(k)}</th><td>${e(v)}</td></tr>`).join('')}</table>`;
    if (b.t === 'h2') return `<h2>${e(b.x)}</h2>`;
    if (b.t === 'p') return `<p>${e(b.x)}</p>`;
    if (b.t === 'lista') return `<ul>${b.voci.map((v) => `<li>${e(v)}</li>`).join('')}</ul>`;
    if (b.t === 'risultato') return `<div class="ris${b.male ? ' male' : ''}"><b>${e(b.grande)}</b><span>${e(b.sotto)}</span></div>`;
    if (b.t === 'tab') return `<table class="t${b.num ? ' num' : ''}"><thead><tr>${b.intest.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${b.righe.map((r, i) => `<tr${i === b.evid ? ' class="ev"' : ''}>${r.map((c) => `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return '';
  }).join('\n');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(doc.titolo)}</title>
<style>
@page{size:A4;margin:16mm 16mm 18mm}
*{box-sizing:border-box}body{margin:0;background:#e4ebed;color:#282a31;font:10.5pt/1.45 "Nimbus Sans L","Nimbus Sans",Arial,Helvetica,sans-serif}
.foglio{max-width:210mm;margin:16px auto;background:#fff;padding:16mm;box-shadow:0 4px 20px rgba(0,0,0,.12)}
.testa{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid #f39b00;padding-bottom:10px;margin-bottom:14px}
.testa img{height:44px}.testa .soc{font-size:8pt;color:#41525d;text-align:right}
h1{font-size:17pt;margin:0 0 4px;color:#282a31}.sott{color:#41525d;margin:0 0 12px}
h2{font-size:12pt;color:#282a31;margin:18px 0 6px;padding-bottom:3px;border-bottom:1px solid #c5d9de;break-after:avoid}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;break-inside:avoid}
.dati th{width:34%;text-align:left;font-weight:600;color:#41525d;padding:4px 8px;background:#e4ebed;border-bottom:1px solid #fff}.dati td{padding:4px 8px;border-bottom:1px solid #e4ebed}
.t th{background:#41525d;color:#fff;text-align:left;padding:5px 8px;font-weight:600}.t td{padding:4px 8px;border-bottom:1px solid #e4ebed}.t tbody tr:nth-child(even) td{background:#f4f7f8}
.t.num td:not(:first-child),.t.num th:not(:first-child){text-align:right}.t tr.ev td{background:#fde9c4!important;font-weight:700}
.ris{border:2px solid #f39b00;border-radius:6px;padding:10px 14px;margin:8px 0 10px;display:flex;flex-direction:column}.ris b{font-size:20pt;color:#282a31}.ris span{color:#41525d}.ris.male{border-color:#c0392b}
ul{margin:4px 0 8px;padding-left:18px}li{margin:3px 0}
.piede{margin-top:22px;padding-top:8px;border-top:1px solid #c5d9de;font-size:7.5pt;color:#7694a4}
.firma{display:flex;justify-content:flex-end;margin-top:26px}.firma div{width:60mm;border-top:1px solid #41525d;padding-top:4px;text-align:center;font-size:9pt;color:#41525d}
.barra{position:sticky;top:0;background:#282a31;padding:10px;display:flex;gap:8px;justify-content:center;z-index:2}
.barra button{border:0;border-radius:999px;padding:8px 18px;font-weight:600;cursor:pointer;background:#f39b00;color:#fff;font-size:14px}.barra button.sec{background:#fff;color:#282a31}
@media print{body{background:#fff}.barra{display:none}.foglio{margin:0;padding:0;box-shadow:none;max-width:none}}
@media (max-width:700px){.foglio{padding:18px;margin:0}}
</style></head><body>
<div class="barra"><button type="button" onclick="print()">Stampa o salva PDF</button><button type="button" class="sec" onclick="close()">Chiudi</button></div>
<div class="foglio">
<div class="testa">${logoUrl ? `<img src="${e(logoUrl)}" alt="OBO Bettermann">` : '<b>OBO Bettermann</b>'}<div class="soc"><b>OBO Bettermann S.r.l.</b><br>Ufficio tecnico</div></div>
<h1>${e(doc.titolo)}</h1><p class="sott">OBO Magic PV Mount ${e(doc.fr.name)} · art. ${e(doc.fr.code)}</p>
${corpo}
<div class="firma"><div>Ufficio tecnico OBO Italia</div></div>
<div class="piede">${e(SOCIETA)}</div>
</div></body></html>`;
}

// ---------- Word (.docx) senza librerie ----------
const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const run = (t, o = {}) => `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>${o.b ? '<w:b/>' : ''}${o.c ? `<w:color w:val="${o.c}"/>` : ''}<w:sz w:val="${o.sz || 20}"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
const par = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 100}"/>${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}${o.bordo ? `<w:pBdr><w:bottom w:val="single" w:sz="${o.bordo}" w:space="2" w:color="${o.bordoC || 'C5D9DE'}"/></w:pBdr>` : ''}${o.num ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}</w:pPr>${runs}</w:p>`;
const cella = (t, o = {}) => `<w:tc><w:tcPr>${o.w ? `<w:tcW w:w="${o.w}" w:type="dxa"/>` : ''}${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ''}</w:tcPr>${par(run(t, { b: o.b, c: o.c, sz: 18 }), { after: 0, jc: o.jc })}</w:tc>`;
function tabella(intest, righe, o = {}) {
  const bordi = '<w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="E4EBED"/><w:insideH w:val="single" w:sz="4" w:color="E4EBED"/></w:tblBorders>';
  const testa = intest ? `<w:tr><w:trPr><w:tblHeader/></w:trPr>${intest.map((h, i) => cella(h, { fill: '41525D', c: 'FFFFFF', b: true, jc: o.num && i ? 'right' : 'left' })).join('')}</w:tr>` : '';
  const corpo = righe.map((r, ri) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cella(c, {
    fill: o.dati && i === 0 ? 'E4EBED' : ri === o.evid ? 'FDE9C4' : ri % 2 ? 'F4F7F8' : undefined, b: (o.dati && i === 0) || ri === o.evid, c: o.dati && i === 0 ? '41525D' : undefined,
    jc: o.num && i ? 'right' : 'left', w: o.dati ? (i === 0 ? 3200 : 6400) : undefined })).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${bordi}<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>${testa}${corpo}</w:tbl>${par('', { after: 80 })}`;
}
export function docxBlob(doc, logo /* {bytes:Uint8Array, w, h} | null */) {
  const corpo = [];
  if (logo) corpo.push(`<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${Math.round(logo.w * 9525)}" cy="${Math.round(logo.h * 9525)}"/><wp:docPr id="1" name="Logo OBO"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(logo.w * 9525)}" cy="${Math.round(logo.h * 9525)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
  corpo.push(par(run(doc.titolo, { b: true, sz: 32, c: '282A31' }), { after: 40, bordo: 18, bordoC: 'F39B00' }));
  corpo.push(par(run(`OBO Magic PV Mount ${doc.fr.name} · art. ${doc.fr.code}`, { c: '41525D', sz: 22 }), { before: 60, after: 200 }));
  for (const b of doc.blocchi) {
    if (b.t === 'dati') corpo.push(tabella(null, b.righe, { dati: true }));
    else if (b.t === 'h2') corpo.push(par(run(b.x, { b: true, sz: 24, c: '282A31' }), { before: 240, after: 100, keep: true, bordo: 6 }));
    else if (b.t === 'p') corpo.push(par(run(b.x), { jc: 'both' }));
    else if (b.t === 'lista') b.voci.forEach((v) => corpo.push(par(run(v), { num: true, after: 60, jc: 'both' })));
    else if (b.t === 'risultato') corpo.push(tabella(null, [[b.grande], [b.sotto]], {}).replace(/<w:sz w:val="18"\/><\/w:rPr><w:t xml:space="preserve">([^<]*)<\/w:t>/, (m, t) => `<w:sz w:val="36"/><w:b/></w:rPr><w:t xml:space="preserve">${t}</w:t>`));
    else if (b.t === 'tab') corpo.push(tabella(b.intest, b.righe, { num: b.num, evid: b.evid }));
  }
  corpo.push(par(run('Ufficio tecnico OBO Italia', { c: '41525D' }), { before: 480, jc: 'right' }));
  const piede = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${par(run(SOCIETA, { sz: 14, c: '7694A4' }), { jc: 'center', after: 0 })}</w:ftr>`;
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${corpo.join('')}<w:sectPr><w:footerReference w:type="default" r:id="rIdPiede"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1100" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="260"/></w:pPr><w:rPr><w:color w:val="F39B00"/><w:sz w:val="14"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdPiede" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${logo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}</Relationships>`,
    'word/document.xml': documentXml,
    'word/footer1.xml': piede,
    'word/numbering.xml': numbering,
  };
  if (logo) files['word/media/logo.png'] = logo.bytes;
  return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ZIP senza compressione (sufficiente per Word)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files) {
  const enc = new TextEncoder(), parti = [], centrale = []; let off = 0;
  for (const [nome, cont] of Object.entries(files)) {
    const dati = typeof cont === 'string' ? enc.encode(cont) : cont, n = enc.encode(nome), crc = crc32(dati);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, dati.length, true); h.setUint32(22, dati.length, true); h.setUint16(26, n.length, true);
    parti.push(new Uint8Array(h.buffer), n, dati);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, dati.length, true); c.setUint32(24, dati.length, true); c.setUint16(28, n.length, true); c.setUint32(42, off, true);
    centrale.push(new Uint8Array(c.buffer), n);
    off += 30 + n.length + dati.length;
  }
  const dimC = centrale.reduce((s, p) => s + p.length, 0);
  const fine = new DataView(new ArrayBuffer(22)); fine.setUint32(0, 0x06054b50, true); fine.setUint16(8, Object.keys(files).length, true); fine.setUint16(10, Object.keys(files).length, true); fine.setUint32(12, dimC, true); fine.setUint32(16, off, true);
  const tutto = [...parti, ...centrale, new Uint8Array(fine.buffer)], out = new Uint8Array(tutto.reduce((s, p) => s + p.length, 0)); let i = 0;
  for (const p of tutto) { out.set(p, i); i += p.length; }
  return out;
}
