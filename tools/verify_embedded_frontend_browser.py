#!/usr/bin/env python3
"""Normal browser on a disposable immutable frontend, with real audio decoding."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--rules", type=int, choices=[12, 13], default=12)
args = parser.parse_args()
assert urlsplit(args.url).hostname.endswith(".localhost")
args.output.mkdir(parents=True, exist_ok=False)
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    page = context.new_page()
    denied = []
    def read_only(route):
        req = route.request
        if req.method in {"GET", "HEAD", "OPTIONS"} or (
            req.method == "POST" and req.url.endswith(("/query", "/read_state"))
        ):
            route.continue_()
        else:
            denied.append(req.method)
            route.abort()
    context.route("**/*", read_only)
    assert page.goto(args.url, wait_until="domcontentloaded").status == 200
    page.wait_for_function("()=>Boolean(__b2zExperience?.session?.ready)", timeout=120000)
    assert page.evaluate("__b2zExperience.session.config.rules_version") == args.rules
    assert page.evaluate("!__b2zExperience.session.error")
    page.screenshot(path=str(args.output/"ready.png"))
    decoded = page.evaluate("""async()=>{
      const root='/audio/b2z-v1/';
      const response=await fetch(root+'manifest.json',{cache:'no-cache'});
      if(!response.ok)throw Error('audio manifest HTTP '+response.status);
      const m=await response.json();
      const controller=new OfflineAudioContext(2,1,48000);
      const results=[];
      for(const entry of [...m.segments,...Object.values(m.effects)]){
        const t=performance.now();
        const res=await fetch(root+entry.file,{cache:'no-cache'});
        if(!res.ok||res.headers.get('content-type')!=='audio/flac'||
           res.headers.has('content-encoding'))throw Error('FLAC delivery: '+entry.file);
        const bytes=await res.arrayBuffer();
        const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
          .map(x=>x.toString(16).padStart(2,'0')).join('');
        if(digest!==entry.sha256||bytes.byteLength!==entry.bytes)throw Error('FLAC identity: '+entry.file);
        const samples=await controller.decodeAudioData(bytes);
        if(!samples.length||samples.sampleRate!==48000||!samples.numberOfChannels)
          throw Error('FLAC decode: '+entry.file);
        results.push({file:entry.file,sha256:digest,frames:samples.length,channels:samples.numberOfChannels,
          duration:samples.duration,fetch_and_decode_ms:performance.now()-t});
      }
      return results;
    }""")
    assert len(decoded) == 60
    assert not denied
    context.close()

    static = browser.new_context(viewport={"width":320,"height":640},java_script_enabled=False,
                                 reduced_motion="reduce",has_touch=True)
    page=static.new_page()
    paths=[]
    page.on("request",lambda req:paths.append(urlsplit(req.url).path))
    response=page.goto(args.url+"/nonexistent/page?example=1",wait_until="load")
    assert response.status == 404
    page.get_by_role("heading",name="404 Tile not found").wait_for()
    page.screenshot(path=str(args.output/"real-404-320.png"))
    assert "/app.mjs" not in paths and not any(p.startswith("/api/") or p.startswith("/audio/") for p in paths)
    page.keyboard.press("Tab")
    assert page.get_by_role("link",name="Return to game").evaluate("a=>document.activeElement===a")
    page.keyboard.press("Enter")
    page.wait_for_url(args.url+"/")
    version=browser.version
    browser.close()
(args.output/"results.json").write_text(json.dumps({"status":"PASS","chromium":version,
    "rules":args.rules,"native_flac_decode":decoded,"missing_url_status":404,
    "scope":"Actual disposable immutable frontend. The backend, if mainnet, was used only through read-only queries."},indent=2)+"\n")
