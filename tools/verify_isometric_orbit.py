#!/usr/bin/env python3
"""Actual Chromium renderer and controls with synthetic canonical Schema7 data."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from math import dist
from pathlib import Path
import subprocess
from threading import Thread

from playwright.sync_api import sync_playwright, expect
from interaction_polish_browser import point, board_point, compass_and_turret, movement, rotate_to, scene, tile_cases
from floating_aim_browser import fire_gestures, scout_hover

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--output", type=Path, required=True)
p.add_argument("--interaction-polish", action="store_true")
p.add_argument("--economy-only", action="store_true")
p.add_argument("--tactical-only", action="store_true")
p.add_argument("--reservoir-only", action="store_true")
p.add_argument("--floating-aim", action="store_true")
p.add_argument("--reference", type=Path, help="optional Rules14 checkout for matching before captures")
args = p.parse_args()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=False)
subprocess.run(["node", "tools/fixtures/prepare-playability-actions.mjs", str(out / "fixture.json")], cwd=ROOT, check=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def prepare(src, dest):
    dest.mkdir()
    (dest / "fixture.json").write_bytes((out / "fixture.json").read_bytes())
    fixture = (ROOT / "tools/fixtures/playability-action-browser.mjs").read_text()
    # The same fixture runs the actual source checkout, including the original
    # renderer and stylesheet when taking a before comparison.
    if src != ROOT:
        fixture = fixture.replace("../../apps/", str(src / "apps") + "/").replace("../../packages/", str(src / "packages") + "/")
    local = dest / "entry.mjs"
    if src == ROOT:
        fixture = fixture.replace("../../apps/", str(ROOT / "apps") + "/").replace("../../packages/", str(ROOT / "packages") + "/")
    local.write_text(fixture)
    subprocess.run([str(ROOT / "node_modules/.bin/esbuild"), str(local), "--bundle", "--platform=browser",
                    "--format=esm", "--outfile=" + str(dest / "fixture.mjs")], cwd=ROOT, check=True)
    local.unlink()
    app = src / "apps/b2z-observer"
    (dest / "index.html").write_text((app / "index.html").read_text().replace('src="./app.mjs"', 'src="./fixture.mjs"'))
    (dest / "cursors").mkdir()
    for name in ["style.css", "balls-to-the-wallz-b2z-wordmark.svg", "cursors/reticle.svg"]:
        (dest / name).write_bytes((app / name).read_bytes())


brand = "balls-to-the-wallz-b2z-wordmark.svg"
(out / brand).write_bytes((ROOT / "apps/b2z-observer" / brand).read_bytes())
prepare(ROOT, out / "after")
if args.reference:
    prepare(args.reference.resolve(), out / "before")
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=out))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f"http://localhost:{server.server_port}"


def settle(page, quarter):
    page.wait_for_function("""q=>fixture.camera.quarter===q&&!fixture.shell.controller.rotation""", arg=quarter)


def screen(page, filename):
    page.screenshot(path=out / (filename + ".png"), animations="disabled")


def declare(page):
    account = page.evaluate("fixture.world().cannons[0].account")
    page.locator("#join-action").click()
    page.locator("#sending-account").fill(account)
    page.locator("#identity-save").click()
    page.wait_for_function("()=>document.getElementById('workspace').hidden")
    page.evaluate("fixture.cycles()")


def rotated_pinch(page, context):
    point = page.evaluate("""()=>{
        fixture.shell.controller.cancel();
        const c=fixture.camera,origin=c.cellPoint(fixture.aim().cannon.cell);
        c.pan(174-origin.sx,124-origin.sy);fixture.draw();
        const r=document.getElementById('aim-handle').getBoundingClientRect();
        return [r.x+r.width/2,r.y+r.height/2];
    }""")
    x,y = point
    assert page.evaluate("([x,y])=>document.elementFromPoint(x,y)?.id==='aim-handle'", point), point
    cdp = context.new_cdp_session(page)
    initial = page.evaluate("fixture.proposal().degrees")
    def touches(kind, *points):
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [
            {"id":i,"x":px,"y":py} for i,px,py in points
        ]})
    touches("touchStart",(1,x,y))
    touches("touchMove",(1,x-13,y+10))
    page.wait_for_function("angle=>fixture.proposal().degrees!==angle", arg=initial)
    x,y=x-13,y+10
    state = page.evaluate("""([x,y])=>{
        const candidates=[[x-84,y],[x+84,y],[x,y+84],[x,y-84]];
        const second=candidates.find(([xx,yy])=>xx>24&&xx<296&&yy>24&&yy<616&&document.elementFromPoint(xx,yy)?.id==='board');
        return {second,angle:fixture.proposal().degrees,scale:fixture.camera.scale};
    }""",[x,y])
    assert state.get("second"), state
    xx,yy = state["second"]
    dx,dy = (xx-x)/7,(yy-y)/7
    touches("touchStart",(1,x,y),(2,xx,yy))
    touches("touchMove",(1,x-dx,y-dy),(2,xx+dx,yy+dy))
    touches("touchEnd")
    page.wait_for_function("scale=>fixture.camera.scale>scale", arg=state["scale"])
    assert page.evaluate("fixture.proposal().degrees") == state["angle"]
    assert page.evaluate("fixture.camera.quarter") == 1
    assert page.locator("#quantity-controls").is_visible()
    return {"quarter":1,"native_touch":True,"draft_heading":state["angle"]}


def test(browser, variant, width, height, reduced=False):
    ctx = browser.new_context(viewport={"width": width, "height": height}, has_touch=width <= 390,
                              reduced_motion="reduce" if reduced else "no-preference")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{url}/{variant}/?case=orbit&orbit")
    page.wait_for_function("()=>Boolean(globalThis.fixture)")
    declare(page)
    page.wait_for_function("()=>document.querySelector('.brand img').naturalWidth===1711")
    pose = page.evaluate("""()=>{
        // Own the scripted composition before setting its camera, even if
        // the returning player's first navigation frame has not fired yet.
        document.dispatchEvent(new CustomEvent('b2z-entry-cancel'));
        fixture.shell.controller.cancel();
        fixture.camera.scale=innerWidth>700?68:40;
        fixture.camera.centre(7.5,4.5);fixture.draw();
        return fixture.summary().camera;
    }""")
    assert pose == [7.5, 4.5, 68 if width > 700 else 40], pose
    measures = []
    pinch = None
    for quarter, letter in enumerate("NESW"):
        rotate_to(page,quarter,legacy=variant=="before")
        button=page.locator("[data-board-quarter='0']")
        after = page.evaluate("fixture.summary().camera")
        assert after == pose, (pose, after)
        if variant == "after":
            assert button.is_disabled()
            assert button.get_attribute("aria-pressed") == "true"
            positions = page.evaluate("""()=>[...document.querySelectorAll('#board-compass button')].map(b=>{
                const r=b.getBoundingClientRect();return [Number(b.dataset.compassSlot),r.x+r.width/2,r.y+r.height/2,r.width,r.height];
            }).sort((a,b)=>a[0]-b[0])""")
            assert all(item[3:] == [44, 44] for item in positions)
            assert abs(positions[0][1]-positions[2][1])<1
            assert abs(positions[1][2]-positions[3][2])<1
        screen(page, f"{variant}-{width}-{letter}")
        measures.append({"quarter": quarter, "pose": after})
    rotate_to(page,0,legacy=variant=="before")
    page.evaluate("fixture.select(1)")
    page.wait_for_function("()=>!document.getElementById('war-cry-editor').hidden&&Boolean(fixture.aim())")
    if variant == "after":
        assert page.locator("#cycles-display").is_visible()
    assert page.locator("#action-prompt").text_content() == "Pay to Fire"
    if variant == "after":
        assert page.locator("#war-cry-editor").evaluate("el=>[...el.childNodes].filter(n=>n.nodeType===3).every(n=>!n.textContent.trim())")
        assert page.get_by_role("textbox", name="Shout (optional)").is_visible()
        assert page.locator("#payment-guidance").count() == 0
    screen(page, f"{variant}-{width}-fire")
    if variant == "after":
        memo = page.locator("#text-memo").text_content()
        rotate_to(page,1)
        assert page.locator("#text-memo").text_content() == memo
        assert page.evaluate("fixture.summary().selected") == 1
        if width == 320:
            page.set_viewport_size({"width":320,"height":350})
            # The resize response precedes the arena's measured RAF. Use the
            # committed contracted layout for the hit test, as on expansion.
            page.wait_for_function("""()=>{
                const layout=fixture.shell.layoutState();
                return fixture.camera.viewport.height===350
                    && document.documentElement.classList.contains('short-edit')
                    && !layout.dirty && !layout.pendingFrame
                    && layout.revision===layout.committedRevision;
            }""")
            cycles=page.locator("#cycles-display")
            assert cycles.is_visible() and cycles.bounding_box()["y"] >= 0
            assert cycles.evaluate("""node=>{const r=node.getBoundingClientRect();
                return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}""")
            screen(page, "after-320-contracted")
            page.set_viewport_size({"width":320,"height":640})
            # Playwright can return before the application restores the
            # contracted camera and commits the normal editor reservation.
            page.wait_for_function("""()=>fixture.camera.viewport.height===640
                && !document.documentElement.classList.contains('short-edit')
                && fixture.shell.layoutState().quantityReservation==='rail'""")
            pinch = rotated_pinch(page, ctx)
        rotate_to(page,0)
        page.evaluate("fixture.shell.controller.cancel();fixture.camera.centre(7.5,4.5);fixture.draw()")
    page.locator("#close-panel").click()
    point = page.evaluate("fixture.camera.cellPoint(4007)")
    page.mouse.click(point["sx"], point["sy"])
    page.locator("#reorient-action").click()
    page.locator("#deflector-directions button").filter(has_text="E").click()
    page.get_by_placeholder("Shout (optional)").fill("Turn")
    assert page.locator("#text-memo").text_content() == "DROT 1 E|Turn"
    if variant == "after":
        assert page.locator("#cycles-display").is_visible()
    screen(page, f"{variant}-{width}-diverter")
    if width > 700:
        page.locator("#close-panel").click()
        tile = page.evaluate("fixture.camera.cellPoint(6005)")
        page.mouse.click(tile["sx"], tile["sy"])
        page.locator("#build-action").click()
        page.wait_for_function("()=>fixture.aim()?.cannon.cell===6005")
        assert page.locator("#text-memo").text_content().endswith(" 6005")
        screen(page, f"{variant}-{width}-construction")
        page.locator("#close-panel").click()
        page.locator("#board").press("b")
        page.wait_for_function("()=>!document.getElementById('trajectory-guide').hidden")
        page.evaluate("fixture.shell.controller.cancel();fixture.camera.centre(7.5,4.5);fixture.draw()")
        page.wait_for_function("()=>!document.getElementById('trajectory-guide').hidden")
        screen(page, f"{variant}-{width}-guide")
    assert not errors, errors
    ctx.close()
    return {"size": [width, height], "reduced_motion": reduced, "camera": measures, "rotated_pinch": pinch}


def reservoir_quotes(browser):
    rows = []
    for width, height in [(1440, 900), (390, 844), (320, 640)]:
        context = browser.new_context(viewport={"width": width, "height": height}, has_touch=width < 700,
                                      permissions=["clipboard-read", "clipboard-write"], reduced_motion="reduce")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for suffix, enabled in [("case=orbit&spacing", False), ("case=reservoir&reservoir", True)]:
            page.goto(f"{url}/after/?{suffix}")
            page.wait_for_function("()=>Boolean(globalThis.fixture)")
            if page.locator("#join-action").is_visible():
                declare(page)
            else:
                assert page.evaluate("fixture.summary().account===fixture.world().cannons[0].account")
            t = 4005  # adjacent to the existing cannon
            scene(page, t, 66 if width >= 700 else 42, width / 2, height / 3)
            last_board_point = board_point(page, t)
            (page.touchscreen.tap if width < 700 else page.mouse.click)(*last_board_point)
            page.wait_for_function("n=>fixture.proposal().cell===n", arg=t)
            button = page.locator("#reservoir-action")
            assert button.is_visible() == enabled
            if not enabled:
                continue
            header=page.locator('#workspace .panel-header')
            assert header.get_by_role('button').count() == 5
            assert button.evaluate("n=>n.closest('.panel-header')!==null&&n.getBoundingClientRect().width===44")
            expect(page.locator('#build-action')).to_have_attribute('aria-pressed','true')
            assert page.locator('#build-action').is_disabled()
            button.click()
            expect(button).to_have_attribute('aria-pressed','true')
            assert not page.get_by_placeholder("Shout (optional)").is_visible()
            copy=page.locator('[data-copy=text]')
            memo=page.locator('#text-memo')

            def check_packet(cell):
                expect(memo).to_have_text(f'RESERVOIR {cell}')
                expect(page.locator('#transfer-amount')).to_have_text('0.01 ICP')
                expect(copy).to_be_enabled()

            def pick(cell, left=None):
                nonlocal last_board_point
                points=[(left or width/2,height/3),(48,height*.72),(width-48,height*.72),(width/2,154),
                        (48,height*.42),(width-48,height*.42),(width/2,height*.75)]
                for x,y in points:
                    scene(page,cell,42,x,y)
                    at=point(page,cell)
                    # The fixture centres successive world cells at the same screen
                    # point. Separate the clicks so they cannot trigger double-zoom.
                    if (width<700 or dist(at,last_board_point)>14) and page.evaluate("([x,y])=>document.elementFromPoint(x,y)?.id==='board'",at):
                        break
                else:
                    raise AssertionError(f'no unobstructed board pose for {cell}')
                (page.touchscreen.tap if width < 700 else page.mouse.click)(*at)
                last_board_point = at
                page.wait_for_function("n=>fixture.proposal().cell===n", arg=cell)
                assert page.evaluate("fixture.proposal().mode")=='reservoir'

            check_packet(4005)
            pick(4006)
            check_packet(4006)
            pick(4005, width/2+28)
            check_packet(4005)
            for field,value in [('amount','0.01'),('owner','s5ir5-gqaaa-aaaas-amyna-cai'),('text','RESERVOIR 4005')]:
                page.locator(f'[data-copy={field}]').click()
                assert page.evaluate('navigator.clipboard.readText()')==value
            screen(page, f"reservoir-quote-{width}")

            pick(4006)
            check_packet(4006)
            assert page.locator('#replace-choice').count()==0
            copy.click()
            assert page.evaluate('navigator.clipboard.readText()')=='RESERVOIR 4006'
            pick(4005,width/2+28)
            check_packet(4005)
            if width==1440:
                # A pending request for the old cell may settle after selection
                # changes. Its denial must not show a stale manual Copy field.
                page.evaluate("""()=>{
                    window.realReservoirWrite=navigator.clipboard.writeText.bind(navigator.clipboard);
                    navigator.clipboard.writeText=()=>new Promise((_, reject)=>{
                        window.denyReservoirWrite=()=>reject(new DOMException('Denied','NotAllowedError'));
                    });
                }""")
                copy.click()
                page.wait_for_function('()=>typeof window.denyReservoirWrite==="function"')
                pick(4006)
                expect(copy).to_be_disabled()
                page.evaluate('denyReservoirWrite();navigator.clipboard.writeText=realReservoirWrite')
                check_packet(4006)
                expect(page.locator('#manual-copy')).to_be_hidden()
                pick(4005,width/2+28)
                check_packet(4005)
                page.evaluate("""()=>fixture.status({resolved:{canPrepare:false,kind:'delivery',label:'Reconnecting'}})""")
                pick(4006)
                expect(memo).to_have_text('RESERVOIR 4006')
                expect(copy).to_be_disabled()
                page.evaluate("""()=>fixture.status({resolved:{canPrepare:true,kind:'playing',label:'Live'}})""")
                check_packet(4006)
                pick(4005,width/2+28)
                check_packet(4005)

            if width==320:
                page.set_viewport_size({'width':320,'height':350})
                page.wait_for_function("""()=>fixture.camera.viewport.height===350
                    && document.documentElement.classList.contains('short-edit')
                    && fixture.shell.layoutState().revision===fixture.shell.layoutState().committedRevision""")
                assert all(r['width']>=44 and r['x']>=0 and r['x']+r['width']<=320
                           for r in [b.bounding_box() for b in header.get_by_role('button').all()])
                expect(page.locator('#cycles-display')).to_be_visible()
                screen(page,'reservoir-quote-320-contracted')
                page.set_viewport_size({'width':320,'height':640})
                page.wait_for_function('()=>fixture.camera.viewport.height===640')

            pick(4010)  # three cells from enemy territory
            expect(copy).to_be_disabled()
            expect(memo).to_have_text('')
            assert 'enemy territory' in page.locator('#preparation-note').text_content().lower()
            screen(page, f"reservoir-enemy-clearance-{width}")
            assert page.evaluate("fixture.reservoirs()!==null"), "verified state must mount excavation layer"
            page.locator('#identify-button').click()
            records=page.locator('#saved-list article')
            expect(records).to_have_count(2)
            expect(records.nth(0)).to_contain_text('RESERVOIR 4006')
            expect(records.nth(1)).to_contain_text('RESERVOIR 4005')
            records.nth(1).get_by_text('View saved instructions').click()
            expect(records.nth(1)).to_contain_text('Memo RESERVOIR 4005')
            expect(copy).to_be_disabled()
        assert not errors, errors
        rows.append({"size": [width,height], "historical_capability_hidden": True, "fixed_amount": "0.01 ICP",
                     "memo": "RESERVOIR 4005", "native_copy": True, "consecutive_quotes": True, "enemy_distance_3_rejected": True})
        context.close()
    return rows


def economy_quotes(browser):
    rows=[]
    for width,height in [(1440,900),(390,844),(320,640)]:
        context=browser.new_context(viewport={"width":width,"height":height},
            permissions=["clipboard-read","clipboard-write"],reduced_motion="reduce",has_touch=width<700)
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.clock.set_fixed_time(20_000*86400+3600)
        for case in ['economy_unannounced','economy']:
            page.goto(f"{url}/after/?case={case}&economy")
            page.wait_for_function("()=>Boolean(globalThis.fixture)")
            page.locator('#status-button').click()
            page.locator('#daily-economy summary').click()
            expect(page.locator('#daily-current')).to_have_text('Current multiplier ×2')
            if case=='economy_unannounced':
                expect(page.locator('#daily-next')).to_have_text('Next multiplier has not been published.')
            else:
                expect(page.locator('#daily-next')).to_have_text('Next multiplier ×2 · Cannon 0.02 ICP · Diverter 0.002 ICP · Ball 0.0002 ICP')
                expect(page.locator('#daily-countdown')).to_have_text('Next pricing transition in 23:00:00 · 00:00 UTC')
                screen(page,f"daily-pricing-{width}")
            page.locator('#close-panel').click()
        declare(page)
        scene(page,4005,46,width/2,height/3)
        page.mouse.click(*board_point(page,4005))
        expect(page.locator('#reservoir-action')).to_have_attribute('aria-pressed','true')
        expect(page.locator('#transfer-amount')).to_have_text('0.1 ICP')
        expect(page.locator('#text-memo')).to_have_text('RESERVOIR 4005')
        page.locator('[data-copy=text]').click()
        assert page.evaluate('navigator.clipboard.readText()')=='RESERVOIR 4005'
        assert not errors,errors
        rows.append({'width':width,'quote':'0.1 ICP','current_multiplier':2,'upcoming_multiplier':2,'clipboard':'RESERVOIR 4005'})
        context.close()
    return rows


def tactical(browser):
    rows = []
    for width, height in [(1440,900), (390,844), (320,640)]:
        ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=width<700,
                                permissions=['clipboard-read','clipboard-write'],reduced_motion='reduce')
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f"{url}/after/?case=tactical&economy")
        page.wait_for_function("()=>Boolean(globalThis.fixture)")
        declare(page)

        def pick(cell, offset=0, touch=False):
            for x,y in [(width/2+offset,height/3),(45,height*.66),(width-45,height*.62),
                        (width/2,154),(45,height*.42),(width-47,height*.42)]:
                scene(page,cell,50,x,y)
                at=point(page,cell)
                if page.evaluate("([x,y])=>document.elementFromPoint(x,y)?.id==='board'",at):
                    (page.touchscreen.tap if touch else page.mouse.click)(*at)
                    return at
            raise AssertionError(f'no unobstructed cell {cell}')

        def selection():
            return page.evaluate("[...fixture.shell.selectedBalls().keys()]")

        pick(4005,touch=width<700)
        expect(page.locator('#reservoir-action')).to_have_attribute('aria-pressed','true')
        expect(page.locator('#action-prompt')).to_have_text('Pay to Build')
        expect(page.locator('#amount-detail')).to_have_text('1 reservoir')
        expect(page.locator('#transfer-amount')).to_have_text('0.1 ICP')
        expect(page.locator('#text-memo')).to_have_text('RESERVOIR 4005')
        page.locator('[data-copy=text]').click()
        assert page.evaluate('navigator.clipboard.readText()')=='RESERVOIR 4005'
        screen(page,f'tactical-{width}-reservoir')
        page.evaluate("fixture.publish('tactical','blocked')")
        expect(page.locator('[data-copy=text]')).to_be_disabled()
        expect(page.locator('#preparation-note')).to_have_text('Reservoir occupies this tile.')
        assert page.evaluate("!fixture.inspectSite(4005).selectable")
        page.evaluate("fixture.publish('tactical','initial')")
        expect(page.locator('[data-copy=text]')).to_be_enabled()
        for occupied in [2004,2009,7009,6005,4007]:
            assert page.evaluate("n=>!fixture.inspectSite(n).selectable",occupied), occupied
        assert page.evaluate("!fixture.inspectSite(500500).selectable")
        legal_builds=page.evaluate("""()=>{
          const result=[];
          for(let y=0;y<17;y++)for(let x=0;x<8;x++){
            const cell=y*1000+x,site=fixture.inspectSite(cell);
            if(site.quotes.new.startsWith('NEW ')&&site.quotes.deflect.startsWith('DEFLECT '))result.push(cell);
            if(result.length===2)return result;
          }
          return result;
        }""")
        assert len(legal_builds)==2,legal_builds
        page.locator('#close-panel').click()
        pick(legal_builds[0],35,touch=width<700)
        expect(page.locator('#action-prompt')).to_have_text('Pay to Build & Fire')
        expect(page.locator('#amount-detail')).to_have_text('1 cannon + 1 ball')
        page.locator('#quantity-plus').click()
        expect(page.locator('#amount-detail')).to_have_text('1 cannon + 2 balls')
        page.locator('#reservoir-action').click()
        expect(page.locator('#amount-detail')).to_have_text('1 reservoir')
        pick(legal_builds[1],-35,touch=width<700)
        expect(page.locator('#text-memo')).to_have_text(f'RESERVOIR {legal_builds[1]}')
        page.locator('#deflect-action').click()
        expect(page.locator('#action-prompt')).to_have_text('Pay to Build')
        expect(page.locator('#amount-detail')).to_have_text('1 diverter')
        assert page.locator('#text-memo').text_content().startswith('DEFLECT ')

        # Plan legal moves. An illegal click must leave both the cell and current
        # packet intact, at the same screen pose and on the canonical world seam.
        page.locator('#close-panel').click()
        page.locator('#centre-cannon').click()
        if page.locator('#own-cannons button').is_visible():
            page.locator('#own-cannons button').first.click()
        page.locator('#move-action').click()
        expect(page.locator('#action-prompt')).to_have_text('Pay to Move')
        old=page.locator('#text-memo').text_content()
        assert old.startswith('MOVE ')
        pick(500500,19,touch=width<700)
        page.wait_for_timeout(450)
        expect(page.locator('#text-memo')).to_have_text(old)
        page.locator('[data-copy=text]').click()
        assert page.evaluate('navigator.clipboard.readText()')==old

        if width==1440:
            page.locator('#close-panel').click()
            balls=page.evaluate("fixture.displayedBalls().map(b=>b.id)")
            assert len(balls)==4
            def click_ball(id, additive=False):
                at=page.evaluate("""id=>{
                  const c=fixture.camera,b=fixture.displayedBalls().find(x=>x.id===id);
                  fixture.shell.controller.cancel();c.scale=75;c.centre(b.x,b.y);fixture.draw();
                  const p=c.point(b.x,b.y,.14);
                  return [p.sx,p.sy];
                }""",id)
                assert page.evaluate("([x,y])=>document.elementFromPoint(x,y)?.id==='board'",at)
                page.wait_for_timeout(410)
                if additive:
                    page.keyboard.down('Control')
                try:
                    page.mouse.click(*at)
                finally:
                    if additive:
                        page.keyboard.up('Control')
            click_ball(balls[0])
            assert selection()==balls[:1]
            click_ball(balls[1],True)
            click_ball(balls[2],True)
            assert selection()==balls[:3]
            page.evaluate('fixture.camera.scale=45;fixture.camera.centre(6,4);fixture.draw()')
            assert page.locator('#trajectory-guide g:not([hidden]), .trajectory-chip:not([hidden])').count()==3
            screen(page,'tactical-three-balls')
            click_ball(balls[1],True)
            assert selection()==[balls[0],balls[2]]
            click_ball(balls[1],True)
            click_ball(balls[3],True)
            assert selection()==balls[3:]
            page.evaluate("fixture.camera.centre(500,500);fixture.draw()")
            chip=page.locator(f'.trajectory-chip[data-ball-id="{balls[3]}"]')
            expect(chip).to_be_visible()
            assert chip.evaluate("node=>getComputedStyle(node).pointerEvents")== 'none'
            angle=chip.locator('svg').evaluate("node=>node.style.transform")
            rotate_to(page,1)
            assert chip.locator('svg').evaluate("node=>node.style.transform") != angle
            page.locator('#centre-cannon').click()
            if page.locator('#own-cannons button').is_visible():
                page.locator('#own-cannons button').first.click()
            if page.locator('#locate-context').is_visible():
                page.locator('#locate-context').click()
            page.locator('#move-action').click()
            page.evaluate('fixture.camera.centre(500,500);fixture.draw()')
            assert selection()==balls[3:]
            expect(chip).to_be_visible()
            screen(page,'tactical-balls-and-move')
            page.evaluate("fixture.publish('tactical','retired');fixture.draw()")
            assert selection()==[]
            expect(chip).to_be_hidden()
        assert not errors,errors
        rows.append({'width':width,'reservoir_default':True,'native_reservoir_memo':'RESERVOIR 4005',
                     'invalid_move_preserved':old,'ball_comparison':width==1440})
        ctx.close()
    return rows


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
        report = {"reservoir": reservoir_quotes(browser)} if args.reservoir_only else {} if args.economy_only or args.tactical_only else {"after": [test(browser, "after", w, h, w == 390) for w, h in [(1440,900),(390,844),(320,640)]]}
        if args.economy_only: report={"economy":economy_quotes(browser)}
        if args.tactical_only: report={"tactical":tactical(browser)}
        if args.reference:
            report["before"] = [test(browser, "before", 1440, 900)]
        if args.interaction_polish:
            candidate = url + "/after/?case=reservoir&reservoir"
            interaction = {"movement": [movement(browser, candidate, declare, screen, w, h, d, floating=args.floating_aim)
                                        for w,h in [(1440,900),(390,844),(320,640)] for d in [False,True]]}
            for variant, sizes in (("after", [(1440,900),(320,640)]),("before", [(1440,900),(320,640)] if args.reference else [])):
                for w,h in sizes:
                    ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=w<700,
                                            permissions=["clipboard-read","clipboard-write"])
                    page=ctx.new_page()
                    errors=[]
                    page.on("pageerror",lambda e: errors.append(str(e)))
                    page.goto(candidate if variant=="after" else f"{url}/{variant}/?case=orbit&spacing")
                    page.wait_for_function("()=>Boolean(globalThis.fixture)")
                    declare(page)
                    tile_cases(page,screen,variant,w)
                    if variant=="after" and w==1440:
                        interaction["animation"]=compass_and_turret(page,screen)
                    assert not errors,errors
                    ctx.close()
            report["interaction_polish"] = interaction
        if args.floating_aim:
            gestures=[]
            for w,h in [(1440,900),(390,844),(320,640)]:
                ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=w<700,
                                        permissions=["clipboard-read","clipboard-write"])
                page=ctx.new_page()
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto(f"{url}/after/?case=orbit&spacing")
                page.wait_for_function("()=>Boolean(globalThis.fixture)")
                declare(page)
                if w==1440:
                    report["eligible_hover"]=scout_hover(page,screen)
                gestures.append(fire_gestures(page,ctx,screen,w))
                assert not errors,errors
                ctx.close()
            report["click_aim"]=gestures
        browser.close()
    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")
finally:
    server.shutdown()
