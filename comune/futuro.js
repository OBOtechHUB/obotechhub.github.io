/* OBO Hub · effetti dello stile futuristico (caricato da registro.js): comparsa allo scorrimento,
   luce delle schede che segue il puntatore, barra di avanzamento. Nulla cambia i dati; spento con
   "riduci movimento", in stampa e con ?nofx nell'indirizzo. */
(function () {
  if (window.__oboFx) return; window.__oboFx = true;
  var ridotto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (ridotto || /[?&]nofx\b/.test(location.search) || (navigator.webdriver && !/[?&]fx\b/.test(location.search))) return;
  var SCHEDE = ".app,.riquadro,.panel,.telaio,.np,.card,.scheda,.kpi,.stat,.box,section.panel,.lista button,.app-card,.tile";
  var COMPARSA = SCHEDE + ",main h2,.zwrr section.panel,table";
  function prepara(radice) {
    var vh = innerHeight;
    (radice.querySelectorAll ? radice : document).querySelectorAll(SCHEDE).forEach(function (el) { el.classList.add("fx-scheda"); });
    (radice.querySelectorAll ? radice : document).querySelectorAll(COMPARSA).forEach(function (el, i) {
      if (el.dataset.fx) return; el.dataset.fx = "1";
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92) return; // già visibile: niente comparsa (nessun lampeggio)
      el.style.setProperty("--fx-ritardo", ((i % 6) * 60) + "ms");
      el.classList.add("fx-in"); osserva.observe(el);
    });
  }
  var osserva = "IntersectionObserver" in window ? new IntersectionObserver(function (voci) {
    voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.add("fx-vis"); osserva.unobserve(v.target); } });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }) : { observe: function (el) { el.classList.add("fx-vis"); }, unobserve: function () {} };
  // luce che segue il puntatore
  document.addEventListener("pointermove", function (e) {
    var el = e.target && e.target.closest && e.target.closest(".fx-scheda"); if (!el) return;
    var r = el.getBoundingClientRect(); el.style.setProperty("--fx-x", (e.clientX - r.left) + "px"); el.style.setProperty("--fx-y", (e.clientY - r.top) + "px");
  }, { passive: true });
  // barra di avanzamento
  var barra = document.createElement("div"); barra.id = "fx-progresso"; barra.setAttribute("aria-hidden", "true");
  function avanzamento() { var h = document.documentElement.scrollHeight - innerHeight; barra.style.setProperty("--fx-p", h > 40 ? String(Math.min(1, scrollY / h)) : "0"); }
  function avvia() {
    document.body.appendChild(barra); avanzamento(); prepara(document);
    addEventListener("scroll", avanzamento, { passive: true }); addEventListener("resize", avanzamento);
    var attesa = null;
    new MutationObserver(function () { clearTimeout(attesa); attesa = setTimeout(function () { prepara(document); avanzamento(); }, 120); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia); else avvia();
})();
