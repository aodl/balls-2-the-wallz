"""Read-only authenticated browser probe for local edits and frozen packets during an outage."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa

url, output = sys.argv[1:]
out = Path(output)
out.mkdir(parents=True, exist_ok=False)
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True,
                              permissions=["clipboard-read", "clipboard-write"])
    errors, writes = [], []
    def guard(route):
        req = route.request
        if req.method == "POST" and not req.url.split("?")[0].endswith(("/query", "/read_state")):
            writes.append(req.method)
            route.abort()
        else:
            route.continue_()
    ctx.route("**/*", guard)
    ctx.add_init_script("""window.actualClipboardWrites=[];
        const write=navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText=async value=>{
            await write(value);
            actualClipboardWrites.push(value);
        };""")
    page = ctx.new_page()
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.goto(url, wait_until="domcontentloaded")
    qa.enter_fire(page)
    page.wait_for_function("""()=>!document.querySelector('[data-copy=text]').disabled
        &&__b2zExperience.session.certificateAgeMs+performance.now()-__b2zExperience.session.certifiedAt<14000""", timeout=65000)
    memo = page.locator("#text-memo").text_content
    page.locator("#war-cry").fill("LOCAL")
    page.wait_for_function("()=>document.querySelector('#text-memo').textContent.endsWith('|LOCAL')")
    frozen = memo()
    page.locator("[data-copy=text]").click()
    page.wait_for_function("(f)=>actualClipboardWrites.length===1&&actualClipboardWrites[0]===f", arg=frozen)
    page.evaluate("window.retained=[__b2zExperience.session,__b2zExperience.clock,__b2zExperience.queue]")
    outage_attempts = []
    def outage(route):
        outage_attempts.append(route.request.method)
        route.fulfill(status=503, body="Controlled failed browser read")
    reads = "**/api/v*/canister/*/query"
    page.route(reads, outage)
    page.wait_for_function("()=>__b2zExperience.status.kind==='delivery' && document.querySelector('[data-copy=text]').disabled", timeout=30000)
    page.locator("#quantity-plus").tap()
    assert page.locator("#replace-choice").is_visible()
    page.locator("#keep-instructions").click()
    assert memo() == frozen
    page.locator("#quantity-plus").tap()
    page.locator("#replace-instructions").click()
    edited = memo()
    assert edited != frozen and edited.endswith("|LOCAL")
    assert page.evaluate("()=>actualClipboardWrites") == [frozen]
    assert page.locator("[data-copy=text]").is_disabled()
    page.locator("#deflect-action").click()
    confirmed = []
    for direction in ("NE", "SE", "SW", "NW"):
        page.locator(f"[data-deflector-orientation={direction}]").tap()
        assert memo().startswith("DEFLECT ") and memo().endswith(" " + direction)
        assert page.locator("[data-copy=text]").is_disabled()
        confirmed.append(direction)
    page.screenshot(path=str(out / "deflect-during-outage.png"))
    page.locator("#fire-action").click()
    assert memo() == edited
    assert page.locator("#quantity-controls").is_visible()
    handle = page.locator("#aim-handle")
    handle.focus()
    handle.press("ArrowRight")
    aimed = memo()
    assert aimed != edited and aimed.endswith("|LOCAL")
    page.unroute(reads, outage)
    page.wait_for_function("()=>!document.querySelector('[data-copy=text]').disabled", timeout=65000)
    assert memo() == aimed
    assert page.evaluate("()=>retained.every((v,i)=>v===[__b2zExperience.session,__b2zExperience.clock,__b2zExperience.queue][i])")
    assert not errors and not writes, (errors, writes)
    report = {"status": "PASS", "frozen_packet_keep_update": True, "clipboard_did_not_change_automatically": True,
              "deflector_directions": confirmed, "edited_fire_draft_preserved_on_return_and_recovery": True,
              "keyboard_aim_and_quantity_available_during_outage": True, "requests_blocked": len(outage_attempts),
              "unexpected_writes": len(writes), "browser_errors": len(errors)}
    (out / "result.json").write_text(json.dumps(report, indent=2) + "\n")
    ctx.close()
    browser.close()
