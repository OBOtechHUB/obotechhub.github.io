#!/bin/bash
# Quarta esplorazione: sitemap di obo.it, pagina prodotto, API prodotto per numero articolo
mkdir -p out4 && cd out4
UA="Mozilla/5.0 (OBO Hub; ufficio tecnico OBO Italia)"
A=https://api.production.obo.digital/v1
for s in categories_18_1 products_18_1 products_18_2 products_18_3; do curl -sSL -A "$UA" -o "$s.xml" "https://www.obo.it/sitemaps/$s.xml"; done
curl -sSL -A "$UA" -o xml-sitemap.xml "https://www.obo.it/xml-sitemap/"
grep -c "<loc>" *.xml
P=$(grep -oE '<loc>[^<]+</loc>' products_18_1.xml | sed -n 5p | sed -E 's#</?loc>##g'); echo "pagina prodotto: $P"
curl -sSL -A "$UA" -o prodotto.html "$P"
grep -oE '<script type="application/ld\+json">.{0,3000}' prodotto.html | head -3 > ldjson.txt
grep -oE '<meta (property|name)="(og:[a-z:]+|description)" content="[^"]*"' prodotto.html > meta.txt
grep -oE '"__NEXT_DATA__"|self.__next_f' prodotto.html | sort | uniq -c > next.txt
N=$(echo "$P" | grep -oE '[0-9]{7}' | tail -1); echo "articolo $N"
{
for path in "product/it-it/$N" "it-it/product/$N" "product/$N/it-it" "product/it-it/article/$N" "product/detail/it-it/$N"; do
  echo "### $path"; curl -sS -A "$UA" -H "Accept: application/json" -o b.tmp -w "%{http_code}\n" "$A/$path"; head -c 700 b.tmp; echo
done
echo "### suggestion numero"; curl -sS -A "$UA" "$A/search/suggestion/it-it/product?searchText=$N&pageSize=5" | head -c 300; echo
echo "### pageSize 50 pagina 3"; curl -sS -A "$UA" "$A/search/it-it/product?searchText=morsetto&page=3&pageSize=50" | head -c 300; echo
echo "### pageSize 20 pagina 2"; curl -sS -A "$UA" "$A/search/it-it/product?searchText=morsetto&page=2" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('totalResults'),len(d.get('results',[])),json.dumps(d.get('filters'),ensure_ascii=False)[:1500])"
echo "### news"; curl -sS -A "$UA" "$A/search/suggestion/it-it/content?searchText=novit%C3%A0&pageSize=10" | head -c 2500; echo
} > prove4.txt 2>&1
head -c 3000 products_18_1.xml > products-testa.txt; head -c 2500 categories_18_1.xml > categories-testa.txt; head -c 2500 xml-sitemap.xml > xmlsitemap-testa.txt
grep -oE '<loc>[^<]+</loc>' xml-sitemap.xml | sed -E 's#</?loc>##g' > xmlsitemap-url.txt
grep -oE '<loc>[^<]+</loc>' categories_18_1.xml | sed -E 's#</?loc>##g' > categorie-url.txt
rm -f products_18_*.xml prodotto.html b.tmp
ls -la
