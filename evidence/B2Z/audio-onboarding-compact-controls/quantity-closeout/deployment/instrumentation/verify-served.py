import concurrent.futures,hashlib,json,time,urllib.request,urllib.error
from pathlib import Path
import sys
phase=sys.argv[1];assert phase in ['before','after']
root=Path('.work/quantity-deployment-20261115')
manifest=Path('.work/audio-onboarding-compact-controls/rollback/inventory.json' if phase=='before' else 'evidence/B2Z/audio-onboarding-compact-controls/quantity-closeout/frontend-inventory.json')
assert hashlib.sha256(manifest.read_bytes()).hexdigest()==('e9b5c4be2216420f6f70d7c3f33f3ef4596b7d56e05c06eae43171fd629cb8c1' if phase=='before' else '4606757478a113e7a682f0077b69155e9455b2bf60624066c608b7b8168526be')
retries=[]
inv=json.loads(manifest.read_text());base=Path('.work/audio-onboarding-compact-controls/rollback/frontend' if phase=='before' else '.work/quantity-closeout/frozen/frontend');pol=json.loads((base/'.ic-assets.json5').read_text());out=root/('served-'+phase);out.mkdir(exist_ok=True)

def get(x):
 n=x['path']
 if n=='.ic-assets.json5':return None
 req=urllib.request.Request('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/'+n+'?territory-controls-verify='+str(time.time_ns()),headers={'Accept-Encoding':'identity','Cache-Control':'no-cache'})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=60) as r:b=r.read();h={k.lower():v for k,v in r.headers.items()}
   break
  except (OSError,urllib.error.URLError)as e:
   if isinstance(e,urllib.error.HTTPError)and e.code not in [408,429]and e.code<500:raise
   retries.append({'file':n,'attempt':attempt+1,'error':str(e),'at':time.time()})
   if attempt==2:raise
   time.sleep(2**attempt)

 assert hashlib.sha256(b).hexdigest()==x['sha256'] and len(b)==x['bytes'],n
 rule=pol[1] if n.endswith('.flac') else pol[2] if n=='audio/b2z-v1/manifest.json' else pol[0]
 for k,v in rule['headers'].items():assert h.get(k.lower())==v,(n,k,h.get(k.lower()))
 assert h.get('ic-certificate') and 'version=2' in h['ic-certificate'];assert h.get('content-encoding','identity')=='identity';
 if n.endswith('.flac'):assert h.get('content-type')=='audio/flac'
 p=out/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 return {'file':n,'sha256':x['sha256'],'bytes':len(b),'headers':h}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:rows=[x for x in pool.map(get,inv) if x]
(root/('served-'+phase+'.json')).write_text(json.dumps({'status':'PASS','at':time.time(),'files':rows,'transport_retries':retries,'scope':'HTTP identities and headers; signed inventory/certified metadata checked separately'},indent=2)+'\n');print('PASS all '+str(len(rows))+' public files match exact '+phase+' inventory and reviewed headers')
