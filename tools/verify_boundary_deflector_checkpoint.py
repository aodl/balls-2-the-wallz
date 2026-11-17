#!/usr/bin/env python3
"""Independent exact arithmetic oracle and JS/Rust long-chain parity; not IC evidence."""
import argparse,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['python3.11','tools/boundary_deflector_oracle.py','--output',str(out/'faces.json')],check=True)
oracle=json.loads((out/'faces.json').read_text())['vectors']
cargo=['cargo','run','--locked','--offline','--manifest-path','native/Cargo.toml','-p','b2z-native','--example','boundary_deflector_checkpoint']
def native(path):return json.loads(subprocess.check_output(cargo,input=path.read_text(),text=True))
js=json.loads(subprocess.check_output(['node','tools/boundary_deflector_checkpoint.mjs',str(out/'faces.json')],text=True));rust=native(out/'faces.json');assert js==rust
for expected,actual in zip(oracle,js,strict=True):
 for key in ['id','time','point','front','outgoing','intercept']:assert actual[key]==expected[key],(expected['id'],key)
chains=[{'id':f'chain-{count}','heading':3700,'start':'0','count':count}for count in[1500,10000,100000]]
chains += [{'id':f'horizon-{angle}','heading':angle,'start':'999000000','count':1500}for angle in[0,16384,32768,49152,8191,8192,57345]]
chains += [{'id':'negative-arithmetic-only','heading':3700,'start':'-999000000','count':1500}]
(out/'chains.json').write_text(json.dumps({'chains':chains})+'\n')
j=json.loads(subprocess.check_output(['node','tools/boundary_deflector_long_chain.mjs',str(out/'chains.json')],text=True));r=native(out/'chains.json');assert j==r
for path,value in [('face-results.json',js),('chain-results.json',j)]: (out/path).write_text(json.dumps(value,indent=2)+'\n')
subprocess.run(['node','tools/boundary_deflector_stress.mjs',str(out/'all-headings.json')],check=True)
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'oracle_faces':len(js),'exact_js_rust_chains':len(j),'all_cannon_headings':65536,'maximum_tested_chain':100000},indent=2)+'\n')
print('PASS exact Fraction/JS/Rust faces and long chains; separate installed qualification required')
