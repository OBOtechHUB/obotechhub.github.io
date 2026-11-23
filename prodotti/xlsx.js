/*
 * Excel senza librerie esterne, tutto nel browser:
 * - leggiXlsx(arrayBuffer) → righe del primo foglio (array di array di testi)
 * - scriviXlsx(fogli) → Blob .xlsx con intestazione OBO, riga bloccata, filtri e larghezze
 * Usa solo DecompressionStream (browser recenti) e DOMParser per leggere; per scrivere crea uno ZIP non compresso.
 */

// ---------- ZIP ----------
const td = new TextDecoder();
async function inflate(dati) {
  const s = new Blob([dati]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
/** File dello ZIP: nome → funzione che restituisce i byte. */
function vociZip(buf) {
  const v = new DataView(buf), u = new Uint8Array(buf);
  let e = buf.byteLength - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("File Excel non valido.");
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const voci = new Map();
  for (let i = 0; i < n; i++) {
    const metodo = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true);
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const nome = td.decode(u.subarray(p + 46, p + 46 + ln));
    voci.set(nome, async () => {
      const inizio = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
      const d = u.subarray(inizio, inizio + comp);
      return metodo === 0 ? d : inflate(d);
    });
    p += 46 + ln + le + lc;
  }
  return voci;
}

// ---------- lettura ----------
const colonna = (r) => { let n = 0; for (const ch of r.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const xml = (testo) => new DOMParser().parseFromString(testo, "application/xml");
const tutto = (el, tag) => el.getElementsByTagName(tag);

export async function leggiXlsx(buf) {
  const z = vociZip(buf);
  const testo = async (nome) => (z.has(nome) ? td.decode(await z.get(nome)()) : "");
  // primo foglio dal workbook
  let foglio = "xl/worksheets/sheet1.xml";
  try {
    const wb = xml(await testo("xl/workbook.xml")), rel = xml(await testo("xl/_rels/workbook.xml.rels"));
    const id = tutto(wb, "sheet")[0]?.getAttribute("r:id");
    const t = [...tutto(rel, "Relationship")].find((r) => r.getAttribute("Id") === id)?.getAttribute("Target");
    if (t) foglio = t.startsWith("/") ? t.slice(1) : `xl/${t.replace(/^\.\//, "")}`;
  } catch { /* foglio predefinito */ }
  const condivisi = [];
  const ss = await testo("xl/sharedStrings.xml");
  if (ss) for (const si of tutto(xml(ss), "si")) condivisi.push([...tutto(si, "t")].map((t) => t.textContent).join(""));
  const doc = xml(await testo(foglio));
  const righe = [];
  for (const row of tutto(doc, "row")) {
    const riga = [];
    for (const c of tutto(row, "c")) {
      const t = c.getAttribute("t"), vEl = tutto(c, "v")[0];
      let val = vEl ? vEl.textContent : "";
      if (t === "s") val = condivisi[Number(val)] ?? "";
      else if (t === "inlineStr") val = [...tutto(c, "t")].map((x) => x.textContent).join("");
      riga[colonna(c.getAttribute("r") || "A")] = val;
    }
    righe[Number(row.getAttribute("r") || righe.length + 1) - 1] = Array.from(riga, (x) => x ?? "");
  }
  return Array.from(righe, (x) => x ?? []);
}

/** CSV con ; o , (listini esportati come testo). */
export function leggiCsv(testo) {
  const sep = (testo.split("\n")[0].match(/;/g) || []).length >= (testo.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  const righe = []; let riga = [], campo = "", virg = false;
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    if (virg) { if (ch === '"') { if (testo[i + 1] === '"') { campo += '"'; i++; } else virg = false; } else campo += ch; }
    else if (ch === '"') virg = true;
    else if (ch === sep) { riga.push(campo); campo = ""; }
    else if (ch === "\n") { riga.push(campo.replace(/\r$/, "")); righe.push(riga); riga = []; campo = ""; }
    else campo += ch;
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga); }
  return righe;
}

// ---------- scrittura ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (d) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(file) {
  const te = new TextEncoder(), parti = [], centrale = []; let off = 0;
  for (const [nome, testo] of file) {
    const n = te.encode(nome), d = te.encode(testo), c = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
    parti.push(new Uint8Array(h.buffer), n, d);
    const k = new DataView(new ArrayBuffer(46));
    k.setUint32(0, 0x02014b50, true); k.setUint16(4, 20, true); k.setUint16(6, 20, true); k.setUint16(8, 0x0800, true); k.setUint32(16, c, true); k.setUint32(20, d.length, true); k.setUint32(24, d.length, true); k.setUint16(28, n.length, true); k.setUint32(42, off, true);
    centrale.push(new Uint8Array(k.buffer), n);
    off += 30 + n.length + d.length;
  }
  const lc = centrale.reduce((s, x) => s + x.length, 0), f = new DataView(new ArrayBuffer(22));
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, file.length, true); f.setUint16(10, file.length, true); f.setUint32(12, lc, true); f.setUint32(16, off, true);
  return new Blob([...parti, ...centrale, new Uint8Array(f.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const lettera = (i) => { let s = ""; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };

/**
 * fogli: [{ nome, intestazione: [...], righe: [[...]], larghezze?: [...], link?: [indici colonne con URL] }]
 * Numeri veri restano numeri; i codici articolo si passano come testo.
 */
export function scriviXlsx(fogli) {
  const file = [];
  const nomi = fogli.map((f, i) => esc((f.nome || `Foglio${i + 1}`).replace(/[\\/?*[\]:]/g, " ").slice(0, 31)));
  file.push(["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${fogli.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`]);
  file.push(["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
  file.push(["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${nomi.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${fogli.map((f, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${nomi[i].replace(/'/g, "''")}'!$A$1:$${lettera(f.intestazione.length - 1)}$${f.righe.length + 1}</definedName>`).join("")}</definedNames></workbook>`]);
  file.push(["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fogli.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${fogli.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
  // stili: 0 normale, 1 intestazione OBO (bianco su #41525D), 2 link, 3 riga alternata, 4 link su riga alternata
  file.push(["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><u/><sz val="10"/><color rgb="FF41525D"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF41525D"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4EBED"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="medium"><color rgb="FFF39B00"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf fontId="0" applyFont="1"><alignment vertical="top"/></xf><xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="2" applyFont="1"><alignment vertical="top"/></xf><xf fontId="0" fillId="3" applyFont="1" applyFill="1"><alignment vertical="top"/></xf><xf fontId="2" fillId="3" applyFont="1" applyFill="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]);
  fogli.forEach((f, i) => {
    const link = new Set(f.link || []);
    const cella = (v, r, c, s) => {
      const ref = `${lettera(c)}${r}`;
      if (v === null || v === undefined || v === "") return s ? `<c r="${ref}" s="${s}"/>` : "";
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    };
    const righe = [`<row r="1" ht="30" customHeight="1">${f.intestazione.map((v, c) => cella(String(v), 1, c, 1)).join("")}</row>`];
    f.righe.forEach((riga, k) => {
      const r = k + 2, alt = k % 2 === 1;
      righe.push(`<row r="${r}">${riga.map((v, c) => cella(v, r, c, link.has(c) && v ? (alt ? 4 : 2) : (alt ? 3 : 0))).join("")}</row>`);
    });
    const ultima = `${lettera(f.intestazione.length - 1)}${f.righe.length + 1}`;
    const cols = (f.larghezze || []).map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("");
    file.push([`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${i === 0 ? ' tabSelected="1"' : ""}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${righe.join("")}</sheetData><autoFilter ref="A1:${ultima}"/></worksheet>`]);
  });
  return zip(file);
}
