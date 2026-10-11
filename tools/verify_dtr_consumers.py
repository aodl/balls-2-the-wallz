#!/usr/bin/env python3
"""Rebuild and consume the exact DTR package/revision outside both source trees."""
import argparse
import base64
import datetime
import hashlib
import json
import os
import signal
import shutil
import subprocess
import tarfile
import tempfile
import time
import tomllib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DTR_GIT='https://github.com/aodl/dtr.git'
DTR_REV='71e59e93cf49a3656689679b538b4c3f138787f8'
DTR_TREE='c7b4e138a1c5cc43744e984e6e4081fa483d9383'
VENDOR=ROOT/'vendor/dtr/dtr-timeline-runtime-0.11.0.tgz'

def digest(path,algorithm='sha256'):
    value=hashlib.new(algorithm)
    with path.open('rb') as stream:
        while chunk:=stream.read(1024*1024):value.update(chunk)
    return value.digest()

def sha256(path):return digest(path).hex()
def integrity(path):return 'sha512-'+base64.b64encode(digest(path,'sha512')).decode()

def archive_payload(path):
    payload={}
    with tarfile.open(path,'r:gz') as archive:
        for member in archive.getmembers():
            if member.isdir():continue
            if not member.isfile() or not member.name.startswith('package/'):
                raise ValueError(f'unsupported package member: {member.name}')
            relative=member.name.removeprefix('package/')
            if not relative or relative in payload:raise ValueError(f'invalid package member: {member.name}')
            payload[relative]=archive.extractfile(member).read()
    return payload

def verify_payload(payload,source):
    mismatches=[]
    for relative,content in payload.items():
        path=source/relative
        if not path.is_file() or path.read_bytes()!=content:mismatches.append(relative)
    if mismatches:raise ValueError('package payload/source mismatch: '+', '.join(mismatches))

def run(identifier,command,cwd,output,timeout,environment=None):
    log=output/'logs'/f'{identifier}.log';log.parent.mkdir(parents=True,exist_ok=True)
    started=time.monotonic();reason=None
    try:
        with log.open('w') as stream:
            process=subprocess.Popen(command,cwd=cwd,env={**os.environ,**(environment or {})},stdout=stream,stderr=subprocess.STDOUT,
              text=True,start_new_session=True)
            try:code=process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid,signal.SIGKILL);process.wait();code=124;reason=f'timeout after {timeout}s'
    except OSError as error:
        code=127;reason=str(error);log.write_text(str(error)+'\n')
    row={'id':identifier,'command':[str(part) for part in command],'status':'PASS' if code==0 else 'FAIL','exit_code':code,
      'elapsed_seconds':round(time.monotonic()-started,3),'timeout_seconds':timeout,'log':str(log.relative_to(output))}
    if reason:row['reason']=reason
    return row

def tool_version(command):
    result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,timeout=15)
    return {'command':command,'exit_code':result.returncode,'text':(result.stdout+result.stderr).strip()}

def git_value(root,*arguments):
    return subprocess.run(['git','-C',str(root),*arguments],text=True,capture_output=True,check=True,timeout=30).stdout.strip()

def normalize_source_modes(source):
    """Make npm-pack bytes independent of the checkout process umask."""
    for path in source.rglob('*'):
        if '.git' in path.relative_to(source).parts:continue
        if path.is_symlink():raise ValueError(f'unexpected source symlink: {path}')
        if path.is_dir():path.chmod(0o755)
        elif path.is_file():path.chmod(0o644)

def rust_lock_sources(path):
    lock=tomllib.loads(path.read_text());expected=f'git+{DTR_GIT}?rev={DTR_REV}#{DTR_REV}'
    names={'dtr-core','dtr-host','dtr-source-model','dtr-wire'}
    packages={row['name']:row.get('source') for row in lock['package'] if row['name'] in names}
    if set(packages)!=names or any(source!=expected for source in packages.values()):
        raise ValueError(f'Rust consumer did not lock all DTR crates to the exact remote revision: {packages}')
    return packages

def validate_vendor(source,generated):
    generated_payload=archive_payload(generated);vendor_payload=archive_payload(VENDOR)
    if len(generated_payload)!=20 or set(generated_payload)!=set(vendor_payload):raise ValueError('DTR package inventory mismatch')
    verify_payload(generated_payload,source);verify_payload(vendor_payload,source)
    if generated_payload!=vendor_payload:raise ValueError('vendored and freshly packed DTR payloads differ')
    if generated.read_bytes()!=VENDOR.read_bytes():raise ValueError('vendored DTR package is not byte-reproducible')
    lock=json.loads((ROOT/'package-lock.json').read_text())
    locked=lock['packages']['node_modules/@dtr/timeline-runtime']
    if locked.get('integrity')!=integrity(VENDOR):raise ValueError('vendored DTR package integrity does not match package-lock.json')
    readme=(ROOT/'vendor/dtr/README.md').read_text()
    if DTR_GIT not in readme or DTR_REV not in readme or sha256(VENDOR) not in readme:raise ValueError('vendored DTR origin record is incomplete')
    return sorted(generated_payload),locked['integrity']

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.work/dtr-consumers');args=parser.parse_args()
    output=args.output.resolve();output.mkdir(parents=True,exist_ok=True);destination=output/'results.json'
    report={'schema_version':1,'checkpoint':'S11','started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'overall':'IN_PROGRESS','dtr':{'remote':DTR_GIT,'revision':DTR_REV,'tree':DTR_TREE},'checks':[],
      'tools':{name:tool_version(command) for name,command in {
        'git':['git','--version'],'node':['node','--version'],'npm':['npm','--version'],
        'cargo':['cargo','+1.94.1','--version'],'rustc':['rustc','+1.94.1','--version']}.items()}}
    destination.write_text(json.dumps(report,indent=2)+'\n')
    try:
        with tempfile.TemporaryDirectory(prefix='dtr-consumers-') as directory:
            temporary=Path(directory);source=temporary/'dtr';distribution=temporary/'distribution';distribution.mkdir()
            steps=[
              ('dtr-remote-clone',['git','clone','--filter=blob:none','--no-checkout',DTR_GIT,str(source)],ROOT,900,{}),
              ('dtr-revision-checkout',['git','-C',str(source),'checkout','--detach',DTR_REV],ROOT,300,{}),
              ('dtr-npm-install',['npm','ci','--ignore-scripts'],source,600,{}),
              ('dtr-npm-pack',['npm','pack','--pack-destination',str(distribution)],source,300,{}),
            ]
            for identifier,command,cwd,timeout,environment in steps:
                if identifier=='dtr-npm-install':
                    normalize_source_modes(source)
                    report['checks'].append({'id':'dtr-package-mode-normalization','status':'PASS','exit_code':0,
                      'directories':'0755','regular_files':'0644'})
                row=run(identifier,command,cwd,output,timeout,environment);report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
                if row['status']!='PASS':report['overall']='FAIL';destination.write_text(json.dumps(report,indent=2)+'\n');return 1
            provenance={'remote':git_value(source,'remote','get-url','origin'),'revision':git_value(source,'rev-parse','HEAD'),
              'tree':git_value(source,'rev-parse','HEAD^{tree}'),'working_tree_changes':git_value(source,'status','--porcelain').splitlines()}
            if provenance['remote']!=DTR_GIT or provenance['revision']!=DTR_REV or provenance['tree']!=DTR_TREE or provenance['working_tree_changes']:
                raise ValueError(f'invalid DTR source provenance: {provenance}')
            generated=distribution/'dtr-timeline-runtime-0.11.0.tgz'
            inventory,vendor_integrity=validate_vendor(source,generated)
            report['package']={'packaging_tool':report['tools']['npm']['text'],'files':inventory,'file_count':len(inventory),
              'fresh_sha256':sha256(generated),'fresh_integrity':integrity(generated),'vendor_sha256':sha256(VENDOR),
              'vendor_integrity':vendor_integrity,'payload_source_correspondence':'PASS','byte_reproduction':'PASS'}

            js=temporary/'javascript-consumer';shutil.copytree(ROOT/'tools/fixtures/dtr-consumer-js',js)
            shutil.copyfile(generated,js/'dtr-package.tgz')
            for identifier,command in [
              ('javascript-consumer-lock',['npm','install','--package-lock-only','--ignore-scripts']),
              ('javascript-consumer-install',['npm','ci','--ignore-scripts']),
              ('javascript-consumer-api',['npm','test']),
            ]:
                row=run(identifier,command,js,output,600);report['checks'].append(row);destination.write_text(json.dumps(report,indent=2)+'\n')
                if row['status']!='PASS':report['overall']='FAIL';destination.write_text(json.dumps(report,indent=2)+'\n');return 1
            report['javascript_consumer']={'lock_sha256':sha256(js/'package-lock.json'),'location':'disposable directory outside source trees'}

            rust=temporary/'rust-consumer';shutil.copytree(ROOT/'tools/fixtures/dtr-consumer-rust',rust)
            sources=rust_lock_sources(rust/'Cargo.lock')
            environment={'CARGO_HOME':str(temporary/'cargo-home'),'CARGO_TARGET_DIR':str(temporary/'cargo-target'),
              'GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_NOSYSTEM':'1'}
            row=run('rust-consumer-remote',['cargo','+1.94.1','run','--locked'],rust,output,1200,environment)
            report['checks'].append(row);report['rust_consumer']={'lock_sha256':sha256(rust/'Cargo.lock'),'sources':sources,
              'cargo_home_started_empty':True,'git_url_rewrites_disabled':True,'location':'disposable directory outside source trees'}
            report['overall']=row['status'];destination.write_text(json.dumps(report,indent=2)+'\n')
            print('OVERALL',report['overall']);return 0 if row['status']=='PASS' else 1
    except (OSError,subprocess.SubprocessError,TimeoutError,ValueError,KeyError,json.JSONDecodeError,tarfile.TarError) as error:
        report['overall']='FAIL';report['fatal_error']=str(error);destination.write_text(json.dumps(report,indent=2)+'\n');print(f'FAIL: {error}');return 1

if __name__=='__main__':raise SystemExit(main())
