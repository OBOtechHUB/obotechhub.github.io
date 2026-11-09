/*
 * "Aggiorna app" + novità, per tutte le app di OBO Hub (PC, iPhone, iPad, Android).
 * - Se è stata pubblicata una versione nuova compare una barra in alto con le novità e il pulsante "Aggiorna app".
 * - Dopo l'aggiornamento le novità non ancora viste compaiono una volta in un riquadro, finché non si preme "Ho capito".
 * Uso: <script src="aggiorna.js" data-versione="version.json" data-novita="novita.json" data-app="hub"></script>
 * Le novità stanno nel registro novita.json (una voce per ogni aggiornamento, la più recente per prima).
 */
(function () {
  var ATTUALE = "__VERSIONE__";
  var s = document.currentScript || {};
  var ds = s.dataset || {};
  var url = ds.versione || "version.json";
  var urlNovita = ds.novita || url.replace(/version\.json$/, "novita.json");
  var APP = ds.app || "hub";
  var pagina = url.replace(/version\.json$/, "novita.html");
  var CHIAVE = "obo-novita-" + APP;
  var mostrata = false, nuova = "";

  function en() { try { return localStorage.getItem("obo-lingua") === "en"; } catch (e) { return false; } }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function leggi(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function scrivi(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function dataIt(d) { try { return new Date(d + "T12:00:00").toLocaleDateString(en() ? "en-GB" : "it-IT", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return d; } }

  function caricaNovita() {
    return fetch(urlNovita + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.aggiornamenti || []).filter(function (a) { return a.app === APP || a.app === "tutte"; }); })
      .catch(function () { return []; });
  }
  /** Voci più recenti dell'ultima vista. Al primo avvio non mostra nulla e segna tutto come visto. */
  function nonViste(lista) {
    if (!lista.length) return [];
    var vista = leggi(CHIAVE);
    if (!vista) { scrivi(CHIAVE, lista[0].id); return []; }
    var out = [];
    for (var i = 0; i < lista.length; i++) { if (lista[i].id === vista) return out; out.push(lista[i]); }
    return []; // voce vista non più nel registro: non ripropone tutto
  }
  function elenco(voci, max) {
    var h = "";
    voci.slice(0, max || 5).forEach(function (a) {
      var titolo = en() && a.titolo_en ? a.titolo_en : a.titolo;
      var righe = (en() && a.voci_en ? a.voci_en : a.voci) || [];
      h += '<div style="margin-top:8px"><b>' + esc(titolo) + '</b> <span style="opacity:.75;font-weight:400">· ' + esc(dataIt(a.data)) + '</span>';
      if (righe.length) h += '<ul style="margin:4px 0 0;padding-left:18px;font-weight:400">' + righe.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>";
      h += "</div>";
    });
    if (voci.length > (max || 5)) h += '<div style="margin-top:6px;font-weight:400">' + (en() ? "…and more" : "…e altro") + "</div>";
    return h;
  }
  var BOTTONE = "border:0;border-radius:999px;padding:6px 14px;font:inherit;cursor:pointer";

  function mostraBarra(voci) {
    if (mostrata) return; mostrata = true;
    var vecchio = document.getElementById("obo-novita"); if (vecchio) vecchio.remove(); // le novità sono già nella barra
    var b = document.createElement("div"); b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483647;max-height:70vh;overflow:auto;padding:10px 16px;padding-top:max(10px,env(safe-area-inset-top));background:#f39b00;color:#fff;font:600 14px -apple-system,system-ui,Helvetica,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.2)";
    var riga = '<div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap"><span>' + (en() ? "A new version of the app is available." : "È disponibile una nuova versione dell’app.") + '</span>' +
      (voci.length ? '<button type="button" data-novita style="' + BOTTONE + ';background:transparent;color:#fff;border:1px solid rgba(255,255,255,.8)">' + (en() ? "What's new" : "Cosa cambia") + "</button>" : "") +
      '<button type="button" data-aggiorna style="' + BOTTONE + ';background:#fff;color:#c47c00">' + (en() ? "Update app" : "Aggiorna app") + "</button></div>";
    b.innerHTML = riga + (voci.length ? '<div data-elenco hidden style="max-width:720px;margin:6px auto 0">' + elenco(voci) + "</div>" : "");
    var bn = b.querySelector("[data-novita]");
    if (bn) bn.addEventListener("click", function () { var e = b.querySelector("[data-elenco]"); e.hidden = !e.hidden; });
    b.querySelector("[data-aggiorna]").addEventListener("click", function () {
      try { sessionStorage.setItem("obo-aggiornato", nuova); } catch (e) {}
      var fatto = function () { location.reload(); };
      try {
        Promise.all([
          navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (r) { return Promise.all(r.map(function (x) { return x.update().catch(function () {}); })); }) : null,
          window.caches ? caches.keys().then(function (k) { return Promise.all(k.map(function (n) { return caches.delete(n); })); }) : null
        ]).then(fatto, fatto);
      } catch (e) { fatto(); }
    });
    document.body.appendChild(b);
  }

  function mostraNovita(voci) {
    if (!voci.length || mostrata || document.getElementById("obo-novita")) return;
    var c = document.createElement("div"); c.id = "obo-novita"; c.setAttribute("role", "dialog"); c.setAttribute("aria-label", en() ? "What's new" : "Novità");
    c.style.cssText = "position:fixed;right:16px;bottom:16px;left:16px;margin-left:auto;max-width:420px;max-height:70vh;overflow:auto;z-index:2147483646;padding:16px;border-radius:14px;background:#fff;color:#1f2a30;border:1px solid #f39b00;box-shadow:0 12px 32px rgba(0,0,0,.25);font:14px -apple-system,system-ui,Helvetica,Arial,sans-serif";
    c.innerHTML = '<div style="font-weight:700;font-size:16px;color:#c47c00">' + (en() ? "What's new" : "Novità dell’app") + "</div>" + elenco(voci) +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><a href="' + esc(pagina) + '" style="' + BOTTONE + ';text-decoration:none;color:#c47c00;border:1px solid #f39b00">' + (en() ? "All updates" : "Tutte le novità") + '</a><button type="button" style="' + BOTTONE + ';background:#f39b00;color:#fff;font-weight:600">' + (en() ? "Got it" : "Ho capito") + "</button></div>";
    c.querySelector("button").addEventListener("click", function () { scrivi(CHIAVE, voci[0].id); c.remove(); });
    document.body.appendChild(c);
  }

  function controlla() {
    if (ATTUALE.indexOf("__") === 0) return; // file non pubblicato (prova locale)
    fetch(url + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.versione || j.versione === ATTUALE) return;
        var gia = ""; try { gia = sessionStorage.getItem("obo-aggiornato") || ""; } catch (e) {}
        if (gia === j.versione) return; // appena aggiornato: la cache del browser può servire ancora per poco i file vecchi
        nuova = j.versione;
        caricaNovita().then(function (l) { var v = leggi(CHIAVE) ? nonViste(l) : l.slice(0, 3); mostraBarra(v); });
      }).catch(function () {});
  }
  function avvio() { controlla(); caricaNovita().then(function (l) { mostraNovita(nonViste(l)); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvio); else avvio();
  setInterval(controlla, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") controlla(); });
})();
