"""Focused native browser regressions in the populated, offline observer fixture."""
from playwright.sync_api import expect


def verify_prelaunch_interactions(browser, origin, out, errors):
    rows = []
    for width, height in ((1440, 900), (390, 844), (320, 640), (390, 475)):
        context = browser.new_context(viewport={"width": width, "height": height},
                                      has_touch=width < 700,
                                      reduced_motion="reduce" if width == 320 else "no-preference")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(origin + "/?case=orbit&orbit")
        page.wait_for_function("()=>!!window.fixture")
        page.locator("#identify-button").click()
        page.locator("#sending-account").fill(page.evaluate("()=>fixture.world().cannons[0].account"))
        page.locator("#identity-save").click()
        page.keyboard.press("Escape")
        page.evaluate("()=>fixture.pose(4007,64)")
        point = page.evaluate("()=>fixture.pointCell(4007)")
        page.mouse.click(point["x"], point["y"])
        expect(page.locator("#action-prompt")).to_have_text("Pay to Reorient")
        expect(page.locator("[data-deflector-orientation='NW']")).to_be_disabled()
        expect(page.locator("[data-deflector-orientation='NE']")).to_have_attribute("aria-pressed", "true")
        expect(page.locator("#text-memo")).to_have_text("DROT 1 E")
        page.screenshot(path=out / f"{width}x{height}-reorient.png")

        def position(compass):
            box = compass.bounding_box()
            return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2

        for d in ((1, 1, 2, 3) if height>=500 else ()):
            button = page.locator(f"[data-board-quarter='{d}']")
            dest = position(button)
            button.click()
            page.wait_for_function("()=>!fixture.shell.controller.rotation")
            north = position(page.locator("[data-board-quarter='0']"))
            assert all(abs(a - b) < 1 for a, b in zip(north, dest)), (north, dest)
            assert page.locator("#text-memo").text_content() == "DROT 1 E"

        page.keyboard.press("Escape")
        tile = page.evaluate("""()=>{
          const c=fixture.world().cannons[0].cell;
          for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){
            const cell=((Math.floor(c/1000)+y+1000)%1000)*1000+(c%1000+x+1000)%1000;
            const cx=cell%1000+.5,cy=Math.floor(cell/1000)+.5;
            if(fixture.displayedBalls().some(b=>Math.hypot(b.x-cx,b.y-cy)<1.3))continue;
            if(fixture.world().cannons.some(b=>b.cell===cell)||fixture.world().deflectors.some(b=>b.cell===cell))continue;
            if(fixture.inspectSite(cell).selectable)return cell;
          }
        }""")
        assert tile is not None
        page.evaluate("cell=>fixture.pose(cell,50)", tile)
        point = page.evaluate("cell=>fixture.pointCell(cell)", tile)
        page.evaluate("""()=>{window.flashes=0;const panel=document.getElementById('workspace');new MutationObserver(rs=>{
          flashes+=rs.filter((r,i)=>r.oldValue!==null&&(i+1<rs.length?rs[i+1].oldValue:panel.getAttribute('hidden'))===null).length;
        }).observe(panel,{attributes:true,attributeOldValue:true,attributeFilter:['hidden']})}""")
        page.mouse.dblclick(point["x"], point["y"])
        page.wait_for_timeout(500)
        expect(page.locator("#workspace")).to_be_hidden()
        assert page.evaluate("()=>window.flashes") == 0, page.evaluate("()=>fixture.proposal()")
        assert page.evaluate("()=>fixture.camera.scale") > 50
        point = page.evaluate("cell=>fixture.pointCell(cell)", tile)
        page.mouse.click(point["x"], point["y"])
        expect(page.locator("#workspace")).to_be_visible()
        page.keyboard.press("Escape")

        page.evaluate("""()=>{const base={phase:'STALLED',live:true,verified:true,fresh:true,
           healthy:true,operationalFresh:true,advancing:false,
           operational:{run:{running:true,pace:{mode:'Trickle',supported_milli:10,admission_open:true}},
           source:{binding_checked:true,last_error:[]}}};
           window.presentWait=(extra)=>fixture.status({...base,...extra});presentWait({});
        }""")
        expect(page.locator("#motion-wait")).to_be_visible()
        expect(page.locator("#waiting-label")).to_have_text("Catching up with on-chain activity...")
        page.screenshot(path=out / f"{width}x{height}-waiting.png")
        page.evaluate("()=>presentWait({phase:'PLAYING',advancing:true})")
        expect(page.locator("#motion-wait")).to_be_hidden()
        page.evaluate("()=>fixture.cycles('certified')")
        expect(page.locator("#cycles-display")).to_contain_text("Cycles 2.00T")
        expect(page.locator("#cycles-display")).to_contain_text("(~8B/day)")
        assert page.locator("#cycle-values").evaluate("(n)=>n.scrollWidth<=n.clientWidth"), page.locator("#cycle-values").evaluate("(n)=>[n.scrollWidth,n.clientWidth,n.textContent]")
        page.screenshot(path=out / f"{width}x{height}-cycles.png")
        page.evaluate("()=>fixture.cycles('hidden')")
        expect(page.locator("#cycles-burn")).to_be_hidden()
        rows.append({"status": "PASS", "viewport": [width, height], "scope": "populated interaction fixture"})
        context.close()

    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script("""window.audioNodes=[];const gain=AudioContext.prototype.createGain;
      AudioContext.prototype.createGain=function(){const node=gain.call(this);audioNodes.push(node);return node;};
    """)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(origin + "/?case=orbit&orbit")
    page.wait_for_function("()=>!!window.fixture")
    page.evaluate("()=>{window.audio=fixture.audioProbeStart();}")
    speaker = page.locator("#audio-button")
    expect(speaker).to_have_attribute("data-available", "false")
    expect(speaker).to_have_attribute("tabindex", "-1")
    page.locator("#board").focus()
    page.keyboard.press("ArrowRight")
    expect(speaker).to_have_attribute("data-available", "true", timeout=30000)
    expect(speaker).to_have_attribute("tabindex", "0")
    page.wait_for_function("()=>audioNodes.length>=4&&Math.abs(audioNodes[0].gain.value-.8)<1e-5")
    gains = page.evaluate("()=>audioNodes.slice(0,4).map(n=>n.gain.value)")
    assert abs(gains[1] - .5) < 1e-5 and abs(gains[3] - 3) < 1e-5, gains
    page.screenshot(path=out / "speaker-available.png")
    page.evaluate("()=>audio.lifecycle(true)")
    expect(speaker).to_have_attribute("data-available", "false")
    expect(speaker).to_be_hidden()
    page.screenshot(path=out / "speaker-unavailable.png")
    page.evaluate("()=>audio.lifecycle(false)")
    expect(speaker).to_be_visible(timeout=30000)
    expect(speaker).to_have_attribute("tabindex", "0")
    speaker.click()
    expect(speaker).to_have_attribute("data-muted", "true")
    expect(speaker).to_be_visible()
    page.screenshot(path=out / "speaker-muted.png")
    page.reload()
    page.wait_for_function("()=>!!window.fixture")
    page.evaluate("()=>{window.audio=fixture.audioProbeStart();}")
    expect(speaker).to_have_attribute("data-muted", "true")
    expect(speaker).to_be_visible()
    rows.append({"status": "PASS", "scope": "native Chromium AudioContext gain graph and controlled interruption",
                 "gains": {"master": gains[0], "music": gains[1], "effects": gains[3]}})
    context.close()
    return rows
