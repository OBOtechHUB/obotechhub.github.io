// Interfaccia del calcolatore. Uso:
//   import { mountZavorra } from './zavorra/app.js';
//   const app = mountZavorra(document.getElementById('app'), { supabase }); // supabase facoltativo
//   app.destroy();
import {
  COLS, SPEEDS, PRESS, FRAMES, TABNO, ANOM, MODE_LABELS, fmt,
  defaultState, compute, windTable, frameFit, emailText,
} from './calc.js';
import { createStorage } from './storage.js';

const SOURCE_URL = 'https://www.obo-bettermann.com/out/media/01-100_MA_Magic_PV_Mount_Wechselrichterrahmen_EN_2026-07-28.pdf';
const LS_KEY = 'wrr-zavorra-v3';
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
    <p>Calcolo della zavorra per i telai autoportanti OBO Magic PV Mount WRR F e WRR D, secondo il metodo del cap. 11 delle istruzioni di montaggio (07/2026).</p>
  </header>
  <div class="grid">
    <div class="col">
      <section class="panel">
        <h2>1 · Telaio e sito</h2>
        <div class="row">
          <label class="f" for="${u}-frame">Telaio
            <select id="${u}-frame">
              ${Object.entries(FRAMES).map(([k, f]) => `<option value="${k}">${f.name} · ${f.code} · ${f.double ? 'bifacciale' : 'monofacciale'}</option>`).join('')}
            </select>
          </label>
          <div class="f" style="display:grid;gap:4px">
            <span class="hint" style="font-weight:500">Inclinazione (tabella OBO)</span>
            <div class="seg" role="group" aria-label="Inclinazione">
              <button type="button" id="${u}-p30" data-pitch="30">30°</button>
              <button type="button" id="${u}-p45" data-pitch="45">45°</button>
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

      ${storage ? `
      <section class="panel">
        <h2>5 · Archivio calcoli</h2>
        <div id="${u}-login" hidden>
          <p class="hint" style="margin-bottom:8px">Entra in OBO Hub con il tuo account per salvare i calcoli e ritrovarli su qualsiasi dispositivo.</p>
          <p><a class="btn primary" href="../">Vai a OBO Hub</a></p>
        </div>
        <div id="${u}-arch" hidden style="display:grid;gap:12px">
          <form class="row" id="${u}-saveForm">
            <label class="f" for="${u}-cliente">Cliente<input id="${u}-cliente" maxlength="120"></label>
            <label class="f" for="${u}-progetto">Progetto / riferimento<input id="${u}-progetto" maxlength="160"></label>
          </form>
          <div class="tools">
            <button type="button" class="btn primary" id="${u}-save">Salva calcolo</button>
            <span class="hint" id="${u}-saveMsg" role="status"></span>
            <span class="hint" style="margin-left:auto"><span id="${u}-who"></span></span>
          </div>
          <div class="arch-table">
            <table>
              <thead><tr><th class="l">Data</th><th class="l">Cliente / progetto</th><th class="l">Telaio</th><th>Vento</th><th>Zavorra</th><th><span class="sr">Azioni</span></th></tr></thead>
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
  function update() {
    save();
    const fr = FRAMES[state.frame];
    root.querySelectorAll('[data-area]').forEach((el, i) => { const d = state.devs[i]; el.textContent = fmt(d.w * d.h / 100 * d.q); });
    const r = compute(state);
    last = r;
    renderFit(r);

    const steps = q('steps');
    steps.innerHTML = '';
    const add = (k, v) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; steps.append(dt, dd); };
    add('Telaio', `${fr.name} (${fr.code}), largh. ${fmt(fr.w)} mm, ${fr.double ? 'bifacciale' : 'monofacciale'}`);
    add('Tabella OBO', `Tab. ${TABNO[r.tab]} · telaio ${fmt(fr.w)} mm · ${state.pitch}° · ${MODE_LABELS[state.calcMode]}`);
    add('Area frontale', fr.double ? `lato A ${fmt(r.sideArea.A)} cm² · lato B ${fmt(r.sideArea.B)} cm² → usata ${fmt(r.area)} cm²` : `${fmt(r.area)} cm²`);
    add('Peso apparecchiature', `${fmt(r.weight, 1)} kg`);

    const alerts = [];
    q('resBox').classList.toggle('bad', !!r.err && r.errCode !== 'empty');
    const bn = q('banner');
    bn.hidden = true;
    if (r.errCode === 'width' || r.errCode === 'area') {
      bn.hidden = false;
      bn.textContent = r.errCode === 'width'
        ? (r.suggest ? `Telaio non conforme: usa il ${FRAMES[r.suggest].name} (${FRAMES[r.suggest].code}), vedi step 1.` : 'Nessun telaio WRR adatto alla larghezza dell\'apparecchiatura: contatta l\'ufficio tecnico OBO.')
        : `Non calcolabile con le tabelle OBO: area frontale ${fmt(r.area)} cm² oltre il massimo (11.500 cm²).`;
    }
    if (r.err) {
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
    if (r.err) hint.textContent = 'Correggi i dati sopra per ottenere la tabella.';
    else if (r.rp.kind === 'single') {
      const rowV = SPEEDS[r.rp.i];
      hint.innerHTML = `<strong>Prendi la riga evidenziata e sottolineata (${rowV} km/h):</strong> è quella che corrisponde al vento di progetto inserito (${fmt(state.wind)} km/h).` + (state.wind > SPEEDS[0] && state.wind !== rowV ? ' Il valore inserito cade tra due righe: si usa la riga superiore, a favore di sicurezza.' : '');
    } else hint.textContent = `Con il metodo Intermedio il valore a ${fmt(state.wind)} km/h è quello del risultato sopra: nessuna riga della tabella corrisponde esattamente.`;
    const wb = q('wind-body');
    wb.innerHTML = '';
    windTable(state).forEach((row, i) => {
      const tr = document.createElement('tr');
      if (!r.err && r.rp.kind === 'single' && r.rp.i === i) tr.className = 'cur';
      const star = row.verify ? ' <span class="flag">*</span>' : '';
      tr.innerHTML = `<td>${row.kmh}</td><td>${fmt(PRESS[i], 2)}</td><td>${row.table == null ? '–' : fmt(row.table) + (row.verify ? ' *' : '')}</td><td>${row.ballast == null ? '–' : fmt(row.ballast) + star}</td><td ${fr.double ? '' : 'hidden'}>${row.perSide == null ? '–' : fmt(row.perSide) + star}</td>`;
      wb.appendChild(tr);
    });
  }

  // ---------- eventi ----------
  q('frame').value = state.frame;
  q('wind').value = state.wind;
  q('mode').value = state.calcMode;
  const setPitch = (p) => { state.pitch = p; ['p30', 'p45'].forEach((n) => q(n).setAttribute('aria-pressed', String(+q(n).dataset.pitch === p))); };
  setPitch(state.pitch);
  q('p30').onclick = () => { setPitch(30); update(); };
  q('p45').onclick = () => { setPitch(45); update(); };
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

  // ---------- archivio Supabase ----------
  if (storage) {
    const showUser = async (user) => {
      q('login').hidden = !!user;
      q('arch').hidden = !user;
      if (user) { q('who').textContent = (window.oboNome ? window.oboNome(user.user_metadata?.nome_visualizzato || '', user.email) : '') || user.email; await refreshList(); }
    };
    const refreshList = async () => {
      const body = q('archBody');
      try {
        const rows = await storage.list();
        body.innerHTML = rows.length ? '' : '<tr><td class="l" colspan="6"><span class="hint">Nessun calcolo salvato.</span></td></tr>';
        rows.forEach((row) => {
          const tr = document.createElement('tr');
          const d = new Date(row.created_at).toLocaleDateString('it-IT');
          const kg = row.risultato_kg == null ? '–' : `${fmt(row.risultato_kg)} kg${row.da_verificare ? ' *' : ''}`;
          tr.innerHTML = `<td class="l">${d}</td><td class="l">${esc([row.cliente, row.progetto].filter(Boolean).join(' · ') || '—')}</td><td class="l">${esc(FRAMES[row.telaio]?.name || row.telaio)} · ${row.inclinazione}°</td><td>${fmt(row.vento)} km/h</td><td>${kg}</td><td style="white-space:nowrap"><button type="button" class="btn" data-open>Apri</button></td>`;
          tr.querySelector('[data-open]').onclick = () => {
            if (row.stato) { state = { ...defaultState(), ...structuredClone(row.stato) }; save(); }
            q('frame').value = state.frame; q('wind').value = state.wind; q('mode').value = state.calcMode; setPitch(state.pitch);
            q('cliente').value = row.cliente || ''; q('progetto').value = row.progetto || '';
            renderDevs(); update(); root.scrollIntoView({ behavior: 'smooth' });
          };
          body.appendChild(tr);
        });
      } catch (e) {
        body.innerHTML = `<tr><td class="l" colspan="6"><span class="hint">Errore nel caricamento: ${esc(e.message)}</span></td></tr>`;
      }
    };
    q('save').onclick = async () => {
      const msg = q('saveMsg');
      const btn = q('save');
      btn.disabled = true;
      try {
        await storage.save({ cliente: q('cliente').value.trim(), progetto: q('progetto').value.trim(), state, result: last, table: windTable(state) });
        msg.textContent = 'Calcolo salvato.';
        await refreshList();
      } catch (e) { msg.textContent = 'Errore nel salvataggio: ' + e.message; }
      finally { btn.disabled = false; }
    };
    storage.getUser().then(showUser);
    cleanups.push(storage.onAuthChange(showUser));
  }

  renderDevs();
  update();

  return {
    getState: () => structuredClone(state),
    getResult: () => last,
    destroy() { cleanups.forEach((f) => f && f()); root.innerHTML = ''; root.classList.remove('zwrr'); },
  };
}
