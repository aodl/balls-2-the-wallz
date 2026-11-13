#!/usr/bin/env python3
"""Focused existing certified browser journey, unchanged reviewed normal Wasm. No mainnet."""
import argparse,hashlib,json,os,subprocess,sys
from pathlib import Path
from verify_s09_local import start_pocketic,stop_pocketic,execute
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--normal-wasm',type=Path,required=True);p.add_argument('--test-binary',type=Path,required=True);p.add_argument('--browser-python',default=sys.executable);a=p.parse_args();root=Path.cwd();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
expected='74ee4d172801e6d89987950376c4cda2015233ed605c967491e773c5b5a3f510';assert hashlib.sha256(a.normal_wasm.read_bytes()).hexdigest()==expected
subprocess.run(['git','diff','--exit-code','b0f6c7a','--','canisters/runtime-lab','native','crates','kernels','Cargo.toml','Cargo.lock','rust-toolchain.toml'],check=True)
artifacts=Path.home()/'dtr-s09-artifacts';files={'POCKET_IC_BIN':artifacts/'bin/pocket-ic','ICP_LEDGER_WASM':artifacts/'wasm/ledger-canister.wasm','ICP_INDEX_WASM':artifacts/'wasm/ic-icp-index-canister.wasm'};hashes={'POCKET_IC_BIN':'b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db','ICP_LEDGER_WASM':'7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc','ICP_INDEX_WASM':'6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30'}
for k,f in files.items():assert hashlib.sha256(f.read_bytes()).hexdigest()==hashes[k]
name='playability_installed::human_corrections_certified_startup_and_transient_recovery';assert name in subprocess.check_output([str(a.test_binary),'--list'],text=True)
server=start_pocketic(files['POCKET_IC_BIN'],out,timeout=120,hard_ttl_seconds=1260,idle_ttl_seconds=1230)
try:
 env={k:str(f)for k,f in files.items()};env.update(B2Z_S14_WASM=str(a.normal_wasm.resolve()),S14_BROWSER_PYTHON=str(Path(a.browser_python).absolute()),S14_DEPLOYMENT_OUTPUT=str(out/'deployment'),POCKET_IC_SERVER_URL=server[3],DFX_IDENTITY='codex_local',B2Z_AUDIO_QUAL='1')
 result=execute('certified-audio-browser',[str(a.test_binary),name,'--exact','--nocapture','--test-threads=1'],out,1200,env);result.update(scope=__doc__,normal_sha256=expected,backend_sources_unchanged=True);(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));sys.exit(0 if result['status']=='PASS'else 1)
finally:stop_pocketic(*server[:3])
