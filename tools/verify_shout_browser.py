#!/usr/bin/env python3
"""Two independent query-only browser observers of an installed Shout payment batch."""
import argparse
import json
import socket
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--configuration", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
config = json.loads(args.configuration.read_text())
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=False)
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
url = f"http://127.0.0.1:{port}"
policy = out / "local-policy.json"
policy.write_text(json.dumps({**config, "host": url}))
subprocess.run(
    ["node", "tools/build_observer_playability.mjs", "--local-test-config", str(policy),
     "--output", str(out / "assets")],
    check=True,
)
with (out / "server.log").open("w") as log:
    server = subprocess.Popen(
        ["python3.11", "tools/serve_observer.py", "--port", str(port),
         "--deployment-assets", str(out / "assets"),
         "--live-config", str(args.configuration.resolve().parent),
         "--ic-gateway", config["host"], "--live-canister", config["canister_id"]],
        stdout=log, stderr=subprocess.STDOUT,
    )
    try:
        with sync_playwright() as playwright:
            result = []
            expected = ["Advance", "Contact", "Forward", "Hello", "Ready", "Shield", "Turn"]
            for width, height in ((1440, 900), (320, 640)):
                browser = playwright.chromium.launch(headless=True, chromium_sandbox=True)
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    has_touch=width < 400,
                    reduced_motion="reduce",
                )
                mutations, errors = [], []

                def query_only(route):
                    r = route.request
                    if r.method in ("GET", "HEAD", "OPTIONS") or (
                        r.method == "POST" and r.url.endswith(("/query", "/read_state"))
                    ):
                        route.continue_()
                    else:
                        mutations.append(r.method)
                        route.abort()

                context.route("**/*", query_only)
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("()=>__b2zExperience?.session?.ready", timeout=90000)
                observed = page.evaluate("""()=>{
                    const {session,queue}=__b2zExperience;
                    const publication=session.sequence.last.publication;
                    return {
                        rules:session.config.rules_version,
                        source:publication.identity.source_id,
                        state:publication.head.state_hash,
                        publication:String(publication.head.segment_id),
                        annotations:queue.flatMap(row=>row.segment.events.flatMap(event=>{
                            const a=event.action_annotation??event.launch_annotation;
                            return a?[{position:String(a.position),text:a.cry,kind:a.kind??'launch'}]:[];
                        }))
                    };
                }""")
                assert observed["rules"] == 14
                assert sorted(a["text"] for a in observed["annotations"]) == expected, observed
                assert len({a["position"] for a in observed["annotations"]}) == len(expected)
                page.locator("#join-action").click()
                page.locator("#sending-account").fill(config["listening_account"])
                page.locator("#identity-save").click()
                page.wait_for_function("()=>document.getElementById('workspace').hidden")
                page.wait_for_function("()=>__b2zExperience.visible?.deflectors.get(2)?.cell===4006")
                # Frame the observed structure in the fixture. Selection itself
                # follows the ordinary board input and uses the verified model.
                point = page.evaluate("()=>{__b2zCamera.frameCell(4006);return __b2zCamera.cellPoint(4006)}")
                page.wait_for_function(
                    "p=>document.elementFromPoint(p.sx,p.sy)?.id==='board'", arg=point
                )
                if width < 400:
                    page.touchscreen.tap(point["sx"], point["sy"])
                else:
                    page.mouse.click(point["sx"], point["sy"])
                # Owned Diverters now open Reorient on selection. Wait for the
                # actual selected structure and action instead of clicking the
                # already active action during the browser's selection turn.
                try:
                    page.wait_for_function(
                        "()=>document.querySelector('#panel-title')?.textContent==='Diverter #2' && "
                        "__b2zExperience.composer.mode==='deflector_reorient'",
                        timeout=10000,
                    )
                except PlaywrightTimeoutError as error:
                    # Preserve the real selection assertion. A failed mobile
                    # tap needs the picked control and current composer state,
                    # not an unqualified increase to the wait time.
                    page.screenshot(path=out / f"{width}-selection-failed.png")
                    state = page.evaluate("""p=>({
                        point:p, hit:document.elementFromPoint(p.sx,p.sy)?.outerHTML.slice(0,240),
                        title:document.querySelector('#panel-title')?.textContent??null,
                        mode:__b2zExperience?.composer?.mode??null,
                        deflectorCell:__b2zExperience?.visible?.deflectors?.get(2)?.cell??null,
                        errors:globalThis.__b2zErrors??null
                    })""", point)
                    (out / f"{width}-selection-failed.json").write_text(
                        json.dumps({"state": state, "page_errors": errors, "mutations": mutations}, indent=2)+"\n"
                    )
                    raise AssertionError(f"Diverter selection did not settle: {state}") from error
                assert page.locator("#deflector-directions").is_visible()
                page.locator("#deflector-directions button").filter(has_text="N").click()
                page.get_by_placeholder("Shout (optional)").fill("Hold")
                assert page.locator("#text-memo").text_content() == "DROT 2 N|Hold"
                assert page.locator("#transfer-amount").text_content() == "0.0001 ICP"
                assert page.locator("[data-copy=text]").is_disabled()
                observed["local_reorient_memo"] = "DROT 2 N|Hold"
                observed["paused_copy_disabled"] = True
                assert not errors and not mutations, (errors, mutations)
                page.screenshot(path=out / f"{width}-certified-shout-world.png")
                result.append({"viewport": [width, height], **observed})
                context.close()
                browser.close()
            first, second = result
            for key in ("source", "state", "publication", "annotations"):
                assert first[key] == second[key], key
            (out / "results.json").write_text(json.dumps({"status": "PASS", "observers": result}, indent=2)+"\n")
    finally:
        server.terminate()
        server.wait(timeout=15)
