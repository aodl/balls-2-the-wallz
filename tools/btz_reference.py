#!/usr/bin/env python3
"""Independent geometry (Fraction) and topology (union-find) goldens; --check never edits fixtures."""
import argparse, json, random
from fractions import Fraction
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def adjacent(i, w, h):
    x,y=i%w,i//w
    return [yy*w+xx for xx,yy in [(x,y-1),(x-1,y),(x+1,y),(x,y+1)] if 0<=xx<w and 0<=yy<h]
def split_reference(cells,w,h,anchors,target,attacker,balls):
    out=list(cells); defender=out[target]; out[target]=attacker
    parent=list(range(w*h))
    def root(x):
        while parent[x]!=x:
            parent[x]=parent[parent[x]];x=parent[x]
        return x
    for i,owner in enumerate(out):
        if owner==defender:
            for j in adjacent(i,w,h):
                if out[j]==defender: parent[root(j)]=root(i)
    retained=root(anchors[defender])
    transferred=[target]
    for i,owner in enumerate(out):
        if owner==defender and root(i)!=retained:out[i]=attacker;transferred.append(i)
    surviving=[b for b in balls if out[b['cell']]==b['owner']]
    dead=sorted(set(anchors)-{b['owner']for b in surviving})
    out=[0 if owner in dead else owner for owner in out]
    return dict(cells=out,transferred=sorted(transferred),ball_ids=[b['id']for b in surviving],dead=dead,
                orphaned=sorted(set(transferred)-{target}))
def fixtures():
    rng=random.Random(0x42545A02); geometry=[];topology=[]
    for i in range(160):
        w=rng.randrange(3,13);h=rng.randrange(3,13);cell=rng.randrange(w*h);t=rng.randrange(0,1000)
        vx=rng.randrange(-4096,4097);vy=rng.randrange(-4096,4097)
        if i<8:vx,vy=[(1024,0),(-1024,0),(0,1024),(0,-1024),(1,1),(-1,1),(1,-1),(-1,-1)][i]
        if not vx and not vy:vx=1
        x=cell%w*1024+rng.randrange(1,1024);y=cell//w*1024+rng.randrange(1,1024)
        if i<8:x=cell%w*1024+512;y=cell//w*1024+512
        x0=x-vx*t;y0=y-vy*t
        tx=Fraction(((cell%w)+(vx>0))*1024-x0,vx)if vx else None
        ty=Fraction(((cell//w)+(vy>0))*1024-y0,vy)if vy else None
        future=min(v for v in [tx,ty]if v is not None)
        geometry.append(dict(name=f'geometry-{i:03}',width=w,height=h,cell=cell,time=t,x0=str(x0),y0=str(y0),vx=vx,vy=vy,
          crossing=[str(future.numerator),str(future.denominator)],x=tx==future,y=ty==future))
    for run in range(64):
        w=rng.randrange(4,10);h=rng.randrange(4,10);seeds=rng.sample(range(w*h),3);cells=[0]*(w*h)
        for owner,seed in enumerate(seeds,1):cells[seed]=owner
        while 0 in cells:
            frontier=[(j,owner)for i,owner in enumerate(cells)if owner for j in adjacent(i,w,h)if not cells[j]]
            cell,owner=rng.choice(frontier);cells[cell]=owner
        anchors={i+1:c for i,c in enumerate(seeds)}
        balls=[]
        for owner in anchors:
            locations=[i for i,c in enumerate(cells)if c==owner]
            for cell in rng.sample(locations,min(3,len(locations))):balls.append(dict(id=len(balls)+1,owner=owner,cell=cell))
        candidates=[(i,attacker)for i,defender in enumerate(cells)if i not in seeds
          for attacker in sorted({cells[j]for j in adjacent(i,w,h)}-{defender})]
        rng.shuffle(candidates)
        for target,attacker in candidates[:3]:
            expected=split_reference(cells,w,h,anchors,target,attacker,balls)
            topology.append(dict(name=f'capture-{len(topology):03}',width=w,height=h,cells=cells,anchors=seeds,
              balls=balls,target=target,attacker=attacker,expected=expected))
    return dict(version=2,method='Python Fraction geometry; union-find connectivity; fixed seed; not emitted by BTZ JS',geometry=geometry,topology=topology)
def contents(data):
    doc=json.dumps(data,indent=2,sort_keys=True)+'\n'
    rows=['# width\theight\towner\tanchor\tremoved\tcells\torphaned']
    for v in data['topology']:
        owner=v['cells'][v['target']]
        rows.append('\t'.join(map(str,[v['width'],v['height'],owner,v['anchors'][owner-1],v['target'],
          ','.join(map(str,v['cells'])),','.join(map(str,v['expected']['orphaned'])) or '-'])))
    geometry_rows=['# width\theight\tcell\ttime\tx0\ty0\tvx\tvy\tnumerator\tdenominator\tx\ty']
    for v in data['geometry']:
        geometry_rows.append('\t'.join(map(str,[v['width'],v['height'],v['cell'],v['time'],v['x0'],v['y0'],v['vx'],v['vy'],*v['crossing'],int(v['x']),int(v['y'])])))
    return {ROOT/'tests/fixtures/btz-reference.json':doc,ROOT/'tests/fixtures/btz-connectivity.tsv':'\n'.join(rows)+'\n',ROOT/'tests/fixtures/btz-geometry.tsv':'\n'.join(geometry_rows)+'\n'}
def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');p.add_argument('--write',action='store_true');a=p.parse_args()
    if a.check==a.write:p.error('choose exactly --check or --write')
    data=fixtures()
    for path,text in contents(data).items():
        if a.write:path.write_text(text)
        elif not path.exists()or path.read_text()!=text:raise SystemExit('FAIL: reference mismatch '+str(path))
    print(f"PASS: {len(data['geometry'])} exact geometry and {len(data['topology'])} independent connectivity fixtures")
if __name__=='__main__':main()
