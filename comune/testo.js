/* Dimensione del testo in alto, uguale in tutte le pagine di OBO Hub (chiave condivisa "obo-zoom").
 * Uso: <script src="../testo.js" data-dove="#topbar" defer></script>
 *   data-dove = dove mettere i pulsanti A− / A+ (predefinito: la barra in alto "header.barra .contenitore").
 * Applica anche la dimensione salvata (--zoom e --obo-zoom) e la aggiorna se cambia in un'altra scheda. */
(function () {
  var PASSI = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.45];
  var tag = document.currentScript;
  function leggi() { try { var v = Number(localStorage.getItem("obo-zoom")); return PASSI.indexOf(v) >= 0 ? v : 1; } catch (e) { return 1; } }
  function applica(z) { var r = document.documentElement.style; r.setProperty("--zoom", String(z)); r.setProperty("--obo-zoom", String(z)); aggiornaEtichetta(); }
  function cambia(verso) {
    var i = PASSI.indexOf(leggi()), z = PASSI[Math.min(PASSI.length - 1, Math.max(0, i + verso))];
    try { localStorage.setItem("obo-zoom", String(z)); } catch (e) {}
    applica(z);
  }
  var en = false; try { en = localStorage.getItem("obo-lingua") === "en"; } catch (e) {}
  var box = null;
  function aggiornaEtichetta() {
    if (!box) return;
    var z = leggi();
    box.querySelector("[data-obo-zoom='p']").textContent = Math.round(z * 100) + "%";
    box.querySelector("[data-obo-zoom='-']").disabled = z <= PASSI[0];
    box.querySelector("[data-obo-zoom='+']").disabled = z >= PASSI[PASSI.length - 1];
  }
  applica(leggi());
  addEventListener("storage", function (e) { if (e.key === "obo-zoom") applica(leggi()); });

  function metti() {
    var dove = document.querySelector((tag && tag.getAttribute("data-dove")) || "header.barra .contenitore");
    if (!dove || document.getElementById("obo-testo")) return;
    box = document.createElement("div");
    box.id = "obo-testo"; box.setAttribute("role", "group");
    box.setAttribute("aria-label", en ? "Text size" : "Dimensione del testo");
    box.innerHTML =
      '<button type="button" data-obo-zoom="-" aria-label="' + (en ? "Smaller text" : "Testo più piccolo") + '" title="' + (en ? "Smaller text" : "Testo più piccolo") + '">A<span>−</span></button>' +
      '<span data-obo-zoom="p" aria-live="polite"></span>' +
      '<button type="button" data-obo-zoom="+" aria-label="' + (en ? "Larger text" : "Testo più grande") + '" title="' + (en ? "Larger text" : "Testo più grande") + '">A<span>+</span></button>';
    var st = document.createElement("style");
    st.textContent = "#obo-testo{display:inline-flex;align-items:center;gap:2px;margin-left:auto;margin-right:4px;padding:2px;border:1px solid var(--bordo,#dee2e6);border-radius:999px;background:var(--carta,#fff);font:600 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;flex:none}" +
      "#obo-testo button{width:36px;height:32px;border:0;border-radius:999px;background:none;color:var(--testo,#212529);font:inherit;cursor:pointer}" +
      "#obo-testo button span{font-size:11px;margin-left:1px}#obo-testo button[data-obo-zoom='+']{font-size:17px}" +
      "#obo-testo button:hover:not(:disabled){background:var(--grigio,#f3f5f6)}#obo-testo button:disabled{opacity:.35;cursor:default}" +
      "#obo-testo [data-obo-zoom='p']{min-width:38px;text-align:center;font-size:12px;color:var(--tenue,#6c757d)}" +
      "@media (max-width:420px){#obo-testo [data-obo-zoom='p']{display:none}#obo-testo button{width:32px}}";
    document.head.appendChild(st);
    box.addEventListener("click", function (e) { var b = e.target.closest("button[data-obo-zoom]"); if (b) cambia(b.getAttribute("data-obo-zoom") === "+" ? 1 : -1); });
    if (tag && tag.getAttribute("data-prima") === "si") dove.insertBefore(box, dove.firstChild); else dove.appendChild(box);
    aggiornaEtichetta();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", metti); else metti();
})();
