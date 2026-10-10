#!/usr/bin/env python3
"""Independent exact arithmetic fixtures, Python Fraction; generation is explicit, never a test side effect."""
import argparse, hashlib, json
from fractions import Fraction
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def pair(x):return [str(x.numerator),str(x.denominator)]
def produce():
    rows=[]
    for i in range(144):
        # Non-random deterministic corpus spanning signed geometry and >128-bit nonnegative credits.
        a=Fraction(((-1)**(i%3))*((1<<(8+i*13))+(i+1)*7193),2*i+3)
        b=Fraction((1<<(5+i*7))+17*i,6*i+7)
        n=(i*13)%1025
        rows.append(dict(id=i,a=pair(a),b=pair(b),scale=n,sum=pair(a+b),difference=pair(a-b),scaled=pair(a*n),comparison=(a>b)-(a<b)))
    return {'version':4,'provenance':'Independent Python fractions.Fraction arithmetic; deterministic corpus, no application import.', 'cases':rows}
def main():
    p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
    path=ROOT/'tests/fixtures/numeric-v4.json';text=json.dumps(produce(),indent=2)+'\n'
    if a.write:path.write_text(text)
    elif not a.check or path.read_text()!=text:raise SystemExit('numeric fixture drift / choose --check or --write')
    print('PASS: 144 independent exact-fraction arithmetic fixtures.')
if __name__=='__main__':main()
