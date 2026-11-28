/*
 * Sopralluogo delle torrette (come il Sopralluogo di Progettazione LPS): foto dal telefono o dal tablet con tipo, stanza,
 * didascalia e nota (scritta o dettata), misure del punto (altezza disponibile, pavimento, rivestimento), messaggi vocali
 * e appunti. Tutto va nel progetto unico: una riga di progetti_soluzioni con app "torrette-sopralluogo" per progetto.
 * Foto e vocali stanno nello storage privato "sopralluoghi" (cartella <utente>/<progetto>/, la stessa di LPS):
 * senza rete restano sul dispositivo (IndexedDB) e partono da soli quando torna. Nulla si cancella sul server.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";

const $ = (id) => document.getElementById(id);
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* niente */ } };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const en = () => leggi("obo-lingua") === "en";
const T = (it, eng) => (en() ? eng : it);
const APP = "torrette-sopralluogo", BUCKET = "sopralluoghi", CHIAVE_PROG = "obo-torrette-sopralluogo-progetto";
const TIPI = [["punto", "Punto della torretta", "Outlet position"], ["pavimento", "Pavimento e rivestimento", "Floor and covering"], ["impianto", "Impianto esistente", "Existing installation"], ["altro", "Altro", "Other"]];
const nomeTipo = (k) => { const t = TIPI.find((x) => x[0] === k); return t ? T(t[1], t[2]) : T("Senza tipo", "No type"); };
const quando = (d) => (d ? new Date(d).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "");
// stesse icone di Torrette (icone.jsx), come stringhe SVG
const ICO = {
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  galleria: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  cerca: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  microfono: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6"/>',
};
const ico = (n, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;vertical-align:-3px">${ICO[n]}</svg>`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- aspetto (lingua, tema, testo) come nel configuratore ----------
const PASSI_ZOOM = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.45];
const zoom = () => { const v = Number(leggi("obo-zoom")); return PASSI_ZOOM.includes(v) ? v : 1; };
const applicaZoom = () => document.documentElement.style.setProperty("--zoom", String(zoom()));
const applicaTema = () => { const t = leggi("obo-tema"); document.documentElement.dataset.theme = (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)) ? "dark" : "light"; };
function testiFissi() {
  document.documentElement.lang = en() ? "en" : "it";
  document.querySelectorAll("[data-t]").forEach((el) => { const [i, e] = el.dataset.t.split("|"); el.textContent = en() ? e : i; });
  const p = $("pannelloAspetto"), t = leggi("obo-tema") || "auto", z = Math.round(zoom() * 100);
  const seg = (voci, att) => `<span class="seg">${voci.map(([k, x]) => `<button type="button" data-k="${k}" aria-pressed="${k === att}">${x}</button>`).join("")}</span>`;
  p.innerHTML = `<div class="riga"><span>${T("Lingua", "Language")}</span>${seg([["it", "IT"], ["en", "EN"]], en() ? "en" : "it")}</div>
    <div class="riga"><span>${T("Tema", "Theme")}</span>${seg([["auto", "Auto"], ["light", T("Chiaro", "Light")], ["dark", T("Scuro", "Dark")]], t)}</div>
    <div class="riga"><span>${T("Testo", "Text")}</span><span class="seg"><button type="button" data-z="-1">A−</button><span class="zv">${z}%</span><button type="button" data-z="1">A+</button></span></div>`;
}
$("aspetto").onclick = (e) => { e.stopPropagation(); $("pannelloAspetto").hidden = !$("pannelloAspetto").hidden; };
$("pannelloAspetto").onclick = (e) => {
  e.stopPropagation(); const x = e.target.closest("button"); if (!x) return; const k = x.dataset.k;
  if (k === "it" || k === "en") scrivi("obo-lingua", k === "en" ? "en" : null);
  else if (k) { scrivi("obo-tema", k === "auto" ? null : k); applicaTema(); }
  else if (x.dataset.z) { const i = PASSI_ZOOM.indexOf(zoom()), z2 = PASSI_ZOOM[Math.min(PASSI_ZOOM.length - 1, Math.max(0, i + Number(x.dataset.z)))]; scrivi("obo-zoom", z2 === 1 ? null : String(z2)); applicaZoom(); }
  testiFissi(); disegna();
};
document.addEventListener("click", () => { $("pannelloAspetto").hidden = true; });
applicaZoom(); testiFissi();

// ---------- coda delle foto e dei vocali sul dispositivo ----------
const apriDb = () => new Promise((ok, ko) => { const r = indexedDB.open("obo-torrette-sopralluoghi", 1); r.onupgradeneeded = () => r.result.createObjectStore("coda", { keyPath: "percorso" }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
async function tx(modo, f) { const db = await apriDb(); return new Promise((ok, ko) => { const r = f(db.transaction("coda", modo).objectStore("coda")); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
const inCoda = () => tx("readonly", (s) => s.getAll()).catch(() => []);
async function riduci(file, lato = 1600) {
  const bmp = await createImageBitmap(file).catch(() => null); if (!bmp) return file;
  const k = Math.min(1, lato / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return new Promise((ok) => c.toBlob((b) => ok(b || file), "image/jpeg", 0.82));
}
let ultimoErrore = "";
async function carica(percorso, blob) {
  if (!navigator.onLine) return false;
  const tipo = blob.type || (percorso.endsWith(".jpg") ? "image/jpeg" : "audio/webm");
  const { error } = await supabase.storage.from(BUCKET).upload(percorso, blob, { upsert: false, contentType: tipo });
  if (error && !/exists|duplicate/i.test(error.message)) { ultimoErrore = /mime|type/i.test(error.message) ? T("Lo storage non accetta ancora l'audio: serve il SQL 12 (sopralluoghi-vocali).", "Storage does not accept audio yet: SQL 12 is needed.") : error.message; return false; }
  await tx("readwrite", (s) => s.delete(percorso)); return true;
}
async function salvaFile(percorso, blob) { await tx("readwrite", (s) => s.put({ percorso, blob })); return (await carica(percorso, blob)) ? "caricata" : "in-coda"; }
async function sincronizza() { let resto = 0; for (const f of await inCoda()) if (!(await carica(f.percorso, f.blob))) resto++; return resto; }
async function scaricaFile(percorso) {
  const loc = await tx("readonly", (s) => s.get(percorso)).catch(() => null); if (loc) return loc.blob;
  const { data, error } = await supabase.storage.from(BUCKET).download(percorso); return error ? null : data;
}
const percorso = (est) => `${U.id}/${S.progetto}/${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}_${Math.random().toString(36).slice(2, 7)}.${est}`;

// ---------- stato ----------
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
let U = null, PROGETTI = [];
const S = { progetto: null, riga: null, dati: null, tipoNuove: "punto", filtro: "tutte", aperta: null, msg: "", inCoda: 0, attesa: false, salvando: false, errore: "" };
const vuoto = () => ({ versione: "sopralluogo-torrette-1", appunti: "", foto: [], vocali: [] });
const URLS = {};
window.oboAvvisoUscita?.registra(() => S.attesa || S.salvando, () => scriviCloud());

let timer = null;
function cambia(p) { Object.assign(S.dati, p); S.attesa = true; clearTimeout(timer); timer = setTimeout(() => { S.attesa = false; scriviCloud(); }, 1200); statoSalvataggio(); }
function cambiaFoto(id, p) { cambia({ foto: S.dati.foto.map((f) => (f.id === id ? { ...f, ...p } : f)) }); }
async function scriviCloud() {
  if (!S.progetto) return; S.salvando = true; statoSalvataggio();
  try {
    const p = PROGETTI.find((x) => x.id === S.progetto);
    const riga = { app: APP, progetto: S.progetto, nome: `${T("Sopralluogo torrette", "Outlets site survey")}${p?.codice ? " " + p.codice : ""}`, dati: S.dati };
    const q = S.riga ? supabase.from("progetti_soluzioni").update(riga).eq("id", S.riga) : supabase.from("progetti_soluzioni").insert(riga);
    const { data, error } = await q.select("id").single();
    if (error) { S.errore = /does not exist|schema cache/i.test(error.message) ? T("Salvataggio nei progetti non attivo: serve il SQL 18.", "Project saving not active: SQL 18 is needed.") : error.message; }
    else { S.riga = data.id; S.errore = ""; }
  } finally { S.salvando = false; statoSalvataggio(); }
}

// ---------- accesso ----------
function fuori(m) { $("cancelloMsg").textContent = m; $("cancelloBtn").hidden = false; }
(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return fuori(T("Entra da OBO Hub per fare il sopralluogo.", "Sign in from OBO Hub to do the survey."));
    const [{ data: aal }, { data: prof }] = await Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(), supabase.from("accessi_profili").select("ruolo").eq("utente", session.user.id).maybeSingle()]);
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") return fuori(T("Completa l'accesso con Authenticator da OBO Hub.", "Complete the Authenticator sign-in from OBO Hub."));
    if (!prof || prof.ruolo !== "admin") return fuori(T("Non hai accesso a questa app.", "You don't have access to this app."));
    U = session.user; $("cancello").hidden = true; $("app").hidden = false;
    const [miei, cond] = await Promise.all([
      supabase.from("progetti").select("id, codice, nome, comune, data_modifica").eq("utente", U.id).order("data_modifica", { ascending: false }).limit(500),
      supabase.rpc("progetti_condivisi_con_me"),
    ]);
    PROGETTI = (miei.data || []).map((p) => ({ ...p }));
    for (const p of cond.error ? [] : cond.data || []) if (!PROGETTI.some((x) => x.id === p.id)) PROGETTI.push({ id: p.id, codice: p.codice, nome: p.nome, comune: p.comune, data_modifica: p.data_modifica, condiviso: p.proprietario_nome || p.proprietario_email || true });
    const daUrl = new URLSearchParams(location.search).get("progetto"), ultimo = leggi(CHIAVE_PROG);
    const scelto = [daUrl, ultimo].find((x) => x && PROGETTI.some((p) => p.id === x));
    if (scelto) await apri(scelto); else disegna();
    addEventListener("online", async () => { S.inCoda = await sincronizza(); disegna(); });
    addEventListener("offline", disegna);
    if (navigator.onLine) S.inCoda = await sincronizza(); else S.inCoda = (await inCoda()).length;
    disegna();
  } catch (e) { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); }
})();

async function apri(id) {
  S.progetto = id; S.riga = null; S.dati = vuoto(); S.aperta = null; scrivi(CHIAVE_PROG, id);
  const { data, error } = await supabase.from("progetti_soluzioni").select("id, dati").eq("progetto", id).eq("app", APP).eq("archiviata", false).order("aggiornata_il", { ascending: false }).limit(1);
  if (error) S.errore = error.message;
  if (data && data[0]) { S.riga = data[0].id; S.dati = { ...vuoto(), ...(data[0].dati || {}) }; }
  disegna(); anteprime();
}
async function anteprime() {
  for (const x of [...S.dati.foto, ...S.dati.vocali]) if (!URLS[x.percorso]) { const b = await scaricaFile(x.percorso); if (b) { URLS[x.percorso] = URL.createObjectURL(b); disegna(); } }
}

// ---------- disegno ----------
function statoSalvataggio() {
  const c = $("chipSalva"); if (!c) return;
  const ok = !S.attesa && !S.salvando && !S.errore;
  c.className = "chip " + (S.errore ? "no" : ok ? "ok" : "");
  c.textContent = S.errore ? "⚠ " + S.errore : S.salvando || S.attesa ? T("Salvataggio…", "Saving…") : S.riga ? T("✓ Salvato nel progetto", "✓ Saved to the project") : T("Ancora niente da salvare", "Nothing to save yet");
}
function disegna() {
  const m = $("sop"); if (!m || !U) return;
  if (!S.progetto) {
    m.innerHTML = `<h1>${esc(T("Sopralluogo torrette", "Outlets site survey"))}</h1>
      <p>${esc(T("Scegli il progetto a cui collegare il sopralluogo: foto, misure, note e vocali si salvano in quel progetto.", "Choose the project for the survey: photos, measures, notes and voice messages are saved in it."))}</p>
      ${PROGETTI.length ? `<ul class="progetti">${PROGETTI.map((p) => `<li><span><b>${esc([p.codice, p.nome].filter(Boolean).join(" · ") || T("Progetto senza nome", "Untitled project"))}</b><small>${p.condiviso ? esc(T("Condiviso", "Shared") + (p.condiviso !== true ? " da " + p.condiviso : "")) + " · " : ""}${esc(p.comune || T("Comune non indicato", "Town not given"))}</small></span><button type="button" class="btn btn-primario" data-apri="${esc(p.id)}">${esc(T("Collega il sopralluogo", "Link the survey"))}</button></li>`).join("")}</ul>`
        : `<p>${esc(T("Non hai ancora progetti: creane uno nel configuratore (riquadro Progetto) o in Progetti di OBO Hub.", "You have no projects yet: create one in the configurator or in OBO Hub Projects."))}</p>`}
      <p><a href="../progetti.html">${esc(T("Tutti i progetti", "All projects"))}</a> · <a href="./">${esc(T("Configuratore torrette", "Outlet configurator"))}</a></p>`;
    return;
  }
  const p = PROGETTI.find((x) => x.id === S.progetto) || {}, d = S.dati;
  const conta = (k) => (k === "tutte" ? d.foto.length : d.foto.filter((f) => f.categoria === k).length);
  const vis = [...d.foto].reverse().filter((f) => S.filtro === "tutte" || f.categoria === S.filtro);
  m.innerHTML = `<h1>${esc(T("Sopralluogo torrette", "Outlets site survey"))}</h1>
    <div class="sop-stato"><b>${esc([p.codice, p.nome].filter(Boolean).join(" · ") || T("Progetto", "Project"))}${p.comune ? " – " + esc(p.comune) : ""}</b>
      <button type="button" class="mini-btn" data-cambia>${esc(T("Cambia progetto", "Change project"))}</button>
      <span class="chip ${navigator.onLine ? "ok" : "no"}">${navigator.onLine ? esc(T("In linea", "Online")) : esc(T("Senza rete: le foto restano sul telefono", "Offline: photos stay on the phone"))}</span>
      ${S.inCoda ? `<button type="button" class="mini-btn arancio" data-sync>${S.inCoda} ${esc(T("da caricare", "to upload"))}</button>` : ""}
      <span id="chipSalva" class="chip"></span>
      <a class="mini-btn" href="./">${esc(T("Vai al configuratore", "Open the configurator"))}</a></div>
    ${S.msg ? `<p role="status" class="avviso">${esc(S.msg)}</p>` : ""}
    <section class="box" aria-label="${esc(T("Nuove foto", "New photos"))}">
      <div class="tipi" role="radiogroup" aria-label="${esc(T("Tipo delle prossime foto", "Type of the next photos"))}">${TIPI.map(([k]) => `<button type="button" role="radio" aria-checked="${S.tipoNuove === k}" aria-pressed="${S.tipoNuove === k}" data-tipo="${k}">${esc(nomeTipo(k))}</button>`).join("")}</div>
      <div class="scatti"><button type="button" class="btn btn-primario" data-scatta>${ico("foto", 18)} ${esc(T("Scatta foto", "Take photo"))}</button><button type="button" class="btn btn-bordo" data-galleria>${ico("galleria", 18)} ${esc(T("Dalla galleria", "From gallery"))}</button></div>
      <input id="inScatta" type="file" accept="image/*" capture="environment" hidden><input id="inGalleria" type="file" accept="image/*" multiple hidden>
    </section>
    ${d.foto.length ? `<div class="filtri">${["tutte", ...TIPI.map((t) => t[0])].map((k) => `<button type="button" aria-pressed="${S.filtro === k}" data-filtro="${k}">${esc(k === "tutte" ? T("Tutte", "All") : nomeTipo(k))} (${conta(k)})</button>`).join("")}</div>` : ""}
    <ul class="elenco">${vis.map(schedaFoto).join("")}</ul>
    ${d.foto.length ? "" : `<p class="nota">${esc(T("Nessuna foto: scegli il tipo e scatta. Per ogni punto della torretta segna stanza, altezza disponibile, pavimento e rivestimento: con «Trova la torretta» la guida parte già compilata.", "No photos yet: choose the type and shoot. For each outlet position note room, available height, floor and covering: «Find the outlet» opens the guide already filled in."))}</p>`}
    <section class="box"><h2>${esc(T("Appunti del sopralluogo", "Survey notes"))}</h2>
      <textarea id="appunti" maxlength="5000" placeholder="${esc(T("Accessi, impianti esistenti, tipo di pulizia del pavimento, cose da chiedere al cliente…", "Access, existing installations, floor cleaning, questions for the client…"))}">${esc(d.appunti)}</textarea>
      <div style="margin-top:6px">${pulsanteDetta("appunti")}</div></section>
    <section class="box"><h2>${esc(T("Messaggi vocali", "Voice messages"))}</h2>
      <p class="nota">${esc(T("Registra un appunto a voce (fino a 5 minuti): resta nel progetto e puoi scriverne un riassunto. Per un vocale su una foto, apri la foto.", "Record a voice note (up to 5 minutes): it stays in the project and you can write a summary. For a voice note on a photo, open the photo."))}</p>
      ${vocali("")}</section>`;
  statoSalvataggio();
}
function schedaFoto(f) {
  const aperta = S.aperta === f.id, nv = S.dati.vocali.filter((v) => v.foto === f.id).length;
  return `<li class="foto" data-id="${esc(f.id)}">
    <button type="button" data-ingrandisci="${esc(f.percorso)}" aria-label="${esc(T("Ingrandisci la foto", "Enlarge the photo"))}">${URLS[f.percorso] ? `<img src="${URLS[f.percorso]}" alt="${esc(f.didascalia || T("Foto del sopralluogo", "Survey photo"))}">` : `<div class="vuota">${esc(T("Foto", "Photo"))}</div>`}</button>
    <div class="corpo">
      <input type="text" data-campo="didascalia" maxlength="300" value="${esc(f.didascalia)}" placeholder="${esc(T("Cosa si vede (es. punto scrivania 3)", "What it shows (e.g. desk 3 position)"))}" aria-label="${esc(T("Didascalia", "Caption"))}">
      <input type="text" data-campo="stanza" maxlength="60" value="${esc(f.stanza)}" placeholder="${esc(T("Stanza (es. Ufficio 1)", "Room (e.g. Office 1)"))}" aria-label="${esc(T("Stanza", "Room"))}">
      <div class="meta"><span class="t">${esc(nomeTipo(f.categoria))}</span><span>${esc(quando(f.data))}</span>${f.h ? `<span class="t">H ${esc(f.h)} mm</span>` : ""}${f.pavimento ? `<span class="t">${esc(f.pavimento)}</span>` : ""}${f.rivestimento !== "" && f.rivestimento != null ? `<span class="t">${esc(T("riv.", "cov."))} ${esc(f.rivestimento)} mm</span>` : ""}${nv ? `<span class="v">${nv} ${esc(T("vocali", "voice"))}</span>` : ""}${f.nota && !aperta ? `<span>· ${esc(f.nota.slice(0, 60))}</span>` : ""}</div>
      <button type="button" class="mini-btn" data-apri-foto="${esc(f.id)}" aria-expanded="${aperta}">${aperta ? esc(T("Chiudi dettagli", "Close details")) : esc(T("Misure, nota e vocali", "Measures, note and voice"))}</button>
      ${aperta ? `<select data-campo="categoria" aria-label="${esc(T("Tipo", "Type"))}"><option value="">${esc(T("Senza tipo", "No type"))}</option>${TIPI.map(([k]) => `<option value="${k}"${f.categoria === k ? " selected" : ""}>${esc(nomeTipo(k))}</option>`).join("")}</select>
        <div class="tre">
          <label>${esc(T("Altezza disponibile H (mm)", "Available height H (mm)"))}<input type="number" inputmode="numeric" min="0" max="1000" data-campo="h" value="${esc(f.h)}" placeholder="${esc(T("solaio → finito", "slab → floor"))}"></label>
          <label>${esc(T("Pavimento", "Floor"))}<select data-campo="pavimento"><option value="">${esc(T("non so", "unknown"))}</option>${[["massetto", T("Massetto", "Screed")], ["flottante", T("Flottante", "Raised floor")], ["seminato", T("Seminato", "Terrazzo")]].map(([v, t]) => `<option value="${v}"${f.pavimento === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
          <label>${esc(T("Rivestimento (mm)", "Covering (mm)"))}<input type="number" inputmode="numeric" min="0" max="60" data-campo="rivestimento" value="${esc(f.rivestimento)}"></label>
        </div>
        <textarea data-campo="nota" maxlength="1000" placeholder="${esc(T("Nota (es. pavimento in gres, pulizia con lavasciuga, 4 prese + 2 dati)", "Note (e.g. tiles, machine cleaning, 4 sockets + 2 data)"))}" aria-label="${esc(T("Nota", "Note"))}">${esc(f.nota)}</textarea>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${pulsanteDetta("nota:" + f.id)}<button type="button" class="mini-btn arancio" data-trova="${esc(f.id)}">${ico("cerca")} ${esc(T("Trova la torretta per questo punto", "Find the outlet for this point"))}</button></div>
        ${vocali(f.id)}` : ""}
    </div></li>`;
}

// ---------- dettatura e vocali ----------
const Ricon = window.SpeechRecognition || window.webkitSpeechRecognition;
let dettatura = null, dettaCampo = "";
function pulsanteDetta(campo) {
  if (!Ricon) return "";
  const attiva = dettaCampo === campo;
  return `<button type="button" class="mini-btn${attiva ? " attivo" : ""}" data-detta="${esc(campo)}" aria-pressed="${attiva}">${attiva ? `<span class="puntino"></span> ${esc(T("Ferma dettatura", "Stop dictation"))}` : ico("microfono") + " " + esc(T("Detta", "Dictate"))}</button>`;
}
function detta(campo) {
  if (dettatura) { const c = dettaCampo; dettatura.stop(); dettatura = null; dettaCampo = ""; disegna(); if (c === campo) return; }
  dettatura = new Ricon(); dettatura.lang = en() ? "en-GB" : "it-IT"; dettatura.continuous = true; dettatura.interimResults = false; dettaCampo = campo;
  dettatura.onresult = (e) => {
    const frase = Array.from(e.results).slice(e.resultIndex).filter((r) => r.isFinal).map((r) => r[0].transcript.trim()).join(" "); if (!frase) return;
    const agg = (v) => `${v || ""}${v && !/\s$/.test(v) ? " " : ""}${frase}.`;
    if (campo === "appunti") cambia({ appunti: agg(S.dati.appunti).slice(0, 5000) });
    else if (campo.startsWith("nota:")) { const id = campo.slice(5), f = S.dati.foto.find((x) => x.id === id); if (f) cambiaFoto(id, { nota: agg(f.nota).slice(0, 1000) }); }
    else if (campo.startsWith("voc:")) { const id = campo.slice(4), v = S.dati.vocali.find((x) => x.id === id); if (v) cambia({ vocali: S.dati.vocali.map((x) => (x.id === id ? { ...x, testo: agg(x.testo).slice(0, 2000) } : x)) }); }
    disegna();
  };
  dettatura.onend = () => { if (dettaCampo === campo) { dettatura = null; dettaCampo = ""; disegna(); } };
  dettatura.onerror = () => { dettatura = null; dettaCampo = ""; S.msg = T("Dettatura non disponibile: usa il microfono della tastiera.", "Dictation not available: use the keyboard microphone."); disegna(); };
  dettatura.start(); disegna();
}
let reg = null;
function vocali(foto) {
  const miei = S.dati.vocali.filter((v) => (v.foto || "") === foto), registra = reg && reg.foto === foto;
  const puo = !!(navigator.mediaDevices && window.MediaRecorder);
  return `${puo ? `<div style="margin-top:6px"><button type="button" class="mini-btn${registra ? " attivo" : ""}" data-registra="${esc(foto)}">${registra ? `<span class="puntino"></span> ${esc(T("Ferma e salva", "Stop and save"))} (${mmss(reg.secondi)})` : ico("microfono") + " " + esc(T("Registra messaggio vocale", "Record voice message"))}</button></div>` : ""}
    ${miei.map((v) => `<div class="vocale" data-voc="${esc(v.id)}"><div class="meta"><span>${esc(quando(v.data))} · ${mmss(v.durata || 0)}</span><button type="button" class="mini-btn" style="margin-left:auto" data-togli-voc="${esc(v.id)}">${esc(T("Togli", "Remove"))}</button></div>
      ${URLS[v.percorso] ? `<audio controls preload="metadata" src="${URLS[v.percorso]}"></audio>` : `<p class="nota">${esc(T("Audio non disponibile su questo dispositivo.", "Audio not available on this device."))}</p>`}
      <textarea data-voc-testo="${esc(v.id)}" maxlength="2000" placeholder="${esc(T("Riassunto del messaggio (scrivi o detta)", "Summary (type or dictate)"))}">${esc(v.testo)}</textarea>${pulsanteDetta("voc:" + v.id)}</div>`).join("")}`;
}
async function avviaRegistrazione(foto) {
  if (reg) { reg.rec.stop(); return; }
  try {
    const flusso = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tipo = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
    const rec = new MediaRecorder(flusso, tipo ? { mimeType: tipo } : undefined), pezzi = [], inizio = Date.now();
    reg = { foto, rec, secondi: 0, giro: setInterval(() => { reg.secondi = (Date.now() - inizio) / 1000; if (reg.secondi >= 300) rec.stop(); disegna(); }, 1000) };
    rec.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
    rec.onstop = async () => {
      clearInterval(reg.giro); flusso.getTracks().forEach((t) => t.stop());
      const durata = Math.round((Date.now() - inizio) / 1000), blob = new Blob(pezzi, { type: rec.mimeType || "audio/webm" }), est = /mp4/.test(blob.type) ? "m4a" : "webm";
      reg = null; const pc = percorso(est); const esito = await salvaFile(pc, blob); URLS[pc] = URL.createObjectURL(blob);
      cambia({ vocali: [...S.dati.vocali, { id: pc.split("/").pop(), percorso: pc, data: new Date().toISOString(), durata, foto, testo: "" }].slice(-100) });
      S.msg = esito === "in-coda" ? (ultimoErrore || T("Senza rete: il messaggio resta sul telefono e si carica da solo.", "Offline: the message stays on the phone and uploads by itself.")) : "";
      S.inCoda = (await inCoda()).length; disegna();
    };
    rec.start(); disegna();
  } catch { S.msg = T("Microfono non disponibile: controlla i permessi del browser.", "Microphone not available: check the browser permissions."); disegna(); }
}

// ---------- azioni ----------
async function aggiungiFoto(files) {
  if (!files?.length || !S.progetto) return;
  S.msg = T("Salvo le foto…", "Saving photos…"); disegna();
  const nuove = [];
  for (const f of Array.from(files).slice(0, 20)) {
    const pc = percorso("jpg"), blob = await riduci(f), esito = await salvaFile(pc, blob);
    URLS[pc] = URL.createObjectURL(blob);
    nuove.push({ id: pc.split("/").pop(), percorso: pc, categoria: S.tipoNuove, stanza: "", didascalia: "", nota: "", h: "", pavimento: "", rivestimento: "", data: new Date().toISOString() });
    S.msg = esito === "in-coda" ? T("Senza rete: le foto restano sul telefono e si caricano da sole quando torna la connessione.", "Offline: photos stay on the phone and upload when the connection is back.") : "";
  }
  if (nuove.length) { S.aperta = nuove[nuove.length - 1].id; cambia({ foto: [...S.dati.foto, ...nuove].slice(-150) }); }
  S.inCoda = (await inCoda()).length; disegna();
}
const NUM = new Set(["h", "rivestimento"]);
$("sop").addEventListener("input", (e) => {
  const el = e.target, li = el.closest("[data-id]");
  if (el.id === "appunti") return cambia({ appunti: el.value });
  if (el.dataset.vocTesto) return cambia({ vocali: S.dati.vocali.map((v) => (v.id === el.dataset.vocTesto ? { ...v, testo: el.value } : v)) });
  if (li && el.dataset.campo && el.tagName !== "SELECT") cambiaFoto(li.dataset.id, { [el.dataset.campo]: NUM.has(el.dataset.campo) ? el.value.replace(/[^\d]/g, "") : el.value });
});
$("sop").addEventListener("change", (e) => {
  const el = e.target, li = el.closest("[data-id]");
  if (el.id === "inScatta" || el.id === "inGalleria") { aggiungiFoto(el.files).finally(() => { el.value = ""; }); return; }
  if (li && el.dataset.campo && el.tagName === "SELECT") { cambiaFoto(li.dataset.id, { [el.dataset.campo]: el.value }); disegna(); }
});
$("sop").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.apri) return void apri(d.apri);
  if ("cambia" in d) { S.progetto = null; scrivi(CHIAVE_PROG, null); return disegna(); }
  if ("sync" in d) return void sincronizza().then((r) => { S.inCoda = r; disegna(); });
  if (d.tipo) { S.tipoNuove = d.tipo; return disegna(); }
  if ("scatta" in d) return $("inScatta").click();
  if ("galleria" in d) return $("inGalleria").click();
  if (d.filtro) { S.filtro = d.filtro; return disegna(); }
  if (d.apriFoto) { S.aperta = S.aperta === d.apriFoto ? null : d.apriFoto; return disegna(); }
  if (d.ingrandisci && URLS[d.ingrandisci]) { const v = $("vista"); v.innerHTML = `<img src="${URLS[d.ingrandisci]}" alt="">`; v.hidden = false; return; }
  if (d.detta) return detta(d.detta);
  if (d.registra !== undefined) return void avviaRegistrazione(d.registra);
  if (d.togliVoc) {
    const v = S.dati.vocali.find((x) => x.id === d.togliVoc);
    // toglie il messaggio dal sopralluogo: il file resta nell'archivio, che non cancella mai nulla
    if (v && confirm(T("Togliere il messaggio vocale del ", "Remove the voice message of ") + quando(v.data) + "?")) { cambia({ vocali: S.dati.vocali.filter((x) => x.id !== v.id) }); disegna(); }
    return;
  }
  if (d.trova) {
    const f = S.dati.foto.find((x) => x.id === d.trova); if (!f) return;
    try { sessionStorage.setItem("obo-torrette-filtri", JSON.stringify({ altezza: f.h || "", pavimento: f.pavimento || "", rivestimento: f.rivestimento ?? "" })); } catch { /* niente */ }
    const vai = () => { location.href = "./"; };
    return S.attesa || S.salvando ? scriviCloud().then(vai) : vai();
  }
});
$("vista").onclick = () => { $("vista").hidden = true; };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("vista").hidden = true; });
