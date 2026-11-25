/* Mappa carichi · importazione dell'export del CRM (Dynamics: "Closed Activities", file .xlsx) nella sezione Offerte.
   Colonne attese: (Do Not Modify) Activity, Actual End, Subject, Regarding, Activity Type, Activity Status, Owner.
   Le attività (email) vengono raggruppate per conversazione (oggetto senza RE:/I:/FW:…); per ognuna si ricavano
   persone (cognome del proprietario), giorno e mese dell'ultima attività, tipo (offerta / tecnico / dichiarazione),
   macro famiglia OBO dall'oggetto e dal progetto collegato, e stato (EVASE se c'è una risposta, altrimenti IN VALUTAZIONE).
   Il file viene letto nel browser: nessun dato esce se non verso il database della Mappa. */
(function (root) {
  'use strict';

  // ---------- lettura minima di un .xlsx (zip + XML) ----------
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function inflate(dati) {
    var ds = new DecompressionStream('deflate-raw');
    var s = new Blob([dati]).stream().pipeThrough(ds);
    return new Response(s).arrayBuffer().then(function (a) { return new Uint8Array(a); });
  }
  function voci(buf) {
    var b = new Uint8Array(buf), e = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Il file non è un Excel .xlsx valido.');
    var n = u16(b, e + 10), off = u32(b, e + 16), out = {};
    for (var k = 0; k < n; k++) {
      if (u32(b, off) !== 0x02014b50) break;
      var metodo = u16(b, off + 10), comp = u32(b, off + 20), ln = u16(b, off + 28), lx = u16(b, off + 30), lc = u16(b, off + 32), loc = u32(b, off + 42);
      var nome = new TextDecoder().decode(b.subarray(off + 46, off + 46 + ln));
      out[nome] = { metodo: metodo, comp: comp, loc: loc };
      off += 46 + ln + lx + lc;
    }
    return { b: b, voci: out };
  }
  function leggiVoce(z, nome) {
    var v = z.voci[nome]; if (!v) return Promise.resolve(null);
    var b = z.b, p = v.loc, dati = b.subarray(p + 30 + u16(b, p + 26) + u16(b, p + 28), p + 30 + u16(b, p + 26) + u16(b, p + 28) + v.comp);
    return (v.metodo === 0 ? Promise.resolve(dati) : inflate(dati)).then(function (x) { return new TextDecoder().decode(x); });
  }
  function colIdx(ref) { var m = /^([A-Z]+)/.exec(ref), n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return n - 1; }
  function testo(x) { return x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); }).replace(/&amp;/g, '&'); }
  /** Righe del primo foglio (o di quello indicato) come array di array di stringhe. */
  function leggiXlsx(buf, foglio) {
    var z = voci(buf);
    return Promise.all([leggiVoce(z, 'xl/sharedStrings.xml'), leggiVoce(z, 'xl/workbook.xml'), leggiVoce(z, 'xl/_rels/workbook.xml.rels')]).then(function (r) {
      var ss = [];
      if (r[0]) r[0].replace(/<si>([\s\S]*?)<\/si>/g, function (_, si) { var t = ''; si.replace(/<t[^>]*>([\s\S]*?)<\/t>/g, function (__, x) { t += x; }); ss.push(testo(t)); });
      // foglio: per nome, altrimenti il primo
      var target = 'xl/worksheets/sheet1.xml';
      if (r[1] && r[2]) {
        var fogli = []; r[1].replace(/<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g, function (_, n, id) { fogli.push([testo(n), id]); });
        var scelto = fogli.filter(function (f) { return foglio ? f[0] === foglio : true; })[0] || fogli[0];
        if (scelto) { var m = new RegExp('Id="' + scelto[1] + '"[^>]*Target="([^"]*)"').exec(r[2]) || new RegExp('Target="([^"]*)"[^>]*Id="' + scelto[1] + '"').exec(r[2]); if (m) target = 'xl/' + m[1].replace(/^\/?xl\//, ''); }
      }
      return leggiVoce(z, target).then(function (xml) {
        if (!xml) throw new Error('Foglio non trovato nel file.');
        var righe = [];
        xml.replace(/<row[^>]*>([\s\S]*?)<\/row>/g, function (_, row) {
          var r2 = [];
          row.replace(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, function (__, attr, corpo) {
            var ref = /r="([A-Z]+\d+)"/.exec(attr), t = /t="([^"]*)"/.exec(attr), v = corpo ? /<v>([\s\S]*?)<\/v>/.exec(corpo) : null, is = corpo ? /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(corpo) : null;
            var val = is ? testo(is[1]) : v ? (t && t[1] === 's' ? ss[+v[1]] : testo(v[1])) : '';
            if (ref) r2[colIdx(ref[1])] = val; else r2.push(val);
          });
          for (var i = 0; i < r2.length; i++) if (r2[i] === undefined) r2[i] = '';
          righe.push(r2);
        });
        return righe;
      });
    });
  }

  // ---------- classificazione ----------
  var FAMIGLIE = [
    ['Dichiarazione di origine e codice doganale', /origine|dogan|hs code|tariff/],
    ['Minerali di conflitto (CMRT)', /cmrt|minerali/],
    ['REACH, RoHS e POP', /reach|rohs|\bpop\b|svhc/],
    ['EPD, PEP e CAM (sostenibilità)', /\bepd\b|\bpep\b|\bcam\b|sostenibil|carbon/],
    ['Documentazione ferroviaria (EN 45545)', /45545|ferrovi/],
    ['Certificati CE e dichiarazioni di conformità', /conformit|certificat|\bce\b|dop\b|marcatura/],
    ['Sistemi di distribuzione a pavimento (torrette)', /torrett|pavimento|scrivania|\bugd\b|\buds\b|pozzett|sottopavim/],
    ['Protezione antincendio', /antincend|pyro|fsb|firestop|ignifug|\be ?30\b|\be ?60\b|\be ?90\b|tenuta al fuoco|sigill|resistenza al fuoco|fuoco/],
    ['Protezione da sovratensioni (scaricatori)', /\bspd\b|scaricator|sovratension|limitator|\bv ?20\b|\bv ?50\b|\bv ?10\b|\bmcf\b|surge/],
    ['Protezione contro i fulmini e messa a terra (LPS)', /\blps\b|parafulmin|fulmin|captaz|messa a terra|impianto di terra|dispers|isfang|iscon|\basta\b|calat|equipotenz|fangfix/],
    ['Fotovoltaico (strutture e supporti FV)', /fotovolt|\bftv\b|\bfv\b|\bpv\b|\bkw\b|lamiera grecata|\bwrr\b|zavorr|pannell/],
    ['Sistemi portacavi (passerelle, scalette, canali a filo)', /passerel|scalett|\bfilo\b|grip|magic|\brks\b|\bmks\b|portacav/],
    ['Sistemi di canali (canali e canaline)', /canal|\bplm\b|\blkm\b|\bbsk\b|battiscopa/],
    ['Sistemi di fissaggio e montaggio (staffe, profili, collari)', /staff|profil|collar|fissagg|mensol|tassell|aisi|manine|montaggio/],
    ['Pressacavi, tubi e raccordi', /pressacav|\btub[oi]\b|raccord|guaina/],
    ['Cassette e scatole di derivazione', /cassett|scatol|derivaz/],
  ];
  var ND = "Non determinabile dall'oggetto";
  // temi del «Report attività CRM» (come nel file di Marco)
  var TEMI = [
    ['Origine, doganali, certificati', /origine|dogan|certificat|conformit|dichiarazion|reach|rohs|cmrt|\bepd\b/],
    ['Moduli di contatto web', /modulo di contatto|contact form|kontaktformular/],
    ['Torrette / UFS', /torrett|\bufs\b|\bugd\b|pavimento|scrivania/],
    ['Antincendio, REI, Pyroline', /antincend|\brei\b|pyro|fsb|firestop|fuoco|ignifug/],
    ['SPD e scaricatori', /\bspd\b|scaricator|sovratension|limitator|surge/],
    ['Terra, LPS, parafulmini', /\blps\b|parafulmin|fulmin|messa a terra|impianto di terra|dispers|captaz|isfang|iscon|\bterra\b/],
    ['Fotovoltaico e strutture', /fotovolt|\bftv\b|\bfv\b|\bpv\b|\bkw\b|struttur|zavorr|\bwrr\b|lamiera/],
    ['Canali e passerelle', /canal|passerel|scalett|portacav|\bfilo\b|\bplm\b|\blkm\b|\brks\b|\bmks\b/],
  ];
  function tema(s) { s = String(s || '').toLowerCase(); for (var i = 0; i < TEMI.length; i++) if (TEMI[i][1].test(s)) return TEMI[i][0]; return 'Oggetto generico'; }
  function tipoAttivita(sub, tipoCrm) { if (/task/i.test(tipoCrm || '')) return 'Task'; if (/^\s*(re|r|aw|antw|sv|risposta)\s*[:：]/i.test(sub)) return 'Risposta'; if (/^\s*(fw|fwd|i|wg|tr|inoltro)\s*[:：]/i.test(sub)) return 'Inoltro'; return 'Nuova'; }
  function famiglia(s) { s = s.toLowerCase(); for (var i = 0; i < FAMIGLIE.length; i++) if (FAMIGLIE[i][1].test(s)) return FAMIGLIE[i][0]; return ND; }
  function tipo(s) {
    s = s.toLowerCase(); var t = [];
    if (/offert|quotaz|\brdo\b|\brda\b|\brfq\b|preventiv|prezz|listino|trascodific|disponibilit|fornitura|ordine|gara|capitolat/.test(s)) t.push('offerta');
    if (/dichiarazion|origine|dogan|certificat|conformit|reach|rohs|cmrt|\bepd\b|minerali|45545|scheda di sicurezza|\bdop\b/.test(s)) t.push('dichiarazione');
    if (!t.length || /chiariment|informazion|\binfo\b|tecnic|scheda tecnic|modulo di contatto|assistenza|domanda|verifica|calcolo|dimensionament/.test(s)) if (t.indexOf('dichiarazione') < 0) t.unshift('tecnico');
    var ord = ['offerta', 'tecnico', 'dichiarazione']; return ord.filter(function (x) { return t.indexOf(x) >= 0; }).join('+');
  }
  var PREF = /^\s*((re|r|fw|fwd|i|wg|aw|tr|rif|inoltro|risposta)\s*[:：]\s*)+/i;
  function pulisci(s) { return String(s || '').replace(PREF, '').replace(/\s+/g, ' ').trim(); }
  function cognome(owner) { var o = String(owner || '').trim(); if (!o) return ''; var c = o.indexOf(',') >= 0 ? o.split(',')[0] : o.split(' ').slice(-1)[0]; c = c.trim(); return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase(); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  /** Righe dell'export → conversazioni da importare. */
  function conversazioni(righe) {
    var h = (righe[0] || []).map(function (x) { return String(x).trim().toLowerCase(); });
    var I = function (nome) { for (var i = 0; i < h.length; i++) if (h[i] === nome || h[i].indexOf(nome) >= 0) return i; return -1; };
    var cId = I('(do not modify) activity'), cEnd = I('actual end'), cSub = I('subject'), cReg = I('regarding'), cTipo = I('activity type'), cStato = I('activity status'), cOwn = I('owner');
    if (cSub < 0 || cOwn < 0 || cEnd < 0) throw new Error("Il file non è l'export «Closed Activities» del CRM: mancano le colonne Subject, Owner o Actual End.");
    var g = {}, attivita = 0, saltate = 0, elenco = [];
    for (var r = 1; r < righe.length; r++) {
      var x = righe[r]; if (!x || !x.length) continue;
      var sub = String(x[cSub] || ''), ogg = pulisci(sub);
      if (cStato >= 0 && x[cStato] && /cancel/i.test(x[cStato])) { saltate++; continue; }
      // ogni attività (anche senza oggetto) va nel report attività CRM
      var fineA = String(x[cEnd] || ''); if (/^\d+(\.\d+)?$/.test(fineA)) { var dA = new Date(Date.UTC(1899, 11, 30) + parseFloat(fineA) * 864e5); fineA = dA.toISOString().slice(0, 19).replace('T', ' '); }
      if (cId >= 0 && x[cId] && /^\d{4}-\d{2}-\d{2}/.test(fineA)) elenco.push({ id: String(x[cId]).slice(0, 60), quando: fineA.slice(0, 19), owner: String(x[cOwn] || '').slice(0, 120), persona: cognome(x[cOwn]), oggetto: sub.slice(0, 500), tipo: tipoAttivita(sub, cTipo >= 0 ? x[cTipo] : ''), tema: tema(sub + ' ' + (cReg >= 0 ? x[cReg] || '' : '')), pratica: (ogg || sub).toLowerCase().slice(0, 300), regarding: cReg >= 0 ? String(x[cReg] || '').slice(0, 300) : '' });
      if (!ogg) { saltate++; continue; }
      var fine = String(x[cEnd] || ''); if (/^\d+(\.\d+)?$/.test(fine)) { var d0 = new Date(Date.UTC(1899, 11, 30) + parseFloat(fine) * 864e5); fine = d0.toISOString().slice(0, 19).replace('T', ' '); }
      var giorno = /^\d{4}-\d{2}-\d{2}/.test(fine) ? fine.slice(0, 10) : null;
      var chiave = ogg.toLowerCase(), c = g[chiave];
      if (!c) c = g[chiave] = { crm_id: 'crm-' + hash(chiave), oggetto: ogg, persone: [], giorno: giorno, primo: giorno, risposta: false, regarding: '', n: 0, ids: [] };
      attivita++; c.n++;
      var p = cognome(x[cOwn]); if (p && c.persone.indexOf(p) < 0) c.persone.push(p);
      if (giorno && (!c.giorno || giorno > c.giorno)) c.giorno = giorno;
      if (giorno && (!c.primo || giorno < c.primo)) c.primo = giorno;
      if (/^\s*(re|r|risposta)\s*[:：]/i.test(sub)) c.risposta = true;
      if (cReg >= 0 && x[cReg] && !c.regarding) c.regarding = String(x[cReg]);
      if (cId >= 0 && x[cId]) c.ids.push(String(x[cId]));
      if (cTipo >= 0 && /task/i.test(x[cTipo] || '')) c.task = true;
    }
    var out = Object.keys(g).map(function (k) {
      var c = g[k], base = c.oggetto + ' ' + c.regarding;
      return { crm_id: c.crm_id, oggetto: c.oggetto.slice(0, 500), stato: c.risposta ? 'EVASE' : 'IN VALUTAZIONE', famiglia: famiglia(base), persone: c.persone, mese: c.giorno ? c.giorno.slice(0, 7) : null, giorno: c.giorno, tipo: tipo(base), regarding: c.regarding.slice(0, 300), attivita: c.n };
    });
    return { righe: out, attivita: attivita, saltate: saltate, elenco: elenco };
  }

  var api = { leggiXlsx: leggiXlsx, conversazioni: conversazioni, famiglia: famiglia, tipo: tipo, tema: tema, tipoAttivita: tipoAttivita, pulisci: pulisci, cognome: cognome };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CrmImport = api;
})(this);
