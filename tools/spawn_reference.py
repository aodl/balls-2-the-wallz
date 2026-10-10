#!/usr/bin/env python3
"""Independent S03 placement oracle: masked union-find, hash-ranked candidates.
Explicit --write freezes fixtures; --check compares without modifying them.
"""
import argparse, hashlib, json
from fractions import Fraction
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/fixtures/spawn-reference.json'
def rank(seed,kind,cell,other):
    obj=dict(domain='BTZ-SPAWN-RANK-03',seed=seed,kind=kind,cell=cell,other=other)
    return hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def patch(c,w,h):
    x,y=c%w,c//w
    return None if x<1 or y<1 or x+1>=w or y+1>=h else [c+dy*w+dx for dy in(-1,0,1)for dx in(-1,0,1)]
def adjacent(c,w,h):
    return [n for n in range(w*h)if abs(n%w-c%w)+abs(n//w-c//w)==1]
def eligible(v,c):
    w,h=v['width'],v['height'];p=patch(c,w,h)
    if p is None:return False
    if any(a['cell']in p for a in v['cannons']):return False
    cx,cy=c%w,c//w;t=Fraction(*v['time'])
    for b in v['balls']:
        x=Fraction(b['x0'])+b['vx']*t;y=Fraction(b['y0'])+b['vy']*t
        if (cx-1)*1024<=x<=(cx+2)*1024 and (cy-1)*1024<=y<=(cy+2)*1024:return False
    parent=list(range(w*h));cells=v['cells']
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for y in range(h):
        for x in range(w):
            a=y*w+x
            if a in p or cells[a]==0:continue
            for b in (a+1,a+w):
                if b>=w*h or b in p or (b==a+1 and b//w!=y) or cells[b]!=cells[a]:continue
                parent[find(a)]=find(b)
    anchors={a['id']:a['cell']for a in v['cannons']}
    return all(c in p or o==0 or find(c)==find(anchors[o])for c,o in enumerate(cells))
def candidates(v):
    w,h=v['width'],v['height'];rows=[]
    for c in range(w*h):
        p=patch(c,w,h)
        if not p:continue
        for other in adjacent(c,w,h):
            a,b=v['cells'][c],v['cells'][other]
            if a!=b:
                kind=0 if a and b else 1;rows.append(dict(kind=kind,cell=c,other=other,rank=rank(v['seed'],kind,c,other)))
        kind=2 if all(v['cells'][i]==0 for i in p)else 3
        rows.append(dict(kind=kind,cell=c,other=-1,rank=rank(v['seed'],kind,c,-1)))
    return sorted(rows,key=lambda r:(r['kind'],r['rank'],r['cell'],r['other']))
def generate():
    out=[]
    for i in range(72):
        w=7+i%3;h=7;mode=i%6
        if mode==0:cells=[0]*(w*h);anchors=[]
        elif mode==1:cells=[1]*(w*h);anchors=[0]
        elif mode in (2,3):cells=[1 if c%w<w//2 else 2 for c in range(w*h)];anchors=[0,w-1]
        elif mode==4:cells=[1 if c//w<2 else 0 for c in range(w*h)];anchors=[0]
        else:
            cells=[1]*(w*h);anchors=[0,w*3]
            for c in range(w*3,w*4-1):cells[c]=2
        cannons=[dict(id=n+1,cell=c,account=f'{n+1:02x}'*32)for n,c in enumerate(anchors)]
        balls=[dict(id=n+1,owner=n+1,cell=c,x0=str(c%w*1024+512),y0=str(c//w*1024+512),vx=1,vy=0)for n,c in enumerate(anchors)]
        if mode==3:
            # Additional protected centres near the frontier, avoiding anchors.
            for owner,cell in [(1,3*w+w//2-1),(2,3*w+w//2)]:
                balls.append(dict(id=len(balls)+1,owner=owner,cell=cell,x0=str(cell%w*1024+512),y0=str(cell//w*1024+512),vx=1,vy=0))
        v=dict(name=f'spawn-{i:03d}',width=w,height=h,cells=cells,cannons=cannons,balls=balls,time=[0,1],seed=hashlib.sha256(f'fixture-{i}'.encode()).hexdigest())
        rows=candidates(v);ok={c for c in range(w*h)if eligible(v,c)}
        chosen=next(((n,r)for n,r in enumerate(rows)if r['cell']in ok),None)
        v['expected']=None if chosen is None else dict(cell=chosen[1]['cell'],patch=patch(chosen[1]['cell'],w,h),kind=chosen[1]['kind'],other=chosen[1]['other'],checked=chosen[0]+1)
        v['eligible_centres']=sorted(ok);v['ranked_candidates']=rows
        out.append(v)
    return dict(version=3,method='Independent Python hash ordering + whole-board masked union-find; no JS imports',cases=out)
def native(data):
    rows=['# name\twidth\theight\tcells\tanchors\tguarded-centres\tranked-candidates\texpected']
    for v in data['cases']:
        w,h=v['width'],v['height'];guards=[]
        for c in range(w*h):
            if patch(c,w,h) is None:continue
            x,y=c%w,c//w
            if any((x-1)*1024<=int(b['x0'])<=(x+2)*1024 and (y-1)*1024<=int(b['y0'])<=(y+2)*1024 for b in v['balls']):guards.append(c)
        e=v['expected'];expected='-'if e is None else f"{e['cell']}:{e['kind']}:{e['other']}:{e['checked']}"
        rows.append('\t'.join([v['name'],str(w),str(h),','.join(map(str,v['cells'])),
            ';'.join(f"{a['id']}:{a['cell']}"for a in v['cannons'])or'-',','.join(map(str,guards))or'-',
            ';'.join(f"{r['kind']}:{r['cell']}:{r['other']}:{r['rank']}"for r in v['ranked_candidates'])or'-',expected]))
    return '\n'.join(rows)+'\n'
def main():
    p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
    data=generate();text=json.dumps(data,indent=2)+'\n';tsv=native(data);path=ROOT/'tests/fixtures/spawn-native.tsv'
    if a.write:OUT.write_text(text);path.write_text(tsv)
    elif OUT.read_text()!=text or path.read_text()!=tsv:raise SystemExit('FAIL: spawn reference fixture drift')
    print('PASS: 72 independent spawn fixtures '+('written'if a.write else'verified'))
if __name__=='__main__':main()
