#!/usr/bin/env python3
"""TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH"""
import argparse
import json
import mimetypes
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = "https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io"
IC_GATEWAY = "https://icp-api.io"
IDENTITY_CANISTER = "rdmx6-jaaaa-aaaaa-aaadq-cai"


def verify_ii_gateway(browser, out):
    """Run the real AuthClient through its popup and stop before any IC call leaves Chromium."""
    script = out / "live-auth.mjs"
    subprocess.run([str(ROOT / "node_modules/.bin/esbuild"), "apps/b2z-observer/developer-speed-entry.mjs",
                    "--bundle", "--platform=browser", "--format=esm", "--outfile=" + str(script)], cwd=ROOT, check=True)
    context = browser.new_context()
    context.add_init_script("""{
      window.blockedConnectOrigins = [];
      document.addEventListener('securitypolicyviolation', e => {
        if (e.effectiveDirective === 'connect-src') window.blockedConnectOrigins.push(new URL(e.blockedURI).origin);
      });
    }""")
    popup = f"""<!doctype html><script>
      window.addEventListener('message', event => {{
        if (event.origin !== {json.dumps(CANONICAL)} || event.source !== window.opener) return;
        const {{id, method, params}} = event.data;
        let result;
        if (method === 'icrc29_status') result = 'ready';
        else if (method === 'ii_session_delegation' && params.icrc95DerivationOrigin === event.origin) {{
          result = {{publicKey: params.sessionPublicKey, signerDelegation: [{{
            delegation: {{pubkey: params.sessionPublicKey, expiration: String(BigInt(Date.now())*1000000n+60000000000n),
                          targets: [{json.dumps(IDENTITY_CANISTER)}]}},
            signature: 'AA==',
          }}]}};
        }} else return;
        event.source.postMessage({{jsonrpc: '2.0', id, result}}, event.origin);
      }});
    </script>"""
    attempts = []

    def deliver(route):
        address = urlsplit(route.request.url)
        origin = f"{address.scheme}://{address.netloc}"
        if origin == CANONICAL and address.path == "/":
            csp = f"default-src 'none'; script-src 'self'; connect-src 'self' {IC_GATEWAY}"
            route.fulfill(body='<section id="status-view"></section><script type="module" src="/live-auth.mjs"></script>',
                          headers={"Content-Security-Policy": csp}, content_type="text/html")
        elif origin == CANONICAL and address.path == "/live-auth.mjs":
            route.fulfill(path=script, content_type="text/javascript")
        elif origin == "https://id.ai" and address.path == "/authorize":
            route.fulfill(body=popup, content_type="text/html")
        else:
            if route.request.method == "POST":
                attempts.append({"origin": origin, "path": address.path})
            route.abort()

    context.route("**/*", deliver)
    page = context.new_page()
    page.goto(CANONICAL)
    panel = page.locator("#dev-speed")
    panel.locator("summary").click()
    panel.get_by_role("button", name="Sign in as owner").click()
    expect(panel.locator("[data-feedback]")).to_contain_text("Speed could not be verified", timeout=20000)
    expect(panel.get_by_role("button", name="Full Speed", exact=True)).to_be_disabled()
    result = {"attempts": attempts, "blocked_origins": page.evaluate("blockedConnectOrigins"),
              "scope": "Real AuthClient and browser CSP, controlled signer popup and aborted IC request"}
    (out / "ii-gateway.json").write_text(json.dumps(result, indent=2) + "\n")
    assert attempts and all(row["origin"] == IC_GATEWAY and row["path"] in {
        f"/api/v3/canister/{IDENTITY_CANISTER}/call", f"/api/v4/canister/{IDENTITY_CANISTER}/call",
    } for row in attempts), result
    assert not result["blocked_origins"], result
    context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    out = parser.parse_args().output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    subprocess.run(["node", "tools/fixtures/prepare-playability-actions.mjs", str(out / "fixture.json")], cwd=ROOT, check=True)
    fixture = out / "entry.mjs"
    fixture.write_text(f"""
import {json.dumps(str(ROOT / 'tools/fixtures/playability-action-browser.mjs'))};
import {{mountDevSpeed}} from {json.dumps(str(ROOT / 'apps/b2z-observer/developer-speed.mjs'))};
let until = 0, allowed = true, canStart = true;
const switches = [];
const read = () => {{
  if (!allowed) throw Error('developer speed operator only');
  const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  return {{ mode: remaining ? 'Full Speed' : 'Adaptive', adaptive_tier:'Trickle',
           remaining_seconds:remaining, can_start:canStart, idle:false }};
}};
mountDevSpeed(document, {{connect:()=>({{
  async signIn() {{}}, async signOut() {{}}, async read() {{return read();}},
  async set(full) {{switches.push(full);until = full ? Date.now()+120000 : 0;return read();}},
}})}});
window.speedFixture = {{switches, deny:()=>allowed=false, protect:()=>canStart=false}};
""")
    subprocess.run([str(ROOT / "node_modules/.bin/esbuild"), str(fixture), "--bundle", "--platform=browser",
                    "--format=esm", "--outfile=" + str(out / "fixture.mjs")], cwd=ROOT, check=True)
    assets = ROOT / "apps/b2z-observer"
    index = (assets / "index.html").read_text().replace('src="./app.mjs"', 'src="./fixture.mjs"')
    rows = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, chromium_sandbox=True)
        for width, height in [(1440, 900), (390, 844), (320, 640)]:
            context = browser.new_context(viewport={"width": width, "height": height})

            def deliver(route):
                request = urlsplit(route.request.url)
                if request.netloc not in {urlsplit(CANONICAL).netloc, 'b2z.example'} or route.request.method != 'GET':
                    route.abort()
                    return
                name = request.path.lstrip('/')
                if not name:
                    route.fulfill(body=index, content_type='text/html')
                    return
                path = out / name if name in {'fixture.json', 'fixture.mjs'} else assets / name
                if path.is_file() and (path.resolve().is_relative_to(assets) or name in {'fixture.json', 'fixture.mjs'}):
                    route.fulfill(path=path, content_type=mimetypes.guess_type(name)[0] or 'application/octet-stream')
                else:
                    route.fulfill(status=404)

            context.route('**/*', deliver)
            page = context.new_page()
            page.clock.install()
            page.goto(CANONICAL)
            page.wait_for_function('()=>Boolean(window.speedFixture)')
            page.locator('#status-button').click()
            panel = page.locator('#dev-speed')
            panel.locator('summary').click()
            activate = panel.get_by_role('button', name='Full Speed', exact=True)
            expect(activate).to_be_disabled()
            panel.get_by_role('button', name='Sign in as owner').click()
            expect(panel.locator('[data-mode]')).to_have_text('Adaptive · Trickle')
            activate.click()
            expect(panel.locator('[data-mode]')).to_have_text('Full Speed · 120s remaining')
            page.screenshot(path=str(out / f'{width}-full-speed.png'))
            panel.get_by_role('button', name='Return to Adaptive').click()
            expect(panel.locator('[data-mode]')).to_have_text('Adaptive · Trickle')
            activate.click()
            expect(panel.locator('[data-mode]')).to_contain_text('Full Speed')
            page.clock.fast_forward(121_000)
            expect(panel.locator('[data-mode]')).to_have_text('Adaptive · Trickle')
            assert page.evaluate('speedFixture.switches') == [True, False, True]
            page.evaluate('speedFixture.protect()')
            page.clock.fast_forward(5_500)
            expect(activate).to_be_disabled()
            page.evaluate('speedFixture.deny()')
            page.clock.fast_forward(5_500)
            expect(panel.locator('[data-feedback]')).to_contain_text('no developer-speed access')
            expect(activate).to_be_disabled()
            page.goto('https://b2z.example')
            page.wait_for_function('()=>Boolean(window.speedFixture)')
            assert page.locator('#dev-speed').count() == 0
            rows.append({'viewport': [width, height], 'owner_toggle': True, 'auto_return': True, 'cross_origin_denied': True})
            context.close()
        verify_ii_gateway(browser, out)
        browser.close()
    (out / 'result.json').write_text(json.dumps({'status': 'PASS', 'scope': 'Real B2Z interface with controlled authentication and transport', 'rows': rows}, indent=2) + '\n')


if __name__ == '__main__':
    main()
