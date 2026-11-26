/*
 * Pagina del Configuratore torrette e sistemi sottopavimento (UFS) di OBO Hub.
 * Il configuratore vero è torrette/ufs.js (compilato da torrette/sorgente con strumenti/torrette/compila.sh);
 * questa pagina fa l'accesso con la sessione di OBO Hub, sceglie il progetto, salva il carrello come "soluzione"
 * del progetto unico (tabella progetti_soluzioni, app "torrette", dati.versione = "ufs") e nel browser,
 * e scarica la distinta in CSV. Le configurazioni salvate con la versione precedente si aprono in precedente.html.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";

const $ = (id) => document.getElementById(id);
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* niente */ } };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
document.addEventListener("gesturestart", (e) => e.preventDefault());

// ---------- lingua, tema e testo condivisi con le altre app ----------
const en = () => leggi("obo-lingua") === "en";
const T = (it, eng) => (en() ? eng : it);
function testiFissi() {
  document.documentElement.lang = en() ? "en" : "it";
  document.querySelectorAll("[data-t]").forEach((el) => { const [i, e] = el.dataset.t.split("|"); el.textContent = en() ? e : i; });
  $("aspetto").title = T("Aspetto", "Display"); $("aspetto").setAttribute("aria-label", $("aspetto").title);
  pannelloAspetto();
}
const PASSI_ZOOM = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.45];
const zoom = () => { const v = Number(leggi("obo-zoom")); return PASSI_ZOOM.includes(v) ? v : 1; };
const applicaZoom = () => document.documentElement.style.setProperty("--zoom", String(zoom()));
const cambiaZoom = (d) => { const i = PASSI_ZOOM.indexOf(zoom()); const z = PASSI_ZOOM[Math.min(PASSI_ZOOM.length - 1, Math.max(0, i + d))]; scrivi("obo-zoom", z === 1 ? null : String(z)); applicaZoom(); };
const applicaTema = () => { const t = leggi("obo-tema"); document.documentElement.dataset.theme = (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)) ? "dark" : "light"; };
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
  if (k === "it" || k === "en") scrivi("obo-lingua", k === "en" ? "en" : null);
  else if (k) { scrivi("obo-tema", k === "auto" ? null : k); applicaTema(); }
  else if (x.dataset.z) cambiaZoom(Number(x.dataset.z));
  testiFissi(); disegnaProgetti();
};
document.addEventListener("click", () => { $("pannelloAspetto").hidden = true; });
addEventListener("storage", (e) => { if (["obo-lingua", "obo-tema", "obo-zoom"].includes(e.key)) { applicaTema(); applicaZoom(); testiFissi(); disegnaProgetti(); } });
applicaZoom(); testiFissi();

// ---------- stato: carrello del configuratore, progetto e soluzione ----------
const CHIAVE = "obo-torrette-ufs";
let S; try { S = JSON.parse(leggi(CHIAVE) || "null"); } catch { S = null; }
if (!S || !Array.isArray(S.carrello)) S = { progettoId: null, sol: null, carrello: [] };
const C = { progetti: [], attivo: false, timer: null, versione: 0 };
const stato = (t) => { $("statoCloud").textContent = t; };

function monta() {
  // la chiave cambia quando si apre un'altra configurazione: il configuratore riparte dal carrello salvato
  C.versione++;
  const el = $("ufs"); el.innerHTML = ""; const box = document.createElement("div"); el.appendChild(box);
  if (!window.OBOTorrette) { stato(T("Configuratore non caricato: ricarica la pagina.", "Configurator not loaded: reload the page.")); return; }
  window.OBOTorrette.monta(box, { carrelloIniziale: S.carrello, onCarrello: (c) => { if (JSON.stringify(c) === JSON.stringify(S.carrello)) return; S.carrello = c; salva(); } });
}
function salva() { scrivi(CHIAVE, JSON.stringify(S)); salvaCloud(); }

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
    // in preparazione: entra solo l'amministratore (come la versione precedente)
    if (!profilo || profilo.ruolo !== "admin") return fuori(T("Non hai accesso a questa app.", "You don't have access to this app."));
    $("cancello").hidden = true; $("app").hidden = false;
    await avviaCloud(session.user);
    monta();
  } catch { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); }
})();

async function avviaCloud(user) {
  C.attivo = true;
  const [miei, cond] = await Promise.all([
    supabase.from("progetti").select("id, codice, nome, comune").eq("utente", user.id).order("data_modifica", { ascending: false }).limit(500),
    supabase.rpc("progetti_condivisi_con_me"),
  ]);
  C.progetti = (miei.data || []).map((p) => ({ ...p, condiviso: false }));
  for (const p of cond.error ? [] : cond.data || []) if (!C.progetti.some((x) => x.id === p.id)) C.progetti.push({ id: p.id, codice: p.codice, nome: p.nome, comune: p.comune, condiviso: true });
  const par = new URLSearchParams(location.search), daSol = par.get("soluzione"), daProg = par.get("progetto");
  if (daSol) {
    const { data, error } = await supabase.from("progetti_soluzioni").select("id, progetto, nome, dati").eq("id", daSol).maybeSingle();
    // configurazione della versione precedente: si apre là, così nulla va perso
    if (data?.dati && data.dati.versione !== "ufs" && Array.isArray(data.dati.tipi)) { location.replace(`precedente.html?soluzione=${encodeURIComponent(daSol)}`); return new Promise(() => {}); }
    if (data?.dati) { S = { progettoId: data.progetto, sol: data.id, carrello: Array.isArray(data.dati.carrello) ? data.dati.carrello : [] }; scrivi(CHIAVE, JSON.stringify(S)); stato(T("Configurazione aperta dal progetto.", "Configuration opened from the project.")); }
    else if (error && /does not exist|schema cache/i.test(error.message)) stato(T("Salvataggio nei progetti non ancora attivo: eseguire il SQL 18.", "Project saving not active yet: run SQL 18."));
    else stato(T("Configurazione non disponibile.", "Configuration not available."));
  } else if (daProg) {
    S = { progettoId: C.progetti.some((x) => x.id === daProg) ? daProg : null, sol: null, carrello: [] }; scrivi(CHIAVE, JSON.stringify(S));
    stato(T("Nuova configurazione nel progetto: si salva da sola.", "New configuration in the project: it saves automatically."));
  }
  if (daSol || daProg) history.replaceState(null, "", location.pathname);
  disegnaProgetti();
}

function disegnaProgetti() {
  const sel = $("selProgetto"); if (!sel) return;
  sel.innerHTML = `<option value="">${esc(T("Nessun progetto (solo in questo browser)", "No project (this browser only)"))}</option>` +
    C.progetti.map((p) => `<option value="${esc(p.id)}">${esc([p.codice, p.nome].filter(Boolean).join(" · ") || T("Progetto senza nome", "Untitled project"))}${p.condiviso ? esc(T(" (condiviso)", " (shared)")) : ""}</option>`).join("");
  sel.value = S.progettoId && C.progetti.some((p) => p.id === S.progettoId) ? S.progettoId : "";
}
$("selProgetto").onchange = (e) => {
  // il carrello attuale si salva nel progetto scelto come nuova configurazione
  S.progettoId = e.target.value || null; S.sol = null; salva();
  stato(S.progettoId ? T("Configurazione salvata nel progetto: si salva da sola a ogni modifica.", "Configuration saved in the project: it saves automatically on every change.") : T("Configurazione solo in questo browser.", "Configuration in this browser only."));
};
$("nuovaConf").onclick = () => {
  S = { progettoId: S.progettoId, sol: null, carrello: [] }; scrivi(CHIAVE, JSON.stringify(S)); monta();
  stato(T("Nuova configurazione: la precedente resta salvata nel progetto.", "New configuration: the previous one stays saved in the project."));
};

function nomeSoluzione() {
  const n = S.carrello.length, p = C.progetti.find((x) => x.id === S.progettoId);
  return `${T("Torrette e sottopavimento", "Outlets and underfloor")}${p?.codice ? " " + p.codice : ""} (${n} ${n === 1 ? T("configurazione", "configuration") : T("configurazioni", "configurations")})`.slice(0, 200);
}
function salvaCloud() {
  if (!C.attivo || !S.progettoId) return;
  clearTimeout(C.timer);
  C.timer = setTimeout(async () => {
    const riga = { app: "torrette", progetto: S.progettoId, nome: nomeSoluzione(), dati: { versione: "ufs", carrello: S.carrello } };
    const q = S.sol ? supabase.from("progetti_soluzioni").update(riga).eq("id", S.sol) : supabase.from("progetti_soluzioni").insert(riga);
    const { data, error } = await q.select("id").single();
    if (error) stato(/does not exist|schema cache/i.test(error.message) ? T("Salvataggio nei progetti non ancora attivo: eseguire il SQL 18.", "Project saving not active yet: run SQL 18.") : T("Salvataggio nel progetto non riuscito: ", "Saving to the project failed: ") + error.message);
    else { S.sol = data.id; scrivi(CHIAVE, JSON.stringify(S)); stato(T("Salvato nel progetto alle ", "Saved to the project at ") + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })); }
  }, 1200);
}

// ---------- distinta in CSV (Excel italiano: separatore ";" e BOM) ----------
const pulito = (c) => String(c ?? "").replace(/^⚠/, "").trim();
$("csv").onclick = () => {
  if (!S.carrello.length) { stato(T("Il carrello è vuoto: aggiungi almeno una configurazione.", "The cart is empty: add at least one configuration.")); return; }
  const cella = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const righe = [[T("Configurazione", "Configuration"), T("Altezza", "Height"), T("Codice", "Code"), T("Descrizione", "Description"), T("Nota", "Note"), T("Da verificare", "To check")]];
  const somma = new Map();
  S.carrello.forEach((v, i) => (v.righe || []).forEach((r) => {
    const cod = pulito(r.codice); if (!cod || cod === "—" || cod === "N/D") return;
    righe.push([`${i + 1}. ${v.label ?? ""}`, v.altezza ?? "", cod, r.label ?? "", r.nota ?? "", String(r.codice ?? "").startsWith("⚠") ? T("sì", "yes") : ""]);
    const x = somma.get(cod) || { cod, label: r.label ?? "", n: 0 }; x.n++; somma.set(cod, x);
  }));
  righe.push([], [T("Riepilogo per codice", "Summary by code")], [T("Codice", "Code"), T("Descrizione", "Description"), T("Quantità", "Quantity")]);
  for (const x of somma.values()) righe.push([x.cod, x.label, x.n]);
  const testo = "﻿" + righe.map((r) => r.map(cella).join(";")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([testo], { type: "text/csv;charset=utf-8" }));
  a.download = `distinta-torrette-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
