#!/usr/bin/env python3
"""Four-times Fourier peak estimate on guarded approved files; not a physical-output/listening test."""
import argparse,json
from pathlib import Path
import numpy as np
import soundfile as sf
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();base=Path('apps/b2z-observer/audio/b2z-v1');m=json.loads((base/'manifest.json').read_text());rows=[]
for name,s in [(str(s['index']),s)for s in m['segments']]+list(m['effects'].items()):
 x,rate=sf.read(base/s['file'],dtype='float64');n=len(x);spectrum=np.fft.rfft(x,axis=0);spectrum[-1]*=.5;up=np.fft.irfft(spectrum,n=n*4,axis=0)*4;offset=s.get('coreOffsetFrames',0);length=s.get('coreFrames',n);core=up[offset*4:(offset+length)*4];peak=float(np.max(np.abs(core)));sample=float(np.max(np.abs(x[offset:offset+length])));rows.append({'name':name,'sample_peak':sample,'four_times_peak':peak,'ratio':peak/sample if sample else 1})
music=max(r['four_times_peak']for r in rows[:51]);ratio=max(r['ratio']for r in rows[51:]if r['name']in ['wall-ripple-a','wall-ripple-b','wall-ripple-c','cannon-launch-soft']);bound=.8*(music+.2*ratio);assert bound<1
report={'status':'PASS','scope':__doc__,'rows':rows,'music_four_times_peak':music,'max_enabled_effect_peak_ratio':ratio,'conservative_max_slider_output_bound':bound,'caveat':'Offline Fourier estimate using guard context; not a standards-compliant true-peak meter, output-route or manual listening qualification.'};a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k!='rows'}))
