/* Registra l'app installabile e mostra il pulsante "Installa app" quando il browser lo permette (PC, Android). */
(function () {
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  if (standalone) return;
  var ev = null, btn = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); ev = e;
    if (btn) return;
    btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Installa app'; btn.setAttribute('aria-label', 'Installa l\'app sul dispositivo');
    btn.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;border:0;border-radius:999px;padding:12px 18px;font:600 14px system-ui,sans-serif;background:#f39b00;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer';
    btn.addEventListener('click', function () {
      if (!ev) return; ev.prompt();
      ev.userChoice.then(function () { ev = null; if (btn) { btn.remove(); btn = null; } });
    });
    document.body.appendChild(btn);
  });
  window.addEventListener('appinstalled', function () { if (btn) { btn.remove(); btn = null; } });
})();

/* iPhone/iPad (Safari non mostra un pulsante di installazione): breve guida per aggiungere l'app alla schermata Home. */
(function () {
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  if (!ios || standalone) return;
  try { if (localStorage.getItem('obo-guida-ios') === 'no') return; } catch (e) {}
  var en = false; try { en = localStorage.getItem('obo-lingua') === 'en'; } catch (e) {}
  var testo = en
    ? '<b>Install OBO Hub as an app</b><br>Tap <b>Share</b> <span aria-hidden="true">⬆︎</span> below, then <b>Add to Home Screen</b>. Then always open it from the icon: no address bar, full screen.'
    : '<b>Installa OBO Hub come app</b><br>Tocca <b>Condividi</b> <span aria-hidden="true">⬆︎</span> in basso, poi <b>Aggiungi alla schermata Home</b>. Da lì aprila sempre dall’icona: niente barra dell’indirizzo, a schermo intero.';
  function mostra() {
    var box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', en ? 'Install the app' : 'Installa l’app');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:2147483647;padding:14px 44px 14px 16px;border-radius:16px;background:#41525d;color:#fff;font:15px/1.45 -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
    box.innerHTML = testo + '<button type="button" aria-label="' + (en ? 'Close' : 'Chiudi') + '" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:18px;line-height:1">×</button>';
    box.querySelector('button').addEventListener('click', function () { box.remove(); try { localStorage.setItem('obo-guida-ios', 'no'); } catch (e) {} });
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostra); else mostra();
})();
