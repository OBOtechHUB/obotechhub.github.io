mkdir -p out10
python3 - > out10/sonda.txt 2>&1 <<'PY' || true
import urllib.request, re, json
UA="OBO-Hub/1.0 (strumento interno ufficio tecnico OBO Italia; https://obotechhub.github.io/)"
g=lambda u: urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=60).read().decode('utf8','replace')
try:
  sm=g("https://www.obo.it/sitemaps/products_18_1.xml")
  print("url",sm.count("<url>"),"image:loc",sm.count("<image:loc>"))
  i=sm.find("<image:image>"); print(sm[i-200:i+400])
except Exception as e: print("ERR sitemap",e)
for u in ["/prodotti/angolo-sinistra-altezza-40-240-mm-600-7423968.html","/prodotti/passerella-grigliata-gr-magic-105-ft-6002435.html"]:
    try: t=g("https://www.obo.it"+u)
    except Exception as e: print("ERR",u,e); continue
    for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',t,re.S): print("LD",m[:2500])
    print("TITLE",re.findall(r"<title>(.*?)</title>",t,re.S)[:1], "H1",[re.sub('<[^>]+>','',x).strip()[:100] for x in re.findall(r"<h1[^>]*>(.*?)</h1>",t,re.S)][:2])
    print("IMG",re.findall(r'https://[^"\' ]+\.(?:jpg|png|webp)',t)[:6])
PY
true
