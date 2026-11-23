/*
 * Prodotti OBO in OBO Hub.
 * Dati: prodotti/dati/*.json, rigenerati ogni notte da GitHub Actions (strumenti/prodotti/aggiorna.py)
 * leggendo le sitemap di obo.it e l'API pubblica del sito OBO. Le schede rimandano al sito ufficiale.
 * Ricerca come sul sito OBO: Prodotti, Articoli (pagine del sito) e Notizie in un'unica casella,
 * con in più la ricerca di più codici insieme.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { leggiXlsx, leggiCsv, scriviXlsx } from "./xlsx.js";
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
  $("q").placeholder = T("Prodotti e articoli", "Products and articles");
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
    // app abilitata per persona (Amministrazione → Utenti → Cambia sezioni → Prodotti OBO)
    const { data: p, error } = await supabase.from("accessi_profili").select("ruolo,stato,sezioni").eq("utente", session.user.id).maybeSingle();
    if (!error && p && (p.stato !== "attivo" || (p.ruolo !== "admin" && !(p.sezioni || []).some((s) => s === "tutte" || s === "app_prodotti")))) {
      fuori(T("Non hai ancora l'app Prodotti OBO: chiedila all'amministratore.", "You don't have the OBO products app yet: ask the administrator.")); return false;
    }
    return true;
  } catch { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); return false; }
}

// ---------- dati ----------
// prodotti: [numero, nome, descrizione, url, icona, attivo dal, prima vista, immagine]
let PRODOTTI = [], CATEGORIE = [], NOTIZIE = [], PAGINE = [], NOVITA = { prodotti: [], notizie: [], giorni: 120 }, STATO = null, EVIDENZA = { prodotti: [], storico: [] };
let NUOVI = new Set(), DATA_NOVITA = new Map();
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[®™]/g, "");
let INDICE = []; // testo normalizzato per prodotto

async function carica() {
  const j = (f) => fetch(`dati/${f}.json?v=${Math.floor(Date.now() / 36e5)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  // le notizie OBO non si mostrano più (richiesta di Marco): nuovi prodotti da OBO.global (evidenza.json)
  const [p, c, pg, nv, st, ev] = await Promise.all(["prodotti", "categorie", "pagine", "novita", "stato", "evidenza"].map(j));
  PRODOTTI = p ?? []; CATEGORIE = c ?? []; NOTIZIE = []; PAGINE = pg ?? []; NOVITA = nv ?? NOVITA; STATO = st; EVIDENZA = ev ?? EVIDENZA;
  // novità = solo i nuovi prodotti di OBO.global (in evidenza ora e in passato)
  const globali = [...(EVIDENZA.prodotti ?? []), ...(EVIDENZA.storico ?? [])];
  // storico delle novità da tutto il catalogo: data di attivazione OBO (escluse le date dei caricamenti in blocco) o prima comparsa su obo.it
  const conta = new Map(); for (const r of PRODOTTI) if (r[5]) conta.set(r[5], (conta.get(r[5]) || 0) + 1);
  const inBlocco = new Set([...conta].filter(([, n]) => n > 300).map(([d]) => d));
  DATA_NOVITA = new Map();
  for (const r of PRODOTTI) { const d = [r[5] && !inBlocco.has(r[5]) ? r[5] : "", r[6] || ""].sort().pop(); if (d) DATA_NOVITA.set(r[0], d); }
  for (const r of NOVITA.prodotti ?? []) { const d = r.length > 9 ? r[9] : r[8]; if (d && !DATA_NOVITA.has(r[0])) DATA_NOVITA.set(r[0], d); }
  for (const x of globali) if (x.dal && !DATA_NOVITA.has(x.codice)) DATA_NOVITA.set(x.codice, x.dal);
  const limiteNuovo = new Date(Date.now() - (NOVITA.giorni || 120) * 864e5).toISOString().slice(0, 10);
  NUOVI = new Set([...globali.map((x) => x.codice), ...[...DATA_NOVITA].filter(([, d]) => d >= limiteNuovo).map(([c]) => c)]);
  // un nuovo prodotto di OBO.global senza pagina su obo.it entra lo stesso nella ricerca, con il link a OBO.global
  const presenti = new Set(PRODOTTI.map((r) => r[0])), aggiunti = new Set();
  for (const x of globali) if (!presenti.has(x.codice) && !aggiunti.has(x.codice)) {
    aggiunti.add(x.codice);
    PRODOTTI.push([x.codice, x.nome || x.nomeEn || x.codice, x.descrizione || x.descrizioneEn || "", x.url || x.urlGlobal || "", x.immagine || "", "", "OBO.global"]);
  }
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
function rigaProdotto(r, q = "", dataNuovo = "") {
  const f = fotoDi(r);
  const img = f ? `<img src="${esc(f)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="noimg">${T("senza foto", "no photo")}</span>`;
  const nuovo = NUOVI.has(r[0]) ? `<span class="nuovo">${T("NUOVO", "NEW")}</span>` : "";
  const cat = NOMI_CAT.get(catDi(r));
  return `<a class="prodotto" href="${esc(url(r[3]))}" target="_blank" rel="noopener">${img}
    <span>${cat ? `<span class="cat">${esc(cat)}</span>` : ""}<h3>${evidenzia(r[1], q)}${nuovo}</h3>${r[2] ? `<p>${evidenzia(r[2], q)}</p>` : ""}</span>
    <span class="art">${evidenzia(r[0], q)}<small>${T("art.", "item")}${dataNuovo ? ` · ${T("nuovo dal", "new since")} ${dataIt(dataNuovo)}` : r[5] ? ` · ${T("dal", "since")} ${dataIt(r[5])}` : ""}</small></span></a>`;
}
function cartaProdotto(r) {
  // novita.json: come prodotti.json + data della novità in fondo (indice 9; 8 nei file vecchi)
  const data = r.length > 9 ? r[9] : r.length > 8 ? r[8] : r[7], img = (r.length > 8 ? r[7] : "") || r[4];
  return `<a class="carta" href="${esc(url(r[3]))}" target="_blank" rel="noopener"><span class="foto">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>
    <span class="corpo"><span class="data">${T("NUOVO", "NEW")}${data ? ` · ${dataIt(data)}` : ""}</span><h3>${esc(r[1])}</h3><p>${esc(senzaScopri(r[2]))}</p><span class="art">${esc(r[0])}</span></span></a>`;
}
/** Prodotto in evidenza su OBO.global, con la pagina italiana di obo.it. */
const senzaScopri = (t) => String(t || "").replace(/Scopri di più su[\s\S]*?adesso!/g, "").replace(/\s+/g, " ").trim();
function cartaEvidenza(x) {
  const en = T("", "en") === "en";
  return `<a class="carta" href="${esc((en && x.urlGlobal) || x.url)}" target="_blank" rel="noopener"><span class="foto">${x.immagine ? `<img src="${esc(x.immagine)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>
    <span class="corpo"><span class="data">${T("NUOVO", "NEW")}${x.dal ? ` · ${T("in evidenza dal", "highlighted since")} ${dataIt(x.dal)}` : ""}</span><h3>${esc((en && x.nomeEn) || x.nome)}</h3><p>${esc(senzaScopri((en ? x.descrizioneEn : x.descrizione) || x.descrizioneEn))}</p><span class="art">${esc(x.codice)}</span></span></a>`;
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
    $("stato").textContent = T(`${STATO.prodotti.toLocaleString("it-IT")} prodotti · ${STATO.categorie} categorie · aggiornato ${new Date(STATO.aggiornato).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}`,
      `${STATO.prodotti.toLocaleString("en-GB")} products · ${STATO.categorie} categories · updated ${new Date(STATO.aggiornato).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`);
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
  let h = `<div class="schede" role="tablist">${tab("tutti", "Tutti", "All")}${tab("prodotti", "Prodotti", "Products")}${tab("articoli", "Articoli", "Articles")}</div>`;
  if (!n.tutti) return h + `<p class="vuoto">${T("Nessun risultato. Prova con meno parole o con il numero d'articolo.", "No results. Try fewer words or the article number.")}</p>`;
  if (scheda === "tutti" || scheda === "prodotti") {
    const quanti = scheda === "tutti" ? 8 : mostra;
    ultimiTrovati = prodotti;
    h += `<h2>${T("Prodotti", "Products")} <small>${prodotti.length}</small>${prodotti.length ? ` <button class="btn btn-piccolo" type="button" id="scaricaRicerca">${ICONA_DOWNLOAD}${T("Scarica Excel", "Download Excel")}</button>` : ""}</h2>`;
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
    ? `<tr><td class="art">${esc(c)}</td><td><a href="${esc(url(r[3]))}" target="_blank" rel="noopener">${esc(r[1])}</a>${NUOVI.has(c) ? `<span class="nuovo">${T("NUOVO", "NEW")}</span>` : ""}<br><small>${esc(r[2] || "")}</small></td><td>${fotoDi(r) ? `<img src="${esc(fotoDi(r))}" alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer" style="object-fit:contain;background:#fff;border-radius:6px">` : ""}</td></tr>`
    : `<tr><td class="art">${esc(c)}</td><td class="ko" colspan="2">${T("Non trovato su obo.it: codice errato o non più a catalogo in Italia.", "Not found on obo.it: wrong code or no longer in the Italian catalogue.")}</td></tr>`; }).join("");
  const trovati = codici.filter((c) => per.has(c)).length;
  return `<h2>${T("Ricerca di più codici", "Multiple code search")} <small>${T(`${trovati} trovati su ${codici.length}`, `${trovati} found out of ${codici.length}`)}</small></h2>
    <table class="codici"><thead><tr><th>${T("Articolo", "Item")}</th><th>${T("Prodotto", "Product")}</th><th></th></tr></thead><tbody>${righe}</tbody></table>
    <p class="altro"><button class="btn" id="copiaCodici">${T("Copia l'elenco (per Excel)", "Copy the list (for Excel)")}</button> <button class="btn" id="scaricaCodici">${ICONA_DOWNLOAD}${T("Scarica Excel", "Download Excel")}</button></p>${barraListino()}`;
}

function vistaCodici() {
  return `<h2>${T("Cerca più codici insieme", "Find several codes at once")}</h2>
    <p>${T("Incolla un elenco di numeri d'articolo (da Excel, da un'email o da una distinta): uno per riga oppure separati da virgola o spazio.", "Paste a list of article numbers (from Excel, an email or a parts list): one per line or separated by comma or space.")}</p>
    <textarea id="elencoCodici" rows="8" style="width:100%;max-width:520px;border:1px solid var(--bordo);border-radius:10px;padding:10px;background:var(--carta);color:var(--testo);font:inherit"></textarea>
    <p><button class="btn btn-primario" id="cercaCodici">${T("Cerca", "Search")}</button></p>`;
}

let periodoNovita = "365";
const PERIODI = [["90", "Ultimi 3 mesi", "Last 3 months"], ["180", "Ultimi 6 mesi", "Last 6 months"], ["365", "Ultimo anno", "Last year"], ["730", "Ultimi 2 anni", "Last 2 years"], ["0", "Tutti", "All"]];
/** Prodotti nuovi nel periodo scelto, dal più recente. */
function nuoviNelPeriodo() {
  const da = periodoNovita === "0" ? "" : new Date(Date.now() - Number(periodoNovita) * 864e5).toISOString().slice(0, 10);
  const per = new Map(PRODOTTI.map((r) => [r[0], r]));
  return [...DATA_NOVITA].filter(([c, d]) => d >= da && per.has(c)).sort((x, y) => y[1].localeCompare(x[1]) || x[0].localeCompare(y[0])).map(([c, d]) => [per.get(c), d]);
}
const MESI = { it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
const meseDi = (d) => `${MESI[en() ? "en" : "it"][Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
function vistaNovita() {
  const ev = EVIDENZA.prodotti ?? [], attuali = new Set(ev.map((x) => x.codice));
  const prima = (EVIDENZA.storico ?? []).filter((x) => !attuali.has(x.codice));
  let h = `<h2>${T("In evidenza su OBO.global", "Highlighted on OBO.global")} <small>${ev.length}</small></h2>`;
  h += ev.length ? `<div class="griglia">${ev.map(cartaEvidenza).join("")}</div>` : `<p class="vuoto">${T("I prodotti in evidenza si aggiornano ogni notte.", "Highlighted products are updated every night.")}</p>`;
  if (prima.length) h += `<h2>${T("In evidenza in precedenza", "Previously highlighted")} <small>${prima.length}</small></h2><div class="griglia">${prima.map(cartaEvidenza).join("")}</div>`;
  const nuovi = nuoviNelPeriodo();
  h += `<h2>${T("Nuovi prodotti nel catalogo", "New products in the catalogue")} <small>${nuovi.length}</small></h2>
    <div class="filtri"><label>${T("Periodo", "Period")} <select id="periodoNovita">${PERIODI.map(([v, i, e]) => `<option value="${v}" ${v === periodoNovita ? "selected" : ""}>${T(i, e)}</option>`).join("")}</select></label>
    <button class="btn" type="button" id="scaricaNovita">${ICONA_DOWNLOAD}${T("Scarica Excel", "Download Excel")}</button>
    <button class="btn" type="button" id="scaricaSoloListino" title="${T("Articoli del listino METEL caricato in Amministrazione che non sono nel catalogo di obo.it", "Items in the METEL price list that are not in the obo.it catalogue")}">${ICONA_DOWNLOAD}${T("Nel listino ma non su obo.it", "In price list, not on obo.it")}</button></div>${barraListino()}`;
  if (!nuovi.length) h += `<p class="vuoto">${T("Nessun prodotto nuovo nel periodo scelto: prova un periodo più lungo.", "No new products in this period: try a longer one.")}</p>`;
  let mese = "";
  for (const [r, d] of nuovi.slice(0, mostraNovita)) {
    const m = d.slice(0, 7);
    if (m !== mese) { if (mese) h += "</div>"; mese = m; h += `<h3 class="mese">${esc(meseDi(d))} <small>${nuovi.filter(([, x]) => x.startsWith(m)).length}</small></h3><div class="lista">`; }
    h += rigaProdotto(r, "", d);
  }
  if (mese) h += "</div>";
  if (nuovi.length > mostraNovita) h += `<p class="altro"><button class="btn" data-altro-novita="1">${T("Mostra altri", "Show more")} (${nuovi.length - mostraNovita})</button></p>`;
  h += `<p class="hint">${T("In evidenza: i nuovi prodotti presentati su OBO.global, ognuno con la sua pagina italiana su obo.it quando c'è. Nuovi nel catalogo: data di attivazione indicata da OBO oppure prima comparsa su obo.it (le date dei caricamenti in blocco del catalogo non contano). Si aggiornano ogni notte e lo storico resta.", "Highlighted: new products presented on OBO.global, each with its Italian obo.it page when available. New in the catalogue: activation date from OBO or first appearance on obo.it (bulk catalogue uploads excluded). Updated every night; history is kept.")}</p>`;
  return h;
}
let mostraNovita = 60;

// ---------- download (Excel .xlsx scritto nel browser, prodotti/xlsx.js) ----------
const ICONA_DOWNLOAD = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px;margin-right:6px"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`;
/*
 * Listino METEL caricato dall'amministratore (Supabase listino_obo, ultima versione): famiglia sconto/statistica
 * (4 cifre, es. 0210) da cui Strat ID 1 = prime due cifre (2) e Strat ID 2 = ultime due con uno 0 in fondo (100).
 * Lo vedono solo gli utenti con account (regole del database): per i visitatori le colonne restano vuote.
 */
let LISTINO = null;
const CHIAVE_LISTINO = "obo-prodotti-listino"; // sul dispositivo: solo codice, famiglia e descrizione, niente prezzi
function listinoSalvato() {
  try { const x = JSON.parse(localStorage.getItem(CHIAVE_LISTINO) || "null"); if (x?.righe?.length) return { versione: x.versione, origine: "pc", righe: new Map(x.righe.map(([c, f, d, e, ean, st, dv, um]) => [c, { codice: c, famiglia_sconto: f, descrizione: d, etim: e || "", ean: ean || "", stato: st || "", variato: dv || "", um: um || "" }])) }; } catch { /* niente */ }
  return null;
}
/** Listino METEL scelto dal PC (xlsx o csv): letto nel browser, nessun dato inviato. */
async function listinoDaFile(file) {
  const tab = /\.csv$/i.test(file.name) ? leggiCsv(await file.text()) : await leggiXlsx(await file.arrayBuffer());
  const n = (v) => String(v).toUpperCase().replace(/[^A-Z]/g, "");
  const CODICE = ["CODICEARTICOLO", "CODICEPRODOTTOAZIENDA", "CODICEPRODOTTO", "ARTICOLO", "CODICE"];
  const ih = tab.slice(0, 30).findIndex((r) => r.some((c) => CODICE.includes(n(c))));
  if (ih < 0) throw new Error(T("Il file non sembra un listino METEL: non trovo la colonna del codice (CODICE PRODOTTO AZIENDA o CODICE ARTICOLO).", "Not a METEL price list: product code column not found."));
  const h = tab[ih].map(n);
  const ic = h.findIndex((x) => CODICE.includes(x)), id = h.indexOf("DESCRIZIONEPRODOTTO"), ie = h.indexOf("ETIM");
  const iean = h.indexOf("CODICEEAN"), ist = h.indexOf("STATODELPRODOTTO"), idv = h.indexOf("DATAULTIMAVARIAZIONE"), ium = h.indexOf("UNITAMISURA");
  const col = (r, i) => (i >= 0 ? String(r[i] ?? "").trim() : "");
  const ifam = h.indexOf("FAMIGLIASCONTO") >= 0 ? h.indexOf("FAMIGLIASCONTO") : h.indexOf("FAMIGLIASTATISTICA");
  if (ifam < 0) throw new Error(T("Nel file manca la colonna FAMIGLIA SCONTO.", "FAMIGLIA SCONTO column missing."));
  const righe = new Map();
  for (const r of tab.slice(ih + 1)) {
    const c = String(r?.[ic] ?? "").trim().replace(/\.0+$/, "");
    if (!c) continue;
    const f = String(r[ifam] ?? "").replace(/\D/g, "");
    righe.set(c, { codice: c, famiglia_sconto: f ? f.padStart(4, "0") : "", descrizione: col(r, id), etim: col(r, ie), ean: col(r, iean).replace(/\.0+$/, ""), stato: col(r, ist), variato: col(r, idv), um: col(r, ium) });
  }
  if (!righe.size) throw new Error(T("Nel file non ci sono articoli.", "No items in the file."));
  const versione = (file.name.match(/20\d\d[-_ ]?\d/) || [file.name.replace(/\.[^.]+$/, "")])[0].replace(/_/g, "-");
  try { localStorage.setItem(CHIAVE_LISTINO, JSON.stringify({ versione, righe: [...righe.values()].map((x) => [x.codice, x.famiglia_sconto, x.descrizione, x.etim, x.ean, x.stato, x.variato, x.um]) })); } catch { /* spazio pieno */ }
  return (LISTINO = { versione, origine: "pc", righe });
}
async function caricaListino() {
  if (LISTINO?.righe.size) return LISTINO;
  // il listino scelto dal PC ha la precedenza (di solito è il più recente)
  const pc = listinoSalvato(); if (pc) return (LISTINO = pc);
  const vuoto = { versione: "", righe: new Map() };
  try {
    const { data: v } = await supabase.from("listino_versioni").select("versione").order("caricato_il", { ascending: false }).limit(1).maybeSingle();
    if (!v?.versione) return (LISTINO = listinoSalvato() ?? vuoto);
    const righe = new Map();
    for (let da = 0; da < 60000; da += 1000) {
      const { data, error } = await supabase.from("listino_obo").select("codice,descrizione,famiglia_sconto,stato").eq("versione", v.versione).order("codice").range(da, da + 999);
      if (error || !data) break;
      for (const r of data) righe.set(String(r.codice), r);
      if (data.length < 1000) break;
    }
    return (LISTINO = righe.size ? { versione: v.versione, origine: "db", righe } : listinoSalvato() ?? vuoto);
  } catch { return (LISTINO = listinoSalvato() ?? vuoto); }
}
// Strat ID 2 = ultime due cifre con uno 0 in fondo (indicazione di Marco): 0210 → 2 e 100, 0111 → 1 e 110
const stratId = (f) => { const c = String(f || "").replace(/\D/g, "").padStart(4, "0"); return /^\d{4}$/.test(c) && c !== "0000" ? [Number(c.slice(0, 2)), Number(`${Number(c.slice(2))}0`)] : ["", ""]; };

/** Articoli del listino METEL che non sono nel catalogo di obo.it: solo le colonne del listino, ordinati per famiglia. */
async function scaricaSoloListino() {
  const lis = await caricaListino();
  if (!lis.righe.size) { alert(T("Listino non disponibile: scegli il file del listino METEL dal PC (pulsante sotto i download).", "Price list not available: choose the METEL price list file from your PC.")); return; }
  const su = new Set(PRODOTTI.map((r) => String(r[0])));
  const data = (d) => (/^\d{8}$/.test(d || "") ? `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}` : d || "");
  const righe = [...lis.righe.values()].filter((l) => !su.has(String(l.codice)))
    .sort((a, b) => String(a.famiglia_sconto).localeCompare(String(b.famiglia_sconto)) || String(a.codice).localeCompare(String(b.codice)))
    .map((l) => [String(l.codice), l.descrizione, l.ean || "", l.famiglia_sconto, ...stratId(l.famiglia_sconto), l.etim || "", l.um || "", l.stato || "", data(l.variato)]);
  const testa = en() ? ["Item", "Description (price list)", "EAN", "Discount family", "Strat ID 1", "Strat ID 2", "ETIM", "Unit", "Status (price list)", "Last change"]
    : ["Articolo", "Descrizione (listino)", "EAN", "Famiglia sconto", "Strat ID 1", "Strat ID 2", "ETIM", "Unità", "Stato (listino)", "Ultima variazione"];
  const blob = scriviXlsx([{ nome: T("Nel listino non su obo.it", "In price list not on obo.it"), intestazione: testa, righe, larghezze: [11, 46, 15, 13, 9, 9, 11, 7, 9, 12] }]);
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${T("listino-non-su-obo-it", "price-list-not-on-obo-it")}-${lis.versione}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  window.OBORegistro?.uso("download");
}

/** Riga che dice da dove vengono famiglia sconto e Strat ID nei download, con la scelta del file dal PC. */
function barraListino() {
  const l = LISTINO;
  const stato = l?.righe.size ? T(`Famiglia sconto e Strat ID dal listino ${l.versione} (${l.righe.size.toLocaleString("it-IT")} articoli${l.origine === "pc" ? ", file del PC" : ""}).`, `Discount family and Strat ID from price list ${l.versione}${l.origine === "pc" ? " (file on this PC)" : ""}.`)
    : T("Per avere famiglia sconto e Strat ID nei download scegli il file del listino METEL.", "To get discount family and Strat ID in downloads, choose the METEL price list file.");
  return `<p class="nota-listino" style="font-size:.85rem;color:var(--tenue);margin:.4rem 0">${esc(stato)} <label class="btn btn-piccolo" style="cursor:pointer">${T("Scegli listino METEL dal PC", "Choose METEL price list")}<input type="file" id="fileListino" accept=".xlsx,.csv" hidden></label></p>`;
}

async function scaricaProdotti(nome, righe) {
  const lis = await caricaListino();
  const conEtim = [...lis.righe.values()].some((l) => l.etim);
  const testa = en()
    ? ["Item", "Name", "Description", "Category", "Area", "Family", "Group", "Subgroup", "Active since", "New since", "Discount family (price list)", "Strat ID 1", "Strat ID 2", ...(conEtim ? ["ETIM"] : []), `In price list ${lis.versione}`.trim(), "obo.it page"]
    : ["Articolo", "Nome", "Descrizione", "Categoria", "Settore", "Famiglia", "Gruppo", "Sottogruppo", "Attivo dal", "Novità dal", "Famiglia sconto (listino)", "Strat ID 1", "Strat ID 2", ...(conEtim ? ["ETIM"] : []), `Nel listino ${lis.versione}`.trim(), "Pagina obo.it"];
  const daListino = (cod) => { const l = lis.righe.get(String(cod)); return l ? [l.famiglia_sconto, ...stratId(l.famiglia_sconto), ...(conEtim ? [l.etim || ""] : []), T("sì", "yes")] : ["", "", "", ...(conEtim ? [""] : []), lis.righe.size ? T("no", "no") : ""]; };
  // livelli della categoria di obo.it in colonne separate, per filtrare in Excel
  const livelli = (c) => { const parti = (c || "").split("/").filter(Boolean).slice(1); return [1, 2, 3, 4].map((n) => (parti.length >= n ? NOMI_CAT.get(`/${["prodotti", ...parti.slice(0, n)].join("/")}/`) || parti[n - 1].replace(/-/g, " ") : "")); };
  // testo pulito: niente "Scopri di più su … adesso!" e niente a capo
  const pulisci = (t) => String(t || "").replace(/Scopri di più su[\s\S]*?adesso!/g, "").replace(/\s+/g, " ").replace(/•/g, " • ").replace(/\s+/g, " ").trim();
  const data = (d) => (d ? d.split("-").reverse().join("/") : "");
  const corpo = righe.map(([r, d]) => [String(r[0]), pulisci(r[1]), pulisci(r[2]), NOMI_CAT.get(catDi(r)) || "", ...livelli(catDi(r)), data(r[5]), data(d ?? DATA_NOVITA.get(r[0])), ...daListino(r[0]), r[3] ? url(r[3]) : ""]);
  const larghezze = [11, 34, 60, 28, 20, 24, 24, 26, 11, 11, 13, 9, 9, ...(conEtim ? [11] : []), 10, 46];
  const blob = scriviXlsx([{ nome: T("Prodotti OBO", "OBO products"), intestazione: testa, righe: corpo, larghezze, link: [testa.length - 1] }]);
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  window.OBORegistro?.uso("download");
}
let ultimiTrovati = [];

function figli(u) { const liv = u.split("/").length; return CATEGORIE.filter((c) => c[0].startsWith(u) && c[0].split("/").length === liv + 1); }
function ramo(u, prof = 0) {
  const f = figli(u);
  if (!f.length) return "";
  return `<ul>${f.map((c) => { const sotto = prof < 1 ? ramo(c[0], prof + 1) : ""; const n = figli(c[0]).length;
    return `<li><a href="${esc(url(c[0]))}" target="_blank" rel="noopener">${esc(c[1])}</a>${n && !sotto ? ` <small style="color:var(--tenue)">(${n})</small>` : ""}${sotto}</li>`; }).join("")}</ul>`;
}
function vistaHome() {
  const ev = EVIDENZA.prodotti ?? [];
  const radici = figli("/prodotti/");
  let h = "";
  if (ev.length) h += `<h2>${T("Nuovi prodotti in evidenza", "New highlighted products")} <small>OBO.global</small></h2><div class="griglia">${ev.map(cartaEvidenza).join("")}</div>`;
  h += `<p class="altro"><button class="btn" data-vai="novita">${T("Tutti i nuovi prodotti, anche quelli precedenti", "All new products, including earlier ones")}</button></p>`;
  h += `<h2>${T("Categorie", "Categories")} <small>${CATEGORIE.length}</small></h2>`;
  if (PRODOTTI.length) h += `<p class="altro" style="text-align:left"><button class="btn" type="button" id="scaricaCatalogo">${ICONA_DOWNLOAD}${T(`Scarica il catalogo completo (Excel, ${PRODOTTI.length.toLocaleString("it-IT")} prodotti)`, `Download the full catalogue (Excel, ${PRODOTTI.length.toLocaleString("en-GB")} products)`)}</button></p>${barraListino()}`;
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
  else if (t.dataset.altroNovita) { mostraNovita += 60; disegna(); }
  else if (t.id === "scaricaNovita") scaricaProdotti(T("novita-prodotti-obo", "new-obo-products"), nuoviNelPeriodo());
  else if (t.id === "scaricaRicerca") scaricaProdotti(T("prodotti-obo-ricerca", "obo-products-search"), ultimiTrovati.map((r) => [r]));
  else if (t.id === "scaricaSoloListino") void scaricaSoloListino();
  else if (t.id === "scaricaCatalogo") scaricaProdotti(T("catalogo-prodotti-obo", "obo-product-catalogue"), PRODOTTI.map((r) => [r]));
  else if (t.id === "scaricaCodici") { const per = new Map(PRODOTTI.map((r) => [r[0], r])); scaricaProdotti(T("prodotti-obo-codici", "obo-products-codes"), (soloCodici(Q()) ?? []).map((c) => [per.get(c) ?? [c, T("non trovato su obo.it", "not found on obo.it"), "", "", "", "", "", "", ""]])); }
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
  if (e.target.id === "fileListino" && e.target.files?.[0]) {
    listinoDaFile(e.target.files[0]).then(() => disegna(), (err) => alert(err.message));
  }
  if (e.target.id === "periodoNovita") { periodoNovita = e.target.value; mostraNovita = 60; disegna(); }
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
  void caricaListino().then(() => disegna()); // in sottofondo: pronto per i download con famiglia sconto e Strat ID
  const p = new URLSearchParams(location.search);
  if (p.get("q")) $("q").value = p.get("q");
  if (["novita", "codici"].includes(p.get("vista"))) vista = p.get("vista");
  disegna();
  await carica();
  disegna();
})();
