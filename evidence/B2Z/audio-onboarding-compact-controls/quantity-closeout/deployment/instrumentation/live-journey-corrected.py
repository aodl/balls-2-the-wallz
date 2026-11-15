import importlib.machinery,json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/quantity-deployment-20261115');out=root/'live-journey-corrected';out.mkdir(exist_ok=False);qa=importlib.machinery.SourceFileLoader('qa',str(root/'live-common.py')).load_module();report={'status':'RUNNING'}
with sync_playwright()as pw:
 profile=out/'ordinary-profile';log=(out/'browser.log').open('w');proc=subprocess.Popen([pw.chromium.executable_path,'--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+str(profile.resolve()),'about:blank'],stdout=log,stderr=subprocess.STDOUT);browser=None
 try:
  t=time.monotonic()
  while not(profile/'DevToolsActivePort').exists():assert proc.poll()is None and time.monotonic()-t<30;time.sleep(.1)
  browser=pw.chromium.connect_over_cdp('http://127.0.0.1:'+(profile/'DevToolsActivePort').read_text().splitlines()[0],no_defaults=True);ctx=browser.contexts[0];p=ctx.pages[0];p.set_viewport_size({'width':320,'height':640});p.goto(qa.URL,wait_until='domcontentloaded');source,roster=qa.enter_fire(p);qa.heading(p,347.15);qa.settle(p);before=qa.editor(p,source['cell']);count=int(p.locator('#quantity-count').text_content());control=browser.new_browser_cdp_session()
  with ctx.expect_page()as created:control.send('Target.createTarget',{'url':'about:blank','newWindow':False})
  away=created.value;p.bring_to_front();windows=[control.send('Browser.getWindowForTarget',{'targetId':ctx.new_cdp_session(x).send('Target.getTargetInfo')['targetInfo']['targetId']})['windowId']for x in [p,away]];assert windows[0]==windows[1]
  q=p.locator('#quantity-plus').bounding_box();p.mouse.move(q['x']+22,q['y']+22);p.mouse.down();away.bring_to_front();p.wait_for_function('()=>document.hidden');away.wait_for_timeout(5000);p.bring_to_front();p.wait_for_function('()=>!document.hidden');p.mouse.up();qa.frame(p);assert int(p.locator('#quantity-count').text_content())==count;after=qa.editor(p,source['cell']);assert after['camera']==before['camera']and after['composer']==before['composer'];p.locator('#quantity-plus').click();qa.frame(p);assert int(p.locator('#quantity-count').text_content())==count+1;p.locator('#quantity-minus').click();qa.frame(p);assert int(p.locator('#quantity-count').text_content())==count;report['quantity_native_tab_return']={'status':'PASS','seconds':5,'same_window':windows,'cancelled_held_press':True,'before':before,'after':after};p.screenshot(path=str(out/'quantity-real-tab-return.png'))
  # Public empty-board drag owns pan, not aiming.
  target=p.evaluate('''()=>{for(let y=80;y<180;y+=20)for(let x=170;x<300;x+=20){const n=document.elementFromPoint(x,y);if(n?.id==='board'&&!['crosshair','none'].includes(getComputedStyle(n).cursor))return{x,y,cursor:getComputedStyle(n).cursor}}return null}''')
  if target:
   c=qa.snap(p)['camera'];p.mouse.move(target['x'],target['y']);p.mouse.down();p.mouse.move(target['x']-35,target['y']+20,steps=8);p.mouse.up();qa.frame(p);report['outside_aim_pan']={'status':'PASS'if qa.snap(p)['camera']!=c else'NOT OBSERVED','point':target}
  p.locator('#close-panel').click();p.locator('#fit').click();qa.settle(p);p.screenshot(path=str(out/'toroidal-minimap-overview.png'));report['minimap']='Actual deployed overview screenshot; ownership/viewport rendered, no artificial atlas outline. No claim of seam-pose ownership changes.'
  # Exact absent account checked from complete authenticated world; no payment.
  fresh=browser.new_context(viewport={'width':320,'height':640});p=fresh.new_page();p.goto(qa.URL,wait_until='domcontentloaded');p.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);p.locator('#join-action').click();p.locator('#sending-account').fill('2vxsx-fae');p.locator('#identity-save').click();qa.settle(p);report['new_account']={'memo':p.locator('#text-memo').text_content(),'prompt':p.locator('#action-prompt').text_content(),'state':qa.snap(p)};assert report['new_account']['memo'].startswith('NEW ');p.screenshot(path=str(out/'new-account-no-payment.png'));p.locator('#close-panel').click();report['status']='PASS'
 except Exception as e:
  report.update(status='FAIL',error=repr(e))
  try:report['failure']=qa.snap(p);p.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  raise
 finally:
  (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  if browser:browser.close()
  if proc.poll()is None:proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill();proc.wait()
  log.close()
