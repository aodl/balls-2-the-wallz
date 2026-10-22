#!/usr/bin/env python3
"""Bounded S14 normal-Wasm/index/poke/replay integration. No remote Git actions.
Exit 0 PASS, 1 FAIL, 2 explicitly missing local prerequisite (BLOCKED).
Unpublished DTR: invoke through tools/s14_development.py.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tomllib
from verify_s09_local import ROOT, execute, start_pocketic, stop_pocketic

def wasm_exports(path):
    data=path.read_bytes();pos=8
    if data[:8]!=b'\0asm\x01\0\0\0':raise ValueError('not Wasm')
    def leb():
        nonlocal pos
        value=0;shift=0
        while True:
            b=data[pos];pos+=1;value|=(b&127)<<shift
            if b<128:return value
            shift+=7
    names=[]
    while pos<len(data):
        section=data[pos];pos+=1;size=leb();end=pos+size
        if section==7:
            for _ in range(leb()):
                size=leb();names.append(data[pos:pos+size].decode());pos+=size+1;leb()
        pos=end
    return names

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,default=ROOT/'.work/s14/local')
    p.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts');p.add_argument('--index-wasm',type=Path);p.add_argument('--test-filter');p.add_argument('--browser-python',default=sys.executable)
    p.add_argument('--prior-wasm',type=Path,help='Explicit reviewed S14 module for the ignored local price-transition probe')
    p.add_argument('--deployed-wasm',type=Path,help='Exact deployed 2cd80b module for state-preserving S15 upgrade test')
    p.add_argument('--current-deployed-wasm',type=Path,help='Exact installed S15 c831ec module for B2Z adapter v3 recovery')
    p.add_argument('--idle-prior-wasm',type=Path,help='Exact installed 187df3 module for idle recovery and measured cost comparison')
    p.add_argument('--arena-prior-test-wasm',type=Path,help='Prior disposable idle test-hooks module for unfinished segment recovery')
    p.add_argument('--arena-prior-wasm',type=Path,help='Exact deployed 1510d8 module for producer/pace upgrade')
    p.add_argument('--torus-prior-wasm',type=Path,help='Exact installed 53b219 module for paid v3→v4 epoch transition')
    p.add_argument('--funding-prior-wasm',type=Path,help='Exact installed 53b219 module for funding state-preserving upgrade')
    p.add_argument('--asset-canister',action='store_true',help='Rehearse dfx asset deployment on the owned PocketIC gateway')
    a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
    result={'source_revision':__import__('subprocess').check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'checkpoint':'S14','overall':'NOT_RUN','checks':[],'artifacts':[],'dtr_development_revision':os.environ.get('S14_DTR_REVISION')}
    lock=tomllib.loads((ROOT/'canisters/runtime-lab/Cargo.lock').read_text())
    host=next(package for package in lock['package'] if package['name']=='dtr-host')
    result['dependency_mode']='explicit-development-override' if os.environ.get('S14_DTR_CONFIG') else 'published-immutable-git'
    result['dtr_revision']=os.environ.get('S14_DTR_REVISION') or host.get('source','').split('#')[-1]
    result['host_lock_sha256']=hashlib.sha256((ROOT/'canisters/runtime-lab/Cargo.lock').read_bytes()).hexdigest()
    npm=json.loads((ROOT/'package-lock.json').read_text())['packages']['node_modules/@dtr/timeline-runtime']
    result['javascript_package']={'version':npm['version'],'integrity':npm['integrity'],'resolved':npm['resolved']}
    def save(): (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    files={'POCKET_IC_BIN':a.artifacts/'bin/pocket-ic','ICP_LEDGER_WASM':a.artifacts/'wasm/ledger-canister.wasm','ICP_INDEX_WASM':a.index_wasm or a.artifacts/'wasm/ic-icp-index-canister.wasm'}
    missing=[str(path) for path in files.values() if not path.is_file()]
    if missing:result.update(overall='BLOCKED',reason='Missing: '+', '.join(missing));save();return 2
    expected={'POCKET_IC_BIN':'b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db','ICP_LEDGER_WASM':'7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc','ICP_INDEX_WASM':'6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30'}
    for name,path in files.items():
        actual=hashlib.sha256(path.read_bytes()).hexdigest()
        if actual!=expected[name]:result.update(overall='FAIL',reason='pinned runtime/artifact mismatch: '+name);save();return 1
        result['artifacts'].append({'name':name,'sha256':actual,'path':str(path)})
    if not a.test_filter or 'deployed_bundle' in a.test_filter or a.test_filter=='torus_' or 'torus_browser' in a.test_filter:
        try:
            probe=__import__('subprocess').run([a.browser_python,'-c',
              "from pathlib import Path; from playwright.sync_api import sync_playwright; p=sync_playwright().start(); assert Path(p.chromium.executable_path).is_file(), 'Chromium missing'; p.stop()"],capture_output=True,text=True,timeout=20)
            if probe.returncode:raise RuntimeError(probe.stderr.strip())
        except Exception as error:
            result.update(overall='BLOCKED',reason='Local deployment browser prerequisite: '+str(error));save();return 2
    cargo=['cargo']+(['--config',os.environ['S14_DTR_CONFIG']] if os.environ.get('S14_DTR_CONFIG') else [])
    def run(name,command,timeout=900,env=None):
        row=execute(name,command,out,timeout,env);result['checks'].append(row);save()
        if row['status']!='PASS':raise RuntimeError(name+' '+row['status'])
        return (out/row['log']).read_text()
    server=None
    try:
        run('prepare-operator-genesis',['node','tools/prepare_s14_init.mjs','--world-output',str(out/'genesis-world.bin'),'--output',str(out/'example-init.did')],60)
        manifest='canisters/runtime-lab/Cargo.toml';target=ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
        for features,name in [([], 'normal'),(['--features','test-hooks'],'test-hooks')]:
            run('build-'+name,cargo+['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--locked','--offline',*features])
            dest=out/(name+'.wasm');shutil.copyfile(target,dest);names=wasm_exports(dest)
            if name=='normal':
                assert all(not any(x in n for x in ['test_','__canbench','__tracing','ledger_hint','sync_ledger','canister_update apply']) for n in names)
                assert 'canister_update poke' in names
            else:assert 'canister_update test_apply' in names
            result['artifacts'].append({'name':name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'exports':names});save()
        text=run('host-tests',cargo+['test','--manifest-path',manifest,'--locked','--offline','--','--nocapture'])
        candid=text.split('DTR_RUNTIME_CANDID_BEGIN\n',1)[1].split('\nDTR_RUNTIME_CANDID_END',1)[0]+'\n'
        (out/'generated.did').write_text(candid)
        run('build-slow-index-fixture',['cargo','build','--manifest-path','tools/s14-index-fixture/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline'])
        run('build-cmc-fixture',['cargo','build','--manifest-path','tools/cmc-funding-fixture/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline'])
        run('harness-build',cargo+['test','--manifest-path','tools/s09-integration/Cargo.toml','--test','s14_index','--no-run','--locked','--offline','--message-format=json'])
        log=(out/'logs/harness-build.log').read_text();binaries=[json.loads(line)['executable'] for line in log.splitlines() if line.startswith('{') and json.loads(line).get('reason')=='compiler-artifact' and json.loads(line).get('executable')]
        assert len(binaries)==1
        server=start_pocketic(files['POCKET_IC_BIN'],out,hard_ttl_seconds=2400)
        env={key:str(path.resolve()) for key,path in files.items()}
        env.update(POCKET_IC_SERVER_URL=server[3],B2Z_S14_WASM=str(out/'normal.wasm'),B2Z_S14_TEST_WASM=str(out/'test-hooks.wasm'),S14_TRACE=str(out/'index-trace.json'),S14_GENESIS_WORLD=str(out/'genesis-world.bin'),S14_LIVE_CLIENT_RESULT=str(out/'live-client.json'),S14_SNAPSHOT=str(out/'snapshot'),DFX_IDENTITY='codex_local',S14_BROWSER_PYTHON=a.browser_python,S14_DEPLOYMENT_OUTPUT=str(out/'deployment'),S14_SLOW_INDEX_WASM=str(ROOT/'tools/s14-index-fixture/target/wasm32-unknown-unknown/release/s14_index_fixture.wasm'))
        env['B2Z_CMC_MOCK_WASM']=str(ROOT/'tools/cmc-funding-fixture/target/wasm32-unknown-unknown/release/cmc_funding_fixture.wasm')
        if a.funding_prior_wasm:
            if hashlib.sha256(a.funding_prior_wasm.read_bytes()).hexdigest()!='53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec':raise ValueError('funding upgrade requires exact installed 53b219 module')
            env['B2Z_FUNDING_PRIOR_WASM']=str(a.funding_prior_wasm.resolve())
        if a.deployed_wasm:
            if hashlib.sha256(a.deployed_wasm.read_bytes()).hexdigest()!='2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c':raise ValueError('S15 upgrade requires exact deployed module')
            env['B2Z_DEPLOYED_WASM']=str(a.deployed_wasm.resolve())
        if a.current_deployed_wasm:
            if hashlib.sha256(a.current_deployed_wasm.read_bytes()).hexdigest()!='c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4':raise ValueError('B2Z upgrade requires exact installed S15 module')
            env['B2Z_CURRENT_DEPLOYED_WASM']=str(a.current_deployed_wasm.resolve())
        if a.idle_prior_wasm:
            if hashlib.sha256(a.idle_prior_wasm.read_bytes()).hexdigest()!='187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1':raise ValueError('idle upgrade requires exact installed module')
            env['B2Z_IDLE_PRIOR_WASM']=str(a.idle_prior_wasm.resolve())
        if a.arena_prior_wasm:
            if hashlib.sha256(a.arena_prior_wasm.read_bytes()).hexdigest()!='1510d8677464944d0d2ddad53370f339b75ab627ff0e3c8180467a3e63fa84f3':raise ValueError('arena upgrade requires exact deployed 1510d8')
            env['B2Z_ARENA_PRIOR_WASM']=str(a.arena_prior_wasm.resolve())
        if a.arena_prior_test_wasm:env['B2Z_ARENA_PRIOR_TEST_WASM']=str(a.arena_prior_test_wasm.resolve())
        if a.torus_prior_wasm:
            if hashlib.sha256(a.torus_prior_wasm.read_bytes()).hexdigest()!='53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec':raise ValueError('torus transition requires exact installed 53b219 module')
            env['B2Z_TORUS_PRIOR_WASM']=str(a.torus_prior_wasm.resolve())
        if a.asset_canister:env['S14_ASSET_CANISTER']='1'
        if a.prior_wasm:
            if not a.test_filter or hashlib.sha256(a.prior_wasm.read_bytes()).hexdigest()!='15b016b9d156a1b90feeeb9be610fc7ba51d9413509c3c7161ab8e13faacb703':raise ValueError('price-transition probe needs exact reviewed old module and explicit test filter')
            env['B2Z_PRIOR_WASM']=str(a.prior_wasm.resolve())
        # Keep each bounded suite's existing timeout. Funding uses its own
        # disposable Ledger/CMC instances, not more time inside a game test.
        test_log=run('installed-index-integration',[binaries[0],*([a.test_filter] if a.test_filter else ['--skip','funding_tests::']),*(['--ignored'] if a.prior_wasm else []),'--nocapture','--test-threads=1'],1200,env)
        if not __import__('re').search(r'test result: ok\. [1-9][0-9]* passed',test_log):raise RuntimeError('No installed tests executed')
        if not a.test_filter:
            cutover_test='funding_tests::funding_torus_cutover_preserves_pending_finance_and_outgoing_classification'
            run('installed-funding-integration',[binaries[0],'funding_tests::','--skip',cutover_test,'--nocapture','--test-threads=1'],900,env)
            run('installed-funding-cutover-integration',[binaries[0],cutover_test,'--exact','--nocapture','--test-threads=1'],300,env)
        if a.deployed_wasm:
            run('deployed-module-state-preserving-upgrade',[binaries[0],'s15_upgrade_from_deployed_module_with_players_publications_and_pending','--ignored','--nocapture','--test-threads=1'],900,env)
        if a.current_deployed_wasm:
            run('installed-s15-state-preserving-upgrade',[binaries[0],'b2z_upgrade_from_s15_with_players_publications_and_pending','--ignored','--nocapture','--test-threads=1'],900,env)
        if a.idle_prior_wasm:
            run('idle-state-preserving-upgrade',[binaries[0],'empty_arena_upgrade_preserves_players_publications_and_pending','--ignored','--nocapture','--test-threads=1'],900,env)
            run('idle-cost-comparison',[binaries[0],'empty_arena_old_new_cost_comparison','--ignored','--nocapture','--test-threads=1'],900,env)
        if a.arena_prior_wasm:
            run('arena-state-preserving-upgrade',[binaries[0],'arena_upgrade_from_installed_idle_module','--ignored','--nocapture','--test-threads=1'],900,env)
            run('arena-matched-producer-cost',[binaries[0],'arena_matched_prior_producer_cost_comparison','--ignored','--nocapture','--test-threads=1'],900,env)
        if a.arena_prior_test_wasm:
            run('arena-unfinished-upgrade',[binaries[0],'arena_unfinished_old_segment_survives_upgrade','--ignored','--nocapture','--test-threads=1'],900,env)
        if a.test_filter:
            result['overall']='PASS';save();return 0
        run('js-captured-history-replay',['node','tools/replay_s14.mjs',str(out/'index-trace.json'),str(out/'js-replay.json')],180)
        result['overall']='PASS';save();return 0
    except Exception as e:result.update(overall='FAIL',reason=str(e));save();return 1
    finally:
        if server:stop_pocketic(*server[:3])
if __name__=='__main__':sys.exit(main())
