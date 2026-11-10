/* Registro errori e statistiche d'uso delle app di OBO Hub (funzioni segnala_errore e registra_uso,
 * script supabase/pro.sql del repository appOBOtechHUB). Gli admin vedono tutto in Amministrazione.
 * Uso: <script src="../registro.js" data-app="mappa"></script>
 *   - gli errori del browser vengono mandati da soli (lo stesso errore una volta sola per pagina);
 *   - l'apertura dell'app conta come uso; per le sezioni: OBORegistro.uso("offerte").
 * Non manda mai dati inseriti dall'utente: solo pagina, messaggio d'errore, browser e versione. */
(function () {
  var SB = "https://qzfosidvjsyivaibnadf.supabase.co";
  var CHIAVE = "sb_publishable_4ZA8X-l1eNBTfhLahViHdg_Ih3aO38L";
  var tag = document.currentScript;
  var APP = (tag && tag.getAttribute("data-app")) || "hub";
  var visti = {}, inviati = 0;

  function token() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.*-auth-token$/.test(k)) {
          var v = JSON.parse(localStorage.getItem(k) || "null");
          if (v && v.access_token && (!v.expires_at || v.expires_at * 1000 > Date.now())) return v.access_token;
        }
      }
    } catch (e) {}
    return null;
  }
  function visitatore() {
    try { var v = JSON.parse(localStorage.getItem("obo-visitatore") || "null"); return v && v.token ? String(v.name || "Visitatore") : null; } catch (e) { return null; }
  }
  function rpc(nome, corpo) {
    var t = token();
    return fetch(SB + "/rest/v1/rpc/" + nome, {
      method: "POST", keepalive: true,
      headers: { apikey: CHIAVE, Authorization: "Bearer " + (t || CHIAVE), "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    }).catch(function () {});
  }
  function versione() { try { return (document.querySelector('meta[name="obo-versione"]') || {}).content || ""; } catch (e) { return ""; } }
  // percorso senza parametri: niente dati personali o ricerche nell'indirizzo
  function pagina() { return location.pathname + (location.hash && location.hash.length < 40 ? location.hash : ""); }

  function errore(messaggio, dettagli) {
    messaggio = String(messaggio || "").slice(0, 500);
    if (!messaggio || /ResizeObserver loop|Script error\.?$|Load failed|NetworkError|Failed to fetch|AbortError/i.test(messaggio)) return;
    var k = messaggio + "|" + pagina();
    if (visti[k] || inviati >= 10) return; // al massimo 10 errori diversi per pagina aperta
    visti[k] = 1; inviati++;
    rpc("segnala_errore", { app: APP, pagina: pagina(), messaggio: messaggio, dettagli: String(dettagli || "").slice(0, 4000), browser: navigator.userAgent.slice(0, 300), versione: versione() });
  }
  window.addEventListener("error", function (e) {
    if (e && e.message) errore(e.message, (e.filename || "") + ":" + (e.lineno || "") + ":" + (e.colno || "") + (e.error && e.error.stack ? "\n" + e.error.stack : ""));
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    errore(r && r.message ? r.message : String(r), r && r.stack ? r.stack : "");
  });

  function uso(sezione) {
    var s = String(sezione || "").slice(0, 60);
    var chiave = "obo-uso-" + APP + "-" + s, ora = Date.now();
    try { var u = Number(sessionStorage.getItem(chiave) || 0); if (ora - u < 30 * 60 * 1000) return; sessionStorage.setItem(chiave, String(ora)); } catch (e) {}
    var v = visitatore();
    if (!token() && !v) return; // solo chi è entrato
    rpc("registra_uso", { app: APP, sezione: s, visitatore: token() ? null : v });
  }
  window.OBORegistro = { errore: errore, uso: uso };
  if (tag && tag.getAttribute("data-uso") !== "no") setTimeout(function () { uso(""); }, 3000);
})();
