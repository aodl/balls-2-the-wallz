#!/usr/bin/env python3
"""Actual Chromium renderer and controls with synthetic canonical Schema7 data."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
from threading import Thread

from playwright.sync_api import sync_playwright
from interaction_polish_browser import compass_and_turret, movement, tile_cases

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--output", type=Path, required=True)
p.add_argument("--interaction-polish", action="store_true")
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
        button = page.locator(f"[data-board-quarter='{quarter}']")
        if quarter:
            button.click()
        settle(page, quarter)
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
    page.locator("[data-board-quarter='0']").click()
    settle(page, 0)
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
        page.locator("[data-board-quarter='1']").click()
        settle(page, 1)
        assert page.locator("#text-memo").text_content() == memo
        assert page.evaluate("fixture.summary().selected") == 1
        if width == 320:
            page.set_viewport_size({"width":320,"height":350})
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
        page.locator("[data-board-quarter='0']").click()
        settle(page, 0)
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


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
        report = {"after": [test(browser, "after", w, h, w == 390) for w, h in [(1440,900),(390,844),(320,640)]]}
        if args.reference:
            report["before"] = [test(browser, "before", 1440, 900)]
        if args.interaction_polish:
            candidate = url + "/after/?case=orbit&spacing"
            interaction = {"movement": [movement(browser, candidate, declare, screen, w, h, d)
                                        for w,h in [(1440,900),(390,844),(320,640)] for d in [False,True]]}
            for variant, sizes in (("after", [(1440,900),(320,640)]),("before", [(1440,900),(320,640)] if args.reference else [])):
                for w,h in sizes:
                    ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=w<700)
                    page=ctx.new_page()
                    errors=[]
                    page.on("pageerror",lambda e: errors.append(str(e)))
                    page.goto(f"{url}/{variant}/?case=orbit&spacing")
                    page.wait_for_function("()=>Boolean(globalThis.fixture)")
                    declare(page)
                    tile_cases(page,screen,variant,w)
                    if variant=="after" and w==1440:
                        interaction["animation"]=compass_and_turret(page,screen)
                    assert not errors,errors
                    ctx.close()
            report["interaction_polish"] = interaction
        browser.close()
    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")
finally:
    server.shutdown()
