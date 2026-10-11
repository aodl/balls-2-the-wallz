#!/usr/bin/env python3
"""Build and execute the bounded S10 autonomous PocketIC/browser checkpoint."""
import argparse
import importlib.util
import json
import os
import signal
import shutil
import subprocess
import sys
import time
from pathlib import Path

from verify_s09_local import execute, record_artifact, sha256, start_pocketic, stop_pocketic, version

ROOT=Path(__file__).resolve().parents[1]

def terminate(process):
    if process is not None and process.poll() is None:
        os.killpg(process.pid,signal.SIGTERM)
        try:process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=10)

def pocketic_evidence(server,binary,output):
    log=output/'logs'/'pocketic-server.log'
    return {'binary':str(binary),'sha256':sha256(binary),'version':version([str(binary),'--version']),
      'url':server[3],'log':str(log.relative_to(output)),'output_tail':log.read_text(errors='replace')[-4000:],
      'unexpected_exit_code':server[0].poll()}

def execute_live(output,environment,timeout=600):
    live=output/'live';coordination=live/'coordination';live.mkdir(parents=True,exist_ok=True);coordination.mkdir(parents=True,exist_ok=True)
    for name in ['ready.json','browser-connected','short-paused','harness-short-ready','long-paused','harness-long-ready','harness-final-ready','browser-complete','browser-failed']:
        target=live/name if name=='ready.json' else coordination/name
        target.unlink(missing_ok=True)
    cargo_log=output/'logs'/'s10-live-pocketic.log';browser_log=output/'logs'/'s10-live-browser-wrapper.log'
    cargo_command=['cargo','+1.94.1','test','--manifest-path','tools/s09-integration/Cargo.toml','--locked','--test','pocketic_host',
      'live_autonomous_ledger_browser_reconnect_upgrade_and_replay','--','--ignored','--exact','--nocapture']
    started=time.monotonic();cargo=None;browser=None
    with cargo_log.open('w') as cargo_stream,browser_log.open('w') as browser_stream:
        try:
            cargo=subprocess.Popen(cargo_command,cwd=ROOT,env={**os.environ,**environment,'DTR_S10_LIVE_DIR':str(live)},
              stdout=cargo_stream,stderr=subprocess.STDOUT,text=True,start_new_session=True)
            ready=live/'ready.json';deadline=started+60
            while time.monotonic()<deadline and not ready.is_file():
                if cargo.poll() is not None:break
                time.sleep(.05)
            if not ready.is_file():
                terminate(cargo);return {'id':'s10-live-concurrent-slice','command':cargo_command,'exit_code':cargo.returncode,
                  'status':'FAIL','elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout,
                  'log':str(cargo_log.relative_to(output)),'reason':'live harness exited or did not publish ready metadata'}
            metadata=json.loads(ready.read_text())
            browser_command=[sys.executable,'-B','tools/verify_observer_http.py','--live-config',metadata['config'],
              '--ic-gateway',metadata['gateway'],'--live-canister',metadata['canister_id'],'--coordination',str(coordination),
              '--output',str(output/'browser-live')]
            browser=subprocess.Popen(browser_command,cwd=ROOT,env=os.environ,stdout=browser_stream,stderr=subprocess.STDOUT,
              text=True,start_new_session=True)
            deadline=started+timeout
            while time.monotonic()<deadline:
                cargo_code=cargo.poll();browser_code=browser.poll()
                if cargo_code is not None and browser_code is not None:break
                if cargo_code not in (None,0) or browser_code not in (None,0):break
                time.sleep(.1)
            else:
                terminate(browser);terminate(cargo)
                return {'id':'s10-live-concurrent-slice','command':cargo_command,'exit_code':124,'status':'FAIL',
                  'elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout,'log':str(cargo_log.relative_to(output)),
                  'browser_log':str(browser_log.relative_to(output)),'reason':f'timeout after {timeout}s; owned process groups terminated'}
            if cargo.poll() is None:terminate(cargo)
            if browser.poll() is None:terminate(browser)
            status='PASS' if cargo.returncode==0 and browser.returncode==0 else 'BLOCKED' if browser.returncode==2 else 'FAIL'
            return {'id':'s10-live-concurrent-slice','command':cargo_command,'browser_command':browser_command,
              'exit_code':cargo.returncode,'browser_exit_code':browser.returncode,'status':status,
              'elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout,'log':str(cargo_log.relative_to(output)),
              'browser_log':str(browser_log.relative_to(output)),'local_instance':metadata}
        finally:
            terminate(browser);terminate(cargo)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts')
    parser.add_argument('--output',type=Path,default=ROOT/'.work/s10/local-final')
    parser.add_argument('--baseline-wasm',type=Path,help='optional prior compatible runtime used for cross-version upgrade tests')
    args=parser.parse_args()
    if sys.version_info<(3,11):parser.error('Python 3.11 or later is required')
    output=args.output.resolve();output.mkdir(parents=True,exist_ok=True);destination=output/'results.json'
    report={'schema_version':1,'checkpoint':'S10','git_revision':None,'overall':'IN_PROGRESS','checks':[],'tools':{},'tested_artifacts':[]}
    try:
        report['git_revision']=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,text=True,capture_output=True,check=True).stdout.strip()
        report['working_tree_changes']=subprocess.run(['git','status','--porcelain'],cwd=ROOT,text=True,capture_output=True,check=True).stdout.splitlines()
        report['tools']={'python':version([sys.executable,'--version']),'node':version(['node','--version']),
          'npm':version(['npm','--version']),'rustc':version(['rustc','+1.94.1','--version']),'cargo':version(['cargo','+1.94.1','--version'])}
        if importlib.util.find_spec('playwright') is None:
            report['overall']='BLOCKED';report['checks'].append({'id':'playwright-python','status':'BLOCKED','exit_code':None,
              'reason':'Install the exact tools/browser-requirements.txt into this Python 3.11 environment.'});destination.write_text(json.dumps(report,indent=2)+'\n');return 2
        artifacts=args.artifacts.resolve();wasm_dir=output/'wasm';wasm_dir.mkdir(parents=True,exist_ok=True)
        steps=[
          ('pinned-artifacts',[sys.executable,'-B','tools/fetch_s09_artifacts.py','--destination',str(artifacts),'--record',str(output/'verified-artifacts.json')],300,{}),
          ('runtime-normal-build',['cargo','+1.94.1','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked'],900,{}),
        ]
        for identifier,command,timeout,env in steps:
            row=execute(identifier,command,output,timeout,env);report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
            if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        built=ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
        normal=wasm_dir/'runtime-lab.wasm';shutil.copyfile(built,normal);record_artifact(report,'runtime-lab',normal)
        row=execute('runtime-test-hook-build',['cargo','+1.94.1','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--features','test-hooks','--locked'],output,900)
        report['checks'].append(row)
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        hooked=wasm_dir/'runtime-lab-test-hooks.wasm';shutil.copyfile(built,hooked);record_artifact(report,'runtime-lab-test-hooks',hooked)
        baseline=args.baseline_wasm.resolve() if args.baseline_wasm else normal
        if not baseline.is_file():raise ValueError(f'baseline Wasm is not a file: {baseline}')
        record_artifact(report,'baseline-runtime-lab',baseline)
        record_artifact(report,'ledger',artifacts/'wasm/ledger-canister.wasm');record_artifact(report,'ledger-archive',artifacts/'downloads/ledger-archive-node-canister.wasm.gz')
        target=output/'cargo-target';target_started_empty=not target.exists() or not any(target.iterdir());environment={'CARGO_TARGET_DIR':str(target)}
        row=execute('pocketic-harness-build',['cargo','+1.94.1','test','--manifest-path','tools/s09-integration/Cargo.toml','--locked','--test','pocketic_host','--no-run'],output,1800,environment)
        row['target_directory']=str(target);row['target_started_empty']=target_started_empty;report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
        if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
        server=None
        try:
            server=start_pocketic(artifacts/'bin/pocket-ic',output)
            integration_environment={**environment,'POCKET_IC_BIN':str(artifacts/'bin/pocket-ic'),'POCKET_IC_SERVER_URL':server[3],
              'DTR_RUNTIME_WASM':str(normal),'DTR_RUNTIME_TEST_WASM':str(hooked),'DTR_LEDGER_WASM':str(artifacts/'wasm/ledger-canister.wasm'),
              'DTR_LEDGER_ARCHIVE_WASM_GZ':str(artifacts/'downloads/ledger-archive-node-canister.wasm.gz'),'DTR_S09_EXPORT':str(output/'browser-snapshot'),
              'DTR_BASELINE_RUNTIME_WASM':str(baseline)}
            row=execute('pocketic-regressions',['cargo','+1.94.1','test','--manifest-path','tools/s09-integration/Cargo.toml','--locked','--test','pocketic_host','--','--nocapture'],output,900,integration_environment)
            row['pocketic_server']=pocketic_evidence(server,artifacts/'bin/pocket-ic',output)
            if row['pocketic_server']['unexpected_exit_code'] is not None:
                row['status']='FAIL';row['reason']=f'PocketIC server exited prematurely with {row["pocketic_server"]["unexpected_exit_code"]}'
            report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
            if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 1
            row=execute_live(output,integration_environment,900);row['pocketic_server']=pocketic_evidence(server,artifacts/'bin/pocket-ic',output)
            if row['pocketic_server']['unexpected_exit_code'] is not None:
                row['status']='FAIL';row['reason']=f'PocketIC server exited prematurely with {row["pocketic_server"]["unexpected_exit_code"]}'
            report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
            if row['status']!='PASS':report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n');return 2 if row['status']=='BLOCKED' else 1
        finally:
            if server is not None:stop_pocketic(server[0],server[1],server[2])
        row=execute('s09-certified-snapshot-regression',[sys.executable,'-B','tools/verify_observer_http.py','--local-snapshot',str(output/'browser-snapshot'),
          '--output',str(output/'browser-snapshot-regression')],output,300,allow_blocked_exit=True)
        report['checks'].append(row);report['overall']=row['status'];report['local_instance']={**report['checks'][-2].get('local_instance',{}),'server_cleaned_up':True};destination.write_text(json.dumps(report,indent=2)+'\n')
        print('OVERALL',report['overall']);return 0 if report['overall']=='PASS' else 2 if report['overall']=='BLOCKED' else 1
    except (OSError,subprocess.SubprocessError,TimeoutError,RuntimeError,ValueError,KeyError,json.JSONDecodeError) as error:
        report['overall']='FAIL';report['fatal_error']=str(error);destination.write_text(json.dumps(report,indent=2)+'\n');print(f'FAIL: {error}');return 1

if __name__=='__main__':raise SystemExit(main())
