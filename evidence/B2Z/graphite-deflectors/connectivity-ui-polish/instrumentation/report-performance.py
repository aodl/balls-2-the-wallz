from pathlib import Path
import json,statistics
root=Path('.work/connectivity-ui/final')
groups={}
def measure(samples):
 return {'n':len(samples),'median':round(statistics.median(samples),2),'range':[round(min(samples),2),round(max(samples),2)]} if samples else None
for key,waves in [('before',['a1','a2']),('after',['b1','b2'])]:
 data=[]
 for v in waves:
  p=root/f'abba-{v}/report.json'
  if p.is_file():data.extend(json.loads(p.read_text())['rows'])
 groups[key]={}
 for width in [1440,390,320]:
  rows=[r for r in data if r['view'][0]==width]
  inter=[r for r in rows if 'interaction' in r]
  groups[key][width]={
   'cold_world':measure([r['load']['first']['at'] for r in rows if r['cache']=='cold']),
   'warm_world':measure([r['load']['first']['at'] for r in rows if r['cache']=='warm']),
   'cold_shell':measure([r['load']['paint'][0][1] for r in rows if r['cache']=='cold' and r['load']['paint']]),
   'cold_js_bytes':measure([r['load']['app']['encodedBodySize'] for r in rows if r['cache']=='cold']),
   'frame_p95_per_run':measure([r['interaction']['p95_ms'] for r in inter]),
   'frame_p50_per_run':measure([r['interaction']['p50_ms'] for r in inter]),
   'actions_driver_proxy':measure([m[1] for r in inter for m in r['action_driver_ms_including_paint_proxy']]),
   'native_click_to_frame':measure([v['ms'] for r in inter for v in r['input_to_next_animation_callback']]),
   'window_layout_count':measure([r['interaction_performance_delta']['LayoutCount'] for r in inter]),
   'window_layout_ms':measure([r['interaction_performance_delta']['LayoutDuration']*1000 for r in inter]),
   'window_recalc_ms':measure([r['interaction_performance_delta']['RecalcStyleDuration']*1000 for r in inter]),
   'error_count':sum(len(i['interaction']['errors']) for i in inter),
  }
(root/'abba-summary.json').write_text(json.dumps(groups,indent=2)+'\n')
