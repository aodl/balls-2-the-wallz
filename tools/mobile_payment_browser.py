"""Rules20 paid-world layout and payment invariants at the production camera pose."""

from fluid_playability_browser import settled_panel
from quantity_browser import editor, gesture_probes, resize, status

VALUES = [
    ("established", "1788854947640", "605139188931",
     "55-minute sample window ending 1 minutes before certification. Approximate settled net balance decline. Established estimate."),
    ("preliminary", "1814225195388", "628827487421",
     "5-minute sample window ending 2 minutes before certification. Approximate settled net balance decline. Preliminary estimate."),
    ("stale", "1788854947640", "605139188931",
     "55-minute sample window ending 14 minutes before certification. Approximate settled net balance decline. Last valid measurement is stale."),
    ("unavailable", "1788854947640", None, None),
    ("established-again", "1788854947640", "605139188931",
     "55-minute sample window ending 1 minutes before certification. Approximate settled net balance decline. Established estimate."),
]

READOUT = """() => {
 const control=document.querySelector('#cycles-display'), values=document.querySelector('#cycle-values');
 const clip=values.getBoundingClientRect(), chip=control.getBoundingClientRect();
 const nodes=document.createTreeWalker(values,NodeFilter.SHOW_TEXT);
 const ink=[];
 for(let n=nodes.nextNode();n;n=nodes.nextNode()){
  if(!n.textContent.trim()||n.parentElement.closest('[hidden]')) continue;
  const range=document.createRange(); range.selectNodeContents(n);
  ink.push(...[...range.getClientRects()].filter(rect=>rect.width>0).map(rect=>rect.toJSON()));
 }
 const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 const hud=[...document.querySelectorAll('#board-compass button,#minimap,.camera-controls button,#quantity-controls:not([hidden]),.panel:not([hidden])')];
 return {line:values.innerText,ink,clip:clip.toJSON(),overflow:values.scrollWidth-values.clientWidth,
  obstructed:hud.filter(n=>getComputedStyle(n).visibility==='visible'&&overlaps(chip,n.getBoundingClientRect()))
   .map(n=>n.id||n.className)};
}"""

PANE = """() => {
 const pane=document.querySelector('.panel-scroll'), c=fixture.aim().cannon;
 const source=fixture.camera.cellPoint(c.cell), handle=document.querySelector('#aim-handle');
 const handleBox=handle.getBoundingClientRect();
 return {height:pane.clientHeight,natural:pane.scrollHeight,
  panel:document.querySelector('#workspace').getBoundingClientRect().toJSON(),
  source:{visible:source.visible,hit:document.elementFromPoint(source.sx,source.sy)?.id},
  handle:handle.hidden?null:document.elementFromPoint(handleBox.x+22,handleBox.y+22)?.id};
}"""

FIELDS = """() => ['full-recipient','transfer-amount','text-memo','full-payer']
 .map(id=>document.getElementById(id).textContent)"""


def verify_mobile_payment(browser, url, out, report, save):
    report["mobile_correction"] = []
    for width, height in ((1440, 900), (390, 844), (320, 640), (320, 350)):
        context = browser.new_context(viewport={"width": width, "height": 640 if height < 520 else height},
                                      has_touch=width < 700, permissions=["clipboard-write"])
        context.add_init_script("""globalThis.copyAudit=[];
          const write=navigator.clipboard.writeText.bind(navigator.clipboard);
          navigator.clipboard.writeText=async value=>{await write(value);copyAudit.push(value)}""")
        page = context.new_page()
        page.goto(url + "/?case=rules20Mobile&rules20")
        page.wait_for_function("()=>Boolean(globalThis.fixture)")
        account = page.evaluate("fixture.world().cannons[0].account")
        page.locator("#identify-button").click()
        page.locator("#sending-account").fill(account)
        page.locator("#identity-save").click()
        page.keyboard.press("Escape")
        page.evaluate("""() => {
         const c=fixture.world().cannons[0], camera=fixture.camera;
         camera.centre(c.cell%1000+.07910310643660523,Math.floor(c.cell/1000)+.07910310643660523);
         camera.scale=67.2; camera.angle=-3*Math.PI/2;
         fixture.draw(); fixture.select(c.id);
        }""")
        page.evaluate("values=>fixture.cycleRecord(...values)", list(VALUES[0][1:]))
        page.locator("#fire-action").click()
        if height < 520:
            resize(page, {"width": width, "height": height})
        settled_panel(page)
        page.wait_for_timeout(650)
        page.evaluate("globalThis.quantityIdentity=document.getElementById('quantity-controls')")
        measured = page.evaluate(PANE)
        row = {"viewport": [width, height], "fire": measured, "cycles": []}
        report["mobile_correction"].append(row)
        save()
        page.screenshot(path=out / f"mobile-{width}-{height}-fire.png")
        assert measured["height"] >= min(96 if height < 520 else 240, measured["natural"]), measured
        assert measured["source"]["visible"], measured
        if height >= 520:
            assert measured["source"]["hit"] in ("board", "aim-handle") and measured["handle"] == "aim-handle", measured
        editor(page)
        exact = page.evaluate(FIELDS)
        assert all(exact), exact
        for quality, balance, rate, detail in VALUES:
            page.evaluate("values=>fixture.cycleRecord(...values)", [balance, rate, detail])
            settled_panel(page)
            readout = page.evaluate(READOUT)
            row["cycles"].append({"quality": quality, **readout})
            save()
            assert not readout["obstructed"] and readout["overflow"] <= 0, readout
            assert bool(rate) == ("~" in readout["line"]), readout
            assert readout["ink"] and all(rect["right"] <= readout["clip"]["right"] + .5 and
                rect["left"] >= readout["clip"]["left"] - .5 for rect in readout["ink"]), readout
            assert page.evaluate(PANE)["panel"] == measured["panel"], (quality, measured)
            assert page.evaluate(FIELDS) == exact
            if detail:
                assert detail in page.locator("#cycle-detail").text_content()
        status(page, "protected")
        assert page.locator("[data-copy=text]").is_disabled()
        assert page.evaluate(PANE)["panel"] == measured["panel"]
        assert page.evaluate(FIELDS) == exact
        status(page, "healthy")
        for name, expected in zip(("owner", "amount", "text"), (exact[0], exact[1].removesuffix(" ICP"), exact[2]), strict=True):
            page.locator(f"[data-copy={name}]").click()
            page.wait_for_function("(v)=>copyAudit.at(-1)===v", arg=expected, timeout=5000)
        row["clipboard"] = "PASS"
        if width == 320 and height == 640:
            # Start the native two-finger probe from exposed arena pixels.
            # The default heading for this paid world puts the handle there.
            for heading in (0, 90, 180, 270):
                page.evaluate("heading=>fixture.setHeading(heading)", heading)
                if page.evaluate("""()=>{
                  const p=fixture.camera.cellPoint(fixture.aim().cannon.cell);
                  return [-26,64].every(dx=>document.elementFromPoint(p.sx+dx,p.sy+4)?.id==='board');
                }"""):
                    break
            gesture_probes(page, context, row)
        save()
        context.close()
