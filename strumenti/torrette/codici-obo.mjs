// Genera torrette/codici-obo.js: per ogni codice OBO usato dal configuratore, la pagina del prodotto su obo.it
// (dal catalogo prodotti/dati/prodotti.json). Lo usa la distinta in Excel. Uso: node strumenti/torrette/codici-obo.mjs
import { readFileSync, writeFileSync } from "node:fs";
const testo = ["torrette/sorgente/configuratore-ufs.jsx", "torrette/sorgente/dati-sistemi.json"].map((f) => readFileSync(f, "utf8")).join("\n");
const usati = new Set(testo.match(/\b\d{7}\b/g) || []);
const mappa = {};
for (const p of JSON.parse(readFileSync("prodotti/dati/prodotti.json", "utf8"))) {
  const cod = String(p[0] ?? "").replace(/\s/g, "");
  if (usati.has(cod) && typeof p[3] === "string" && p[3].startsWith("/")) mappa[cod] = p[3];
}
writeFileSync("torrette/codici-obo.js", "/* Generato da strumenti/torrette/codici-obo.mjs (non modificare a mano): codice OBO → pagina su www.obo.it */\nexport const CODICI_OBO = " + JSON.stringify(mappa) + ";\n");
console.log(`torrette/codici-obo.js: ${Object.keys(mappa).length} codici con pagina obo.it su ${usati.size} usati`);
