#!/usr/bin/env python3
"""Rules13 UI over the ordinary authenticated disposable IC observer."""
import argparse
import json
import re
import socket
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--configuration",type=Path,required=True)
parser.add_argument("--output",type=Path,required=True)
args=parser.parse_args()
config=json.loads(args.configuration.read_text())
out=args.output.resolve()
out.mkdir(parents=True,exist_ok=False)
with socket.socket() as sock:
    sock.bind(("127.0.0.1",0))
    port=sock.getsockname()[1]
url=f"http://127.0.0.1:{port}"
policy={**config,"host":url}
(out/"local-policy.json").write_text(json.dumps(policy))
subprocess.run(["node","tools/build_observer_playability.mjs","--local-test-config",str(out/"local-policy.json"),"--output",str(out/"assets")],check=True)
with (out/"server.log").open("w") as log:
    server=subprocess.Popen(["python3.11","tools/serve_observer.py","--port",str(port),
        "--deployment-assets",str(out/"assets"),"--live-config",str(args.configuration.resolve().parent),
        "--ic-gateway",config["host"],"--live-canister",config["canister_id"]],stdout=log,stderr=subprocess.STDOUT)
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
            results=[]
            for width,height in [(1440,900),(390,844),(320,640)]:
                ctx=browser.new_context(viewport={"width":width,"height":height},has_touch=width<400,
                                        reduced_motion="reduce",permissions=["clipboard-read","clipboard-write"])
                writes,errors=[],[]
                def guard(route):
                    if route.request.method=="POST" and not route.request.url.endswith(("/query","/read_state")):
                        writes.append(route.request.method)
                        route.abort()
                    else:
                        route.continue_()
                ctx.route("**/*",guard)
                ctx.add_init_script("""window.copied=[];const real=navigator.clipboard.writeText.bind(navigator.clipboard);
                    navigator.clipboard.writeText=async value=>{await real(value);copied.push(value);};""")
                page=ctx.new_page()
                page.on("pageerror",lambda error:errors.append(str(error)))
                page.goto(url,wait_until="domcontentloaded")
                page.wait_for_function("()=>__b2zExperience?.session?.ready",timeout=90000)
                assert page.evaluate("__b2zExperience.session.config.rules_version")==13
                assert page.evaluate("!__b2zExperience.session.error")
                canvas=page.locator("#board")
                camera=lambda:page.evaluate("[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]")
                def settle():
                    page.wait_for_timeout(350)
                def activate(element):
                    page.locator(element).click()
                def capture(name):
                    page.screenshot(path=str(out/f"{width}-{name}.png"),animations="disabled")
                def toolbar(expected):
                    boxes=page.locator(".panel-header button:visible").evaluate_all(
                        "ns=>ns.map(n=>[n.id,n.getBoundingClientRect().width,n.getBoundingClientRect().height])")
                    assert [row[0] for row in boxes]==expected,boxes
                    assert all(min(row[1:])>=44 for row in boxes),boxes
                def focus():
                    activate("#locate-context" if page.locator("#locate-context").is_visible() else "#focus-cannon")
                    settle()
                def pick(cell):
                    target=page.evaluate("(cell)=>__b2zCamera.cellPoint(cell)",cell)
                    if not target["visible"] or not page.evaluate("p=>document.elementFromPoint(p.sx,p.sy)?.id==='board'",target):
                        # A deliberate pointer drag brings the actual canonical tile to the visible arena.
                        for _ in range(20):
                            target=page.evaluate("(cell)=>__b2zCamera.cellPoint(cell)",cell)
                            x,y=target["sx"],target["sy"]
                            dx=max(-width*.35,min(width*.35,width*.48-x))
                            dy=max(-height*.22,min(height*.22,height*.28-y))
                            if abs(dx)<3 and abs(dy)<3:
                                break
                            start_x=width*.15 if dx>=0 else width*.85
                            start_y=height*.22 if dy>=0 else height*.38
                            if not page.evaluate("p=>document.elementFromPoint(...p)?.id==='board'",[start_x,start_y]):
                                start_y=height*.15
                            page.mouse.move(start_x,start_y);page.mouse.down()
                            page.mouse.move(start_x+dx,start_y+dy,steps=5);page.mouse.up()
                            settle()
                    target=page.evaluate("(cell)=>__b2zCamera.cellPoint(cell)",cell)
                    assert target["visible"] and page.evaluate("p=>document.elementFromPoint(p.sx,p.sy)?.id==='board'",target),target
                    prior=camera()
                    if width<400:
                        page.touchscreen.tap(target["sx"],target["sy"])
                    else:
                        page.mouse.click(target["sx"],target["sy"])
                    settle()
                    assert camera()==prior,"selection moved camera"
                activate("#join-action")
                page.locator("#sending-account").fill(config["listening_account"])
                activate("#identity-save")
                page.wait_for_function("()=>document.querySelector('#workspace').hidden")
                settle()
                assert not page.locator("#prepared-card").is_visible()
                activate("#centre-cannon")
                prior=camera()
                page.locator("#own-cannons button").filter(has_text=re.compile(r"Cannon #1\b")).click()
                settle()
                assert camera()==prior
                assert page.evaluate("__b2zExperience.composer.mode")=="ball"
                focus()
                toolbar(["focus-cannon","fire-action","move-action","close-panel"])
                assert page.locator("#quantity-controls").is_visible()
                assert page.locator("#war-cry").is_visible()
                assert page.locator("#text-memo").text_content().startswith("FIRE 1 ")
                capture("cannon-automatic-fire")
                activate("#close-panel")
                pick(config["build_tile"])
                toolbar(["focus-cannon","build-action","deflect-action","close-panel"])
                assert not page.locator("#prepared-card").is_visible()
                capture("owned-tile-toolbar")
                activate("#build-action")
                assert page.locator("#text-memo").text_content().endswith(" "+str(config["build_tile"]))
                capture("cannon-construction-payment")
                activate("#build-action")  # Return to the tile's four-button context.
                activate("#deflect-action")
                direction=page.locator("#deflector-directions button")
                assert direction.all_text_contents()==["N","E","S","W"]
                for index,key in enumerate("NESW"):
                    direction.nth(index).click()
                    assert page.locator("#text-memo").text_content()==f"DEFLECT {config['build_tile']} {key}"
                assert page.locator("#transfer-amount").text_content()=="0.1 ICP"
                capture("deflector-construction-payment")
                activate("#close-panel")
                pick(config["new_deflector_cell"])
                toolbar(["focus-cannon","reorient-action","move-action","close-panel"])
                assert page.locator("#panel-title").text_content()==f"Deflector #{config['structure']}"
                activate("#reorient-action")
                page.wait_for_function("()=>document.querySelector('#preparation-note').textContent.includes('different direction')")
                direction.nth(0).click()
                expected=f"DROT {config['structure']} N"
                assert page.locator("#text-memo").text_content()==expected
                assert page.locator("#transfer-amount").text_content()=="0.0001 ICP"
                page.bring_to_front()
                page.locator("[data-copy=text]").click(timeout=30000)
                try:
                    page.wait_for_function("s=>copied.at(-1)===s",arg=expected,timeout=12000)
                    assert page.evaluate("navigator.clipboard.readText()")==expected
                except Exception:
                    capture("clipboard-diagnostic")
                    print(page.evaluate("""()=>({recentClipboard:copied.at(-1), focused:document.hasFocus(),
                        copyFeedback:document.querySelector('#copy-feedback').textContent,
                        paymentReady:document.querySelector('#transfer-controls').dataset.paymentReady,
                        manual:!document.querySelector('#manual-copy').hidden,
                        status:__b2zExperience.status?.label})"""),flush=True)
                    raise
                capture("deflector-reorient-payment")
                activate("#move-action")
                page.wait_for_function("()=>__b2zExperience.composer.mode==='deflector_move'")
                activate("#replace-instructions")
                assert page.locator("#text-memo").text_content().startswith(f"DMOVE {config['structure']} ")
                assert page.locator("#transfer-amount").text_content()=="0.0001 ICP"
                capture("deflector-move-payment")
                final=page.evaluate("()=>[...__b2zExperience.visible.deflectors.values()].map(d=>[d.id,d.cell,d.orientation]).sort((a,b)=>a[0]-b[0])")
                assert [config["structure"],config["new_deflector_cell"],"NE"] in final
                assert all(d[1]!=config["old_deflector_cell"] for d in final)
                assert not errors and not writes,(errors,writes)
                results.append({"viewport":[width,height],"structures":final,"exact_clipboard":expected,
                                "starting_and_destination_focus":"explicit only","query_only":True})
                ctx.close()
            assert len({json.dumps(row["structures"]) for row in results})==1
            (out/"results.json").write_text(json.dumps({"status":"PASS","profiles":results},indent=2)+"\n")
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=15)
