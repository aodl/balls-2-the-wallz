#!/usr/bin/env python3
"""Stage, hash, package and freshly verify a complete source checkpoint. Never deploys."""
import argparse, hashlib, json, shutil, tempfile, zipfile
from pathlib import Path
from verify_checkpoint import verify
EXCLUDE_DIRS={'target','node_modules','.git','.dfx','.work','__pycache__','.venv','venv'}
SECRET_NAMES={'identity.pem','identity.json','id_rsa','id_ed25519'}
SECRET_SUFFIXES={'.pem','.key'}
def excluded(relative):
    if any(part in EXCLUDE_DIRS for part in relative.parts):return True
    name=relative.name
    return name=='.env' or name.startswith('.env.') or name in SECRET_NAMES or relative.suffix in SECRET_SUFFIXES
def selected(root):
    root=root.resolve()
    for path in sorted(root.rglob('*')):
        relative=path.relative_to(root)
        if excluded(relative):continue
        if path.is_symlink():raise ValueError('symlink not permitted: '+str(relative))
        if path.is_file()and relative.as_posix()!='FILES.sha256'and path.suffix!='.pyc':yield path,relative

def package(root,output):
    root=root.resolve();output=output.resolve()
    if output.is_relative_to(root):raise ValueError('archive must be outside source tree')
    checkpoint=json.loads((root/'CHECKPOINT.json').read_text());identity=checkpoint['checkpoint_id']
    if not identity.isalnum():raise ValueError('unsafe checkpoint ID')
    top='dtr-suite-'+identity
    with tempfile.TemporaryDirectory(prefix='dtr-package-')as temp:
        stage=Path(temp)/top;stage.mkdir();rows=[]
        for source,relative in selected(root):
            dest=stage/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
            rows.append(hashlib.sha256(dest.read_bytes()).hexdigest()+'  '+relative.as_posix())
        manifest='\n'.join(rows)+'\n';(stage/'FILES.sha256').write_text(manifest)
        errors=verify(stage)
        if errors:raise ValueError('staged verification failed: '+repr(errors))
        output.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9)as z:
            for path in sorted(stage.rglob('*')):
                if not path.is_file():continue
                name=top+'/'+path.relative_to(stage).as_posix()
                info=zipfile.ZipInfo(name,date_time=(2026,9,20,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
                info.create_system=3;info.external_attr=(0o100755 if path.suffix=='.sh' else 0o100644)<<16
                z.writestr(info,path.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
        fresh=Path(temp)/'fresh';fresh.mkdir()
        with zipfile.ZipFile(output)as z:
            if z.testzip()is not None:raise ValueError('ZIP CRC validation failed')
            for name in z.namelist():
                target=(fresh/name).resolve()
                if not target.is_relative_to(fresh.resolve()):raise ValueError('unsafe ZIP entry')
            z.extractall(fresh)
        errors=verify(fresh/top)
        if errors:raise ValueError('fresh-extraction verification failed: '+repr(errors))
        # Keep the source tree's manifest aligned too. Build/cache directories still intentionally fail a pristine-tree check.
        (root/'FILES.sha256').write_text(manifest)
    digest=hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(output.suffix+'.sha256').write_text(digest+'  '+output.name+'\n')
    return {'archive':output.name,'sha256':digest,'payload_files':len(rows),'zip_entries':len(rows)+1,'bytes':output.stat().st_size,'manifest_verified':True,'fresh_extraction_verified':True}

def main():
    p=argparse.ArgumentParser();p.add_argument('output',type=Path);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=p.parse_args()
    print(json.dumps(package(a.root,a.output),indent=2))
if __name__=='__main__':main()
