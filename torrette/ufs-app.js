/*
 * Pagina del Configuratore torrette e sistemi sottopavimento (UFS) di OBO Hub.
 * Il configuratore vero è torrette/ufs.js (compilato da torrette/sorgente con strumenti/torrette/compila.sh);
 * questa pagina fa l'accesso con la sessione di OBO Hub, sceglie il progetto, salva il carrello come "soluzione"
 * del progetto unico (tabella progetti_soluzioni, app "torrette", dati.versione = "ufs") e nel browser,
 * e scarica la distinta in Excel (con la pagina obo.it di ogni codice). Le configurazioni salvate con la versione precedente si aprono in precedente.html.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "../config.js";
import { scriviXlsx } from "../prodotti/xlsx.js";
import { CODICI_OBO } from "./codici-obo.js";

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
const C = { progetti: [], attivo: false, timer: null, versione: 0, inAttesa: false, inSalvataggio: false };
const stato = (t) => { $("statoCloud").textContent = t; };
const NUOVO = "__nuovo";
// dati non salvati: carrello con qualcosa e non ancora salvato nel progetto (o salvataggio in sospeso)
const nonSalvato = () => S.carrello.length > 0 && (!S.sol || C.inAttesa || C.inSalvataggio);
window.oboAvvisoUscita?.registra(nonSalvato, () => salvaOra());
function mostraSalvataggio() {
  const chip = $("chipSalvato"), ap = $("aperto"); if (!chip) return;
  const p = C.progetti.find((x) => x.id === S.progettoId), nomeP = p ? [p.codice, p.nome].filter(Boolean).join(" · ") : "";
  const ok = !!S.sol && !C.inAttesa && !C.inSalvataggio;
  chip.className = "chip " + (ok || !S.carrello.length ? "ok" : "no");
  chip.textContent = !S.carrello.length && !S.sol ? T("Carrello vuoto", "Empty cart")
    : ok ? T("✓ Salvato nel progetto ", "✓ Saved to project ") + nomeP
    : S.sol ? T("Salvataggio in corso…", "Saving…") : T("⚠ Non salvato nel progetto", "⚠ Not saved to the project");
  $("vaiSalva").hidden = ok;
  $("vaiSopralluogo").href = "sopralluogo.html" + (S.progettoId ? "?progetto=" + encodeURIComponent(S.progettoId) : "");
  ap.innerHTML = S.sol
    ? `<strong>${esc(T("Configurazione aperta:", "Open configuration:"))}</strong> ${esc(S.nome || nomeSoluzione())}${nomeP ? " · " + esc(nomeP) : ""}. ${esc(T("Le modifiche si salvano da sole.", "Changes are saved automatically."))}`
    : `<strong>${esc(T("Configurazione nuova, non ancora salvata.", "New configuration, not saved yet."))}</strong> ${esc(T("Scegli il progetto (o creane uno nuovo) e premi «Salva nel progetto»: da lì in poi si salva da sola. Se esci senza salvare perderai i dati.", "Choose the project (or create a new one) and press «Save to project»: from then on it saves automatically. If you leave without saving you will lose your data."))}`;
}

function monta() {
  // la chiave cambia quando si apre un'altra configurazione: il configuratore riparte dal carrello salvato
  C.versione++;
  const el = $("ufs"); el.innerHTML = ""; const box = document.createElement("div"); el.appendChild(box);
  if (!window.OBOTorrette) { stato(T("Configuratore non caricato: ricarica la pagina.", "Configurator not loaded: reload the page.")); return; }
  window.OBOTorrette.monta(box, { carrelloIniziale: S.carrello, onCarrello: (c) => { if (JSON.stringify(c) === JSON.stringify(S.carrello)) return; S.carrello = c; salva(); } });
}
function salva() { scrivi(CHIAVE, JSON.stringify(S)); if (S.sol) salvaCloud(); mostraSalvataggio(); }

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
    if (data?.dati) { S = { progettoId: data.progetto, sol: data.id, nome: data.nome || "", carrello: Array.isArray(data.dati.carrello) ? data.dati.carrello : [] }; scrivi(CHIAVE, JSON.stringify(S)); stato(T("Configurazione aperta dal progetto.", "Configuration opened from the project.")); }
    else if (error && /does not exist|schema cache/i.test(error.message)) stato(T("Salvataggio nei progetti non ancora attivo: eseguire il SQL 18.", "Project saving not active yet: run SQL 18."));
    else stato(T("Configurazione non disponibile.", "Configuration not available."));
  } else if (daProg) {
    S = { progettoId: C.progetti.some((x) => x.id === daProg) ? daProg : null, sol: null, carrello: [] }; scrivi(CHIAVE, JSON.stringify(S));
    stato(T("Nuova configurazione per il progetto: premi «Salva nel progetto» in fondo alla pagina.", "New configuration for the project: press «Save to project» at the bottom of the page."));
  }
  if (daSol || daProg) history.replaceState(null, "", location.pathname);
  disegnaProgetti();
}

function disegnaProgetti() {
  const sel = $("selProgetto"); if (!sel) return;
  const prima = sel.value;
  sel.innerHTML = `<option value="">${esc(T("— scegli il progetto —", "— choose the project —"))}</option>` +
    C.progetti.map((p) => `<option value="${esc(p.id)}" data-cerca="${esc([p.comune, p.condiviso && p.condiviso !== true ? p.condiviso : ""].filter(Boolean).join(" · "))}">${esc([p.codice, p.nome].filter(Boolean).join(" · ") || T("Progetto senza nome", "Untitled project"))}${p.condiviso ? esc(T(" (condiviso)", " (shared)")) : ""}</option>`).join("") +
    `<option value="${NUOVO}">${esc(T("+ Nuovo progetto…", "+ New project…"))}</option>`;
  sel.value = S.progettoId && C.progetti.some((p) => p.id === S.progettoId) ? S.progettoId : prima === NUOVO ? NUOVO : "";
  $("nuovoProg").hidden = sel.value !== NUOVO;
  window.oboCercaProgetto?.(sel, { segnaposto: T("Cerca il progetto: numero CRM, nome o comune", "Find the project: CRM number, name or town") });
  $("nomeConf").value = S.nome || ""; $("nomeConf").placeholder = nomeSoluzione();
  mostraSalvataggio();
}
$("selProgetto").onchange = (e) => {
  const v = e.target.value;
  $("nuovoProg").hidden = v !== NUOVO;
  if (v === NUOVO) { $("npCodice").focus(); return; }
  // cambiare progetto dopo il salvataggio = nuova configurazione in quel progetto (la precedente resta dov'era)
  if ((v || null) !== S.progettoId) { S.progettoId = v || null; if (S.sol) { S.sol = null; stato(T("Progetto cambiato: premi «Salva nel progetto» per salvarla qui (la configurazione precedente resta nell'altro progetto).", "Project changed: press «Save to project» to save it here (the previous configuration stays in the other project).")); } scrivi(CHIAVE, JSON.stringify(S)); }
  mostraSalvataggio();
};
$("nomeConf").oninput = (e) => { S.nome = e.target.value.trim(); salva(); };
$("salvaProg").onclick = () => salvaOra().catch((er) => stato(T("Non salvato: ", "Not saved: ") + er.message));
$("nuovaConf").onclick = () => window.oboAvvisoUscita ? window.oboAvvisoUscita.chiedi(nuovaConf) : nuovaConf();
function nuovaConf() {
  S = { progettoId: S.progettoId, sol: null, nome: "", carrello: [] }; scrivi(CHIAVE, JSON.stringify(S)); monta(); disegnaProgetti();
  stato(T("Nuova configurazione: la precedente resta salvata nel progetto.", "New configuration: the previous one stays saved in the project."));
}
// primo salvataggio (anche con creazione del progetto); poi le modifiche si salvano da sole
async function salvaOra() {
  if (!C.attivo) throw new Error(T("accesso non attivo", "not signed in"));
  if (!S.carrello.length) throw new Error(T("il carrello è vuoto: aggiungi almeno una configurazione", "the cart is empty: add at least one configuration"));
  const sel = $("selProgetto");
  if (sel.value === NUOVO) {
    const codice = $("npCodice").value.trim(), nome = $("npNome").value.trim(), comune = $("npComune").value.trim();
    if (!codice && !nome) { $("npCodice").focus(); throw new Error(T("scrivi numero CRM o nome del nuovo progetto", "write the CRM number or the name of the new project")); }
    const { data: p, error } = await supabase.from("progetti").insert({ codice: codice || null, nome: nome || codice, comune: comune || null, dati: {} }).select("id, codice, nome, comune").single();
    if (error) throw new Error(error.message);
    C.progetti.unshift({ ...p, condiviso: false }); S.progettoId = p.id; S.sol = null;
    $("npCodice").value = $("npNome").value = $("npComune").value = "";
  } else if (!sel.value) { sel.focus(); throw new Error(T("scegli il progetto o creane uno nuovo", "choose the project or create a new one")); }
  else S.progettoId = sel.value;
  clearTimeout(C.timer); C.inAttesa = false;
  await scriviCloud();
  disegnaProgetti();
}

function nomeSoluzione() {
  const n = S.carrello.length, p = C.progetti.find((x) => x.id === S.progettoId);
  return `${T("Torrette e sottopavimento", "Outlets and underfloor")}${p?.codice ? " " + p.codice : ""} (${n} ${n === 1 ? T("configurazione", "configuration") : T("configurazioni", "configurations")})`.slice(0, 200);
}
function salvaCloud() {
  if (!C.attivo || !S.progettoId || !S.sol) return;
  clearTimeout(C.timer); C.inAttesa = true; mostraSalvataggio();
  C.timer = setTimeout(() => { C.inAttesa = false; scriviCloud().catch(() => { /* messaggio già mostrato */ }); }, 1200);
}
async function scriviCloud() {
  C.inSalvataggio = true; mostraSalvataggio();
  try {
    const riga = { app: "torrette", progetto: S.progettoId, nome: S.nome || nomeSoluzione(), dati: { versione: "ufs", carrello: S.carrello } };
    const q = S.sol ? supabase.from("progetti_soluzioni").update(riga).eq("id", S.sol) : supabase.from("progetti_soluzioni").insert(riga);
    const { data, error } = await q.select("id").single();
    if (error) {
      const m = /does not exist|schema cache/i.test(error.message) ? T("Salvataggio nei progetti non ancora attivo: eseguire il SQL 18.", "Project saving not active yet: run SQL 18.") : T("Salvataggio nel progetto non riuscito: ", "Saving to the project failed: ") + error.message;
      stato(m); throw new Error(m);
    }
    S.sol = data.id; scrivi(CHIAVE, JSON.stringify(S)); stato(T("Salvato nel progetto alle ", "Saved to the project at ") + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
  } finally { C.inSalvataggio = false; mostraSalvataggio(); }
}

// ---------- distinta in Excel con lo stile OBO (come Prodotti) e la pagina obo.it di ogni codice ----------
const pulito = (c) => String(c ?? "").replace(/^⚠/, "").trim();
const paginaObo = (cod) => (CODICI_OBO[cod] ? "https://www.obo.it" + CODICI_OBO[cod] : "");
const scarica = (blob, nome) => {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$("csv").onclick = () => {
  if (!S.carrello.length) { stato(T("Il carrello è vuoto: aggiungi almeno una configurazione.", "The cart is empty: add at least one configuration.")); return; }
  const righe = [], somma = new Map(), stanze = [];
  const pz = (v) => Math.max(1, parseInt(v.qta, 10) || 1);
  S.carrello.forEach((v, i) => {
    stanze.push([v.stanza || T("(non indicata)", "(not given)"), `${i + 1}. ${v.label ?? ""}`, v.altezza ?? "", pz(v)]);
    (v.righe || []).forEach((r) => {
      const cod = pulito(r.codice); if (!cod || cod === "—" || cod === "N/D") return;
      righe.push([`${i + 1}. ${v.label ?? ""}`, v.stanza || "", pz(v), v.altezza ?? "", cod, r.label ?? "", r.nota ?? "", String(r.codice ?? "").startsWith("⚠") ? T("sì", "yes") : "", paginaObo(cod)]);
      const x = somma.get(cod) || { cod, label: r.label ?? "", n: 0 }; x.n += pz(v); somma.set(cod, x);
    });
  });
  stanze.sort((a, b) => String(a[0]).localeCompare(String(b[0]), "it"));
  const riep = [...somma.values()].map((x) => [x.cod, x.label, x.n, paginaObo(x.cod)]);
  const blob = scriviXlsx([
    { nome: T("Riepilogo", "Summary"), intestazione: [T("Codice", "Code"), T("Descrizione", "Description"), T("Quantità", "Quantity"), T("Pagina obo.it", "obo.it page")], righe: riep, larghezze: [12, 60, 10, 40], link: [3] },
    { nome: T("Configurazioni", "Configurations"), intestazione: [T("Configurazione", "Configuration"), T("Stanza", "Room"), T("Pezzi", "Pieces"), T("Altezza", "Height"), T("Codice", "Code"), T("Descrizione", "Description"), T("Nota", "Note"), T("Da verificare", "To check"), T("Pagina obo.it", "obo.it page")], righe, larghezze: [30, 18, 8, 10, 12, 55, 30, 12, 40], link: [8] },
    { nome: T("Per stanza", "By room"), intestazione: [T("Stanza", "Room"), T("Configurazione", "Configuration"), T("Altezza", "Height"), T("Pezzi", "Pieces")], righe: stanze, larghezze: [24, 40, 14, 8] },
  ]);
  const nome = ($("nomeConf").value || "").trim().replace(/[^\w\- àèéìòù]+/gi, "").replace(/\s+/g, "-").slice(0, 60) || "torrette";
  scarica(blob, `distinta-${nome}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ---------- condividi: link della configurazione salvata e email con un commento ----------
const linkSoluzione = () => (S.sol ? `${location.origin}${location.pathname}?soluzione=${encodeURIComponent(S.sol)}` : "");
const serveSalvare = () => { if (S.sol) return false; stato(T("Prima salva nel progetto: il link apre la configurazione salvata.", "Save to the project first: the link opens the saved configuration.")); $("boxProgetto").scrollIntoView({ block: "center" }); return true; };
$("copiaLink").onclick = async () => {
  if (serveSalvare()) return;
  try { await navigator.clipboard.writeText(linkSoluzione()); stato(T("Link copiato: lo apre chi ha accesso al progetto.", "Link copied: it opens for whoever can access the project.")); }
  catch { stato(T("Copia questo link: ", "Copy this link: ") + linkSoluzione()); }
};
$("mandaEmail").onclick = () => {
  if (serveSalvare()) return;
  const nome = $("nomeConf").value || T("Configurazione torrette", "Service outlets configuration");
  const elenco = S.carrello.map((v, i) => `${i + 1}. ${v.label ?? ""}${v.altezza ? " – H " + v.altezza : ""} – ${Math.max(1, parseInt(v.qta, 10) || 1)} pz${v.stanza ? " – " + v.stanza : ""}`).join("\n");
  const corpo = T(`Ciao,\nti mando la configurazione «${nome}» (torrette OBO).\n\n${elenco}\n\nApri: ${linkSoluzione()}\n\nCommento: `, `Hi,\nhere is the configuration «${nome}» (OBO service outlets).\n\n${elenco}\n\nOpen: ${linkSoluzione()}\n\nComment: `);
  location.href = `mailto:?subject=${encodeURIComponent(nome)}&body=${encodeURIComponent(corpo)}`;
};
