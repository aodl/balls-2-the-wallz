#!/usr/bin/env python3
"""Low-frequency Linux resource evidence; reads no process arguments or environment."""
import argparse,json,os,signal,time
from pathlib import Path
STOP=False

def text(p):
 try:return Path(p).read_text()
 except (OSError,PermissionError):return None

def keyed(p):
 s=text(p);return {a:int(b)for a,b,*_ in (line.split()for line in s.splitlines())if b.isdigit()}if s else None

def pressure(kind):
 s=text('/proc/pressure/'+kind)
 return {r.split()[0]:dict((k,float(v))for k,v in (x.split('=')for x in r.split()[1:]))for r in s.splitlines()}if s else None

def sample(previous=None):
 now=time.monotonic();cpu=list(map(int,text('/proc/stat').splitlines()[0].split()[1:]));mem=keyed('/proc/meminfo');vm=keyed('/proc/vmstat');procs={}
 for d in Path('/proc').iterdir():
  if not d.name.isdigit():continue
  s=text(d/'stat')
  if not s:continue
  try:
   end=s.rindex(')');name=s[s.index('(')+1:end];v=s[end+2:].split();procs[d.name]={'name':name,'parent_pid':int(v[1]),'process_group':int(v[2]),'state':v[0],'ticks':int(v[11])+int(v[12]),'rss_pages':int(v[21])}
  except (ValueError,IndexError):continue
 cg=text('/proc/self/cgroup');rel=next((x.split('::',1)[1]for x in (cg or '').splitlines()if x.startswith('0::')),'/')
 group=Path('/sys/fs/cgroup')/rel.lstrip('/');paths=[group,Path('/sys/fs/cgroup')];groups={}
 for g in paths:
  groups[str(g)]={'cpu_max':text(g/'cpu.max'),'cpu_stat':keyed(g/'cpu.stat'),'memory_current':text(g/'memory.current'),'memory_max':text(g/'memory.max')}
 r={'epoch_ms':time.time()*1000,'monotonic':now,'cpu_ticks':cpu,'cpu_count':os.cpu_count(),'affinity':len(os.sched_getaffinity(0)),'loadavg':text('/proc/loadavg'),'memory_kib':mem,'swap_in_pages':vm.get('pswpin'),'swap_out_pages':vm.get('pswpout'),'pressure':{x:pressure(x)for x in ['cpu','io','memory']},'cgroups':groups,'processes':procs}
 if previous:
  dt=now-previous['monotonic'];d=[a-b for a,b in zip(cpu,previous['cpu_ticks'])];r['cpu_idle_fraction']=(d[3]+d[4])/max(1,sum(d));hz=os.sysconf('SC_CLK_TCK')
  r['process_cpu_cores']={pid:{'name':v['name'],'state':v['state'],'cores':max(0,(v['ticks']-previous['processes'].get(pid,v)['ticks'])/hz/dt)}for pid,v in procs.items()}
 return r

def quiet(rows):
 """Fixed before either outcome: 60s, idle, pressure, memory, swap and compilers."""
 if len(rows)<12:return False,['need 60 seconds at 5-second intervals']
 reasons=[];rs=rows[-12:];idle=[r.get('cpu_idle_fraction',0)for r in rs]
 if sorted(idle)[len(idle)//2]<.70 or min(idle)<.40:reasons.append('CPU idle median <70% or minimum <40%')
 if min(r['memory_kib'].get('MemAvailable:',0)for r in rs)<2*1024*1024:reasons.append('available memory <2GiB')
 if rs[-1]['swap_out_pages']!=rs[0]['swap_out_pages']:reasons.append('swap-out activity')
 if max((r['pressure']['cpu']or{}).get('some',{}).get('avg10',0)for r in rs)>10:reasons.append('CPU PSI avg10 >10%')
 if max((r['pressure']['io']or{}).get('full',{}).get('avg10',0)for r in rs)>2:reasons.append('I/O full PSI avg10 >2%')
 for r in rs:
  for v in r.get('process_cpu_cores',{}).values():
   if v['name']in {'rustc','cc1','ld','ld.lld','wasm-opt','cargo','pocket-ic'}and v['cores']>.01:reasons.append('active compiler or another PocketIC before test');break
   if v['cores']>.25:reasons.append('another process uses >0.25 CPU core');break
 for path,g in rs[-1]['cgroups'].items():
  a=rs[0]['cgroups'].get(path,{}).get('cpu_stat')or{};b=g.get('cpu_stat')or{}
  if b.get('throttled_usec',0)>a.get('throttled_usec',0):reasons.append('cgroup throttling during preflight')
 return not reasons,sorted(set(reasons))

def main():
 global STOP
 ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);ap.add_argument('--interval',type=float,default=5);ap.add_argument('--seconds',type=float,default=7200);a=ap.parse_args()
 signal.signal(signal.SIGTERM,lambda *_:globals().__setitem__('STOP',True));previous=None;start=time.monotonic()
 with a.output.open('x',buffering=1)as f:
  while not STOP and time.monotonic()-start<a.seconds:
   r=sample(previous);f.write(json.dumps(r,separators=(',',':'))+'\n');previous=r;time.sleep(a.interval)
if __name__=='__main__':main()
