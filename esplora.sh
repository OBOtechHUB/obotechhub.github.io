mkdir -p out9
python3 - > out9/sonda.txt 2>&1 <<'PY'
import time, urllib.request, re, collections
UA="OBO-Hub/1.0 (strumento interno ufficio tecnico OBO Italia; https://obotechhub.github.io/)"
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=30); return r.status,dict(r.headers),r.read()
    except urllib.error.HTTPError as e: return e.code,dict(e.headers),e.read()[:200]
    except Exception as e: return 0,{},str(e).encode()
s,h,b=get("https://www.obo.it/sitemap.xml"); print(s,b[:600])
m=re.findall(rb"<loc>([^<]*products_18_1[^<]*)</loc>",b)
if m:
    s,h,b=get(m[0].decode()); print("SITEMAP PRODOTTI",s,len(b)); print(b[:2500].decode('utf8','replace'))
RE=re.compile(r'<meta\s+(?:property|name)="(og:title|og:image|og:description|description)"\s+content="([^"]*)"',re.I)
c=collections.Counter(); t0=time.time()
for i,u in enumerate(open("lista.txt").read().split()):
    s,h,b=get("https://www.obo.it"+u)
    c[s]+=1
    if s==200:
        t=b.decode('utf8','replace'); meta=dict(RE.findall(t))
        if i<4 or i%20==0: print(i,s,round(time.time()-t0),len(b),{k:v[:90] for k,v in meta.items()}, 'jsonld' if 'application/ld+json' in t else '', 'activeSince' in t, '__NEXT_DATA__' in t)
    else: print(i,s,round(time.time()-t0),b[:120])
    time.sleep(0.5)
print(c, round(time.time()-t0))
PY
