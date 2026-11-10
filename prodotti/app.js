/*
 * Prodotti OBO in OBO Hub.
 * Dati: prodotti/dati/*.json, rigenerati ogni notte da GitHub Actions (strumenti/prodotti/aggiorna.py)
 * leggendo le sitemap di obo.it e l'API pubblica del sito OBO. Le schede rimandano al sito ufficiale.
 * Ricerca come sul sito OBO: Prodotti, Articoli (pagine del sito) e Notizie in un'unica casella,
 * con in più la ricerca di più codici insieme.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";

const SITO = "https://www.obo.it";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

// ---------- lingua, tema e testo condivisi con le altre app ----------
const en = () => leggi("obo-lingua") === "en";
const T = (it, eng) => (en() ? eng : it);
const PASSI_ZOOM = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.45];
const zoom = () => { const v = Number(leggi("obo-zoom")); return PASSI_ZOOM.includes(v) ? v : 1; };
const applicaZoom = () => document.documentElement.style.setProperty("--zoom", String(zoom()));
const applicaTema = () => { const t = leggi("obo-tema"); document.documentElement.dataset.theme = (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)) ? "dark" : "light"; };
function testiFissi() {
  document.documentElement.lang = en() ? "en" : "it";
  document.querySelectorAll("[data-t]").forEach((el) => { const [i, e] = el.dataset.t.split("|"); el.textContent = en() ? e : i; });
  $("q").placeholder = T("Prodotti, articoli, notizie", "Products, articles, news");
  $("pulisci").setAttribute("aria-label", T("Cancella", "Clear"));
  $("aspetto").title = T("Aspetto", "Display");
  pannelloAspetto();
}
function pannelloAspetto() {
  const p = $("pannelloAspetto"), t = leggi("obo-tema") || "auto", l = en() ? "en" : "it", z = Math.round(zoom() * 100);
  const seg = (voci, att) => `<span class="seg">${voci.map(([k, x]) => `<button type="button" data-k="${k}" aria-pressed="${k === att}">${x}</button>`).join("")}</span>`;
  p.innerHTML = `<div class="riga"><span>${T("Lingua", "Language")}</span>${seg([["it", "IT"], ["en", "EN"]], l)}</div>
    <div class="riga"><span>${T("Tema", "Theme")}</span>${seg([["auto", "Auto"], ["light", T("Chiaro", "Light")], ["dark", T("Scuro", "Dark")]], t)}</div>
    <div class="riga"><span>${T("Testo", "Text")}</span><span class="seg"><button type="button" data-z="-1">A−</button><span class="zv">${z}%</span><button type="button" data-z="1">A+</button></span></div>`;
}
$("aspetto").onclick = (e) => { e.stopPropagation(); $("pannelloAspetto").hidden = !$("pannelloAspetto").hidden; };
$("pannelloAspetto").onclick = (e) => {
  e.stopPropagation(); const x = e.target.closest("button"); if (!x) return;
  const k = x.dataset.k;
  if (k === "it" || k === "en") { scrivi("obo-lingua", k === "en" ? "en" : null); testiFissi(); disegna(); }
  else if (k) { scrivi("obo-tema", k === "auto" ? null : k); applicaTema(); }
  else if (x.dataset.z) { const i = PASSI_ZOOM.indexOf(zoom()); const z = PASSI_ZOOM[Math.min(PASSI_ZOOM.length - 1, Math.max(0, i + Number(x.dataset.z)))]; scrivi("obo-zoom", z === 1 ? null : String(z)); applicaZoom(); }
  pannelloAspetto();
};
document.addEventListener("click", () => { $("pannelloAspetto").hidden = true; });
addEventListener("storage", (e) => { if (["obo-lingua", "obo-tema", "obo-zoom"].includes(e.key)) { applicaTema(); applicaZoom(); testiFissi(); disegna(); } });
testiFissi();

// ---------- accesso: utenti di OBO Hub e visitatori ----------
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
function fuori(msg) { $("cancelloMsg").textContent = msg; $("cancelloBtn").hidden = false; }
async function accesso() {
  try {
    const v = (() => { try { const x = JSON.parse(leggi("obo-visitatore") || "null"); return x?.token ? x : null; } catch { return null; } })();
    if (v) {
      const { data } = await supabase.rpc("app_visitatore_valido", { p: { token: v.token } });
      if (data?.ok) return true;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { fuori(T("Entra da OBO Hub per vedere i prodotti.", "Sign in from OBO Hub to see the products.")); return false; }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") { fuori(T("Completa l'accesso con Authenticator da OBO Hub.", "Complete the Authenticator sign-in from OBO Hub.")); return false; }
    return true;
  } catch { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); return false; }
}

// ---------- dati ----------
// prodotti: [numero, nome, descrizione, url, icona, attivo dal, prima vista, immagine]
let PRODOTTI = [], CATEGORIE = [], NOTIZIE = [], PAGINE = [], NOVITA = { prodotti: [], notizie: [], giorni: 120 }, STATO = null;
let NUOVI = new Set();
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[®™]/g, "");
let INDICE = []; // testo normalizzato per prodotto

async function carica() {
  const j = (f) => fetch(`dati/${f}.json?v=${Math.floor(Date.now() / 36e5)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [p, c, n, pg, nv, st] = await Promise.all(["prodotti", "categorie", "notizie", "pagine", "novita", "stato"].map(j));
  PRODOTTI = p ?? []; CATEGORIE = c ?? []; NOTIZIE = n ?? []; PAGINE = pg ?? []; NOVITA = nv ?? NOVITA; STATO = st;
  NUOVI = new Set((NOVITA.prodotti ?? []).map((r) => r[0]));
  INDICE = PRODOTTI.map((r) => norm(`${r[0]} ${r[1]} ${r[2]}`));
  NOMI_CAT = new Map(CATEGORIE.map((c) => [c[0], c[1]]));
}
let NOMI_CAT = new Map();
/** Foto: quella grande (sitemap o pagina prodotto), altrimenti l'icona. */
const fotoDi = (r) => r[7] || r[4] || "";
/** Categoria del prodotto (ultimo livello) e suoi livelli sotto /prodotti/ (1 = famiglia, 2 = gruppo). */
const catDi = (r) => r[8] || "";
const famiglia = (u, liv = 1) => { const p = (u || "").split("/").filter(Boolean); return p.length > liv ? `/${p.slice(0, liv + 1).join("/")}/` : ""; };

// ---------- ricerca ----------
const RE_CODICE = /^\d{6,8}$/;
function parole(q) { return norm(q).split(/[\s,;]+/).filter(Boolean); }
/** Più codici d'articolo separati da spazio, virgola o a capo. */
function soloCodici(q) { const t = q.split(/[\s,;]+/).filter(Boolean); return t.length > 1 && t.every((x) => RE_CODICE.test(x)) ? t : null; }

function cercaProdotti(q) {
  const ps = parole(q); if (!ps.length) return [];
  const out = [];
  for (let i = 0; i < PRODOTTI.length; i++) {
    const testo = INDICE[i];
    if (!ps.every((p) => testo.includes(p))) continue;
    const r = PRODOTTI[i], nome = norm(r[1]);
    let punti = 0;
    for (const p of ps) {
      if (r[0] === p) punti += 100; else if (r[0].startsWith(p)) punti += 40;
      if (nome.startsWith(p)) punti += 12; else if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(nome)) punti += 8; else if (nome.includes(p)) punti += 4;
    }
    if (NUOVI.has(r[0])) punti += 1;
    out.push([punti, r]);
  }
  return out.sort((a, b) => b[0] - a[0] || a[1][1].localeCompare(b[1][1])).map((x) => x[1]);
}
function cercaVoci(lista, q, campi) {
  const ps = parole(q); if (!ps.length) return [];
  return lista.filter((r) => { const t = norm(campi.map((k) => r[k]).join(" ")); return ps.every((p) => t.includes(p)); });
}
function evidenzia(testo, q) {
  let s = esc(testo); const ps = parole(q).filter((p) => p.length > 1).sort((a, b) => b.length - a.length);
  if (!ps.length) return s;
  // evidenzia sul testo originale, ignorando accenti
  const n = norm(testo); const segni = new Array(testo.length).fill(false);
  for (const p of ps) { let i = n.indexOf(p); while (i >= 0) { for (let k = i; k < i + p.length && k < segni.length; k++) segni[k] = true; i = n.indexOf(p, i + p.length); } }
  if (n.length !== testo.length) return s; // caratteri speciali: niente evidenziazione per non sbagliare
  let out = "", dentro = false;
  for (let i = 0; i < testo.length; i++) { if (segni[i] && !dentro) { out += "<mark>"; dentro = true; } if (!segni[i] && dentro) { out += "</mark>"; dentro = false; } out += esc(testo[i]); }
  return out + (dentro ? "</mark>" : "");
}

// ---------- schede ----------
const url = (u) => (u?.startsWith("http") ? u : SITO + (u || ""));
const dataIt = (d) => { if (!d) return ""; try { return new Date(d + "T12:00:00").toLocaleDateString(en() ? "en-GB" : "it-IT", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };
function rigaProdotto(r, q = "") {
  const f = fotoDi(r);
  const img = f ? `<img src="${esc(f)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="noimg">${T("senza foto", "no photo")}</span>`;
  const nuovo = NUOVI.has(r[0]) ? `<span class="nuovo">${T("NUOVO", "NEW")}</span>` : "";
  const cat = NOMI_CAT.get(catDi(r));
  return `<a class="prodotto" href="${esc(url(r[3]))}" target="_blank" rel="noopener">${img}
    <span>${cat ? `<span class="cat">${esc(cat)}</span>` : ""}<h3>${evidenzia(r[1], q)}${nuovo}</h3>${r[2] ? `<p>${evidenzia(r[2], q)}</p>` : ""}</span>
    <span class="art">${evidenzia(r[0], q)}<small>${T("art.", "item")}${r[5] ? ` · ${T("dal", "since")} ${dataIt(r[5])}` : ""}</small></span></a>`;
}
function cartaProdotto(r) {
  // novita.json: come prodotti.json + data della novità in fondo (indice 9; 8 nei file vecchi)
  const data = r.length > 9 ? r[9] : r.length > 8 ? r[8] : r[7], img = (r.length > 8 ? r[7] : "") || r[4];
  return `<a class="carta" href="${esc(url(r[3]))}" target="_blank" rel="noopener"><span class="foto">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>
    <span class="corpo"><span class="data">${T("NUOVO", "NEW")}${data ? ` · ${dataIt(data)}` : ""}</span><h3>${esc(r[1])}</h3><p>${esc(r[2] || "")}</p><span class="art">${esc(r[0])}</span></span></a>`;
}
function cartaNotizia(n, q = "") {
  return `<a class="carta" href="${esc(url(n[0]))}" target="_blank" rel="noopener"><span class="foto copri">${n[3] ? `<img src="${esc(n[3])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>
    <span class="corpo"><span class="data">${dataIt(n[4])}</span><h3>${evidenzia(n[1], q)}</h3><p>${evidenzia(n[2] || "", q)}</p></span></a>`;
}
function vocePagina(p, q = "") {
  return `<a class="voce" href="${esc(url(p[0]))}" target="_blank" rel="noopener"><span class="sezione">${esc(p[3] || T("Pagina", "Page"))}</span><h3>${evidenzia(p[1], q)}</h3>${p[2] ? `<p>${evidenzia(p[2], q)}</p>` : ""}</a>`;
}

// ---------- viste ----------
let vista = "home", scheda = "tutti", soloNuovi = false, ordine = "rilevanza", mostra = 30, radiceAperta = null, filtroCat = "", filtroSotto = "";
const Q = () => $("q").value.trim();

let vistaContata = "";
function disegna() {
  const sez = Q() ? "ricerca" : vista;
  if (sez !== vistaContata) { vistaContata = sez; window.OBORegistro?.uso(sez); } // statistiche d'uso (Amministrazione)
  document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === vista && !Q())));
  $("pulisci").hidden = !Q();
  const v = $("vista");
  if (Q()) v.innerHTML = vistaRicerca(Q());
  else if (vista === "novita") v.innerHTML = vistaNovita();
  else if (vista === "codici") v.innerHTML = vistaCodici();
  else v.innerHTML = vistaHome();
  if (STATO) {
    $("stato").textContent = T(`${STATO.prodotti.toLocaleString("it-IT")} prodotti · ${STATO.categorie} categorie · ${STATO.notizie} notizie · aggiornato ${new Date(STATO.aggiornato).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}`,
      `${STATO.prodotti.toLocaleString("en-GB")} products · ${STATO.categorie} categories · ${STATO.notizie} news · updated ${new Date(STATO.aggiornato).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`);
    $("fonte").innerHTML = T(`Fonte: <a href="${SITO}/prodotti/" target="_blank" rel="noopener">obo.it</a> e catalogo online OBO, aggiornati ogni notte. Prezzi, disponibilità e dati tecnici: vale sempre la scheda sul sito OBO.`,
      `Source: <a href="${SITO}/prodotti/" target="_blank" rel="noopener">obo.it</a> and the OBO online catalogue, updated every night. Prices, availability and technical data: the OBO website always prevails.`)
      + (STATO.conDettagli < STATO.prodotti ? " " + T(`Dettagli e foto disponibili per ${STATO.conDettagli.toLocaleString("it-IT")} prodotti: gli altri si completano nelle prossime notti.`, `Details and photos available for ${STATO.conDettagli.toLocaleString("en-GB")} products: the rest is completed over the next nights.`) : "");
  } else $("stato").textContent = T("Indice dei prodotti in preparazione: torna più tardi.", "Product index being prepared: come back later.");
}

function vistaRicerca(q) {
  const codici = soloCodici(q);
  if (codici) return tabellaCodici(codici);
  const trovati = cercaProdotti(q).filter((r) => !soloNuovi || NUOVI.has(r[0]));
  // filtro per famiglia e gruppo, con i conteggi sui risultati (come i filtri del sito OBO)
  const conta = (lista, liv) => { const m = new Map(); for (const r of lista) { const k = famiglia(catDi(r), liv); if (k) m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
  const famiglie = conta(trovati, 1);
  if (filtroCat && !famiglie.some(([k]) => k === filtroCat)) { filtroCat = ""; filtroSotto = ""; }
  const inFamiglia = filtroCat ? trovati.filter((r) => catDi(r).startsWith(filtroCat)) : trovati;
  const gruppi = filtroCat ? conta(inFamiglia, 2) : [];
  if (filtroSotto && !gruppi.some(([k]) => k === filtroSotto)) filtroSotto = "";
  const prodotti = filtroSotto ? inFamiglia.filter((r) => catDi(r).startsWith(filtroSotto)) : inFamiglia;
  const nome = (u) => NOMI_CAT.get(u) || u.split("/").filter(Boolean).pop() || u;
  const opzioni = (lista, scelto, tutti) => `<option value="">${tutti}</option>` + lista.map(([k, n]) => `<option value="${esc(k)}" ${k === scelto ? "selected" : ""}>${esc(nome(k))} (${n})</option>`).join("");
  if (ordine === "nome") prodotti.sort((a, b) => a[1].localeCompare(b[1]));
  if (ordine === "recenti") prodotti.sort((a, b) => (b[5] || "").localeCompare(a[5] || ""));
  const pagine = cercaVoci(PAGINE, q, [1, 2, 3]);
  const notizie = cercaVoci(NOTIZIE, q, [1, 2]);
  const n = { tutti: prodotti.length + pagine.length + notizie.length, prodotti: prodotti.length, articoli: pagine.length, notizie: notizie.length };
  const tab = (k, it, e) => `<button class="scheda" role="tab" data-scheda="${k}" aria-selected="${scheda === k}">${T(it, e)} <span>${n[k]}</span></button>`;
  let h = `<div class="schede" role="tablist">${tab("tutti", "Tutti", "All")}${tab("prodotti", "Prodotti", "Products")}${tab("articoli", "Articoli", "Articles")}${tab("notizie", "Notizie", "News")}</div>`;
  if (!n.tutti) return h + `<p class="vuoto">${T("Nessun risultato. Prova con meno parole o con il numero d'articolo.", "No results. Try fewer words or the article number.")}</p>`;
  if (scheda === "tutti" || scheda === "prodotti") {
    const quanti = scheda === "tutti" ? 8 : mostra;
    h += `<h2>${T("Prodotti", "Products")} <small>${prodotti.length}</small></h2>`;
    if (scheda === "prodotti") h += `<div class="filtri"><label><input type="checkbox" id="soloNuovi" ${soloNuovi ? "checked" : ""}> ${T("Solo novità", "New only")}</label>
      ${famiglie.length ? `<label>${T("Famiglia", "Family")} <select id="filtroCat">${opzioni(famiglie, filtroCat, T(`Tutte (${trovati.length})`, `All (${trovati.length})`))}</select></label>` : ""}
      ${gruppi.length > 1 ? `<label>${T("Gruppo", "Group")} <select id="filtroSotto">${opzioni(gruppi, filtroSotto, T(`Tutti (${inFamiglia.length})`, `All (${inFamiglia.length})`))}</select></label>` : ""}
      <label>${T("Ordina", "Sort")} <select id="ordine"><option value="rilevanza" ${ordine === "rilevanza" ? "selected" : ""}>${T("Pertinenza", "Relevance")}</option><option value="nome" ${ordine === "nome" ? "selected" : ""}>${T("Nome", "Name")}</option><option value="recenti" ${ordine === "recenti" ? "selected" : ""}>${T("Più recenti", "Newest")}</option></select></label></div>`;
    h += prodotti.length ? `<div class="lista">${prodotti.slice(0, quanti).map((r) => rigaProdotto(r, q)).join("")}</div>` : `<p class="vuoto">${T("Nessun prodotto.", "No products.")}</p>`;
    if (prodotti.length > quanti) h += `<p class="altro"><button class="btn" data-altro="prodotti">${scheda === "tutti" ? T(`Tutti i ${prodotti.length} prodotti`, `All ${prodotti.length} products`) : T("Mostra altri", "Show more")}</button></p>`;
  }
  if (scheda === "tutti" || scheda === "articoli") {
    const quanti = scheda === "tutti" ? 4 : 60;
    if (pagine.length || scheda === "articoli") h += `<h2>${T("Articoli", "Articles")} <small>${pagine.length}</small></h2><div class="lista">${pagine.slice(0, quanti).map((p) => vocePagina(p, q)).join("") || `<p class="vuoto">${T("Nessun articolo.", "No articles.")}</p>`}</div>`;
    if (scheda === "tutti" && pagine.length > quanti) h += `<p class="altro"><button class="btn" data-altro="articoli">${T(`Tutti i ${pagine.length} articoli`, `All ${pagine.length} articles`)}</button></p>`;
  }
  if (scheda === "tutti" || scheda === "notizie") {
    const quanti = scheda === "tutti" ? 4 : 60;
    if (notizie.length || scheda === "notizie") h += `<h2>${T("Notizie", "News")} <small>${notizie.length}</small></h2><div class="griglia">${notizie.slice(0, quanti).map((x) => cartaNotizia(x, q)).join("") || `<p class="vuoto">${T("Nessuna notizia.", "No news.")}</p>`}</div>`;
    if (scheda === "tutti" && notizie.length > quanti) h += `<p class="altro"><button class="btn" data-altro="notizie">${T(`Tutte le ${notizie.length} notizie`, `All ${notizie.length} news`)}</button></p>`;
  }
  return h;
}

function tabellaCodici(codici) {
  const per = new Map(PRODOTTI.map((r) => [r[0], r]));
  const righe = codici.map((c) => { const r = per.get(c); return r
    ? `<tr><td class="art">${esc(c)}</td><td><a href="${esc(url(r[3]))}" target="_blank" rel="noopener">${esc(r[1])}</a>${NUOVI.has(c) ? `<span class="nuovo">${T("NUOVO", "NEW")}</span>` : ""}<br><small>${esc(r[2] || "")}</small></td><td>${fotoDi(r) ? `<img src="${esc(fotoDi(r))}" alt="" width="48" height="48" loading="lazy" referrerpolicy="no-referrer" style="object-fit:contain;background:#fff;border-radius:6px">` : ""}</td></tr>`
    : `<tr><td class="art">${esc(c)}</td><td class="ko" colspan="2">${T("Non trovato su obo.it: codice errato o non più a catalogo in Italia.", "Not found on obo.it: wrong code or no longer in the Italian catalogue.")}</td></tr>`; }).join("");
  const trovati = codici.filter((c) => per.has(c)).length;
  return `<h2>${T("Ricerca di più codici", "Multiple code search")} <small>${T(`${trovati} trovati su ${codici.length}`, `${trovati} found out of ${codici.length}`)}</small></h2>
    <table class="codici"><thead><tr><th>${T("Articolo", "Item")}</th><th>${T("Prodotto", "Product")}</th><th></th></tr></thead><tbody>${righe}</tbody></table>
    <p class="altro"><button class="btn" id="copiaCodici">${T("Copia l'elenco (per Excel)", "Copy the list (for Excel)")}</button></p>`;
}

function vistaCodici() {
  return `<h2>${T("Cerca più codici insieme", "Find several codes at once")}</h2>
    <p>${T("Incolla un elenco di numeri d'articolo (da Excel, da un'email o da una distinta): uno per riga oppure separati da virgola o spazio.", "Paste a list of article numbers (from Excel, an email or a parts list): one per line or separated by comma or space.")}</p>
    <textarea id="elencoCodici" rows="8" style="width:100%;max-width:520px;border:1px solid var(--bordo);border-radius:10px;padding:10px;background:var(--carta);color:var(--testo);font:inherit"></textarea>
    <p><button class="btn btn-primario" id="cercaCodici">${T("Cerca", "Search")}</button></p>`;
}

function vistaNovita() {
  const prodotti = NOVITA.prodotti ?? [];
  return `<h2>${T("Prodotti nuovi", "New products")} <small>${T(`ultimi ${NOVITA.giorni} giorni · ${NOVITA.prodottiNuovi ?? prodotti.length}`, `last ${NOVITA.giorni} days · ${NOVITA.prodottiNuovi ?? prodotti.length}`)}</small></h2>
    ${prodotti.length ? `<div class="griglia">${prodotti.map(cartaProdotto).join("")}</div>` : `<p class="vuoto">${T("Nessun prodotto nuovo nel periodo, oppure l'indice si sta ancora completando.", "No new products in the period, or the index is still being completed.")}</p>`}
    <h2>${T("Notizie OBO", "OBO news")} <small>${NOTIZIE.length}</small></h2>
    <div class="griglia">${NOTIZIE.map((n) => cartaNotizia(n)).join("")}</div>`;
}

function figli(u) { const liv = u.split("/").length; return CATEGORIE.filter((c) => c[0].startsWith(u) && c[0].split("/").length === liv + 1); }
function ramo(u, prof = 0) {
  const f = figli(u);
  if (!f.length) return "";
  return `<ul>${f.map((c) => { const sotto = prof < 1 ? ramo(c[0], prof + 1) : ""; const n = figli(c[0]).length;
    return `<li><a href="${esc(url(c[0]))}" target="_blank" rel="noopener">${esc(c[1])}</a>${n && !sotto ? ` <small style="color:var(--tenue)">(${n})</small>` : ""}${sotto}</li>`; }).join("")}</ul>`;
}
function vistaHome() {
  const nuovi = (NOVITA.prodotti ?? []).slice(0, 8), notizie = NOTIZIE.slice(0, 4);
  const radici = figli("/prodotti/");
  let h = "";
  if (nuovi.length) h += `<h2>${T("Novità", "New")} <small>${T(`${NOVITA.prodottiNuovi} prodotti negli ultimi ${NOVITA.giorni} giorni`, `${NOVITA.prodottiNuovi} products in the last ${NOVITA.giorni} days`)}</small></h2>
    <div class="griglia">${nuovi.map(cartaProdotto).join("")}</div><p class="altro"><button class="btn" data-vai="novita">${T("Tutte le novità", "All new items")}</button></p>`;
  if (notizie.length) h += `<h2>${T("Ultime notizie", "Latest news")}</h2><div class="griglia">${notizie.map((n) => cartaNotizia(n)).join("")}</div>`;
  h += `<h2>${T("Categorie", "Categories")} <small>${CATEGORIE.length}</small></h2>`;
  h += `<div class="radici">${radici.map((c) => `<button class="radice" data-radice="${esc(c[0])}" aria-pressed="${radiceAperta === c[0]}">${esc(c[1])}<small>${figli(c[0]).length} ${T("gruppi", "groups")}</small></button>`).join("")}</div>`;
  if (radiceAperta) h += `<div class="albero">${ramo(radiceAperta)}<p class="altro"><a class="btn" href="${esc(url(radiceAperta))}" target="_blank" rel="noopener">${T("Apri su obo.it", "Open on obo.it")} ↗</a></p></div>`;
  return h;
}

// ---------- eventi ----------
let timer = 0;
$("q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { mostra = 30; disegna(); salvaUrl(); }, 150); });
$("q").addEventListener("keydown", (e) => { if (e.key === "Escape") { $("q").value = ""; disegna(); salvaUrl(); } });
$("pulisci").onclick = () => { $("q").value = ""; $("q").focus(); disegna(); salvaUrl(); };
document.querySelectorAll("[data-vista]").forEach((b) => (b.onclick = () => { vista = b.dataset.vista; $("q").value = ""; disegna(); salvaUrl(); scrollTo({ top: 0 }); }));
$("vista").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.scheda) { scheda = t.dataset.scheda; mostra = 30; disegna(); }
  else if (t.dataset.altro) { if (scheda === "tutti") scheda = t.dataset.altro; else mostra += 30; disegna(); }
  else if (t.dataset.vai) { vista = t.dataset.vai; disegna(); salvaUrl(); scrollTo({ top: 0 }); }
  else if (t.dataset.radice) { radiceAperta = radiceAperta === t.dataset.radice ? null : t.dataset.radice; disegna(); }
  else if (t.id === "cercaCodici") { const c = $("elencoCodici").value.match(/\d{6,8}/g) ?? []; $("q").value = [...new Set(c)].join(", "); disegna(); salvaUrl(); }
  else if (t.id === "copiaCodici") {
    const per = new Map(PRODOTTI.map((r) => [r[0], r]));
    const testo = (soloCodici(Q()) ?? []).map((c) => { const r = per.get(c); return [c, r?.[1] ?? T("non trovato", "not found"), r?.[2] ?? "", r ? NOMI_CAT.get(catDi(r)) ?? "" : "", r ? url(r[3]) : ""].join("\t"); }).join("\n");
    navigator.clipboard?.writeText(testo).then(() => { t.textContent = T("Copiato", "Copied"); });
  }
});
$("vista").addEventListener("change", (e) => {
  if (e.target.id === "soloNuovi") { soloNuovi = e.target.checked; disegna(); }
  if (e.target.id === "ordine") { ordine = e.target.value; disegna(); }
  if (e.target.id === "filtroCat") { filtroCat = e.target.value; filtroSotto = ""; mostra = 30; disegna(); }
  if (e.target.id === "filtroSotto") { filtroSotto = e.target.value; mostra = 30; disegna(); }
});
function salvaUrl() {
  const p = new URLSearchParams(); if (Q()) p.set("q", Q()); else if (vista !== "home") p.set("vista", vista);
  history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
}

(async () => {
  if (!(await accesso())) return;
  $("cancello").hidden = true; $("app").hidden = false;
  const p = new URLSearchParams(location.search);
  if (p.get("q")) $("q").value = p.get("q");
  if (["novita", "codici"].includes(p.get("vista"))) vista = p.get("vista");
  disegna();
  await carica();
  disegna();
})();
