/* OBO Hub · fasce "cinema" animate in cima alle pagine (caricato da registro.js), una scena per app, disegnata
   dal codice e mossa dallo scorrimento (profondità e zoom): OBO Hub e Progetti = connessioni che si
   accendono; Prodotti = griglia di prodotti che fluttua; Zavorra WRR = linee di vento sui telai;
   Torrette = anelli che salgono dal pavimento; Mappa carichi = calendario che si accende come una mappa di calore.
   Spenta con "riduci movimento", in stampa e con ?nofx. Non tocca i dati. */
(function () {
  if (window.__oboCinema) return; window.__oboCinema = true;
  var q = location.search;
  if ((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || /[?&]nofx\b/.test(q) || (navigator.webdriver && !/[?&]fx\b/.test(q))) return;
  var tag = document.querySelector("script[data-app]"), app = (tag && tag.getAttribute("data-app")) || "hub";
  if (/progetti/.test(location.pathname)) app = "progetti";
  var ARANCIO = [243, 155, 0], GRIGIO = [118, 148, 164];
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function scena(el) {
    if (el.__cinema) return; el.__cinema = true;
    var cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:.9";
    el.insertBefore(cv, el.firstChild);
    var ctx = cv.getContext("2d"); if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = 0, H = 0, visibile = true, raf = 0, prof = 0;
    function misura() { var r = el.getBoundingClientRect(); W = cv.width = Math.max(1, Math.round(r.width * dpr)); H = cv.height = Math.max(1, Math.round(r.height * dpr)); }
    misura(); if ("ResizeObserver" in window) new ResizeObserver(misura).observe(el);
    function scorri() { var r = el.getBoundingClientRect(); prof = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))); }
    addEventListener("scroll", scorri, { passive: true }); scorri();
    if ("IntersectionObserver" in window) new IntersectionObserver(function (v) { visibile = v[0].isIntersecting; if (visibile && !raf) raf = requestAnimationFrame(disegna); }).observe(el);
    var N = 46, nodi = [];
    for (var i = 0; i < N; i++) nodi.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, vx: (Math.random() - 0.5) * 0.00025, vy: (Math.random() - 0.5) * 0.00025, f: Math.random() * 6.28 });
    var impulsi = [];

    var disegni = {
      connessioni: function (t) {
        var zoom = 1 + prof * 0.6, cx = W / 2, cy = H / 2, P = [];
        for (var i = 0; i < N; i++) { var n = nodi[i]; n.x = (n.x + n.vx + 1) % 1; n.y = (n.y + n.vy + 1) % 1; var x = cx + (n.x * W - cx) * zoom * n.z * 1.3, y = cy + (n.y * H - cy) * zoom * n.z * 1.3; P.push([x, y, n.z]); }
        var dmax = 150 * dpr;
        for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) { var dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1], d = Math.sqrt(dx * dx + dy * dy); if (d < dmax) { ctx.strokeStyle = rgba(a % 3 ? GRIGIO : ARANCIO, (1 - d / dmax) * 0.35 * Math.min(P[a][2], P[b][2])); ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); if (Math.random() < 0.0006) impulsi.push({ a: a, b: b, t: t }); } }
        for (var k = impulsi.length - 1; k >= 0; k--) { var im = impulsi[k], e = (t - im.t) / 0.9; if (e > 1) { impulsi.splice(k, 1); continue; } var A = P[im.a], B = P[im.b]; var px = A[0] + (B[0] - A[0]) * e, py = A[1] + (B[1] - A[1]) * e; var g = ctx.createRadialGradient(px, py, 0, px, py, 10 * dpr); g.addColorStop(0, rgba([255, 214, 140], 0.9)); g.addColorStop(1, rgba(ARANCIO, 0)); ctx.fillStyle = g; ctx.fillRect(px - 10 * dpr, py - 10 * dpr, 20 * dpr, 20 * dpr); }
        for (var j = 0; j < N; j++) { var p = P[j], s = (1.2 + Math.sin(t * 2 + nodi[j].f)) * dpr * p[2] * 1.6; ctx.fillStyle = rgba(j % 3 ? [220, 228, 233] : ARANCIO, 0.75 * p[2]); ctx.beginPath(); ctx.arc(p[0], p[1], s, 0, 6.283); ctx.fill(); }
      },
      prodotti: function (t) {
        var lato = 46 * dpr * (1 + prof * 0.5), off = (t * 12 * dpr) % lato;
        for (var x = -lato; x < W + lato; x += lato) for (var y = -lato; y < H + lato; y += lato) {
          var s = Math.sin(t * 0.9 + x * 0.004 + y * 0.006), a = 0.08 + 0.18 * Math.max(0, s);
          ctx.strokeStyle = rgba(s > 0.85 ? ARANCIO : [220, 228, 233], a); ctx.lineWidth = dpr;
          var r = lato * 0.28 * (0.8 + 0.2 * s); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + off - r, y - off * 0.5 - r, 2 * r, 2 * r, 6 * dpr) : ctx.rect(x + off - r, y - off * 0.5 - r, 2 * r, 2 * r); ctx.stroke();
        }
      },
      vento: function (t) {
        var v = 1 + prof * 2;
        for (var i = 0; i < 38; i++) { var y = ((i * 0.618) % 1) * H, fase = t * (0.15 + (i % 5) * 0.04) * v + i, x = ((fase % 1.4) - 0.2) * W, l = (80 + (i % 4) * 40) * dpr;
          var g = ctx.createLinearGradient(x - l, 0, x, 0); g.addColorStop(0, rgba(i % 4 ? [220, 228, 233] : ARANCIO, 0)); g.addColorStop(1, rgba(i % 4 ? [220, 228, 233] : ARANCIO, 0.5));
          ctx.strokeStyle = g; ctx.lineWidth = 1.4 * dpr; ctx.beginPath(); ctx.moveTo(x - l, y); ctx.bezierCurveTo(x - l * 0.6, y - 8 * dpr * Math.sin(t + i), x - l * 0.3, y + 8 * dpr * Math.sin(t * 1.3 + i), x, y); ctx.stroke(); }
        // telai inverter stilizzati a destra
        for (var k = 0; k < 3; k++) { var bx = W * (0.68 + k * 0.1), by = H * 0.82, h = H * 0.4; ctx.strokeStyle = rgba(ARANCIO, 0.55); ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + h * 0.35, by - h); ctx.moveTo(bx + h * 0.6, by); ctx.lineTo(bx + h * 0.35, by - h); ctx.moveTo(bx - h * 0.05, by - h * 1.02); ctx.lineTo(bx + h * 0.75, by - h * 0.78); ctx.stroke(); ctx.fillStyle = rgba([220, 228, 233], 0.25); ctx.fillRect(bx + h * 0.12, by - h * 0.62, h * 0.38, h * 0.32); }
      },
      torrette: function (t) {
        var cx = W * 0.78, cy = H * 0.75;
        for (var i = 0; i < 7; i++) { var e = ((t * 0.25 + i / 7) % 1), r = (20 + e * 260) * dpr * (1 + prof * 0.4); ctx.strokeStyle = rgba(i % 2 ? ARANCIO : [220, 228, 233], (1 - e) * 0.5); ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.ellipse(cx, cy - e * 40 * dpr, r, r * 0.32, 0, 0, 6.283); ctx.stroke(); }
        ctx.strokeStyle = rgba([220, 228, 233], 0.12); ctx.lineWidth = dpr;
        for (var x = 0; x < W; x += 40 * dpr) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(W / 2 + (x - W / 2) * 0.3, H * 0.45); ctx.stroke(); }
      },
      mappa: function (t) {
        var c = 18 * dpr, g = 4 * dpr, cols = Math.ceil(W / (c + g)), rows = Math.ceil(H / (c + g));
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) { var s = Math.sin(t * 0.8 + i * 0.35) * Math.cos(t * 0.6 + j * 0.5 + i * 0.1), a = Math.max(0, s); ctx.fillStyle = rgba(a > 0.6 ? ARANCIO : GRIGIO, 0.06 + a * 0.35 * (1 - prof * 0.5)); ctx.fillRect(i * (c + g), j * (c + g), c, c); }
      },
    };
    var tema = { hub: "connessioni", progetti: "connessioni", prodotti: "prodotti", zavorra: "vento", torrette: "torrette", mappa: "mappa" }[app] || "connessioni";
    function disegna(ms) {
      raf = 0; if (!W || !H) { raf = requestAnimationFrame(disegna); return; }
      ctx.clearRect(0, 0, W, H); disegni[tema](ms / 1000);
      if (visibile) raf = requestAnimationFrame(disegna);
    }
    raf = requestAnimationFrame(disegna);
  }
  function avvia() { document.querySelectorAll(".eroe, .fx-eroe, .hero").forEach(scena); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia); else avvia();
  var attesa; new MutationObserver(function () { clearTimeout(attesa); attesa = setTimeout(avvia, 200); }).observe(document.documentElement, { childList: true, subtree: true });
})();
