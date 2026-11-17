#!/usr/bin/env python3
"""11 exact illustrative contact vectors; not a new authoritative game or installed qualification."""
import argparse,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False)
source=Path('tests/fixtures/deflector-contact-candidate.json');oracle=json.loads(source.read_text())['vectors']
js=json.loads(subprocess.check_output(['node','tools/deflector_contact_checkpoint.mjs',str(source)],text=True))
native=json.loads(subprocess.check_output(['cargo','run','--locked','--manifest-path','native/Cargo.toml','-p','b2z-native','--example','deflector_contact_checkpoint'],input=source.read_text(),text=True))
assert js==native
for expected,actual in zip(oracle,js,strict=True):
 for k in ['id','geometric_exit_time','contact_time','contact_position','outgoing_global_intercept']:assert actual[k]==expected[k],(expected['id'],k)
(a.output/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'vectors':js},indent=2)+'\n');print('PASS 11 JS/native/oracle exact geometry vectors; no installed-game claim')
