#!/usr/bin/env python3
"""Independent standard-library publication construction from saved host images.
No JS imports, IC certificates, ledger data or deployed-canister claims.
"""
import argparse, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
def build(record,version=5):
    h=record['journal']['head'];artifacts=[]
    for kind,key in [('state','state_hex'),('events','event_hex'),('scores','score_hex')]:
        raw=bytes.fromhex(h[key]);assert len(raw)<=1048576
        artifacts.append({'kind':kind,'length':len(raw),'sha256':digest(raw),'chunks':[digest(raw[i:i+16384]) for i in range(0,len(raw),16384)]})
    p={'version':5,'revision':record['revision'],'identity':record['journal']['identity'],'ingest_head':record['inbox']['cursor'],
       'head':{k:h[k] for k in ['segment_id','logical_end','source_to_exclusive','manifest_hash','state_hash','seal']},
       'chunk_bytes':16384,'artifacts':artifacts}
    if version==6:
        p['version']=6;p.pop('revision');p.pop('ingest_head');p['render_format']=None
    elif version!=5:raise ValueError('publication version')
    raw=canonical(p);return {'publication_hex':raw.hex(),'sha256':digest(raw)}
def fixture(version=5):
    rows=[]
    for r in json.loads((ROOT/'tests/fixtures/coordinator-v5.json').read_text())['rows']:
        image=r['actions'][-1]['image_hex'];rows.append({'name':r['name'],**build(json.loads(bytes.fromhex(image)),version=version)})
    return {'schema_version':version,'provenance':'Independent Python standard-library flat-catalog/hash construction from implementation-derived saved coordinator worlds. NOT IC certificate verification.','rows':rows}
def main():
    p=argparse.ArgumentParser();p.add_argument('--version',type=int,choices=[5,6],default=5);p.add_argument('--check',action='store_true');p.add_argument('--write',action='store_true');a=p.parse_args()
    if a.check==a.write:p.error('choose --check or --write')
    dest=ROOT/f'tests/fixtures/observation-v{a.version}.json';expected=json.dumps(fixture(a.version),indent=2)+'\n'
    if a.write:dest.write_text(expected);print('Wrote independent publication fixtures.');return 0
    if dest.read_text()!=expected:print('FAIL: observation fixture drift');return 1
    print('PASS: five independent Python publication/catalog/hash fixtures.');return 0
if __name__=='__main__':raise SystemExit(main())
