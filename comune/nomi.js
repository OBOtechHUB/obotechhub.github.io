/* Nomi delle persone in tutte le app di OBO Hub: COGNOME tutto maiuscolo, Nome con solo l'iniziale maiuscola
 * (es. "marco lo vetere" → "Marco LO VETERE"). Cambia solo come il nome si vede: i dati salvati restano com'erano.
 * Il cognome si riconosce: 1) dall'email nome@obo.it nella forma cognome.nome@…; 2) dalle parole già scritte
 * tutte maiuscole; 3) altrimenti la prima parola è il nome e il resto il cognome.
 * Stessa regola in Progettazione LPS (src/lib/nomi.ts). Uso: oboNome("Marco Lo Vetere", "lovetere.marco@obo.it") */
(function (g) {
  function base(w) { return w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""); }
  function cap(w) { return w.toLocaleLowerCase("it-IT").replace(/(^|[-'’])([^-'’])/g, function (m, a, b) { return a + b.toLocaleUpperCase("it-IT"); }); }
  function up(w) { return w.toLocaleUpperCase("it-IT"); }
  function maiuscola(w) { return w.length > 1 && /\p{L}/u.test(w) && w === up(w) && w !== w.toLocaleLowerCase("it-IT"); }
  var TITOLO = /^(ing|arch|geom|dott|dott\.?ssa|dr|p\.?\s?i|per\.?\s?ind|avv|prof|sig|sig\.?ra|ing\.?\s?jr)\.?$/i;
  function oboNome(s, email) {
    var t = String(s == null ? "" : s).trim().replace(/\s+/g, " ");
    if (!t || t.indexOf("@") >= 0) return t;
    // titoli davanti al nome (Ing., Arch., Geom., Dott., P.I.…) restano come sono scritti
    var tt = t.split(" "), ti = 0; while (ti < tt.length - 1 && TITOLO.test(tt[ti])) ti++;
    if (ti) return tt.slice(0, ti).join(" ") + " " + oboNome(tt.slice(ti).join(" "), email);
    var p = t.split(" "), n = p.length, cog = null, i, k;
    if (n === 1) return cap(p[0]);
    var em = String(email || "").split("@")[0];
    if (em.indexOf(".") > 0) {
      var c = base(em.split(".")[0]);
      for (k = 1; k < n && !cog; k++) if (base(p.slice(k).join("")) === c) cog = { da: k, a: n };
      for (k = n - 1; k >= 1 && !cog; k--) if (base(p.slice(0, k).join("")) === c) cog = { da: 0, a: k };
    }
    if (!cog) {
      var mm = p.map(maiuscola), quante = mm.filter(Boolean).length;
      if (quante > 0 && quante < n) {
        // parole maiuscole contigue all'inizio o alla fine
        for (k = 0; k < n && mm[k]; k++); if (k > 0 && mm.slice(k).every(function (x) { return !x; })) cog = { da: 0, a: k };
        for (k = n; k > 0 && mm[k - 1]; k--); if (!cog && k < n && mm.slice(0, k).every(function (x) { return !x; })) cog = { da: k, a: n };
      }
    }
    if (!cog) cog = { da: 1, a: n };
    var out = [];
    for (i = 0; i < n; i++) out.push(i >= cog.da && i < cog.a ? up(p[i]) : cap(p[i]));
    return out.join(" ");
  }
  /** Solo il nome proprio (per i saluti): le parole che non sono cognome, con l'iniziale maiuscola. */
  function oboSoloNome(s, email) {
    var f = oboNome(s, email); if (!f || f.indexOf("@") >= 0) return f;
    var p = f.split(" "), r = p.filter(function (w) { return !maiuscola(w) || w.length === 1; });
    return (r.length ? r : p.slice(0, 1).map(cap)).join(" ");
  }
  g.oboNome = oboNome; g.oboSoloNome = oboSoloNome;
})(typeof window !== "undefined" ? window : globalThis);
