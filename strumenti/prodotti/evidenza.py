#!/usr/bin/env python3
"""
Prodotti nuovi in evidenza: la sezione "Product highlights" della pagina iniziale di OBO.global
(oggi www.obo-bettermann.com), collegata alle pagine italiane di obo.it.

- Legge solo la pagina iniziale di OBO.global e le pagine dei prodotti in evidenza (poche richieste, con pausa):
  nessuna pagina /search/ (robots.txt).
- Per ogni prodotto: codice, nome italiano, descrizione, foto e indirizzo su obo.it (link "it-it" della pagina,
  oppure l'indice prodotti già scaricato).
- Scrive prodotti/dati/evidenza.json. Lo storico non si cancella mai: ogni prodotto resta con la data in cui è
  comparso ("dal") e l'ultima volta che è stato visto ("visto").
- Se OBO.global non risponde o la sezione non si trova, il file della notte prima resta com'è.
"""
from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]
DATI = RADICE / "prodotti" / "dati"
FILE = DATI / "evidenza.json"
GLOBALE = "https://www.obo.global/"
UA = "OBO-Hub-indice-prodotti/1.0 (strumento interno OBO Italia; ufficio tecnico)"
OGGI = datetime.now(timezone.utc).strftime("%Y-%m-%d")


def log(*a: object) -> None:
    print(*a, flush=True)


def scarica(url: str) -> tuple[str, str] | None:
    """(testo, indirizzo finale) oppure None."""
    for tentativo in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*", "Accept-Language": "it-IT,it;q=0.9,en;q=0.8"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode("utf-8", "replace"), r.geturl()
        except Exception as e:  # rete, 429, 5xx
            log(f"  {url}: {e} (tentativo {tentativo + 1})")
            time.sleep(8 * (tentativo + 1))
    return None


def testo(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def sezione_evidenza(pagina: str) -> str:
    """Parte della pagina tra il titolo "Product highlights" e il titolo successivo."""
    i = pagina.find("Product highlights")
    if i < 0:
        return ""
    j = pagina.find("<h2", i + 20)
    return pagina[i: j if j > 0 else i + 60000]


def prodotti_in_evidenza(pagina: str, base: str) -> list[dict]:
    out, visti = [], set()
    for m in re.finditer(r'<a[^>]+href="([^"]+/products/[^"]+?-(\d{7,8})\.html)"[^>]*>(.*?)</a>', sezione_evidenza(pagina), re.S):
        url, codice, corpo = m.group(1), m.group(2), m.group(3)
        if codice in visti:
            continue
        visti.add(codice)
        img = re.search(r'<img[^>]+src="([^"]+)"', corpo)
        t = testo(corpo)
        # testo della scheda: "<codice o N variants> <nome> <descrizione>"
        t = re.sub(r"^(\d+ variants?|\d{7,8})\s+", "", t)
        out.append({"codice": codice, "urlGlobal": url if url.startswith("http") else base.rstrip("/") + url, "testoEn": t, "immagine": img.group(1) if img else ""})
    return out


def indice_prodotti() -> dict[str, list]:
    try:
        return {r[0]: r for r in json.loads((DATI / "prodotti.json").read_text(encoding="utf-8"))}
    except Exception:
        return {}


def completa(p: dict, indice: dict[str, list]) -> dict:
    """Nome e indirizzo italiani: link hreflang it-it della pagina del prodotto, altrimenti l'indice di obo.it."""
    r = indice.get(p["codice"])
    url_it, nome_it, nome_en = "", "", ""
    pag = scarica(p["urlGlobal"])
    time.sleep(3)
    if pag:
        m = re.search(r'<link[^>]+hreflang="it-it"[^>]+href="([^"]+)"', pag[0]) or re.search(r'<link[^>]+href="([^"]+)"[^>]+hreflang="it-it"', pag[0])
        if m:
            url_it = html.unescape(m.group(1))
        t = re.search(r"<title>(.*?)</title>", pag[0], re.S)
        if t:
            nome_en = testo(t.group(1)).split(" | ")[0]
    if not url_it and r and r[3]:
        url_it = r[3] if r[3].startswith("http") else "https://www.obo.it" + r[3]
    if url_it:
        it = scarica(url_it)
        time.sleep(3)
        if it:
            t = re.search(r"<title>(.*?)</title>", it[0], re.S)
            if t:
                nome_it = testo(t.group(1)).split(" | ")[0]
    if not nome_it and r:
        nome_it = r[1]
    descr = (r[2] if r and len(r) > 2 and r[2] else "")
    return {
        "codice": p["codice"],
        "nome": nome_it or nome_en or p["testoEn"][:80],
        "nomeEn": nome_en,
        "descrizione": descr,
        "descrizioneEn": p["testoEn"],
        "immagine": p["immagine"] or (r[7] if r and len(r) > 7 else ""),
        "url": url_it or p["urlGlobal"],
        "urlGlobal": p["urlGlobal"],
    }


def main() -> int:
    vecchio = {}
    try:
        vecchio = json.loads(FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    pag = scarica(GLOBALE)
    if not pag:
        log("OBO.global non raggiungibile: tengo i dati precedenti")
        return 0
    base = re.match(r"https?://[^/]+", pag[1]).group(0) if re.match(r"https?://[^/]+", pag[1]) else GLOBALE
    trovati = prodotti_in_evidenza(pag[0], base)
    log(f"{len(trovati)} prodotti in evidenza su OBO.global ({pag[1]})")
    if not trovati:
        log("sezione Product highlights non trovata: tengo i dati precedenti")
        return 0
    indice = indice_prodotti()
    storico = {s["codice"]: s for s in vecchio.get("storico", [])}
    attuali = []
    for p in trovati:
        c = completa(p, indice)
        prima = storico.get(c["codice"], {})
        c["dal"] = prima.get("dal", OGGI)
        c["visto"] = OGGI
        attuali.append(c)
        storico[c["codice"]] = c
        log(f"  {c['codice']} {c['nome']} -> {c['url']}")
    dati = {
        "aggiornato": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M+00:00"),
        "fonte": "OBO.global - Product highlights",
        "urlFonte": pag[1],
        "prodotti": attuali,
        "storico": sorted(storico.values(), key=lambda s: (s.get("dal", ""), s["codice"]), reverse=True),
    }
    DATI.mkdir(parents=True, exist_ok=True)
    FILE.write_text(json.dumps(dati, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
