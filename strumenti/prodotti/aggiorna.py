#!/usr/bin/env python3
"""
Aggiorna l'indice dei prodotti OBO per l'app "Prodotti" di OBO Hub.

Gira ogni notte su GitHub Actions (solo libreria standard di Python).
Fonti pubbliche, nel rispetto di robots.txt (le pagine /search/ non vengono mai lette):
  - mappe del sito di obo.it (sitemap): elenco di prodotti, categorie, notizie e pagine;
    (le sitemap dei prodotti contengono anche le foto);
  - pagine prodotto di obo.it: nome, descrizione, foto e categoria dai dati strutturati (schema.org),
    lette una volta e poi solo quando la sitemap segnala una modifica;
  - API pubblica usata dal sito OBO (api.production.obo.digital), con calma perché limita le richieste:
    data di inserimento (per le novità), confezione e icona;
  - pagine di obo.it per titolo e immagine di categorie, notizie e pagine (una volta sola, poi in cache).

Il lavoro è incrementale: i dettagli già scaricati restano nei file di cache e ogni notte si scaricano
solo i prodotti nuovi più un gruppo a rotazione. L'API limita la frequenza delle richieste: si va piano,
una richiesta alla volta, e ci si ferma dopo un tempo massimo (si continua la notte dopo).

Uscita in prodotti/dati/:
  prodotti.json   elenco compatto dei prodotti (per la ricerca)
  categorie.json  albero delle categorie
  notizie.json    notizie (data, titolo, testo breve, immagine)
  pagine.json     articoli e pagine del sito (titolo, sezione)
  novita.json     riepilogo per la dashboard: prodotti nuovi e ultime notizie
  stato.json      data dell'aggiornamento e conteggi
  *-cache.json    dati completi per i giri successivi (non pubblicati)
"""
from __future__ import annotations

import concurrent.futures as cf
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

SITO = "https://www.obo.it"
API = "https://api.production.obo.digital/v1"
LOCALE = "it-it"
UA = "OBO-Hub/1.0 (strumento interno ufficio tecnico OBO Italia; https://obotechhub.github.io/)"
CARTELLA = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "prodotti", "dati"))
OGGI = dt.date.today().isoformat()

# Limiti per una notte (si possono cambiare con variabili d'ambiente)
MAX_RILETTURE = int(os.environ.get("MAX_RILETTURE", "1500"))  # pagine prodotto cambiate da rileggere
MAX_PAGINE = int(os.environ.get("MAX_PAGINE", "400"))        # pagine HTML di categorie, notizie e pagine
PARALLELO = int(os.environ.get("PARALLELO", "2"))            # pagine di obo.it lette insieme
PAUSA_PAGINE = float(os.environ.get("PAUSA_PAGINE", "0.4"))  # secondi di pausa dopo ogni pagina, per lettore
PAUSA_API = float(os.environ.get("PAUSA_API", "9"))          # l'API accetta circa 30 ricerche ogni 5 minuti
MINUTI_MAX = float(os.environ.get("MINUTI_MAX", "150"))      # tempo massimo per i dettagli dei prodotti
GIORNI_NOVITA = int(os.environ.get("GIORNI_NOVITA", "120"))  # un prodotto è "nuovo" se attivo da meno di N giorni
INIZIO = time.time()

NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9", "news": "http://www.google.com/schemas/sitemap-news/0.9",
      "image": "http://www.google.com/schemas/sitemap-image/1.1"}


def log(*a: object) -> None:
    print(*a, flush=True)


def richiesta(url: str, tentativi: int = 5, accetta: str = "*/*") -> tuple[int, bytes | None]:
    """Restituisce (codice HTTP, contenuto). 429 = il server chiede di rallentare: chi chiama decide."""
    codice = 0
    for i in range(tentativi):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accetta})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            codice = e.code
            if e.code in (404, 410, 429):
                return e.code, None
            time.sleep(1.5 * (i + 1))
        except Exception:  # rete instabile: riprova
            time.sleep(1.5 * (i + 1))
    return codice, None


def scarica(url: str, tentativi: int = 5, accetta: str = "*/*") -> bytes | None:
    for i in range(tentativi):
        codice, dati = richiesta(url, 1, accetta)
        if codice == 429:
            time.sleep(30 * (i + 1))
            continue
        if dati is not None or codice in (404, 410):
            return dati
        time.sleep(1.5 * (i + 1))
    return None


def leggi_json(nome: str, vuoto):
    try:
        with open(os.path.join(CARTELLA, nome), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return vuoto


def scrivi_json(nome: str, dati) -> None:
    os.makedirs(CARTELLA, exist_ok=True)
    with open(os.path.join(CARTELLA, nome), "w", encoding="utf-8") as f:
        json.dump(dati, f, ensure_ascii=False, separators=(",", ":"))


# ------------------------------------------------------------------ sitemap

def urls_sitemap(url: str) -> list[dict]:
    """Restituisce le voci di una sitemap (seguendo gli indici di sitemap)."""
    dati = scarica(url)
    if not dati:
        log("  sitemap non disponibile:", url)
        return []
    try:
        radice = ET.fromstring(dati)
    except ET.ParseError:
        log("  sitemap non valida:", url)
        return []
    if radice.tag.endswith("sitemapindex"):
        out: list[dict] = []
        for sm in radice.findall("s:sitemap", NS):
            loc = (sm.findtext("s:loc", default="", namespaces=NS) or "").strip()
            if loc:
                out += urls_sitemap(loc)
        return out
    out = []
    for u in radice.findall("s:url", NS):
        voce = {"url": (u.findtext("s:loc", default="", namespaces=NS) or "").strip(),
                "lastmod": (u.findtext("s:lastmod", default="", namespaces=NS) or "").strip()[:10]}
        n = u.find("news:news", NS)
        if n is not None:
            voce["titolo"] = (n.findtext("news:title", default="", namespaces=NS) or "").strip()
            voce["data"] = (n.findtext("news:publication_date", default="", namespaces=NS) or "").strip()[:10]
        img = u.find("image:image", NS)
        if img is not None:
            voce["immagine"] = (img.findtext("image:loc", default="", namespaces=NS) or "").strip()
        out.append(voce)
    return out


def da_slug(s: str) -> str:
    s = urllib.parse.unquote(s).replace("-", " ").strip()
    return s[:1].upper() + s[1:]


# ------------------------------------------------------------------ prodotti

RE_ART = re.compile(r"-(\d{7,8})\.html$")
RE_LD = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)


class Rallenta(Exception):
    """L'API ha chiesto di rallentare (429) anche dopo l'attesa."""


def dettaglio_api(art: str) -> dict | None:
    """Dati dall'API: {} se il prodotto non c'è, None se non è stato possibile chiedere."""
    q = urllib.parse.urlencode({"searchText": art, "pageSize": 5})
    for attesa in (0, 120, 300):
        if attesa:
            time.sleep(attesa)
        codice, dati = richiesta(f"{API}/search/suggestion/{LOCALE}/product?{q}", accetta="application/json")
        if codice != 429:
            break
    else:
        raise Rallenta()
    if dati is None:
        return None
    try:
        risultati = json.loads(dati).get("results") or []
    except json.JSONDecodeError:
        return None
    r = next((x for x in risultati if str(x.get("articleNumber")) == art), None)
    if not r:
        return {}
    imm = r["images"][0] if r.get("images") else {}
    return {
        "t": (r.get("title") or "").strip(),
        "d": (r.get("shortDescription") or "").strip(),
        "i": r.get("iconUrl") or "",
        "im": imm.get("mobileImageUrl") or imm.get("imageUrl") or "",
        "as": (r.get("activeSince") or "")[:10],
        "a": bool(r.get("active", True)),
        "v": r.get("vpe") or "",
    }


def dettaglio_pagina(url: str) -> dict | None:
    """Dati strutturati (schema.org) della pagina prodotto: {} se la pagina non c'è più, None se errore."""
    codice, dati = richiesta(url, 3)
    if codice == 429:
        time.sleep(60)
        codice, dati = richiesta(url, 2)
    if codice in (404, 410):
        return {}
    if not dati:
        return None
    t = dati.decode("utf-8", "replace")
    out: dict = {}
    for blocco in RE_LD.findall(t):
        try:
            j = json.loads(blocco)
        except json.JSONDecodeError:
            continue
        if j.get("@type") == "Product":
            out["t"] = html.unescape(j.get("name") or "").strip()
            out["d"] = re.sub(r"\s+", " ", html.unescape(j.get("description") or "")).strip()[:600]
            imm = j.get("image") or []
            imm = [imm] if isinstance(imm, str) else imm
            if imm:
                out["im"] = imm[0]
        elif j.get("@type") == "BreadcrumbList":
            voci = j.get("itemListElement") or []
            if len(voci) > 1:
                out["c"] = str(voci[-1].get("item", "")).replace(SITO, "")
    if not out.get("t"):  # pagina senza dati strutturati: titolo e descrizione dai meta
        info = info_da_html(t)
        out.update({k: v for k, v in info.items() if v})
    return out


def aggiorna_prodotti(vecchi: dict[str, dict]) -> tuple[dict[str, dict], list[str]]:
    log("Sitemap prodotti di obo.it…")
    voci = [v for v in urls_sitemap(f"{SITO}/sitemap.xml") if "/prodotti/" in v["url"] and v["url"].endswith(".html")]
    nella_sitemap: dict[str, dict] = {}
    for v in voci:
        m = RE_ART.search(v["url"])
        if m:
            nella_sitemap[m.group(1)] = v
    log(f"  {len(nella_sitemap)} prodotti nelle sitemap")
    if not nella_sitemap:
        log("  nessun prodotto letto: tengo l'indice precedente")
        return vecchi, []

    primo_avvio = not vecchi
    prodotti: dict[str, dict] = {}
    for art, v in nella_sitemap.items():
        p = dict(vecchi.get(art, {}))
        p["u"] = v["url"].replace(SITO, "")
        p.setdefault("t", da_slug(re.sub(r"-\d{7,8}\.html$", "", v["url"].rsplit("/", 1)[-1])))
        if v.get("immagine"):
            p["im"] = v["immagine"]  # la foto principale è già nella sitemap
        if v.get("lastmod"):
            p["lm"] = v["lastmod"]
        # data in cui l'indice ha visto il prodotto la prima volta (non al primo avvio: lì è tutto "esistente")
        if art not in vecchi and not primo_avvio:
            p["pv"] = OGGI
        prodotti[art] = p
    tolti = sorted(set(vecchi) - set(prodotti))

    # 1) pagine prodotto: prima quelle mai lette (le più recenti prima), poi quelle modificate
    mai = sorted((a for a in prodotti if "pg" not in prodotti[a]), key=lambda a: prodotti[a].get("pv", ""), reverse=True)
    cambiate = [a for a in prodotti if "pg" in prodotti[a] and prodotti[a].get("lm", "") > prodotti[a]["pg"]][:MAX_RILETTURE]
    pagine = mai + cambiate
    # 2) API: prima i prodotti senza data di inserimento, poi a rotazione
    senza_data = [a for a in prodotti if not prodotti[a].get("as") and not prodotti[a].get("nx")]
    senza_data.sort(key=lambda a: prodotti[a].get("pv", ""), reverse=True)
    rotazione = sorted((a for a in prodotti if prodotti[a].get("as") or prodotti[a].get("nx")), key=lambda a: prodotti[a].get("ag", ""))
    api = senza_data + rotazione
    log(f"  pagine prodotto da leggere: {len(mai)} mai lette + {len(cambiate)} modificate; API: {len(senza_data)} senza data")

    def scaduto() -> bool:
        return (time.time() - INIZIO) / 60 > MINUTI_MAX

    conta = {"pagine": 0, "pagineOk": 0, "api": 0, "apiOk": 0}

    def lettore(coda: list[str]) -> None:
        while coda and not scaduto():
            try:
                a = coda.pop()
            except IndexError:
                return
            d = dettaglio_pagina(SITO + prodotti[a]["u"])
            if d is not None:
                prodotti[a].update({k: v for k, v in d.items() if v})
                prodotti[a]["pg"] = OGGI
                conta["pagineOk"] += 1 if d else 0
            conta["pagine"] += 1
            if conta["pagine"] % 1000 == 0:
                log(f"  pagine: {conta['pagine']}/{len(pagine)}")
            time.sleep(PAUSA_PAGINE)

    def interroga_api() -> None:
        for a in api:
            if scaduto():
                return
            try:
                d = dettaglio_api(a)
            except Rallenta:
                log("  l'API chiede di rallentare: riprendo la prossima notte")
                return
            if d is not None:
                p = prodotti[a]
                for k in ("t", "d", "im"):  # i testi delle pagine hanno la precedenza
                    if d.get(k) and not p.get("pg"):
                        p[k] = d[k]
                for k in ("i", "as", "v"):
                    if d.get(k):
                        p[k] = d[k]
                if d:
                    p["a"] = d["a"]
                    p.pop("nx", None)
                    conta["apiOk"] += 1
                else:
                    p["nx"] = OGGI  # non presente nell'API in italiano
                p["ag"] = OGGI
            conta["api"] += 1
            time.sleep(PAUSA_API)

    coda = list(reversed(pagine))  # pop() dalla fine = ordine di priorità
    with cf.ThreadPoolExecutor(max_workers=max(1, PARALLELO) + 1) as ex:
        lavori = [ex.submit(lettore, coda) for _ in range(max(1, PARALLELO))] + [ex.submit(interroga_api)]
        for f in lavori:
            f.result()
    log(f"  pagine prodotto lette: {conta['pagine']} ({conta['pagineOk']} con dati); API: {conta['api']} ({conta['apiOk']} trovati)")
    return prodotti, tolti


# ------------------------------------------------------------------ pagine HTML (titoli e immagini)

RE_META = re.compile(r'<meta\s+(?:property|name)="(og:title|og:image|og:description|description)"\s+content="([^"]*)"', re.I)
RE_TITLE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
RE_H1 = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
RE_TAG = re.compile(r"<[^>]+>")


def info_pagina(url: str) -> dict:
    dati = scarica(url, tentativi=3)
    if not dati:
        return {}
    return info_da_html(dati.decode("utf-8", "replace"))


def info_da_html(t: str) -> dict:
    meta = {k.lower(): html.unescape(v).strip() for k, v in RE_META.findall(t)}
    h1 = RE_H1.search(t)
    titolo = html.unescape(RE_TAG.sub("", h1.group(1))).strip() if h1 else ""
    if not titolo:
        mt = RE_TITLE.search(t)
        titolo = meta.get("og:title") or (html.unescape(mt.group(1)).strip() if mt else "")
        titolo = re.sub(r"\s*[|–-]\s*OBO.*$", "", titolo).strip()
    descr = meta.get("og:description") or meta.get("description") or ""
    descr = re.sub(r"\s*✓.*$", "", descr).strip()
    return {"t": re.sub(r"\s+", " ", titolo)[:200], "d": descr[:300], "im": meta.get("og:image", "")}


def completa_con_pagine(voci: dict[str, dict], chiave_ordine=None, limite: int = MAX_PAGINE) -> int:
    """Legge titolo/descrizione/immagine delle pagine non ancora lette (al massimo `limite` per notte)."""
    da_leggere = [u for u, v in voci.items() if not v.get("letta")]
    if chiave_ordine:
        da_leggere.sort(key=chiave_ordine, reverse=True)
    da_leggere = da_leggere[:limite]
    with cf.ThreadPoolExecutor(max_workers=max(1, PARALLELO)) as ex:
        for u, info in zip(da_leggere, ex.map(lambda x: info_pagina(SITO + x if x.startswith("/") else x), da_leggere)):
            if info.get("t"):
                voci[u].update({k: v for k, v in info.items() if v})
            voci[u]["letta"] = OGGI
    return len(da_leggere)


# ------------------------------------------------------------------ categorie, notizie, pagine

def aggiorna_categorie(vecchie: dict[str, dict]) -> dict[str, dict]:
    log("Sitemap categorie…")
    voci = [v for v in urls_sitemap(f"{SITO}/sitemap.xml") if re.search(r"/prodotti/(.+/)?$", v["url"]) and not v["url"].endswith(".html")]
    out: dict[str, dict] = {}
    for v in voci:
        u = v["url"].replace(SITO, "")
        if not u.startswith("/prodotti/") or not u.endswith("/"):
            continue
        c = dict(vecchie.get(u, {}))
        c.setdefault("t", da_slug(u.rstrip("/").rsplit("/", 1)[-1]))
        out[u] = c
    if not out:
        return vecchie
    n = completa_con_pagine(out, chiave_ordine=lambda u: -u.count("/"))  # prima i livelli alti
    log(f"  {len(out)} categorie, {n} pagine lette stanotte")
    return out


def aggiorna_notizie(vecchie: dict[str, dict]) -> dict[str, dict]:
    log("Sitemap notizie…")
    voci = urls_sitemap(f"{SITO}/fileadmin/export/xmlsitemap/26/news_sitemap_it_0.xml")
    if not voci:
        return vecchie
    out: dict[str, dict] = {}
    for v in voci:
        u = v["url"].replace(SITO, "")
        n = dict(vecchie.get(u, {}))
        if v.get("titolo"):
            n["t"] = v["titolo"]
        n.setdefault("t", da_slug(u.rstrip("/").rsplit("/", 1)[-1]))
        n["data"] = v.get("data") or n.get("data") or v.get("lastmod", "")
        if v.get("immagine"):
            n.setdefault("im", v["immagine"])
        out[u] = n
    letti = completa_con_pagine(out, chiave_ordine=lambda u: out[u].get("data", ""))
    log(f"  {len(out)} notizie, {letti} pagine lette stanotte")
    return out


def aggiorna_pagine(vecchie: dict[str, dict]) -> dict[str, dict]:
    log("Sitemap pagine e referenze…")
    voci = urls_sitemap(f"{SITO}/fileadmin/export/xmlsitemap/26/page_sitemap_it_0.xml")
    voci += [dict(v, ref=True) for v in urls_sitemap(f"{SITO}/fileadmin/export/xmlsitemap/26/reference_sitemap_it_0.xml")]
    if not voci:
        return vecchie
    out: dict[str, dict] = {}
    for v in voci:
        u = v["url"].replace(SITO, "")
        if u.startswith("/prodotti/") or "/novita/news/" in u or u.rstrip("/").endswith(("/404", "/grazie")):
            continue
        p = dict(vecchie.get(u, {}))
        p.setdefault("t", da_slug(u.rstrip("/").rsplit("/", 1)[-1] or "Home"))
        parti = [x for x in u.strip("/").split("/") if x]
        p["s"] = "Referenze" if v.get("ref") else (da_slug(parti[0]) if parti else "")
        out[u] = p
    letti = completa_con_pagine(out, chiave_ordine=lambda u: -u.count("/"))
    log(f"  {len(out)} pagine, {letti} lette stanotte")
    return out


# ------------------------------------------------------------------ uscita

def main() -> int:
    os.makedirs(CARTELLA, exist_ok=True)
    prodotti, tolti = aggiorna_prodotti(leggi_json("prodotti-cache.json", {}))
    categorie = aggiorna_categorie(leggi_json("categorie-cache.json", {}))
    notizie = aggiorna_notizie(leggi_json("notizie-cache.json", {}))
    pagine = aggiorna_pagine(leggi_json("pagine-cache.json", {}))

    # cache complete (per i prossimi giri)
    scrivi_json("prodotti-cache.json", prodotti)
    scrivi_json("categorie-cache.json", categorie)
    scrivi_json("notizie-cache.json", notizie)
    scrivi_json("pagine-cache.json", pagine)

    # file leggeri per l'app: [numero, nome, descrizione, url, icona, attivo dal, prima vista, immagine grande, categoria]
    elenco = [[a, p.get("t", ""), p.get("d", "")[:300], p.get("u", ""), p.get("i", ""), p.get("as", ""), p.get("pv", ""), p.get("im", ""), p.get("c", "")]
              for a, p in sorted(prodotti.items(), key=lambda x: x[1].get("t", "").lower())]
    scrivi_json("prodotti.json", elenco)
    albero = [[u, c.get("t", ""), c.get("im", "")] for u, c in sorted(categorie.items())]
    scrivi_json("categorie.json", albero)
    lista_notizie = sorted(([u, n.get("t", ""), n.get("d", ""), n.get("im", ""), n.get("data", "")] for u, n in notizie.items()),
                           key=lambda x: x[4], reverse=True)
    scrivi_json("notizie.json", lista_notizie)
    scrivi_json("pagine.json", [[u, p.get("t", ""), p.get("d", ""), p.get("s", "")] for u, p in sorted(pagine.items())])

    # novità: attivi da meno di GIORNI_NOVITA giorni secondo OBO, oppure comparsi da poco nelle sitemap.
    # Date che riguardano migliaia di prodotti insieme (caricamenti in blocco) non contano come novità.
    conteggio_date: dict[str, int] = {}
    for r in elenco:
        if r[5]:
            conteggio_date[r[5]] = conteggio_date.get(r[5], 0) + 1
    in_blocco = {d for d, n in conteggio_date.items() if n > 300}
    limite = (dt.date.today() - dt.timedelta(days=GIORNI_NOVITA)).isoformat()
    def data_novita(r):
        da = r[5] if r[5] and r[5] not in in_blocco else ""
        return max(da, r[6] or "")
    nuovi = [r for r in elenco if data_novita(r) >= limite]
    nuovi.sort(key=data_novita, reverse=True)
    adesso = dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes")
    scrivi_json("novita.json", {
        "aggiornato": adesso, "giorni": GIORNI_NOVITA, "prodottiNuovi": len(nuovi),
        "prodotti": [r[:9] + [data_novita(r)] for r in nuovi[:60]],  # come prodotti.json + data della novità (indice 9)
        "notizie": lista_notizie[:12], "tolti": tolti[:200],
    })
    con_dettagli = sum(1 for p in prodotti.values() if p.get("pg") and p.get("d"))
    con_data = sum(1 for p in prodotti.values() if p.get("as"))
    stato = {"aggiornato": adesso, "prodotti": len(elenco), "conDettagli": con_dettagli, "conData": con_data, "categorie": len(albero),
             "notizie": len(lista_notizie), "pagine": len(pagine), "nuovi": len(nuovi), "tolti": len(tolti),
             "dateInBlocco": sorted(in_blocco), "fonte": "obo.it (sitemap e pagine prodotto) e API pubblica del sito OBO"}
    scrivi_json("stato.json", stato)
    log("Fatto:", json.dumps(stato, ensure_ascii=False))
    return 0 if elenco else 1


if __name__ == "__main__":
    sys.exit(main())
