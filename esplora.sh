#!/bin/bash
# Terza esplorazione: elenco completo dei prodotti via API, sitemap italiane, notizie
mkdir -p out3 && cd out3
UA="Mozilla/5.0 (OBO Hub; ufficio tecnico OBO Italia)"
A=https://api.production.obo.digital/v1
j() { curl -sS -A "$UA" -H "Accept: application/json" "$1"; }
{
for q in "" "*" "a" "e"; do
  echo "### q=[$q] page=1 pageSize=100"; j "$A/search/it-it/product?searchText=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$q")&page=1&pageSize=100" | python3 -c "import json,sys;d=json.load(sys.stdin);print('total',d.get('totalResults'),'pageSize',d.get('pageSize'),'n',len(d.get('results',[])),'keys',list(d.keys()));print([f.get('key') or f.get('name') or list(f.keys()) for f in d.get('filters',[])][:20])" 2>&1
done
echo "### pagina 2"; j "$A/search/it-it/product?searchText=a&page=2&pageSize=100" | python3 -c "import json,sys;d=json.load(sys.stdin);print('n',len(d.get('results',[])),[r['articleNumber'] for r in d.get('results',[])][:5])"
echo "### filtri completi"; j "$A/search/it-it/product?searchText=a&page=1&pageSize=5" | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d.get('filters'),ensure_ascii=False)[:3000]);r=d['results'][0];print(json.dumps({k:(v if not isinstance(v,(list,dict)) else type(v).__name__) for k,v in r.items()},ensure_ascii=False))"
echo "### articolo per numero"; j "$A/search/suggestion/it-it/product?searchText=5096849&pageSize=3" | head -c 600; echo
echo "### content suggestion keys"; j "$A/search/suggestion/it-it/content?searchText=spd&pageSize=50" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('totalResults'),sorted({r.get('type') for r in d['results']}))"
echo "### content news"; j "$A/search/suggestion/it-it/content?searchText=news&pageSize=10" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('totalResults'),[(r.get('type'),r.get('title')) for r in d['results']][:10])"
} > prove3.txt 2>&1
for s in sitemap.xml it-it/sitemap.xml; do curl -sSL -A "$UA" -o "it.$(echo $s|tr / _)" -w "%{http_code} it.production $s\n" "https://it.production.obo.digital/$s"; done
for s in sitemap.xml it-it/sitemap.xml; do curl -sSL -A "$UA" -o "oboit.$(echo $s|tr / _)" -w "%{http_code} obo.it $s\n" "https://www.obo.it/$s"; done
curl -sSL -A "$UA" -o oboit-robots.txt https://www.obo.it/robots.txt
curl -sSL -A "$UA" -o en-products.xml https://www.obo-bettermann.com/en-xi/sitemap.products.xml
ls -la; grep -c "<loc>" *.xml
head -c 600 en-products.xml > en-products-testa.txt; rm -f en-products.xml
