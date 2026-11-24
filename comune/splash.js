/* OBO Hub · sigla d'apertura di 2-3 secondi, a tutto schermo, poi sparisce (una volta per sessione per app).
   Una scena per app, disegnata dal codice: Progettazione LPS = tempesta e fulmine che colpisce l'asta;
   OBO Hub = particelle che formano l'icona; Progetti = app che confluiscono nella cartella; Zavorra WRR = raffica
   di vento sul telaio; Torrette = anelli dal pavimento; Mappa carichi = calendario che si accende; Prodotti = griglia.
   Un tocco o un tasto la chiudono subito. Spenta con "riduci movimento", nei test (salvo ?fx) e con ?nofx.
   Se in quel momento c'è il saluto di benvenuto (benvenuto.js) la sigla non parte. */
(function () {
  var q = location.search;
  if ((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || /[?&]nofx\b/.test(q) || (navigator.webdriver && !/[?&]fx\b/.test(q))) return;
  var tag = document.currentScript || document.querySelector("script[data-sigla]") || document.querySelector("script[data-app]");
  var app = (tag && (tag.getAttribute("data-sigla") || tag.getAttribute("data-app"))) || "hub";
  if (/progetti\.html/.test(location.pathname)) app = "progetti";
  if (/novita\.html|privacy|condizioni/.test(location.pathname)) return;
  var chiave = "obo-sigla-" + app;
  try { if (sessionStorage.getItem(chiave) && !/[?&]sigla\b/.test(q)) return; sessionStorage.setItem(chiave, "1"); } catch (e) {}
  var TITOLI = { lps: ["Progettazione LPS", "CEI EN IEC 62305"], hub: ["OBO Hub", "Building Connections"], progetti: ["Progetti", "Un solo progetto, tutte le soluzioni"],
    zavorra: ["Zavorra telai WRR", "Magic PV Mount"], torrette: ["Configuratore torrette", "Sistemi sottopavimento"], mappa: ["Mappa carichi", "Ufficio tecnico"], prodotti: ["Prodotti OBO", "Catalogo"] };
  var tit = TITOLI[app] || TITOLI.hub, DURATA = 2600;

  function avvia() {
    if (document.getElementById("obo-bv")) return; // c'è già il saluto di benvenuto
    var d = document.createElement("div"); d.id = "obo-sigla"; d.setAttribute("aria-hidden", "true");
    d.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#0d1215;cursor:pointer;opacity:1;transition:opacity .45s ease";
    var cv = document.createElement("canvas"); cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    var testo = document.createElement("div");
    testo.style.cssText = "position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:#fff;font-family:Inter,'Segoe UI',system-ui,sans-serif;opacity:0;transition:opacity .5s ease, transform .6s cubic-bezier(.2,.8,.2,1);pointer-events:none";
    testo.innerHTML = '<div style="font-weight:800;font-size:clamp(34px,6vw,72px);letter-spacing:-.02em;text-shadow:0 0 40px rgba(243,155,0,.55)">' + tit[0] + '</div><div style="margin-top:8px;color:#f39b00;font-weight:700;letter-spacing:.32em;font-size:clamp(11px,1.4vw,15px);text-transform:uppercase">' + tit[1] + '</div>';
    d.appendChild(cv); d.appendChild(testo); document.body.appendChild(d);
    var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = cv.width = Math.round(innerWidth * dpr), H = cv.height = Math.round(innerHeight * dpr);
    var t0 = performance.now(), finito = false, raf = 0;
    function chiudi() { if (finito) return; finito = true; d.style.opacity = "0"; setTimeout(function () { cancelAnimationFrame(raf); d.remove(); }, 480); try { localStorage.setItem("obo-attivita", String(Date.now())); } catch (e) {} }
    d.addEventListener("click", chiudi); addEventListener("keydown", chiudi, { once: true });
    setTimeout(chiudi, DURATA);

    var rnd = Math.random, cx = W / 2, cy = H / 2, U = Math.min(W, H);
    function bolt(x0, y0, x1, y1, ru) { var p = [[x0, y0], [x1, y1]]; for (var g = 0; g < 7; g++) { var n = [p[0]]; for (var i = 1; i < p.length; i++) { var a = p[i - 1], b = p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); n.push([(a[0] + b[0]) / 2 + (rnd() - .5) * l * ru, (a[1] + b[1]) / 2 + (rnd() - .5) * l * ru * .25], b); } p = n; } return p; }
    var colpo = bolt(cx + (rnd() - .5) * U * .3, -10, cx, cy - U * .12, .5), rami = [], gocce = [], parti = [];
    for (var r = 0; r < 4; r++) { var da = colpo[20 + Math.floor(rnd() * 70)]; rami.push(bolt(da[0], da[1], da[0] + (rnd() - .5) * U * .3, da[1] + U * (.1 + rnd() * .15), .55).slice(0, 40)); }
    for (var i = 0; i < 220; i++) gocce.push([rnd(), rnd(), .7 + rnd() * .6]);
    for (var j = 0; j < 700; j++) { var an = rnd() * 6.283, ra = U * (.4 + rnd() * .6); var Q = [[-1, -1], [.08, -1], [-1, .08], [.08, .08]][j % 4], s = rnd() * 4, lato = Math.floor(s), u = s - lato, L = .92;
      var x = lato === 0 ? Q[0] + u * L : lato === 1 ? Q[0] + L : lato === 2 ? Q[0] + L - u * L : Q[0], y = lato === 0 ? Q[1] : lato === 1 ? Q[1] + u * L : lato === 2 ? Q[1] + L : Q[1] + L - u * L;
      parti.push({ sx: cx + Math.cos(an) * ra, sy: cy + Math.sin(an) * ra, tx: cx + x * U * .09, ty: cy - U * .06 + y * U * .09, c: rnd() < .75 }); }
    function ease(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }
    function linea(p, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); for (var i = 0; i < p.length; i++) i ? ctx.lineTo(p[i][0], p[i][1]) : ctx.moveTo(p[i][0], p[i][1]); ctx.stroke(); }

    var SCENE = {
      lps: function (t) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1013"); g.addColorStop(1, "#2a3640"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (var k = 0; k < 9; k++) { var nx = ((k * .17 + t * .03) % 1.2 - .1) * W, ny = H * (.08 + (k % 3) * .07); var gr = ctx.createRadialGradient(nx, ny, 0, nx, ny, U * .3); gr.addColorStop(0, "rgba(70,84,95,.8)"); gr.addColorStop(1, "rgba(70,84,95,0)"); ctx.fillStyle = gr; ctx.fillRect(nx - U * .3, ny - U * .3, U * .6, U * .6); }
        ctx.strokeStyle = "rgba(190,205,215,.25)"; ctx.lineWidth = dpr; ctx.beginPath(); for (var i = 0; i < gocce.length; i++) { var x = gocce[i][0] * W, y = ((gocce[i][1] + t * gocce[i][2]) % 1) * H; ctx.moveTo(x, y); ctx.lineTo(x - 3 * dpr, y + 16 * dpr); } ctx.stroke();
        // edificio con asta
        var by = cy + U * .18; ctx.fillStyle = "#3d4b55"; ctx.fillRect(cx - U * .28, by - U * .2, U * .56, U * .2 + H); ctx.fillStyle = "#1a2025"; ctx.fillRect(0, by, W, H);
        ctx.strokeStyle = "#f39b00"; ctx.lineWidth = 3 * dpr; ctx.beginPath(); ctx.moveTo(cx, by - U * .2); ctx.lineTo(cx, cy - U * .12); ctx.moveTo(cx - U * .28, by - U * .2); ctx.lineTo(cx + U * .28, by - U * .2); ctx.moveTo(cx - U * .28, by - U * .2); ctx.lineTo(cx - U * .28, by + U * .05); ctx.stroke();
        var s = (t - .55) / .25; // colpo tra 0,55 e 0,8 s
        if (s > 0 && t < 1.9) { var parte = Math.max(2, Math.floor(colpo.length * Math.min(1, s * 3))), vivo = Math.max(0, 1 - (t - .8) * .9) * (.65 + .35 * Math.sin(t * 60));
          ctx.shadowColor = "#b9ccff"; ctx.shadowBlur = 30 * dpr; linea(colpo.slice(0, parte), 9 * dpr, "rgba(160,185,255," + .35 * vivo + ")"); linea(colpo.slice(0, parte), 3 * dpr, "rgba(255,255,255," + vivo + ")"); for (var r2 = 0; r2 < rami.length; r2++) linea(rami[r2], 1.4 * dpr, "rgba(220,230,255," + .6 * vivo + ")"); ctx.shadowBlur = 0;
          if (t > .78 && t < 1.0) { ctx.fillStyle = "rgba(235,240,255," + (1 - (t - .78) / .22) * .8 + ")"; ctx.fillRect(0, 0, W, H); }
          if (t > .8) { for (var w = 0; w < 3; w++) { var e = ((t - .8) * 1.2 + w / 3) % 1; ctx.strokeStyle = "rgba(243,155,0," + (1 - e) * .8 + ")"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.ellipse(cx - U * .28, by + U * .05, e * U * .25, e * U * .06, 0, 0, 6.283); ctx.stroke(); } } }
        return t > 1.0;
      },
      hub: function (t) {
        ctx.fillStyle = "#0d1215"; ctx.fillRect(0, 0, W, H); var e = ease(t / 1.2);
        for (var i = 0; i < parti.length; i++) { var p = parti[i]; ctx.fillStyle = p.c ? "rgba(243,155,0,.9)" : "rgba(220,228,233,.6)"; ctx.fillRect(p.sx + (p.tx - p.sx) * e, p.sy + (p.ty - p.sy) * e, 2 * dpr, 2 * dpr); }
        if (t > 1.1) { var a = Math.min(1, (t - 1.1) / .3); ctx.strokeStyle = "rgba(243,155,0," + a + ")"; ctx.lineWidth = 3 * dpr; ctx.shadowColor = "#f39b00"; ctx.shadowBlur = 24 * dpr; [[-1, -1], [.08, -1], [-1, .08], [.08, .08]].forEach(function (Q) { ctx.strokeRect(cx + Q[0] * U * .09, cy - U * .06 + Q[1] * U * .09, .92 * U * .09, .92 * U * .09); }); ctx.shadowBlur = 0; }
        return t > 1.2;
      },
      progetti: function (t) {
        ctx.fillStyle = "#0d1215"; ctx.fillRect(0, 0, W, H); var e = ease(t / 1.1);
        for (var k = 0; k < 6; k++) { var an = -Math.PI / 2 + k * Math.PI / 3, R = U * .35 * (1 - e * .75), x = cx + Math.cos(an) * R, y = cy - U * .06 + Math.sin(an) * R * .8, s = U * .06; ctx.strokeStyle = "rgba(243,155,0,.8)"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy - U * .06); ctx.stroke(); ctx.fillStyle = k ? "#41525d" : "#f39b00"; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
        if (t > .9) { var a = Math.min(1, (t - .9) / .3), cs = U * .12; ctx.fillStyle = "rgba(243,155,0," + a + ")"; ctx.shadowColor = "#f39b00"; ctx.shadowBlur = 30 * dpr; ctx.beginPath(); var x0 = cx - cs * .6, y0 = cy - U * .06 - cs * .4; ctx.moveTo(x0, y0); ctx.lineTo(x0 + cs * .45, y0); ctx.lineTo(x0 + cs * .55, y0 + cs * .14); ctx.lineTo(x0 + cs * 1.2, y0 + cs * .14); ctx.lineTo(x0 + cs * 1.2, y0 + cs * .85); ctx.lineTo(x0, y0 + cs * .85); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; }
        return t > 1.15;
      },
      zavorra: function (t) {
        ctx.fillStyle = "#0d1215"; ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < 46; i++) { var y = ((i * .618) % 1) * H, x = (((t * (.6 + (i % 5) * .15) + i * .37) % 1.4) - .2) * W, l = U * (.15 + (i % 4) * .06); var g = ctx.createLinearGradient(x - l, 0, x, 0); g.addColorStop(0, "rgba(220,228,233,0)"); g.addColorStop(1, i % 4 ? "rgba(220,228,233,.6)" : "rgba(243,155,0,.8)"); ctx.strokeStyle = g; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(x - l, y); ctx.quadraticCurveTo(x - l / 2, y - 10 * dpr * Math.sin(t * 3 + i), x, y); ctx.stroke(); }
        var h = U * .22, bx = cx - h * .3, by = cy + U * .04; ctx.strokeStyle = "#f39b00"; ctx.lineWidth = 4 * dpr; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + h * .35, by - h); ctx.moveTo(bx + h * .6, by); ctx.lineTo(bx + h * .35, by - h); ctx.moveTo(bx - h * .1, by - h * 1.03); ctx.lineTo(bx + h * .8, by - h * .8); ctx.stroke();
        return t > .9;
      },
      torrette: function (t) {
        ctx.fillStyle = "#0d1215"; ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < 8; i++) { var e = ((t * .7 + i / 8) % 1), r = U * (.03 + e * .4); ctx.strokeStyle = i % 2 ? "rgba(243,155,0," + (1 - e) + ")" : "rgba(220,228,233," + (1 - e) * .6 + ")"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.ellipse(cx, cy + U * .2 - e * U * .1, r, r * .3, 0, 0, 6.283); ctx.stroke(); }
        return t > .9;
      },
      mappa: function (t) {
        ctx.fillStyle = "#0d1215"; ctx.fillRect(0, 0, W, H); var c = U * .035, gg = c * .25, n = Math.ceil(W / (c + gg)), m = Math.ceil(H / (c + gg));
        for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) { var d2 = Math.hypot(i - n / 2, j - m / 2) / Math.hypot(n / 2, m / 2), on = t * 1.4 - d2; if (on <= 0) continue; var s = Math.max(0, Math.sin(i * .7 + j * 1.3)); ctx.fillStyle = s > .7 ? "rgba(243,155,0," + Math.min(.8, on) + ")" : "rgba(118,148,164," + Math.min(.35, on * .5) + ")"; ctx.fillRect(i * (c + gg), j * (c + gg), c, c); }
        return t > .9;
      },
      prodotti: function (t) {
        ctx.fillStyle = "#0d1215"; ctx.fillRect(0, 0, W, H); var lato = U * .09;
        for (var x = 0; x < W + lato; x += lato) for (var y = 0; y < H + lato; y += lato) { var d2 = Math.hypot(x - cx, y - cy) / U, on = t * 1.6 - d2; if (on <= 0) continue; ctx.strokeStyle = (Math.sin(x * .02 + y * .03) > .8) ? "rgba(243,155,0," + Math.min(1, on) + ")" : "rgba(220,228,233," + Math.min(.3, on * .4) + ")"; ctx.lineWidth = 1.5 * dpr; var r2 = lato * .3; ctx.strokeRect(x - r2, y - r2, r2 * 2, r2 * 2); }
        return t > .9;
      },
    };
    var scena = SCENE[app] || SCENE.hub;
    function frame(ms) {
      var t = (ms - t0) / 1000; var mostra = scena(t);
      if (mostra) { testo.style.opacity = "1"; testo.style.transform = "translateY(-50%) scale(1)"; }
      var vg = ctx.createRadialGradient(cx, cy, U * .3, cx, cy, Math.max(W, H) * .75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.5)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (!finito) raf = requestAnimationFrame(frame);
    }
    testo.style.top = app === "lps" ? "16%" : "72%";
    raf = requestAnimationFrame(frame);
  }
  // dopo il saluto di benvenuto, se c'è (lo crea subito al caricamento)
  function quando() { setTimeout(avvia, 60); }
  if (document.body) quando(); else document.addEventListener("DOMContentLoaded", quando);
})();
