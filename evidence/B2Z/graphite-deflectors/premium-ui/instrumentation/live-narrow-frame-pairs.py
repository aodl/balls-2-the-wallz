"""ABBA alternation within one already-warmed foreground browser to reduce host drift."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa

a,b,output=sys.argv[1:]
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for width,height in ((320,640),):
  pages={}
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<400)
  def guard(route):
   r=route.request
   if r.method=='POST' and not r.url.endswith(('/query','/read_state')):route.abort()
   else:route.continue_()
  context.route('**/*',guard)
  for tag,url in [('A',a),('B',b)]:
   page=context.new_page();pages[tag]=page
   page.goto(url,wait_until='domcontentloaded')
   qa.enter_fire(page)
   if width==320:qa.heading(page,347.15)
   qa.settle(page)
  for wave in range(1):
   for tag in ('A','B','B','A'):
    page=pages[tag];page.bring_to_front()
    page.wait_for_function('()=>!document.hidden&&!__b2zExperience.session.error')
    qa.settle(page)
    handle=page.locator('#aim-handle').bounding_box()
    assert handle
    x,y=handle['x']+22,handle['y']+22
    page.evaluate("""()=>{window.capture={frames:[],last:0,keep:true};
      requestAnimationFrame(function add(t){
        if(capture.last)capture.frames.push(t-capture.last);
        capture.last=t;
        if(capture.keep)requestAnimationFrame(add);
      });
    }""")
    page.mouse.move(x,y);page.mouse.down()
    # Same input count and same motion envelope on each build.
    for i in range(10):
     page.mouse.move(x+(i if i<8 else 16-i)*2,y-(i%4)*3)
    page.mouse.up()
    qa.frame(page)
    result=page.evaluate("""()=>{capture.keep=false;
      return {intervals:capture.frames,render:__b2zRender,authenticated:__b2zExperience.session.ready,
        error:String(__b2zExperience.session.error??'')};
    }""")
    assert result['authenticated'] and not result['error']
    rows.append({'view':[width,height],'wave':wave,'variant':tag,**result})
    Path(output).write_text(json.dumps(rows,indent=2)+'\n')
  context.close()
 browser.close()
