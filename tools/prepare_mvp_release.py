#!/usr/bin/env python3
"""Build/freeze one normal MVP backend. Offline; never calls dfx or deploys.
Requires a clean committed source and a new output directory. npm ci precedes it.
"""
import argparse,hashlib,json,os,subprocess,tomllib
from pathlib import Path
from verify_s14_local import wasm_exports
ROOT=Path(__file__).resolve().parents[1]
DTR='282d709143dacb4bca769a4d6e72b97fc93ef518'
PACKAGE_SHA='22fb89851542ce19361a3b78a35c8a921d65e65e27890050b23cfcd1375e7720'
NORMAL_METHODS={'runtime_health','get_api_doc','game_info','player_state','cannon_state','nearby_region','action_quote','payment_receipt','prepare_torus_transition','commit_torus_transition','torus_transition_status','prepare_million_transition','commit_million_transition','million_transition_status','prepare_playability_transition','commit_playability_transition','playability_transition_status','epoch_metadata','controller_runtime','controller_funding','set_funding_paused','artifact_bundle','artifact_chunk','controller_work','lab_status','observation','observation_bundle','retained_artifact_chunk','retained_publication','retention_status','source_descriptor','pause_autonomous','poke','start_autonomous','<ic-cdk internal> timer_executor'}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(*command):return subprocess.check_output(command,cwd=ROOT,text=True,timeout=900).strip()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--event-horizon');p.add_argument('--upgrade-only',action='store_true',help='Existing funded backend: emit empty upgrade argument, never constructor examples');a=p.parse_args()
    if a.upgrade_only and a.event_horizon:raise SystemExit('An upgrade-only release preserves the existing source configuration.')
    if run('git','status','--porcelain'):raise SystemExit('Commit/review local changes before preparing release artifacts.')
    source_commit=run('git','rev-parse','HEAD');source_tree=run('git','rev-parse','HEAD^{tree}')
    out=a.output.resolve()
    if out.exists():raise SystemExit('Use a new release output directory; existing artifacts are preserved.')
    lock=tomllib.loads((ROOT/'canisters/runtime-lab/Cargo.lock').read_text())
    for name in ['dtr-host','dtr-wire']:
        source=next(x['source'] for x in lock['package'] if x['name']==name)
        if source!=f'git+https://github.com/aodl/dtr.git?rev={DTR}#{DTR}':raise SystemExit('Unexpected DTR source')
    package=ROOT/'vendor/dtr/dtr-timeline-runtime-0.15.0.tgz'
    if sha(package)!=PACKAGE_SHA:raise SystemExit('Unexpected packaged DTR identity')
    npm=json.loads((ROOT/'package-lock.json').read_text())['packages']['node_modules/@dtr/timeline-runtime']
    if npm['version']!='0.15.0' or json.loads((ROOT/'node_modules/@dtr/timeline-runtime/package.json').read_text())['version']!='0.15.0':raise SystemExit('Run npm ci --ignore-scripts with the committed lock')
    run('node','tools/generate_economics.mjs','--check')
    run('node','tools/generate_playability.mjs','--check')
    out.mkdir(parents=True)
    run('cargo','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline')
    module=ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
    exports=wasm_exports(module)
    methods={name.split(' ',1)[1] for name in exports if name.startswith(('canister_query ','canister_update '))}
    if methods!=NORMAL_METHODS:raise SystemExit('Unexpected normal Wasm interface: '+str(methods))
    player_queries={'game_info','player_state','cannon_state','nearby_region','action_quote','payment_receipt','runtime_health','get_api_doc'}
    if any('canister_query '+name not in exports or 'canister_update '+name in exports for name in player_queries):raise SystemExit('Public inspection must remain query-only')
    (out/'normal.wasm').write_bytes(module.read_bytes())
    run('python3.11','-B','tools/verify_runtime_candid.py','--output',str(out/'generated.did'))
    declared=ROOT/'canisters/runtime-lab/runtime-lab.did'
    # This application's generator prints this exact declared service.
    if (out/'generated.did').read_bytes()!=declared.read_bytes():raise SystemExit('Generated Candid differs from declared interface')
    # Publish the checked actual service, without changing executable instructions.
    run('ic-wasm',str(out/'normal.wasm'),'-o',str(out/'normal.metadata.wasm'),'metadata','candid:service','-f',str(out/'generated.did'),'-v','public','--keep-name-section')
    (out/'normal.wasm').write_bytes((out/'normal.metadata.wasm').read_bytes())
    if wasm_exports(out/'normal.wasm')!=exports:raise SystemExit('Metadata attachment changed executable exports')
    if a.upgrade_only:(out/'upgrade-argument.did').write_text('()\n')
    else:
        args=['node','tools/prepare_s14_init.mjs','--output',str(out/'init.did'),'--world-output',str(out/'world.bin'),'--profile-output',str(out/'launch.json')]
        if a.event_horizon:args+=['--event-horizon',a.event_horizon]
        run(*args)
    paths=['Cargo.lock','native/Cargo.lock','canisters/runtime-lab/Cargo.lock','tools/s09-integration/Cargo.lock','tools/fixtures/dtr-consumer-rust/Cargo.lock','package-lock.json','vendor/dtr/dtr-timeline-runtime-0.15.0.tgz','dfx.json','config/economics/prelaunch.json','config/rules/v6.json','packages/kernels/b2z/economics.generated.mjs','native/b2z-native/src/economics_generated.rs','apps/b2z-observer/configuration-playability.bin']
    if run('git','rev-parse','HEAD')!=source_commit or run('git','status','--porcelain'):
        raise SystemExit('Source changed during preparation; outputs retained but not a verified release. Use a new output directory.')
    result={'status':'PASS','source_commit':source_commit,'source_tree':source_tree,
      'build_environment':{'checkout':str(ROOT),'cargo_home':os.environ.get('CARGO_HOME',str(Path.home()/'.cargo')),
        'rustflags':{key:os.environ.get(key,'') for key in ['RUSTFLAGS','CARGO_ENCODED_RUSTFLAGS','CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS']},
        'path_packages':[{'name':p['name'],'id':p['id']} for p in json.loads(run('cargo','metadata','--manifest-path','canisters/runtime-lab/Cargo.toml','--format-version','1','--locked','--offline'))['packages'] if p['source'] is None],
        'cross_directory_byte_equality':'not claimed; Cargo path package identities, Rust symbol hashes and embedded source paths vary; identify and test every installed artifact by its exact SHA-256'},
      'dtr_revision':DTR,'javascript_package':npm,'dependency_sha256':{name:sha(ROOT/name) for name in paths},
      'memo_adapter_version_before_activation':3,'memo_adapter_version_after_v6_activation':4,'memo_format':'Historical adapters unchanged; targeted/bounded v6 Fire/New/Move only after authenticated activation; canonical BTZPAY02 unchanged','upgrade_only':a.upgrade_only,'normal_features':[],'normal_exports':exports,'artifacts':{path.name:{'sha256':sha(path),'bytes':path.stat().st_size} for path in sorted(out.iterdir()) if path.is_file()},
      'tools':{name:run(*command) for name,command in {'rustc':['rustc','--version'],'cargo':['cargo','--version'],'node':['node','--version'],'npm':['npm','--version'],'dfx':['dfx','--version'],'python':['python3.11','--version']}.items()},
      'install':'Install frozen normal.wasm explicitly. Existing funded backend: upgrade mode with empty argument only; never constructor examples or reinstall. Later test builds cannot replace the frozen copy.',
      'observer':'Build separately with the ACTUAL backend ID from this same clean checkout; retain build-manifest.json.',
      'world_transition':'Preserve the existing v5 state during code upgrade, then activate v6 through the exact committed predecessor. Never repeat v3-to-v4 or v4-to-v5; preserve all historical epochs. No downgrade/reset across v6.',
      'mainnet':'NOT_RUN','remote_ci':'NOT_RUN'}
    (out/'manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
