#!/usr/bin/env python3
"""Explicit unpublished-DTR development override; restores tracked Cargo locks.

No Git/network operation, URL rewrite or permanent path dependency is installed.
Run commands after `--`; Cargo receives an explicit command-scoped patch file.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dtr',type=Path,required=True)
    p.add_argument('--revision',required=True)
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
        config=Path(directory)/'patch.toml'
        config.write_text('[patch."https://github.com/aodl/dtr.git"]\n'+''.join(f'{name} = {{ path = "{dtr}/crates/{name}" }}\n' for name in ['dtr-core','dtr-source-model','dtr-host','dtr-wire']))
        try:
            # Deliberate temporary resolution; all actual checks still use --locked.
            for manifest in ['Cargo.toml','native/Cargo.toml','canisters/runtime-lab/Cargo.toml','tools/s09-integration/Cargo.toml']:
                subprocess.run(['cargo','--config',str(config),'metadata','--format-version','1','--offline','--manifest-path',manifest],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
            env={**os.environ,'S14_DTR_CONFIG':str(config),'S14_DTR_REVISION':actual}
            if command[0]=='cargo':command=[command[0],'--config',str(config),*command[1:]]
            return subprocess.run(command,cwd=ROOT,env=env).returncode
        finally:
            for path,data in locks.items():path.write_bytes(data)
if __name__=='__main__':sys.exit(main())
