/* OBO Hub · introduzione cinematografica della pagina iniziale (una volta per sessione, poi «Rivedi l'introduzione»).
   Scorrendo: le particelle formano l'icona di OBO Hub, l'icona si apre nelle app dell'ufficio tecnico, le app si
   collegano a un unico progetto, la telecamera entra nel centro e si arriva alle app. Tutto disegnato dal codice.
   Spenta con "riduci movimento", nei test (salvo ?fx) e con ?nofx. */
(function () {
  var q = location.search;
  if ((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || /[?&]nofx\b/.test(q) || (navigator.webdriver && !/[?&]fx\b/.test(q))) return;
  var CHIAVE = "obo-intro-hub", vista = false;
  try { vista = sessionStorage.getItem(CHIAVE) === "1" && !/[?&]intro\b/.test(q); } catch (e) {}
  var eroe = document.querySelector("section.eroe"); if (!eroe) return;
  if (vista) { rivedi(); return; }
  try { sessionStorage.setItem(CHIAVE, "1"); } catch (e) {}

  var en = (function () { try { return localStorage.getItem("obo-lingua") === "en"; } catch (e) { return false; } })();
  var CAP = en ? [
    ["01 / 04", "One place", "All the technical office tools, behind a single secure login."],
    ["02 / 04", "Your apps", "The tools enabled for you, each one doing its job."],
    ["03 / 04", "One project", "Every app saves its solutions in the same project, shared with colleagues."],
    ["04 / 04", "Building Connections", "Let's get to work."],
  ] : [
    ["01 / 04", "Un unico posto", "Tutti gli strumenti dell'ufficio tecnico, dietro un solo accesso sicuro."],
    ["02 / 04", "Le tue app", "Gli strumenti abilitati per te, ognuno con il suo compito."],
    ["03 / 04", "Un solo progetto", "Ogni app salva le sue soluzioni nello stesso progetto, condiviso con i colleghi."],
    ["04 / 04", "Building Connections", "Si parte."],
  ];
  var st = document.createElement("style");
  st.textContent = ".intro-hub{position:relative;height:340svh;background:#0f1418}.intro-hub .scena{position:sticky;top:56px;height:calc(100svh - 56px);overflow:hidden}" +
    ".intro-hub canvas{position:absolute;inset:0;width:100%;height:100%}.intro-hub .cap{position:absolute;left:0;right:0;bottom:calc(84px + 6vh);max-width:1100px;margin:0 auto;padding:0 20px;color:#fff;pointer-events:none}" +
    ".intro-hub .cap div{position:absolute;bottom:0;max-width:620px}.intro-hub .cap small{display:block;color:#f39b00;font-weight:700;letter-spacing:.3em;font-size:12px}" +
    ".intro-hub .cap h2{margin:8px 0 0;font-size:clamp(36px,6vw,68px);line-height:1.02;letter-spacing:-.02em;text-shadow:0 4px 30px rgba(0,0,0,.6)}" +
    ".intro-hub .cap p{margin:12px 0 0;font-size:clamp(16px,1.8vw,21px);opacity:.9;text-shadow:0 2px 12px rgba(0,0,0,.7)}" +
    ".intro-hub .azioni-intro{position:absolute;left:0;right:0;bottom:22px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:0 16px}" +
    ".intro-hub .azioni-intro button{font:600 15px var(--font,inherit);border-radius:999px;padding:10px 20px;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);color:#fff}" +
    ".intro-hub .azioni-intro button.pri{background:#f39b00;border-color:#f39b00}.intro-hub .barra-p{position:absolute;right:16px;top:50%;height:160px;width:2px;transform:translateY(-50%);background:rgba(255,255,255,.2);border-radius:2px}" +
    ".intro-hub .barra-p i{display:block;width:100%;background:#f39b00;border-radius:2px}@media(max-width:640px){.intro-hub .barra-p{display:none}.intro-hub .scena{top:52px;height:calc(100svh - 52px)}}";
  document.head.appendChild(st);
  var sez = document.createElement("section"); sez.className = "intro-hub"; sez.setAttribute("aria-label", en ? "Introduction to OBO Hub" : "Introduzione a OBO Hub");
  sez.innerHTML = '<div class="scena"><canvas aria-hidden="true"></canvas><div class="cap">' + CAP.map(function (c) { return '<div><small>' + c[0] + '</small><h2>' + c[1] + '</h2><p>' + c[2] + '</p></div>'; }).join("") +
    '</div><div class="azioni-intro"><button type="button" class="pri" data-vai>' + (en ? "Go to the apps" : "Vai alle app") + '</button><button type="button" data-vai>' + (en ? "Skip intro" : "Salta l'introduzione") + '</button></div><div class="barra-p" aria-hidden="true"><i></i></div></div>';
  eroe.parentNode.insertBefore(sez, eroe);
  eroe.style.scrollMarginTop = "56px";
  sez.querySelectorAll("[data-vai]").forEach(function (b) { b.onclick = function () { eroe.scrollIntoView({ behavior: "smooth" }); }; });
  var caps = sez.querySelectorAll(".cap div"), barra = sez.querySelector(".barra-p i"), azioni = sez.querySelector(".azioni-intro");
  var cv = sez.querySelector("canvas"), ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = 1, H = 1, p = 0, visibile = true, raf = 0;
  function misura() { var r = cv.getBoundingClientRect(); W = cv.width = Math.max(1, Math.round(r.width * dpr)); H = cv.height = Math.max(1, Math.round(r.height * dpr)); }
  misura(); if ("ResizeObserver" in window) new ResizeObserver(misura).observe(cv);
  function cl(v, a, b) { return Math.min(b, Math.max(a, v)); } function ls(t) { return t * t * (3 - 2 * t); } function tra(a, b) { return ls(cl((p - a) / (b - a), 0, 1)); }
  function scorri() {
    var r = sez.getBoundingClientRect(), corsa = r.height - innerHeight; p = cl(corsa > 0 ? -r.top / corsa : 0, 0, 1);
    var R = [[0, .24], [.26, .5], [.52, .76], [.78, 1.01]];
    caps.forEach(function (c, i) { var o = Math.min(tra(R[i][0], R[i][0] + .04), 1 - tra(R[i][1] - .04, R[i][1])); if (i === 3) o = tra(.78, .82); c.style.opacity = o; c.style.transform = "translateY(" + (1 - o) * 24 + "px)"; });
    barra.style.height = (p * 100) + "%"; azioni.style.opacity = String(.4 + .6 * tra(.85, 1));
  }
  addEventListener("scroll", scorri, { passive: true }); scorri();
  if ("IntersectionObserver" in window) new IntersectionObserver(function (v) { visibile = v[0].isIntersecting; if (visibile && !raf) raf = requestAnimationFrame(disegna); }).observe(sez);

  // particelle che formano l'icona (4 quadrati) e le app intorno
  var N = 900, part = [];
  for (var i = 0; i < N; i++) { var a = Math.random() * 6.283, r = 0.6 + Math.random() * 1.6; part.push({ sx: Math.cos(a) * r, sy: Math.sin(a) * r * 0.7, tx: 0, ty: 0, f: Math.random() * 6.283, c: Math.random() < 0.7 }); }
  // bersaglio: contorno dei 4 quadrati arrotondati dell'icona OBO Hub (unità ±0.5)
  (function () { var Q = [[-0.47, -0.47], [0.07, -0.47], [-0.47, 0.07], [0.07, 0.07]], L = 0.4; for (var i = 0; i < N; i++) { var q = Q[i % 4], s = (i / 4 % 1 + Math.random()) % 1 * 4, lato = Math.floor(s), u = s - lato; var x = lato === 0 ? q[0] + u * L : lato === 1 ? q[0] + L : lato === 2 ? q[0] + L - u * L : q[0], y = lato === 0 ? q[1] : lato === 1 ? q[1] + u * L : lato === 2 ? q[1] + L : q[1] + L - u * L; part[i].tx = x; part[i].ty = y; } })();
  // app mostrate: quelle che l'utente vede davvero nella griglia di OBO Hub (icona e nome); senza accesso, app generiche
  var GENERICHE = en ? ["Design", "Calculation", "CAD", "Products", "Documents", "Projects"] : ["Progettazione", "Calcolo", "Disegno CAD", "Prodotti", "Documenti", "Progetti"];
  var APP = [], ultimaLettura = 0;
  function leggiApp() {
    var el = document.querySelectorAll("#griglia a.app"), out = [];
    el.forEach(function (a) {
      var n = a.querySelector("h3"), sv = a.querySelector(".simbolo svg"), img = null;
      if (sv) { try { var x = sv.outerHTML.replace(/currentColor/g, "#ffffff"); if (!/width=/.test(x)) x = x.replace("<svg", '<svg width="96" height="96"'); if (!/xmlns=/.test(x)) x = x.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'); img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(x); } catch (e) { img = null; } }
      if (n) out.push({ nome: n.textContent.trim(), img: img });
    });
    if (out.length >= 2) APP = out.slice(0, 8);
    else APP = GENERICHE.map(function (g) { return { nome: g, img: null }; });
  }
  leggiApp();
  function glifo(i, x, y, s) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * dpr; ctx.beginPath();
    if (i === 0) { ctx.moveTo(x + s * .1, y - s * .45); ctx.lineTo(x - s * .2, y + s * .05); ctx.lineTo(x + s * .05, y + s * .05); ctx.lineTo(x - s * .1, y + s * .45); ctx.lineTo(x + s * .22, y - s * .08); ctx.lineTo(x - s * .02, y - s * .08); ctx.closePath(); }
    else if (i === 1) { ctx.rect(x - s * .35, y - s * .3, s * .7, s * .6); ctx.moveTo(x - s * .35, y - s * .1); ctx.lineTo(x + s * .35, y - s * .1); }
    else if (i === 2) { ctx.moveTo(x - s * .35, y + s * .35); ctx.lineTo(x, y - s * .35); ctx.lineTo(x + s * .35, y + s * .35); ctx.moveTo(x - s * .4, y - s * .2); ctx.lineTo(x + s * .4, y - s * .05); }
    else if (i === 3) { ctx.arc(x, y, s * .32, 0, 6.283); ctx.moveTo(x + s * .14, y); ctx.arc(x, y, s * .14, 0, 6.283); }
    else if (i === 4) { ctx.rect(x - s * .3, y - s * .3, s * .6, s * .6); ctx.moveTo(x - s * .3, y - s * .05); ctx.lineTo(x + s * .3, y - s * .05); }
    else { ctx.moveTo(x - s * .38, y - s * .22); ctx.lineTo(x - s * .1, y - s * .22); ctx.lineTo(x - s * .02, y - s * .32 + s * .1); ctx.lineTo(x + s * .38, y - s * .12); ctx.lineTo(x + s * .38, y + s * .3); ctx.lineTo(x - s * .38, y + s * .3); ctx.closePath(); }
    ctx.stroke();
  }
  function disegna(ms) {
    raf = 0; var t = ms / 1000, U = Math.min(W, H) * 0.34, cx = W / 2, cy = H * 0.42;
    var zoom = 1 + Math.pow(tra(.8, 1), 2) * 9; U *= zoom; cy = cy + (H * 0.5 - cy) * tra(.8, 1);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .8); g.addColorStop(0, "#26323a"); g.addColorStop(1, "#0d1215"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // griglia prospettica
    ctx.strokeStyle = "rgba(118,148,164,.12)"; ctx.lineWidth = dpr; var oriz = H * .78;
    for (var gx = -10; gx <= 10; gx++) { ctx.beginPath(); ctx.moveTo(cx + gx * W * .02, oriz); ctx.lineTo(cx + gx * W * .2, H); ctx.stroke(); }
    for (var gy = 0; gy < 8; gy++) { var yy = oriz + Math.pow(gy / 8, 2) * (H - oriz) + ((t * 18 * dpr) % ((H - oriz) / 8)); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
    // 01 particelle → icona
    var forma = tra(.0, .14), apri = tra(.3, .5);
    for (var i = 0; i < N; i++) {
      var pp = part[i], wob = Math.sin(t * 1.5 + pp.f) * .02 * (1 - forma);
      var x = pp.sx + (pp.tx - pp.sx) * forma + wob, y = pp.sy + (pp.ty - pp.sy) * forma + Math.cos(t * 1.2 + pp.f) * .02 * (1 - forma);
      x *= 1 + apri * 0.8; y *= 1 + apri * 0.8;
      ctx.fillStyle = pp.c ? "rgba(243,155,0," + (0.55 + 0.45 * forma) * (1 - apri * .7) + ")" : "rgba(220,228,233," + (0.4 * (1 - apri)) + ")";
      ctx.fillRect(cx + x * U, cy + y * U, 1.6 * dpr, 1.6 * dpr);
    }
    // contorno pieno dell'icona quando le particelle l'hanno formata
    if (forma > .8 && apri < 1) { ctx.strokeStyle = "rgba(243,155,0," + ((forma - .8) * 5 * (1 - apri)) + ")"; ctx.lineWidth = 2.5 * dpr; ctx.shadowColor = "#f39b00"; ctx.shadowBlur = 18 * dpr;
      [[-0.47, -0.47], [0.07, -0.47], [-0.47, 0.07], [0.07, 0.07]].forEach(function (q) { var k2 = 1 + apri * .8; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx + q[0] * k2 * U, cy + q[1] * k2 * U, .4 * k2 * U, .4 * k2 * U, .06 * U); else ctx.rect(cx + q[0] * k2 * U, cy + q[1] * k2 * U, .4 * k2 * U, .4 * k2 * U); ctx.stroke(); }); ctx.shadowBlur = 0; }
    // 02 le app escono dall'icona e si dispongono in cerchio; 03 si collegano al progetto al centro
    var esci = tra(.28, .48), collega = tra(.52, .7);
    if (esci > 0) {
      var R = U * 1.15 * esci, s = U * .32;
      if (t - ultimaLettura > 1) { ultimaLettura = t; leggiApp(); }
      var NA = APP.length;
      for (var k = 0; k < NA; k++) {
        var ang = -Math.PI / 2 + k * (2 * Math.PI / NA) + t * .08 * (1 - collega), ax = cx + Math.cos(ang) * R, ay = cy + Math.sin(ang) * R * .82;
        if (collega > 0) { ctx.strokeStyle = "rgba(243,155,0," + (.6 * collega) + ")"; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(cx, cy); ctx.stroke();
          var e = (t * .7 + k / 6) % 1, px = ax + (cx - ax) * e, py = ay + (cy - ay) * e, gg = ctx.createRadialGradient(px, py, 0, px, py, 10 * dpr); gg.addColorStop(0, "rgba(255,214,140," + collega + ")"); gg.addColorStop(1, "rgba(243,155,0,0)"); ctx.fillStyle = gg; ctx.fillRect(px - 10 * dpr, py - 10 * dpr, 20 * dpr, 20 * dpr); }
        ctx.globalAlpha = esci; ctx.fillStyle = k === 0 ? "#f39b00" : "rgba(65,82,93,.95)"; ctx.strokeStyle = "rgba(243,155,0,.8)"; ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(ax - s / 2, ay - s / 2, s, s, s * .22); else ctx.rect(ax - s / 2, ay - s / 2, s, s); ctx.fill(); ctx.stroke();
        var ap = APP[k]; if (ap.img && ap.img.complete && ap.img.naturalWidth) ctx.drawImage(ap.img, ax - s * .3, ay - s * .3, s * .6, s * .6); else glifo(k % 6, ax, ay, s * .7);
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "600 " + Math.max(11 * dpr, s * .16) + "px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.fillText(ap.nome.length > 22 ? ap.nome.slice(0, 21) + "…" : ap.nome, ax, ay + s * .78); ctx.globalAlpha = 1;
      }
      if (collega > 0) { var cs = U * .42 * (0.6 + 0.4 * collega), pulse = 1 + Math.sin(t * 3) * .04; ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.shadowColor = "#f39b00"; ctx.shadowBlur = 30 * dpr * collega;
        ctx.fillStyle = "rgba(243,155,0," + collega + ")"; ctx.beginPath(); ctx.moveTo(-cs * .5, -cs * .3); ctx.lineTo(-cs * .12, -cs * .3); ctx.lineTo(-cs * .02, -cs * .18); ctx.lineTo(cs * .5, -cs * .18); ctx.lineTo(cs * .5, cs * .36); ctx.lineTo(-cs * .5, cs * .36); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "rgba(255,255,255," + collega + ")"; ctx.font = "700 " + Math.max(12 * dpr, cs * .16) + "px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.fillText(en ? "PROJECT" : "PROGETTO", cx, cy + cs * .14); }
    }
    // 04 lampo arancio finale
    var fine = tra(.9, 1); if (fine > 0) { ctx.fillStyle = "rgba(243,155,0," + (fine * .35) + ")"; ctx.fillRect(0, 0, W, H); }
    var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.5)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (visibile) raf = requestAnimationFrame(disegna);
  }
  raf = requestAnimationFrame(disegna);

  function rivedi() {
    var c = eroe.querySelector(".contenitore"); if (!c || c.querySelector(".rivedi-intro")) return;
    var a = document.createElement("a"); a.className = "rivedi-intro"; a.href = "?intro"; a.textContent = "▶ " + ((function () { try { return localStorage.getItem("obo-lingua") === "en"; } catch (e) { return false; } })() ? "Watch the intro again" : "Rivedi l'introduzione");
    a.style.cssText = "display:inline-block;margin-top:10px;color:#ffd27a;font-size:14px;font-weight:600;text-decoration:none";
    c.appendChild(a);
  }
})();
