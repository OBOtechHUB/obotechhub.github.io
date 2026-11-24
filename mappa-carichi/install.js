/* Registra l'app installabile e la rende installabile; il pulsante "Installa app" sta solo nella pagina iniziale di OBO Hub. */
(function () {
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  // il pulsante "Installa app" c'è solo nella pagina iniziale di OBO Hub (richiesta di Marco, 24/11/2026)
})();
