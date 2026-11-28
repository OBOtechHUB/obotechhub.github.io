// Genera torrette/codici-obo.js: per ogni codice OBO usato dal configuratore, la pagina del prodotto su obo.it
// (dal catalogo prodotti/dati/prodotti.json). Lo usa la distinta in Excel. Scrive anche torrette/sorgente/foto-obo.json:
// per ogni sistema le foto di obo.it delle sue torrette e coperchi (non box e accessori), per la galleria del configuratore.
// Uso: node strumenti/torrette/codici-obo.mjs (lo chiama compila.sh prima di compilare)
import { readFileSync, writeFileSync } from "node:fs";
const testo = ["torrette/sorgente/configuratore-ufs.jsx", "torrette/sorgente/dati-sistemi.json"].map((f) => readFileSync(f, "utf8")).join("\n");
const usati = new Set(testo.match(/\b\d{7}\b/g) || []);
const mappa = {}, catalogo = JSON.parse(readFileSync("prodotti/dati/prodotti.json", "utf8")), perCodice = {};
for (const p of catalogo) perCodice[String(p[0] ?? "").replace(/\s/g, "")] = p;
const DB = JSON.parse(readFileSync("torrette/sorgente/dati-sistemi.json", "utf8")), fotoSistemi = {}, codiciSistemi = {};
const pulisci = (c) => String(c ?? "").replace(/[^\d]/g, "");
for (const [k, s] of Object.entries(DB)) {
  const codici = [], righe = (r) => (r || []).forEach((x) => [x.codice, ...(x.codici || [])].forEach((c) => { c = pulisci(c); if (c.length === 7 && !codici.includes(c)) codici.push(c); }));
  righe(s.righe); (s.gruppi || []).forEach((g) => righe(g.righe));
  codiciSistemi[k] = codici.map((c) => perCodice[c] && { codice: c, nome: String(perCodice[c][1] || "").replace(/\s+/g, " ").trim(), pagina: perCodice[c][3] ? "https://www.obo.it" + perCodice[c][3] : "" }).filter(Boolean).slice(0, 40);
  const viste = new Set(), out = [];
  for (const c of codici) {
    const p = perCodice[c]; if (!p) continue;
    const foto = p.find((x) => typeof x === "string" && /^https:\/\/www\.obo\.it\/out\/pictures\/.+\.(jpe?g|png)$/i.test(x));
    if (!foto || viste.has(foto)) continue; viste.add(foto);
    out.push({ codice: c, nome: String(p[1] || "").replace(/\s+/g, " ").trim(), foto });
    if (out.length >= 8) break;
  }
  if (out.length) fotoSistemi[k] = out;
}
writeFileSync("torrette/sorgente/codici-sistemi.json", JSON.stringify(codiciSistemi, null, 1) + "\n");
writeFileSync("torrette/sorgente/foto-obo.json", JSON.stringify(fotoSistemi, null, 1) + "\n");
console.log(`torrette/sorgente/foto-obo.json: ${Object.keys(fotoSistemi).length} sistemi con foto di obo.it`);
for (const p of catalogo) {
  const cod = String(p[0] ?? "").replace(/\s/g, "");
  if (usati.has(cod) && typeof p[3] === "string" && p[3].startsWith("/")) mappa[cod] = p[3];
}
writeFileSync("torrette/codici-obo.js", "/* Generato da strumenti/torrette/codici-obo.mjs (non modificare a mano): codice OBO → pagina su www.obo.it */\nexport const CODICI_OBO = " + JSON.stringify(mappa) + ";\n");
console.log(`torrette/codici-obo.js: ${Object.keys(mappa).length} codici con pagina obo.it su ${usati.size} usati`);
