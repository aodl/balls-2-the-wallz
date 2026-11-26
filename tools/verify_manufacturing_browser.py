#!/usr/bin/env python3
"""Sandboxed populated observer with controlled visual plans and software rendering."""
import argparse
import functools
import http.server
import json
from pathlib import Path
import shutil
import subprocess
import threading

from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    out = parser.parse_args().output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    root = Path(__file__).resolve().parents[1]
    subprocess.run(["node", "tools/fixtures/prepare-playability-actions.mjs", str(out / "fixture.json")],
                   cwd=root, check=True)
    subprocess.run(["node_modules/.bin/esbuild", "tools/fixtures/playability-action-browser.mjs",
                    "--bundle", "--platform=browser", "--format=esm", f"--outfile={out / 'fixture.mjs'}"],
                   cwd=root, check=True)
    observer = root / "apps/b2z-observer"
    html = (observer / "index.html").read_text().replace('src="./app.mjs"', 'src="./fixture.mjs"')
    (out / "index.html").write_text(html)
    (out / "cursors").mkdir()
    for name in ("style.css", "icon.svg", "balls-to-the-wallz-b2z-wordmark.svg", "cursors/reticle.svg"):
        shutil.copyfile(observer / name, out / name)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def end_headers(self):
            self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; "
                             "connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'")
            super().end_headers()

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=out))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = {"scope": __doc__, "status": "FAIL", "cases": [], "errors": []}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
            for width, height, reduced, kind in ((1440, 900, False, "cannon"),
                                                  (390, 844, False, "deflector"),
                                                  (320, 640, True, "cannon"),
                                                  (390, 475, False, "deflector")):
                name = f"{width}x{height}-{kind}"
                context = browser.new_context(viewport={"width": width, "height": height},
                                              reduced_motion="reduce" if reduced else "no-preference",
                                              record_video_dir=str(out / "video") if width == 1440 else None)
                page = context.new_page()
                page.on("pageerror", lambda error: report["errors"].append(str(error)))
                page.on("console", lambda message: report["errors"].append(message.text)
                        if message.type == "error" and ("WebGL" in message.text or "Shader" in message.text) else None)
                page.goto(f"http://127.0.0.1:{server.server_port}/?case=orbit&orbit")
                page.wait_for_function("()=>!!globalThis.fixture")
                cell = page.evaluate("()=>fixture.world().cannons[0].cell+1")
                frozen = page.evaluate("()=>JSON.stringify(fixture.world(), (_,v)=>typeof v==='bigint'?String(v):v)")
                page.evaluate("([cell,quarter])=>fixture.pose(cell,68,quarter)", [cell, 0 if width == 1440 else 1])
                page.wait_for_timeout(500)
                page.screenshot(path=out / f"{name}-baseline.png")
                page.evaluate("()=>{fixture.manufacturingMeasure(true);fixture.metricsReset();}")
                page.wait_for_timeout(1500)
                baseline = page.evaluate("()=>fixture.metrics()")
                site = {"key": kind, "kind": kind, "cell": cell, "heading": 8192}
                page.evaluate("site=>fixture.manufacturing([site])", site)
                page.wait_for_function("()=>fixture.summary().stats.manufacturingSites===1")
                page.evaluate("()=>fixture.metricsReset()")
                page.wait_for_timeout(1700)
                still = page.screenshot(path=out / f"{name}-manufacturing.png")
                active = page.evaluate("()=>fixture.metrics()")
                page.wait_for_timeout(750)
                later = page.screenshot(path=out / f"{name}-later.png")
                assert reduced or still != later, "Drone or beam movement was absent"
                page.evaluate("()=>fixture.manufacturing([])")
                page.wait_for_function("()=>fixture.summary().stats.manufacturingSites===0")
                assert frozen == page.evaluate("()=>JSON.stringify(fixture.world(), (_,v)=>typeof v==='bigint'?String(v):v)")
                report["cases"].append({"viewport": [width, height], "reduced_motion": reduced, "site": site,
                                        "baseline": baseline, "active": active})
                context.close()
            browser.close()
        assert not report["errors"], report["errors"]
        report["status"] = "PASS"
    except Exception as error:
        report["errors"].append(str(error))
        raise
    finally:
        server.shutdown()
        (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
