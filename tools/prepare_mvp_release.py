#!/usr/bin/env python3
"""Build/freeze one normal MVP backend. Offline; never calls dfx or deploys.
Requires a clean committed source and a new output directory. npm ci precedes it.
"""
import argparse,hashlib,json,subprocess,tomllib
from pathlib import Path
from verify_s14_local import wasm_exports
ROOT=Path(__file__).resolve().parents[1]
DTR='c12af747190f7e24d5e68cdf57dbb1494095a46b'
PACKAGE_SHA='324f764deeeeaf1762b2d5a3d1368287009c0c08ba7e2e3806a943e3bf42e86c'
NORMAL_METHODS={'prepare_torus_transition','commit_torus_transition','torus_transition_status','prepare_million_transition','commit_million_transition','million_transition_status','controller_runtime','controller_funding','set_funding_paused','artifact_bundle','artifact_chunk','controller_work','lab_status','observation','observation_bundle','retained_artifact_chunk','retained_publication','retention_status','source_descriptor','pause_autonomous','poke','start_autonomous','<ic-cdk internal> timer_executor'}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(*command):return subprocess.check_output(command,cwd=ROOT,text=True,timeout=900).strip()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--event-horizon');a=p.parse_args()
    if run('git','status','--porcelain'):raise SystemExit('Commit/review local changes before preparing release artifacts.')
    source_commit=run('git','rev-parse','HEAD');source_tree=run('git','rev-parse','HEAD^{tree}')
    out=a.output.resolve()
    if out.exists():raise SystemExit('Use a new release output directory; existing artifacts are preserved.')
    lock=tomllib.loads((ROOT/'canisters/runtime-lab/Cargo.lock').read_text())
    for name in ['dtr-host','dtr-wire']:
        source=next(x['source'] for x in lock['package'] if x['name']==name)
        if source!=f'git+https://github.com/aodl/dtr.git?rev={DTR}#{DTR}':raise SystemExit('Unexpected DTR source')
    package=ROOT/'vendor/dtr/dtr-timeline-runtime-0.13.0.tgz'
    if sha(package)!=PACKAGE_SHA:raise SystemExit('Unexpected packaged DTR identity')
    npm=json.loads((ROOT/'package-lock.json').read_text())['packages']['node_modules/@dtr/timeline-runtime']
    if npm['version']!='0.13.0' or json.loads((ROOT/'node_modules/@dtr/timeline-runtime/package.json').read_text())['version']!='0.13.0':raise SystemExit('Run npm ci --ignore-scripts with the committed lock')
    run('node','tools/generate_economics.mjs','--check')
    out.mkdir(parents=True)
    run('cargo','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline')
    module=ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
    exports=wasm_exports(module)
    methods={name.split(' ',1)[1] for name in exports if name.startswith(('canister_query ','canister_update '))}
    if methods!=NORMAL_METHODS:raise SystemExit('Unexpected normal Wasm interface: '+str(methods))
    (out/'normal.wasm').write_bytes(module.read_bytes())
    run('python3.11','-B','tools/verify_runtime_candid.py','--output',str(out/'generated.did'))
    declared=ROOT/'canisters/runtime-lab/runtime-lab.did'
    # This application's generator prints this exact declared service.
    if (out/'generated.did').read_bytes()!=declared.read_bytes():raise SystemExit('Generated Candid differs from declared interface')
    args=['node','tools/prepare_s14_init.mjs','--output',str(out/'init.did'),'--world-output',str(out/'world.bin'),'--profile-output',str(out/'launch.json')]
    if a.event_horizon:args+=['--event-horizon',a.event_horizon]
    run(*args)
    paths=['Cargo.lock','native/Cargo.lock','canisters/runtime-lab/Cargo.lock','tools/s09-integration/Cargo.lock','package-lock.json','vendor/dtr/dtr-timeline-runtime-0.13.0.tgz','dfx.json','config/economics/prelaunch.json','packages/kernels/b2z/economics.generated.mjs','native/b2z-native/src/economics_generated.rs','references/S14/mvp-configuration.bin']
    if run('git','rev-parse','HEAD')!=source_commit or run('git','status','--porcelain'):
        raise SystemExit('Source changed during preparation; outputs retained but not a verified release. Use a new output directory.')
    result={'status':'PASS','source_commit':source_commit,'source_tree':source_tree,
      'dtr_revision':DTR,'javascript_package':npm,'dependency_sha256':{name:sha(ROOT/name) for name in paths},
      'memo_adapter_version':3,'memo_format':'B2Z text/3 prefix-free; S15 prefixed text and binary/numeric compatibility; canonical BTZPAY02 unchanged','normal_features':[],'normal_exports':exports,'artifacts':{path.name:{'sha256':sha(path),'bytes':path.stat().st_size} for path in sorted(out.iterdir()) if path.is_file()},
      'tools':{name:run(*command) for name,command in {'rustc':['rustc','--version'],'cargo':['cargo','--version'],'node':['node','--version'],'npm':['npm','--version'],'dfx':['dfx','--version'],'python':['python3.11','--version']}.items()},
      'install':'User installs normal.wasm with explicit --wasm; later test builds cannot replace this frozen copy.',
      'observer':'Build separately with the ACTUAL backend ID from this same clean checkout; retain build-manifest.json.',
      'world_transition':'Fixed controller-prepared v3-to-v4 epoch checkpoint; never use generated init examples on the existing funded canister.',
      'mainnet':'NOT_RUN','remote_ci':'NOT_RUN'}
    (out/'manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
