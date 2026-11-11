mkdir -p out11
python3 - > out11/sonda.txt 2>&1 <<'PY' || true
import urllib.request, http.cookiejar, re, urllib.parse
cj=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
UA={"User-Agent":"Mozilla/5.0 (OBO-Hub sonda; uso interno)"}
B="https://myspdconfigurator.lovatoelectric.com"
def g(u,data=None,h={}):
    try:
        r=op.open(urllib.request.Request(u,data=data,headers={**UA,**h}),timeout=30); return r.status,r.read().decode('utf8','replace')
    except urllib.error.HTTPError as e: return e.code,e.read()[:3000].decode('utf8','replace')
    except Exception as e: return 0,str(e)
for p in ["/robots.txt","/home","/codice","/targa_impianto"]:
    s,t=g(B+p); print("=====",p,s,len(t))
    if p=="/robots.txt": print(t[:1500])
    else:
        print("FORM:",re.findall(r'<form[^>]*>',t)[:5]); print("INPUT:",re.findall(r'<(?:input|select)[^>]*>',t)[:30])
        print("SCRIPT:",re.findall(r'<script[^>]*src="([^"]+)"',t)[:15]); print("LINK:",sorted(set(re.findall(r'href="(/[^"#]*)"',t)))[:40])
        txt=re.sub(r'<[^>]+>',' ',re.sub(r'(?s)<script.*?</script>|<style.*?</style>','',t)); print("TESTO:",re.sub(r'\s+',' ',txt)[:2500])
        for js in re.findall(r'(?s)<script(?![^>]*src)[^>]*>(.*?)</script>',t)[:6]: print("JSINLINE:",js[:1500])
s,t=g(B+"/codice"); tok=re.search(r'name="csrf-token" content="([^"]+)"',t) or re.search(r'name="_token" value="([^"]+)"',t)
tok=tok.group(1) if tok else ""
print("TOKEN",bool(tok))
for codice in ["SA2","DPS"]:
    for meth in ["GET","POST"]:
        for u in [B+"/codice?codice="+codice, B+"/codice"]:
            data=urllib.parse.urlencode({"_token":tok,"codice":codice}).encode() if meth=="POST" else None
            if meth=="GET" and data is None and u.endswith("/codice"): continue
            s,t2=g(u,data,{"X-CSRF-TOKEN":tok,"Content-Type":"application/x-www-form-urlencoded"} if data else {})
            txt=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',re.sub(r'(?s)<script.*?</script>|<style.*?</style>','',t2)))
            print("=== RICERCA",meth,u,s,len(t2),txt[:1200])
# termini / note legali
for p in ["/privacy","/termini","/note-legali","/terms","/legal"]:
    s,t=g(B+p); print("LEGAL",p,s,len(t))
PY
for f in $(grep -o 'src="[^"]*\.js[^"]*"' out11/sonda.txt | head -0); do :; done
true
