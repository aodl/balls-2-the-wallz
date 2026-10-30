#!/usr/bin/env python3
"""Public frozen inputs only; preparation ends before resource qualification."""
import ast,gzip,hashlib,json,os,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify_contract():
 contract=json.loads((ROOT/'vendor/b2z/delivery/assertion-contract.json').read_text())
 for name,sha in contract['files'].items():assert digest(ROOT/name)==sha,name
 module=ast.parse((ROOT/'tools/verify_s14_deployment.py').read_text())
 measure=next(n for n in ast.walk(module)if isinstance(n,ast.FunctionDef)and n.name=='measure_mode')
 assert hashlib.sha256(ast.dump(measure,include_attributes=False).encode()).hexdigest()==contract['measure_mode_ast_sha256'],'Normal measurement/assertions changed'
 calls=[n for n in ast.walk(module)if isinstance(n,ast.Call)and isinstance(n.func,ast.Name)and n.func.id=='measure_mode']
 assert any(len(n.args)>1 and isinstance(n.args[0],ast.Constant)and n.args[0].value=='normal_sustained'and isinstance(n.args[1],ast.Constant)and n.args[1].value==900 for n in calls),'900-second call missing'
def main():
 verify_contract()
 out=Path(os.environ.get('DELIVERY_PREP_OUTPUT',str(ROOT/'.work/delivery-inputs')));out.mkdir(parents=True,exist_ok=False)
 source=ROOT/'vendor/b2z/delivery';manifest=json.loads((source/'manifest.json').read_text())
 for name in ['A0','A2']:
  z=source/(name+'.wasm.gz');assert digest(z)==manifest[name]['gzip_sha256'];raw=gzip.decompress(z.read_bytes());assert hashlib.sha256(raw).hexdigest()==manifest[name]['sha256'];(out/(name+'.wasm')).write_bytes(raw)
 assert digest(source/'frontend-manifest.json')==manifest['frontend_manifest_sha256']
 from playwright.sync_api import sync_playwright
 with sync_playwright()as pw:
  exe=Path(pw.chromium.executable_path)
  while not exe.name.startswith('chromium-'):exe=exe.parent
  cache=exe.parent
  browser_files=json.loads((source/'browser-binaries.json').read_text())
  actual={str(f.relative_to(cache))for directory in {name.split('/')[0]for name in browser_files}for f in(cache/directory).rglob('*')if f.is_file()}
  assert actual==set(browser_files),'browser inventory differs'
  for name,sha in browser_files.items():assert digest(cache/name)==sha,name
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True);assert browser.version=='153.0.8010.12',browser.version;browser.close()
 shutil.copyfile(source/'local-policy.json',out/'local-policy.json')
 subprocess.run(['node','tools/build_observer_mainnet.mjs','--local-test-config',str(out/'local-policy.json'),'--output',str(out/'local-assets')],check=True)
 subprocess.run(['node','tools/build_observer_mainnet.mjs','--canister','s34gv-3qaaa-aaaar-qcifa-cai','--output',str(out/'mainnet-assets')],check=True)
 assert json.loads((out/'mainnet-assets/build-manifest.json').read_text())['files']==json.loads((source/'frontend-manifest.json').read_text())['files']
 subprocess.run(['cargo','test','--manifest-path','tools/s09-integration/Cargo.toml','--test','s14_index','--no-run','--locked','--message-format=json'],check=True,stdout=(out/'build.jsonl').open('w'))
 binaries=[d['executable']for line in(out/'build.jsonl').read_text().splitlines()if line.startswith('{')and(d:=json.loads(line)).get('reason')=='compiler-artifact'and d.get('executable')];assert len(binaries)==1
 shutil.copyfile(binaries[0],out/'harness');(out/'harness').chmod(0o755)
 from verify_s09_local import start_pocketic,stop_pocketic
 artifacts=Path.home()/'dtr-s09-artifacts'
 server=start_pocketic(artifacts/'bin/pocket-ic',out,hard_ttl_seconds=300,idle_ttl_seconds=250)
 try:
  env={**os.environ,'POCKET_IC_SERVER_URL':server[3],'ICP_LEDGER_WASM':str(artifacts/'wasm/ledger-canister.wasm'),'ICP_INDEX_WASM':str(artifacts/'wasm/ic-icp-index-canister.wasm'),'B2Z_S14_WASM':str(out/'A0.wasm'),'B2Z_PROFILE_FIDUCIARY':'1'}
  with(out/'binding.log').open('w')as log:subprocess.run([str(out/'harness'),'delivery_public_binding','--exact','--ignored','--nocapture'],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
 finally:stop_pocketic(*server[:3])
 files=sorted(p for p in out.rglob('*')if p.is_file());(out/'SHA256SUMS').write_text(''.join(digest(p)+'  '+str(p.relative_to(out))+'\n'for p in files))
 with open(os.environ.get('GITHUB_ENV',out/'environment'),'a')as env:
  env.write('DELIVERY_HARNESS_SHA='+digest(out/'harness')+'\n')
 (out/'ready').write_text('downloads, asset generation, browser installation and compilation complete\n')
if __name__=='__main__':main()
