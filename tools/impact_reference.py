#!/usr/bin/env python3
"""Independent analytical oracle for two facing balls in a straight corridor.
No event scheduler, pairing code, or JS kernel is used to calculate expectations.
"""
import argparse,json
from fractions import Fraction
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/fixtures/impact-reference.json'
def pair(f):return [str(f.numerator),str(f.denominator)]
def generate():
    cases=[];offsets=[-80,-65,-64,-63,-1,0,1,63,64,65,80]
    for i in range(132):
        ta=Fraction(192+(i*47)%400,1024);tb=ta+Fraction(offsets[i%len(offsets)],1024)
        dist=[0,64,65,200][(i//len(offsets))%4];close=abs(ta-tb)<=Fraction(1,16)and dist<=64
        if close:
            at=max(ta,tb);winner=0;scores=[9*at,9*at]
        else:
            at=min(ta,tb)+Fraction(1,16);winner=1 if ta<=tb else 2
            scores=[9*at,9*at];scores[winner-1]+=10*(1-at)
        cases.append(dict(name=f'impact-{i:03d}',left_arrival=pair(ta),right_arrival=pair(tb),
            left_x0=str(3072-int(1024*ta)),right_x0=str(3072+int(1024*tb)),left_y0='1536',right_y0=str(1536+dist),
            expected=dict(annihilates=close,resolved_at=pair(at),winner=winner,scores=[pair(s)for s in scores])))
    return dict(version=3,method='Closed-form Fraction calculation for a two-ball corridor; not a copy of the event simulator',cases=cases)
def main():
    p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args();text=json.dumps(generate(),indent=2)+'\n'
    if a.write:OUT.write_text(text)
    elif OUT.read_text()!=text:raise SystemExit('FAIL: impact oracle fixture drift')
    print('PASS: 132 independent analytical impact fixtures '+('written'if a.write else'verified'))
if __name__=='__main__':main()
