// Controllo notturno del sito pubblicato di OBO Hub (workflow .github/workflows/controllo.yml).
// Apre le pagine principali come un visitatore non entrato e verifica che si carichino senza errori.
// Esce con codice 1 e scrive controllo.md se qualcosa non va.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const SITO = process.env.SITO || "https://obotechhub.github.io";
const problemi = [], ok = [];
const b = await chromium.launch();

async function pagina(percorso, controlla, descrizione) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errori = [];
  p.on("pageerror", (e) => errori.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource|ERR_|net::/i.test(m.text())) errori.push(m.text()); });
  try {
    const r = await p.goto(SITO + percorso, { waitUntil: "networkidle", timeout: 45000 });
    if (!r || r.status() >= 400) throw new Error(`risposta ${r ? r.status() : "assente"}`);
    await controlla(p);
    if (errori.length) throw new Error("errori nella pagina: " + [...new Set(errori)].slice(0, 3).join(" · "));
    ok.push(`${descrizione} (${percorso})`);
  } catch (e) {
    problemi.push(`**${descrizione}** (${SITO}${percorso}): ${e.message}`);
  } finally { await p.close(); }
}
const testo = async (p, sel, atteso) => { const t = await p.locator(sel).first().innerText({ timeout: 15000 }); if (!atteso.test(t)) throw new Error(`testo inatteso in ${sel}: "${t.slice(0, 80)}"`); };

await pagina("/", (p) => testo(p, "body", /OBO/), "OBO Hub, pagina iniziale");
await pagina("/novita.html", (p) => p.waitForSelector(".voce", { timeout: 15000 }), "Pagina Novità");
await pagina("/manutenzione.html?s=app%3Aprodotti", (p) => testo(p, "h1", /maintenance|available/i), "Pagina di manutenzione");
await pagina("/appOBOtechHUB/", (p) => p.waitForSelector("main, #root > *", { timeout: 20000 }), "Progettazione LPS");
await pagina("/mappa-carichi/", (p) => testo(p, "body", /\S/), "Mappa carichi ufficio tecnico");
await pagina("/prodotti/", (p) => testo(p, "body", /\S/), "Prodotti OBO");
await pagina("/torrette/", (p) => testo(p, "body", /\S/), "Configuratore torrette");

// dati notturni dei prodotti: recenti e completi
try {
  const r = await fetch(SITO + "/prodotti/dati/stato.json?t=" + Date.now());
  const s = await r.json();
  const ore = (Date.now() - new Date(s.aggiornato).getTime()) / 36e5;
  if (ore > 36) throw new Error(`ultimo aggiornamento ${Math.round(ore)} ore fa (${s.aggiornato})`);
  if (s.prodotti < 9000) throw new Error(`solo ${s.prodotti} prodotti nell'indice`);
  ok.push(`Indice prodotti: ${s.prodotti} prodotti, ${s.conDettagli} con descrizione, aggiornato ${Math.round(ore)} ore fa`);
} catch (e) { problemi.push(`**Indice prodotti** (prodotti/dati/stato.json): ${e.message}`); }

await b.close();
const md = (problemi.length ? `## Problemi trovati\n\n${problemi.map((x) => "- " + x).join("\n")}\n\n` : "") + `## Pagine a posto\n\n${ok.map((x) => "- " + x).join("\n")}\n`;
writeFileSync("controllo.md", md);
console.log(md);
process.exit(problemi.length ? 1 : 0);
