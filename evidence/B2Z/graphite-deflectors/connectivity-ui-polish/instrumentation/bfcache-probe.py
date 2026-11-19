"""Native Chromium history navigation against exact assets and the European read-only backend."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa

url, output = sys.argv[1:]
out = Path(output)
out.mkdir(parents=True, exist_ok=False)
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, chromium_sandbox=True, ignore_default_args=["--disable-back-forward-cache"])
    context = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
    context.add_init_script("""window.historyEvents=[];
        for(const name of ['pagehide','pageshow']) addEventListener(name,event=>
            historyEvents.push({name,persisted:event.persisted}));""")
    page = context.new_page()
    unexpected = []
    page.on("request", lambda r: unexpected.append(r.method) if r.method == "POST" and not r.url.split("?")[0].endswith(("/query", "/read_state")) else None)
    page.goto(url, wait_until="domcontentloaded")
    qa.enter_fire(page)
    page.locator("#war-cry").fill("LOCAL")
    page.wait_for_function("()=>document.querySelector('#text-memo').textContent.endsWith('|LOCAL')")
    page.evaluate("""window.beforeHistory={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue}""")
    page.goto("about:blank")
    page.go_back(wait_until="commit")
    page.wait_for_function("()=>historyEvents.some(e=>e.name==='pageshow')", timeout=25000)
    result = page.evaluate("""()=>{
        const current=window.__b2zExperience, prior=window.beforeHistory;
        return {
            events:historyEvents,
            retained:Boolean(current && prior && prior.session===current.session
                && prior.clock===current.clock && prior.queue===current.queue),
            rules:current?.session?.sequence.last?.publication.identity.rules_hash,
            reasons:performance.getEntriesByType('navigation')[0]?.notRestoredReasons?.toJSON(),
            draft:document.querySelector('#text-memo')?.textContent.endsWith('|LOCAL'),
            spinner:!document.querySelector('#motion-wait')?.hidden
        };
    }""")
    assert not unexpected, unexpected
    result["unexpected_writes"] = len(unexpected)
    if any(item["name"] == "pageshow" and item["persisted"] for item in result["events"]):
        assert result["retained"] and result["draft"] and not result["spinner"], result
        result["status"] = "PASS_NATIVE_BFCACHE"
    else:
        result["status"] = "BLOCKED_NO_NATIVE_BFCACHE_HIT"
    (out / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    context.close()
    browser.close()
