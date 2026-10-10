#!/usr/bin/env python3
"""Compare actual native output, when Cargo exists, with independent frozen fixtures."""
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def expected():
    rows=[]
    for index,line in enumerate(l for l in (ROOT/'tests/fixtures/btz-geometry.tsv').read_text().splitlines() if l and not l.startswith('#')):
        p=line.split('\t');rows.append('\t'.join(['btz-geometry',str(index),p[8],p[9],p[10],p[11]]))
    for index,line in enumerate(l for l in (ROOT/'tests/fixtures/btz-connectivity.tsv').read_text().splitlines() if l and not l.startswith('#')):
        p=line.split('\t');rows.append('\t'.join(['btz-cut',str(index),p[6]]))
    for line in(ROOT/'tests/fixtures/spawn-native.tsv').read_text().splitlines():
        if line and not line.startswith('#'):
            p=line.split('\t');rows.append('btz-spawn\t'+p[0]+'\t'+p[7])
    for line in(ROOT/'tests/fixtures/memos.tsv').read_text().splitlines():
        if line and not line.startswith('#'):rows.append('memo\t'+line)
    rows.append('seal\t'+(ROOT/'tests/fixtures/seal.hex').read_text().strip())
    for line in(ROOT/'tests/fixtures/life.tsv').read_text().splitlines():
        if line and not line.startswith('#'):
            p=line.split('\t');rows.append('\t'.join(['life',p[0],p[6],p[7],p[8]]))
    return rows
if __name__=='__main__':
    result=subprocess.run(['cargo','run','--quiet','--locked','--offline','-p','conformance-native'],cwd=ROOT,text=True,capture_output=True,timeout=90)
    if result.returncode:raise SystemExit(result.stderr)
    actual=result.stdout.splitlines();wanted=expected()
    if actual!=wanted:raise SystemExit('FAIL: native canonical vectors differ (missing/extra rows also fail)')
    print(f'PASS: native canonical bytes match {len(wanted)} independently generated protocol/Life/BTZ vectors.')
