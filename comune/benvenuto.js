/*
 * Animazione di apertura comune a tutte le app di OBO Hub.
 * Icona di OBO Hub con bagliore e riflesso di luce, poi il saluto: "Buongiorno / Buon pomeriggio / Buonasera, <nome>"
 * e sotto "Bentornato in <app>" (o "Benvenuto" alla prima apertura).
 * Compare SOLO quando si torna dopo un po' che non si usa nessuna app di OBO Hub (inattività di almeno 30 minuti),
 * sia aprendo l'app sia riprendendola dallo sfondo. Passare da un'app all'altra o da una pagina all'altra non la mostra.
 * L'ultima attività è condivisa tra tutte le app (localStorage "obo-attivita"). Un tocco o un tasto la chiudono.
 * Il nome si legge da localStorage "obo-nome" (lo scrivono tutte le app all'accesso); se manca si ricava dalla sessione
 * condivisa di OBO Hub (visitatore o utente collegato), così funziona anche per le app nuove.
 * Uso: <script src="benvenuto.js" data-app="OBO Hub"></script>
 */
(function () {
  var s = document.currentScript || {}, ds = s.dataset || {};
  var app = ds.app || "OBO Hub", chiave = "obo-benvenuto-" + app.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  var prova = /[?&]provabenvenuto\b/.test(location.search);
  if (!prova && (/[?&]nobenvenuto\b/.test(location.search) || navigator.webdriver)) return; // controlli automatici: niente animazione
  // inattività: si mostra solo se dall'ultima attività in una qualsiasi app di OBO Hub sono passati almeno 30 minuti
  var SOGLIA = 30 * 60 * 1000, CHIAVE_ATT = "obo-attivita", ultimoSegno = 0;
  function ultima() { try { return Number(localStorage.getItem(CHIAVE_ATT)) || 0; } catch (e) { return 0; } }
  function segna(forza) { var n = Date.now(); if (!forza && n - ultimoSegno < 20000) return; ultimoSegno = n; try { localStorage.setItem(CHIAVE_ATT, String(n)); } catch (e) {} }
  function inattiva() { var u = ultima(); return !u || Date.now() - u > SOGLIA; }
  // app rimasta aperta ma non usata a lungo: al primo tocco dopo 30 minuti l'animazione ricompare
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) { addEventListener(ev, function () { if (!d && inattiva() && document.visibilityState === "visible") mostra(); segna(false); }, { passive: true, capture: true }); });
  addEventListener("pagehide", function () { segna(true); });

  function nomeOra() {
    var n = "";
    try { n = (localStorage.getItem("obo-nome") || "").trim().split(/\s+/)[0] || ""; } catch (e) {}
    if (!n) n = nomeDallaSessione();
    if (n) n = n.charAt(0).toLocaleUpperCase("it-IT") + n.slice(1).toLocaleLowerCase("it-IT"); // nome: solo l'iniziale maiuscola
    try { if (n) localStorage.setItem("obo-nome", n); } catch (e) {}
    return n;
  }
  /* Nome anche per le app che non lo salvano da sé: sessione condivisa di OBO Hub (stesso indirizzo per tutte le app).
     Ordine: visitatore, nome dell'utente, poi dall'email (cognome.nome@… → Nome). */
  function nomeDallaSessione() {
    try {
      var v = JSON.parse(localStorage.getItem("obo-visitatore") || "null");
      if (v && v.name) return String(v.name).trim().split(/\s+/)[0];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^sb-.+-auth-token$/.test(k)) continue;
        var j = JSON.parse(localStorage.getItem(k) || "null"), u = j && (j.user || (j.currentSession && j.currentSession.user));
        if (!u) continue;
        var m = u.user_metadata || {}, n = String(m.nome_visualizzato || m.nome || m.full_name || "").trim();
        if (n && !/^amministratore$/i.test(n)) return n.split(/\s+/)[0];
        var parti = String(u.email || "").split("@")[0].split(/[._-]/).filter(Boolean), x = parti.length > 1 ? parti[parti.length - 1] : parti[0] || "";
        if (x) return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
      }
    } catch (e) {}
    return "";
  }
  function testi() {
    var en = false, visto = false, nome = nomeOra(), ora = new Date().getHours();
    try { en = localStorage.getItem("obo-lingua") === "en"; visto = !!localStorage.getItem(chiave + "-visto"); localStorage.setItem(chiave + "-visto", "1"); } catch (e) {}
    var saluto = en ? (ora < 12 ? "Good morning" : ora < 18 ? "Good afternoon" : "Good evening") : (ora < 13 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera");
    return [saluto + (nome ? ", " + nome : ""), en ? (visto ? "Welcome back to " : "Welcome to ") + app : (visto ? "Bentornato in " : "Benvenuto in ") + app];
  }
  var piano = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var css = "#obo-bv{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;" +
    "background:radial-gradient(120% 90% at 50% 38%,#4b5d69 0%,#2c3a43 55%,#1c262d 100%);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;" +
    "opacity:1;transition:opacity .55s ease,visibility .55s;cursor:pointer;overflow:hidden;-webkit-tap-highlight-color:transparent}" +
    "#obo-bv.via{opacity:0;visibility:hidden}" +
    "#obo-bv .ic{position:relative;width:min(34vw,168px);aspect-ratio:1;animation:bvIc .9s cubic-bezier(.2,.9,.25,1.15) both}" +
    "#obo-bv .alone{position:absolute;inset:-60%;border-radius:50%;background:radial-gradient(circle,rgba(255,170,40,.75) 0%,rgba(243,155,0,.35) 32%,rgba(243,155,0,0) 66%);filter:blur(6px);animation:bvAlone 2.6s ease-in-out .2s both}" +
    "#obo-bv .onda{position:absolute;inset:0;border-radius:24%;border:2px solid rgba(255,190,90,.7);animation:bvOnda 1.6s ease-out .55s both}" +
    "#obo-bv svg{position:relative;width:100%;height:100%;display:block;filter:drop-shadow(0 18px 40px rgba(243,155,0,.45)) drop-shadow(0 4px 10px rgba(0,0,0,.35))}" +
    "#obo-bv .t{transform-box:fill-box;transform-origin:center;animation:bvT .5s cubic-bezier(.3,1.6,.5,1) both}" +
    "#obo-bv .t1{animation-delay:.25s}#obo-bv .t2{animation-delay:.37s}#obo-bv .t3{animation-delay:.49s}#obo-bv .t4{animation-delay:.61s}" +
    "#obo-bv .luce{animation:bvLuce 1.1s ease-in-out 1s both}" +
    "#obo-bv .sc{position:absolute;width:10px;height:10px;background:radial-gradient(circle,#fff 0%,rgba(255,255,255,0) 70%);border-radius:50%;animation:bvSc 1.2s ease-out both}" +
    "#obo-bv .tx{text-align:center;padding:0 24px;animation:bvTx .8s ease .75s both}" +
    "#obo-bv .s1{font-size:clamp(26px,6.5vw,40px);font-weight:700;letter-spacing:-.01em;text-shadow:0 2px 18px rgba(243,155,0,.35)}" +
    "#obo-bv .s2{margin-top:8px;font-size:clamp(15px,3.8vw,18px);color:rgba(255,255,255,.78)}" +
    "@keyframes bvIc{from{opacity:0;transform:scale(.55) rotate(-8deg);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}" +
    "@keyframes bvAlone{0%{opacity:0;transform:scale(.6)}35%{opacity:1;transform:scale(1)}60%{opacity:.75;transform:scale(.92)}100%{opacity:1;transform:scale(1.04)}}" +
    "@keyframes bvOnda{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(1.7)}}" +
    "@keyframes bvT{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}" +
    "@keyframes bvLuce{from{transform:translateX(-520px)}to{transform:translateX(520px)}}" +
    "@keyframes bvSc{0%{opacity:0;transform:scale(.2)}40%{opacity:1;transform:scale(1.6)}100%{opacity:0;transform:scale(.4)}}" +
    "@keyframes bvTx{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){#obo-bv *{animation:none!important}}";

  var svg = '<svg viewBox="0 0 512 512" aria-hidden="true"><defs>' +
    '<linearGradient id="obv-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb52e"/><stop offset=".55" stop-color="#f39b00"/><stop offset="1" stop-color="#d98200"/></linearGradient>' +
    '<linearGradient id="obv-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="obv-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<clipPath id="obv-c"><rect width="512" height="512" rx="112"/></clipPath></defs>' +
    '<rect width="512" height="512" rx="112" fill="url(#obv-f)"/>' +
    '<g clip-path="url(#obv-c)">' +
    '<rect class="t t1" x="112" y="112" width="128" height="128" rx="28" fill="#fff"/>' +
    '<rect class="t t2" x="272" y="112" width="128" height="128" rx="28" fill="#fff"/>' +
    '<rect class="t t3" x="112" y="272" width="128" height="128" rx="28" fill="#fff"/>' +
    '<rect class="t t4" x="272" y="272" width="128" height="128" rx="28" fill="#41525d"/>' +
    '<rect width="512" height="256" fill="url(#obv-r)"/>' +
    '<g class="luce"><rect x="-60" y="-200" width="150" height="912" fill="url(#obv-l)" transform="rotate(22 15 256)"/></g>' +
    '</g><rect x="3" y="3" width="506" height="506" rx="110" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6"/></svg>';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var st = document.createElement("style"); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var d = null, timer = 0;
  function mostra() {
    if (d) return;
    var t = testi();
    d = document.createElement("div"); d.id = "obo-bv"; d.setAttribute("role", "status"); d.setAttribute("aria-live", "polite");
    d.innerHTML = '<div class="ic"><div class="alone"></div><div class="onda"></div>' + svg +
      '<i class="sc" style="left:-6%;top:12%;animation-delay:1.25s"></i><i class="sc" style="right:-4%;top:-4%;animation-delay:1.45s"></i><i class="sc" style="right:8%;bottom:-8%;animation-delay:1.6s"></i></div>' +
      '<div class="tx"><div class="s1">' + esc(t[0]) + '</div><div class="s2">' + esc(t[1]) + "</div></div>";
    d.addEventListener("click", chiudi);
    addEventListener("keydown", chiudi, true);
    document.documentElement.appendChild(d);
    timer = setTimeout(chiudi, piano ? 1400 : 2700);
  }
  function chiudi() {
    if (!d || d.classList.contains("via")) return;
    var el = d; clearTimeout(timer); el.classList.add("via");
    removeEventListener("keydown", chiudi, true);
    setTimeout(function () { el.remove(); if (d === el) d = null; }, 650);
  }

  function controlla() { if (prova || inattiva()) { if (d) { d.remove(); d = null; } mostra(); } segna(true); }
  controlla();
  // app ripresa dallo sfondo dopo tanto tempo (o pagina tornata dalla memoria con Indietro)
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") segna(true); else { prova = false; controlla(); } });
  addEventListener("pageshow", function (e) { if (e.persisted) { prova = false; controlla(); } });
})();
