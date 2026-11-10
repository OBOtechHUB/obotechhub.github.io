#!/usr/bin/env python3
"""
Aggiorna l'indice dei prodotti OBO per l'app "Prodotti" di OBO Hub.

Gira ogni notte su GitHub Actions (solo libreria standard di Python).
Fonti pubbliche, nel rispetto di robots.txt (le pagine /search/ non vengono mai lette):
  - mappe del sito di obo.it (sitemap): elenco di prodotti, categorie, notizie e pagine;
  - API pubblica usata dal sito OBO (api.production.obo.digital): nome, descrizione, immagini
    e data di inserimento di ogni prodotto, cercato per numero d'articolo;
  - pagine di obo.it solo per titolo e immagine di categorie, notizie e pagine (una volta sola, poi in cache).

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
MAX_NUOVI = int(os.environ.get("MAX_NUOVI", "12000"))        # dettagli di prodotti mai visti
MAX_ROTAZIONE = int(os.environ.get("MAX_ROTAZIONE", "600"))  # dettagli rinfrescati a rotazione
MAX_PAGINE = int(os.environ.get("MAX_PAGINE", "400"))        # pagine HTML lette per titoli/immagini
PARALLELO = int(os.environ.get("PARALLELO", "2"))            # solo per le pagine HTML di obo.it
PAUSA_API = float(os.environ.get("PAUSA_API", "0.6"))        # secondi tra due richieste all'API
MINUTI_MAX = float(os.environ.get("MINUTI_MAX", "150"))      # tempo massimo per i dettagli dei prodotti
GIORNI_NOVITA = int(os.environ.get("GIORNI_NOVITA", "120"))  # un prodotto è "nuovo" se attivo da meno di N giorni
INIZIO = time.time()

NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9", "news": "http://www.google.com/schemas/sitemap-news/0.9",
      "image": "http://www.google.com/schemas/sitemap-image/1.1"}


def log(*a: object) -> None:
    print(*a, flush=True)


def scarica(url: str, tentativi: int = 5, accetta: str = "*/*") -> bytes | None:
    for i in range(tentativi):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accetta})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                return None
            if e.code == 429:  # troppe richieste: aspetta quanto chiede il server, o sempre di più
                attesa = e.headers.get("Retry-After")
                time.sleep(float(attesa) if attesa and attesa.isdigit() else 10 * (2 ** i))
                continue
            time.sleep(1.5 * (i + 1))
        except Exception:  # rete instabile: riprova
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


def dettaglio_prodotto(art: str) -> dict | None:
    q = urllib.parse.urlencode({"searchText": art, "pageSize": 5})
    dati = scarica(f"{API}/search/suggestion/{LOCALE}/product?{q}", accetta="application/json")
    if not dati:
        return None
    try:
        risultati = json.loads(dati).get("results") or []
    except json.JSONDecodeError:
        return None
    r = next((x for x in risultati if str(x.get("articleNumber")) == art), None)
    if not r:
        return None
    icona = r.get("iconUrl") or ""
    imm = r["images"][0] if r.get("images") else {}
    return {
        "t": (r.get("title") or "").strip(),
        "d": (r.get("shortDescription") or "").strip(),
        "i": icona,
        "im": imm.get("mobileImageUrl") or imm.get("imageUrl") or icona,
        "as": (r.get("activeSince") or "")[:10],
        "a": bool(r.get("active", True)),
        "v": r.get("vpe") or "",
        "ag": OGGI,
    }


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
        # data in cui l'indice ha visto il prodotto la prima volta (non al primo avvio: lì è tutto "esistente")
        if art not in vecchi and not primo_avvio:
            p["pv"] = OGGI
        prodotti[art] = p
    tolti = sorted(set(vecchi) - set(prodotti))

    da_fare = [a for a in prodotti if "ag" not in prodotti[a]][:MAX_NUOVI]
    gia = set(da_fare)
    rotazione = sorted((a for a in prodotti if "ag" in prodotti[a]), key=lambda a: prodotti[a]["ag"])[:MAX_ROTAZIONE]
    lavoro = da_fare + [a for a in rotazione if a not in gia]
    log(f"  dettagli da scaricare: {len(da_fare)} nuovi + {len(lavoro) - len(da_fare)} a rotazione")

    # una richiesta alla volta, con pausa: l'API limita la frequenza (risponde 429 se si esagera)
    fatti = trovati = 0
    for a in lavoro:
        if (time.time() - INIZIO) / 60 > MINUTI_MAX:
            log(f"  tempo massimo raggiunto: continuo la prossima notte ({len(lavoro) - fatti} rimasti)")
            break
        d = dettaglio_prodotto(a)
        if d:
            prodotti[a].update({k: v for k, v in d.items() if v not in ("", None) or k == "a"})
            trovati += 1
        else:
            prodotti[a]["ag"] = OGGI  # non trovato nell'API: si riprova a rotazione
        fatti += 1
        if fatti % 500 == 0:
            log(f"  {fatti}/{len(lavoro)} ({trovati} con dettagli)")
        time.sleep(PAUSA_API)
    log(f"  dettagli scaricati: {trovati} su {fatti}")
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
    t = dati.decode("utf-8", "replace")
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

    # file leggeri per l'app: [numero, nome, descrizione, url, icona, attivo dal, prima vista, immagine grande]
    elenco = [[a, p.get("t", ""), p.get("d", ""), p.get("u", ""), p.get("i", ""), p.get("as", ""), p.get("pv", ""), p.get("im", "")]
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
        "prodotti": [r[:7] + [data_novita(r)] for r in nuovi[:60]],
        "notizie": lista_notizie[:12], "tolti": tolti[:200],
    })
    con_dettagli = sum(1 for p in prodotti.values() if p.get("d") or p.get("i"))
    stato = {"aggiornato": adesso, "prodotti": len(elenco), "conDettagli": con_dettagli, "categorie": len(albero),
             "notizie": len(lista_notizie), "pagine": len(pagine), "nuovi": len(nuovi), "tolti": len(tolti),
             "dateInBlocco": sorted(in_blocco), "fonte": "obo.it (sitemap) e API pubblica del sito OBO"}
    scrivi_json("stato.json", stato)
    log("Fatto:", json.dumps(stato, ensure_ascii=False))
    return 0 if elenco else 1


if __name__ == "__main__":
    sys.exit(main())
