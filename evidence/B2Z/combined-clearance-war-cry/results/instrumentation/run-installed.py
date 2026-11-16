"""Exact normal candidate / exact paid predecessor, disposable IC only; no rebuild."""
import argparse,hashlib,json,os,subprocess,sys
from pathlib import Path
sys.path.insert(0,str(Path('tools').resolve()))
from verify_s09_local import start_pocketic,stop_pocketic,execute
from verify_s14_local import installed_case_result,wasm_exports
p=argparse.ArgumentParser();p.add_argument('--wasm',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--test',choices=['launch','clearance','launch-european','clearance-european','clearance-upfront-european'],required=True);a=p.parse_args();root=a.output.resolve();root.mkdir(exist_ok=False,parents=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
normal=root/'normal-under-test.wasm';normal.write_bytes(a.wasm.read_bytes());normal_sha=sha(normal)
source_at_start=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
prior=Path('.work/europe-final/frozen/backend/normal.wasm').resolve();assert sha(prior)=='612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948'
setup=Path('.work/approved-panel-war-cry/installed-complete4').resolve();record=json.loads((setup/'results.json').read_text());hooks=setup/'test-hooks.wasm';assert sha(hooks)==next(x['sha256']for x in record['artifacts']if x['name']=='test-hooks')
for x in record['artifacts']:
 if 'path'in x:assert sha(Path(x['path']))==x['sha256']
exports=wasm_exports(normal);assert 'canister_update prepare_combined_transition'in exports and 'canister_update commit_combined_transition'in exports;assert all(not any(s in n for s in ['test_','__canbench','__tracing','ledger_hint','sync_ledger'])for n in exports)
artifacts=Path('/home/codexdev/dtr-s09-artifacts');expected={'bin/pocket-ic':'b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db','wasm/ledger-canister.wasm':'7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc','wasm/ic-icp-index-canister.wasm':'6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30'}
for name,h in expected.items():assert sha(artifacts/name)==h
r=execute('harness-build',['cargo','test','--manifest-path','tools/s09-integration/Cargo.toml','--test','s14_index','--no-run','--locked','--offline','--message-format=json'],root,300);assert r['status']=='PASS'
binary=[json.loads(s)['executable']for s in(root/'logs/harness-build.log').read_text().splitlines()if s.startswith('{')and json.loads(s).get('reason')=='compiler-artifact'and json.loads(s).get('executable')];assert len(binary)==1
selection={'clearance-upfront-european':'entry_installed::european_rules7_upgrade_before_browser_and_combined_clearance','launch':'war_cry_installed::combined_real_ledger_index_launch_and_independent_replay','clearance':'entry_installed::combined_clearance_on_normal_installed_module','launch-european':'war_cry_installed::combined_european_rules7_launch_upgrade','clearance-european':'entry_installed::european_rules7_upgrade_and_combined_clearance'}
env={'DFX_IDENTITY':'codex_local','POCKET_IC_BIN':str(artifacts/'bin/pocket-ic'),'ICP_LEDGER_WASM':str(artifacts/'wasm/ledger-canister.wasm'),'ICP_INDEX_WASM':str(artifacts/'wasm/ic-icp-index-canister.wasm'),'B2Z_S14_WASM':str(normal),'B2Z_S14_TEST_WASM':str(hooks),'S14_GENESIS_WORLD':str(setup/'genesis-world.bin'),'S14_BROWSER_PYTHON':str(Path('.work/browser-venv/bin/python').absolute()),'S14_DEPLOYMENT_OUTPUT':str(root/'deployment'),'B2Z_EUROPEAN_PRIOR_WASM':str(prior)}
subprocess.run([env['S14_BROWSER_PYTHON'],'-c','from playwright.sync_api import sync_playwright'],check=True)
(root/'deployment').mkdir();server=start_pocketic(artifacts/'bin/pocket-ic',root,hard_ttl_seconds=960,idle_ttl_seconds=930)
try:
 command=[binary[0],selection[a.test],'--exact','--nocapture','--test-threads=1']+(['--ignored']if a.test.endswith('-european')else[])
 row=execute('installed-combined',command,root,900,{**env,'POCKET_IC_SERVER_URL':server[3]});row=installed_case_result(row,(root/row['log']).read_text(),server[0].poll());result={'scope':__doc__,'source':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source_dirty':bool(subprocess.check_output(['git','status','--porcelain'],text=True)),'normal_wasm_sha256':normal_sha,'immutable_normal_sha256_at_end':sha(normal),'source_at_start':source_at_start,'prior_wasm_sha256':sha(prior),'setup_only_hooks_sha256':sha(hooks),'test':selection[a.test],'result':row};(root/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));assert sha(normal)==normal_sha;assert row['status']=='PASS'
finally:stop_pocketic(*server[:3])
