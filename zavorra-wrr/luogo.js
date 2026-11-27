// Luogo dell'impianto: ricerca del comune o dell'indirizzo, zona di vento NTC 2018, altitudine e stemma del Comune.
// Stessi servizi di Progettazione LPS: Photon (ricerca mentre si scrive; Nominatim non va usato per i suggerimenti),
// Open-Meteo (altitudine), Wikidata e Wikimedia Commons (stemma). Nessuna chiave; si invia solo il testo cercato.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

/** Lato della retta Capo Teulada – Isola di Maddalena: true = a oriente. */
export function sardegnaEst(lat, lon) {
  const la1 = 38.87, lo1 = 8.64, la2 = 41.22, lo2 = 9.4;
  return (lo2 - lo1) * (lat - la1) - (la2 - la1) * (lon - lo1) < 0;
}
/** Zona di vento (NTC 2018, Tab. 3.3.I) da regione e provincia; null se non riconosciuta (isole minori: zona 9 a mano). */
export function zonaDa(regione, provincia, lat, lon) {
  const r = norm(regione), p = norm(provincia);
  if (!r) return null;
  if (r.includes('trieste') || p.includes('trieste')) return 8;
  if (r.includes('friuli')) return 1;
  if (['valledaosta', 'valleedaoste', 'vallee', 'piemonte', 'lombardia', 'trentino', 'altoadige', 'sudtirol', 'veneto'].some((x) => r.includes(x))) return 1;
  if (r.includes('emilia')) return 2;
  if (r.includes('liguria')) return 7;
  if (r.includes('sicilia')) return 4;
  if (r.includes('calabria')) return p.includes('reggio') ? 4 : 3;
  if (r.includes('sardegna') || r.includes('sardigna')) return lat != null && lon != null ? (sardegnaEst(lat, lon) ? 5 : 6) : 5;
  if (['toscana', 'marche', 'umbria', 'lazio', 'abruzzo', 'molise', 'puglia', 'campania', 'basilicata'].some((x) => r.includes(x))) return 3;
  return null;
}
/** "Città metropolitana di Torino", "Provincia di Cuneo" → nome breve. */
export function nomeProvincia(s) {
  return String(s || '')
    .replace(/^(città metropolitana|provincia autonoma|provincia|libero consorzio comunale|ente di decentramento regionale)\s+dell['’]\s*/i, "L'")
    .replace(/^(città metropolitana|provincia autonoma|provincia|libero consorzio comunale|ente di decentramento regionale)\s+(della|degli|dei|del|di)\s+/i, '').trim();
}

/** Voce di Photon → luogo. */
export function daPhoton(v) {
  const c = (v.geometry && v.geometry.coordinates) || [], lon = Number(c[0]), lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const p = v.properties || {};
  const comune = p.city || p.town || p.village || (['city', 'town', 'village'].includes(p.type) ? p.name : '') || p.district || '';
  const via = [p.street, p.housenumber].filter(Boolean).join(' ');
  const nome = p.name && p.name !== p.street ? p.name : '';
  const principale = nome || via || comune || p.state || '';
  const secondario = [nome && via ? via : '', [p.postcode, principale === comune ? '' : comune].filter(Boolean).join(' '), p.county && p.county !== comune ? p.county : '', p.state, p.country && p.country !== 'Italia' ? p.country : '']
    .filter((x, i, a) => x && x !== principale && a.indexOf(x) === i).join(', ');
  return { principale, secondario, comune, provincia: nomeProvincia(p.county || ''), regione: p.state || '', paese: p.country || '', indirizzo: via, lat, lon };
}
/** Suggerimenti mentre si scrive (almeno 3 caratteri). */
export async function cercaLuoghi(testo, segnale) {
  const q = String(testo || '').trim();
  if (q.length < 3) return [];
  const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lang=default&lat=42.5&lon=12.5`, segnale ? { signal: segnale } : {});
  if (!r.ok) throw new Error('Ricerca non disponibile');
  const visti = new Set();
  return ((await r.json()).features || []).map(daPhoton).filter(Boolean).filter((l) => { const k = l.principale + '|' + l.secondario; if (visti.has(k)) return false; visti.add(k); return true; });
}
/** Altitudine del terreno (m s.l.m.) dalle coordinate; null se il servizio non risponde. */
export async function altitudine(lat, lon) {
  try {
    const j = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)).json();
    const a = j && j.elevation && j.elevation[0];
    return Number.isFinite(a) ? Math.max(0, Math.round(a)) : null;
  } catch { return null; }
}

// ---------- stemma del Comune (Wikidata + Wikimedia Commons) ----------
const WD = 'https://www.wikidata.org/w/api.php', COMMONS = 'https://commons.wikimedia.org/w/api.php', COMUNE_ITALIANO = 'Q747074';
const n2 = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const valori = (e, p) => {
  const peso = (c) => (c.rank === 'preferred' ? 0 : c.qualifiers && c.qualifiers.P582 ? 2 : 1);
  return ((e.claims && e.claims[p]) || []).filter((c) => c.rank !== 'deprecated').sort((a, b) => peso(a) - peso(b)).map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value);
};
const idDi = (v) => (v && typeof v === 'object' && 'id' in v ? String(v.id) : null);
const json = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error('Servizio non disponibile'); return r.json(); };
const entita = async (ids, props) => (ids.length ? Object.values((await json(`${WD}?action=wbgetentities&format=json&origin=*&languages=it&props=${props}&ids=${ids.slice(0, 50).join('|')}`)).entities || {}) : []);
const senzaHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Stemma del Comune come PNG: { nome, provincia, dataUrl, bytes, w, h, credito, pubblicoDominio } oppure null. */
export async function stemmaComune(nome, provincia, vicino) {
  const q = String(nome || '').trim();
  if (q.length < 2) return null;
  const s = await json(`${WD}?action=wbsearchentities&format=json&origin=*&language=it&uselang=it&type=item&limit=20&search=${encodeURIComponent(q)}`);
  const ent = (await entita((s.search || []).map((x) => x.id), 'labels|claims')).filter((e) => valori(e, 'P31').some((v) => idDi(v) === COMUNE_ITALIANO));
  const idProv = [...new Set(ent.map((e) => idDi(valori(e, 'P131')[0])).filter(Boolean))];
  const prov = new Map((await entita(idProv, 'labels')).map((e) => [e.id, (e.labels && e.labels.it && e.labels.it.value) || '']));
  let lista = ent.map((e) => {
    const co = valori(e, 'P625')[0] || {}, st = valori(e, 'P94')[0], p = idDi(valori(e, 'P131')[0]);
    return { nome: (e.labels && e.labels.it && e.labels.it.value) || q, provincia: nomeProvincia(p ? prov.get(p) || '' : ''), file: typeof st === 'string' ? st : null, lat: co.latitude, lon: co.longitude };
  });
  const stesso = lista.filter((c) => n2(c.nome) === n2(q)); if (stesso.length) lista = stesso;
  if (provincia) { const cp = lista.filter((c) => n2(c.provincia) === n2(nomeProvincia(provincia))); if (cp.length) lista = cp; }
  if (vicino && lista.length > 1) {
    const d = (c) => (c.lat == null ? Infinity : (c.lat - vicino.lat) ** 2 + ((c.lon - vicino.lon) * Math.cos(vicino.lat * Math.PI / 180)) ** 2);
    lista = lista.slice().sort((a, b) => d(a) - d(b));
  }
  const c = lista[0];
  if (!c || !c.file) return null;
  const pagine = (await json(`${COMMONS}?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=300&titles=${encodeURIComponent('File:' + c.file)}`)).query;
  const info = Object.values((pagine && pagine.pages) || {})[0];
  const ii = info && info.imageinfo && info.imageinfo[0], src = ii && (ii.thumburl || ii.url);
  if (!src) return null;
  const r = await fetch(src); if (!r.ok) return null;
  const bmp = await createImageBitmap(await r.blob());
  const k = Math.min(1, 300 / Math.max(bmp.width, bmp.height)), cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const dataUrl = cv.toDataURL('image/png'), bin = atob(dataUrl.split(',')[1]), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const m = ii.extmetadata || {}, licenza = senzaHtml(m.LicenseShortName && m.LicenseShortName.value), autore = senzaHtml(m.Artist && m.Artist.value);
  return { nome: c.nome, provincia: c.provincia, dataUrl, bytes, w: cv.width, h: cv.height, pubblicoDominio: /public domain|pubblico dominio|^pd\b|cc0/i.test(licenza),
    credito: `Stemma del Comune di ${c.nome}: Wikimedia Commons, «${c.file}»${autore ? `, ${autore}` : ''}${licenza ? `, ${licenza}` : ''}.` };
}
