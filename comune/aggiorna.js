/* "Aggiorna app": se è stata pubblicata una versione nuova compare una barra in alto (PC, iPhone, iPad, Android). */
(function () {
  var ATTUALE = "__VERSIONE__";
  if (ATTUALE.indexOf("__") === 0) return; // file non pubblicato (prova locale)
  var url = (document.currentScript && document.currentScript.dataset.versione) || "version.json";
  var mostrata = false, nuova = "";
  function en() { try { return localStorage.getItem("obo-lingua") === "en"; } catch (e) { return false; } }
  function mostra() {
    if (mostrata) return; mostrata = true;
    var b = document.createElement("div"); b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:10px 16px;padding-top:max(10px,env(safe-area-inset-top));background:#f39b00;color:#fff;font:600 14px -apple-system,system-ui,Helvetica,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.2)";
    b.innerHTML = '<span>' + (en() ? "A new version of the app is available." : "È disponibile una nuova versione dell’app.") + '</span><button type="button" style="border:0;border-radius:999px;padding:6px 14px;background:#fff;color:#c47c00;font:inherit;cursor:pointer">' + (en() ? "Update app" : "Aggiorna app") + '</button>';
    b.querySelector("button").addEventListener("click", function () {
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
  function controlla() {
    fetch(url + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.versione || j.versione === ATTUALE) return;
        var gia = ""; try { gia = sessionStorage.getItem("obo-aggiornato") || ""; } catch (e) {}
        if (gia === j.versione) return; // appena aggiornato: la cache del browser può servire ancora per poco i file vecchi
        nuova = j.versione; mostra();
      }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", controlla); else controlla();
  setInterval(controlla, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") controlla(); });
})();
