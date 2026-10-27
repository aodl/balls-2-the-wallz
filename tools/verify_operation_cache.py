#!/usr/bin/env python3
"""Bounded disposable-IC operation-cache A/B and frozen-predecessor recovery.
Consumes explicit normal Wasm artifacts; never rebuilds/substitutes them, uses a
DFX identity, connects to mainnet, submits real payments or changes dependencies.
"""
import argparse,gzip,hashlib,json,os,subprocess
from pathlib import Path
from verify_s09_local import ROOT,start_pocketic,stop_pocketic
from verify_s14_local import wasm_exports
FROZEN='7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51'
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--baseline',type=Path,required=True);p.add_argument('--prototype',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
 p.add_argument('--diagnostic',action='store_true');p.add_argument('--a1',type=Path);p.add_argument('--ticks',type=int,default=8);p.add_argument('--fiduciary',action='store_true')
 p.add_argument('--mode',choices=['profile','recovery'],default='profile');p.add_argument('--counts',default='2,3,4');p.add_argument('--work-budget',type=int,default=512);p.add_argument('--capture',type=Path);p.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts')
 a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);digest=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
 assert digest(a.baseline)==FROZEN,'exact frozen production predecessor required'
 counts=[int(n) for n in a.counts.split(',')];assert counts and all(0<=n<=64 for n in counts);assert a.work_budget in [511,512,513]
 if a.a1:assert digest(a.a1)=='fec372ec5afe5787e5fa5573c18b1d5d16201166d244a9602b276e7cee88c03b','A1 identity'
 assert 1<=a.ticks<=128
 for module in [a.baseline,a.prototype]:assert not any('test_' in n for n in wasm_exports(module)),'normal Wasm only'
 artifacts={name:a.artifacts/subpath for name,subpath in [('POCKET_IC_BIN','bin/pocket-ic'),('ICP_LEDGER_WASM','wasm/ledger-canister.wasm'),('ICP_INDEX_WASM','wasm/ic-icp-index-canister.wasm')]}
 pins={'POCKET_IC_BIN':'b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db','ICP_LEDGER_WASM':'7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc','ICP_INDEX_WASM':'6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30'}
 for name,path in artifacts.items():assert digest(path)==pins[name],name+' pin mismatch'
 command=['cargo','test','--manifest-path','tools/s09-integration/Cargo.toml','--test','s14_index','--no-run','--locked','--offline','--message-format=json']
 build=subprocess.run(command,cwd=ROOT,text=True,capture_output=True);(out/'harness-build.log').write_text(build.stdout+build.stderr);assert build.returncode==0,'harness build failed'
 binaries=[d['executable'] for line in build.stdout.splitlines() if line.startswith('{') and (d:=json.loads(line)).get('reason')=='compiler-artifact' and d.get('executable')];assert len(binaries)==1
 env={**os.environ,**{n:str(f.resolve()) for n,f in artifacts.items()},'B2Z_S14_WASM':str(a.prototype.resolve()),'B2Z_PROFILE_FROZEN_WASM':str(a.baseline.resolve()),'B2Z_PROFILE_COUNTS':a.counts,'B2Z_PROFILE_WORK_BUDGET':str(a.work_budget),'B2Z_PROFILE_FIXED_TIME_NS':'1793000000000000000','S14_DEPLOYMENT_OUTPUT':str(out)}
 if a.a1:env['B2Z_PROFILE_A1_WASM']=str(a.a1.resolve())
 else:env.pop('B2Z_PROFILE_A1_WASM',None)
 env['B2Z_PROFILE_DIAGNOSTIC']='1' if a.diagnostic else '0'
 env['B2Z_PROFILE_TICKS']=str(a.ticks)
 if a.fiduciary:env['B2Z_PROFILE_FIDUCIARY']='1'
 else:env.pop('B2Z_PROFILE_FIDUCIARY',None)
 env.pop('B2Z_PROFILE_CAPTURE',None);env.pop('S14_GENESIS_WORLD',None)
 if a.capture:env['B2Z_PROFILE_CAPTURE']=str(a.capture.resolve())
 test='operation_cache_profile'
 if a.mode=='recovery':
  test='million_paid_v4_cutover_preserves_state_and_uses_second_epoch';env.pop('B2Z_PROFILE_FIXED_TIME_NS',None)
  prior=out/'v4-predecessor.wasm';prior.write_bytes(gzip.decompress((ROOT/'vendor/b2z/pacing-c7c69ddf.wasm.gz').read_bytes()));assert digest(prior)=='c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db'
  subprocess.run(['node','tools/prepare_s14_init.mjs','--world-output',str(out/'genesis-world.bin'),'--output',str(out/'genesis-init.did')],cwd=ROOT,check=True,capture_output=True)
  subprocess.run(['cargo','build','--manifest-path','tools/cmc-funding-fixture/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline'],cwd=ROOT,check=True,capture_output=True)
  env.update(B2Z_S14_WASM=str(a.baseline.resolve()),B2Z_PROFILE_RECOVERY_WASM=str(a.prototype.resolve()),B2Z_MILLION_PRIOR_WASM=str(prior),B2Z_CMC_MOCK_WASM=str(ROOT/'tools/cmc-funding-fixture/target/wasm32-unknown-unknown/release/cmc_funding_fixture.wasm'),S14_GENESIS_WORLD=str(out/'genesis-world.bin'))
 server=start_pocketic(artifacts['POCKET_IC_BIN'],out,hard_ttl_seconds=1500,idle_ttl_seconds=1450)
 try:
  env['POCKET_IC_SERVER_URL']=server[3];args=[binaries[0],test,'--exact','--ignored','--nocapture','--test-threads=1']
  result=subprocess.run(args,cwd=ROOT,env=env,stdout=(out/'test.log').open('w'),stderr=subprocess.STDOUT,timeout=1350)
  report={'status':'PASS' if result.returncode==0 else 'FAIL','exit_code':result.returncode,'baseline_sha256':digest(a.baseline),'prototype_sha256':digest(a.prototype),'mode':a.mode,'mainnet_mutations':False,'normal_artifacts':not a.diagnostic,'instrumented':a.diagnostic};(out/'process.json').write_text(json.dumps(report,indent=2)+'\n');assert result.returncode==0,'local test failed; preserve test.log'
 finally:stop_pocketic(*server[:3])
if __name__=='__main__':main()
