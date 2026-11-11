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
await pagina("/privacy.html", (p) => testo(p, "h1", /privacy/i), "Privacy");
await pagina("/condizioni.html", (p) => testo(p, "h1", /condizioni/i), "Condizioni d'uso");
await pagina("/appOBOtechHUB/", (p) => p.waitForSelector("main, #root > *", { timeout: 20000 }), "Progettazione LPS");
await pagina("/mappa-carichi/", (p) => testo(p, "body", /\S/), "Mappa carichi ufficio tecnico");

// su telefono nessuna pagina deve scorrere di lato
for (const percorso of ["/", "/novita.html", "/privacy.html", "/condizioni.html", "/appOBOtechHUB/", "/mappa-carichi/"]) {
  const p = await b.newPage({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  try {
    await p.goto(SITO + percorso, { waitUntil: "networkidle", timeout: 45000 });
    await p.mouse.wheel(600, 0); await p.waitForTimeout(300);
    const x = await p.evaluate(() => ({ largo: document.documentElement.scrollWidth, schermo: innerWidth, sx: scrollX }));
    if (x.sx > 0) throw new Error(`la pagina scorre di lato di ${x.sx} px (contenuto largo ${x.largo} px su ${x.schermo})`);
    ok.push(`Telefono, niente scorrimento laterale: ${percorso}`);
  } catch (e) { problemi.push(`**Telefono** (${SITO}${percorso}): ${e.message}`); }
  finally { await p.close(); }
}

await b.close();
const md = (problemi.length ? `## Problemi trovati\n\n${problemi.map((x) => "- " + x).join("\n")}\n\n` : "") + `## Pagine a posto\n\n${ok.map((x) => "- " + x).join("\n")}\n`;
writeFileSync("controllo.md", md);
console.log(md);
process.exit(problemi.length ? 1 : 0);
