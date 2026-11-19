#!/usr/bin/env python3
"""Browser evidence for the exact wordmark, favicon and standalone 404 asset."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", required=True)
parser.add_argument("--baseline")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
assert urlsplit(args.url).hostname=="127.0.0.1" or urlsplit(args.url).hostname.endswith(".localhost")
args.output.mkdir(parents=True, exist_ok=False)
rows = []
wordmark = "/balls-to-the-wallz-b2z-wordmark.svg"
icon = "/balls-to-the-wallz-b2-icon-matched.svg"


def header(page):
    logo = page.locator(".arena-header .brand img")
    assert logo.get_attribute("src") == wordmark
    assert logo.get_attribute("alt") == "B2Z"
    page.wait_for_function("()=>document.querySelector('.brand img').naturalWidth===1711")
    assert logo.evaluate("n=>n.naturalHeight") == 622
    anchor = logo.bounding_box()
    assert anchor["width"] >= 48 and abs(anchor["width"] / anchor["height"] - 1711 / 622) < .02, anchor
    status = page.locator("#status-button").bounding_box()
    account = page.locator("#identify-button").bounding_box()
    assert status["width"] >= 44 and status["height"] >= 44
    assert account["width"] >= 44 and account["height"] >= 44
    assert anchor["x"] + anchor["width"] <= status["x"] < account["x"]
    assert account["x"] + account["width"] <= page.viewport_size["width"] + .5
    return {"logo": anchor, "status": status, "account": account}


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, chromium_sandbox=True)
    for w, h in [(1440, 900), (390, 844), (320, 640), (568, 320)]:
        context = browser.new_context(viewport={"width": w, "height": h}, reduced_motion="reduce")
        if urlsplit(args.url).hostname=="127.0.0.1":
            context.route("**/*",lambda route: route.continue_() if route.request.url.startswith(args.url + "/") else route.abort())
        page = context.new_page()
        requests = []
        page.on("requestfinished", lambda request: requests.append(urlsplit(request.url).path))
        assert page.goto(args.url, wait_until="load").status == 200
        layout = header(page)
        assert page.locator('link[rel="icon"]').evaluate_all("ns=>ns.map(n=>n.getAttribute('href'))") == ["/favicon.ico", icon]
        assert page.request.get(args.url + "/favicon.ico").headers["content-type"] == "image/x-icon"
        assert page.request.get(args.url + icon).headers["content-type"] == "image/svg+xml"
        # A browser-managed favicon is also fetched as a favicon resource on Chromium.
        favicons = page.evaluate("performance.getEntriesByType('resource').filter(e=>e.initiatorType==='icon').map(e=>e.name)")
        page.locator(".arena-header").screenshot(path=str(args.output / f"header-{w}.png"))
        cached = page.reload(wait_until="load")
        assert cached is not None and cached.ok
        header(page)
        page.evaluate("document.documentElement.style.fontSize='200%'")
        assert page.locator("html").evaluate("n=>getComputedStyle(n).fontSize")=="32px"
        enlarged = header(page)
        page.locator(".arena-header").screenshot(path=str(args.output / f"header-{w}-enlarged.png"))
        rows.append({"viewport": [w, h], "layout": layout, "enlarged": enlarged,
                     "browser_favicon_resources": favicons, "browser_requests": sorted(set(requests))})
        if args.baseline:
            original = context.new_page()
            assert original.goto(args.baseline, wait_until="load").ok
            original.locator(".arena-header").screenshot(path=str(args.output / f"previous-header-{w}.png"))
            original.close()
        context.close()
    for w,h in [(1440,900),(320,640),(568,320)]:
        context = browser.new_context(viewport={"width":w,"height":h},java_script_enabled=False,
                                      reduced_motion="reduce",forced_colors="active" if w==568 else "none")
        page=context.new_page()
        requests=[]
        page.on("request",lambda request:requests.append((request.method,urlsplit(request.url).path)))
        response=page.goto(args.url+"/404.html",wait_until="load")
        assert response.ok
        page.get_by_role("heading",name="404 Tile not found").wait_for()
        emblem=page.locator(".emblem")
        assert emblem.get_attribute("src")==icon
        box=emblem.bounding_box()
        assert abs(box["width"]-box["height"])<1 and box["x"]>=0 and box["x"]+box["width"]<=w+.5
        page.screenshot(path=str(args.output / f"not-found-{w}.png"),full_page=True)
        link=page.get_by_role("link",name="Return to game")
        assert link.get_attribute("href")=="/"
        page.keyboard.press("Tab")
        assert link.evaluate("n=>n===document.activeElement&&getComputedStyle(n).outlineStyle==='solid'")
        page.screenshot(path=str(args.output / f"not-found-{w}-keyboard.png"),full_page=True)
        assert all(method=="GET" and path in {"/404.html","/not-found.css",wordmark,icon,"/favicon.ico"}
                   for method,path in requests),requests
        page.keyboard.press("Enter")
        page.wait_for_url(args.url + "/")
        rows.append({"not_found_viewport":[w,h],"http_status":response.status,"javascript_disabled":True,
                     "keyboard_return":True,"forced_colours":w==568})
        context.close()
    version=browser.version
    browser.close()
(args.output/"results.json").write_text(json.dumps({"status":"PASS","chromium":version,"cases":rows},indent=2)+"\n")
