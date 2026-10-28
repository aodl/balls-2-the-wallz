#!/usr/bin/env python3
"""One predeclared sequential frozen A0/A2 comparison, no production operations."""
import argparse,hashlib,json,os,signal,socket,subprocess,time
from pathlib import Path
from sample_host_resources import quiet
from verify_s09_local import ROOT,start_pocketic,stop_pocketic

def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read_samples(path):
 if not path.exists():return []
 return [json.loads(x)for x in path.read_text().splitlines(keepends=True)if x.endswith('\n')]

def foreign_work(sample,roots):
 owned=set(map(str,roots));groups=set(owned)
 for _ in range(8):
  owned.update(pid for pid,v in sample['processes'].items()if str(v.get('parent_pid'))in owned or str(v.get('process_group'))in groups)
 return [{'pid':pid,**v}for pid,v in sample.get('process_cpu_cores',{}).items()if pid not in owned and(v['cores']>.25 or v['name']in {'rustc','cc1','ld','ld.lld','wasm-opt','cargo','pocket-ic'}and v['cores']>.01)]

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);ap.add_argument('--harness',type=Path,required=True);ap.add_argument('--harness-sha256',required=True);ap.add_argument('--a0',type=Path,required=True);ap.add_argument('--a2',type=Path,required=True);ap.add_argument('--a2-sha256',default='2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb');ap.add_argument('--test-hooks',type=Path);ap.add_argument('--normal-only',action='store_true');ap.add_argument('--artifacts',type=Path,default=Path.home()/'dtr-s09-artifacts');ap.add_argument('--prerequisite-wait-seconds',type=int,default=1200);ap.add_argument('--browser-python',required=True);ap.add_argument('--proxy-port',type=int,default=0);ap.add_argument('--ready',type=Path,required=True);a=ap.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
 assert digest(a.a0)=='7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51';assert digest(a.a2)==a.a2_sha256;assert digest(a.harness)==a.harness_sha256
 if not a.normal_only and not a.test_hooks:ap.error('--test-hooks required outside normal-only mode')
 with socket.socket()as sock:sock.bind(('127.0.0.1',a.proxy_port));port=sock.getsockname()[1]
 inputs={str(p):digest(p)for p in [a.harness,a.a0,a.a2,*([a.test_hooks]if a.test_hooks else[]),ROOT/'tools/verify_s14_deployment.py',ROOT/'tools/serve_observer.py',ROOT/'tools/sample_host_resources.py',ROOT/'tools/run_matched_delivery.py']}
 if os.environ.get('S14_QUAL_PREBUILT_ROOT'):
  inputs.update({str(p):digest(p)for p in sorted(Path(os.environ['S14_QUAL_PREBUILT_ROOT']).rglob('*'))if p.is_file()})
 plan={'created_epoch_ms':time.time()*1000,'order':['A0','A2'],'one_window_each':True,'test':'million_browser_sustained_normal_and_cold_lifeline','normal_only':a.normal_only,'normal_window_seconds':900,'assertions_unchanged':True,'frontend_fixed_proxy_port':port,'frontend_bytes_must_match':True,'viewport':[1440,900],'sandbox':True,'subnet':'disposable fiduciary 34 nodes; same in both cases','historical_fixture_difference':'Historical failed browser fixture used default application subnet; these two cases both explicitly use fiduciary. No mainnet subnet change.','catalog':'v5 world with v6 genesis, NOT paid v8','clock':'same real-time auto-progression and host clock; absolute dates differ, no freshness spoofing','input_sha256':inputs,'resource_interval_seconds':5,'preflight':{'window_seconds':60,'maximum_wait_seconds':a.prerequisite_wait_seconds,'idle_median_min':.70,'idle_sample_min':.40,'memory_available_min_GiB':2,'CPU_PSI_avg10_max':10,'IO_full_PSI_avg10_max':2,'swap_out_delta':0,'cgroup_throttle_delta':0,'foreign_single_process_core_max':.25,'active_compiler_or_other_PocketIC_core_max':.01},'during_window':'record every sample; abort once exposed foreign heavy work or a foreign compiler overlaps; retain partial evidence and do not repeat automatically; own case workload is not an environment rejection','after_pair':'No repeat unless a demonstrated harness/environment defect justifies a separately disclosed change.'}
 (out/'PREDECLARATION.json').write_text(json.dumps(plan,indent=2)+'\n');(out/'PREDECLARATION.sha256').write_text(digest(out/'PREDECLARATION.json')+'  PREDECLARATION.json\n')
 while not a.ready.exists():time.sleep(2)
 artifacts=a.artifacts.resolve();
 pins={'bin/pocket-ic':'b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db','wasm/ledger-canister.wasm':'7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc','wasm/ic-icp-index-canister.wasm':'6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30'}
 for name,sha in pins.items():assert digest(artifacts/name)==sha,name+' fixture checksum'
 sampler=subprocess.Popen(['python3.11','-B','tools/sample_host_resources.py','--output',str(out/'host.jsonl'),'--seconds','7200'],cwd=ROOT)
 outcomes=[]
 try:
  for label,module in [('A0',a.a0),('A2',a.a2)]:
   waiting=time.monotonic();next_record=0;passed=False
   while time.monotonic()-waiting<a.prerequisite_wait_seconds:
    rows=read_samples(out/'host.jsonl');ok,reasons=quiet(rows)
    if time.monotonic()>=next_record:
     with(out/'prerequisites.jsonl').open('a')as f:f.write(json.dumps({'label':label,'epoch_ms':time.time()*1000,'accepted':ok,'reasons':reasons})+'\n')
     next_record=time.monotonic()+15
    if ok:passed=True;break
    time.sleep(5)
   if not passed:outcomes.append({'label':label,'status':'BLOCKED','reason':'predeclared quiet-host prerequisite did not pass; test not started'});break
   for path,sha in inputs.items():assert digest(path)==sha,'frozen comparison input changed: '+path
   case=out/label;case.mkdir();server=start_pocketic(artifacts/'bin/pocket-ic',case,hard_ttl_seconds=2200,idle_ttl_seconds=2100)
   try:
    env={**os.environ,'DFX_IDENTITY':'codex_local','POCKET_IC_BIN':str(artifacts/'bin/pocket-ic'),'POCKET_IC_SERVER_URL':server[3],'ICP_LEDGER_WASM':str(artifacts/'wasm/ledger-canister.wasm'),'ICP_INDEX_WASM':str(artifacts/'wasm/ic-icp-index-canister.wasm'),'B2Z_S14_WASM':str(module.resolve()),'S14_QUAL_NORMAL_ONLY':'1'if a.normal_only else'0','B2Z_PROFILE_FIDUCIARY':'1','S14_BROWSER_PYTHON':a.browser_python,'S14_DEPLOYMENT_OUTPUT':str(case),'S14_QUAL_PROXY_PORT':str(port)}
    if a.test_hooks:env['B2Z_S14_TEST_WASM']=str(a.test_hooks.resolve())
    else:env.pop('B2Z_S14_TEST_WASM',None)
    env.pop('B2Z_PROFILE_FIXED_TIME_NS',None)
    if label=='A2':env['S14_QUAL_ASSET_REFERENCE']=str(out/'A0/million-browser-sustained/local-assets-identity.json')
    else:env.pop('S14_QUAL_ASSET_REFERENCE',None)
    cmd=[str(a.harness.resolve()),plan['test'],'--exact','--ignored','--nocapture','--test-threads=1'];began=time.time()*1000
    interrupted=None
    with(case/'test.log').open('w')as f:
     running=subprocess.Popen(cmd,cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
     while running.poll()is None:
      if time.time()*1000-began>2000000:interrupted={'reason':'bounded case timeout'};break
      samples=read_samples(out/'host.jsonl');latest=samples[-1]
      foreign=foreign_work(latest,[os.getpid(),sampler.pid,server[0].pid,running.pid])
      if foreign:interrupted={'reason':'predeclared foreign workload overlap','sample_epoch_ms':latest['epoch_ms'],'processes':foreign};break
      time.sleep(5)
     if interrupted:
      os.killpg(running.pid,signal.SIGTERM)
      try:running.wait(timeout=15)
      except subprocess.TimeoutExpired:os.killpg(running.pid,signal.SIGKILL);running.wait(timeout=15)
      (case/'environment-interruption.json').write_text(json.dumps(interrupted,indent=2)+'\n')
     code=running.wait()
    outcomes.append({'label':label,'status':'BLOCKED_ENVIRONMENT'if interrupted else'PASS'if code==0 else'FAIL','exit_code':code,'module_sha256':digest(module),'started_epoch_ms':began,'finished_epoch_ms':time.time()*1000,'command':cmd})
   finally:stop_pocketic(*server[:3])
   (out/'outcomes.json').write_text(json.dumps(outcomes,indent=2)+'\n')
   if interrupted:break
  (out/'outcomes.json').write_text(json.dumps(outcomes,indent=2)+'\n')
 finally:
  sampler.terminate();sampler.wait(timeout=15)
 print(json.dumps(outcomes,indent=2))
 if len(outcomes)!=2 or any(x['status']!='PASS'for x in outcomes):raise SystemExit(1)
if __name__=='__main__':main()
