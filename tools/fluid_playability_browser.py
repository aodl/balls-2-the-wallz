"""UX-02..13 real component journeys, canonical disposable fixtures only."""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
import math

def action_field(page,selector):
 if page.locator(selector).is_hidden() and page.locator('#locate-context').is_visible():page.locator('#locate-context').click();page.wait_for_function('()=>!document.getElementById("workspace").inert',timeout=8000)
 detail={'#move-cell':'#move-alternative','#new-cell':'#new-controls'}.get(selector)
 if detail and not page.locator(detail).evaluate('(n)=>n.open'):page.locator(detail+' > summary').click()
 return page.locator(selector)

TILE_PAYMENT_WARNING='If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.'
ORDINARY_PAYMENT_WARNING='Payments and unused ICP are kept; no automatic refunds.'

def payment_warning(page,expected):
 from playwright.sync_api import expect
 expect(page.locator('#payment-risk')).to_have_text(expected);expect(page.locator('#payment-fee')).to_have_text('Wallet fee extra.')
 other=ORDINARY_PAYMENT_WARNING if expected==TILE_PAYMENT_WARNING else TILE_PAYMENT_WARNING
 assert other not in page.locator('#prepared-card').inner_text()
 assert page.locator('#payment-risk').evaluate('(n)=>Boolean(document.querySelector(".wallet-fields").compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING)')
 settled_panel(page)
 page.locator('#payment-risk').scroll_into_view_if_needed()
 page.wait_for_function('()=>{const n=document.getElementById("payment-risk").getBoundingClientRect(),p=document.querySelector(".panel-body").getBoundingClientRect();return n.top>=p.top-2&&n.bottom<=p.bottom+2&&n.left>=0&&n.right<=innerWidth}')

def settled(page):page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000)

def settled_panel(page):
 # A completed transition can still have an incorrect cached target height.
 # Observe ordinary frames; never call internal measurement/position routines.
 page.evaluate("""()=>new Promise((resolve,reject)=>{
  const started=performance.now();let previous='',stable=0;
  function sample(){
   const card=document.getElementById('workspace'),body=card.querySelector('.panel-body'),scroll=card.querySelector('.panel-scroll'),content=card.querySelector('.panel-content'),shell=globalThis.fixture?.shell;
   const cache=shell?.layoutState?.(),visible=!card.hidden&&!card.inert;
   const pending=cache&&(cache.dirty||cache.pendingFrame||cache.revision!==cache.committedRevision);
   const moving=shell?.controller.active||document.getAnimations().some(a=>(a.effect?.target===body||a.effect?.target===scroll)&&!['finished','idle'].includes(a.playState));
   const target=parseFloat(card.style.getPropertyValue('--body-height')),space=parseFloat(card.style.getPropertyValue('--body-space'));
   const collapsed=card.dataset.surface==='context'&&card.dataset.expanded==='false';
   const expected=collapsed?0:Math.min(space,content.scrollHeight+20);
   const geometry=JSON.stringify([card.getBoundingClientRect().toJSON(),body.getBoundingClientRect().toJSON(),content.scrollHeight,target,space]);
   const ready=!pending&&!moving&&(!visible||Number.isFinite(target)&&Math.abs(target-expected)<=1);
   stable=ready&&geometry===previous?stable+1:0;previous=geometry;
   if(stable>=4)return resolve();
   if(performance.now()-started>8000)return reject(Error('Panel did not settle: '+JSON.stringify({target,expected,space,cache,geometry,moving})));
   requestAnimationFrame(sample);
  }requestAnimationFrame(sample);
 })""")


def wallet_fields_reachable(page,fields):
 settled_panel(page)
 for field in fields:
  page.locator('#'+field).evaluate('(n)=>n.scrollIntoView({block:"center",inline:"nearest"})')
  bounds=page.locator('#'+field).evaluate('''(n)=>{const r=n.getBoundingClientRect(),p=document.querySelector('.panel-body').getBoundingClientRect();return{field:n.id,rect:r.toJSON(),scrollport:p.toJSON(),contained:r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left&&r.right<=p.right};}''')
  assert bounds['contained'],bounds


def verify_wallet_expansion(page,fields):
 # Controlled timing regression on the actual composer: a paused expansion is
 # not a settled payment scrollport. Normal field checks remain unchanged.
 settled_panel(page)
 timing=page.evaluate('''()=>{const body=document.querySelector('.panel-body'),scroll=document.querySelector('.panel-scroll'),fire=document.getElementById('fire-action'),relevant=()=>document.getAnimations().filter(a=>a.effect?.target===body||a.effect?.target===scroll);fire.click();getComputedStyle(body).height;relevant().forEach(a=>a.finish());fire.click();getComputedStyle(body).height;const animations=relevant();animations.forEach(a=>{a.pause();a.currentTime=60;});const started=performance.now();window.walletExpansionFinished=false;setTimeout(()=>{animations.forEach(a=>a.finish());window.walletExpansionFinished=true;},120);return{animations:animations.length,started};}''')
 assert timing['animations']>0,timing
 wallet_fields_reachable(page,fields)
 result=page.evaluate('(t)=>({finished:window.walletExpansionFinished,elapsed_ms:performance.now()-t.started,animations:t.animations})',timing)
 assert result['finished'],result
 return result

def verify_fluid_controls(page,width,height,out):
 from playwright.sync_api import expect
 def close():
  if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
 def select(n=1):
  page.evaluate('(n)=>fixture.select(n)',n)
  if page.locator('#locate-context').is_visible():page.locator('#locate-context').click();settled(page)
  page.wait_for_function('()=>!document.getElementById("workspace").inert')
 page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();close();page.evaluate('fixture.render("additional","initial")');select()
 assert page.locator('#panel-title').evaluate('(n)=>n.getBoundingClientRect().height')<=1
 for name,label in [('focus-cannon','Focus cannon'),('fire-action','Fire'),('move-action','Move'),('build-action','Build'),('close-panel','Close')]:
  node=page.locator('#'+name);assert node.is_visible();assert node.get_attribute('aria-label')==label;box=node.bounding_box();assert box['width']>=44 and box['height']>=44
 boxes=[page.locator('#'+n).bounding_box()for n in ['focus-cannon','fire-action','move-action','build-action','close-panel']];assert max(b['y']for b in boxes)-min(b['y']for b in boxes)<2
 assert page.locator('#action-view').is_hidden();assert page.evaluate('fixture.inspect().selectedContours')>0
 page.evaluate('fixture.camera.scale=fixture.camera.fitScale;fixture.draw()');assert not page.locator('#focus-cannon').is_disabled();page.locator('#focus-cannon').click();settled(page);expect(page.locator('#focus-cannon')).to_be_disabled();page.screenshot(path=str(out/f'{width}-toolbar.png'))
 page.locator('#fire-action').click();expect(page.locator('#action-prompt')).to_have_text('Aim & Pay');assert page.locator('#fire-action').get_attribute('aria-pressed')=='true';set_heading(page,'45');expect(page.locator('#text-memo')).to_have_text('FIRE 1 255 1');assert page.locator('#legacy-details,#payment-address,#hex-memo,[data-copy="hex"],[data-copy="recipient"]').count()==0
 q={'memo':page.locator('#text-memo').inner_text(),'amount':page.locator('#transfer-amount').inner_text(),'owner':page.locator('#payment-owner').inner_text()};assert q['owner']=='s5ir5-gqaaa-aaaas-amyna-cai';payment_warning(page,ORDINARY_PAYMENT_WARNING);page.locator('[data-copy="text"]').click();page.wait_for_function('(v)=>copied.at(-1)===v',arg=q['memo']);set_heading(page,'90');expect(page.locator('#replace-choice')).to_be_visible();page.locator('#keep-instructions').click();expect(page.locator('#text-memo')).to_have_text(q['memo'])
 page.locator('#fire-action').click();assert page.locator('#action-view').is_hidden();assert page.evaluate('fixture.summary().selected')==1;assert page.evaluate('fixture.inspect().selectedContours')>0;page.locator('#fire-action').click();expect(page.locator('#text-memo')).to_have_text(q['memo']);assert heading_value(page)=='45';assert page.evaluate('fixture.inspect().guideDepth.test');assert not page.evaluate('fixture.inspect().guideDepth.write');page.screenshot(path=str(out/f'{width}-aim.png'))
 page.locator('#move-action').click();expect(page.locator('#action-prompt')).to_have_text('Choose a Tile & Pay');assert page.locator('#angle-controls').is_hidden();source=page.evaluate('fixture.world().cannons.find(c=>c.id===1).cell');choose_cell(page,str(source));expect(page.locator('#preparation-note')).to_contain_text('different tile');assert page.locator('#transfer-controls').evaluate('(n)=>n.disabled');sites=page.evaluate('fixture.moveSites(1)');assert sites
 dest=sites[0];choose_cell(page,str(dest))
 if page.locator('#replace-choice').is_visible():page.locator('#replace-instructions').click()
 expect(page.locator('#text-memo')).to_have_text(f'MOVE 1 {dest}');payment_warning(page,TILE_PAYMENT_WARNING);old=chosen_cell(page);memo=page.locator('#text-memo').inner_text();point=None
 for candidate in sites:
  p=page.evaluate('(n)=>fixture.camera.cellPoint(n)',candidate)
  if page.evaluate('p=>document.elementFromPoint(p.sx,p.sy)===document.getElementById("board")',p):point=p;break
 assert point;before=page.evaluate('fixture.camera.scale');page.mouse.dblclick(point['sx'],point['sy'],delay=50);settled(page);assert chosen_cell(page)==old;expect(page.locator('#text-memo')).to_have_text(memo);assert page.evaluate('fixture.camera.scale')>=before
 page.locator('#build-action').click();expect(page.locator('#action-prompt')).to_have_text('Choose a Tile, Aim & Pay');site=page.evaluate('fixture.sites()[0]');choose_cell(page,str(site));set_heading(page,'0')
 if page.locator('#replace-choice').is_visible():page.locator('#replace-instructions').click()
 assert page.evaluate('fixture.aim().cannon.cell')==site;expect(page.locator('#text-memo')).to_have_text(f'NEW 225 1 {site}');payment_warning(page,TILE_PAYMENT_WARNING);page.locator('#payment-risk').scroll_into_view_if_needed();page.screenshot(path=str(out/f'{width}-build.png'));close();assert page.evaluate('fixture.summary().selected')is None
 # The same stable player cut is used by map centre and widest view.
 select();anchor=page.evaluate('fixture.shell.mapAnchor()');page.locator('#fit').click();settled(page);position=page.evaluate('[fixture.camera.x,fixture.camera.y,fixture.camera.scale]');assert abs(position[0]-anchor['x'])<1e-6 or abs(abs(position[0]-anchor['x'])-1000)<1e-6;assert page.evaluate('fixture.camera.scale===fixture.camera.fitScale');close();mini=page.locator('#minimap').bounding_box();page.mouse.click(mini['x']+mini['width']/2,mini['y']+mini['height']/2);settled(page)
 # Shared displayed positions, following, stopped coverage and later interval.
 page.evaluate('fixture.motion("wrap",.1)');page.evaluate('fixture.playbackScale(1);fixture.markClock();fixture.camera.scale=96;const b=fixture.displayedBalls()[0];fixture.camera.centre(b.x,b.y);fixture.draw()');scale=page.evaluate('fixture.camera.scale');b=page.evaluate('()=>{const b=fixture.displayedBalls()[0];return fixture.camera.point(b.x,b.y,.14)}');(page.touchscreen.tap(b['sx'],b['sy']) if width<700 else page.mouse.click(b['sx'],b['sy']));page.wait_for_function('()=>!!fixture.shell.controller.following',timeout=4000);page.evaluate('fixture.playbackScale(5)');settled(page);assert page.evaluate('fixture.camera.scale')==scale;assert page.locator('#workspace').is_hidden();assert page.evaluate('Boolean(fixture.shell.controller.following)');assert page.locator('#stop-follow').count()==0;page.wait_for_function('()=>fixture.summary().queue===0',timeout=12000);settled(page);camera=page.evaluate('fixture.summary().camera');page.wait_for_timeout(900);assert page.evaluate('fixture.summary().camera')==camera;assert page.evaluate('fixture.summary().stats.tails')==0;expect(page.locator('#waiting-label')).to_have_text('Waiting for next on-chain update');page.screenshot(path=str(out/f'{width}-follow.png'));t=page.evaluate('fixture.summary().time');page.evaluate('fixture.appendMotion()');page.wait_for_function('(t)=>fixture.summary().time>t',arg=t);assert page.evaluate('fixture.sameClock()');assert page.evaluate('fixture.camera.scale')==scale;page.mouse.move(40,height/2);page.mouse.down();page.mouse.move(100,height/2,steps=5);page.mouse.up();assert not page.evaluate('Boolean(fixture.shell.controller.following)');assert page.evaluate('fixture.sameClock()');page.locator('#board').focus();page.keyboard.press('b');assert page.evaluate('Boolean(fixture.shell.controller.following)');page.keyboard.press('Escape');assert not page.evaluate('Boolean(fixture.shell.controller.following)')
 # UX-10: dormant revival and automatic first Join keep the ordinary warning.
 close();page.evaluate('fixture.render("mutual_last","final")');select(1);assert page.locator('#fire-action').get_attribute('aria-label')=='Revive';page.locator('#fire-action').click();payment_warning(page,ORDINARY_PAYMENT_WARNING);close()
 page.evaluate('fixture.render("additional","final")');page.locator('#identify-button').click();page.locator('#change-account').click();page.locator('#sending-account').fill('rrkah-fqaaa-aaaaa-aaaaq-cai');page.locator('#identity-save').click();close();page.locator('#join-action').click();payment_warning(page,ORDINARY_PAYMENT_WARNING);expect(page.locator('#text-memo')).to_have_text('NEW 225 1');close()
 # UX-06/11: the honest delayed label and intact account chip fit at 150% text.
 page.evaluate('document.documentElement.style.fontSize="24px";fixture.status({phase:"PLAYING",live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,advancing:true,presentationLagSeconds:90,world:fixture.world(),operational:{run:{running:true,pace:{mode:"Trickle",nominal_milli:10,supported_milli:10,admission_open:true}},source:{binding_checked:true,last_error:[]}}})');page.wait_for_function('()=>document.documentElement.scrollWidth<=innerWidth');assert page.locator('#identity-label').evaluate('(n)=>n.getBoundingClientRect().right<=innerWidth');page.evaluate('document.documentElement.style.fontSize=""')
 return{'viewport':[width,height],'status':'PASS','toolbar':'single row, accessible44px','modern_handoff':q,'no_op_move_rejected':True,'double_click_did_not_commit':True,'stable_anchor':anchor,'ball_follow_zoom':scale,'same_clock_queue':True,'scope':'Actual components with canonical disposable fixtures; accelerated motion, not production/device evidence.'}
