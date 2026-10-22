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
import signal
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

from check import classify

ROOT=Path(__file__).resolve().parents[1]

def start_pocketic(binary,output,timeout=30,*,hard_ttl_seconds=900,idle_ttl_seconds=60):
    """Start one owned server so the runner can reliably stop it."""
    port_file=output/'pocketic.port'
    port_file.unlink(missing_ok=True)
    log_path=output/'logs'/'pocketic-server.log';log_path.parent.mkdir(parents=True,exist_ok=True)
    stream=log_path.open('w')
    process=subprocess.Popen(
        [str(binary),'--ttl',str(idle_ttl_seconds),'--hard-ttl',str(hard_ttl_seconds),'--port-file',str(port_file)],
        cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,text=True,start_new_session=True,
    )
    started=time.monotonic()
    try:
        while time.monotonic()-started<timeout:
            if process.poll() is not None:
                raise RuntimeError(f'PocketIC server exited with {process.returncode}; see {log_path}')
            if port_file.is_file():
                value=port_file.read_text().strip()
                if value.isdigit() and 0<int(value)<65536:
                    try:
                        with socket.create_connection(('127.0.0.1',int(value)),timeout=.25):
                            pass
                    except OSError:
                        time.sleep(.05);continue
                    if process.poll() is not None:
                        raise RuntimeError(f'PocketIC server exited with {process.returncode} after readiness; see {log_path}')
                    return process,stream,port_file,f'http://127.0.0.1:{value}/'
            time.sleep(0.05)
        raise TimeoutError(f'PocketIC server did not write a port within {timeout}s')
    except Exception:
        stop_pocketic(process,stream,port_file)
        raise

def stop_pocketic(process,stream,port_file):
    """Stop only the process group created by start_pocketic."""
    try:
        if process.poll() is None:
            os.killpg(process.pid,signal.SIGTERM)
            try:process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=10)
    finally:
        stream.close()
        port_file.unlink(missing_ok=True)

def sha256(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        while chunk:=stream.read(1024*1024):digest.update(chunk)
    return digest.hexdigest()

def execute(identifier,command,output,timeout,env=None,allow_blocked_exit=False):
    log=output/'logs'/f'{identifier}.log';log.parent.mkdir(parents=True,exist_ok=True)
    started=time.monotonic()
    try:
        with log.open('w') as stream:
            process=subprocess.Popen(command,cwd=ROOT,env={**os.environ,**(env or {})},stdout=stream,stderr=subprocess.STDOUT,text=True,start_new_session=True)
            try:
                code=process.wait(timeout=timeout);reason=None
            except subprocess.TimeoutExpired:
                os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=10)
                code=124;reason=f'timeout after {timeout}s; owned process group terminated'
    except OSError as error:
        code=127;reason=str(error);log.write_text(str(error)+'\n')
    log_text=log.read_text(errors='replace') if log.is_file() else ''
    row={'id':identifier,'command':command,'exit_code':code,'status':classify(code,log_text,allow_blocked_exit=allow_blocked_exit),
         'elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout,'log':str(log.relative_to(output))}
    if allow_blocked_exit:row['exit_contract']='project-wrapper-exit-2-is-blocked'
    if reason:row['reason']=reason
    return row

def version(command):
    result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,timeout=15)
    return {'command':command,'exit_code':result.returncode,'text':(result.stdout+result.stderr).strip()}

def record_artifact(report,name,path):
    report['tested_artifacts'].append({'name':name,'path':str(path),'sha256':sha256(path),'size':path.stat().st_size})

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts')
    parser.add_argument('--output',type=Path,default=ROOT/'.work/s09/final')
    parser.add_argument('--harness-target',type=Path,help='explicit reusable Cargo target; omitted means an isolated target')
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
        record_artifact(report,'runtime-lab',normal);destination.write_text(json.dumps(report,indent=2)+'\n')
        row=execute('runtime-test-hook-build',['cargo','+1.94.1','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--features','test-hooks','--locked'],args.output,900)
        report['checks'].append(row)
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        hooked=wasm_dir/'runtime-lab-test-hooks.wasm';shutil.copyfile(built,hooked)
        record_artifact(report,'runtime-lab-test-hooks',hooked)
        record_artifact(report,'ledger',artifacts/'wasm/ledger-canister.wasm')
        record_artifact(report,'ledger-archive',artifacts/'downloads/ledger-archive-node-canister.wasm.gz')
        harness_target=args.harness_target.resolve() if args.harness_target else args.output/'cargo-target'
        harness_started_empty=not harness_target.exists() or not any(harness_target.iterdir())
        harness_environment={'CARGO_TARGET_DIR':str(harness_target)}
        row=execute('pocketic-harness-build',['cargo','+1.94.1','test','--manifest-path','tools/s09-integration/Cargo.toml','--locked','--test','pocketic_host','--no-run'],args.output,1800,harness_environment)
        row['target_directory']=str(harness_target);row['target_started_empty']=harness_started_empty
        report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        server=None
        try:
            server=start_pocketic(artifacts/'bin/pocket-ic',args.output)
            environment={
              'POCKET_IC_BIN':str(artifacts/'bin/pocket-ic'),'POCKET_IC_SERVER_URL':server[3],
              'DTR_RUNTIME_WASM':str(normal),'DTR_RUNTIME_TEST_WASM':str(hooked),
              'DTR_LEDGER_WASM':str(artifacts/'wasm/ledger-canister.wasm'),
              'DTR_LEDGER_ARCHIVE_WASM_GZ':str(artifacts/'downloads/ledger-archive-node-canister.wasm.gz'),'DTR_S09_EXPORT':str(snapshot),
              **harness_environment,
            }
            row=execute('pocketic-authoritative-slice',['cargo','+1.94.1','test','--manifest-path','tools/s09-integration/Cargo.toml','--locked','--test','pocketic_host','--','--nocapture'],args.output,600,environment)
            server_exit=server[0].poll()
            server_log=args.output/'logs'/'pocketic-server.log'
            row['pocketic_server']={
              'binary':str(artifacts/'bin/pocket-ic'),'sha256':sha256(artifacts/'bin/pocket-ic'),
              'version':version([str(artifacts/'bin/pocket-ic'),'--version']),
              'url':server[3],'log':str(server_log.relative_to(args.output)),
              'output_tail':server_log.read_text(errors='replace')[-4000:],
              'unexpected_exit_code':server_exit,
            }
            if server_exit is not None:
                row['status']='FAIL';row['reason']=f'PocketIC server exited prematurely with {server_exit}; see {row["pocketic_server"]["log"]}'
        finally:
            if server is not None:stop_pocketic(server[0],server[1],server[2])
        report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        row=execute('browser-certified-observer',[sys.executable,'-B','tools/verify_observer_http.py','--local-snapshot',str(snapshot),'--output',str(args.output/'browser')],args.output,300,allow_blocked_exit=True)
        report['checks'].append(row)
        metadata=json.loads((snapshot/'metadata.json').read_text())
        report['local_instance']={'canister_id':metadata['canister_id'],'root_key_sha256':metadata['root_key_sha256'],'network':metadata['network'],'server_cleaned_up':True}
        report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n')
        print('OVERALL',report['overall']);return 0 if row['status']=='PASS' else 2 if row['status']=='BLOCKED' else 1
    except (OSError,subprocess.SubprocessError,TimeoutError,RuntimeError,ValueError,KeyError,json.JSONDecodeError) as error:
        report['overall']='FAIL';report['fatal_error']=str(error);destination.write_text(json.dumps(report,indent=2)+'\n');print(f'FAIL: {error}');return 1

if __name__=='__main__':raise SystemExit(main())
