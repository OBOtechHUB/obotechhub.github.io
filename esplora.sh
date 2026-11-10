#!/bin/bash

mkdir -p out5
python3 - <<'PY' > out5/chiavi.txt 2>&1
import json,urllib.request
u="https://api.production.obo.digital/v1/search/suggestion/it-it/product?searchText=6000057&pageSize=1"
r=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"OBO-Hub/1.0"})))["results"][0]
print(json.dumps({k:(v if not isinstance(v,(list,dict)) or len(json.dumps(v))<400 else json.dumps(v)[:400]) for k,v in r.items()},ensure_ascii=False,indent=1))
PY
true
MAX_NUOVI=60 MAX_ROTAZIONE=0 MAX_PAGINE=15 python3 strumenti/prodotti/aggiorna.py > out5/log.txt 2>&1 || true
cp prodotti/dati/stato.json prodotti/dati/novita.json out5/ 2>/dev/null || true
head -c 3000 prodotti/dati/prodotti.json > out5/prodotti-testa.json || true
python3 -c "import json;d=json.load(open('prodotti/dati/prodotti.json'));print(len(d));print([r for r in d if r[2]][:5])" > out5/con-dettagli.txt 2>&1 || true
head -c 2500 prodotti/dati/notizie.json > out5/notizie-testa.json || true
head -c 2500 prodotti/dati/pagine.json > out5/pagine-testa.json || true
python3 -c "import json;d=json.load(open('prodotti/dati/categorie.json'));print(len(d));print([r for r in d if r[0].count('/')<=3][:40])" > out5/categorie.txt 2>&1 || true
ls -la prodotti/dati >> out5/log.txt
