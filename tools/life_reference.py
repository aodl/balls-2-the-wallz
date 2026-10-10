#!/usr/bin/env python3
"""Independent scatter-neighbor reference, not a translation of the resumable gather kernel."""
import argparse, collections, hashlib, json, random, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def encode_state(w,h,g,cells):return b'LIFE0001'+struct.pack('>HHQ',w,h,g)+b''.join(struct.pack('>H',n) for n in cells)
def reference(w,h,g,steps,cells):
    cells=list(cells);events=[];scores=collections.Counter()
    for _ in range(steps):
        votes=collections.defaultdict(collections.Counter)
        for i,owner in enumerate(cells):
            if not owner:continue
            scores[owner]+=1;x,y=i%w,i//w
            for yy in range(max(0,y-1),min(h,y+2)):
                for xx in range(max(0,x-1),min(w,x+2)):
                    if (xx,yy)!=(x,y):votes[yy*w+xx][owner]+=1
        nxt=[0]*len(cells)
        for i,old in enumerate(cells):
            neighbors=sum(votes[i].values())
            if old and neighbors in (2,3):nxt[i]=old
            elif not old and neighbors==3:nxt[i]=min(votes[i],key=lambda o:(-votes[i][o],o))
            if old!=nxt[i]:events.append((g+1,i,old,nxt[i]))
        cells=nxt;g+=1
    event_bytes=b'LIFEEVT1'+struct.pack('>I',len(events))+b''.join(struct.pack('>QIHH',*e) for e in events)
    score_bytes=b'LIFESCR1'+struct.pack('>I',len(scores))+b''.join(struct.pack('>HQ',o,scores[o])for o in sorted(scores))
    return encode_state(w,h,g,cells),event_bytes,score_bytes

def vectors():
    rng=random.Random(55107)
    cases=[('empty',3,3,0,2,[0]*9),('isolated',1,1,0,2,[1]),('block',4,4,0,4,[0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0]),
      ('blinker',5,5,0,8,[0]*10+[0,1,1,1,0]+[0]*10),('three-color-birth',3,3,7,1,[1,2,3,0,0,0,0,0,0]),
      ('edge-no-wrap',3,3,0,4,[1,1,0,1,0,0,0,0,0]),('mixed',8,7,100,9,[rng.randrange(4)for _ in range(56)]),
      ('max-owner',3,3,0,3,[0,65535,0,0,65535,0,0,65535,0])]
    rows=[];tsv=['# name\twidth\theight\tgeneration\tsteps\tcells\tstate_hex\tevent_hex\tscore_hex']
    for name,w,h,g,steps,cells in cases:
        state,events,scores=reference(w,h,g,steps,cells)
        row={'name':name,'width':w,'height':h,'generation':str(g),'steps':steps,'cells':cells,
             'state_hex':state.hex(),'events_hex':events.hex(),'scores_hex':scores.hex(),
             'state_hash':hashlib.sha256(state).hexdigest(),'events_hash':hashlib.sha256(events).hexdigest(),'scores_hash':hashlib.sha256(scores).hexdigest()}
        rows.append(row);tsv.append('\t'.join([name,str(w),str(h),str(g),str(steps),','.join(map(str,cells)),state.hex(),events.hex(),scores.hex()]))
    return {'life.json':json.dumps({'provenance':'Synthetic finite competitive Life; independent Python scatter reference. No financial or canister evidence.','cases':rows},indent=2)+'\n','life.tsv':'\n'.join(tsv)+'\n'}
def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();bad=[]
    for name,text in vectors().items():
        path=ROOT/'tests/fixtures'/name
        if args.check:
            if not path.exists()or path.read_text()!=text:bad.append(name)
        else:path.write_text(text)
    if bad:raise SystemExit('Life fixture mismatch: '+','.join(bad))
    print('PASS: independent Life fixtures '+('match'if args.check else'generated'))
if __name__=='__main__':main()
