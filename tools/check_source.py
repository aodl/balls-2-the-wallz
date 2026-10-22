#!/usr/bin/env python3
"""Source-structure checks only. This is NOT a compiler, Candid checker or security audit."""
import hashlib, json, re, subprocess, sys, tomllib
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
            resolved=lock['packages'].get('node_modules/'+name,{})
            if name=='@dtr/timeline-runtime':
                if version!='file:vendor/dtr/dtr-timeline-runtime-0.12.0.tgz' or resolved.get('version')!='0.12.0' or resolved.get('resolved')!=version:
                    raise ValueError('DTR package artifact is not exact-pinned')
            else:
                check_version(version)
                if resolved.get('version')!=version.lstrip('='):raise ValueError('npm direct resolution missing/mismatched')
    for path,entry in lock['packages'].items():
        if not path:continue
        local_dtr=path=='node_modules/@dtr/timeline-runtime' and entry.get('resolved')=='file:vendor/dtr/dtr-timeline-runtime-0.12.0.tgz'
        if not entry.get('integrity','').startswith('sha512-') or not (entry.get('resolved','').startswith('https://') or local_dtr):
            raise ValueError('npm dependency needs HTTPS resolution and integrity')
    return True

DTR_GIT='https://github.com/aodl/dtr.git'
DTR_REV='1f47c1a0a104875bd13475d561b8d5aa10770d99'
def check_cargo_dependency(name,value,base,workspace_dependencies={}):
    if isinstance(value,str):return check_version(value)
    if value.get('workspace'):
        if name not in workspace_dependencies:raise ValueError('undefined workspace dependency: '+name)
        return
    if 'path'in value:
        if not(base/value['path']/'Cargo.toml').resolve().is_file():raise ValueError(f'missing local crate: {name}')
        return
    if value.get('git'):
        if value.get('git')!=DTR_GIT or value.get('rev')!=DTR_REV or set(value)-{'git','rev'}:
            raise ValueError('DTR Git dependency is not exact-pinned: '+name)
        return
    if 'version'in value:return check_version(value['version'])
    raise ValueError('unreviewed dependency: '+name)

def main():
    workspace=tomllib.loads((ROOT/'Cargo.toml').read_text())
    root_dependencies=workspace.get('workspace',{}).get('dependencies',{})
    for name,value in root_dependencies.items():check_cargo_dependency(name,value,ROOT,root_dependencies)
    for member in workspace['workspace']['members']:
        path=ROOT/member
        manifest=tomllib.loads((path/'Cargo.toml').read_text())
        for dep,value in manifest.get('dependencies',{}).items():
            check_cargo_dependency(dep,value,path,root_dependencies)
        if not(path/'src').is_dir():raise ValueError(f'missing source: {member}')
    lock=json.loads((ROOT/'package-lock.json').read_text())
    check_npm(json.loads((ROOT/'package.json').read_text()),lock)
    artifact=ROOT/'vendor/dtr/dtr-timeline-runtime-0.12.0.tgz'
    if hashlib.sha256(artifact.read_bytes()).hexdigest()!='933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f':raise ValueError('DTR package artifact hash')
    native=tomllib.loads((ROOT/'native/Cargo.toml').read_text())
    for name,value in native['workspace']['dependencies'].items():
        if isinstance(value,dict)and value.get('git'):check_cargo_dependency(name,value,ROOT/'native',native['workspace']['dependencies'])
        else:
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
    runtime=(ROOT/'canisters/runtime-lab/src/lib.rs').read_text()
    runtime_exports=re.findall(r'#\[ic_cdk::(?:query|update)(?:\([^\]]*\))?\]\s*(?:async\s+)?fn\s+(\w+)',runtime)
    # Source includes feature-gated test-hooks methods. The compiled normal-
    # Wasm export check in verify_s14_local.py must still reject every test_ export.
    if set(runtime_exports)!={'lab_status','retention_status','controller_work','controller_runtime','controller_funding','set_funding_paused','test_funding_fault','source_descriptor','observation','retained_publication','artifact_chunk','retained_artifact_chunk','start_autonomous','pause_autonomous','test_apply','test_liquid_budget','test_trap_next_index_reply','poke'}:raise ValueError('application export drift')
    if 'guard = "poke_guard"' not in runtime or 'is_controller' not in runtime:raise ValueError('application authorization guards missing')
    if any(name in runtime for name in ['query_blocks','ledger_hint','sync_ledger','scan_ledger_inner']):raise ValueError('retired scanner remains active')
    if 'certified_data_set'not in runtime or 'data_certificate()'not in runtime:raise ValueError('runtime certification inventory')
    for removed in ('crates/dtr-core','crates/dtr-source-model','native/dtr-host','native/dtr-wire','packages/client','packages/runtime','packages/observation','packages/storage'):
        if (ROOT/removed).exists():raise ValueError('editable DTR copy remains: '+removed)
    for manifest in ('canisters/runtime-lab/Cargo.toml','tools/s09-integration/Cargo.toml'):
        data=tomllib.loads((ROOT/manifest).read_text())
        for name,value in data.get('dependencies',{}).items():
            if name.startswith('dtr-'):check_cargo_dependency(name,value,ROOT/Path(manifest).parent)
    count=0
    for base in ('packages','apps','tools','tests/js'):
        for path in (ROOT/base).rglob('*.mjs'):
            subprocess.run(['node','--check',str(path)],check=True,capture_output=True,timeout=10);count+=1
    for path in list((ROOT/'crates').rglob('*.rs'))+list((ROOT/'kernels').rglob('*.rs')):
        if re.search(r'\b(ic_cdk|ic_stable_structures|SystemTime|Instant)\b',path.read_text()):raise ValueError(f'ambient host dependency in pure code: {path}')
    print(f'PASS: {len(workspace["workspace"]["members"])} workspace package manifests; {count} JavaScript syntax checks; application export inventory.')
    print(f'PASS: {len(native["workspace"]["members"])} native package manifests and application source inventory (not executable type/permission validation).')
    print('Qualification: Rust/Candid compilation, call behavior and access control execution are NOT verified here.')
if __name__=='__main__':
    try:main()
    except(Exception)as e:print(f'FAIL: {e}',file=sys.stderr);raise SystemExit(1)
