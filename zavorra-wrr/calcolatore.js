// Interfaccia del calcolatore. Uso:
//   import { mountZavorra } from './zavorra/app.js';
//   const app = mountZavorra(document.getElementById('app'), { supabase }); // supabase facoltativo
//   app.destroy();
import {
  COLS, SPEEDS, PRESS, FRAMES, TABNO, ANOM, MODE_LABELS, fmt,
  defaultState, compute, windTable, frameFit, emailText,
} from './calc.js';
import { createStorage } from './storage.js';
import { documento, paginaHTML, docxBlob } from './relazione.js';

const SOURCE_URL = 'https://www.obo-bettermann.com/out/media/01-100_MA_Magic_PV_Mount_Wechselrichterrahmen_EN_2026-07-28.pdf';
const LS_KEY = 'wrr-zavorra-v3';
/** telai a 45°: in arrivo, non ancora a catalogo; mettere true quando escono */
const PITCH_45_DISPONIBILE = false;
const CHECKS = [
  'Carico neve (zona, quota, accumuli contro la tettoia)',
  'Velocità del vento di progetto ricavata per il sito (zona, quota, categoria di esposizione, altezza edificio)',
  'Portata della copertura per peso telaio + apparecchiature + zavorra',
  'Scorrimento sulla copertura (attrito zavorra/guaina, eventuali tappetini)',
  'Portata del telaio per il peso delle apparecchiature (chiedere a OBO)',
  'Altezza utile sotto la tettoia e spazi di ventilazione richiesti dal costruttore dell\'inverter',
  'Significato di "roof pitch 30°/45°" confermato con l\'ufficio tecnico OBO',
];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mountZavorra(root, { supabase = null, title = 'Zavorra telai inverter WRR' } = {}) {
  const u = 'zw' + Math.random().toString(36).slice(2, 7);
  const q = (n) => root.querySelector(`#${u}-${n}`);
  const storage = createStorage(supabase);
  const cleanups = [];

  let state = defaultState();
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (s && Array.isArray(s.devs)) state = { ...state, ...s };
  } catch { /* storage non disponibile */ }
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignora */ } };

  root.classList.add('zwrr');
  root.innerHTML = `
<div class="wrap">
  <header>
    <h1>${esc(title)}</h1>
    <p>Calcolo della zavorra per i telai autoportanti OBO Magic PV Mount WRR F e WRR D (i telai a parete WRR W non si zavorrano: spinta del vento per i tasselli), secondo il metodo del cap. 11 delle istruzioni di montaggio (07/2026).</p>
  </header>
  <div class="grid">
    <div class="col">
      <section class="panel">
        <h2>1 · Telaio e sito</h2>
        <div class="row">
          <label class="f" for="${u}-frame">Telaio
            <select id="${u}-frame">
              ${Object.entries(FRAMES).map(([k, f]) => `<option value="${k}">${f.name} · ${f.code} · ${f.wall ? 'a parete' : f.double ? 'bifacciale' : 'monofacciale'}</option>`).join('')}
            </select>
          </label>
          <div class="f" style="display:grid;gap:4px">
            <span class="hint" style="font-weight:500">Inclinazione (tabella OBO)</span>
            <div class="seg" role="group" aria-label="Inclinazione">
              <button type="button" id="${u}-p30" data-pitch="30">30°</button>
              <button type="button" id="${u}-p45" data-pitch="45" disabled title="Telai a 45° in arrivo: non ancora disponibili come prodotti">45° · in arrivo</button>
            </div>
          </div>
        </div>
        <div class="fit" id="${u}-fit" role="status" hidden></div>
        <label class="f" for="${u}-wind">Velocità vento di progetto (km/h)
          <input type="number" id="${u}-wind" min="0" max="250" step="1" style="max-width:200px">
        </label>
        <p class="hint">La velocità del vento va presa dal progetto dell'impianto (zona, quota, esposizione, altezza). Le tabelle OBO coprono 80–170 km/h.</p>
        <details class="adv">
          <summary>Opzioni di calcolo <span class="hint">· facoltative, il default segue il manuale OBO</span></summary>
          <div class="adv-body">
            <label class="f" for="${u}-mode">Metodo di calcolo
              <select id="${u}-mode">
                <option value="prudent">Prudente</option>
                <option value="obo">Metodo OBO</option>
                <option value="interp">Intermedio</option>
              </select>
            </label>
            <ul class="hint" style="margin:0;padding-left:18px;display:grid;gap:2px">
              <li><strong>Prudente:</strong> colonna area superiore e riga vento superiore.</li>
              <li><strong>Metodo OBO:</strong> colonna area più vicina, come da manuale; riga vento superiore.</li>
              <li><strong>Intermedio:</strong> valore proporzionale tra le colonne e tra le righe.</li>
            </ul>
            <p class="hint" id="${u}-areaHint"></p>
          </div>
        </details>
      </section>

      <section class="panel">
        <h2>2 · Apparecchiature sul telaio</h2>
        <div class="dev-table">
          <table>
            <thead><tr>
              <th style="width:30%">Descrizione</th><th data-side>Lato</th><th>Largh. mm</th><th>Alt. mm</th><th>Peso kg</th><th>Q.tà</th><th>Area cm²</th><th><span class="sr">Rimuovi</span></th>
            </tr></thead>
            <tbody id="${u}-devs"></tbody>
          </table>
        </div>
        <div class="tools">
          <button type="button" class="btn" id="${u}-addInv">+ Inverter</button>
          <button type="button" class="btn" id="${u}-addDev">+ Altra apparecchiatura</button>
        </div>
        <p class="hint">Per ogni apparecchiatura bastano larghezza, altezza e peso dalla scheda tecnica; la descrizione è facoltativa. Inserisci tutto ciò che viene fissato al telaio (inverter, quadri di stringa, quadri AC). Per più apparecchi sullo stesso lato le aree si sommano.</p>
      </section>

      <section class="panel">
        <h2>Promemoria · da verificare a parte</h2>
        <p class="hint">Solo un promemoria: queste voci non entrano nel calcolo. Le tabelle OBO considerano solo vento, area frontale e peso.</p>
        <ul class="check">${CHECKS.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </section>
    </div>

    <div class="col">
      <section class="panel" aria-live="polite">
        <h2>3 · Risultato</h2>
        <div class="banner" id="${u}-banner" hidden></div>
        <div class="result" id="${u}-resBox">
          <span class="lbl" id="${u}-resLbl">Zavorra totale</span>
          <span class="big" id="${u}-resBig">–</span>
          <span class="sub" id="${u}-resSub"></span>
        </div>
        <dl class="steps" id="${u}-steps"></dl>
        <ul class="alerts" id="${u}-alerts"></ul>
      </section>

      <section class="panel">
        <h2>4 · Tabella per tutte le velocità del vento</h2>
        <p class="callout" id="${u}-windHint"></p>
        <div class="wind-table">
          <table>
            <thead><tr><th>Vento km/h</th><th>Pressione kN/m²</th><th>Valore tabella kg</th><th>Zavorra kg</th><th data-side>Per lato kg</th></tr></thead>
            <tbody id="${u}-wind-body"></tbody>
          </table>
        </div>
        <div class="tools">
          <button type="button" class="btn primary" id="${u}-copy">Copia tabella per email</button>
          <span class="hint" id="${u}-copyMsg" role="status"></span>
        </div>
        <textarea class="copy" id="${u}-copyFallback" hidden></textarea>
      </section>

      <section class="panel">
        <h2>Relazione per il cliente</h2>
        <p class="hint">Documento OBO con dati, metodo, risultato, tabella per tutte le velocità e verifiche a cura del progettista: da stampare, salvare in PDF o scaricare in Word da mandare al cliente.</p>
        <div class="row">
          <label class="f" for="${u}-rCliente">Cliente<input id="${u}-rCliente" maxlength="120" placeholder="Ragione sociale"></label>
          <label class="f" for="${u}-rRif">Impianto / riferimento<input id="${u}-rRif" maxlength="160" placeholder="Es. FV 200 kWp copertura capannone"></label>
        </div>
        <div class="row">
          <label class="f" for="${u}-rLuogo">Luogo<input id="${u}-rLuogo" maxlength="120" placeholder="Comune (provincia)"></label>
          <label class="f" for="${u}-rCodice">Numero progetto / offerta<input id="${u}-rCodice" maxlength="100"></label>
        </div>
        <label class="f" for="${u}-rNote">Note aggiuntive (facoltative)<textarea id="${u}-rNote" rows="2" maxlength="800" style="width:100%;font:inherit"></textarea></label>
        <div class="tools">
          <button type="button" class="btn primary" id="${u}-rApri">Apri relazione (stampa o PDF)</button>
          <button type="button" class="btn" id="${u}-rWord">Scarica Word</button>
          <span class="hint" id="${u}-rMsg" role="status"></span>
        </div>
      </section>

      ${storage ? `
      <section class="panel" id="${u}-progettoBox">
        <h2>5 · Progetto (salvataggio automatico)</h2>
        <div id="${u}-login" hidden>
          <p class="hint" style="margin-bottom:8px">Entra in OBO Hub con il tuo account per salvare i calcoli nei progetti e ritrovarli su qualsiasi dispositivo.</p>
          <p><a class="btn primary" href="../">Vai a OBO Hub</a></p>
        </div>
        <div id="${u}-arch" hidden style="display:grid;gap:12px">
          <p class="callout" id="${u}-aperto"></p>
          <form class="row" id="${u}-saveForm" onsubmit="return false">
            <label class="f" for="${u}-codice">Numero progetto CRM<input id="${u}-codice" maxlength="100" placeholder="Es. P-2026-0142"></label>
            <label class="f" for="${u}-progetto">Nome / riferimento<input id="${u}-progetto" maxlength="160"></label>
            <label class="f" for="${u}-cliente">Cliente<input id="${u}-cliente" maxlength="120"></label>
            <label class="f" for="${u}-lps">Progetto (unico per tutte le app)<select id="${u}-lps"><option value="">— nessuno —</option></select></label>
          </form>
          <div class="tools">
            <button type="button" class="btn primary" id="${u}-save">Salva nel progetto</button>
            <button type="button" class="btn" id="${u}-nuovo">Nuovo calcolo</button>
            <span class="hint" id="${u}-saveMsg" role="status"></span>
            <a class="btn" href="../progetti.html" id="${u}-vaiProgetti">Tutti i progetti</a>
            <span class="hint" style="margin-left:auto"><span id="${u}-who"></span></span>
          </div>
          <label class="f" for="${u}-cerca" style="max-width:340px">Cerca nei calcoli<input id="${u}-cerca" type="search" placeholder="codice, nome, cliente, telaio"></label>
          <div class="arch-table">
            <table>
              <thead><tr><th class="l">Aggiornato</th><th class="l">Progetto</th><th class="l">Telaio</th><th>Vento</th><th>Zavorra</th><th><span class="sr">Azioni</span></th></tr></thead>
              <tbody id="${u}-archBody"></tbody>
            </table>
          </div>
        </div>
      </section>` : ''}
    </div>
  </div>
  <p class="foot">Fonte: <a href="${SOURCE_URL}" target="_blank" rel="noopener">OBO Magic PV Mount, istruzioni di montaggio telaio inverter (EN, 28/07/2026)</a>, cap. 11, tab. 5–8. Formula: zavorra = valore tabella − peso totale apparecchiature; telaio bifacciale: diviso 2 per lato. I valori tra parentesi nelle tabelle OBO non sono spiegati dal manuale: qui sono segnalati con * come da verificare con calcolo strutturale specifico. Strumento di supporto alla prevendita: non sostituisce la progettazione con OBO Construct o di un tecnico abilitato.</p>
</div>`;

  // ---------- apparecchiature ----------
  function renderDevs() {
    const fr = FRAMES[state.frame];
    root.querySelectorAll('[data-side]').forEach((e) => (e.hidden = !fr.double));
    const inc = q('p30')?.closest('.f'); if (inc) inc.hidden = !!fr.wall; // a parete l'inclinazione non conta
    const body = q('devs');
    body.innerHTML = '';
    state.devs.forEach((d, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input aria-label="Descrizione" placeholder="es. Inverter" data-k="d" value="${esc(d.d)}"></td>
        <td ${fr.double ? '' : 'hidden'}><select aria-label="Lato" data-k="side"><option value="A">A</option><option value="B">B</option></select></td>
        <td><input type="number" aria-label="Larghezza mm" min="0" step="1" data-k="w" value="${d.w}"></td>
        <td><input type="number" aria-label="Altezza mm" min="0" step="1" data-k="h" value="${d.h}"></td>
        <td><input type="number" aria-label="Peso kg" min="0" step="0.1" data-k="kg" value="${d.kg}"></td>
        <td><input type="number" aria-label="Quantità" min="0" step="1" data-k="q" value="${d.q}" style="max-width:64px"></td>
        <td class="num" data-area></td>
        <td><button type="button" class="icon-btn" aria-label="Rimuovi riga">×</button></td>`;
      body.appendChild(tr);
      tr.querySelector('select').value = d.side || 'A';
      tr.querySelectorAll('[data-k]').forEach((el) => {
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
          const k = el.dataset.k;
          state.devs[i][k] = k === 'd' || k === 'side' ? el.value : parseFloat(el.value) || 0;
          update();
        });
      });
      tr.querySelector('.icon-btn').addEventListener('click', () => { state.devs.splice(i, 1); renderDevs(); update(); });
    });
  }

  function setFrame(k) { state.frame = k; q('frame').value = k; renderDevs(); update(); }

  // ---------- controllo telaio (step 1) ----------
  function renderFit(r) {
    const box = q('fit');
    const f = frameFit(r);
    if (!f) { box.hidden = true; return; }
    box.hidden = false;
    box.className = 'fit ' + f.level;
    box.innerHTML = f.msgs.map((m) => `<p>${m.startsWith('✓') || m.startsWith('✕') || m.startsWith('!') ? `<strong>${esc(m.split(':')[0])}:</strong>${esc(m.slice(m.indexOf(':') + 1))}` : esc(m)}</p>`).join('')
      + `<p class="hint">${esc(f.note)}</p>`
      + (f.switchTo ? `<button type="button" class="btn${f.level === 'ok' ? '' : ' primary'}">Passa a ${FRAMES[f.switchTo].name}</button>` : '');
    if (f.switchTo) box.querySelector('button').onclick = () => setFrame(f.switchTo);
  }

  // ---------- aggiornamento ----------
  let last = null;
  let autoSalva = () => {};
  function update() {
    save();
    autoSalva();
    const fr = FRAMES[state.frame];
    root.querySelectorAll('[data-area]').forEach((el, i) => { const d = state.devs[i]; el.textContent = fmt(d.w * d.h / 100 * d.q); });
    const r = compute(state);
    last = r;
    renderFit(r);

    const steps = q('steps');
    steps.innerHTML = '';
    const add = (k, v) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; steps.append(dt, dd); };
    add('Telaio', `${fr.name} (${fr.code}), largh. ${fmt(fr.w)} mm, ${fr.wall ? 'a parete' : fr.double ? 'bifacciale' : 'monofacciale'}`);
    if (!fr.wall) add('Tabella OBO', `Tab. ${TABNO[r.tab]} · telaio ${fmt(fr.w)} mm · ${state.pitch}° · ${MODE_LABELS[state.calcMode]}`);
    add('Area frontale', fr.double ? `lato A ${fmt(r.sideArea.A)} cm² · lato B ${fmt(r.sideArea.B)} cm² → usata ${fmt(r.area)} cm²` : `${fmt(r.area)} cm²`);
    add('Peso apparecchiature', `${fmt(r.weight, 1)} kg`);

    const alerts = [];
    q('resBox').classList.toggle('bad', !!r.err && r.errCode !== 'empty' && !r.wall);
    const bn = q('banner');
    bn.hidden = true;
    if (r.errCode === 'width' || r.errCode === 'area') {
      bn.hidden = false;
      bn.textContent = r.errCode === 'width'
        ? (r.suggest ? `Telaio non conforme: usa il ${FRAMES[r.suggest].name} (${FRAMES[r.suggest].code}), vedi step 1.` : 'Nessun telaio WRR adatto alla larghezza dell\'apparecchiatura: contatta l\'ufficio tecnico OBO.')
        : `Non calcolabile con le tabelle OBO: area frontale ${fmt(r.area)} cm² oltre il massimo (11.500 cm²).`;
    }
    if (r.wall) {
      add('Pressione del vento', `${fmt(r.q, 2)} kN/m² a ${fmt(state.wind)} km/h`);
      add('Spinta sulle apparecchiature', `${fmt(r.q, 2)} × ${fmt(r.area / 10000, 2)} m² = ${fmt(r.force, 2)} kN (≈ ${fmt(r.force * 102)} kg)`);
      q('resLbl').textContent = 'Telaio a parete';
      q('resBig').innerHTML = '0 <small>kg di zavorra</small>';
      q('resSub').textContent = 'si fissa alla parete con tasselli adatti al supporto';
      alerts.push(['warn', `Spinta indicativa del vento ${fmt(r.force, 2)} kN più il peso (telaio + ${fmt(r.weight, 1)} kg di apparecchiature): scegli tasselli e verifica la parete con il costruttore del fissaggio. Le istruzioni OBO non danno tabelle di zavorra per i telai a parete.`]);
    } else if (r.err) {
      q('resBig').textContent = r.errCode === 'width' ? 'Telaio non idoneo' : r.errCode === 'empty' ? '–' : 'Non calcolabile';
      q('resSub').textContent = '';
      q('resLbl').textContent = 'Zavorra totale';
      if (r.errCode === 'empty' || r.errCode === 'wind') alerts.push(['crit', r.err]);
    } else {
      const colTxt = r.cp.kind === 'single' ? `colonna ${fmt(COLS[r.cp.i])} cm²` : `interpolata tra ${fmt(COLS[r.cp.lo])} e ${fmt(COLS[r.cp.hi])} cm²`;
      const rowTxt = r.rp.kind === 'single' ? `riga ${SPEEDS[r.rp.i]} km/h` : `interpolata tra ${SPEEDS[r.rp.lo]} e ${SPEEDS[r.rp.hi]} km/h`;
      add('Valore tabella', `${fmt(r.table, 1)} kg (${colTxt}, ${rowTxt})${r.paren ? ' *' : ''}`);
      add('Calcolo', `${fmt(r.table, 1)} − ${fmt(r.weight, 1)} = ${fmt(r.raw, 1)} kg${r.raw < 0 ? ' → 0' : ''}${fr.double ? ` ÷ 2 = ${fmt(r.perSide, 1)} kg/lato` : ''}`);
      q('resLbl').textContent = `Zavorra totale a ${fmt(state.wind)} km/h`;
      q('resBig').innerHTML = `${fmt(Math.ceil(r.total))} <small>kg${r.paren ? ' *' : ''}</small>`;
      q('resSub').textContent = fr.double ? `${fmt(Math.ceil(r.perSide))} kg per lato, distribuiti in modo uniforme` : 'su un unico telaio monofacciale';
      if (r.paren) alerts.push(['warn', '* Valore tra parentesi nella tabella OBO: da verificare mediante calcolo strutturale specifico.']);
      if (r.raw < 0) alerts.push(['info', 'Il peso delle apparecchiature supera il valore di tabella: zavorra aggiuntiva non necessaria secondo il metodo OBO.']);
      if (r.cp.note) alerts.push(['info', r.cp.note]);
      if (r.rp.note) alerts.push(['info', r.rp.note]);
      if (r.areaMode === 'closest' && r.cp.kind === 'single' && COLS[r.cp.i] < r.area)
        alerts.push(['warn', `L'area (${fmt(r.area)} cm²) supera la colonna usata (${fmt(COLS[r.cp.i])} cm²): il Metodo OBO sottostima leggermente. Valuta il metodo Prudente o Intermedio.`]);
      (ANOM[r.tab] || []).forEach(([ar, ac, msg]) => { if (r.used.some(([x, y]) => x === ar && y === ac)) alerts.push(['crit', 'Valore sospetto in tabella: ' + msg]); });
    }
    alerts.push(['info', "Usa il peso reale delle apparecchiature: se la scheda tecnica indica un peso massimo (es. ≤ 95 kg) e l'apparecchio pesa meno, la zavorra aumenta della stessa quantità."]);
    if (fr.double && r.sideArea.A > 0 && r.sideArea.B === 0) alerts.push(['info', 'Telaio bifacciale con apparecchiature su un solo lato: la zavorra va comunque distribuita in modo uniforme sui due lati.']);
    const ul = q('alerts');
    ul.innerHTML = '';
    alerts.forEach(([c, t]) => { const li = document.createElement('li'); li.className = c; li.textContent = t; ul.appendChild(li); });

    // suggerimento metodo area
    const ah = q('areaHint');
    if (r.area > COLS[0] && r.area <= COLS[COLS.length - 1] && !COLS.includes(Math.round(r.area))) {
      const hi = COLS.findIndex((c) => c >= r.area), lo = hi - 1, near = r.area - COLS[lo] <= COLS[hi] - r.area ? COLS[lo] : COLS[hi];
      ah.textContent = `Nel tuo caso l'area è ${fmt(r.area)} cm², tra le colonne ${fmt(COLS[lo])} e ${fmt(COLS[hi])} cm²: Prudente → colonna ${fmt(COLS[hi])}; Metodo OBO → colonna ${fmt(near)}; Intermedio → valore proporzionale tra le due.`;
    } else ah.textContent = "Nel tuo caso l'area coincide con una colonna della tabella (o è fuori tabella): per l'area il metodo non cambia il risultato.";

    // tabella vento
    const hint = q('windHint');
    if (r.wall) hint.textContent = 'Telaio a parete: nessuna zavorra. Per ogni velocità la colonna «Zavorra» indica la spinta indicativa del vento sulle apparecchiature (kN).';
    else if (r.err) hint.textContent = 'Correggi i dati sopra per ottenere la tabella.';
    else if (r.rp.kind === 'single') {
      const rowV = SPEEDS[r.rp.i];
      hint.innerHTML = `<strong>Prendi la riga evidenziata e sottolineata (${rowV} km/h):</strong> è quella che corrisponde al vento di progetto inserito (${fmt(state.wind)} km/h).` + (state.wind > SPEEDS[0] && state.wind !== rowV ? ' Il valore inserito cade tra due righe: si usa la riga superiore, a favore di sicurezza.' : '');
    } else hint.textContent = `Con il metodo Intermedio il valore a ${fmt(state.wind)} km/h è quello del risultato sopra: nessuna riga della tabella corrisponde esattamente.`;
    const wb = q('wind-body');
    wb.innerHTML = '';
    windTable(state).forEach((row, i) => {
      const tr = document.createElement('tr');
      if (!r.err && !r.wall && r.rp.kind === 'single' && r.rp.i === i) tr.className = 'cur';
      const star = row.verify ? ' <span class="flag">*</span>' : '';
      tr.innerHTML = `<td>${row.kmh}</td><td>${fmt(PRESS[i], 2)}</td><td>${row.table == null ? '–' : fmt(row.table) + (row.verify ? ' *' : '')}</td><td>${row.force != null ? fmt(row.force, 2) + ' kN' : row.ballast == null ? '–' : fmt(row.ballast) + star}</td><td ${fr.double ? '' : 'hidden'}>${row.perSide == null ? '–' : fmt(row.perSide) + star}</td>`;
      wb.appendChild(tr);
    });
  }

  // ---------- eventi ----------
  q('frame').value = state.frame;
  q('wind').value = state.wind;
  q('mode').value = state.calcMode;
  // i telai a 45° non sono ancora prodotti (coming soon, Marco 24/11/2026): si calcola solo a 30°
  const setPitch = (p) => { p = PITCH_45_DISPONIBILE ? p : 30; state.pitch = p; ['p30', 'p45'].forEach((n) => q(n).setAttribute('aria-pressed', String(+q(n).dataset.pitch === p))); };
  setPitch(state.pitch);
  q('p30').onclick = () => { setPitch(30); update(); };
  q('p45').onclick = () => { if (PITCH_45_DISPONIBILE) { setPitch(45); update(); } };
  q('frame').onchange = (e) => setFrame(e.target.value);
  q('wind').oninput = (e) => { state.wind = parseFloat(e.target.value) || 0; update(); };
  q('mode').onchange = (e) => { state.calcMode = e.target.value; update(); };
  q('addInv').onclick = () => { state.devs.push({ d: 'Inverter', side: 'A', w: 0, h: 0, kg: 0, q: 1 }); renderDevs(); update(); };
  q('addDev').onclick = () => { state.devs.push({ d: 'Quadro di stringa', side: 'A', w: 0, h: 0, kg: 0, q: 1 }); renderDevs(); update(); };
  q('copy').onclick = () => {
    const txt = emailText(state);
    const msg = q('copyMsg');
    const fallback = () => { const ta = q('copyFallback'); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); msg.textContent = 'Copia non disponibile: testo selezionato, premi Ctrl+C.'; };
    try { navigator.clipboard.writeText(txt).then(() => (msg.textContent = 'Tabella copiata.'), fallback); } catch { fallback(); }
  };

  // ---------- relazione per il cliente ----------
  const REL = { rCliente: 'cliente', rRif: 'riferimento', rLuogo: 'luogo', rCodice: 'codice', rNote: 'note' };
  const mostraRel = () => { const rel = state.rel || {}; Object.entries(REL).forEach(([id, k]) => { q(id).value = rel[k] || ''; }); };
  Object.entries(REL).forEach(([id, k]) => q(id).addEventListener('input', () => { state.rel = { ...(state.rel || {}), [k]: q(id).value }; update(); }));
  const datiRelazione = () => {
    const rel = state.rel || {}, val = (id) => (q(id) ? q(id).value.trim() : '');
    return { state, cliente: rel.cliente || val('cliente'), riferimento: rel.riferimento || '', progetto: val('progetto'), luogo: rel.luogo || '', codice: rel.codice || val('codice'),
      note: rel.note || '', autore: (q('who') && q('who').textContent) || '', data: new Date() };
  };
  const nomeFile = (est) => `Relazione_zavorra_${FRAMES[state.frame].name.replace(/\s+/g, '')}_${(datiRelazione().codice || datiRelazione().cliente || 'OBO').replace(/[^\w-]+/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.${est}`;
  const LOGO = new URL('logo-obo.png', import.meta.url).href;
  q('rApri').onclick = () => {
    const doc = documento(datiRelazione());
    const w = window.open('', '_blank');
    if (!w) { q('rMsg').textContent = 'Il browser ha bloccato la nuova finestra: consenti i popup per OBO Hub.'; return; }
    w.document.open(); w.document.write(paginaHTML(doc, LOGO)); w.document.close();
    q('rMsg').textContent = '';
  };
  q('rWord').onclick = async () => {
    const msg = q('rMsg'); msg.textContent = 'Preparo il file Word…';
    try {
      let logo = null;
      try {
        const bytes = new Uint8Array(await (await fetch(LOGO)).arrayBuffer());
        const dv = new DataView(bytes.buffer), lw = dv.getUint32(16), lh = dv.getUint32(20), h = 46;
        logo = { bytes, w: Math.round(lw * h / lh), h };
      } catch { /* senza logo */ }
      const blob = docxBlob(documento(datiRelazione()), logo);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeFile('docx'); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      msg.textContent = 'File Word scaricato.';
    } catch (e) { msg.textContent = 'Non riuscito: ' + e.message; }
  };
  mostraRel();

  // ---------- progetto: apertura, salvataggio automatico, collegamento a Progettazione LPS ----------
  if (storage) {
    const LS_APERTO = 'wrr-zavorra-aperto';
    let utente = null, aperto = null, righe = [], lps = [], timer = null, inSalvataggio = false;
    try { aperto = localStorage.getItem(LS_APERTO) || null; } catch { /* ignora */ }
    const ricordaAperto = (id) => { aperto = id; try { id ? localStorage.setItem(LS_APERTO, id) : localStorage.removeItem(LS_APERTO); } catch { /* ignora */ } };
    const nomeLps = (id) => { const p = lps.find((x) => x.id === id); return p ? [p.codice, p.nome].filter(Boolean).join(' · ') + (p.condiviso ? ' (condiviso)' : '') : ''; };
    const mostraAperto = (testo) => {
      const r = righe.find((x) => x.id === aperto);
      q('aperto').innerHTML = aperto
        ? `<strong>Calcolo aperto:</strong> ${esc([q('codice').value, q('progetto').value].filter(Boolean).join(' · ') || 'senza nome')}${q('lps').value ? ` · collegato a LPS ${esc(nomeLps(q('lps').value))}` : ''} — ${esc(testo || (r ? 'salvato il ' + new Date(r.aggiornato_il || r.created_at).toLocaleString('it-IT') : 'salvato'))}. Le modifiche si salvano da sole.`
        : '<strong>Calcolo nuovo, non ancora salvato.</strong> Scrivi numero CRM e nome (o collega un progetto LPS) e premi «Salva nel progetto»: da lì in poi si salva da solo.';
    };
    const campi = () => ({ id: aperto, codice: q('codice').value.trim(), progetto: q('progetto').value.trim(), cliente: q('cliente').value.trim(), progettoLps: q('lps').value || null });
    async function salva(auto) {
      if (!utente || inSalvataggio) return;
      inSalvataggio = true;
      const msg = q('saveMsg');
      try {
        const id = await storage.save({ ...campi(), state, result: last, table: windTable(state) });
        ricordaAperto(id);
        msg.textContent = auto ? '' : 'Salvato nel progetto.';
        mostraAperto('salvato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
        if (!auto) await elenca();
      } catch (e) { msg.textContent = 'Salvataggio non riuscito: ' + e.message; }
      finally { inSalvataggio = false; }
    }
    autoSalva = () => { if (!aperto || !utente) return; clearTimeout(timer); timer = setTimeout(() => salva(true), 1500); };
    function carica(row) {
      if (row.stato) { state = { ...defaultState(), ...structuredClone(row.stato) }; save(); }
      if (!FRAMES[state.frame]) state.frame = 'F1500';
      q('frame').value = state.frame; q('wind').value = state.wind; q('mode').value = state.calcMode; setPitch(state.pitch);
      q('cliente').value = row.cliente || ''; q('progetto').value = row.progetto || ''; q('codice').value = row.codice_crm || '';
      q('lps').value = row.progetto_lps && lps.some((p) => p.id === row.progetto_lps) ? row.progetto_lps : '';
      ricordaAperto(row.id);
      q('vaiProgetti').href = '../progetti.html' + (q('lps').value ? '?id=' + encodeURIComponent(q('lps').value) : '');
      mostraRel(); renderDevs(); update(); mostraAperto();
    }
    function disegnaElenco() {
      const body = q('archBody'), f = q('cerca').value.trim().toLowerCase();
      const vis = righe.filter((r) => !f || [r.codice_crm, r.progetto, r.cliente, FRAMES[r.telaio]?.name, nomeLps(r.progetto_lps)].join(' ').toLowerCase().includes(f));
      body.innerHTML = vis.length ? '' : `<tr><td class="l" colspan="6"><span class="hint">${righe.length ? 'Nessun calcolo trovato.' : 'Nessun calcolo salvato.'}</span></td></tr>`;
      vis.forEach((row) => {
        const tr = document.createElement('tr');
        if (row.id === aperto) tr.className = 'cur';
        const d = new Date(row.aggiornato_il || row.created_at).toLocaleDateString('it-IT');
        const kg = row.risultato_kg == null ? '–' : `${fmt(row.risultato_kg)} kg${row.da_verificare ? ' *' : ''}`;
        const nome = [row.codice_crm, row.progetto].filter(Boolean).join(' · ') || '—';
        const sotto = [row.cliente, row.progetto_lps ? 'LPS ' + (nomeLps(row.progetto_lps) || 'collegato') : ''].filter(Boolean).join(' · ');
        tr.innerHTML = `<td class="l">${d}</td><td class="l">${esc(nome)}${sotto ? `<br><span class="hint">${esc(sotto)}</span>` : ''}</td><td class="l">${esc(FRAMES[row.telaio]?.name || row.telaio)}${FRAMES[row.telaio]?.wall ? '' : ' · ' + row.inclinazione + '°'}</td><td>${fmt(row.vento)} km/h</td><td>${FRAMES[row.telaio]?.wall ? 'a parete' : kg}</td><td style="white-space:nowrap"><button type="button" class="btn" data-open>${row.id === aperto ? 'Aperto' : 'Apri'}</button></td>`;
        tr.querySelector('[data-open]').onclick = () => { carica(row); disegnaElenco(); root.scrollIntoView({ behavior: 'smooth' }); };
        body.appendChild(tr);
      });
    }
    async function elenca() {
      try { righe = await storage.list(); disegnaElenco(); }
      catch (e) { q('archBody').innerHTML = `<tr><td class="l" colspan="6"><span class="hint">Errore nel caricamento: ${esc(e.message)}</span></td></tr>`; }
      if (!storage.completo) q('saveMsg').textContent = 'Collegamento ai progetti non ancora attivo: eseguire il SQL 17 (zavorra-progetti.sql). Intanto «Salva» crea un nuovo calcolo.';
    }
    const showUser = async (user) => {
      utente = user;
      q('login').hidden = !!user; q('arch').hidden = !user;
      if (!user) return;
      q('who').textContent = (window.oboNome ? window.oboNome(user.user_metadata?.nome_visualizzato || '', user.email) : '') || user.email;
      try { lps = await storage.progettiLps(); } catch { lps = []; }
      q('lps').innerHTML = '<option value="">— nessuno —</option>' + lps.map((p) => `<option value="${esc(p.id)}">${esc([p.codice, p.nome].filter(Boolean).join(' · ') || 'senza nome')}${p.condiviso ? ' (condiviso)' : ''}</option>`).join('');
      await elenca();
      // apertura: ?calcolo=<id>, ?progetto=<id progetto LPS>, altrimenti l'ultimo calcolo aperto su questo dispositivo
      const par = new URLSearchParams(location.search), daUrl = par.get('calcolo'), daLps = par.get('progetto'), nuovo = par.has('nuovo');
      const riga = righe.find((r) => r.id === daUrl) || (!nuovo && daLps && righe.find((r) => r.progetto_lps === daLps)) || (!daLps && righe.find((r) => r.id === aperto));
      if (riga) carica(riga);
      else {
        ricordaAperto(null);
        if (daLps && lps.some((p) => p.id === daLps)) { const p = lps.find((x) => x.id === daLps); q('lps').value = daLps; q('codice').value = p.codice || ''; q('progetto').value = p.nome || ''; }
        mostraAperto();
      }
    };
    q('save').onclick = () => salva(false);
    q('nuovo').onclick = () => { ricordaAperto(null); ['codice', 'progetto', 'cliente'].forEach((n) => (q(n).value = '')); q('lps').value = ''; q('saveMsg').textContent = ''; mostraAperto(); disegnaElenco(); };
    const aggLink = () => { const v = q('lps').value; q('vaiProgetti').href = '../progetti.html' + (v ? '?id=' + encodeURIComponent(v) : ''); };
    q('lps').addEventListener('change', aggLink);
    q('lps').onchange = () => { const p = lps.find((x) => x.id === q('lps').value); if (p) { if (!q('codice').value) q('codice').value = p.codice || ''; if (!q('progetto').value) q('progetto').value = p.nome || ''; } mostraAperto(); autoSalva(); };
    ['codice', 'progetto', 'cliente'].forEach((n) => q(n).addEventListener('input', () => autoSalva()));
    q('cerca').oninput = disegnaElenco;
    storage.getUser().then(showUser);
    cleanups.push(storage.onAuthChange((u2) => { if ((u2?.id || null) !== (utente?.id || null)) showUser(u2); }));
    addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); salva(true); } });
  }

  renderDevs();
  update();

  return {
    getState: () => structuredClone(state),
    getResult: () => last,
    destroy() { cleanups.forEach((f) => f && f()); root.innerHTML = ''; root.classList.remove('zwrr'); },
  };
}
