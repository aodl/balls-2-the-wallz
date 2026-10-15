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
    p.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts');p.add_argument('--index-wasm',type=Path)
    a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
    result={'source_revision':__import__('subprocess').check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'checkpoint':'S14','overall':'NOT_RUN','checks':[],'artifacts':[],'dtr_development_revision':os.environ.get('S14_DTR_REVISION')}
    def save(): (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    files={'POCKET_IC_BIN':a.artifacts/'bin/pocket-ic','ICP_LEDGER_WASM':a.artifacts/'wasm/ledger-canister.wasm','ICP_INDEX_WASM':a.index_wasm or a.artifacts/'wasm/ic-icp-index-canister.wasm'}
    missing=[str(path) for path in files.values() if not path.is_file()]
    if missing:result.update(overall='BLOCKED',reason='Missing: '+', '.join(missing));save();return 2
    cargo=['cargo']+(['--config',os.environ['S14_DTR_CONFIG']] if os.environ.get('S14_DTR_CONFIG') else [])
    def run(name,command,timeout=900,env=None):
        row=execute(name,command,out,timeout,env);result['checks'].append(row);save()
        if row['status']!='PASS':raise RuntimeError(name+' '+row['status'])
        return (out/row['log']).read_text()
    server=None
    try:
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
        run('harness-build',cargo+['test','--manifest-path','tools/s09-integration/Cargo.toml','--test','s14_index','--no-run','--locked','--offline','--message-format=json'])
        log=(out/'logs/harness-build.log').read_text();binaries=[json.loads(line)['executable'] for line in log.splitlines() if line.startswith('{') and json.loads(line).get('reason')=='compiler-artifact' and json.loads(line).get('executable')]
        assert len(binaries)==1
        server=start_pocketic(files['POCKET_IC_BIN'],out,hard_ttl_seconds=1200)
        env={key:str(path.resolve()) for key,path in files.items()}
        env.update(POCKET_IC_SERVER_URL=server[3],BTZ_S14_WASM=str(out/'normal.wasm'),S14_TRACE=str(out/'index-trace.json'),S14_SNAPSHOT=str(out/'snapshot'),DFX_IDENTITY='codex_local',S14_SLOW_INDEX_WASM=str(ROOT/'tools/s14-index-fixture/target/wasm32-unknown-unknown/release/s14_index_fixture.wasm'))
        run('installed-index-integration',[binaries[0],'--nocapture','--test-threads=1'],900,env)
        result['overall']='PASS';save();return 0
    except Exception as e:result.update(overall='FAIL',reason=str(e));save();return 1
    finally:
        if server:stop_pocketic(*server[:3])
if __name__=='__main__':sys.exit(main())
