mkdir -p out6
python3 - > out6/sonda.txt 2>&1 <<'PY'
import json, time, urllib.request, urllib.parse
B="https://api.production.obo.digital/v1"
H={"User-Agent":"Mozilla/5.0 OBOHub","Accept":"application/json","Origin":"https://www.obo.it","Referer":"https://www.obo.it/"}
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30); return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, e.read()[:300].decode('utf8','replace')
    except Exception as e: return 0, str(e)
def show(tag,u):
    s,j=get(u); print("==",tag,s,u)
    if isinstance(j,dict):
        print("  keys",list(j.keys())[:12], "tot",j.get("totalResults"))
        for k in ("results","items","products","data","hits"):
            if isinstance(j.get(k),list):
                for x in j[k][:5]:
                    if isinstance(x,dict): print("   ",x.get("articleNumber"),"|",str(x.get("title"))[:60],"|",list(x.keys())[:10])
    else: print("  ",str(j)[:400])
    time.sleep(1.3)
for art in ["5408969","6216670","6279300","5000973","6002435"]:
    q=urllib.parse.quote(art)
    show("sug-it",f"{B}/search/suggestion/it-it/product?searchText={q}&pageSize=5")
    show("full-it",f"{B}/search/it-it/product?searchText={q}")
    show("sug-en",f"{B}/search/suggestion/en-xi/product?searchText={q}&pageSize=5")
    show("sug-de",f"{B}/search/suggestion/de-de/product?searchText={q}&pageSize=5")
    q2=urllib.parse.quote(art[:4]+" "+art[4:])
    show("sug-it-spazio",f"{B}/search/suggestion/it-it/product?searchText={q2}&pageSize=5")
PY
# pagina prodotto obo.it: og meta
for u in $(grep -o 'https://www.obo.it/prodotti/[^<]*5408969[^<]*' -r . 2>/dev/null | head -1); do echo $u; done >> out6/sonda.txt
