#!/bin/bash
# Seconda esplorazione: chunk della pagina di ricerca e prove dell'API (con Origin per vedere il CORS)
mkdir -p out2 && cd out2
UA="Mozilla/5.0 (OBO Hub; ufficio tecnico OBO Italia)"
B=https://www.obo-bettermann.com
A=https://api.production.obo.digital/v1
curl -sSL -A "$UA" -o search.html "$B/en-xi/search?q=spd"
grep -oE '/_next/static/[^"]+\.js' search.html ../esplora-out/pag_en-xi_search.html ../esplora-out/pag_it-it.html | sed 's/^[^:]*://' | sort -u > chunks.txt
i=0; while read c; do i=$((i+1)); curl -sSL -A "$UA" -o "c$i.js" "$B$c"; done < chunks.txt
grep -ohE '.{120}/search/.{260}' c*.js | sort -u > search-calls.txt
grep -ohE '"/search/[^"]*"|search/suggestion/[^"]*|/search/"\)\.concat\([^)]*\)' c*.js | sort | uniq -c > search-paths.txt
prova() { echo "### $1"; curl -sS -A "$UA" -H "Origin: https://obotechhub.github.io" -H "Accept: application/json" -D - -o body.tmp "$1" | grep -iE '^(HTTP|access-control|content-type|cache-control)'; head -c 1500 body.tmp; echo; echo; }
{
for loc in en-xi it-it; do
  for t in product article news page content download reference category all; do
    prova "$A/search/suggestion/$loc/$t?searchText=spd&pageSize=5"
  done
  prova "$A/search/$loc/product?searchText=5094652"
  prova "$A/search/$loc/product?searchText=spd"
done
} > prove-api.txt 2>&1
for s in products product_categories.1 news.1 pages.1; do curl -sSL -A "$UA" -o "sitemap.$s.xml" "$B/en-xi/sitemap.$s.xml"; done
curl -sSL -A "$UA" -o it-sitemap.xml "$B/it-it/sitemap.xml"
ls -la
