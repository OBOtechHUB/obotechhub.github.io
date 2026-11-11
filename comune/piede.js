/* Piè di pagina comune di OBO Hub: stessi collegamenti in tutte le app.
 * Uso: <script src="../piede.js" defer></script> (prima di </body>). Nessun effetto se la pagina ha già un footer.obo-piede. */
(function () {
  if (document.querySelector("footer.obo-piede")) return;
  var s = document.currentScript, radice = s && s.src ? s.src.replace(/piede\.js(\?.*)?$/, "") : "/";
  var en = false; try { en = localStorage.getItem("obo-lingua") === "en"; } catch (e) {}
  var T = function (i, e) { return en ? e : i; };
  var f = document.createElement("footer");
  f.className = "obo-piede";
  f.innerHTML = '<div class="contenitore" style="max-width:1100px;margin:0 auto;padding:0 16px;display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;align-items:center">' +
    "<span>" + T("OBO Hub · strumenti interni dell'ufficio tecnico OBO Italia", "OBO Hub · internal tools of the OBO Italia technical office") + "</span>" +
    '<nav aria-label="' + T("Collegamenti", "Links") + '" style="display:flex;flex-wrap:wrap;gap:6px 14px">' +
    '<a href="' + radice + '">OBO Hub</a>' +
    '<a href="' + radice + 'privacy.html">Privacy</a>' +
    '<a href="' + radice + 'condizioni.html">' + T("Condizioni d'uso", "Terms of use") + "</a>" +
    "</nav></div>";
  if (!document.getElementById("obo-piede-stile")) {
    var st = document.createElement("style"); st.id = "obo-piede-stile";
    st.textContent = "footer.obo-piede{margin-top:48px;background:var(--ardesia,#41525d);color:rgba(255,255,255,.85);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;padding:22px 0 calc(22px + env(safe-area-inset-bottom))}footer.obo-piede a{color:inherit;text-decoration:none}footer.obo-piede a:hover{color:#fff;text-decoration:underline}";
    document.head.appendChild(st);
  }
  (document.querySelector("body > main") ? document.body : document.body).appendChild(f);
})();
