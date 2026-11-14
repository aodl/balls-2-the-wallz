#!/usr/bin/env python3
"""Original additive-synthesis contacts, no external recordings or model service.
Deterministic PCM24 stereo at48k, quick attack/short decay; approved music untouched.
Run with the pinned audio requirements. Owner may use these original project assets.
"""
from pathlib import Path
import hashlib,json
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1]/'apps/b2z-observer/audio/b2z-v1'
m=json.loads((root/'manifest.json').read_text())
for name,freq,duration,peak in [('friendly-contact-a',660,.28,.12),('friendly-contact-b',740,.30,.12),('neutral-contact',340,.18,.065)]:
 n=round(48000*duration);t=np.arange(n,dtype=np.float64)/48000
 envelope=(1-np.exp(-t/.0015))*np.exp(-t/(.055 if name.startswith('friendly') else .035))
 wave=envelope*(np.sin(2*np.pi*freq*t)+.27*np.sin(2*np.pi*freq*2.004*t)+.10*np.sin(2*np.pi*freq*3.02*t))
 wave*=np.minimum(1,(duration-t)/.025);wave*=peak/np.max(np.abs(wave));stereo=np.stack([wave,wave],axis=1)
 tmp=root/'sfx'/f'{name}-temporary.flac';sf.write(tmp,stereo,48000,subtype='PCM_24');data=tmp.read_bytes();sha=hashlib.sha256(data).hexdigest();path=tmp.with_name(f'{name}-{sha[:16]}.flac');tmp.replace(path)
 pcm,sr=sf.read(path,dtype='int32',always_2d=True);actual=pcm.astype(np.float64)/2**31
 m['effects'][name]={'file':'sfx/'+path.name,'sha256':sha,'bytes':len(data),'decodedFrames':n,'pcmInt32Sha256':hashlib.sha256(pcm.astype('<i4').tobytes()).hexdigest(),'frames':n,'durationSeconds':duration,'peakLinear':float(np.max(np.abs(actual))),'rmsLinear':float(np.sqrt(np.mean(actual**2))),'provenance':'Original deterministic additive synthesis: tools/create_contact_audio.py; no external samples'}
(root/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');sha=hashlib.sha256((root/'manifest.json').read_bytes()).hexdigest()
p=root.parents[1]/'audio-loader.mjs';s=p.read_text();import re
s=re.sub(r"AUDIO_MANIFEST_SHA256='[0-9a-f]+'",f"AUDIO_MANIFEST_SHA256='{sha}'",s).replace('Object.keys(m.effects??{}).length!==6','Object.keys(m.effects??{}).length!==9').replace('entries.length>58','entries.length>61').replace('Opt-in, hash-checked','Bounded, hash-checked');p.write_text(s)
print(sha)
