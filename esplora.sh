mkdir -p out8
python3 - > out8/sonda.txt 2>&1 <<'PY'
import json, time, urllib.request, urllib.parse, collections
B="https://api.production.obo.digital/v1"
UA="OBO-Hub/1.0 (strumento interno ufficio tecnico OBO Italia; https://obotechhub.github.io/)"
arts=open("lista.txt").read().split()
c=collections.Counter(); t0=time.time()
for i,art in enumerate(arts):
    u=f"{B}/search/suggestion/it-it/product?"+urllib.parse.urlencode({"searchText":art,"pageSize":5})
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA,"Accept":"application/json"}),timeout=30)
        j=json.loads(r.read()); res=j.get("results") or []
        ok=any(str(x.get("articleNumber"))==art for x in res)
        k="ok" if ok else f"200-nomatch tot={j.get('totalResults')}"
        if not ok: print(i,art,k,[ (x.get('articleNumber'),x.get('tenantArticleNumber')) for x in res][:5])
    except urllib.error.HTTPError as e:
        k=f"http{e.code}"; print(i,art,k,round(time.time()-t0),e.read()[:200])
    except Exception as e:
        k="exc"; print(i,art,k,e)
    c[k.split()[0]]+=1
    time.sleep(0.6)
print(c)
PY
