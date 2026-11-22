#!/usr/bin/env python3
"""Run the local synthetic reservoir fixture in Chromium or serve it for review."""

import argparse
import functools
import http.server
import json
from pathlib import Path
import shutil
import subprocess
import threading

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True, type=Path)
parser.add_argument("--serve", action="store_true")
args = parser.parse_args()
out = args.output.resolve()
out.mkdir(parents=True)
root = Path(__file__).resolve().parents[1]
subprocess.run(["node", "tools/fixtures/prepare-playability-actions.mjs", str(out / "fixture.json")], cwd=root, check=True)
subprocess.run(["node_modules/.bin/esbuild", "tools/fixtures/reservoir-browser.mjs",
                "--bundle", "--format=esm", f"--outfile={out / 'fixture.mjs'}"], cwd=root, check=True)
for src, name in [
    ("tools/fixtures/reservoir-browser.html", "index.html"),
    ("apps/b2z-observer/style.css", "style.css"),
    ("apps/b2z-observer/balls-to-the-wallz-b2z-wordmark.svg", "wordmark.svg")
]:
    shutil.copy(root / src, out / name)

server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(out)))
url = f"http://127.0.0.1:{server.server_port}/"
if args.serve:
    print(url, flush=True)
    server.serve_forever()
    raise SystemExit

threading.Thread(target=server.serve_forever, daemon=True).start()
report = {"status": "RUNNING", "scope": __doc__, "measurements": [], "errors": []}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
        desktop = browser.new_context(viewport={"width": 1440, "height": 900}, record_video_dir=out / "video",
                                      record_video_size={"width": 960, "height": 600})
        page = desktop.new_page()
        page.on("pageerror", lambda e: report["errors"].append(str(e)))
        page.goto(url)
        page.wait_for_function("() => !!window.reservoirFixture")
        page.evaluate("reservoirFixture.stop()")
        for name, scale, quarter in [
            ("gallery", 76, 0), ("gallery", 76, 1), ("gallery", 76, 2), ("gallery", 76, 3),
            ("empty", 76, 0), ("single", 96, 0), ("rectangle", 68, 0), ("channel", 60, 0),
            ("seam", 70, 0), ("stress", 17, 0), ("gallery", 8, 0),
        ]:
            state = page.evaluate("p => reservoirFixture.load(...p)", [name, scale, quarter])
            if name == "rectangle":
                assert state["water"]["waterQuads"] == 1 and state["water"]["wallQuads"] == 4
            if name == "single":
                assert state["water"]["waterQuads"] == 1 and state["water"]["wallQuads"] == 4
            page.screenshot(path=str(out / f"{name}-{scale}-{quarter}.png"))

        page.evaluate("reservoirFixture.load('gallery',76); reservoirFixture.animate()")
        page.wait_for_timeout(1700)
        page.get_by_role("button", name="East up").click()
        page.wait_for_timeout(1200)
        page.get_by_role("button", name="South up").click()
        page.wait_for_timeout(1600)
        desktop.close()

        # Measure without video encoding contention.
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("pageerror", lambda e: report["errors"].append(str(e)))
        page.goto(url)
        page.wait_for_function("() => !!window.reservoirFixture")
        for name, scale, forced in [("empty", 76, True), ("gallery", 76, True), ("stress", 17, True), ("gallery", 76, False)]:
            page.evaluate("p => { reservoirFixture.stop(); return reservoirFixture.load(...p); }", [name, scale])
            measurement = page.evaluate("p => reservoirFixture.measure(...p)", [90, forced])
            report["measurements"].append({"layout": name, "scale": scale, "forced": forced, **measurement})
            if name != "empty":
                assert measurement["before"]["atlasUploads"] == measurement["after"]["atlasUploads"]
                assert measurement["before"]["chunksBuilt"] == measurement["after"]["chunksBuilt"]

        report["partial_edit"] = page.evaluate("""() => {
            const f = reservoirFixture;
            const before = f.load('rectangle', 68).water;
            f.edit(502, 503, false);
            const after = f.draw().water;
            f.edit(502, 503, true);
            const restored = f.draw().water;
            return {before, after, restored};
        }""")
        edit = report["partial_edit"]
        assert edit["after"]["occupied"] == edit["before"]["occupied"] - 1
        assert edit["after"]["atlasBytesUploaded"] - edit["before"]["atlasBytesUploaded"] == 4
        assert edit["after"]["chunksBuilt"] - edit["before"]["chunksBuilt"] == 1
        assert edit["restored"]["waterQuads"] == 1 and edit["restored"]["wallQuads"] == 4

        report["offscreen"] = page.evaluate("""() => {
            const f = reservoirFixture;
            f.camera.centre(700, 700);
            const before = f.draw(0);
            const after = f.draw(1000);
            return {before, after};
        }""")
        assert not report["offscreen"]["after"]["water"]["visibleWater"]
        assert report["offscreen"]["before"]["draws"] == report["offscreen"]["after"]["draws"]

        report["adaptive"] = page.evaluate("""() => {
            const f = reservoirFixture;
            const near = f.load('gallery', 76).water.tier;
            const start = performance.now();
            for (let i = 1; i <= 6; i++) f.draw(start + i * 50);
            const slow = f.inspect().water.tier;
            for (let i = 1; i <= 6; i++) f.draw(start + 300 + i * 50);
            return {near, slow, sustained: f.inspect().water.tier};
        }""")
        assert report["adaptive"] == {"near": "hybrid", "slow": "advection", "sustained": "static"}
        page.evaluate("reservoirFixture.load('gallery',76); reservoirFixture.animate(); reservoirFixture.contextLoss();")
        page.wait_for_function("() => reservoirFixture.errors.length > 0")
        page.evaluate("reservoirFixture.restore()")
        page.wait_for_function("() => reservoirFixture.inspect().water.atlasUploads > 1")
        assert page.evaluate("reservoirFixture.inspect().water.visibleWater")
        page.screenshot(path=str(out / "context-restored.png"))
        context.close()

        for width, height in [(390, 844), (320, 640)]:
            mobile = browser.new_context(viewport={"width": width, "height": height}, has_touch=True, reduced_motion="reduce")
            page = mobile.new_page()
            page.on("pageerror", lambda e: report["errors"].append(str(e)))
            page.goto(url)
            page.wait_for_function("() => !!window.reservoirFixture")
            page.evaluate("reservoirFixture.stop()")
            before = page.evaluate("reservoirFixture.inspect()")
            page.wait_for_timeout(300)
            after = page.evaluate("reservoirFixture.draw()")
            assert before["draws"] == after["draws"] and after["water"]["tier"] == "static"
            page.screenshot(path=str(out / f"mobile-{width}.png"))
            mobile.close()

        context = browser.new_context(viewport={"width": 1024, "height": 680})
        page = context.new_page()
        page.on("pageerror", lambda e: report["errors"].append(str(e)))
        page.add_init_script("""const shaderSource = WebGL2RenderingContext.prototype.shaderSource;
            WebGL2RenderingContext.prototype.shaderSource = function(shader, source) {
                return shaderSource.call(this, shader, source.includes('#define SHADER_NAME B2ZReservoirLiquid')
                    ? source + '\\n invalid_test_token;' : source);
            };""")
        page.goto(url)
        page.wait_for_function("() => !!window.reservoirFixture")
        report["shaderFallback"] = page.evaluate("reservoirFixture.inspect().water")
        assert report["shaderFallback"]["tier"] == "fallback"
        assert not page.evaluate("reservoirFixture.errors.length")
        page.screenshot(path=str(out / "static-fallback.png"))
        browser.close()
        assert not report["errors"], report["errors"]
    report["status"] = "PASS"
except Exception as error:
    report.update(status="FAIL", error=str(error))
    raise
finally:
    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")
    server.shutdown()

print(f"PASS: {out}")
