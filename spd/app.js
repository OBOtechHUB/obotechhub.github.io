/*
 * Conversione SPD in OBO Hub.
 * - SPD OBO: catalogo di Progettazione LPS (../appOBOtechHUB/dati/obo-prodotti.json, dati tecnici di obo-bettermann.com).
 * - SPD di altre marche: tabella Supabase spd_concorrenti (script supabase/pro.sql del repository appOBOtechHUB),
 *   inseriti dai colleghi a mano, con l'anteprima dell'equivalente, o incollati da Excel.
 * L'equivalente OBO è proposto confrontando i dati tecnici (confronto.js); chi lo verifica lo può confermare.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";
import { TIPI, POLI, APPLICAZIONI, numero, normPoli, normTipo, spdObo, proposte, chiaveCodice } from "./confronto.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const MARCHE_BASE = ["DEHN", "Zotup", "Lovato"];

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

// ---------- accesso: utenti di OBO Hub con l'app abilitata ----------
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
let ADMIN = false;
function fuori(msg) { $("cancelloMsg").textContent = msg; $("cancelloBtn").hidden = false; }
async function accesso() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      fuori(leggi("obo-visitatore") ? T("La Conversione SPD non è disponibile per i visitatori.", "SPD conversion is not available to visitors.") : T("Entra da OBO Hub per usare la Conversione SPD.", "Sign in from OBO Hub to use SPD conversion."));
      return false;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") { fuori(T("Completa l'accesso con Authenticator da OBO Hub.", "Complete the Authenticator sign-in from OBO Hub.")); return false; }
    const r = await supabase.rpc("ha_app_spd");
    if (r.error) { fuori(T("Il database non è ancora pronto: l'amministratore deve eseguire supabase/pro.sql in Supabase.", "The database is not ready yet: the administrator must run supabase/pro.sql in Supabase.")); return false; }
    if (r.data !== true) { fuori(T("Non hai ancora l'app Conversione SPD: chiedila all'amministratore.", "You don't have the SPD conversion app yet: ask the administrator.")); return false; }
    ADMIN = (await supabase.rpc("e_admin")).data === true;
    return true;
  } catch { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); return false; }
}

// ---------- dati ----------
let OBO = [], ALTRI = [], vista = "converti", modulo = null, ultimiCodici = "", messaggio = "";
async function caricaObo() {
  const r = await fetch("../appOBOtechHUB/dati/obo-prodotti.json", { cache: "no-cache" });
  OBO = r.ok ? spdObo(await r.json()) : [];
}
async function caricaAltri() {
  const tutti = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabase.from("spd_concorrenti").select("*").order("marca").order("codice").range(da, da + 999);
    if (error) throw new Error(error.message);
    tutti.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  ALTRI = tutti;
}
const marche = () => [...new Set([...MARCHE_BASE, ...ALTRI.map((x) => x.marca)])].sort((a, b) => MARCHE_BASE.indexOf(a) >= 0 && MARCHE_BASE.indexOf(b) >= 0 ? MARCHE_BASE.indexOf(a) - MARCHE_BASE.indexOf(b) : MARCHE_BASE.includes(a) ? -1 : MARCHE_BASE.includes(b) ? 1 : a.localeCompare(b));
const fmt = (n, u) => (n === null || n === undefined || n === "" ? "" : `${String(n).replace(".", ",")} ${u}`);
const nomeApp = (k) => (APPLICAZIONI.find(([x]) => x === k) || [k, k])[1];
function riassunto(a) {
  return [nomeApp(a.applicazione), a.tipo && `${T("tipo", "type")} ${a.tipo}`, a.poli && `${a.poli} ${T("poli", "poles")}`, a.uc && `Uc ${fmt(a.uc, "V")}`, a.iimp_polo && `Iimp ${fmt(a.iimp_polo, "kA")}`, a.in_ka && `In ${fmt(a.in_ka, "kA")}`, a.imax_ka && `Imax ${fmt(a.imax_ka, "kA")}`, a.up_kv && `Up ${fmt(a.up_kv, "kV")}`, a.segnalazione === true && T("segnalazione a distanza", "remote signalling")].filter(Boolean).join(" · ");
}

// ---------- viste ----------
function cartaProposta(r, i, a) {
  const o = r.obo;
  const etichetta = r.confermato ? `<span class="esito conf">${T("Confermato", "Confirmed")}</span>` : r.esito === "equivalente" ? `<span class="esito">${T("Equivalente", "Equivalent")} · ${r.punteggio}%</span>` : `<span class="esito simile">${T("Simile, da verificare", "Similar, to check")} · ${r.punteggio}%</span>`;
  return `<div class="proposta ${i === 0 ? "prima" : ""}">
    <div class="testa">${o.foto ? `<img src="${esc(o.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<div><span class="cod">${esc(o.codice)}</span><b>${esc(o.nome)}</b></div></div>
    <div>${etichetta}</div>
    <ul class="voci">${r.voci.map((v) => `<li class="${v.stato}"><strong>${esc(v.nome)}</strong> ${esc(v.testo)}</li>`).join("")}</ul>
    <div class="azioni-r">
      ${o.scheda ? `<a class="btn btn-piccolo" href="${esc(o.scheda)}" target="_blank" rel="noopener">${T("Scheda tecnica", "Datasheet")}</a>` : ""}
      ${o.url ? `<a class="btn btn-piccolo" href="${esc(o.url)}" target="_blank" rel="noopener">${T("Pagina OBO", "OBO page")}</a>` : ""}
      ${a?.id ? (r.confermato ? `<button class="btn btn-piccolo" data-azione="togli" data-id="${a.id}">${T("Togli conferma", "Remove confirmation")}</button>` : `<button class="btn btn-piccolo" data-azione="conferma" data-id="${a.id}" data-obo="${esc(o.codice)}">${T("Conferma equivalente", "Confirm equivalent")}</button>`) : ""}
    </div></div>`;
}
function elencoProposte(a) {
  const p = proposte(a, OBO);
  if (!p.length) return `<p class="vuoto">${T("Nessuno SPD OBO compatibile con questi dati: controlla tipo, poli e Uc, oppure chiedi all'ufficio tecnico.", "No compatible OBO SPD for these data: check type, poles and Uc, or ask the technical office.")}</p>`;
  return `<div class="proposte">${p.map((r, i) => cartaProposta(r, i, a)).join("")}</div>`;
}
function trova(codice) {
  const k = chiaveCodice(codice);
  if (!k) return { esatti: [], simili: [] };
  const esatti = ALTRI.filter((x) => chiaveCodice(x.codice) === k);
  const simili = esatti.length ? [] : ALTRI.filter((x) => chiaveCodice(x.codice).includes(k) || (k.length >= 4 && k.includes(chiaveCodice(x.codice)))).slice(0, 6);
  return { esatti, simili };
}
const codiciDa = (testo) => [...new Set(testo.split(/[\n;,\t]+/).map((x) => x.trim()).filter(Boolean))].slice(0, 50);

function vistaConverti() {
  const codici = codiciDa(ultimiCodici);
  let html = `<label class="campo largo"><span>${T("Codici di altre marche", "Other brands' codes")} <small>${T("uno per riga (o separati da virgola); puoi incollare una colonna da Excel", "one per line (or comma separated); you can paste a column from Excel")}</small></span>
    <textarea id="codiciIn" class="codici-in" placeholder="${T("es. il codice di uno scaricatore DEHN, Zotup o Lovato", "e.g. a DEHN, Zotup or Lovato surge arrester code")}">${esc(ultimiCodici)}</textarea></label>
    <p class="msg">${T(`Nell'elenco ci sono ${ALTRI.length} SPD di altre marche e ${OBO.length} articoli SPD OBO.`, `The list has ${ALTRI.length} other brands' SPDs and ${OBO.length} OBO SPD items.`)}</p>`;
  if (!codici.length) {
    if (!ALTRI.length) html += `<div class="avviso">${T("L'elenco degli SPD di altre marche è ancora vuoto. Aggiungine uno con <strong>Aggiungi SPD</strong> o incollane tanti insieme con <strong>Importa da Excel</strong>.", "The list of other brands' SPDs is still empty. Add one with <strong>Add SPD</strong> or paste many with <strong>Import from Excel</strong>.")}</div>`;
    return html;
  }
  const righe = [];
  for (const c of codici) {
    const { esatti, simili } = trova(c);
    if (!esatti.length) {
      righe.push([c, "", T("non nell'elenco", "not in the list"), "", ""]);
      html += `<section class="risultato"><header><h3>${esc(c)}</h3><span class="dati">${T("Non è ancora nell'elenco degli SPD di altre marche.", "Not yet in the list of other brands' SPDs.")}</span></header>
        ${simili.length ? `<p class="msg">${T("Forse cercavi:", "Did you mean:")} ${simili.map((s) => `<button class="chip" data-azione="usa" data-codice="${esc(s.codice)}">${esc(s.marca)} ${esc(s.codice)}</button>`).join(" ")}</p>` : ""}
        <p><button class="btn btn-primario" data-azione="nuovo" data-codice="${esc(c)}">${T("Aggiungilo e trova l'equivalente OBO", "Add it and find the OBO equivalent")}</button></p></section>`;
      continue;
    }
    for (const a of esatti) {
      const p = proposte(a, OBO);
      righe.push([a.codice, a.marca, p[0] ? p[0].obo.codice : "", p[0] ? p[0].obo.nome : "", p[0] ? (p[0].confermato ? T("confermato", "confirmed") : `${p[0].esito} ${p[0].punteggio}%`) : T("nessun equivalente", "no equivalent")]);
      html += `<section class="risultato"><header><span class="marca">${esc(a.marca)}</span><h3>${esc(a.codice)}</h3>${a.nome ? `<span>${esc(a.nome)}</span>` : ""}
        <button class="btn btn-piccolo" data-azione="modifica" data-id="${a.id}" style="margin-left:auto">${T("Modifica dati", "Edit data")}</button></header>
        <p class="dati">${esc(riassunto(a))}${a.fonte ? ` · ${T("fonte", "source")}: ${esc(a.fonte)}` : ""}${a.obo_verificato_il ? ` · ${T("equivalente confermato il", "equivalent confirmed on")} ${new Date(a.obo_verificato_il).toLocaleDateString(en() ? "en-GB" : "it-IT")}` : ""}</p>
        ${elencoProposte(a)}</section>`;
    }
  }
  if (codici.length > 1) html += `<h2>${T("Riepilogo", "Summary")}</h2><div class="tab-scorri"><table class="codici"><thead><tr><th>${T("Codice", "Code")}</th><th>${T("Marca", "Brand")}</th><th>${T("Codice OBO", "OBO code")}</th><th>${T("Prodotto OBO", "OBO product")}</th><th>${T("Esito", "Result")}</th></tr></thead><tbody>${righe.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p><button class="btn" data-azione="copia" data-righe="${esc(JSON.stringify(righe))}">${T("Copia il riepilogo (per Excel)", "Copy the summary (for Excel)")}</button> <span id="copiato" class="msg"></span></p>`;
  return html;
}

function vuoto() { return { id: null, marca: "", codice: "", nome: "", applicazione: "ac", tipo: "", poli: "", uc: "", iimp_polo: "", iimp_tot: "", in_ka: "", imax_ka: "", up_kv: "", segnalazione: null, estraibile: null, sistema: "", fonte: "", note: "", codice_obo: "" }; }
function vistaAggiungi() {
  const m = modulo || (modulo = vuoto());
  const chips = (campo, valori, nomi) => `<div class="chips" role="group">${valori.map((v, i) => `<button type="button" class="chip" data-campo="${campo}" data-valore="${esc(v)}" aria-pressed="${String(m[campo]) === String(v)}">${esc(nomi ? nomi[i] : v)}</button>`).join("")}</div>`;
  const num = (campo, nome, unita, nota = "") => `<label class="campo"><span>${nome} <small>${unita}${nota ? " · " + nota : ""}</small></span><input inputmode="decimal" data-campo="${campo}" value="${esc(m[campo] ?? "")}"></label>`;
  const altraMarca = m.marca && !marche().includes(m.marca);
  return `${m.id ? `<div class="avviso">${T("Stai modificando", "You are editing")} <strong>${esc(m.marca)} ${esc(m.codice)}</strong>. <button class="btn btn-piccolo" data-azione="annulla">${T("Nuovo SPD", "New SPD")}</button></div>` : `<p class="msg">${T("Bastano marca, codice e i dati della scheda tecnica che hai. Mentre scrivi, sotto compare l'equivalente OBO.", "Brand, code and the datasheet values you have are enough. While you type, the OBO equivalent appears below.")}</p>`}
  <form id="modulo" class="modulo" autocomplete="off">
    <div class="campo largo"><span>${T("Marca", "Brand")} *</span><div class="chips">${marche().map((x) => `<button type="button" class="chip" data-campo="marca" data-valore="${esc(x)}" aria-pressed="${m.marca === x}">${esc(x)}</button>`).join("")}
      <input data-campo="marca" placeholder="${T("altra marca…", "other brand…")}" value="${altraMarca ? esc(m.marca) : ""}" style="max-width:180px;border:1px solid var(--bordo);border-radius:999px;padding:6px 12px;background:var(--carta);color:var(--testo)"></div></div>
    <label class="campo"><span>${T("Codice", "Code")} *</span><input data-campo="codice" value="${esc(m.codice)}" required></label>
    <label class="campo"><span>${T("Nome o descrizione", "Name or description")}</span><input data-campo="nome" value="${esc(m.nome)}"></label>
    <div class="campo largo"><span>${T("Dove si usa", "Application")}</span>${chips("applicazione", APPLICAZIONI.map(([k]) => k), APPLICAZIONI.map(([, n]) => n))}</div>
    <div class="campo"><span>${T("Tipo (EN 61643-11)", "Type (EN 61643-11)")}</span>${chips("tipo", TIPI)}</div>
    <div class="campo"><span>${T("Poli", "Poles")} <small>3+N = ${T("tre fasi più spinterometro N-PE", "three phases plus N-PE spark gap")}</small></span>${chips("poli", POLI)}</div>
    ${num("uc", "Uc", "V", m.applicazione === "pv" || m.applicazione === "dc" ? "DC" : "AC")}
    ${num("up_kv", "Up", "kV")}
    ${num("iimp_polo", "Iimp", T("kA per polo, 10/350", "kA per pole, 10/350"))}
    ${num("iimp_tot", T("Iimp totale", "Total Iimp"), "kA")}
    ${num("in_ka", "In", T("kA per polo, 8/20", "kA per pole, 8/20"))}
    ${num("imax_ka", "Imax", T("kA per polo, 8/20", "kA per pole, 8/20"))}
    <div class="campo"><span>${T("Segnalazione a distanza", "Remote signalling")}</span>${chips("segnalazione", ["true", "false", "null"], [T("Sì", "Yes"), "No", T("Non so", "Unknown")])}</div>
    <div class="campo"><span>${T("Sistema", "System")} <small>${T("facoltativo", "optional")}</small></span>${chips("sistema", ["", "TT", "TN-C", "TN-S", "TN-C-S"], [T("Tutti", "Any"), "TT", "TN-C", "TN-S", "TN-C-S"])}</div>
    <label class="campo"><span>${T("Fonte dei dati", "Data source")} <small>${T("es. catalogo DEHN 2026, scheda tecnica", "e.g. DEHN 2026 catalogue, datasheet")}</small></span><input data-campo="fonte" value="${esc(m.fonte)}"></label>
    <label class="campo"><span>${T("Note", "Notes")}</span><input data-campo="note" value="${esc(m.note)}"></label>
    <div class="campo largo" style="flex-direction:row;flex-wrap:wrap;gap:10px;align-items:center">
      <button class="btn btn-primario" type="submit">${m.id ? T("Salva le modifiche", "Save changes") : T("Salva nell'elenco", "Save to the list")}</button>
      ${m.id && ADMIN ? `<button class="btn" type="button" data-azione="elimina" data-id="${m.id}">${T("Elimina", "Delete")}</button>` : ""}
      <span class="msg" id="msgModulo">${esc(messaggio)}</span>
    </div>
  </form>
  <section class="anteprima" id="anteprima">${anteprima()}</section>`;
}
function daModulo() {
  const m = modulo;
  return { ...m, uc: numero(m.uc), up_kv: numero(m.up_kv), iimp_polo: numero(m.iimp_polo), iimp_tot: numero(m.iimp_tot), in_ka: numero(m.in_ka), imax_ka: numero(m.imax_ka), segnalazione: m.segnalazione === "true" || m.segnalazione === true ? true : m.segnalazione === "false" || m.segnalazione === false ? false : null };
}
function anteprima() {
  const a = daModulo();
  if (!a.tipo && !a.uc && !a.poli) return `<p class="msg">${T("Indica almeno tipo, poli e Uc per vedere l'equivalente OBO.", "Enter at least type, poles and Uc to see the OBO equivalent.")}</p>`;
  return `<h2>${T("Equivalente OBO", "OBO equivalent")} <small>${T("aggiornato mentre scrivi", "updated as you type")}</small></h2>${elencoProposte(a.id ? a : { ...a, id: null })}`;
}

let filtroMarca = "", filtroTesto = "";
function vistaElenco() {
  const k = chiaveCodice(filtroTesto);
  const l = ALTRI.filter((x) => (!filtroMarca || x.marca === filtroMarca) && (!k || chiaveCodice(`${x.codice} ${x.nome}`).includes(k)));
  const conta = (m) => ALTRI.filter((x) => x.marca === m).length;
  return `<div class="filtri"><div class="chips"><button class="chip" data-filtro="" aria-pressed="${!filtroMarca}">${T("Tutte", "All")} (${ALTRI.length})</button>${marche().filter(conta).map((m) => `<button class="chip" data-filtro="${esc(m)}" aria-pressed="${filtroMarca === m}">${esc(m)} (${conta(m)})</button>`).join("")}</div>
    <label class="campo" style="flex:1;min-width:200px"><input id="filtroTesto" type="search" placeholder="${T("Cerca codice o nome", "Search code or name")}" value="${esc(filtroTesto)}"></label></div>
    ${l.length ? `<div class="tab-scorri"><table class="codici"><thead><tr><th>${T("Marca", "Brand")}</th><th>${T("Codice", "Code")}</th><th>${T("Dati", "Data")}</th><th>${T("Equivalente OBO", "OBO equivalent")}</th><th></th></tr></thead><tbody>
      ${l.slice(0, 500).map((a) => { const p = proposte(a, OBO, 1)[0]; return `<tr><td>${esc(a.marca)}</td><td><strong>${esc(a.codice)}</strong>${a.nome ? `<br><small>${esc(a.nome)}</small>` : ""}</td><td><small>${esc(riassunto(a))}</small></td>
        <td>${p ? `<strong>${esc(p.obo.codice)}</strong> ${esc(p.obo.nome)}<br><small>${p.confermato ? T("confermato", "confirmed") : `${p.esito} ${p.punteggio}%`}</small>` : `<small>${T("nessuno", "none")}</small>`}</td>
        <td style="white-space:nowrap"><button class="btn btn-piccolo" data-azione="apri" data-codice="${esc(a.codice)}">${T("Converti", "Convert")}</button> <button class="btn btn-piccolo" data-azione="modifica" data-id="${a.id}">${T("Modifica", "Edit")}</button></td></tr>`; }).join("")}
    </tbody></table></div>${l.length > 500 ? `<p class="msg">${T("Mostrati i primi 500: restringi con la ricerca.", "First 500 shown: narrow with the search.")}</p>` : ""}` : `<p class="vuoto">${T("Nessuno SPD in questo elenco.", "No SPD in this list.")}</p>`}
    <p><button class="btn" data-azione="scarica">${T("Scarica l'elenco (CSV per Excel)", "Download the list (CSV for Excel)")}</button></p>`;
}

// ---------- importazione da Excel ----------
const COLONNE = [
  ["marca", ["marca", "brand", "produttore", "costruttore"]], ["codice", ["codice", "code", "articolo", "art", "codice articolo", "part number", "item"]],
  ["nome", ["nome", "descrizione", "description", "name", "tipo prodotto"]], ["applicazione", ["applicazione", "application", "uso", "rete"]],
  ["tipo", ["tipo", "type", "classe", "class", "tipo spd"]], ["poli", ["poli", "poles", "pole", "n poli", "configurazione"]],
  ["uc", ["uc", "uc v", "tensione", "uc (v)", "tensione massima continuativa"]], ["up_kv", ["up", "up kv", "up (kv)", "livello di protezione"]],
  ["iimp_polo", ["iimp", "iimp kA", "iimp polo", "iimp (ka)", "corrente impulsiva"]], ["iimp_tot", ["iimp totale", "iimp tot", "itotal"]],
  ["in_ka", ["in", "in ka", "in (ka)", "corrente nominale di scarica"]], ["imax_ka", ["imax", "imax ka", "imax (ka)", "corrente massima di scarica"]],
  ["segnalazione", ["segnalazione", "contatto", "remote", "fs", "telesegnalazione", "segnalazione a distanza"]], ["sistema", ["sistema", "system", "rete tt/tn"]],
  ["fonte", ["fonte", "source"]], ["note", ["note", "notes"]], ["codice_obo", ["codice obo", "obo", "equivalente obo"]],
];
let incollato = "";
function analizza(testo) {
  const righe = testo.replace(/\r/g, "").split("\n").filter((r) => r.trim());
  if (righe.length < 2) return { mappa: [], righe: [], errori: [] };
  const sep = righe[0].includes("\t") ? "\t" : righe[0].includes(";") ? ";" : ",";
  const celle = (r) => r.split(sep).map((x) => x.trim().replace(/^"|"$/g, ""));
  const testa = celle(righe[0]).map((h) => h.toLowerCase().replace(/[*:]/g, "").trim());
  const mappa = testa.map((h) => (COLONNE.find(([, sin]) => sin.includes(h)) || [null])[0]);
  const out = [], errori = [];
  righe.slice(1).forEach((r, i) => {
    const c = celle(r), x = {};
    mappa.forEach((k, j) => { if (k && c[j] !== undefined && c[j] !== "") x[k] = c[j]; });
    if (!x.marca || !x.codice) { errori.push(`${T("Riga", "Row")} ${i + 2}: ${T("mancano marca o codice", "brand or code missing")}`); return; }
    const app = String(x.applicazione || "").toLowerCase();
    out.push({
      marca: x.marca, codice: x.codice, nome: x.nome || "",
      applicazione: /pv|fotov|photov|solar/.test(app) ? "pv" : /dati|data|segnal|signal|tel|lan|bus/.test(app) ? "dati" : /\bdc\b|continua/.test(app) ? "dc" : "ac",
      tipo: normTipo(x.tipo), poli: normPoli(x.poli), uc: numero(x.uc), up_kv: (() => { const v = numero(x.up_kv); return v !== null && v > 20 ? v / 1000 : v; })(),
      iimp_polo: numero(x.iimp_polo), iimp_tot: numero(x.iimp_tot), in_ka: numero(x.in_ka), imax_ka: numero(x.imax_ka),
      segnalazione: x.segnalazione === undefined ? null : /^(s[iì]|yes|y|x|1|true|fs)$/i.test(x.segnalazione) ? true : /^(no|n|0|false)$/i.test(x.segnalazione) ? false : null,
      sistema: x.sistema || "", fonte: x.fonte || "", note: x.note || "", ...(x.codice_obo ? { codice_obo: x.codice_obo } : {}),
    });
  });
  return { mappa, testa, righe: out, errori };
}
function vistaImporta() {
  const a = analizza(incollato);
  const esistenti = new Set(ALTRI.map((x) => `${x.marca}|${chiaveCodice(x.codice)}`));
  const nuovi = a.righe.filter((r) => !esistenti.has(`${r.marca}|${chiaveCodice(r.codice)}`)).length;
  return `<p class="msg">${T("In Excel seleziona le righe con l'intestazione e copia (Ctrl+C), poi incolla qui (Ctrl+V). Servono almeno le colonne <strong>Marca</strong> e <strong>Codice</strong>; le altre riconosciute sono Nome, Applicazione, Tipo, Poli, Uc, Up, Iimp, Iimp totale, In, Imax, Segnalazione, Sistema, Fonte, Note, Codice OBO.", "In Excel select the rows with the header and copy (Ctrl+C), then paste here (Ctrl+V). At least the <strong>Brand</strong> and <strong>Code</strong> columns are needed; the others recognised are Name, Application, Type, Poles, Uc, Up, Iimp, Total Iimp, In, Imax, Signalling, System, Source, Notes, OBO code.")}</p>
    <p><button class="btn" data-azione="modello">${T("Scarica il modello Excel (CSV)", "Download the Excel template (CSV)")}</button></p>
    <label class="campo largo"><span>${T("Incolla qui", "Paste here")}</span><textarea id="incolla" class="codici-in" style="min-height:160px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px">${esc(incollato)}</textarea></label>
    ${a.testa ? `<p class="msg">${T("Colonne riconosciute", "Recognised columns")}: ${a.testa.map((h, i) => a.mappa[i] ? `<strong>${esc(h)}</strong>` : `<s title="${T("ignorata", "ignored")}">${esc(h)}</s>`).join(", ")}</p>` : ""}
    ${a.errori.length ? `<div class="avviso rosso">${a.errori.slice(0, 10).map(esc).join("<br>")}${a.errori.length > 10 ? "<br>…" : ""}</div>` : ""}
    ${a.righe.length ? `<p><button class="btn btn-primario" data-azione="importa">${T(`Importa ${a.righe.length} SPD (${nuovi} nuovi, ${a.righe.length - nuovi} aggiornati)`, `Import ${a.righe.length} SPDs (${nuovi} new, ${a.righe.length - nuovi} updated)`)}</button> <span class="msg" id="msgImporta">${esc(messaggio)}</span></p>
      <div class="tab-scorri"><table class="codici"><thead><tr><th>${T("Marca", "Brand")}</th><th>${T("Codice", "Code")}</th><th>${T("Dati letti", "Data read")}</th><th>${T("Equivalente OBO proposto", "Proposed OBO equivalent")}</th></tr></thead><tbody>
      ${a.righe.slice(0, 200).map((r) => { const p = proposte(r, OBO, 1)[0]; return `<tr><td>${esc(r.marca)}</td><td>${esc(r.codice)}</td><td><small>${esc(riassunto(r))}</small></td><td>${p ? `${esc(p.obo.codice)} ${esc(p.obo.nome)} <small>(${p.esito} ${p.punteggio}%)</small>` : "—"}</td></tr>`; }).join("")}
      </tbody></table></div>` : (incollato ? `<p class="vuoto">${T("Nessuna riga valida: controlla che la prima riga sia l'intestazione.", "No valid rows: check that the first row is the header.")}</p>` : "")}`;
}

// ---------- disegno ed eventi ----------
function disegna() {
  document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === vista)));
  $("vista").innerHTML = vista === "converti" ? vistaConverti() : vista === "aggiungi" ? vistaAggiungi() : vista === "elenco" ? vistaElenco() : vistaImporta();
  window.OBORegistro?.uso(vista);
}
function vai(v) { vista = v; messaggio = ""; disegna(); scrollTo({ top: 0, behavior: "smooth" }); }
document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => vai(b.dataset.vista)));

const csv = (righe) => "﻿" + righe.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
function scaricaFile(nome, testo) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([testo], { type: "text/csv;charset=utf-8" })); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }
let timer = 0;
$("vista").addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "codiciIn") { clearTimeout(timer); timer = setTimeout(() => { ultimiCodici = t.value; const pos = t.selectionStart; disegna(); const n = $("codiciIn"); n.focus(); n.setSelectionRange(pos, pos); }, 350); }
  else if (t.id === "filtroTesto") { clearTimeout(timer); timer = setTimeout(() => { filtroTesto = t.value; disegna(); const n = $("filtroTesto"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }
  else if (t.id === "incolla") { incollato = t.value; clearTimeout(timer); timer = setTimeout(() => { const pos = t.selectionStart; disegna(); const n = $("incolla"); n.focus(); n.setSelectionRange(pos, pos); }, 300); }
  else if (t.dataset.campo && modulo) {
    modulo[t.dataset.campo] = t.value;
    if (t.dataset.campo === "marca") document.querySelectorAll('.chip[data-campo="marca"]').forEach((c) => c.setAttribute("aria-pressed", "false"));
    $("anteprima").innerHTML = anteprima();
  }
});
$("vista").addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = daModulo();
  a.marca = String(a.marca || "").trim(); a.codice = String(a.codice || "").trim();
  if (!a.marca || !a.codice) { messaggio = T("Indica marca e codice.", "Enter brand and code."); $("msgModulo").textContent = messaggio; return; }
  const riga = { marca: a.marca, codice: a.codice, nome: a.nome || "", applicazione: a.applicazione || "ac", tipo: a.tipo || "", poli: a.poli || "", uc: a.uc, up_kv: a.up_kv, iimp_polo: a.iimp_polo, iimp_tot: a.iimp_tot, in_ka: a.in_ka, imax_ka: a.imax_ka, segnalazione: a.segnalazione, sistema: a.sistema || "", fonte: a.fonte || "", note: a.note || "", modificato_il: new Date().toISOString(), modificato_da: (await supabase.auth.getUser()).data.user?.id ?? null };
  const r = modulo.id ? await supabase.from("spd_concorrenti").update(riga).eq("id", modulo.id).select().single() : await supabase.from("spd_concorrenti").upsert(riga, { onConflict: "marca,codice" }).select().single();
  if (r.error) { messaggio = T("Non salvato: ", "Not saved: ") + r.error.message; $("msgModulo").textContent = messaggio; return; }
  await caricaAltri();
  ultimiCodici = a.codice; modulo = null; vai("converti");
});
$("vista").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.campo && modulo) {
    e.preventDefault();
    const v = b.dataset.valore;
    modulo[b.dataset.campo] = b.dataset.campo === "segnalazione" ? (v === "null" ? null : v) : (String(modulo[b.dataset.campo]) === v && b.dataset.campo !== "marca" ? "" : v);
    if (b.dataset.campo === "applicazione" || b.dataset.campo === "marca") { const pos = scrollY; disegna(); scrollTo(0, pos); return; }
    b.parentElement.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.valore === String(modulo[b.dataset.campo]))));
    $("anteprima").innerHTML = anteprima();
    return;
  }
  if (b.dataset.filtro !== undefined) { filtroMarca = b.dataset.filtro; disegna(); return; }
  const az = b.dataset.azione; if (!az) return;
  if (az === "nuovo") { modulo = { ...vuoto(), codice: b.dataset.codice }; vai("aggiungi"); }
  else if (az === "usa" || az === "apri") { ultimiCodici = b.dataset.codice; vai("converti"); }
  else if (az === "modifica") { const a = ALTRI.find((x) => String(x.id) === b.dataset.id); if (a) { modulo = { ...vuoto(), ...a, segnalazione: a.segnalazione === null ? null : String(a.segnalazione) }; vai("aggiungi"); } }
  else if (az === "annulla") { modulo = null; vai("aggiungi"); }
  else if (az === "conferma" || az === "togli") {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
    const r = await supabase.from("spd_concorrenti").update(az === "conferma" ? { codice_obo: b.dataset.obo, obo_verificato_da: uid, obo_verificato_il: new Date().toISOString() } : { codice_obo: "", obo_verificato_da: null, obo_verificato_il: null }).eq("id", b.dataset.id);
    if (r.error) { alert(r.error.message); return; }
    await caricaAltri(); disegna();
  }
  else if (az === "elimina") {
    const a = ALTRI.find((x) => String(x.id) === b.dataset.id);
    if (!a || !confirm(T(`Eliminare ${a.marca} ${a.codice} dall'elenco? Non si può annullare.`, `Delete ${a.marca} ${a.codice} from the list? This cannot be undone.`))) return;
    const r = await supabase.from("spd_concorrenti").delete().eq("id", a.id);
    if (r.error) { messaggio = r.error.message; $("msgModulo").textContent = messaggio; return; }
    await caricaAltri(); modulo = null; vai("elenco");
  }
  else if (az === "copia") {
    const righe = JSON.parse(b.dataset.righe);
    const testo = [[T("Codice", "Code"), T("Marca", "Brand"), T("Codice OBO", "OBO code"), T("Prodotto OBO", "OBO product"), T("Esito", "Result")], ...righe].map((r) => r.join("\t")).join("\n");
    try { await navigator.clipboard.writeText(testo); $("copiato").textContent = T("Copiato: incollalo in Excel.", "Copied: paste it into Excel."); } catch { $("copiato").textContent = T("Copia non riuscita.", "Copy failed."); }
  }
  else if (az === "scarica") {
    scaricaFile(`spd-altre-marche-${new Date().toLocaleDateString("sv-SE")}.csv`, csv([["Marca", "Codice", "Nome", "Applicazione", "Tipo", "Poli", "Uc", "Up", "Iimp", "Iimp totale", "In", "Imax", "Segnalazione", "Sistema", "Fonte", "Note", "Codice OBO", "Equivalente OBO proposto"],
      ...ALTRI.map((a) => { const p = proposte(a, OBO, 1)[0]; return [a.marca, a.codice, a.nome, a.applicazione, a.tipo, a.poli, a.uc, a.up_kv, a.iimp_polo, a.iimp_tot, a.in_ka, a.imax_ka, a.segnalazione === null ? "" : a.segnalazione ? "sì" : "no", a.sistema, a.fonte, a.note, a.codice_obo, p ? `${p.obo.codice} ${p.obo.nome}` : ""].map((x) => (typeof x === "number" ? String(x).replace(".", ",") : x)); })]));
  }
  else if (az === "modello") {
    scaricaFile("modello-spd-altre-marche.csv", csv([["Marca", "Codice", "Nome", "Applicazione", "Tipo", "Poli", "Uc", "Up", "Iimp", "Iimp totale", "In", "Imax", "Segnalazione", "Sistema", "Fonte", "Note"],
      ["DEHN", "(codice)", "(descrizione)", "AC", "1+2", "3+N", "255", "1,5", "25", "100", "", "", "sì", "TT", "Catalogo 2026", ""]]));
  }
  else if (az === "importa") {
    const a = analizza(incollato);
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
    let fatti = 0;
    for (let i = 0; i < a.righe.length; i += 200) {
      const blocco = a.righe.slice(i, i + 200).map((r) => ({ ...r, modificato_il: new Date().toISOString(), modificato_da: uid }));
      const r = await supabase.from("spd_concorrenti").upsert(blocco, { onConflict: "marca,codice" });
      if (r.error) { messaggio = T(`Importati ${fatti}, poi errore: `, `Imported ${fatti}, then error: `) + r.error.message; disegna(); return; }
      fatti += blocco.length;
    }
    await caricaAltri(); incollato = ""; messaggio = T(`Importati ${fatti} SPD.`, `Imported ${fatti} SPDs.`); vista = "elenco"; disegna();
  }
});

// ---------- avvio ----------
(async () => {
  if (!(await accesso())) return;
  try { await Promise.all([caricaObo(), caricaAltri()]); }
  catch (e) { fuori(T("Dati non disponibili: ", "Data not available: ") + (e?.message || e)); return; }
  $("cancello").hidden = true; $("app").hidden = false;
  try { const q = new URLSearchParams(location.search).get("q"); if (q) ultimiCodici = q; } catch {}
  disegna();
})();
