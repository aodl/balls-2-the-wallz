"""Summaries of bounded read-only browser timeline records."""
import collections,itertools,json,math,statistics,sys
from pathlib import Path
out=Path(sys.argv[1])
report={}
for input_path in sys.argv[2:]:
 p=Path(input_path)
 rows=[json.loads(line) for line in p.read_text().splitlines()]
 states=[r for r in rows if r['kind']=='state']
 if not states:continue
 start,end=states[0]['t'],states[-1]['t']
 if end<=start:continue
 elapsed=(end-start)/60
 responses=[r for r in rows if r['kind']=='response' and start<=r['t']<=end]
 metrics={}
 for name in sorted({r['method'] for r in responses}):
  matched=[r for r in responses if r['method']==name]
  ms=sorted(r['ms'] for r in matched)
  metrics[name]={'count':len(matched),'per_min':round(len(matched)/elapsed,2),
     'latency_median_ms':round(statistics.median(ms),1),'latency_p95_ms':ms[math.ceil(len(ms)*.95)-1] if len(ms)>=20 else None,
     'encoded_bytes':sum(r.get('bytes') or 0 for r in matched),'non_200_or_cancelled':sum(r.get('http')!=200 or bool(r.get('error')) for r in matched)}
 runs=[]
 for key,group in itertools.groupby(states,key=lambda r:(r.get('statusKind'),r.get('copyDisabled'),r['head'])):
  items=list(group)
  runs.append({'status':key[0],'copyDisabled':key[1],'head':key[2],'start':items[0]['t'],'end':items[-1]['t'],
       'witness_age_on_receipt_ms':sorted({r.get('certificateAge') for r in items if r.get('certificateAge') is not None}),
       'highest_operational_age_ms':max([(r.get('operationalAge') or 0) for r in items]),'samples':len(items)})
 report[p.parent.name]={'browser_seconds':round(end-start,3),'sample_count':len(states),'status_counts':dict(collections.Counter(r.get('statusKind') for r in states)),
  'heads':list(dict.fromkeys(r['head'] for r in states)),'request_metrics':metrics,'spinner_samples':sum(bool(r.get('spinner')) for r in states),
  'copy_disabled_samples':sum(bool(r.get('copyDisabled')) for r in states),
  'status_changes_per_min':round(sum(a.get('statusKind')!=b.get('statusKind') for a,b in zip(states,states[1:]))/elapsed,2),
  'copy_changes_per_min':round(sum(a.get('copyDisabled')!=b.get('copyDisabled') for a,b in zip(states,states[1:]))/elapsed,2),
  'transitions':[r for r in rows if r['kind']=='transition'],'sampled_runs':runs}
out.write_text(json.dumps(report,indent=2)+'\n')
