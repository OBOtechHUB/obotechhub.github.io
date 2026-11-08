/*
 * Configuratore torrette – stesso schema di OBO Construct underfloor:
 *   1 Progetto  →  2 Pavimento  →  3 Torretta  →  4 Apparecchi  →  5 Riepilogo
 * Le torrette configurate diventano "torrette tipo" del progetto, riusabili in tutte le stanze compatibili.
 * Nel Riepilogo l'edificio si divide in unità (piani, aree) e stanze; ogni stanza ha il suo pavimento e le sue torrette.
 * Il progetto resta salvato in questo browser.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";
import { FAMIGLIE, PAVIMENTI, MODULI_DATI, NOTA_DATI } from "./dati.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const nuovoId = () => Math.random().toString(36).slice(2, 9);
document.addEventListener("gesturestart", (e) => e.preventDefault());

// ---------- lingua, tema e testo condivisi con le altre app ----------
const en = () => leggi("obo-lingua") === "en";
const T = (it, eng) => (en() ? eng : it);
const N = (o, k = "") => (o ? (en() ? o[k + "en"] ?? o[k + "it"] : o[k + "it"]) : "");
function testiFissi() {
  document.documentElement.lang = en() ? "en" : "it";
  document.querySelectorAll("[data-t]").forEach((el) => { const [i, e] = el.dataset.t.split("|"); el.textContent = en() ? e : i; });
  $("aspetto").title = T("Aspetto", "Display"); $("aspetto").setAttribute("aria-label", $("aspetto").title);
  pannelloAspetto();
  $("notaDati").textContent = N(NOTA_DATI);
}
const PASSI_ZOOM = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.45];
const zoom = () => { const v = Number(leggi("obo-zoom")); return PASSI_ZOOM.includes(v) ? v : 1; };
const applicaZoom = () => document.documentElement.style.setProperty("--zoom", String(zoom()));
const cambiaZoom = (d) => { const i = PASSI_ZOOM.indexOf(zoom()); const z = PASSI_ZOOM[Math.min(PASSI_ZOOM.length - 1, Math.max(0, i + d))]; scrivi("obo-zoom", z === 1 ? null : String(z)); applicaZoom(); };
const applicaTema = () => { const t = leggi("obo-tema"); document.documentElement.dataset.theme = (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)) ? "dark" : "light"; };
// un solo pulsante "Aspetto" (come in OBO Hub): lingua, tema e dimensione del testo
function pannelloAspetto() {
  const p = $("pannelloAspetto"), t = leggi("obo-tema") || "auto", l = en() ? "en" : "it", z = Math.round(zoom() * 100);
  const seg = (voci, att) => `<span class="seg">${voci.map(([k, x]) => `<button type="button" data-k="${k}" aria-pressed="${k === att}">${x}</button>`).join("")}</span>`;
  p.innerHTML = `<div class="riga"><span>${T("Lingua", "Language")}</span>${seg([["it", "IT"], ["en", "EN"]], l)}</div>
    <div class="riga"><span>${T("Tema", "Theme")}</span>${seg([["auto", "Auto"], ["light", T("Chiaro", "Light")], ["dark", T("Scuro", "Dark")]], t)}</div>
    <div class="riga"><span>${T("Testo", "Text")}</span><span class="seg"><button type="button" data-z="-1" aria-label="${T("Testo più piccolo", "Smaller text")}">A−</button><span class="zv">${z}%</span><button type="button" data-z="1" aria-label="${T("Testo più grande", "Larger text")}">A+</button></span></div>`;
}
$("aspetto").onclick = (e) => { e.stopPropagation(); $("pannelloAspetto").hidden = !$("pannelloAspetto").hidden; };
$("pannelloAspetto").onclick = (e) => {
  e.stopPropagation(); const x = e.target.closest("button"); if (!x) return;
  const k = x.dataset.k;
  if (k === "it" || k === "en") { scrivi("obo-lingua", k === "en" ? "en" : null); disegna(); }
  else if (k) { scrivi("obo-tema", k === "auto" ? null : k); applicaTema(); }
  else if (x.dataset.z) cambiaZoom(Number(x.dataset.z));
  testiFissi();
};
document.addEventListener("click", () => { $("pannelloAspetto").hidden = true; });
addEventListener("storage", (e) => { if (["obo-lingua", "obo-tema", "obo-zoom"].includes(e.key)) { applicaTema(); applicaZoom(); testiFissi(); disegna(); } });
testiFissi();

// ---------- accesso con la sessione di OBO Hub ----------
// In preparazione: entra solo l'amministratore. Quando sarà pronta: anche chi ha la sezione "app_torrette".
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
function fuori(msg) { $("cancelloMsg").textContent = msg; $("cancelloBtn").hidden = false; }
(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return fuori(T("Entra da OBO Hub per usare il configuratore.", "Sign in from OBO Hub to use the configurator."));
    const [{ data: aal }, { data: profilo }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.from("accessi_profili").select("ruolo, sezioni").eq("utente", session.user.id).maybeSingle(),
    ]);
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") return fuori(T("Completa l'accesso con Authenticator da OBO Hub.", "Complete the Authenticator sign-in from OBO Hub."));
    if (!profilo || profilo.ruolo !== "admin") return fuori(T("Non hai accesso a questa app.", "You don't have access to this app."));
    $("cancello").hidden = true; $("app").hidden = false; disegna();
  } catch { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); }
})();

// ---------- dati del progetto (salvati in questo browser) ----------
const CHIAVE = "obo-torrette-progetto";
let P; try { P = JSON.parse(leggi(CHIAVE) || "null"); } catch { P = null; }
if (!P || !Array.isArray(P.tipi)) P = { nome: "", crm: "", tipi: [], unita: [] };
const salva = () => scrivi(CHIAVE, JSON.stringify(P));

const famiglia = (id) => FAMIGLIE.find((f) => f.id === id);
const modello = (fid, mid) => famiglia(fid)?.modelli.find((m) => m.id === mid);
const pavimento = (id) => PAVIMENTI.find((p) => p.id === id);

/** Il modello si può posare su quel pavimento e a quell'altezza? Restituisce "" se sì, altrimenti il motivo. */
function incompatibile(m, pav, alt) {
  const p = m.pavimenti?.[pav];
  if (!p) return T("non adatto a questo pavimento", "not suitable for this floor");
  const h = Number(alt) || 0;
  if (h && p.min && h < p.min) return T(`serve almeno ${p.min} mm`, `needs at least ${p.min} mm`);
  if (h && p.max && h > p.max) return T(`massimo ${p.max} mm`, `maximum ${p.max} mm`);
  return "";
}

/** Articoli per UNA torretta di quel tipo. */
function articoli(t) {
  const m = modello(t.famiglia, t.modello); if (!m) return [];
  const out = [...(m.pavimenti?.[t.pavimento]?.articoli ?? [])];
  for (const g of m.scelte) { const o = g.opzioni.find((x) => x.id === t.scelte[g.id]); if (o?.articoli) out.push(...o.articoli); }
  for (const [g1, perOpz] of Object.entries(m.articoliPer ?? {})) {
    const dip = perOpz[t.scelte[g1]]; if (!dip) continue;
    for (const [g2, mappa] of Object.entries(dip)) out.push(...(mappa[t.scelte[g2]] ?? []));
  }
  if (t.scelte.dati && t.scelte.dati !== "no") { const mod = MODULI_DATI.find((x) => x.codice === t.modulo); if (mod) out.push({ ...mod, qta: 2 }); }
  return out;
}
function descrizioneTipo(t) {
  const m = modello(t.famiglia, t.modello); if (!m) return "";
  return [N(m), N(pavimento(t.pavimento)) + (t.altezza ? ` ${t.altezza} mm` : ""),
    ...m.scelte.map((g) => N(g.opzioni.find((o) => o.id === t.scelte[g.id])))].filter(Boolean).join(" · ");
}
function quanteTorrette(tipoId) { let n = 0; for (const u of P.unita) for (const s of u.stanze) for (const r of s.righe) if (r.tipo === tipoId) n += r.qta; return n; }

// ---------- stato della schermata ----------
const V = { scheda: "progetto", passo: 1, bozza: null, cerca: "" };
function nuovaBozza() {
  const n = P.tipi.length + 1;
  return { id: nuovoId(), nome: `T${n}`, pavimento: "massetto", altezza: 100, famiglia: null, modello: null, scelte: {}, modulo: MODULI_DATI[0].codice, nuovo: true };
}

function disegna() {
  if ($("app").hidden) return;
  document.querySelectorAll(".scheda").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.scheda === V.scheda)));
  $("notaDati").hidden = V.scheda === "riepilogo";
  const html = V.scheda === "trova" ? vistaTrova() : V.scheda === "riepilogo" ? passi(5) + vistaRiepilogo()
    : V.passo === 1 ? passi(1) + vistaProgetto() : V.passo === 2 ? passi(2) + vistaPavimento() : V.passo === 3 ? passi(3) + vistaTorretta() : passi(4) + vistaApparecchi();
  $("vista").innerHTML = html;
  if (V.scheda === "trova") { const i = $("cerca"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}
document.querySelectorAll(".scheda").forEach((b) => (b.onclick = () => { V.scheda = b.dataset.scheda; if (b.dataset.scheda === "progetto") { V.passo = 1; V.bozza = null; } disegna(); }));

function passi(n) {
  const nomi = [T("Progetto", "Project"), T("Pavimento", "Floor"), T("Torretta", "Outlet"), T("Apparecchi", "Devices"), T("Riepilogo", "Summary")];
  return `<div class="passi noprint">${nomi.map((x, i) => {
    const k = i + 1, raggiungibile = k === 1 || k === 5 || (V.bozza && (k <= 2 || (k === 3) || (k === 4 && V.bozza.modello)));
    return `<button class="passo ${k < n ? "fatto" : ""} ${k === n ? "attivo" : ""}" data-passo="${k}" ${raggiungibile && k !== n ? "" : "disabled"}>${k}. ${esc(x)}</button>`;
  }).join("")}</div>`;
}

// 1 · Progetto
function vistaProgetto() {
  return `<div class="campi">
      <label>${T("Nome progetto", "Project name")}<input type="text" data-p="nome" value="${esc(P.nome)}" placeholder="${T("Es. Uffici via Roma", "E.g. Via Roma offices")}"></label>
      <label>${T("Numero progetto CRM", "CRM project number")}<input type="text" data-p="crm" value="${esc(P.crm)}" placeholder="${T("Es. P-2026-0142", "E.g. P-2026-0142")}">
        <span class="crm">${T("Attenzione: indica l'ID progetto identico al CRM.", "Note: enter the project ID exactly as in the CRM.")}</span></label>
    </div>
    <h2>${T("Torrette tipo del progetto", "Project outlet types")}</h2>
    <p class="nota">${T("Ogni torretta tipo si configura una volta e si riusa in tutte le stanze con lo stesso pavimento.", "Configure each outlet type once and reuse it in every room with the same floor.")}</p>
    <div class="griglia">` + P.tipi.map((t) => `
      <div class="tipo"><h3>${esc(t.nome)}</h3><p>${esc(descrizioneTipo(t))}</p>
        <p>${T("Posate", "Placed")}: <b>${quanteTorrette(t.id)}</b></p>
        <div class="mini"><button data-modifica="${t.id}">${T("Modifica", "Edit")}</button><button data-duplica="${t.id}">${T("Duplica", "Duplicate")}</button><button data-elimina="${t.id}">${T("Elimina", "Delete")}</button></div>
      </div>`).join("") + `
      <button class="carta" data-azione="nuovo-tipo" style="align-items:center;justify-content:center;min-height:120px"><h3>+ ${T("Nuova torretta tipo", "New outlet type")}</h3><p>${T("Pavimento → torretta → apparecchi", "Floor → outlet → devices")}</p></button>
    </div>
    <div class="piede noprint"><span></span><button class="btn btn-primario" data-vai="riepilogo" ${P.tipi.length ? "" : "disabled"}>${T("Riepilogo: unità e stanze", "Summary: units and rooms")} →</button></div>`;
}

// 2 · Pavimento
function vistaPavimento() {
  const b = V.bozza, p = pavimento(b.pavimento);
  return `<h2>${T("Parametri del pavimento", "Floor parameters")}</h2><div class="griglia">` + PAVIMENTI.map((x) => `
      <button class="carta opz" data-pav="${x.id}" aria-pressed="${b.pavimento === x.id}"><h3>${esc(N(x))}</h3><p>${esc(N(x, "descr_"))}</p></button>`).join("") + `</div>
    <div class="campi" style="margin-top:16px"><label>${esc(N(p, "altezza_"))}<input type="number" id="altezza" min="0" max="2000" step="5" value="${esc(b.altezza)}"></label></div>
    <div class="piede noprint"><button class="btn btn-bordo" data-passo-vai="1">← ${T("Progetto", "Project")}</button><button class="btn btn-primario" data-passo-vai="3">${T("Avanti: torretta", "Next: outlet")} →</button></div>`;
}

// 3 · Torretta (famiglia, modello, coperchio, finitura)
function vistaTorretta() {
  const b = V.bozza;
  let h = `<p class="nota">${T("Pavimento", "Floor")}: <b>${esc(N(pavimento(b.pavimento)))}${b.altezza ? ` · ${esc(b.altezza)} mm` : ""}</b>. ${T("Sono attivi solo i modelli adatti.", "Only suitable models are enabled.")}</p>`;
  h += FAMIGLIE.map((f) => `<h2>${esc(N(f))}</h2><p class="nota" style="margin-top:-6px">${esc(N(f, "descr_"))}</p>` + (f.daCompletare
    ? `<p class="presto">${T("In preparazione: modelli da caricare.", "In preparation: models to be added.")}</p>`
    : `<div class="griglia">${f.modelli.map((m) => { const no = incompatibile(m, b.pavimento, b.altezza); const nota = m.pavimenti?.[b.pavimento];
        return `<button class="carta opz" data-mod="${f.id}|${m.id}" aria-pressed="${b.modello === m.id}" ${no ? "disabled" : ""}><h3>${esc(N(m))}</h3><p>${esc(N(m, "descr_"))}</p>${no ? `<span class="motivo">${esc(no)}</span>` : nota?.nota_it ? `<span class="nota" style="margin:0">${esc(N(nota, "nota_"))}</span>` : ""}</button>`; }).join("")}</div>`)).join("");
  const m = b.modello && modello(b.famiglia, b.modello);
  if (m) h += `<h2 style="margin-top:24px">${esc(N(m))}</h2>` + gruppi(m, (g) => !g.passo);
  return h + `<div class="piede noprint"><button class="btn btn-bordo" data-passo-vai="2">← ${T("Pavimento", "Floor")}</button><button class="btn btn-primario" data-passo-vai="4" ${m ? "" : "disabled"}>${T("Avanti: apparecchi", "Next: devices")} →</button></div>`;
}
function gruppi(m, filtro) {
  const b = V.bozza;
  return m.scelte.filter(filtro).map((g) => `<div class="scelta"><h3>${esc(N(g))}</h3><div class="opzioni">${g.opzioni.map((o) => `
    <button class="opz" data-gruppo="${g.id}" data-opz="${o.id}" aria-pressed="${b.scelte[g.id] === o.id}">${esc(N(o))}${o.nota_it ? `<small>${esc(N(o, "nota_"))}</small>` : ""}</button>`).join("")}</div></div>`).join("");
}

// 4 · Apparecchi (supporto, prese dati) + nome e salvataggio della torretta tipo
function vistaApparecchi() {
  const b = V.bozza, m = modello(b.famiglia, b.modello), arts = articoli(b);
  return `<h2>${esc(N(m))}</h2><div class="due"><div>` + gruppi(m, (g) => g.passo === "apparecchi") +
    (b.scelte.dati && b.scelte.dati !== "no" ? `<div class="scelta"><h3>${T("Moduli dati (2 per piastra)", "Data modules (2 per plate)")}</h3>
      <select id="modulo">${MODULI_DATI.map((x) => `<option value="${x.codice}" ${x.codice === b.modulo ? "selected" : ""}>${esc(x.tipo)} · ${esc(N(x))}</option>`).join("")}</select></div>` : "") +
    `</div><aside class="riepilogo"><h3>${T("Articoli per una torretta", "Parts for one outlet")}</h3>${tabella(arts)}
      <div class="campi" style="margin:12px 0 0"><label>${T("Nome della torretta tipo", "Outlet type name")}<input type="text" id="nomeTipo" value="${esc(b.nome)}" placeholder="${T("Es. T1 open space", "E.g. T1 open space")}"></label></div>
      <div class="riga"><button class="btn btn-primario" data-azione="salva-tipo">${b.nuovo ? T("Salva nel progetto", "Save to project") : T("Salva modifiche", "Save changes")}</button></div>
    </aside></div>
    <div class="piede noprint"><button class="btn btn-bordo" data-passo-vai="3">← ${T("Torretta", "Outlet")}</button><span></span></div>`;
}

function tabella(arts, extra) {
  if (!arts.length) return `<p class="vuoto">${T("Nessun articolo.", "No parts.")}</p>`;
  return `<table><thead><tr><th>${T("Codice", "Code")}</th><th>${T("Tipo", "Type")}</th><th class="nascondi-mobile">${T("Descrizione", "Description")}</th><th class="n">${T("Q.tà", "Qty")}</th></tr></thead><tbody>` +
    arts.map((a) => `<tr><td class="cod">${esc(a.codice)}</td><td>${esc(a.tipo)}</td><td class="nascondi-mobile">${esc(N(a))}</td><td class="n">${a.qta}</td></tr>`).join("") + "</tbody></table>" + (extra ?? "");
}

// 5 · Riepilogo: unità → stanze → torrette, e distinta materiali
function totali() {
  const m = new Map();
  for (const u of P.unita) for (const s of u.stanze) for (const r of s.righe) {
    const t = P.tipi.find((x) => x.id === r.tipo); if (!t || !r.qta) continue;
    for (const a of articoli(t)) { const x = m.get(a.codice) ?? { ...a, qta: 0 }; x.qta += a.qta * r.qta; m.set(a.codice, x); }
  }
  return [...m.values()];
}
function vistaRiepilogo() {
  const titolo = [P.nome, P.crm && `CRM ${P.crm}`].filter(Boolean).join(" · ");
  let h = `<h2>${esc(titolo || T("Progetto senza nome", "Untitled project"))}</h2>
    <p class="nota noprint">${T("Dividi l'edificio in unità (piani, aree) e stanze. In ogni stanza scegli il pavimento e quante torrette di ogni tipo: si possono usare solo i tipi adatti a quel pavimento.", "Split the building into units (floors, areas) and rooms. In each room choose the floor and how many outlets of each type: only types suitable for that floor can be used.")}</p>`;
  h += P.unita.map((u) => `<section class="unita"><header><input type="text" data-unita-nome="${u.id}" value="${esc(u.nome)}" aria-label="${T("Nome unità", "Unit name")}">
      <span class="mini noprint"><button data-copia-unita="${u.id}">${T("Copia", "Copy")}</button><button data-togli-unita="${u.id}">${T("Elimina", "Delete")}</button></span></header>` +
    u.stanze.map((s) => stanza(u, s)).join("") +
    `<div class="stanza noprint"><button class="btn-piccolo" data-nuova-stanza="${u.id}">+ ${T("Stanza", "Room")}</button></div></section>`).join("");
  h += `<div class="riga noprint"><button class="btn btn-bordo" data-azione="nuova-unita">+ ${T("Unità (piano / area)", "Unit (floor / area)")}</button>
        <button class="btn btn-bordo" data-vai="progetto">+ ${T("Torretta tipo", "Outlet type")}</button></div>`;
  const tot = totali();
  h += `<h2 style="margin-top:28px">${T("Distinta materiali", "Bill of materials")}</h2>` + (tot.length ? tabella(tot) +
    `<div class="riga noprint"><button class="btn btn-primario" data-azione="excel">${T("Scarica Excel", "Download Excel")}</button><button class="btn btn-bordo" data-azione="stampa">${T("Stampa / PDF", "Print / PDF")}</button></div>`
    : `<p class="vuoto">${T("Aggiungi torrette alle stanze per vedere la distinta.", "Add outlets to rooms to see the bill of materials.")}</p>`);
  return h + `<div class="avviso">${esc(N(NOTA_DATI))}</div>`;
}
function stanza(u, s) {
  const adatti = P.tipi.filter((t) => { const m = modello(t.famiglia, t.modello); return m && !incompatibile(m, s.pavimento, s.altezza); });
  const giaUsati = new Set(s.righe.map((r) => r.tipo));
  return `<div class="stanza"><div class="testa">
      <input type="text" data-stanza-nome="${u.id}|${s.id}" value="${esc(s.nome)}" aria-label="${T("Nome stanza", "Room name")}">
      <select data-stanza-pav="${u.id}|${s.id}">${PAVIMENTI.map((p) => `<option value="${p.id}" ${p.id === s.pavimento ? "selected" : ""}>${esc(N(p))}</option>`).join("")}</select>
      <label>${T("h", "h")} <input type="number" data-stanza-alt="${u.id}|${s.id}" value="${esc(s.altezza)}" min="0" max="2000" step="5" style="width:80px"> mm</label>
      <span class="mini noprint"><button data-copia-stanza="${u.id}|${s.id}">${T("Copia", "Copy")}</button><button data-togli-stanza="${u.id}|${s.id}">${T("Elimina", "Delete")}</button></span>
    </div><div class="righe">` + s.righe.map((r, i) => {
      const t = P.tipi.find((x) => x.id === r.tipo); const m = t && modello(t.famiglia, t.modello);
      const no = !t ? T("tipo eliminato", "type deleted") : !m ? "" : incompatibile(m, s.pavimento, s.altezza) || (t.pavimento !== s.pavimento ? T("configurata per un altro pavimento", "configured for another floor") : "");
      return `<div class="r"><input type="number" min="0" max="999" value="${r.qta}" data-qta="${u.id}|${s.id}|${i}" style="width:70px"> × <b>${esc(t?.nome ?? "?")}</b>
        <span class="nascondi-mobile nota" style="margin:0">${esc(t ? descrizioneTipo(t) : "")}</span>${no ? `<span class="ko">⚠ ${esc(no)}</span>` : ""}
        <button class="ib noprint" data-togli-riga="${u.id}|${s.id}|${i}" title="${T("Togli", "Remove")}">✕</button></div>`;
    }).join("") +
    (P.tipi.length ? `<div class="r noprint"><select data-aggiungi="${u.id}|${s.id}"><option value="">+ ${T("Aggiungi torretta tipo…", "Add outlet type…")}</option>${adatti.filter((t) => !giaUsati.has(t.id)).map((t) => `<option value="${t.id}">${esc(t.nome)} · ${esc(descrizioneTipo(t))}</option>`).join("")}</select>
      ${adatti.length < P.tipi.length ? `<span class="nota" style="margin:0">${P.tipi.length - adatti.length} ${T("tipi non adatti a questo pavimento", "types not suitable for this floor")}</span>` : ""}</div>` : "") +
    `</div></div>`;
}

// Trova
function tuttiArticoli() {
  const m = new Map();
  const visita = (x, fam, mod) => {
    if (Array.isArray(x)) x.forEach((y) => visita(y, fam, mod));
    else if (x && typeof x === "object") { if (x.codice) { if (!m.has(x.codice)) m.set(x.codice, { ...x, fam, mod }); } else Object.values(x).forEach((y) => visita(y, fam, mod)); }
  };
  for (const f of FAMIGLIE) for (const mo of f.modelli) visita([mo.pavimenti ?? {}, mo.scelte, mo.articoliPer ?? {}], f, mo);
  for (const x of MODULI_DATI) if (!m.has(x.codice)) m.set(x.codice, { ...x });
  return [...m.values()];
}
function vistaTrova() {
  const q = V.cerca.trim().toLowerCase();
  const trovati = q ? tuttiArticoli().filter((a) => [a.codice, a.tipo, a.it, a.en].some((v) => String(v).toLowerCase().includes(q))) : [];
  return `<input type="search" id="cerca" value="${esc(V.cerca)}" placeholder="${T("Codice, tipo o descrizione (es. 7408838, GES R2, cromo)", "Code, type or description (e.g. 7408838, GES R2, chrome)")}">` +
    (q ? (trovati.length ? `<p class="nota">${trovati.length} ${T("risultati", "results")}</p><table><thead><tr><th>${T("Codice", "Code")}</th><th>${T("Tipo", "Type")}</th><th>${T("Descrizione", "Description")}</th><th class="nascondi-mobile">${T("Modello", "Model")}</th></tr></thead><tbody>` +
      trovati.map((a) => `<tr><td class="cod">${esc(a.codice)}</td><td>${esc(a.tipo)}</td><td>${esc(N(a))}</td><td class="nascondi-mobile">${esc(N(a.mod))}</td></tr>`).join("") + "</tbody></table>"
      : `<p class="vuoto">${T("Nessun articolo trovato.", "No parts found.")}</p>`) : `<p class="nota">${T("Cerca tra tutti gli articoli del configuratore.", "Search all parts in the configurator.")}</p>`);
}

// ---------- azioni ----------
const trovaStanza = (chiave) => { const [uid, sid] = chiave.split("|"); const u = P.unita.find((x) => x.id === uid); return [u, u?.stanze.find((x) => x.id === sid)]; };
const copia = (o) => JSON.parse(JSON.stringify(o));
function nuovaStanza(pav = "massetto", alt = 100) { return { id: nuovoId(), nome: T("Stanza", "Room") + " " + (P.unita.reduce((n, u) => n + u.stanze.length, 0) + 1), pavimento: pav, altezza: alt, righe: [] }; }

$("vista").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.passo) { const k = Number(d.passo); if (k === 5) V.scheda = "riepilogo"; else { V.scheda = "progetto"; V.passo = k; if (k === 1) V.bozza = null; } }
  else if (d.passoVai) { V.passo = Number(d.passoVai); if (V.passo === 1) V.bozza = null; }
  else if (d.vai) { V.scheda = d.vai; V.passo = 1; V.bozza = null; }
  else if (d.azione === "nuovo-tipo") { V.bozza = nuovaBozza(); V.passo = 2; }
  else if (d.modifica) { V.bozza = { ...copia(P.tipi.find((t) => t.id === d.modifica)), nuovo: false }; V.passo = 2; }
  else if (d.duplica) { const t = copia(P.tipi.find((x) => x.id === d.duplica)); t.id = nuovoId(); t.nome += " " + T("(copia)", "(copy)"); P.tipi.push(t); salva(); }
  else if (d.elimina) {
    const n = quanteTorrette(d.elimina);
    if (!n || confirm(T(`Questa torretta è posata ${n} volte: eliminarla anche dalle stanze?`, `This outlet is placed ${n} times: remove it from the rooms too?`))) {
      P.tipi = P.tipi.filter((t) => t.id !== d.elimina); for (const u of P.unita) for (const s of u.stanze) s.righe = s.righe.filter((r) => r.tipo !== d.elimina); salva();
    }
  }
  else if (d.pav) { V.bozza.pavimento = d.pav; const m = V.bozza.modello && modello(V.bozza.famiglia, V.bozza.modello); if (m && incompatibile(m, d.pav, V.bozza.altezza)) V.bozza.modello = null; }
  else if (d.mod) { const [f, m] = d.mod.split("|"); V.bozza.famiglia = f; V.bozza.modello = m; const mo = modello(f, m); const s = {}; for (const g of mo.scelte) s[g.id] = V.bozza.scelte[g.id] && g.opzioni.some((o) => o.id === V.bozza.scelte[g.id]) ? V.bozza.scelte[g.id] : g.opzioni[0].id; V.bozza.scelte = s; }
  else if (d.gruppo) V.bozza.scelte[d.gruppo] = d.opz;
  else if (d.azione === "salva-tipo") {
    const t = copia(V.bozza); delete t.nuovo; t.nome = ($("nomeTipo").value || t.nome).trim();
    const i = P.tipi.findIndex((x) => x.id === t.id); if (i >= 0) P.tipi[i] = t; else P.tipi.push(t);
    if (!P.unita.length) { const s = nuovaStanza(t.pavimento, t.altezza); s.righe.push({ tipo: t.id, qta: 1 }); P.unita.push({ id: nuovoId(), nome: T("Piano terra", "Ground floor"), stanze: [s] }); }
    salva(); V.bozza = null; V.passo = 1;
  }
  else if (d.azione === "nuova-unita") P.unita.push({ id: nuovoId(), nome: T("Piano", "Floor") + " " + P.unita.length, stanze: [nuovaStanza()] });
  else if (d.copiaUnita) { const u = copia(P.unita.find((x) => x.id === d.copiaUnita)); u.id = nuovoId(); u.nome += " " + T("(copia)", "(copy)"); u.stanze.forEach((s) => (s.id = nuovoId())); P.unita.push(u); }
  else if (d.togliUnita) { const u = P.unita.find((x) => x.id === d.togliUnita); if (!u.stanze.some((s) => s.righe.length) || confirm(T(`Eliminare "${u.nome}" con tutte le sue stanze?`, `Delete "${u.nome}" with all its rooms?`))) P.unita = P.unita.filter((x) => x !== u); }
  else if (d.nuovaStanza) { const u = P.unita.find((x) => x.id === d.nuovaStanza); const ultima = u.stanze[u.stanze.length - 1]; u.stanze.push(nuovaStanza(ultima?.pavimento, ultima?.altezza)); }
  else if (d.copiaStanza) { const [u, s] = trovaStanza(d.copiaStanza); const c = copia(s); c.id = nuovoId(); c.nome += " " + T("(copia)", "(copy)"); u.stanze.splice(u.stanze.indexOf(s) + 1, 0, c); }
  else if (d.togliStanza) { const [u, s] = trovaStanza(d.togliStanza); u.stanze = u.stanze.filter((x) => x !== s); }
  else if (d.togliRiga) { const [uid, sid, i] = d.togliRiga.split("|"); const [, s] = trovaStanza(uid + "|" + sid); s.righe.splice(Number(i), 1); }
  else if (d.azione === "excel") return scaricaExcel();
  else if (d.azione === "stampa") return window.print();
  else return;
  salva(); disegna();
});
$("vista").addEventListener("change", (e) => {
  const d = e.target.dataset, v = e.target.value;
  if (d.aggiungi) { if (!v) return; const [, s] = trovaStanza(d.aggiungi); s.righe.push({ tipo: v, qta: 1 }); }
  else if (d.stanzaPav) { const [, s] = trovaStanza(d.stanzaPav); s.pavimento = v; }
  else if (d.stanzaAlt) { const [, s] = trovaStanza(d.stanzaAlt); s.altezza = Math.max(0, Number(v) || 0); }
  else if (d.qta) { const [uid, sid, i] = d.qta.split("|"); const [, s] = trovaStanza(uid + "|" + sid); s.righe[Number(i)].qta = Math.max(0, Math.min(999, Math.round(Number(v) || 0))); }
  else if (e.target.id === "altezza") { V.bozza.altezza = Math.max(0, Number(v) || 0); const m = V.bozza.modello && modello(V.bozza.famiglia, V.bozza.modello); if (m && incompatibile(m, V.bozza.pavimento, V.bozza.altezza)) V.bozza.modello = null; }
  else if (e.target.id === "modulo") V.bozza.modulo = v;
  else return;
  salva(); disegna();
});
$("vista").addEventListener("input", (e) => {
  const d = e.target.dataset;
  if (e.target.id === "cerca") { V.cerca = e.target.value; disegna(); return; }
  if (d.p) P[d.p] = e.target.value.trim();
  else if (d.unitaNome) P.unita.find((x) => x.id === d.unitaNome).nome = e.target.value;
  else if (d.stanzaNome) { const [, s] = trovaStanza(d.stanzaNome); s.nome = e.target.value; }
  else if (e.target.id === "nomeTipo") V.bozza.nome = e.target.value;
  else return;
  salva(); // senza ridisegnare: si continua a scrivere nel campo
});

function scaricaExcel() {
  // CSV con ";" e BOM: si apre direttamente in Excel con colonne e accenti giusti.
  const c = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const r = [];
  r.push([T("Progetto", "Project"), P.nome].map(c).join(";"), [T("Numero progetto CRM", "CRM project number"), P.crm].map(c).join(";"), "");
  r.push(c(T("Distinta materiali", "Bill of materials")), [T("Codice", "Code"), T("Tipo", "Type"), T("Descrizione", "Description"), T("Quantità", "Quantity")].map(c).join(";"));
  for (const a of totali()) r.push([a.codice, a.tipo, N(a), a.qta].map(c).join(";"));
  r.push("", c(T("Torrette per stanza", "Outlets per room")), [T("Unità", "Unit"), T("Stanza", "Room"), T("Pavimento", "Floor"), T("Torretta tipo", "Outlet type"), T("Quantità", "Quantity")].map(c).join(";"));
  for (const u of P.unita) for (const s of u.stanze) for (const x of s.righe) { const t = P.tipi.find((y) => y.id === x.tipo); r.push([u.nome, s.nome, N(pavimento(s.pavimento)) + (s.altezza ? ` ${s.altezza} mm` : ""), t ? `${t.nome} · ${descrizioneTipo(t)}` : "?", x.qta].map(c).join(";")); }
  r.push("", c(N(NOTA_DATI)));
  const blob = new Blob(["﻿" + r.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  const base = (P.crm || P.nome || T("torrette", "service-outlets")).replace(/[^\w.-]+/g, "-");
  a.download = `${base}-${T("distinta", "bill-of-materials")}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
