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
DTR_REV='1f47c1a0a104875bd13475d561b8d5aa10770d99'
DTR_TREE='467bd2e25b1cf356ecdced7d69e26514a764c045'
VENDOR_NPM='11.12.1'
VENDOR=ROOT/'vendor/dtr/dtr-timeline-runtime-0.12.0.tgz'

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

def validate_vendor(source,generated,packaging_npm):
    generated_payload=archive_payload(generated);vendor_payload=archive_payload(VENDOR)
    if len(generated_payload)!=20 or set(generated_payload)!=set(vendor_payload):raise ValueError('DTR package inventory mismatch')
    verify_payload(generated_payload,source);verify_payload(vendor_payload,source)
    if generated_payload!=vendor_payload:raise ValueError('vendored and freshly packed DTR payloads differ')
    byte_reproduction={'status':'NOT_RUN','reason':f'vendor used npm {VENDOR_NPM}; current packaging used npm {packaging_npm}'}
    if packaging_npm==VENDOR_NPM:
        if generated.read_bytes()!=VENDOR.read_bytes():raise ValueError('vendored DTR package is not byte-reproducible with its recorded npm version')
        byte_reproduction={'status':'PASS','qualification':'same npm version and normalized source modes'}
    lock=json.loads((ROOT/'package-lock.json').read_text())
    locked=lock['packages']['node_modules/@dtr/timeline-runtime']
    if locked.get('integrity')!=integrity(VENDOR):raise ValueError('vendored DTR package integrity does not match package-lock.json')
    readme=(ROOT/'vendor/dtr/README.md').read_text()
    if DTR_GIT not in readme or DTR_REV not in readme or sha256(VENDOR) not in readme:raise ValueError('vendored DTR origin record is incomplete')
    return sorted(generated_payload),locked['integrity'],byte_reproduction

def cargo_metadata_document(text):
    # Cargo may report ordinary dependency downloads on stderr before its single
    # JSON stdout document. Keep the exact combined log, parse only the document.
    documents=[json.loads(line) for line in text.splitlines() if line.startswith('{')]
    if len(documents)!=1 or 'packages' not in documents[0]:
        raise ValueError('Cargo metadata document missing or ambiguous')
    return documents[0]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.work/dtr-consumers');args=parser.parse_args()
    output=args.output.resolve();output.mkdir(parents=True,exist_ok=True);destination=output/'results.json'
    report={'schema_version':1,'checkpoint':'S14','started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'overall':'IN_PROGRESS','dtr':{'remote':DTR_GIT,'revision':DTR_REV,'tree':DTR_TREE},'checks':[],
      'tools':{name:tool_version(command) for name,command in {
        'git':['git','--version'],'node':['node','--version'],'npm':['npm','--version'],
        'cargo':['cargo','+1.94.1','--version'],'rustc':['rustc','+1.94.1','--version']}.items()}}
    report['btz']={'remote':git_value(ROOT,'remote','get-url','origin'),'revision':git_value(ROOT,'rev-parse','HEAD'),
      'tree':git_value(ROOT,'rev-parse','HEAD^{tree}'),'working_tree_changes':git_value(ROOT,'status','--porcelain').splitlines()}
    def save():destination.write_text(json.dumps(report,indent=2)+'\n')
    def step(identifier,command,cwd,timeout=600,environment=None):
        row=run(identifier,command,cwd,output,timeout,environment);report['checks'].append(row);save()
        if row['status']!='PASS':raise ValueError(identifier+' failed; see '+row['log'])
        return (output/row['log']).read_text()
    save()
    try:
        # Cargo obtains the exact published Git dependency through its ordinary
        # resolver. No explicit remote Git command or sibling-source override.
        cache=Path.home()/'.cache/btz-consumers';cache.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='dtr-consumers-',dir=cache) as directory:
            temporary=Path(directory);rust=temporary/'rust-consumer'
            shutil.copytree(ROOT/'tools/fixtures/dtr-consumer-rust',rust)
            sources=rust_lock_sources(rust/'Cargo.lock')
            empty_config=temporary/'empty-git-config';empty_config.write_text('')
            environment={'CARGO_HOME':str(temporary/'cargo-home'),'CARGO_TARGET_DIR':str(temporary/'cargo-target'),
              'GIT_CONFIG_GLOBAL':str(empty_config),'GIT_CONFIG_NOSYSTEM':'1','CARGO_NET_GIT_FETCH_WITH_CLI':'false'}
            report['rust_consumer']={'lock_sha256':sha256(rust/'Cargo.lock'),'sources':sources,
              'cargo_home_started_empty':True,'git_url_rewrites_disabled':True,'explicit_remote_git_commands':False,
              'location':'disposable directory outside source trees'}
            step('rust-consumer-published',['cargo','+1.94.1','run','--locked'],rust,1200,environment)
            metadata=step('published-source-location',['cargo','+1.94.1','metadata','--locked','--format-version','1'],rust,120,environment)
            metadata=cargo_metadata_document(metadata)
            core=next(package for package in metadata['packages'] if package['name']=='dtr-core')
            checkout=Path(core['manifest_path']).parents[2]
            provenance={'revision':git_value(checkout,'rev-parse','HEAD'),'tree':git_value(checkout,'rev-parse','HEAD^{tree}'),
              'tracked_changes':git_value(checkout,'status','--porcelain','--untracked-files=no').splitlines(),
              'origin':'ordinary Cargo Git dependency resolution into an initially empty CARGO_HOME'}
            if provenance['revision']!=DTR_REV or provenance['tree']!=DTR_TREE or provenance['tracked_changes']:
                raise ValueError(f'invalid DTR source provenance: {provenance}')
            report['resolved_source']=provenance;save()
            # Archive only immutable local objects downloaded by Cargo, never
            # clone/check out another remote repository in this wrapper.
            archive=temporary/'source.tar';source=temporary/'source';source.mkdir()
            step('published-source-archive',['git','-C',str(checkout),'archive','--format=tar','--output',str(archive),DTR_REV],ROOT,120)
            with tarfile.open(archive) as packed:
                for member in packed.getmembers():
                    if member.name.startswith('/') or '..' in Path(member.name).parts or not(member.isfile() or member.isdir()):
                        raise ValueError('unsupported source archive member: '+member.name)
                packed.extractall(source,filter='data')
            normalize_source_modes(source)
            distribution=temporary/'distribution';distribution.mkdir()
            step('dtr-npm-install',['npm','ci','--ignore-scripts'],source)
            step('dtr-npm-pack',['npm','pack','--ignore-scripts','--pack-destination',str(distribution)],source,300)
            generated=distribution/'dtr-timeline-runtime-0.12.0.tgz'
            packaging_npm=report['tools']['npm']['text'].removeprefix('v')
            inventory,vendor_integrity,byte_reproduction=validate_vendor(source,generated,packaging_npm)
            report['package']={'packaging_tool':report['tools']['npm']['text'],'files':inventory,'file_count':len(inventory),
              'fresh_sha256':sha256(generated),'fresh_integrity':integrity(generated),'vendor_sha256':sha256(VENDOR),
              'vendor_integrity':vendor_integrity,'vendor_packaging_tool':f'npm {VENDOR_NPM}',
              'payload_source_correspondence':'PASS','byte_reproduction':byte_reproduction}
            save()
            js=temporary/'javascript-consumer';shutil.copytree(ROOT/'tools/fixtures/dtr-consumer-js',js)
            shutil.copyfile(generated,js/'dtr-package.tgz')
            for identifier,command in [
              ('javascript-consumer-lock',['npm','install','--package-lock-only','--ignore-scripts']),
              ('javascript-consumer-install',['npm','ci','--ignore-scripts']),
              ('javascript-consumer-api',['npm','test']),
            ]:step(identifier,command,js)
            report['javascript_consumer']={'lock_sha256':sha256(js/'package-lock.json'),'location':'disposable directory outside source trees'}
            report['overall']='PASS';save();print('OVERALL PASS');return 0
    except (OSError,subprocess.SubprocessError,TimeoutError,ValueError,KeyError,StopIteration,json.JSONDecodeError,tarfile.TarError) as error:
        report['overall']='FAIL';report['fatal_error']=str(error);save();print(f'FAIL: {error}');return 1

if __name__=='__main__':raise SystemExit(main())
