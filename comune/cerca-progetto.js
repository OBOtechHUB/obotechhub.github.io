/*
 * Ricerca del progetto, uguale in tutte le app di OBO Hub (Torrette, Zavorra WRR, …).
 * Trasforma un <select> di progetti in un campo di ricerca: si scrive numero CRM, nome, comune o proprietario
 * e si sceglie dall'elenco. Il <select> resta (nascosto) ed è sempre lui a dire il valore: l'app continua a
 * leggere select.value e ad ascoltare «change». Testo cercato = testo dell'opzione + data-cerca dell'opzione.
 * Uso: oboCercaProgetto(document.getElementById("selProgetto"), { segnaposto: "Cerca…" })
 * Pubblicato come /cerca-progetto.js. ES5, senza librerie.
 */
(function () {
  if (window.oboCercaProgetto) return;
  var stile = document.createElement("style");
  stile.textContent =
    ".cp{position:relative;width:100%}" +
    ".cp-campo{display:flex;align-items:center;gap:8px;border:1px solid var(--bordo,#c5d9de);border-radius:12px;background:var(--carta,#fff);padding:0 10px;min-height:44px}" +
    ".cp-campo:focus-within{border-color:var(--arancio,#f39b00);box-shadow:0 0 0 3px rgba(243,155,0,.18)}" +
    ".cp-campo svg{flex:none;color:var(--tenue,#7694a4)}" +
    ".cp-campo input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--testo,#282a31);font:inherit;font-size:16px;padding:10px 0}" +
    ".cp-campo button{flex:none;border:0;background:none;color:var(--tenue,#7694a4);cursor:pointer;font-size:18px;line-height:1;padding:4px}" +
    ".cp-lista{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:60;max-height:320px;overflow-y:auto;margin:0;padding:4px;list-style:none;background:var(--carta,#fff);border:1px solid var(--bordo,#c5d9de);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.18)}" +
    ".cp-lista li{display:flex;flex-direction:column;gap:1px;padding:9px 10px;border-radius:8px;cursor:pointer;color:var(--testo,#282a31)}" +
    ".cp-lista li b{font-size:14px;font-weight:600}.cp-lista li small{font-size:12px;color:var(--tenue,#7694a4)}" +
    ".cp-lista li[aria-selected=true],.cp-lista li:hover{background:var(--grigio,#eef2f4)}" +
    ".cp-lista li.cp-nuovo b{color:var(--arancio-scuro,#a45f00)}" +
    ".cp-lista li.cp-vuoto{cursor:default;color:var(--tenue,#7694a4);font-size:13px}" +
    ".cp-lista mark{background:rgba(243,155,0,.25);color:inherit;border-radius:3px}";
  document.head.appendChild(stile);

  var LENTE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>';
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function evidenzia(testo, q) {
    if (!q) return esc(testo);
    var n = norm(testo), i = n.indexOf(q);
    return i < 0 ? esc(testo) : esc(testo.slice(0, i)) + "<mark>" + esc(testo.slice(i, i + q.length)) + "</mark>" + esc(testo.slice(i + q.length));
  }

  window.oboCercaProgetto = function (sel, opz) {
    if (!sel || sel.dataset.cp) return;
    opz = opz || {};
    sel.dataset.cp = "1";
    var box = document.createElement("div"); box.className = "cp";
    var id = "cp" + Math.random().toString(36).slice(2, 8);
    box.innerHTML = '<div class="cp-campo">' + LENTE + '<input type="text" inputmode="search" enterkeyhint="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + id +
      '" autocomplete="off" placeholder="' + esc(opz.segnaposto || "Cerca per numero CRM, nome o comune") + '"><button type="button" aria-label="Svuota la ricerca" hidden>×</button></div><ul class="cp-lista" id="' + id + '" role="listbox" hidden></ul>';
    sel.parentNode.insertBefore(box, sel.nextSibling);
    sel.hidden = true; sel.setAttribute("aria-hidden", "true"); sel.tabIndex = -1;
    var inp = box.querySelector("input"), lista = box.querySelector("ul"), svuota = box.querySelector("button");
    var voci = [], attiva = -1, aperta = false;
    if (sel.id) { var lab = document.querySelector('label[for="' + sel.id + '"]'); if (lab) lab.setAttribute("for", ""); }
    var etichetta = sel.closest && sel.closest("label"); if (etichetta) inp.setAttribute("aria-label", (etichetta.textContent || "Progetto").trim());

    function opzioni() {
      return Array.prototype.map.call(sel.options, function (o) {
        var t = o.textContent.trim(), parti = t.split(" · ");
        return { v: o.value, t: t, titolo: parti.length > 1 ? parti.slice(1).join(" · ") : t, crm: parti.length > 1 ? parti[0] : "", extra: o.dataset.cerca || "", nuovo: /nuov|new/i.test(t) && /^\+/.test(t), vuota: o.value === "" };
      });
    }
    function testoScelto() {
      var o = sel.options[sel.selectedIndex];
      return o && o.value ? o.textContent.trim() : "";
    }
    function mostra(q) {
      q = norm(q).trim();
      voci = opzioni().filter(function (o) { return !o.vuota && (o.nuovo || !q || norm(o.t + " " + o.extra).indexOf(q) >= 0); });
      var trovate = voci.filter(function (o) { return !o.nuovo; }).length;
      lista.innerHTML = voci.map(function (o, i) {
        if (o.nuovo) return '<li role="option" class="cp-nuovo" data-i="' + i + '" aria-selected="' + (i === attiva) + '"><b>' + esc(o.t) + "</b></li>";
        return '<li role="option" data-i="' + i + '" aria-selected="' + (i === attiva) + '"><b>' + evidenzia(o.titolo, q) + "</b><small>" + evidenzia([o.crm, o.extra.replace(o.t, "").trim()].filter(Boolean).join(" · "), q) + "</small></li>";
      }).join("") + (q && !trovate ? '<li class="cp-vuoto">Nessun progetto trovato con «' + esc(q) + '»</li>' : "");
      lista.hidden = false; aperta = true; inp.setAttribute("aria-expanded", "true");
    }
    function chiudi() { lista.hidden = true; aperta = false; attiva = -1; inp.setAttribute("aria-expanded", "false"); inp.value = testoScelto(); svuota.hidden = !inp.value; }
    function scegli(i) {
      var o = voci[i]; if (!o) return;
      sel.value = o.v;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      chiudi(); if (o.nuovo) inp.value = "";
    }
    inp.addEventListener("focus", function () { inp.select(); mostra(""); });
    inp.addEventListener("input", function () { attiva = -1; svuota.hidden = !inp.value; mostra(inp.value); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!aperta) mostra(inp.value); var n = voci.length; if (!n) return; attiva = (attiva + (e.key === "ArrowDown" ? 1 : -1) + n) % n; mostra(inp.value); var li = lista.querySelector('[data-i="' + attiva + '"]'); if (li) li.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter") { if (aperta) { e.preventDefault(); scegli(attiva >= 0 ? attiva : voci.findIndex(function (o) { return !o.nuovo; })); } }
      else if (e.key === "Escape") { chiudi(); inp.blur(); }
    });
    lista.addEventListener("mousedown", function (e) { e.preventDefault(); });
    lista.addEventListener("click", function (e) { var li = e.target.closest("li[data-i]"); if (li) scegli(Number(li.dataset.i)); });
    inp.addEventListener("blur", function () { setTimeout(chiudi, 120); });
    svuota.addEventListener("click", function () {
      inp.value = ""; svuota.hidden = true;
      // nei filtri (es. Mappa carichi) svuotare vuol dire «tutti»
      if (opz.svuotaAzzera && sel.value !== "") { sel.value = ""; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      inp.focus(); mostra("");
    });
    // l'app riscrive le opzioni o cambia il valore: il campo si aggiorna da solo
    new MutationObserver(function () { if (!aperta) { inp.value = testoScelto(); svuota.hidden = !inp.value; } else mostra(inp.value); }).observe(sel, { childList: true, subtree: true, characterData: true });
    sel.addEventListener("change", function () { if (!aperta) { inp.value = testoScelto(); svuota.hidden = !inp.value; } });
    var giro = setInterval(function () { if (!document.body.contains(sel)) return clearInterval(giro); if (!aperta && document.activeElement !== inp) { var t = testoScelto(); if (inp.value !== t) { inp.value = t; svuota.hidden = !t; } } }, 700);
    inp.value = testoScelto(); svuota.hidden = !inp.value;
    return { aggiorna: function () { inp.value = testoScelto(); } };
  };
})();
