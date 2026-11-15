import functools,http.server,threading,subprocess,time,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0,'tools');from quantity_browser import open_fire,editor,status
root=Path('.work/quantity-closeout/acceptance-762/matrix').absolute();out=Path('.work/quantity-closeout/native-tabs');out.mkdir(exist_ok=False)
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path=='/away.html':
   data=b'<!doctype html><title>Ordinary away tab</title>';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'status':'RUNNING','scope':'Ordinary sandboxed Chromium, actual same-window tab visibility; canonical actual composer/renderer fixture, no IC/audio/physical-device claim','cycles':[]}
with sync_playwright()as pw:
 profile=out/'profile';log=(out/'browser.log').open('w');proc=subprocess.Popen([pw.chromium.executable_path,'--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=log,stderr=subprocess.STDOUT,start_new_session=True);b=None
 try:
  start=time.monotonic()
  while not(profile/'DevToolsActivePort').exists():
   if proc.poll()is not None or time.monotonic()-start>20:raise RuntimeError('Ordinary Chromium unavailable; no policy fallback')
   time.sleep(.1)
  b=pw.chromium.connect_over_cdp('http://127.0.0.1:'+(profile/'DevToolsActivePort').read_text().splitlines()[0],no_defaults=True);c=b.contexts[0];p=c.pages[0];p.set_viewport_size({'width':320,'height':640});p.goto(url+'/?case=quantityLive');open_fire(p);p.evaluate('fixture.setHeading(347.15);fixture.markClock();globalThis.quantityIdentity=document.getElementById("quantity-controls");globalThis.visibilityQA=[];document.addEventListener("visibilitychange",()=>visibilityQA.push({hidden:document.hidden,at:performance.now(),quantity:fixture.quantity(),layout:fixture.shell.layoutState()}))');control=b.new_browser_cdp_session()
  with c.expect_page()as created:control.send('Target.createTarget',{'url':url+'/away.html','newWindow':False})
  away=created.value;p.bring_to_front();p.wait_for_function('()=>!document.hidden');windows=[control.send('Browser.getWindowForTarget',{'targetId':c.new_cdp_session(n).send('Target.getTargetInfo')['targetInfo']['targetId']})for n in [p,away]];assert windows[0]['windowId']==windows[1]['windowId'];report['windows']=windows
  for duration,kind in [(5,'healthy'),(35,'protected')]:
   status(p,kind);before=editor(p);count=p.locator('#quantity-count').text_content();r=p.locator('#quantity-plus').bounding_box();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();away.bring_to_front();p.wait_for_function('()=>document.hidden',polling=100);hidden=p.evaluate('fixture.shell.layoutState()');assert hidden['quantityPointers']==0 and hidden['quantityClickCancelled'];away.wait_for_timeout(duration*1000);p.bring_to_front();p.wait_for_function('()=>!document.hidden');p.mouse.up();assert p.locator('#quantity-count').text_content()==count;after=editor(p);assert after['proposal']==before['proposal']and after['camera']==before['camera']and p.evaluate('fixture.sameClock()');assert before['rect']==after['rect'];p.locator('#quantity-plus').click();assert p.locator('#quantity-count').text_content()==str(int(count)+1);p.locator('#quantity-minus').click();assert p.locator('#quantity-count').text_content()==count;report['cycles'].append({'hidden_seconds':duration,'controlled_status':kind,'before':before,'hidden':hidden,'after':after,'fresh_press':'PASS usable after fenced release','events':p.evaluate('visibilityQA')});p.screenshot(path=str(out/f'{duration}s-return.png'));(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  report['status']='PASS'
 except Exception as e:report.update(status='FAIL',error=str(e));raise
 finally:
  (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  if b:b.close()
  if proc.poll()is None:proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill();proc.wait()
  log.close();s.shutdown()
