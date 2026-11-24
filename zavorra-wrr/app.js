/*
 * Zavorra telai inverter WRR (OBO Magic PV Mount) dentro OBO Hub: stessa barra, stessi colori e stesso accesso delle altre app.
 * Il calcolo (calc.js) e l'interfaccia (calcolatore.js) vengono dall'app di Marco "zavorra-wrr"; l'archivio usa la sessione di OBO Hub.
 * Configuratore torrette (schema originale della barra) – stesso schema di OBO Construct underfloor:
 *   1 Progetto  →  2 Pavimento  →  3 Torretta  →  4 Apparecchi  →  5 Riepilogo
 * Le torrette configurate diventano "torrette tipo" del progetto, riusabili in tutte le stanze compatibili.
 * Nel Riepilogo l'edificio si divide in unità (piani, aree) e stanze; ogni stanza ha il suo pavimento e le sue torrette.
 * Il progetto resta salvato in questo browser.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";
import { mountZavorra } from "./calcolatore.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
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
  if (k === "it" || k === "en") { scrivi("obo-lingua", k === "en" ? "en" : null);  }
  else if (k) { scrivi("obo-tema", k === "auto" ? null : k); applicaTema(); }
  else if (x.dataset.z) cambiaZoom(Number(x.dataset.z));
  testiFissi();
};
document.addEventListener("click", () => { $("pannelloAspetto").hidden = true; });
addEventListener("storage", (e) => { if (["obo-lingua", "obo-tema", "obo-zoom"].includes(e.key)) { applicaTema(); applicaZoom(); testiFissi();  } });
testiFissi();

// ---------- accesso con la sessione di OBO Hub ----------
// Entrano l'amministratore e chi ha la sezione "app_zavorra" (Amministrazione → Utenti → Cambia sezioni); i visitatori usano il calcolo senza archivio.
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
function fuori(msg) { $("cancelloMsg").textContent = msg; $("cancelloBtn").hidden = false; }
(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      let vis = null; try { vis = JSON.parse(leggi("obo-visitatore") || "null"); } catch {}
      if (vis?.token) { $("cancello").hidden = true; $("app").hidden = false; mountZavorra($("zavorra"), { supabase: null, title: "" }); return; }
      return fuori(T("Entra da OBO Hub per usare il calcolatore.", "Sign in from OBO Hub to use the calculator."));
    }
    const [{ data: aal }, { data: profilo }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.from("accessi_profili").select("ruolo, sezioni").eq("utente", session.user.id).maybeSingle(),
    ]);
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") return fuori(T("Completa l'accesso con Authenticator da OBO Hub.", "Complete the Authenticator sign-in from OBO Hub."));
    if (!profilo || (profilo.ruolo !== "admin" && !(profilo.sezioni || []).some((s) => s === "app_zavorra" || s === "tutte"))) return fuori(T("Non hai accesso a questa app: chiedi all'amministratore di abilitarla.", "You don't have access to this app: ask the administrator."));
    $("cancello").hidden = true; $("app").hidden = false; mountZavorra($("zavorra"), { supabase, title: "" });
  } catch { fuori(T("Accesso non riuscito: riprova da OBO Hub.", "Sign-in failed: try again from OBO Hub.")); }
})();


// ---------- telai WRR su obo.it: scelta dal prodotto e ?codice=5904013 (dalla sezione Prodotti OBO) ----------
const TELAI = [
  { k: "F1000", codice: "5904013", nome: "WRR F1000 · telaio inverter indipendente", url: "/it-it/prodotti/telaio-inverter-indipendente-5904013.html" },
  { k: "F1500", codice: "5904015", nome: "WRR F1500 · telaio inverter indipendente", url: "/it-it/prodotti/telaio-inverter-indipendente-5904015.html" },
  { k: "D1000", codice: "5904026", nome: "WRR D1000 · telaio inverter bilaterale", url: "/it-it/prodotti/telaio-inverter-indipendente-bilaterale-5904026.html" },
  { k: "D1500", codice: "5904029", nome: "WRR D1500 · telaio inverter bilaterale", url: "/it-it/prodotti/telaio-inverter-indipendente-bilaterale-5904029.html" },
  { k: "W1000", codice: "5904005", nome: "WRR W1000 · telaio inverter a parete", url: "/it-it/prodotti/telaio-inverter-per-installazione-a-parete-5904005.html" },
  { k: "W1500", codice: "5904007", nome: "WRR W1500 · telaio inverter a parete", url: "/it-it/prodotti/telaio-inverter-per-installazione-a-parete-5904007.html" },
];
function scegliTelaio(k) {
  const sel = document.querySelector('#zavorra select[id$="-frame"]'); if (!sel) return;
  sel.value = k; sel.dispatchEvent(new Event("change", { bubbles: true })); sel.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelectorAll(".telaio").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
}
function striscia() {
  const box = $("telai"); if (!box || box.dataset.fatto) return; box.dataset.fatto = "1";
  box.innerHTML = TELAI.map((t) => `<button type="button" class="telaio" data-k="${t.k}" aria-pressed="false"><img src="https://www.obo.it/out/pictures/generated/product/1/794_794_75/${t.codice}_PG1.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>${esc(t.nome)}</b><small>art. ${t.codice} · <a href="https://www.obo.it${t.url}" target="_blank" rel="noopener">obo.it</a></small></span></button>`).join("");
  box.onclick = (e) => { if (e.target.closest("a")) return; const b = e.target.closest(".telaio"); if (b) scegliTelaio(b.dataset.k); };
  const sel = document.querySelector('#zavorra select[id$="-frame"]');
  const codice = new URLSearchParams(location.search).get("codice"), daCodice = TELAI.find((t) => t.codice === codice);
  if (daCodice) scegliTelaio(daCodice.k); else if (sel) document.querySelectorAll(".telaio").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === sel.value)));
  sel?.addEventListener("change", () => document.querySelectorAll(".telaio").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === sel.value))));
}
new MutationObserver(() => { if (document.querySelector('#zavorra select[id$="-frame"]')) striscia(); }).observe(document.getElementById("zavorra"), { childList: true, subtree: true });
