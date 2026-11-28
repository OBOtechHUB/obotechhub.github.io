// Interfaccia del calcolatore. Uso:
//   import { mountZavorra } from './zavorra/app.js';
//   const app = mountZavorra(document.getElementById('app'), { supabase }); // supabase facoltativo
//   app.destroy();
import {
  COLS, SPEEDS, PRESS, FRAMES, TABNO, ANOM, MODE_LABELS, fmt,
  defaultState, compute, windTable, frameFit, emailText,
} from './calc.js';
import { createStorage } from './storage.js';
import { documento, paginaHTML, docxBlob, disegni } from './relazione.js';
import { cercaLuoghi, altitudine, zonaDa, stemmaComune } from './luogo.js';

/** SVG → PNG (per il Word), larghezza in px dell'immagine nel documento */
function svgPng(v, larghezzaPx) {
  return new Promise((ok, ko) => {
    const img = new Image(), k = 2.2, w = larghezzaPx, h = Math.round(larghezzaPx * v.h / v.w);
    img.onload = () => { const c = document.createElement('canvas'); c.width = w * k; c.height = h * k; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? b.arrayBuffer().then((a) => ok({ bytes: new Uint8Array(a), w, h, titolo: v.titolo })) : ko(new Error('immagine non creata'))), 'image/png'); };
    img.onerror = () => ko(new Error('disegno non leggibile'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(v.svg);
  });
}

const SOURCE_URL = 'https://www.obo-bettermann.com/out/media/01-100_MA_Magic_PV_Mount_Wechselrichterrahmen_EN_2026-07-28.pdf';
const LS_KEY = 'wrr-zavorra-v3';

/* Vento del sito, NTC 2018 par. 3.3 (stessi valori della pagina Vento di Progettazione LPS):
   Tab. 3.3.I zone (vb0 m/s, a0 m, ks) e Tab. 3.3.II categorie di esposizione (kr, z0, zmin). */
const ZONE_VENTO = [
  { zona: 1, vb0: 25, a0: 1000, ks: 0.4, d: "Valle d'Aosta, Piemonte, Lombardia, Trentino-Alto Adige, Veneto, Friuli Venezia Giulia (non Trieste)" },
  { zona: 2, vb0: 25, a0: 750, ks: 0.45, d: 'Emilia-Romagna' },
  { zona: 3, vb0: 27, a0: 500, ks: 0.37, d: 'Toscana, Marche, Umbria, Lazio, Abruzzo, Molise, Puglia, Campania, Basilicata, Calabria (non Reggio Calabria)' },
  { zona: 4, vb0: 28, a0: 500, ks: 0.36, d: 'Sicilia e provincia di Reggio Calabria' },
  { zona: 5, vb0: 28, a0: 750, ks: 0.4, d: 'Sardegna orientale' },
  { zona: 6, vb0: 28, a0: 500, ks: 0.36, d: 'Sardegna occidentale' },
  { zona: 7, vb0: 28, a0: 1000, ks: 0.54, d: 'Liguria' },
  { zona: 8, vb0: 30, a0: 1500, ks: 0.5, d: 'Provincia di Trieste' },
  { zona: 9, vb0: 31, a0: 500, ks: 0.32, d: 'Isole minori e mare aperto' },
];
const CATEGORIE_VENTO = [
  { cat: 'I', kr: 0.17, z0: 0.01, zmin: 2, d: 'mare aperto o costa a meno di 2 km' },
  { cat: 'II', kr: 0.19, z0: 0.05, zmin: 4, d: 'aperta campagna, pochi ostacoli' },
  { cat: 'III', kr: 0.2, z0: 0.1, zmin: 5, d: 'zona suburbana, industriale o rurale con ostacoli' },
  { cat: 'IV', kr: 0.22, z0: 0.3, zmin: 8, d: 'area urbana con edifici alti' },
  { cat: 'V', kr: 0.23, z0: 0.7, zmin: 12, d: 'centro di grande città' },
];
/** Velocità di picco (km/h) alla quota z: vb = vb0·ca, qp = ½·ρ·vb²·ce(z), v = radice(2·qp/ρ). */
export function ventoSito(zona, altitudine, cat, z) {
  const Z = ZONE_VENTO.find((x) => x.zona === Number(zona)) || ZONE_VENTO[0], C = CATEGORIE_VENTO.find((x) => x.cat === cat) || CATEGORIE_VENTO[2];
  const as = Math.max(0, Number(altitudine) || 0), ca = as <= Z.a0 ? 1 : 1 + Z.ks * (Math.min(as, 1500) / Z.a0 - 1);
  const vb = Z.vb0 * ca, zz = Math.max(Number(z) || 0, C.zmin), l = Math.log(zz / C.z0), ce = C.kr * C.kr * l * (7 + l);
  const qp = 0.5 * 1.25 * vb * vb * ce;
  return { vb, ca, ce, qp, kmh: Math.sqrt((2 * qp) / 1.25) * 3.6 };
}
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

  // calcolo nuovo: il vento si prende dal comune; i calcoli salvati prima del 28/11 senza comune restano con la velocità del progettista
  let state = { ...defaultState(), ventoDa: 'luogo' };
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (s && Array.isArray(s.devs)) { state = { ...state, ...s }; if (!s.ventoDa) delete state.ventoDa; }
  } catch { /* storage non disponibile */ }
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignora */ } };

  root.classList.add('zwrr');
  root.innerHTML = `
<div class="wrap">
  <header>
    <h1>${esc(title)}</h1>
    <p>Calcolo della zavorra per i telai autoportanti OBO Magic PV Mount WRR F e WRR D (i telai a parete WRR W non si zavorrano: spinta del vento per i tasselli), secondo il metodo del cap. 11 delle istruzioni di montaggio (07/2026).</p>
  </header>
  <ol class="z-passi" id="${u}-passi" aria-label="Passi del calcolo"></ol>
  <div class="z-nastro" id="${u}-nastro">
      <section class="panel z-carta c0" data-nome="Telaio">
        <p class="z-n">Passo 1</p><h2>Quale telaio monti?</h2>
        <p class="z-aiuto">Tocca la scheda del telaio. Monofacciale: apparecchiature su un lato; bifacciale: su due lati; a parete: fissato al muro, senza zavorra.</p>
        <div id="${u}-telaiQui"></div>
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
      </section>

      <section class="panel z-carta c1" data-nome="Vento">
        <p class="z-n">Passo 2</p><h2>Che vento c'è sul posto?</h2>
        <p class="z-aiuto">Scegli da dove prendere il vento: dal comune dell'impianto oppure dalla velocità che ti ha dato il progettista. Vale solo quella scelta.</p>
        <div class="z-vd" role="radiogroup" aria-label="Da dove prendere il vento">
          <label class="z-opz"><input type="radio" name="${u}-vd" id="${u}-vdLuogo" value="luogo"><span><b>Dal comune dell'impianto</b><small>l'app calcola la raffica di picco del sito (NTC 2018, come l'Eurocodice 1)</small></span></label>
          <label class="z-opz"><input type="radio" name="${u}-vd" id="${u}-vdProg" value="progettista"><span><b>Velocità data dal progettista</b><small>scrivi la raffica di picco che ti ha indicato</small></span></label>
        </div>
        <fieldset class="z-blocco" id="${u}-vProg">
          <label class="f" for="${u}-wind">Raffica di picco indicata dal progettista (km/h)
            <input type="number" id="${u}-wind" min="0" max="250" step="1" style="max-width:200px">
          </label>
          <p class="hint">Le tabelle OBO coprono 80–170 km/h.</p>
        </fieldset>
        <fieldset class="z-blocco" id="${u}-vLuogo">
            <label class="f" for="${u}-sCerca">Cerca il comune o l'indirizzo dell'impianto
              <input type="search" id="${u}-sCerca" autocomplete="off" placeholder="Es. Via Roma 10, Bergamo" aria-controls="${u}-sLista">
            </label>
            <div class="luoghi" id="${u}-sLista" role="listbox" hidden></div>
            <div class="luogo-scelto" id="${u}-sLuogo" hidden></div>
            <p class="hint">Scelto il luogo, l'app compila da sola zona di vento e altitudine e mette comune, stemma e valori del vento nella relazione. Puoi sempre correggere i campi qui sotto.</p>
            <label class="f" for="${u}-sZona">Dove si trova l'impianto
              <select id="${u}-sZona">${ZONE_VENTO.map((z) => `<option value="${z.zona}">Zona ${z.zona} · ${esc(z.d)}</option>`).join('')}</select>
            </label>
            <div class="row">
              <label class="f" for="${u}-sAlt">Altitudine sul mare (m)
                <input type="number" id="${u}-sAlt" min="0" max="3000" step="10">
              </label>
              <label class="f" for="${u}-sZ">Altezza del telaio dal suolo (m)
                <input type="number" id="${u}-sZ" min="0" max="200" step="0.5">
              </label>
            </div>
            <label class="f" for="${u}-sCat">Intorno all'impianto
              <select id="${u}-sCat">${CATEGORIE_VENTO.map((c) => `<option value="${c.cat}">${c.cat} · ${esc(c.d)}</option>`).join('')}</select>
            </label>
            <p class="hint">Per l'altezza conta il punto più alto del telaio: a terra circa 1,5 m, su un tetto l'altezza del tetto più 1,5 m.</p>
            <div class="fit" id="${u}-sEsito" role="status"></div>
            <p class="hint">Calcolo semplificato: velocità di riferimento della zona corretta per l'altitudine, coefficiente di esposizione della categoria, senza effetti del rilievo (colline, crinali) né coefficienti di forma. In casi particolari vale il calcolo del progettista.</p>
        </fieldset>
        <p class="hint"><strong>Da dove vengono i numeri.</strong> La zavorra viene dalle tabelle OBO delle istruzioni di montaggio (cap. 11, tabelle 5–8): per ogni velocità del vento e area delle apparecchiature danno i chili. L'app non rifà un calcolo strutturale secondo l'Eurocodice: la pressione mostrata è solo q = ½ · 1,25 · v².</p>
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

      <section class="panel z-carta c2" data-nome="Apparecchiature">
        <p class="z-n">Passo 3</p><h2>Che cosa monti sul telaio?</h2>
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
        <details class="adv"><summary>Da verificare a parte (non entra nel calcolo)</summary><div class="adv-body">
        <p class="hint">Solo un promemoria: queste voci non entrano nel calcolo. Le tabelle OBO considerano solo vento, area frontale e peso.</p>
        <ul class="check">${CHECKS.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        </div></details>
      </section>

      <section class="panel z-carta c3" data-nome="Risultato" aria-live="polite">
        <p class="z-n">Passo 4</p><h2>Quanta zavorra serve</h2>
        <div class="banner" id="${u}-banner" hidden></div>
        <div class="result" id="${u}-resBox">
          <span class="lbl" id="${u}-resLbl">Zavorra totale</span>
          <span class="big" id="${u}-resBig">–</span>
          <span class="sub" id="${u}-resSub"></span>
        </div>
        <div class="disegno" id="${u}-disegno" hidden></div>
        <dl class="steps" id="${u}-steps"></dl>
        <ul class="alerts" id="${u}-alerts"></ul>
        <h3 class="z-sotto">Zavorra per le altre velocità del vento</h3>
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

      <section class="panel z-carta c4" data-nome="Relazione">
        <p class="z-n">Passo 5</p><h2>Relazione per il cliente</h2>
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
      <section class="panel z-carta c5" data-nome="Progetto" id="${u}-progettoBox">
        <p class="z-n">Passo 6</p><h2>Salva nel progetto</h2>
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
  <div class="z-piede"><div class="z-piede-riga">
    <button type="button" class="btn" id="${u}-zIndietro">← Indietro</button>
    <span class="z-esito" id="${u}-zEsito" aria-live="polite"></span>
    <button type="button" class="btn primary" id="${u}-zAvanti">Avanti →</button>
  </div></div>
  <p class="foot">Fonte: <a href="${SOURCE_URL}" target="_blank" rel="noopener">OBO Magic PV Mount, istruzioni di montaggio telaio inverter (EN, 28/07/2026)</a>, cap. 11, tab. 5–8. Formula: zavorra = valore tabella − peso totale apparecchiature; telaio bifacciale: diviso 2 per lato. I valori tra parentesi nelle tabelle OBO non sono spiegati dal manuale: qui sono segnalati con * come da verificare con calcolo strutturale specifico. Strumento di supporto alla prevendita: non sostituisce la progettazione con OBO Construct o di un tecnico abilitato.</p>
</div>`;

  // ---------- schede che scorrono di lato (come la guida di Torrette) ----------
  const nastro = q('nastro'), carte = Array.from(nastro.children), passi = q('passi');
  let passo = 0, daNastro = false, fermoT = 0;
  passi.innerHTML = carte.map((c, i) => `<li><button type="button" data-i="${i}"><span>${i + 1}</span><em>${esc(c.dataset.nome)}</em></button></li>`).join('');
  const vai = (i, scorri = true) => {
    passo = Math.max(0, Math.min(carte.length - 1, i));
    carte.forEach((c, k) => c.classList.toggle('ora', k === passo));
    passi.querySelectorAll('li').forEach((l, k) => { l.className = k === passo ? 'ora' : k < passo ? 'fatto' : ''; });
    q('zIndietro').disabled = passo === 0;
    q('zAvanti').innerHTML = passo === carte.length - 1 ? 'Torna all\'inizio' : `Avanti<span class="z-dove">: ${esc(carte[passo + 1].dataset.nome)}</span> →`;
    if (scorri) {
      const c = carte[passo], ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
      nastro.scrollTo({ left: c.offsetLeft - (nastro.clientWidth - c.offsetWidth) / 2, behavior: ridotto ? 'auto' : 'smooth' });
      const sopra = passi.getBoundingClientRect().top; if (sopra < 0 || sopra > innerHeight) passi.scrollIntoView({ block: 'start', behavior: ridotto ? 'auto' : 'smooth' });
    }
  };
  nastro.addEventListener('scroll', () => {
    clearTimeout(fermoT);
    fermoT = setTimeout(() => {
      const centro = nastro.scrollLeft + nastro.clientWidth / 2; let meglio = 0, d = Infinity;
      carte.forEach((c, k) => { const x = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centro); if (x < d) { d = x; meglio = k; } });
      if (meglio !== passo) vai(meglio, false);
    }, 90);
  });
  carte.forEach((c, k) => c.addEventListener('click', () => { if (k !== passo) vai(k); }));
  passi.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) vai(Number(b.dataset.i)); });
  q('zIndietro').onclick = () => vai(passo - 1);
  q('zAvanti').onclick = () => vai(passo === carte.length - 1 ? 0 : passo + 1);
  // in basso, sempre visibile: la zavorra che risulta adesso
  const esito = () => { const b = q('resBig'); q('zEsito').innerHTML = `<small>Zavorra</small> <b>${b ? b.innerHTML.replace(/<small>[^<]*<\/small>/, '').trim() : '–'}</b> ${b && /kg/.test(b.textContent) ? '<small>kg</small>' : ''}`; };
  new MutationObserver(esito).observe(q('resBig'), { childList: true, characterData: true, subtree: true });
  // la scelta del telaio (schede con le foto, disegnate dalla pagina) va nel passo 1
  const metti = () => { const t = document.getElementById('telai'), qui = q('telaiQui'); if (t && qui && t.parentNode !== qui) { qui.appendChild(t); document.querySelector('.titolo-telai')?.remove(); } };
  metti(); setTimeout(metti, 0);
  setTimeout(() => { vai(0, false); esito(); }, 0);

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

    // disegno del telaio con le apparecchiature in scala (lo stesso della relazione)
    let viste = []; try { viste = disegni(state); } catch { viste = []; }
    q('disegno').hidden = !viste.length;
    q('disegno').innerHTML = viste.map((v) => `<figure>${v.svg.replace(/ width="\d+" height="\d+"/, '')}<figcaption>${esc(v.titolo)} · ${esc(fr.name)}, apparecchiature in scala</figcaption></figure>`).join('');
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
      q('resSub').textContent = (fr.double ? `${fmt(Math.ceil(r.perSide))} kg per lato, distribuiti in modo uniforme` : 'da mettere sul telaio, distribuiti in modo uniforme') + ` · tabella OBO ${fmt(r.table)} kg meno ${fmt(r.weight)} kg di apparecchiature`;
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
  // vento dal luogo (NTC 2018): aiuto per chi non ha la velocità di progetto
  const sito = () => (state.sito = Object.assign({ zona: 1, alt: 200, cat: 'III', z: 1.5 }, state.sito || {}));
  function renderSito() {
    const S = sito(), r = ventoSito(S.zona, S.alt, S.cat, S.z), v = Math.ceil(r.kmh);
    q('sZona').value = String(S.zona); q('sCat').value = S.cat;
    if (document.activeElement !== q('sAlt')) q('sAlt').value = S.alt;
    if (document.activeElement !== q('sZ')) q('sZ').value = S.z;
    q('sEsito').innerHTML = `<p><strong>Raffica di picco: ${fmt(v)} km/h</strong> (pressione ${fmt(r.qp / 1000, 2)} kN/m²)</p><p>Velocità di riferimento ${fmt(r.vb, 1)} m/s${r.ca > 1 ? `, già aumentata per l'altitudine (× ${fmt(r.ca, 2)})` : ''}; coefficiente di esposizione ${fmt(r.ce, 2)}.</p>${v > 170 ? '<p><strong>Oltre le tabelle OBO (170 km/h):</strong> serve un calcolo specifico.</p>' : ''}`;
    if (ventoDa() === 'luogo') { state.wind = v; if (document.activeElement !== q('wind')) q('wind').value = v; }
    vincoloVento();
  }
  // il vento viene da UNA sola fonte: dal comune (calcolo del sito) oppure dal progettista; l'altra parte è spenta
  function ventoDa() { if (!state.ventoDa) state.ventoDa = state.sito && state.sito.luogo ? 'luogo' : (state.wind && state.wind !== 120 ? 'progettista' : 'luogo'); return state.ventoDa; }
  function vincoloVento() {
    const da = ventoDa();
    q('vdLuogo').checked = da === 'luogo'; q('vdProg').checked = da === 'progettista';
    q('vLuogo').disabled = da !== 'luogo'; q('vProg').disabled = da !== 'progettista';
    q('vLuogo').classList.toggle('spento', da !== 'luogo'); q('vProg').classList.toggle('spento', da !== 'progettista');
  }
  [q('vdLuogo'), q('vdProg')].forEach((r) => (r.onchange = () => { state.ventoDa = r.value; if (r.value === 'progettista') { q('wind').value = state.wind; setTimeout(() => q('wind').focus(), 0); } renderSito(); update(); }));
  // ricerca del luogo: zona e altitudine in automatico, comune e stemma per la relazione
  let stemma = null, stemmaDi = '', cercaT = 0, cercaCtl = null;
  const chiaveStemma = (L) => (L && L.comune ? `${L.comune}|${L.provincia || ''}` : '');
  async function assicuraStemma() {
    const L = state.sito && state.sito.luogo, k = chiaveStemma(L);
    if (!k) { stemma = null; stemmaDi = ''; return null; }
    if (k !== stemmaDi) { stemmaDi = k; stemma = null; try { stemma = await stemmaComune(L.comune, L.provincia, { lat: L.lat, lon: L.lon }); } catch { stemma = null; } if (chiaveStemma(state.sito && state.sito.luogo) === k) mostraLuogo(); }
    return stemma;
  }
  function mostraLuogo() {
    const L = state.sito && state.sito.luogo, box = q('sLuogo');
    box.hidden = !L;
    if (!L) return;
    const st = stemma && stemmaDi === chiaveStemma(L) ? stemma : null;
    box.innerHTML = `${st ? `<img src="${st.dataUrl}" alt="Stemma del Comune di ${esc(L.comune)}">` : ''}<div><b>${esc([L.comune, L.provincia && L.provincia !== L.comune ? `(${L.provincia})` : ''].filter(Boolean).join(' ') || L.etichetta)}</b><small>${esc([L.indirizzo, L.regione, `${fmt(L.lat, 4)}° N, ${fmt(L.lon, 4)}° E`].filter(Boolean).join(' · '))}</small>${L.nota ? `<small>${esc(L.nota)}</small>` : ''}</div><button type="button" class="btn" id="${u}-sTogli">Cambia luogo</button>`;
    q('sTogli').onclick = () => { delete state.sito.luogo; stemma = null; stemmaDi = ''; mostraLuogo(); q('sCerca').value = ''; q('sCerca').focus(); update(); };
  }
  async function scegliLuogo(l) {
    q('sLista').hidden = true; q('sCerca').value = '';
    const S = sito(), zona = l.paese && !/ital/i.test(l.paese) ? null : zonaDa(l.regione, l.provincia, l.lat, l.lon);
    S.luogo = { etichetta: [l.principale, l.secondario].filter(Boolean).join(', '), comune: l.comune, provincia: l.provincia, regione: l.regione, indirizzo: l.indirizzo, lat: l.lat, lon: l.lon,
      nota: zona == null ? 'Zona di vento non riconosciuta (fuori Italia o isola minore): sceglila a mano qui sotto.' : '' };
    if (zona != null) S.zona = zona;
    const rel = state.rel || {};
    const testoLuogo = [l.indirizzo, [l.comune, l.provincia && l.provincia !== l.comune ? `(${l.provincia})` : ''].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (testoLuogo) { state.rel = { ...rel, luogo: testoLuogo }; mostraRel(); }
    mostraLuogo(); renderSito(); update();
    const a = await altitudine(l.lat, l.lon);
    if (a != null && state.sito && state.sito.luogo && state.sito.luogo.lat === l.lat) { state.sito.alt = a; renderSito(); update(); }
    else if (a == null && state.sito && state.sito.luogo) { state.sito.luogo.nota = [state.sito.luogo.nota, 'Altitudine non trovata: scrivila a mano.'].filter(Boolean).join(' '); mostraLuogo(); }
    assicuraStemma();
  }
  q('sCerca').oninput = (e) => {
    clearTimeout(cercaT); if (cercaCtl) cercaCtl.abort();
    const testo = e.target.value, lista = q('sLista');
    if (testo.trim().length < 3) { lista.hidden = true; return; }
    cercaT = setTimeout(async () => {
      cercaCtl = new AbortController();
      try {
        const ris = await cercaLuoghi(testo, cercaCtl.signal);
        lista.hidden = false;
        lista.innerHTML = ris.length ? '' : '<p class="hint">Nessun luogo trovato: prova con il solo nome del comune.</p>';
        ris.forEach((l) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'option'); b.innerHTML = `<b>${esc(l.principale)}</b><small>${esc(l.secondario)}</small>`; b.onclick = () => scegliLuogo(l); lista.appendChild(b); });
      } catch (err) { if (err && err.name === 'AbortError') return; lista.hidden = false; lista.innerHTML = '<p class="hint">Ricerca non raggiungibile: scegli zona e altitudine a mano qui sotto.</p>'; }
    }, 300);
  };
  q('sCerca').onkeydown = (e) => { if (e.key === 'Escape') q('sLista').hidden = true; if (e.key === 'Enter') { e.preventDefault(); const b = q('sLista').querySelector('button'); if (b && !q('sLista').hidden) b.click(); } };
  mostraLuogo(); assicuraStemma();
  q('sZona').onchange = (e) => { sito().zona = Number(e.target.value); renderSito(); update(); };
  q('sCat').onchange = (e) => { sito().cat = e.target.value; renderSito(); update(); };
  q('sAlt').oninput = (e) => { sito().alt = parseFloat(e.target.value) || 0; renderSito(); update(); };
  q('sZ').oninput = (e) => { sito().z = parseFloat(e.target.value) || 0; renderSito(); update(); };
  renderSito();
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
      note: rel.note || '', autore: (q('who') && q('who').textContent) || '', data: new Date(),
      sito: state.sito && state.sito.luogo && ventoDa() === 'luogo' ? { ...state.sito, vento: ventoSito(state.sito.zona, state.sito.alt, state.sito.cat, state.sito.z), Z: ZONE_VENTO.find((x) => x.zona === Number(state.sito.zona)), C: CATEGORIE_VENTO.find((x) => x.cat === state.sito.cat) } : null,
      stemma: stemma && stemmaDi === chiaveStemma(state.sito && state.sito.luogo) ? stemma : null };
  };
  const nomeFile = (est) => `Relazione_zavorra_${FRAMES[state.frame].name.replace(/\s+/g, '')}_${(datiRelazione().codice || datiRelazione().cliente || 'OBO').replace(/[^\w-]+/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.${est}`;
  const LOGO = new URL('logo-obo.png', import.meta.url).href;
  q('rApri').onclick = async () => {
    const w = window.open('', '_blank');
    if (!w) { q('rMsg').textContent = 'Il browser ha bloccato la nuova finestra: consenti i popup per OBO Hub.'; return; }
    await assicuraStemma();
    const doc = documento(datiRelazione());
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
      await assicuraStemma();
      const doc = documento(datiRelazione()), dis = doc.blocchi.find((b) => b.t === 'disegno');
      const viste = dis ? await Promise.all(dis.viste.map((v) => svgPng(v, dis.viste.length > 1 ? 260 : 380))) : [];
      const blob = docxBlob(doc, logo, viste, doc.stemma);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeFile('docx'); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      msg.textContent = 'File Word scaricato.';
    } catch (e) { msg.textContent = 'Non riuscito: ' + e.message; }
  };
  mostraRel();

  // ---------- progetto: apertura, salvataggio automatico, collegamento a Progettazione LPS ----------
  if (storage) {
    const LS_APERTO = 'wrr-zavorra-aperto';
    let utente = null, aperto = null, righe = [], lps = [], timer = null, inSalvataggio = false, inAttesa = false, modificato = false, pronto = false;
    // uscita con dati non salvati nel progetto: «Attenzione: perderai i dati» (comune/avviso-uscita.js)
    window.oboAvvisoUscita?.registra(() => !!utente && (modificato || inAttesa || inSalvataggio), () => salva(false));
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
        ricordaAperto(id); modificato = false;
        msg.textContent = auto ? '' : 'Salvato nel progetto.';
        mostraAperto('salvato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
        if (!auto) await elenca();
      } catch (e) { msg.textContent = 'Salvataggio non riuscito: ' + e.message; }
      finally { inSalvataggio = false; }
    }
    autoSalva = () => { if (!utente) return; if (!aperto) { if (pronto) modificato = true; return; } clearTimeout(timer); inAttesa = true; timer = setTimeout(() => { inAttesa = false; salva(true); }, 1500); };
    function carica(row) {
      if (row.stato) { state = { ...defaultState(), ...structuredClone(row.stato) }; save(); }
      if (!FRAMES[state.frame]) state.frame = 'F1500';
      q('frame').value = state.frame; q('wind').value = state.wind; renderSito(); q('mode').value = state.calcMode; setPitch(state.pitch);
      q('cliente').value = row.cliente || ''; q('progetto').value = row.progetto || ''; q('codice').value = row.codice_crm || '';
      q('lps').value = row.progetto_lps && lps.some((p) => p.id === row.progetto_lps) ? row.progetto_lps : '';
      ricordaAperto(row.id);
      q('vaiProgetti').href = '../progetti.html' + (q('lps').value ? '?id=' + encodeURIComponent(q('lps').value) : '');
      mostraRel(); renderDevs(); renderSito(); mostraLuogo(); assicuraStemma(); update(); mostraAperto();
      clearTimeout(timer); inAttesa = false; modificato = false;
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
      pronto = true;
    };
    q('save').onclick = () => salva(false);
    q('nuovo').onclick = () => (window.oboAvvisoUscita ? window.oboAvvisoUscita.chiedi(nuovoCalcolo) : nuovoCalcolo());
    const nuovoCalcolo = () => { modificato = false; ricordaAperto(null); ['codice', 'progetto', 'cliente'].forEach((n) => (q(n).value = '')); q('lps').value = ''; q('saveMsg').textContent = ''; mostraAperto(); disegnaElenco(); };
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
