#!/usr/bin/env python3
"""Repository-aware, bounded checks. Exit 0=pass, 1=failure, 2=blocked; no silent skips."""
import argparse
import datetime
import hashlib
import json
import os
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
NODE_COUNTS=re.compile(r'^(?:#|ℹ)\s+(tests|pass|fail|skipped|cancelled) (\d+)$',re.M)
RUST_COUNTS=re.compile(r'test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored;')
# Only these repository-owned wrappers document exit 2 as a missing-prerequisite result.
# Compiler, test, argparse and arbitrary external exits are failures by default.
BLOCKED_EXIT_CHECKS={'observer-http-webcrypto','s14-index-poke-local-slice'}

def counts_for(kind,text):
    if kind=='node-tests':return {key:int(value) for key,value in NODE_COUNTS.findall(text)}
    if kind=='python-tests':return {'tests':sum(map(int,re.findall(r'^Ran (\d+) tests? in ',text,re.M)))}
    if kind=='rust-tests':
        rows=RUST_COUNTS.findall(text)
        return {'passed':sum(int(passed) for passed,_,_ in rows),'failed':sum(int(failed) for _,failed,_ in rows),'ignored':sum(int(ignored) for _,_,ignored in rows)}
    return {}

def classify(exit_code,text,kind='normal',allow_blocked_exit=False):
    """Classify process evidence; exit 2 is BLOCKED only for designated wrappers."""
    if exit_code is None:return 'BLOCKED'
    if exit_code==2 and allow_blocked_exit:return 'BLOCKED'
    if exit_code!=0:return 'FAIL'
    counts=counts_for(kind,text)
    if kind=='node-tests':
        if counts.get('tests',0)==0 or counts.get('pass')!=counts.get('tests') or any(counts.get(key,0) for key in ('fail','skipped','cancelled')):return 'FAIL'
    if kind=='python-tests':
        if counts.get('tests',0)==0 or not re.search(r'^OK$',text,re.M):return 'FAIL'
    if kind=='rust-tests':
        if counts.get('passed',0)==0 or counts.get('failed',0) or counts.get('ignored',0):return 'FAIL'
    return 'PASS'

def doctor():
    tools={}
    commands=[
        ('node',shutil.which('node'),['--version']),
        ('npm',shutil.which('npm'),['--version']),
        ('python3',sys.executable,['--version']),
        ('rustup',shutil.which('rustup'),['--version']),
        ('cargo',shutil.which('cargo'),['--version']),
        ('rustc',shutil.which('rustc'),['--version']),
        ('rustfmt',shutil.which('rustfmt'),['--version']),
        ('clippy',shutil.which('cargo'),['clippy','--version']),
        ('dfx',shutil.which('dfx'),['--version']),
        ('icp',shutil.which('icp'),['--version']),
        ('pocket-ic',shutil.which('pocket-ic'),['--version']),
        ('docker',shutil.which('docker'),['--version']),
    ]
    for name,path,args in commands:
        row={'available':path is not None,'path':path}
        if path:
            try:
                process=subprocess.run([path,*args],text=True,capture_output=True,timeout=8)
                row.update(version=(process.stdout+process.stderr).strip(),exit_code=process.returncode)
            except Exception as error:row['error']=str(error)
        tools[name]=row
    return {'platform':platform.platform(),'python':sys.version.split()[0],'tools':tools,'network':'No network installer is run by this tool.'}

def run_one(name,command,outdir,kind='normal',requires=(),timeout=90,allow_blocked_exit=False):
    log=outdir/'logs'/f'{name}.log';log.parent.mkdir(parents=True,exist_ok=True)
    missing=[tool for tool in requires if not shutil.which(tool)]
    if missing:
        message='BLOCKED: missing tool(s): '+', '.join(missing)+'\n';log.write_text(message)
        return {'id':name,'command':command,'status':'BLOCKED','exit_code':None,'log':str(log.relative_to(outdir)),'reason':message.strip(),'timeout_seconds':timeout}
    started=time.monotonic();code=None;reason=None
    try:
        with log.open('w') as stream:
            process=subprocess.Popen(command,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,text=True,start_new_session=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','TERM':'dumb'})
            try:code=process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid,signal.SIGKILL);process.wait();code=124;reason=f'Per-check timeout after {timeout}s'
    except OSError as error:
        log.write_text(str(error)+'\n');code=127;reason=str(error)
    text=log.read_text(errors='replace')
    status=classify(code,text,kind,allow_blocked_exit)
    row={'id':name,'command':command,'status':status,'exit_code':code,'log':str(log.relative_to(outdir)),'elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout}
    if allow_blocked_exit:row['exit_contract']='project-wrapper-exit-2-is-blocked'
    counts=counts_for(kind,text)
    if counts:row['counts']=counts
    if reason:row['reason']=reason
    elif status=='BLOCKED':row['reason']='Command reported BLOCKED (exit 2); see log.'
    return row

def planned_checks(mode,outdir):
    source=[
      ('b2z-naming-audit',[sys.executable,'-B','tools/check_b2z_names.py','--output',str(outdir/'naming-audit.json')],'normal',(),120),
      ('observer-recordings',['node','tools/build_observer_recordings.mjs','--check'],'normal',('node',),180),
      ('protocol-fixtures',[sys.executable,'-B','tools/reference_fixtures.py','--check'],'normal',(),120),
      ('life-reference',[sys.executable,'-B','tools/life_reference.py','--check'],'normal',(),120),
      ('b2z-reference',[sys.executable,'-B','tools/b2z_reference.py','--check'],'normal',(),120),
      ('spawn-reference',[sys.executable,'-B','tools/spawn_reference.py','--check'],'normal',(),120),
      ('impact-reference',[sys.executable,'-B','tools/impact_reference.py','--check'],'normal',(),120),
      ('b2z-full-traces',['node','tools/b2z_vectors.mjs','--check'],'normal',('node',),180),
      ('numeric-reference',[sys.executable,'-B','tools/numeric_reference.py','--check'],'normal',(),120),
      ('coordinator-vectors',['node','tools/coordinator_vectors.mjs','--check'],'normal',('node',),180),
      ('observation-v6-reference',[sys.executable,'-B','tools/observation_reference.py','--version','6','--check'],'normal',(),120),
      ('observation-reference',[sys.executable,'-B','tools/observation_reference.py','--check'],'normal',(),120),
      ('portable-cursors',['node','tools/portable_vectors.mjs','--check'],'normal',('node',),180),
      ('node-tests',['node','--test',*map(str,sorted((ROOT/'tests/js').glob('*.test.mjs')))],'node-tests',('node',),300),
      ('source-structure',[sys.executable,'-B','tools/check_source.py'],'normal',('node',),180),
      ('docs-links',[sys.executable,'-B','tools/check_docs.py'],'normal',(),120),
      ('python-tool-tests',[sys.executable,'-B','-m','unittest','discover','-s','tools','-p','test_*.py','-v'],'python-tests',(),300),
    ]
    native=[
      ('cargo-lock',['cargo','metadata','--format-version','1','--no-deps','--locked','--offline'],'normal',('cargo',),120),
      ('cargo-tests',['cargo','test','--workspace','--locked','--offline'],'rust-tests',('cargo',),900),
      ('native-vectors',[sys.executable,'-B','tools/verify_native.py'],'normal',('cargo',),300),
      ('portable-lock',['cargo','metadata','--manifest-path','native/Cargo.toml','--format-version','1','--no-deps','--locked','--offline'],'normal',('cargo',),120),
      ('portable-rust-tests',['cargo','test','--manifest-path','native/Cargo.toml','--workspace','--locked','--offline'],'rust-tests',('cargo',),900),
      ('native-public-game',[sys.executable,'-B','tools/verify_portable_native.py'],'normal',('cargo','node'),300),
      ('native-public-host',[sys.executable,'-B','tools/verify_host_native.py'],'normal',('cargo','node'),300),
      ('portable-format',['cargo','fmt','--manifest-path','native/Cargo.toml','--all','--','--check'],'normal',('cargo',),300),
      ('portable-clippy',['cargo','clippy','--manifest-path','native/Cargo.toml','--workspace','--all-targets','--locked','--offline','--','-D','warnings'],'normal',('cargo',),900),
      ('cargo-format',['cargo','fmt','--all','--','--check'],'normal',('cargo',),300),
      ('cargo-clippy',['cargo','clippy','--workspace','--all-targets','--locked','--offline','--','-D','warnings'],'normal',('cargo',),900),
    ]
    wasm=[
      ('runtime-lab-lock',['cargo','metadata','--manifest-path','canisters/runtime-lab/Cargo.toml','--format-version','1','--no-deps','--locked','--offline'],'normal',('cargo',),120),
      ('runtime-lab-wasm',['cargo','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline'],'normal',('cargo',),900),
      ('runtime-lab-candid',[sys.executable,'-B','tools/verify_runtime_candid.py','--output',str(outdir/'runtime-lab.generated.did')],'normal',('cargo',),900),
      ('runtime-lab-format',['cargo','fmt','--manifest-path','canisters/runtime-lab/Cargo.toml','--all','--','--check'],'normal',('cargo',),300),
      ('runtime-lab-clippy',['cargo','clippy','--manifest-path','canisters/runtime-lab/Cargo.toml','--target','wasm32-unknown-unknown','--all-targets','--locked','--offline','--','-D','warnings'],'normal',('cargo',),900),
    ]
    browser=[
      ('observer-http-webcrypto',[sys.executable,'-B','tools/verify_observer_http.py','--output',str(outdir/'browser-http')],'normal',(),240),
    ]
    integration=[
      ('s14-index-poke-local-slice',[sys.executable,'-B','tools/verify_s14_local.py','--output',str(outdir/'s14-local')],'normal',('cargo','node','npm'),7200),
    ]
    groups={'source':source,'native':native,'wasm':wasm,'browser':browser,'integration':integration}
    if mode=='all':return source+native+wasm+browser+integration
    return groups[mode]

def git_revision():
    try:
        process=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,text=True,capture_output=True,timeout=8)
        if process.returncode==0:return process.stdout.strip()
    except (OSError,subprocess.TimeoutExpired):pass
    return None

def snapshot_artifact(path):
    """Hash an artifact immediately, before a later feature build can replace it."""
    return {'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'size':path.stat().st_size}

def capture_tested_artifacts(name,row):
    if name=='runtime-lab-wasm' and row['status']=='PASS':
        path=ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
        if path.is_file():row['tested_artifacts']=[snapshot_artifact(path)]

def tested_artifacts(checks):
    return [artifact for row in checks for artifact in row.get('tested_artifacts',[])]

def blocked_requirements():
    return [
        ('reproducible-wasm','An independent byte-reproducible Wasm comparison remains unexecuted.'),
        ('production-ledger-scalability','The bounded full-ledger scan is a local correctness baseline, not production index/archive scalability or cost evidence.'),
        ('production-network-certificate-policy','The tested root is confined to one disposable PocketIC instance; production endpoint/root policy remains unimplemented.'),
        ('financial-and-settlement-integration','Admission, payouts, wallets, real ICP and settlement remain intentionally unimplemented.'),
        ('capacity-and-cost','Target-subnet capacity and measured cycle telemetry remain unverified; PocketIC cannot satisfy this gate.'),
    ]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['doctor','source','native','wasm','browser','integration','all']);parser.add_argument('--output',type=Path,default=ROOT/'.work/verification');args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True);environment=doctor();(args.output/'environment.json').write_text(json.dumps(environment,indent=2)+'\n')
    if args.mode=='doctor':
        print(json.dumps(environment,indent=2));return 0 if all(environment['tools'][tool]['available'] for tool in ('node','python3','cargo','rustc'))else 2
    report={'schema_version':1,'checkpoint':json.loads((ROOT/'CHECKPOINT.json').read_text())['checkpoint_id'],'git_revision':git_revision(),'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':args.mode,'archived_not_release_requirements':['arena-lab-v4','cross-language-private-cursor-bytes'],'checks':[],'tested_artifacts':[],'overall':'IN_PROGRESS'}
    destination=args.output/'verification.json'
    for name,command,kind,requires,timeout in planned_checks(args.mode,args.output):
        allow_blocked_exit=name in BLOCKED_EXIT_CHECKS
        row=run_one(name,command,args.output,kind,requires,timeout,allow_blocked_exit);capture_tested_artifacts(name,row)
        report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n');print(name,row['status'],flush=True)
    if args.mode=='all':
        for name,reason in blocked_requirements():report['checks'].append({'id':name,'status':'BLOCKED','exit_code':None,'reason':reason})
    report['tested_artifacts']=tested_artifacts(report['checks'])
    states=[row['status'] for row in report['checks']];report['overall']='FAIL' if 'FAIL' in states else 'BLOCKED' if 'BLOCKED' in states else 'PASS'
    destination.write_text(json.dumps(report,indent=2)+'\n');print('OVERALL',report['overall']);return 1 if report['overall']=='FAIL' else 2 if report['overall']=='BLOCKED' else 0
if __name__=='__main__':raise SystemExit(main())
