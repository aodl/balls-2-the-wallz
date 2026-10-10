#!/usr/bin/env python3
"""Repository-aware, bounded checks. Exit 0=pass, 1=failure, 2=blocked; no silent skips."""
import argparse, datetime, json, os, platform, re, shutil, signal, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def classify(exit_code,text,kind='normal'):
    if exit_code is None:return 'BLOCKED'
    if exit_code!=0:return 'FAIL'
    if kind=='node-tests':
        counts={k:int(v)for k,v in re.findall(r'^# (tests|pass|fail|skipped|cancelled) (\d+)$',text,re.M)}
        if counts.get('tests',0)==0 or counts.get('pass')!=counts.get('tests') or any(counts.get(k,0)for k in('fail','skipped','cancelled')):return 'FAIL'
    if kind=='python-tests':
        counts=re.findall(r'^Ran (\d+) tests? in ',text,re.M)
        if not counts or sum(map(int,counts))==0 or not re.search(r'^OK$',text,re.M):return 'FAIL'
    if kind=='rust-tests':
        counts=re.findall(r'test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored;',text)
        if not counts or sum(int(p)for p,_,_ in counts)==0 or any(int(f)or int(i)for _,f,i in counts):return 'FAIL'
    return 'PASS'

def doctor():
    tools={}
    for name,args in [('node',['--version']),('npm',['--version']),('python3',['--version']),('cargo',['--version']),('rustc',['--version']),('dfx',['--version']),('icp',['--version']),('pocket-ic',['--version']),('docker',['--version'])]:
        path=shutil.which(name);row={'available':path is not None,'path':path}
        if path:
            try:
                p=subprocess.run([path,*args],text=True,capture_output=True,timeout=8);row.update(version=(p.stdout+p.stderr).strip(),exit_code=p.returncode)
            except Exception as e:row['error']=str(e)
        tools[name]=row
    return {'platform':platform.platform(),'python':sys.version.split()[0],'tools':tools,'network':'No network installer is run by this tool.'}

def run_one(name,command,outdir,kind='normal',requires=(),timeout=90):
    log=outdir/'logs'/f'{name}.log';log.parent.mkdir(parents=True,exist_ok=True)
    missing=[x for x in requires if not shutil.which(x)]
    if missing:
        text='BLOCKED: missing tool(s): '+', '.join(missing)+'\n';log.write_text(text)
        return {'id':name,'command':command,'status':'BLOCKED','exit_code':None,'log':str(log.relative_to(outdir)),'reason':text.strip()}
    started=time.monotonic();code=None;reason=None
    try:
        with log.open('w')as stream:
            p=subprocess.Popen(command,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,text=True,start_new_session=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','TERM':'dumb'})
            try:code=p.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid,signal.SIGKILL);p.wait();code=124;reason=f'Per-check timeout after {timeout}s'
    except OSError as e:
        log.write_text(str(e)+'\n');code=127;reason=str(e)
    text=log.read_text(errors='replace');row={'id':name,'command':command,'status':classify(code,text,kind),'exit_code':code,'log':str(log.relative_to(outdir)),'elapsed_seconds':round(time.monotonic()-started,3)}
    if reason:row['reason']=reason
    if kind=='node-tests':row['counts']={k:int(v)for k,v in re.findall(r'^# (tests|pass|fail|skipped|cancelled) (\d+)$',text,re.M)}
    return row

def main():
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['doctor','source','all']);p.add_argument('--output',type=Path,default=ROOT/'.work/verification');args=p.parse_args()
    args.output.mkdir(parents=True,exist_ok=True);env=doctor();(args.output/'environment.json').write_text(json.dumps(env,indent=2)+'\n')
    if args.mode=='doctor':
        print(json.dumps(env,indent=2));return 0 if all(env['tools'][x]['available']for x in('node','python3','cargo','rustc'))else 2
    checks=[
      ('observer-recordings',['node','tools/build_observer_recordings.mjs','--check'],'normal',('node',)),
      ('protocol-fixtures',[sys.executable,'-B','tools/reference_fixtures.py','--check'],'normal',()),
      ('life-reference',[sys.executable,'-B','tools/life_reference.py','--check'],'normal',()),
      ('btz-reference',[sys.executable,'-B','tools/btz_reference.py','--check'],'normal',()),
      ('spawn-reference',[sys.executable,'-B','tools/spawn_reference.py','--check'],'normal',()),
      ('impact-reference',[sys.executable,'-B','tools/impact_reference.py','--check'],'normal',()),
      ('btz-full-traces',['node','tools/btz_vectors.mjs','--check'],'normal',('node',)),
      ('numeric-reference',[sys.executable,'-B','tools/numeric_reference.py','--check'],'normal',()),
      ('coordinator-vectors',['node','tools/coordinator_vectors.mjs','--check'],'normal',('node',)),
      ('observation-v6-reference',[sys.executable,'-B','tools/observation_reference.py','--version','6','--check'],'normal',()),
      ('observation-reference',[sys.executable,'-B','tools/observation_reference.py','--check'],'normal',()),
      ('portable-cursors',['node','tools/portable_vectors.mjs','--check'],'normal',('node',)),
      ('node-tests',['node','--test',*map(str,sorted((ROOT/'tests/js').glob('*.test.mjs')))],'node-tests',('node',)),
      ('source-structure',[sys.executable,'-B','tools/check_source.py'],'normal',('node',)),
      ('docs-links',[sys.executable,'-B','tools/check_docs.py'],'normal',()),
      ('python-tool-tests',[sys.executable,'-B','-m','unittest','discover','-s','tools','-p','test_*.py','-v'],'python-tests',()),
    ]
    if args.mode=='all':checks += [
      ('cargo-lock',['cargo','generate-lockfile','--offline'],'normal',('cargo',)),
      ('cargo-tests',['cargo','test','--workspace','--locked','--offline'],'rust-tests',('cargo',)),
      ('native-vectors',[sys.executable,'-B','tools/verify_native.py'],'normal',('cargo',)),
      ('portable-lock',['cargo','generate-lockfile','--manifest-path','native/Cargo.toml','--offline'],'normal',('cargo',)),
      ('portable-rust-tests',['cargo','test','--manifest-path','native/Cargo.toml','--workspace','--locked','--offline'],'rust-tests',('cargo',)),
      ('native-public-game',[sys.executable,'-B','tools/verify_portable_native.py'],'normal',('cargo','node')),
      ('native-public-host',[sys.executable,'-B','tools/verify_host_native.py'],'normal',('cargo','node')),
      ('runtime-lab-lock',['cargo','generate-lockfile','--manifest-path','canisters/runtime-lab/Cargo.toml','--offline'],'normal',('cargo',)),
      ('runtime-lab-wasm',['cargo','build','--manifest-path','canisters/runtime-lab/Cargo.toml','--release','--target','wasm32-unknown-unknown','--locked','--offline'],'normal',('cargo',)),
      ('runtime-lab-format',['cargo','fmt','--manifest-path','canisters/runtime-lab/Cargo.toml','--all','--','--check'],'normal',('cargo',)),
      ('portable-format',['cargo','fmt','--manifest-path','native/Cargo.toml','--all','--','--check'],'normal',('cargo',)),
      ('portable-clippy',['cargo','clippy','--manifest-path','native/Cargo.toml','--workspace','--all-targets','--locked','--offline','--','-D','warnings'],'normal',('cargo',)),
      ('cargo-format',['cargo','fmt','--all','--','--check'],'normal',('cargo',)),
      ('cargo-clippy',['cargo','clippy','--workspace','--all-targets','--locked','--offline','--','-D','warnings'],'normal',('cargo',)),
    ]
    report={'schema_version':1,'checkpoint':json.loads((ROOT/'CHECKPOINT.json').read_text())['checkpoint_id'],'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':args.mode,'archived_not_release_requirements':['arena-lab-v4','cross-language-private-cursor-bytes'],'checks':[],'overall':'IN_PROGRESS'}
    dest=args.output/'verification.json'
    for name,command,kind,requires in checks:
        report['checks'].append(run_one(name,command,args.output,kind,requires));dest.write_text(json.dumps(report,indent=2)+'\n');print(name,report['checks'][-1]['status'],flush=True)
    if args.mode=='all':
        # These gates have no fully wired harness yet: presence of a tool alone is not evidence of execution.
        for name,why in [
            ('probe-candid-wasm','Probe dependency lock/build and generated Candid comparison not executed; Rust/IC toolchain unavailable in current environment.'),
            ('pocketic-integration','Current runtime laboratory source is wired to stable structures but actual upgrade/trap tests and pinned ledger/archive Wasm fixtures remain to be executed; no PocketIC execution claimed.'),
            ('runtime-lab-candid-and-upgrade','New runtime laboratory is uncompiled. Generated Candid, authorization, atomic stable-image publication, trap rollback and upgrade recertification must execute in PocketIC.'),
            ('dependency-and-reproducible-build','No generated native/laboratory Cargo.lock, dependency vulnerability/license audit or reproducible Wasm evidence exists.'),
            ('observer-http-webcrypto','Offline Chromium fixture tests are separate evidence. HTTP navigation, browser-native Web Crypto, production CSP, and live-certified timeline delivery have not passed in this environment.'),
            ('live-ledger-wallet','No deployed-canister capability or live-wallet memo test performed.'),
            ('certification-and-cost','Executed content/catalog verification and a fail-closed certificate dependency contract are present; real IC BLS/delegation/root-key verification, actual lab certificates, target-subnet capacity and measured cycle telemetry remain unverified.')]:
            report['checks'].append({'id':name,'status':'BLOCKED','exit_code':None,'reason':why})
    states=[x['status']for x in report['checks']];report['overall']='FAIL'if'FAIL'in states else'BLOCKED'if'BLOCKED'in states else'PASS'
    dest.write_text(json.dumps(report,indent=2)+'\n');print('OVERALL',report['overall']);return 1 if report['overall']=='FAIL'else 2 if report['overall']=='BLOCKED'else 0
if __name__=='__main__':raise SystemExit(main())
