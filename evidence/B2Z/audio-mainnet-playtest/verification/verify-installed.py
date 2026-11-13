import concurrent.futures,hashlib,json,time,urllib.request
from pathlib import Path
root=Path('.work/audio-mainnet-playtest');manifest=Path('evidence/B2Z/audio-corrective-qualification/frozen-inventory.json');assert hashlib.sha256(manifest.read_bytes()).hexdigest()=='b4abc541bf7277dbae865f4269d1abd12cc4d6e0bcba39bcf2b21a875c1ae72f';inv=json.loads(manifest.read_text());base=Path('.work/audio-corrective/frozen/frontend');pol=json.loads((base/'.ic-assets.json5').read_text());out=root/'served-installed';out.mkdir(exist_ok=True)
def get(x):
 n=x['path']
 if n=='.ic-assets.json5':return None
 req=urllib.request.Request('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/'+n+'?audio-verify='+str(time.time_ns()),headers={'Accept-Encoding':'identity','Cache-Control':'no-cache'})
 with urllib.request.urlopen(req,timeout=60) as r:b=r.read();h={k.lower():v for k,v in r.headers.items()}
 assert hashlib.sha256(b).hexdigest()==x['sha256'] and len(b)==x['bytes'],n
 rule=pol[1] if n.endswith('.flac') else pol[2] if n=='audio/b2z-v1/manifest.json' else pol[0]
 for k,v in rule['headers'].items():assert h.get(k.lower())==v,(n,k,h.get(k.lower()))
 assert h.get('ic-certificate');p=out/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 return {'file':n,'sha256':x['sha256'],'bytes':len(b),'headers':h}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=[x for x in pool.map(get,inv) if x]
(root/'served-installed.json').write_text(json.dumps({'status':'PASS','at':time.time(),'files':rows,'scope':'HTTP identities and headers; signed inventory/certified metadata checked separately'},indent=2)+'\n');print('PASS all73 public files match frozen candidate')
