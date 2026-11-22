#!/usr/bin/env python3
"""TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH."""
import argparse
import json
from pathlib import Path
import re
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from dev_speed_console import operator_server


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--output", type=Path, required=True)
    output = args.parse_args().output
    output.mkdir(parents=True, exist_ok=False)
    calls = []
    mode = "Adaptive"

    def stub(request):
        nonlocal mode
        if request is not None:
            calls.append(request)
            mode = "Full Speed" if request["full_speed"] else "Adaptive"
        return {"mode": mode, "adaptive_tier": "Trickle", "running": True,
                "idle": False, "remaining_seconds": 119 if mode == "Full Speed" else 0}

    with operator_server(0, stub) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{server.server_port}"
        try:
            with urlopen(origin, timeout=5) as response:
                token = re.search(r'name="operator-token" content="([0-9a-f]{64})"',
                                  response.read().decode())[1]
            request = {"full_speed": True, "seconds": 120}

            def reject(headers, body, status):
                args = Request(origin + "/status", json.dumps(body).encode(), headers=headers)
                try:
                    urlopen(args, timeout=5)
                except HTTPError as error:
                    assert error.code == status
                else:
                    raise AssertionError("Unexpected privileged route access")

            reject({"Origin": "https://example.invalid", "X-B2Z-Operator": token}, request, 403)
            reject({"Origin": origin}, request, 403)
            reject({"Origin": origin, "X-B2Z-Operator": token}, request | {"seconds": 301}, 400)
            assert not calls

            from playwright.sync_api import expect, sync_playwright
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
                page = browser.new_page(viewport={"width": 390, "height": 844})
                page.goto(origin)
                adaptive = page.get_by_role("button", name="Adaptive")
                full = page.get_by_role("button", name="Full Speed")
                expect(adaptive).to_have_attribute("aria-pressed", "true")
                full.click()
                expect(full).to_have_attribute("aria-pressed", "true")
                expect(page.locator("#remaining")).to_have_text("119 seconds remaining")
                page.screenshot(path=output / "control.png")
                adaptive.click()
                expect(adaptive).to_have_attribute("aria-pressed", "true")
                expect(page.locator("#remaining")).to_be_empty()
                assert [call["full_speed"] for call in calls] == [True, False]
                browser.close()
        finally:
            server.shutdown()
    (output / "browser.json").write_text(json.dumps({"status":"PASS","viewport":[390,844],
        "scope":"real Chromium and local bridge transport, controlled controller reply",
        "cross_origin_and_bad_duration_rejected":True,"exact_switch_operations":calls},indent=2)+"\n")


if __name__ == "__main__":
    main()
