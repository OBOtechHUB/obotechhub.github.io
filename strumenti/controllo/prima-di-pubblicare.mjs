// Controllo PRIMA della pubblicazione (workflow pubblica.yml): lavora sulla cartella "site" appena preparata.
// Se qualcosa non va la pubblicazione si ferma e il sito resta quello di prima.
//  1. ogni .js è sintatticamente valido, ogni .json si legge;
//  2. ogni file locale richiamato da una pagina HTML (script, css, immagini, link) esiste davvero in "site"
//     (es. crm-import.js non copiato = 404, 25/11/2026);
//  3. le pagine principali si aprono in Chromium senza errori JavaScript e senza file dello stesso sito mancanti
//     (le chiamate esterne, Supabase compreso, vengono bloccate: si controlla solo il codice).
// Uso: node strumenti/controllo/prima-di-pubblicare.mjs [cartella]   (predefinita: site)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";

const SITE = resolve(process.argv[2] || "site");
const problemi = [];
const tutti = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? tutti(p) : [p]; });
const files = tutti(SITE);
const rel = (p) => relative(SITE, p);

// 1. sintassi
for (const f of files) {
  if (extname(f) === ".js") {
    try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
    catch (e) { problemi.push(`JavaScript non valido in ${rel(f)}: ${String(e.stderr || e.message).split("\n").slice(0, 4).join(" ")}`); }
  } else if (extname(f) === ".json" || extname(f) === ".webmanifest") {
    try { JSON.parse(readFileSync(f, "utf8")); } catch (e) { problemi.push(`JSON non valido in ${rel(f)}: ${e.message}`); }
  }
}
// script dentro le pagine HTML
for (const f of files.filter((f) => extname(f) === ".html")) {
  const html = readFileSync(f, "utf8");
  const blocchi = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type=["'](?:application\/(?:ld\+)?json|importmap|text\/template)["'])[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  blocchi.forEach((codice, i) => {
    if (!codice.trim()) return;
    try { new Function(codice); } catch (e) {
      // i moduli ES (import/export) non si possono provare con new Function: si saltano
      if (!/\b(import|export)\b/.test(codice)) problemi.push(`Script ${i + 1} non valido in ${rel(f)}: ${e.message}`);
    }
  });
}

// 2. riferimenti locali
const ESTERNI = /^(?:[a-z]+:|\/\/|#|data:|mailto:|tel:|javascript:|\{|\$|'|")/i;
const ALTRO_REPO = /^\/(?:appOBOtechHUB|Lighting|lps-app)\b/; // pubblicati da altri repository
for (const f of files.filter((f) => extname(f) === ".html")) {
  const html = readFileSync(f, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const refs = [...html.matchAll(/<(?:script|img|link|source|iframe)\b[^>]*?\s(?:src|href)=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (let r of new Set(refs)) {
    r = r.split(/[?#]/)[0];
    if (!r || ESTERNI.test(r) || ALTRO_REPO.test(r) || r.includes("__")) continue;
    const dest = r.startsWith("/") ? join(SITE, r) : join(dirname(f), r);
    const ok = existsSync(dest) && (statSync(dest).isFile() || existsSync(join(dest, "index.html")));
    if (!ok) problemi.push(`${rel(f)} richiama "${r}" che non è nel sito pubblicato (manca in pubblica.yml?)`);
  }
}

// 3. pagine aperte nel browser
let chromium = null;
try { ({ chromium } = await import("playwright")); } catch { console.log("Playwright non disponibile: salto la prova nel browser."); }
if (chromium) {
  const TIPI = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2" };
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let f = join(SITE, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!f.startsWith(SITE) || !existsSync(f)) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": TIPI[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch();
  const PAGINE = ["/", "/novita.html", "/privacy.html", "/condizioni.html", "/hub/progetti.html", "/progetti.html", "/mappa-carichi/", "/prodotti/", "/torrette/", "/zavorra-wrr/"]
    .filter((p) => existsSync(join(SITE, p.endsWith("/") ? p + "index.html" : p)));
  for (const percorso of PAGINE) {
    const ctx = await b.newContext({ serviceWorkers: "block" });
    const p = await ctx.newPage();
    const errori = [];
    await p.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    p.on("pageerror", (e) => errori.push("errore JavaScript: " + e.message));
    p.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() === 404 && !/favicon|version\.json|\/(appOBOtechHUB|Lighting)\//.test(u)) errori.push("file mancante: " + u.slice(BASE.length)); });
    try { await p.goto(BASE + percorso + "?nofx", { waitUntil: "load", timeout: 30000 }); await p.waitForTimeout(1500); }
    catch (e) { errori.push("la pagina non si apre: " + e.message.split("\n")[0]); }
    // gli errori dovuti solo alle chiamate esterne bloccate (rete, Supabase) non contano
    const veri = [...new Set(errori)].filter((e) => !/Failed to fetch|NetworkError|ERR_FAILED|net::|Load failed|supabase/i.test(e));
    if (veri.length) problemi.push(`Pagina ${percorso}: ${veri.slice(0, 4).join(" · ")}`);
    else console.log(`ok  ${percorso}`);
    await ctx.close();
  }
  await b.close(); server.close();
}

if (problemi.length) {
  console.error(`\n${problemi.length} problemi trovati: la pubblicazione si ferma.\n- ` + problemi.join("\n- "));
  process.exit(1);
}
console.log(`\nTutto a posto: ${files.length} file controllati.`);
