/* Manutenzione delle app di OBO Hub.
 * L'admin accende la manutenzione di un'app o di una sezione in Progettazione LPS → Admin → Manutenzione
 * (chiave "manutenzione" di impostazioni_admin). Lo stato si legge con la funzione pubblica
 * stato_manutenzione() di Supabase (script supabase/manutenzione.sql del repository appOBOtechHUB).
 * Uso: <script src="../manutenzione.js" data-sezione="app:mappa"></script>
 * Chi non è admin viene mandato alla pagina manutenzione.html; l'admin vede solo un avviso.
 * Se la funzione non risponde l'app resta aperta (mai bloccare per un errore). */
(function () {
  var SB = "https://qzfosidvjsyivaibnadf.supabase.co";
  var CHIAVE = "sb_publishable_4ZA8X-l1eNBTfhLahViHdg_Ih3aO38L";
  var tag = document.currentScript;
  var radice = (tag && tag.src) ? tag.src.replace(/manutenzione\.js(\?.*)?$/, "") : "/";
  var promessa = null;

  function token() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.*-auth-token$/.test(k)) {
          var v = JSON.parse(localStorage.getItem(k) || "null");
          var t = v && (v.access_token || (v.currentSession && v.currentSession.access_token));
          if (t && (!v.expires_at || v.expires_at * 1000 > Date.now())) return t;
        }
      }
    } catch (e) {}
    return null;
  }
  function chiedi(conToken) {
    var t = conToken ? token() : null;
    return fetch(SB + "/rest/v1/rpc/stato_manutenzione", {
      method: "POST", cache: "no-store",
      headers: { apikey: CHIAVE, Authorization: "Bearer " + (t || CHIAVE), "Content-Type": "application/json" },
      body: "{}",
    }).then(function (r) { return r.ok ? r.json() : (t ? chiedi(false) : null); });
  }
  function sessioneScaduta() {
    try { for (var i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return !token(); } catch (e) {}
    return false;
  }
  var attendi = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
  /** {sezioni: {id: {nome, nome_en, fino, nota}}, admin: bool} oppure null se non disponibile. */
  function stato(nuovo) {
    // sessione scaduta: l'app la rinnova appena aperta, aspetto un attimo per riconoscere l'admin
    if (!promessa || nuovo) promessa = attendi(sessioneScaduta() ? 2500 : 0).then(function () { return chiedi(true); }).then(function (s) {
      return s && typeof s === "object" ? { sezioni: s.sezioni || {}, admin: !!s.admin } : null;
    }).catch(function () { return null; });
    return promessa;
  }
  function pagina(id) {
    var torna = location.pathname + location.search + location.hash;
    return radice + "manutenzione.html?s=" + encodeURIComponent(id) + "&torna=" + encodeURIComponent(torna);
  }
  function avvisoAdmin(voce) {
    if (document.getElementById("obo-manutenzione-admin")) return;
    var d = document.createElement("div");
    d.id = "obo-manutenzione-admin"; d.setAttribute("role", "status");
    d.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:2147483000;max-width:calc(100% - 32px);background:#7a4b00;color:#fff;padding:10px 16px;border-radius:999px;font:600 14px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center";
    d.innerHTML = "<span>In manutenzione: la vedi perché sei admin" + (voce && voce.fino ? " · fine prevista " + new Date(voce.fino).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "") + "</span>";
    var x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Chiudi");
    x.style.cssText = "background:none;border:0;color:#fff;font-size:20px;cursor:pointer;padding:0 2px";
    x.onclick = function () { d.remove(); };
    d.appendChild(x);
    (document.body || document.documentElement).appendChild(d);
  }
  /** Controlla una o più sezioni (la prima in manutenzione decide). */
  function controlla(ids) {
    ids = [].concat(ids).filter(Boolean);
    return stato().then(function (s) {
      if (!s) return false;
      for (var i = 0; i < ids.length; i++) {
        var voce = s.sezioni[ids[i]];
        if (!voce) continue;
        if (s.admin) { if (document.body) avvisoAdmin(voce); else document.addEventListener("DOMContentLoaded", function () { avvisoAdmin(voce); }); return false; }
        location.replace(pagina(ids[i]));
        return true;
      }
      return false;
    });
  }
  window.OBOManutenzione = { stato: stato, controlla: controlla, pagina: pagina };
  var sez = tag && tag.getAttribute("data-sezione");
  if (sez) controlla(sez.split(","));
})();
