#!/usr/bin/env python3
"""Independent Fraction oracle for the four-direction boundary checkpoint."""
from fractions import Fraction as F
import argparse,json
from pathlib import Path

Q=1024
D=22627
VELOCITIES={'NE':(D,-D),'SE':(D,D),'SW':(-D,D),'NW':(-D,-D)}
NORMALS={'N':(0,-1),'E':(1,0),'S':(0,1),'W':(-1,0)}

def encoded(v):
    return str(v.numerator) if v.denominator==1 else f'{v.numerator}/{v.denominator}'

def vectors():
    out=[]
    for o,(ax,ay) in VELOCITIES.items():
        for face,(nx,ny) in NORMALS.items():
            front=ax*nx+ay*ny>0
            ux,uy=(ax,ay) if front else (-ax,-ay)
            for k,(normal,tangent) in enumerate([(32000,0),(30001,11113),(22627,22627),(1,32000),(65536,17)]):
                vx,vy=(-nx*normal,tangent) if nx else (tangent,-ny*normal)
                axis=0 if nx else 1
                # A physical single-face point, strictly inside its edge.
                point=[F(Q if nx>0 else 0),F(Q,3)] if nx else [F(Q,3),F(Q if ny>0 else 0)]
                for time in [F(7,13),F(999999999)+F(3,7)]:
                    a=[point[0]-vx*time,point[1]-vy*time]
                    # Also include den=1 cannon-style histories separately below.
                    b=[point[0]-ux*time,point[1]-uy*time]
                    out.append({'id':f'{o}-{face}-{k}-{time}','orientation':o,'face':face,
                        'incoming':{'x0':encoded(a[0]),'y0':encoded(a[1]),'vx':vx,'vy':vy},
                        'wall':int(point[axis]),'time':encoded(time),'point':list(map(encoded,point)),
                        'front':front,'outgoing':[ux,uy],'intercept':list(map(encoded,b)),
                        'scope':'fractional diagonal histories required for admission; non-diagonal fractions are arithmetic-only stress'})
    return out

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    a.output.parent.mkdir(parents=True,exist_ok=True)
    rows=vectors();a.output.write_text(json.dumps({'scope':__doc__,'vectors':rows},indent=2)+'\n')
    print(len(rows),'independent exact face vectors')
