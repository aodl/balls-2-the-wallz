import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from importlib.machinery import SourceFileLoader
r=Path('.work/frontend80-deployment-20261116');out=r/'live-move-visual';out.mkdir(exist_ok=False);qa=SourceFileLoader('qa',str(r/'live-common.py')).load_module();d={'status':'RUNNING','scope':'Actual Rules7 legal Move previews, native board clicks only; no camera override, transaction or backend mutation','cases':[]}
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);p=b.new_page(viewport={'width':1440,'height':900},record_video_dir=str(out/'video'));p.route('**/*',lambda route:route.continue_()if route.request.method in ['GET','OPTIONS']or route.request.method=='POST'and route.request.url.endswith(('/query','/read_state'))else route.abort())
 try:
  p.goto(qa.URL,wait_until='domcontentloaded');source,roster=qa.enter_fire(p);assert source['cell']==0;p.locator('#move-action').click();qa.settle(p);camera=qa.snap(p)['camera']
  for target in [4004,996996]:
   point=p.evaluate('(cell)=>__b2zCamera.cellPoint(cell,.02)',target);assert point['visible'];assert p.evaluate('q=>document.elementFromPoint(q.sx,q.sy)?.id==="board"',point);p.mouse.click(point['sx'],point['sy']);p.wait_for_function('n=>__b2zExperience.composer.cell===n',arg=target);qa.settle(p);state=qa.snap(p);memo=p.locator('#text-memo').text_content();assert memo==f'MOVE {source["id"]} {target}';assert state['camera']==camera;actual=p.evaluate('id=>__b2zExperience.session.referenceWorld.cannons.find(c=>c.id===id).cell',source['id']);assert actual==0;d['cases'].append({'destination':target,'shortest_wrapped_displacement':[4,4]if target==4004 else[-4,-4],'point':point,'memo':memo,'camera':camera,'real_cannon_cell':actual,'state':state});p.screenshot(path=str(out/f'move-{target}.png'));(out/'results.json').write_text(json.dumps(d,indent=2)+'\n')
  d['status']='PASS'
 except Exception as e:d.update(status='FAIL',error=repr(e));p.screenshot(path=str(out/'failure.png'));raise
 finally:(out/'results.json').write_text(json.dumps(d,indent=2)+'\n');p.close();b.close()
