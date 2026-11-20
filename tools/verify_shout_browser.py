#!/usr/bin/env python3
"""Two independent query-only browser observers of an installed Shout payment batch."""
import argparse
import json
import socket
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

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
