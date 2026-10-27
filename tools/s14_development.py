#!/usr/bin/env python3
"""Explicit unpublished-DTR development override; restores Cargo and JS consumers.

No Git/network operation, URL rewrite or permanent dependency is installed.
Run commands after `--`; Cargo receives a command-scoped patch file and an
optional checksum-pinned JS package temporarily replaces the ignored install.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import tomllib

ROOT=Path(__file__).resolve().parents[1]
DTR_PACKAGES={'dtr-core','dtr-source-model','dtr-host','dtr-wire'}

def frozen_dependencies(data):
    """Keep every unrelated locked version/source/checksum, including duplicates."""
    packages=tomllib.loads(data.decode())['package']
    return {(p['name'],p['version'],p.get('source','')):p.get('checksum')
            for p in packages if p['name'] not in DTR_PACKAGES}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dtr',type=Path,required=True)
    p.add_argument('--revision',required=True)
    p.add_argument('--js-package',type=Path)
    p.add_argument('--js-sha256')
    p.add_argument('command',nargs=argparse.REMAINDER)
    a=p.parse_args();dtr=a.dtr.resolve()
    actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=dtr,text=True).strip()
    if actual!=a.revision:raise SystemExit('DTR revision mismatch')
    if subprocess.check_output(['git','status','--porcelain'],cwd=dtr,text=True).strip():raise SystemExit('DTR must be clean')
    command=a.command[1:] if a.command[:1]==['--'] else a.command
    if not command:raise SystemExit('missing command')
    locks={ROOT/path:(ROOT/path).read_bytes() for path in ['Cargo.lock','native/Cargo.lock','canisters/runtime-lab/Cargo.lock','tools/s09-integration/Cargo.lock']}
    (ROOT/'.work/s14').mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='dtr-override-',dir=ROOT/'.work/s14') as directory:
        temporary=Path(directory);config=temporary/'patch.toml'
        config.write_text('[patch."https://github.com/aodl/dtr.git"]\n'+''.join(f'{name} = {{ path = "{dtr}/crates/{name}" }}\n' for name in ['dtr-core','dtr-source-model','dtr-host','dtr-wire']))
        installed=ROOT/'node_modules/@dtr/timeline-runtime'
        backup=temporary/'installed-js-package';replacement=None
        try:
            if bool(a.js_package)!=bool(a.js_sha256):
                raise SystemExit('--js-package and --js-sha256 are required together')
            if a.js_package:
                package=a.js_package.resolve();expected=a.js_sha256.lower()
                if not package.is_file() or hashlib.sha256(package.read_bytes()).hexdigest()!=expected:
                    raise SystemExit('DTR JS package checksum mismatch')
                extracted=temporary/'js-package';extracted.mkdir()
                with tarfile.open(package,'r:gz') as archive:
                    for member in archive.getmembers():
                        path=Path(member.name)
                        if path.is_absolute() or '..' in path.parts or path.parts[:1]!=('package',) or not (member.isfile() or member.isdir()):
                            raise SystemExit('unsafe DTR JS package entry')
                    archive.extractall(extracted)
                replacement=extracted/'package'
                manifest=json.loads((replacement/'package.json').read_text())
                if manifest.get('name')!='@dtr/timeline-runtime':raise SystemExit('DTR JS package identity mismatch')
                if not installed.is_dir():raise SystemExit('installed DTR JS package is missing')
                installed.replace(backup);replacement.replace(installed)
            # Deliberate temporary resolution. A new unpublished DTR version is
            # not selected from an older lock merely because a patch exists, so
            # refresh only its DTR packages, preserve every other locked package,
            # and then require --locked.
            for manifest in ['Cargo.toml','native/Cargo.toml','canisters/runtime-lab/Cargo.toml','tools/s09-integration/Cargo.toml']:
                lock_path=ROOT/Path(manifest).with_suffix('.lock')
                original=locks[lock_path]
                selected=sorted(p['name'] for p in tomllib.loads(original.decode())['package'] if p['name'] in DTR_PACKAGES)
                if not selected:raise SystemExit('missing locked DTR packages: '+manifest)
                command_update=['cargo','--config',str(config),'update','--offline','--manifest-path',manifest]
                for name in selected:command_update.extend(['--package',name])
                subprocess.run(command_update,cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
                if frozen_dependencies(original)!=frozen_dependencies(lock_path.read_bytes()):
                    raise SystemExit('unrelated dependency resolution changed: '+manifest)
                metadata=json.loads(subprocess.check_output(['cargo','--config',str(config),'metadata','--locked','--format-version','1','--offline','--manifest-path',manifest],cwd=ROOT,text=True))
                used=[Path(package['manifest_path']).resolve() for package in metadata['packages'] if package['name'] in {'dtr-core','dtr-source-model','dtr-host','dtr-wire'}]
                if not used or any(dtr not in path.parents for path in used):
                    raise SystemExit(f'unpublished DTR override was not used by {manifest}')
            env={**os.environ,'S14_DTR_CONFIG':str(config),'S14_DTR_REVISION':actual}
            if command[:2]==['cargo','clippy']:command=['cargo','clippy','--config',str(config),*command[2:]]
            elif command[0]=='cargo':command=[command[0],'--config',str(config),*command[1:]]
            return subprocess.run(command,cwd=ROOT,env=env).returncode
        finally:
            if backup.exists():
                if installed.exists():shutil.move(installed,temporary/'used-js-package')
                backup.replace(installed)
            for path,data in locks.items():path.write_bytes(data)
if __name__=='__main__':sys.exit(main())
