#!/usr/bin/env python3
"""Build and execute the bounded S09 PocketIC-to-browser slice.

Exit 0=PASS, 1=executed failure, 2=missing local prerequisite. Downloads are
checksum-pinned by tools/s09-artifacts.json and stored outside the checkout.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def sha256(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        while chunk:=stream.read(1024*1024):digest.update(chunk)
    return digest.hexdigest()

def execute(identifier,command,output,timeout,env=None):
    log=output/'logs'/f'{identifier}.log';log.parent.mkdir(parents=True,exist_ok=True)
    started=time.monotonic()
    try:
        with log.open('w') as stream:
            result=subprocess.run(command,cwd=ROOT,env={**os.environ,**(env or {})},stdout=stream,stderr=subprocess.STDOUT,text=True,timeout=timeout)
        code=result.returncode;reason=None
    except subprocess.TimeoutExpired:
        code=124;reason=f'timeout after {timeout}s'
    row={'id':identifier,'command':command,'exit_code':code,'status':'PASS' if code==0 else 'BLOCKED' if code==2 else 'FAIL',
         'elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout,'log':str(log.relative_to(output))}
    if reason:row['reason']=reason
    return row

def version(command):
    result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,timeout=15)
    return {'command':command,'exit_code':result.returncode,'text':(result.stdout+result.stderr).strip()}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts')
    parser.add_argument('--output',type=Path,default=ROOT/'.work/s09/final')
    args=parser.parse_args()
    if sys.version_info<(3,11):parser.error('Python 3.11 or later is required')
    args.output=args.output.resolve()
    args.output.mkdir(parents=True,exist_ok=True)
    report={'schema_version':1,'checkpoint':'S09','git_revision':None,'overall':'IN_PROGRESS','checks':[],'tools':{},'tested_artifacts':[]}
    destination=args.output/'results.json'
    try:
        revision=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,text=True,capture_output=True,check=True).stdout.strip()
        dirty=subprocess.run(['git','status','--porcelain'],cwd=ROOT,text=True,capture_output=True,check=True).stdout.splitlines()
        report['git_revision']=revision;report['working_tree_changes']=dirty
        report['tools']={
          'python':version([sys.executable,'--version']),'node':version(['node','--version']),'npm':version(['npm','--version']),
          'rustc':version(['rustc','+1.94.1','--version']),'cargo':version(['cargo','+1.94.1','--version']),
        }
        if importlib.util.find_spec('playwright') is None:
            report['checks'].append({'id':'playwright-python','status':'BLOCKED','exit_code':None,'reason':'Install the exact tools/browser-requirements.txt into this Python 3.11 environment.'})
            report['overall']='BLOCKED';destination.write_text(json.dumps(report,indent=2)+'\n');print('BLOCKED: Playwright is not installed for this Python interpreter.');return 2
        artifacts=args.artifacts.resolve();snapshot=args.output/'browser-snapshot';wasm_dir=args.output/'wasm';wasm_dir.mkdir(parents=True,exist_ok=True)
        steps=[
          ('pinned-artifacts',[sys.executable,'-B','tools/fetch_s09_artifacts.py','--destination',str(artifacts),'--record',str(args.output/'verified-artifacts.json')],300,{}),
          ('runtime-normal-build',['cargo','+1.94.1','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked'],900,{}),
        ]
        for identifier,command,timeout,env in steps:
            row=execute(identifier,command,args.output,timeout,env);report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
            if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 2 if row['status']=='BLOCKED' else 1
        built=ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
        normal=wasm_dir/'runtime-lab.wasm';shutil.copyfile(built,normal)
        row=execute('runtime-test-hook-build',['cargo','+1.94.1','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--features','test-hooks','--locked'],args.output,900)
        report['checks'].append(row)
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        hooked=wasm_dir/'runtime-lab-test-hooks.wasm';shutil.copyfile(built,hooked)
        environment={
          'POCKET_IC_BIN':str(artifacts/'bin/pocket-ic'),'DTR_RUNTIME_WASM':str(normal),'DTR_RUNTIME_TEST_WASM':str(hooked),
          'DTR_LEDGER_WASM':str(artifacts/'wasm/ledger-canister.wasm'),
          'DTR_LEDGER_ARCHIVE_WASM_GZ':str(artifacts/'downloads/ledger-archive-node-canister.wasm.gz'),'DTR_S09_EXPORT':str(snapshot),
        }
        row=execute('pocketic-authoritative-slice',['cargo','+1.94.1','test','--manifest-path','tools/s09-integration/Cargo.toml','--locked','--test','pocketic_host','--','--nocapture'],args.output,600,environment)
        report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        row=execute('browser-certified-observer',[sys.executable,'-B','tools/verify_observer_http.py','--local-snapshot',str(snapshot),'--output',str(args.output/'browser')],args.output,300)
        report['checks'].append(row)
        for name,path in [('runtime-lab',normal),('runtime-lab-test-hooks',hooked),('ledger',artifacts/'wasm/ledger-canister.wasm'),
                          ('ledger-archive',artifacts/'downloads/ledger-archive-node-canister.wasm.gz')]:
            report['tested_artifacts'].append({'name':name,'path':str(path),'sha256':sha256(path),'size':path.stat().st_size})
        metadata=json.loads((snapshot/'metadata.json').read_text())
        report['local_instance']={'canister_id':metadata['canister_id'],'root_key_sha256':metadata['root_key_sha256'],'network':metadata['network']}
        report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n')
        print('OVERALL',report['overall']);return 0 if row['status']=='PASS' else 2 if row['status']=='BLOCKED' else 1
    except (OSError,subprocess.SubprocessError,ValueError,KeyError,json.JSONDecodeError) as error:
        report['overall']='FAIL';report['fatal_error']=str(error);destination.write_text(json.dumps(report,indent=2)+'\n');print(f'FAIL: {error}');return 1

if __name__=='__main__':raise SystemExit(main())
