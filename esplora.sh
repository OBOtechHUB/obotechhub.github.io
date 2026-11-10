mkdir -p out7
python3 - > out7/sonda.txt 2>&1 <<'PY'
import json, time, urllib.request, urllib.parse
B="https://api.production.obo.digital/v1"
H={"User-Agent":"OBO-Hub/1.0","Accept":"application/json"}
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30); return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), e.read()[:300]
    except Exception as e: return 0, {}, str(e).encode()
def show(u):
    s,h,b=get(u)
    hk={k:v for k,v in h.items() if 'ate' in k.lower() or 'limit' in k.lower() or 'retry' in k.lower()}
    try:
        j=json.loads(b); n=len(j.get("results") or []); arts=[x.get("articleNumber") for x in (j.get("results") or [])[:3]]
        print(s,"tot",j.get("totalResults"),"n",n,"ps",j.get("pageSize"),arts,hk,u[len(B):])
        return j
    except Exception: print(s,b[:200],hk,u[len(B):])
    time.sleep(2)
for q in ["", "*", "a"]:
    for ps in [24, 100, 500]:
        show(f"{B}/search/it-it/product?searchText={urllib.parse.quote(q)}&pageSize={ps}"); time.sleep(2)
for p in ["page=2","pageNumber=2","currentPage=2","offset=100","skip=100","from=100"]:
    show(f"{B}/search/it-it/product?searchText=&pageSize=100&{p}"); time.sleep(2)
j=show(f"{B}/search/it-it/product?searchText=&pageSize=5")
if j: print(json.dumps(j,ensure_ascii=False)[:3000])
print("---- raffica di 90 richieste suggestion")
for i,art in enumerate(["5408969","6216670","6279300","6002435"]*23):
    s,h,b=get(f"{B}/search/suggestion/it-it/product?searchText={art}&pageSize=5")
    try: n=json.loads(b).get("totalResults")
    except Exception: n=b[:80]
    hk={k:v for k,v in h.items() if 'limit' in k.lower() or 'retry' in k.lower()}
    print(i,s,n,hk)
    time.sleep(0.6)
PY
