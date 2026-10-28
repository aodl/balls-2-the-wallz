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
 p.add_argument('--normal-timer-recovery',action='store_true');p.add_argument('--allocation-faults',action='store_true');p.add_argument('--pending-notify',action='store_true');p.add_argument('--faults-only',action='store_true');p.add_argument('--harness-bin',type=Path);p.add_argument('--harness-sha256');p.add_argument('--initial-cycles',type=int);p.add_argument('--quiet-seconds',type=int,default=300);p.add_argument('--paused-recovery',action='store_true');p.add_argument('--fault-wasm',type=Path);p.add_argument('--fragments',type=int,default=0);p.add_argument('--diagnostic',action='store_true');p.add_argument('--paid-balls',type=int,default=1);p.add_argument('--a1',type=Path);p.add_argument('--ticks',type=int,default=8);p.add_argument('--fiduciary',action='store_true')
 p.add_argument('--mode',choices=['profile','recovery','v8-browser','quiet','zero'],default='profile');p.add_argument('--counts',default='2,3,4');p.add_argument('--work-budget',type=int,default=512);p.add_argument('--capture',type=Path);p.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts')
 a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);digest=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
 assert digest(a.baseline)==FROZEN,'exact frozen production predecessor required'
 counts=[int(n) for n in a.counts.split(',')];assert counts and all(0<=n<=64 for n in counts);assert a.work_budget in [511,512,513]
 if a.a1:assert digest(a.a1)=='fec372ec5afe5787e5fa5573c18b1d5d16201166d244a9602b276e7cee88c03b','A1 identity'
 assert 1<=a.ticks<=128
 for module in [a.baseline,a.prototype]:assert not any('test_' in n for n in wasm_exports(module)),'normal Wasm only'
 artifacts={name:a.artifacts/subpath for name,subpath in [('POCKET_IC_BIN','bin/pocket-ic'),('ICP_LEDGER_WASM','wasm/ledger-canister.wasm'),('ICP_INDEX_WASM','wasm/ic-icp-index-canister.wasm')]}
 pins={'POCKET_IC_BIN':'b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db','ICP_LEDGER_WASM':'7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc','ICP_INDEX_WASM':'6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30'}
 for name,path in artifacts.items():assert digest(path)==pins[name],name+' pin mismatch'
 if bool(a.harness_bin)!=bool(a.harness_sha256):p.error('--harness-bin and --harness-sha256 are required together')
 if a.harness_bin:
  assert digest(a.harness_bin)==a.harness_sha256,'prebuilt oracle harness checksum'
  binaries=[str(a.harness_bin.resolve())]
  (out/'harness-build.log').write_text('Explicit prebuilt immutable oracle: '+binaries[0]+' SHA256 '+a.harness_sha256+'\n')
 else:
  command=['cargo','test','--manifest-path','tools/s09-integration/Cargo.toml','--test','s14_index','--no-run','--locked','--offline','--message-format=json']
  build=subprocess.run(command,cwd=ROOT,text=True,capture_output=True);(out/'harness-build.log').write_text(build.stdout+build.stderr);assert build.returncode==0,'harness build failed'
  binaries=[d['executable'] for line in build.stdout.splitlines() if line.startswith('{') and (d:=json.loads(line)).get('reason')=='compiler-artifact' and d.get('executable')];assert len(binaries)==1
 (out/'harness-identity.json').write_text(json.dumps({'executable_sha256':digest(Path(binaries[0])),'prebuilt':bool(a.harness_bin)},indent=2)+'\n')
 env={**os.environ,**{n:str(f.resolve()) for n,f in artifacts.items()},'B2Z_S14_WASM':str(a.prototype.resolve()),'B2Z_PROFILE_FROZEN_WASM':str(a.baseline.resolve()),'B2Z_PROFILE_COUNTS':a.counts,'B2Z_PROFILE_WORK_BUDGET':str(a.work_budget),'B2Z_PROFILE_FIXED_TIME_NS':'1793000000000000000','S14_DEPLOYMENT_OUTPUT':str(out)}
 if a.a1:env['B2Z_PROFILE_A1_WASM']=str(a.a1.resolve())
 else:env.pop('B2Z_PROFILE_A1_WASM',None)
 if a.initial_cycles is not None:env['B2Z_PROFILE_INITIAL_CYCLES']=str(a.initial_cycles)
 else:env.pop('B2Z_PROFILE_INITIAL_CYCLES',None)
 env['B2Z_PROFILE_QUIET_SECONDS']=str(a.quiet_seconds)
 env['B2Z_PROFILE_PAUSED_RECOVERY']='1' if a.paused_recovery else '0'
 if a.faults_only and not a.fault_wasm:p.error('--faults-only requires --fault-wasm')
 if a.allocation_faults and not (a.fault_wasm and a.faults_only):p.error('--allocation-faults requires the explicit diagnostic --fault-wasm and --faults-only')
 env['B2Z_PROFILE_NORMAL_TIMER']='1' if a.normal_timer_recovery else '0'
 env['B2Z_PROFILE_ALLOCATION_FAULTS']='1' if a.allocation_faults else '0'
 env['B2Z_PROFILE_FAULTS_ONLY']='1' if a.faults_only else '0'
 if a.fault_wasm:env['B2Z_PROFILE_FAULT_WASM']=str(a.fault_wasm.resolve())
 else:env.pop('B2Z_PROFILE_FAULT_WASM',None)
 env['B2Z_PROFILE_DIAGNOSTIC']='1' if a.diagnostic else '0'
 assert 0<=a.fragments<=10000
 env['B2Z_PROFILE_FRAGMENTS']=str(a.fragments)
 assert 1<=a.paid_balls<=4
 env['B2Z_PROFILE_PAID_BALLS']=str(a.paid_balls)
 env['B2Z_PROFILE_TICKS']=str(a.ticks)
 if a.fiduciary:env['B2Z_PROFILE_FIDUCIARY']='1'
 else:env.pop('B2Z_PROFILE_FIDUCIARY',None)
 env.pop('B2Z_PROFILE_CAPTURE',None);env.pop('S14_GENESIS_WORLD',None)
 if a.capture:env['B2Z_PROFILE_CAPTURE']=str(a.capture.resolve())
 env['B2Z_PROFILE_PENDING_NOTIFY']='1' if a.pending_notify else '0'
 env['B2Z_PROFILE_ZERO']='1' if a.mode=='zero' else '0'
 if a.mode=='profile' and 0 in counts:p.error('use --mode zero for the valid empty-arena idle case')
 test='operation_cost::quiet_profile' if a.mode in ['quiet','zero'] else 'operation_cache_profile'
 env['B2Z_PROFILE_V8_BROWSER_ONLY']='1' if a.mode=='v8-browser' else '0'
 if a.mode in ['recovery','v8-browser']:
  test='million_paid_v4_cutover_preserves_state_and_uses_second_epoch';env.pop('B2Z_PROFILE_FIXED_TIME_NS',None)
  prior=out/'v4-predecessor.wasm';prior.write_bytes(gzip.decompress((ROOT/'vendor/b2z/pacing-c7c69ddf.wasm.gz').read_bytes()));assert digest(prior)=='c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db'
  subprocess.run(['node','tools/prepare_s14_init.mjs','--world-output',str(out/'genesis-world.bin'),'--output',str(out/'genesis-init.did')],cwd=ROOT,check=True,capture_output=True)
  subprocess.run(['cargo','build','--manifest-path','tools/cmc-funding-fixture/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline'],cwd=ROOT,check=True,capture_output=True)
  env.update(B2Z_S14_WASM=str((a.prototype if a.mode=='v8-browser' else a.baseline).resolve()),B2Z_PROFILE_RECOVERY_WASM=str(a.prototype.resolve()),B2Z_MILLION_PRIOR_WASM=str(prior),B2Z_CMC_MOCK_WASM=str(ROOT/'tools/cmc-funding-fixture/target/wasm32-unknown-unknown/release/cmc_funding_fixture.wasm'),S14_GENESIS_WORLD=str(out/'genesis-world.bin'))
 deadline=2700 if a.fault_wasm else 1350
 server=start_pocketic(artifacts['POCKET_IC_BIN'],out,hard_ttl_seconds=deadline+150,idle_ttl_seconds=deadline+100)
 try:
  env['POCKET_IC_SERVER_URL']=server[3];args=[binaries[0],test,'--exact','--ignored','--nocapture','--test-threads=1']
  result=subprocess.run(args,cwd=ROOT,env=env,stdout=(out/'test.log').open('w'),stderr=subprocess.STDOUT,timeout=deadline)
  report={'status':'PASS' if result.returncode==0 else 'FAIL','exit_code':result.returncode,'baseline_sha256':digest(a.baseline),'prototype_sha256':digest(a.prototype),'mode':a.mode,'mainnet_mutations':False,'normal_artifacts':not (a.diagnostic or a.fault_wasm),'instrumented':a.diagnostic or a.allocation_faults,'fault_wasm_sha256':digest(a.fault_wasm) if a.fault_wasm else None};(out/'process.json').write_text(json.dumps(report,indent=2)+'\n');assert result.returncode==0,'local test failed; preserve test.log'
 finally:stop_pocketic(*server[:3])
if __name__=='__main__':main()
