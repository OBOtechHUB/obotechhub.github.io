/*
 * Avviso comune a tutte le app di OBO Hub: se ci sono dati non salvati nel progetto e si esce
 * (link, OBO Hub, chiusura o ricarica della scheda) compare «Attenzione: perderai i dati».
 * Pubblicato come /avviso-uscita.js. Uso dalla pagina:
 *   oboAvvisoUscita.registra(function () { return true se ci sono dati non salvati; }, function () { return promessa di salvataggio; });
 * Il secondo argomento è facoltativo: se c'è, la finestra offre anche «Salva ed esci».
 * ES5, nessuna dipendenza.
 */
(function () {
  if (window.oboAvvisoUscita) return;
  var controlli = [], salvataggi = [], via = false;
  function en() { try { return localStorage.getItem("obo-lingua") === "en"; } catch (e) { return false; } }
  function T(it, eng) { return en() ? eng : it; }
  function sporco() {
    if (via) return false;
    for (var i = 0; i < controlli.length; i++) { try { if (controlli[i]()) return true; } catch (e) { /* niente */ } }
    return false;
  }
  window.oboAvvisoUscita = {
    registra: function (controllo, salva) { controlli.push(controllo); if (salva) salvataggi.push(salva); },
    sporco: sporco,
    // da chiamare prima di un cambio pagina voluto dall'app (es. dopo aver salvato)
    lascia: function () { via = true; },
    chiedi: function (dopo) { if (!sporco()) { dopo(); return; } finestra(dopo); }
  };

  // chiusura, ricarica o indirizzo scritto a mano: il browser mostra il suo avviso (il testo non si può cambiare)
  window.addEventListener("beforeunload", function (e) {
    if (!sporco()) return;
    e.preventDefault(); e.returnValue = ""; return "";
  });

  // link della pagina (OBO Hub, Tutti i progetti, altre app…): finestra con il nostro testo
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" || /^(javascript|mailto|tel|blob|data):/i.test(href)) return;
    var u; try { u = new URL(a.href, location.href); } catch (er) { return; }
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return;
    if (!sporco()) return;
    e.preventDefault(); e.stopPropagation();
    finestra(function () { via = true; location.href = u.href; });
  }, true);

  function finestra(dopo) {
    var vecchia = document.getElementById("obo-avviso-uscita"); if (vecchia) vecchia.remove();
    var scuro = document.documentElement.dataset.theme === "dark";
    var f = document.createElement("div");
    f.id = "obo-avviso-uscita";
    f.setAttribute("role", "alertdialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-labelledby", "obo-au-t");
    f.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,24,28,.55);font-family:var(--font,-apple-system,Segoe UI,Arial,sans-serif)";
    var colBox = scuro ? "background:#1f2329;color:#eef1f4;border:1px solid #3a4148" : "background:#fff;color:#212529;border:1px solid #dee2e6";
    var btn = "border-radius:999px;padding:9px 16px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;";
    var conSalva = salvataggi.length > 0;
    f.innerHTML = '<div style="max-width:420px;width:100%;border-radius:16px;padding:20px;box-shadow:0 18px 48px rgba(0,0,0,.35);' + colBox + '">' +
      '<h2 id="obo-au-t" style="margin:0 0 8px;font-size:18px;display:flex;gap:8px;align-items:center"><span aria-hidden="true" style="color:#f39b00;font-size:22px">⚠</span>' + T("Attenzione: perderai i dati", "Warning: you will lose your data") + '</h2>' +
      '<p style="margin:0 0 16px;font-size:14px;line-height:1.45">' + T("Non hai salvato nel progetto. Se esci ora le modifiche non salvate andranno perse.", "You haven't saved to the project. If you leave now, unsaved changes will be lost.") + '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end">' +
      '<button type="button" data-a="esci" style="' + btn + 'background:none;border:1px solid ' + (scuro ? "#5a636c" : "#ced4da") + ';color:inherit">' + T("Esci senza salvare", "Leave without saving") + '</button>' +
      (conSalva ? '<button type="button" data-a="salva" style="' + btn + 'background:none;border:1px solid #f39b00;color:#f39b00">' + T("Salva ed esci", "Save and leave") + '</button>' : "") +
      '<button type="button" data-a="resta" style="' + btn + 'background:#f39b00;border:1px solid #f39b00;color:#fff">' + T("Resta qui", "Stay here") + '</button>' +
      '</div><p data-m style="margin:10px 0 0;font-size:13px;color:#b3261e" role="status"></p></div>';
    function chiudi() { f.remove(); document.removeEventListener("keydown", tasto, true); }
    function tasto(e) { if (e.key === "Escape") { e.preventDefault(); chiudi(); } }
    f.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-a]") : null;
      if (!b) { if (e.target === f) chiudi(); return; }
      var a = b.getAttribute("data-a");
      if (a === "resta") chiudi();
      else if (a === "esci") { chiudi(); via = true; dopo(); }
      else if (a === "salva") {
        b.disabled = true; b.textContent = T("Salvataggio…", "Saving…");
        var p = [];
        for (var i = 0; i < salvataggi.length; i++) { try { p.push(salvataggi[i]()); } catch (er) { p.push(Promise.reject(er)); } }
        Promise.all(p).then(function () {
          if (sporco()) throw new Error(T("compila i dati del progetto e premi «Salva nel progetto»", "fill in the project data and press «Save to project»"));
          chiudi(); via = true; dopo();
        }).catch(function (er) {
          b.disabled = false; b.textContent = T("Salva ed esci", "Save and leave");
          f.querySelector("[data-m]").textContent = T("Non salvato: ", "Not saved: ") + (er && er.message ? er.message : er);
        });
      }
    });
    document.addEventListener("keydown", tasto, true);
    document.body.appendChild(f);
    var r = f.querySelector('button[data-a="resta"]'); if (r) r.focus();
  }
})();
