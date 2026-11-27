#!/usr/bin/env python3
"""Read-only maintained browser and agent against a live disposable burn canister."""
import argparse
import json
import socket
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--configuration", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--expect-burn", action="store_true")
parser.add_argument("--agent-only", action="store_true")
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
agent = subprocess.run(["node", "tools/verify_certified_burn_agent.mjs",
                        str(args.configuration), "established" if args.expect_burn else "none"],
                       capture_output=True, text=True)
(out / "agent.log").write_text(agent.stdout + agent.stderr)
if agent.returncode:
    raise RuntimeError(f"live maintained agent failed: {agent.stderr}")
agent_result = json.loads(agent.stdout)
(out / "agent.json").write_text(json.dumps(agent_result, indent=2) + "\n")
if args.agent_only:
    (out / "results.json").write_text(json.dumps({"status": "PASS", "browser": None,
                                                  "agent": agent_result}, indent=2) + "\n")
    sys.exit(0)
subprocess.run(["node", "tools/build_observer_playability.mjs", "--local-test-config",
                str(policy), "--output", str(out / "assets")], check=True)
with (out / "server.log").open("w") as log:
    server = subprocess.Popen(
        ["python3.11", "tools/serve_observer.py", "--port", str(port),
         "--deployment-assets", str(out / "assets"),
         "--live-config", str(args.configuration.resolve().parent),
         "--ic-gateway", config["host"], "--live-canister", config["canister_id"]],
        stdout=log, stderr=subprocess.STDOUT,
    )
    try:
        observations = []
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, chromium_sandbox=True)
            context = browser.new_context(viewport={"width": 390, "height": 844})
            mutations, errors = [], []

            def query_only(route):
                request = route.request
                if request.method in ("GET", "HEAD", "OPTIONS") or (
                    request.method == "POST" and request.url.endswith(("/query", "/read_state"))
                ):
                    route.continue_()
                else:
                    mutations.append([request.method, request.url])
                    route.abort()

            context.route("**/*", query_only)
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            for attempt in range(2):
                if attempt:
                    page.reload(wait_until="domcontentloaded")
                else:
                    page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("()=>__b2zExperience?.session?.ready", timeout=90000)
                row = page.evaluate("""()=>{
                    const s=__b2zExperience.session;
                    const values=document.getElementById('cycle-values');
                    const burn=document.getElementById('cycles-burn');
                    const display=document.getElementById('cycles-display');
                    return {root:s.sequence.last.root_hash,head:String(s.sequence.last.publication.head.segment_id),
                        quality:s.verifiedBurn?.quality??null,rate:s.verifiedBurn?.cyclesPerDay?.toString()??null,
                        burnEndNs:s.verifiedBurn?.endNs?.toString()??null,
                        line:display.textContent.replace(/\\s+/g,' ').trim(),valuesVisible:!values.hidden,
                        burnVisible:!burn.hidden,displayHeight:display.getBoundingClientRect().height,
                        valueHeight:values.getBoundingClientRect().height};
                }""")
                if args.expect_burn:
                    assert row["quality"] == "established" and int(row["rate"]) > 0, row
                    assert row["valuesVisible"] and row["burnVisible"], row
                    assert "/day" in row["line"] and "Cycles" in row["line"], row
                    assert row["valueHeight"] <= row["displayHeight"] + 1, row
                else:
                    assert row["quality"] is None and not row["burnVisible"], row
                observations.append(row)
            assert int(observations[1]["head"]) >= int(observations[0]["head"]), observations
            if observations[0]["head"] == observations[1]["head"] and (
                not args.expect_burn or observations[0]["burnEndNs"] == observations[1]["burnEndNs"]
            ):
                assert observations[0]["root"] == observations[1]["root"], observations
            if args.expect_burn:
                assert int(observations[1]["burnEndNs"]) >= int(observations[0]["burnEndNs"]), observations
                if observations[0]["burnEndNs"] == observations[1]["burnEndNs"]:
                    assert observations[0]["rate"] == observations[1]["rate"], observations
            assert not mutations and not errors, (mutations, errors)
            page.screenshot(path=out / "live-observer.png")
            context.close()
            browser.close()
        result = {"status": "PASS", "browser": observations, "agent": agent_result}
        (out / "results.json").write_text(json.dumps(result, indent=2) + "\n")
    finally:
        server.terminate()
        server.wait(timeout=15)
