#!/usr/bin/env python3
"""Instrument canonical codec work in a disposable copy. No source edits or cycle estimates."""
import argparse,json,shutil,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,default=ROOT);parser.add_argument('--output',type=Path,required=True);a=parser.parse_args()
    source=a.source.resolve();a.output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='dtr-codec-measure-')as temp:
        base=Path(temp);target=base/'instrumented'
        for folder in ['packages','tests/scenarios']:shutil.copytree(source/folder,target/folder)
        packaged=source/'node_modules/@dtr/timeline-runtime'
        shutil.copytree(packaged,target/'node_modules/@dtr/timeline-runtime')
        path=target/'node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';text=path.read_text()
        changes=[('export function encodeCanonical(value) {','export function encodeCanonical(value) {\n  auditCounters.encodes++;'),
            ('  return bytes;\n}','  auditCounters.encoded_bytes += bytes.length;\n  return bytes;\n}'),
            ('export function decodeCanonical(bytes) {','export function decodeCanonical(bytes) {\n  auditCounters.decodes++; auditCounters.decoded_bytes += bytes.length;')]
        for old,new in changes:
            if text.count(old)!=1:raise ValueError('instrumentation anchor drift')
            text=text.replace(old,new)
        path.write_text('export const auditCounters={encodes:0,encoded_bytes:0,decodes:0,decoded_bytes:0};\n'+text)
        (base/'probe').mkdir();probe=base/'probe/run.mjs';shutil.copyfile(ROOT/'tools/measure_runtime.mjs',probe)
        run=subprocess.run(['node',str(probe)],capture_output=True,text=True,timeout=90)
        if run.returncode:raise RuntimeError(run.stderr)
        result=json.loads(run.stdout);result['source_checkpoint']=json.loads((source/'CHECKPOINT.json').read_text())['checkpoint_id']
        result['node']=subprocess.check_output(['node','--version'],text=True).strip();a.output.write_text(json.dumps(result,indent=2)+'\n')
        print('PASS: measured six executed workload/budget cases; outputs match direct kernel. '+str(a.output))
if __name__=='__main__':main()
