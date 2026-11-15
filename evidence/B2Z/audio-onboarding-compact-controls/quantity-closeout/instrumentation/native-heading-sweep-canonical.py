import functools,http.server,threading,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0,'tools');from quantity_browser import open_fire,editor
root=Path('.work/quantity-closeout/acceptance-762/matrix').absolute();out=Path('.work/quantity-closeout/native-heading-sweep-canonical');out.mkdir(exist_ok=False)
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start();report={'status':'RUNNING','source':'76225150a08c2556e12dcf261e66b8f9489f2ed3','scope':'Native keyboard in actual composer/renderer on retained canonical scene; no authentication/payment claim','rows':[]}
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);c=b.new_context(viewport={'width':320,'height':640},record_video_dir=str(out/'video'));p=c.new_page()
 try:
  p.goto(f'http://127.0.0.1:{s.server_port}/?case=quantityLive');open_fire(p);p.locator('#aim-handle').focus();camera=p.evaluate('fixture.summary().camera');assert camera==[3.6575453715563526,3.6575453715563526,64]
  for _ in range(36):p.keyboard.press('Shift+ArrowRight')
  assert p.evaluate('fixture.proposal().degrees')=='347.15';p.wait_for_timeout(1000);report['failed_pose']=editor(p)
  for _ in range(3):p.keyboard.press('Shift+ArrowLeft')
  for direction in ['ArrowRight','ArrowLeft']:
   for n in range(26):
    if n:p.keyboard.press(direction)
    p.wait_for_timeout(30);d=editor(p);assert d['camera']==camera;assert p.evaluate('fixture.aim().heading===fixture.command().angle&&fixture.command().quantity===1');report['rows'].append({'direction':direction,'heading':d['proposal']['degrees'],'memo':p.locator('#text-memo').text_content(),'editor':d})
    if d['proposal']['degrees']=='347.15':
     assert p.locator('#text-memo').text_content()=='FIRE 1 217.5 1'
     p.locator('#quantity-plus').click();assert p.locator('#quantity-count').text_content()=='2';assert p.evaluate('fixture.command().quantity')==2;p.locator('#quantity-minus').click();assert p.locator('#quantity-count').text_content()=='1';p.locator('#aim-handle').focus();p.screenshot(path=str(out/f'{direction}-347.png'))
   (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  assert sum(r['heading']=='347.15'for r in report['rows'])==2;report['status']='PASS'
 except Exception as e:report.update(status='FAIL',error=str(e));p.screenshot(path=str(out/'failure.png'));raise
 finally:(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');p.close();c.close();b.close();s.shutdown()
