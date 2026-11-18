import json,sys
from pathlib import Path
r=Path(sys.argv[1]); v=sys.argv[2]; browser_path=Path(sys.argv[3])
def read(path):
    return json.loads(path.read_text())
def num(n):
    return int(str(n.get('$integer') if isinstance(n,dict) else n).replace('_',''))
def ctrl(name):
    return read(r/f'controller-ready-{v}'/f'{name}.json')['Ok']
proof=read(r/f'ready{v}-cert'/'snapshot.json')
p=proof['publication'];h=p['head'];seal=h['seal'];s=proof['state'];op=ctrl('lab_status')
run,source=op['run'],op['source']
work=ctrl('controller_work')
t=read(r/f'ready-{v}.json')
tr=t['transition']
assert t['lifecycle_barrier'] is None and t['lifecycle_error'] is None
assert tr['version']==(7 if v=='11' else 8) and tr['phase']=='ready'
cutoff=num(tr['ledger_cutover'])
assert num(read(r/f'ready{v}-ledger.json')['chain_length'])>=cutoff
assert num(read(r/f'ready{v}-index.json')['num_blocks_synced'])>=cutoff
assert num(tr['index_synced'])>=cutoff
assert proof['module']==('5ffb6cc2c1cd377ef36a847df309fc21ead8e4b66d97d49200ca00d80b3e8a43' if v=='11' else '2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13')
assert p['identity']['rules_hash']==('982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f' if v=='11' else '5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756')
assert s['version']==6 and s['time']==[h['logical_end'],'1'] and not s['pending']
assert s['received_e8s']=='100000000'
assert not run['running'] and run['world_transition'] and run['pace']['admission_open'] and not run['last_error']
assert num(run['segment_ticks'])==(2 if v=='11' else 1)
assert num(ctrl('controller_runtime')['liquid_cycles'])>=500_000_000_000
assert ctrl('controller_funding')['phase']=={'Idle':None}
assert not source['pending_records'] and source['binding_checked'] and not source['last_error'] and not source['scan_in_flight'] and not source['reconciliation_requested']
assert not work['phase'] and not work['pending_inputs'] and not work['ready_manifest']
assert seal['source_to_exclusive']==work['source_cursor']==source['admitted_to_exclusive']==h['source_to_exclusive'] and num(work['source_cursor'])<=cutoff
assert seal['source_anchor']=='bfa329cf678c4265a56d670773c4173e3e0f662601f7251c5a5c18d51c279bae'
browser=read(browser_path)
assert browser['state']['ready'] and browser['state']['identity']==p['identity']
assert not browser['state']['operational']['run']['running'] and not browser['state']['status']['canPrepare'] and browser['payment']['disabled']
assert not browser['errors'] and not browser['forbidden_posts']
assert browser['state']['head']['manifest_hash']==h['manifest_hash']
print(h['manifest_hash'])
