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
    btn.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;border:0;border-radius:999px;padding:12px 18px;font:600 14px system-ui,sans-serif;background:#16151c;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer';
    btn.addEventListener('click', function () {
      if (!ev) return; ev.prompt();
      ev.userChoice.then(function () { ev = null; if (btn) { btn.remove(); btn = null; } });
    });
    document.body.appendChild(btn);
  });
  window.addEventListener('appinstalled', function () { if (btn) { btn.remove(); btn = null; } });
})();
