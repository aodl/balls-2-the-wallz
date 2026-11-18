"""Serve the unchanged frozen release locally and authenticate actual Rules7."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.machinery import SourceFileLoader
import json
from pathlib import Path
import sys
from threading import Thread

from playwright.sync_api import sync_playwright

root = Path.cwd()
assets = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=False)
qa = SourceFileLoader("live_qa", str(root / "evidence/B2Z/combined-clearance-war-cry/frontend80-deployment/instrumentation/live-common.py")).load_module()
policy = json.loads((assets / ".ic-assets.json5").read_text())


class Served(SimpleHTTPRequestHandler):
    def end_headers(self):
        section = 1 if self.path.endswith(".flac") else 2 if self.path.endswith("audio/b2z-v1/manifest.json") else 0
        for name, value in policy[section]["headers"].items():
            if name.lower() != "content-type":
                self.send_header(name, value)
        super().end_headers()


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Served, directory=str(assets))) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
        rows = []
        for width, height in [(320, 640), (1440, 900)]:
            context = browser.new_context(viewport={"width": width, "height": height}, has_touch=width < 700)
            def route(request):
                # Prevent all ingress submission. Production reads use IC query/read_state.
                req = request.request
                if req.method in ("GET", "OPTIONS") or (req.method == "POST" and req.url.startswith("https://icp-api.io/") and req.url.endswith(("/query", "/read_state"))):
                    request.continue_()
                else:
                    request.abort()
            context.route("**/*", route)
            page = context.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/", wait_until="domcontentloaded")
            source, _ = qa.enter_fire(page)
            page.screenshot(path=str(output / f"authenticated-fire-{width}.png"))
            qa.heading(page, 347.15)
            qa.settle(page)
            state = qa.editor(page, source["cell"])
            assert page.locator("#deflect-action").is_hidden()
            assert page.locator("#war-cry-editor").is_hidden()
            payment = qa.payment(page)
            assert payment["memo"].startswith("FIRE ") and "|" not in payment["memo"]
            assert payment["recipient"] == "s5ir5-gqaaa-aaaas-amyna-cai"
            page.screenshot(path=str(output / f"fire-{width}.png"))
            row = {"viewport": [width, height], "cell": source["cell"], "camera": state["camera"],
                   "rules": state["identity"]["rules_hash"], "quantity": state["quantity"],
                   "fire": payment, "war_cry_hidden": True, "deflector_hidden": True}
            for selector, prefix in [("#move-action", "MOVE "), ("#build-action", "NEW ")]:
                button = page.locator(selector)
                if button.is_enabled():
                    button.click()
                    qa.settle(page)
                    payment = qa.payment(page)
                    assert payment["memo"].startswith(prefix) and "|" not in payment["memo"], payment
                    row[prefix.strip()] = payment
                else:
                    row[prefix.strip()] = "No eligible proposal in current world"
            rows.append(row)
            (output / "results.json").write_text(json.dumps({"status": "PASS" if len(rows) == 2 else "RUNNING", "scope": "Exact frozen stage served on localhost with genuine certified European Rules7 data and read-only browser actions", "rows": rows}, indent=2) + "\n")
            context.close()
        browser.close()
    server.shutdown()
