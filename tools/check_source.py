#!/usr/bin/env python3
"""Source-structure checks only. This is NOT a compiler, Candid checker or security audit."""
import json, re, subprocess, sys, tomllib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def check_version(version):
    if not isinstance(version,str) or not re.fullmatch(r'=?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?',version):
        raise ValueError('dependency must use an exact reviewed release')
def check_npm(package,lock):
    # No empty-graph requirement. Standard reviewed libraries are preferable to bespoke substitutes.
    root=lock.get('packages',{}).get('')
    if root is None or lock.get('lockfileVersion')!=3:raise ValueError('npm lockfile required')
    if package['name']!=root['name'] or package['version']!=root['version']:raise ValueError('npm lock identity mismatch')
    for section in ['dependencies','devDependencies','optionalDependencies']:
        declared=package.get(section,{})
        if declared!=root.get(section,{}):raise ValueError('npm direct dependency lock mismatch')
        for name,version in declared.items():
            check_version(version)
            resolved=lock['packages'].get('node_modules/'+name,{})
            if resolved.get('version')!=version.lstrip('='):raise ValueError('npm direct resolution missing/mismatched')
    for path,entry in lock['packages'].items():
        if not path:continue
        if not entry.get('integrity','').startswith('sha512-') or not entry.get('resolved','').startswith('https://'):
            raise ValueError('npm dependency needs HTTPS resolution and integrity')
    return True

def main():
    workspace=tomllib.loads((ROOT/'Cargo.toml').read_text())
    for member in workspace['workspace']['members']:
        path=ROOT/member
        manifest=tomllib.loads((path/'Cargo.toml').read_text())
        for dep,value in manifest.get('dependencies',{}).items():
            if isinstance(value,dict) and 'path'in value:
                if not(path/value['path']/'Cargo.toml').resolve().is_file():raise ValueError(f'missing local crate: {dep}')
            else:check_version(value if isinstance(value,str) else value.get('version'))
        if not(path/'src').is_dir():raise ValueError(f'missing source: {member}')
    lock=json.loads((ROOT/'package-lock.json').read_text())
    check_npm(json.loads((ROOT/'package.json').read_text()),lock)
    native=tomllib.loads((ROOT/'native/Cargo.toml').read_text())
    for name,value in native['workspace']['dependencies'].items():
        version=value if isinstance(value,str)else value.get('version','')
        if not re.fullmatch(r'=\d+\.\d+\.\d+',version):raise ValueError('native dependency is not exact-pinned: '+name)
    for member in native['workspace']['members']:
        path=ROOT/'native'/member
        manifest=tomllib.loads((path/'Cargo.toml').read_text())
        for name,value in manifest.get('dependencies',{}).items():
            if value.get('workspace'):
                if name not in native['workspace']['dependencies']:raise ValueError('undefined workspace dependency')
            elif 'path'in value:
                if not(path/value['path']/'Cargo.toml').resolve().is_file():raise ValueError('native path dependency')
            else:raise ValueError('unreviewed native direct dependency')
        for rust in (path/'src').rglob('*.rs'):
            if re.search(r'\b(ic_cdk|ic_stable_structures|SystemTime|Instant|thread_rng)\b',rust.read_text()):raise ValueError('ambient effect in native kernel/tool')
    lab=(ROOT/'canisters/arena-lab/src/lib.rs').read_text()
    lab_exports=re.findall(r'#\[ic_cdk::(?:query|update)\]\s*fn\s+(\w+)',lab)
    if set(lab_exports)!={'lab_status','committed_chunk','prepare','advance','publish'}:raise ValueError('arena laboratory export drift')
    if re.search(r'\basync\b|\.await\b',lab):raise ValueError('async boundary introduced into atomic laboratory')
    if lab.count('authorized()?')!=3 or 'is_controller'not in lab:raise ValueError('laboratory guard inventory')
    for api in lab_exports:
        if api not in (ROOT/'canisters/arena-lab/arena-lab.did').read_text():raise ValueError('declared laboratory interface method absent')
    runtime=(ROOT/'canisters/runtime-lab/src/lib.rs').read_text()
    runtime_exports=re.findall(r'#\[ic_cdk::(?:query|update)\]\s*(?:async\s+)?fn\s+(\w+)',runtime)
    if set(runtime_exports)!={
      'lab_status','retention_status','controller_work','observation','retained_publication','artifact_chunk',
      'retained_artifact_chunk','start_autonomous','pause_autonomous','apply','sync_ledger','ledger_hint',
      'test_trap_after_root_write','test_fill_scan_backpressure','test_arm_scan_fault','test_source_anchor',
      'test_scan_state','test_stale_scan_completion_fence',
    }:raise ValueError('runtime laboratory export drift')
    if runtime.count('authorized()?')!=10 or 'is_controller'not in runtime:raise ValueError('runtime laboratory guard inventory')
    if 'certified_data_set'not in runtime or 'data_certificate()'not in runtime:raise ValueError('runtime certification inventory')
    for path in (ROOT/'packages/client').glob('*.mjs'):
        if 'node:'in path.read_text():raise ValueError('Node-only import in browser client')
    for path in (ROOT/'native/dtr-host/src').glob('*.rs'):
        if re.search(r'\b(btz_native|btz_mechanics|ic_cdk|SystemTime)\b',path.read_text()):raise ValueError('game/IC coupling in generic host')
    count=0
    for base in ('packages','apps','tools','tests/js'):
        for path in (ROOT/base).rglob('*.mjs'):
            subprocess.run(['node','--check',str(path)],check=True,capture_output=True,timeout=10);count+=1
    probe=(ROOT/'canisters/interface-probe/src/lib.rs').read_text()
    exported=re.findall(r'#\[ic_cdk::(?:query|update)\]\s*(?:async\s+)?fn\s+(\w+)',probe)
    if set(exported)!={'info','probe_ledger','probe_index'}:raise ValueError('unexpected probe method')
    if 'authorize_and_reserve()?' not in probe or 'is_controller' not in probe:raise ValueError('probe authorization guard missing')
    for path in list((ROOT/'crates').rglob('*.rs'))+list((ROOT/'kernels').rglob('*.rs')):
        if re.search(r'\b(ic_cdk|ic_stable_structures|SystemTime|Instant)\b',path.read_text()):raise ValueError(f'ambient host dependency in pure code: {path}')
    print(f'PASS: {len(workspace["workspace"]["members"])} workspace package manifests; {count} JavaScript syntax checks; probe export inventory.')
    print(f'PASS: {len(native["workspace"]["members"])} native package manifests and two laboratory source inventories (not executable type/permission validation).')
    print('Qualification: Rust/Candid compilation, call behavior and access control execution are NOT verified here.')
if __name__=='__main__':
    try:main()
    except(Exception)as e:print(f'FAIL: {e}',file=sys.stderr);raise SystemExit(1)
