"""Focused Rules15 widget journeys in the actual Chromium/Three.js fixture."""
from playwright.sync_api import expect


def scene(page, cell, scale, x=None, y=None):
    return page.evaluate("""([n, scale, x, y]) => {
        document.dispatchEvent(new Event('b2z-entry-cancel'));
        const c=fixture.camera,w=c.viewport.width,h=c.viewport.height;
        fixture.shell.controller.cancel();c.scale=scale;c.centre(n%c.width+.5,Math.floor(n/c.width)+.5);
        c.pan((x??w/2)-w/2,(y??h/2)-h/2);fixture.draw();
        return fixture.summary().camera;
    }""", [cell, scale, x, y])


def point(page, cell):
    pixel = page.evaluate("n=>fixture.camera.cellPoint(n)", cell)
    assert pixel["visible"], pixel
    return pixel["sx"], pixel["sy"]


def board_point(page, cell):
    position = point(page, cell)
    assert page.evaluate("([x,y])=>document.elementFromPoint(x,y)?.id==='board'", position), position
    return position


def target_panel(page, cell):
    page.wait_for_function("n=>fixture.proposal().cell===n", arg=cell)
    panel = page.locator("#workspace")
    expect(panel).to_be_visible()
    assert not panel.evaluate("node=>node.inert")
    rect = panel.bounding_box()
    x, y = point(page, cell)
    assert not (rect["x"] <= x <= rect["x"]+rect["width"] and rect["y"] <= y <= rect["y"]+rect["height"]), (rect, x, y)
    assert rect["x"] >= 0 and rect["y"] >= 0
    expect(page.locator("#cycles-display")).to_be_visible()
    return rect


def copies(page, memo):
    for field, text in (("amount","0.0001"),("owner","s5ir5-gqaaa-aaaas-amyna-cai"),("text",memo)):
        page.locator(f'[data-copy="{field}"]').click()
        assert page.evaluate("navigator.clipboard.readText()") == text


def denied_move_copy(page, context, memo):
    page.evaluate("navigator.clipboard.writeText('untouched clipboard')")
    cdp = context.new_cdp_session(page)
    permission = {
        "permission":{"name":"clipboard-write"},
        "origin":page.evaluate("location.origin"),
        "browserContextId":cdp.send("Target.getTargetInfo")["targetInfo"]["browserContextId"],
    }
    try:
        cdp.send("Browser.setPermission", {**permission, "setting":"denied"})
        assert page.evaluate("navigator.permissions.query({name:'clipboard-write'}).then(p=>p.state)") == "denied"
        expected = list(memo.encode("utf-8"))
        assert page.evaluate("navigator.clipboard.readText()") != memo
        page.evaluate("""()=>{
            const write=navigator.clipboard.writeText.bind(navigator.clipboard);
            window.deniedMoveWrites=[];
            navigator.clipboard.writeText=async value=>{
                try{return await write(value);}
                catch(error){deniedMoveWrites.push({name:error.name,bytes:[...new TextEncoder().encode(value)]});throw error;}
            };
        }""")
        copy = page.locator('[data-copy="text"]')
        expect(copy).to_be_enabled()
        copy.click()
        manual = page.locator("#manual-value")
        expect(manual).to_have_value(memo)
        expect(page.locator("#copy-feedback")).to_contain_text("Clipboard unavailable.")
        assert page.evaluate("deniedMoveWrites") == [{"name":"NotAllowedError","bytes":expected}]
        manual.press("Control+C")
        assert page.evaluate("navigator.clipboard.readText()").encode("utf-8") == bytes(expected)
        page.locator("#manual-handoff").click()
        expect(page.locator("#manual-copy")).to_be_hidden()
        return {"permission":"denied", "native_result":"NotAllowedError", "manual_utf8":expected}
    finally:
        cdp.detach()


def guide_overlap(page, screen, width, source, destination, stem):
    # Match the Three.js buffer to the full board-space arrow at every
    # orientation. Force a real overlapping pose by panning the terrain.
    for quarter in (0,1,2,3):
        button=page.locator(f"[data-board-quarter='{quarter}']")
        if button.is_enabled():
            button.click()
        page.wait_for_function("q=>fixture.camera.quarter===q&&!fixture.shell.controller.rotation",arg=quarter)
        scene(page,destination,22,width/2,340 if width<700 else 370)
        assert not page.evaluate("n=>fixture.camera.cellPoint(n).visible",source)
        page.wait_for_function("""()=>{
            const arrow=fixture.moveGuide(),drawn=fixture.inspect();
            return arrow&&drawn.guide&&drawn.guideEnd
                && [drawn.guide,drawn.guideEnd].every((p,i)=>p.every((n,j)=>Math.abs(n-arrow.world[i][j])<.0002));
        }""")
    if width!=1440:
        return False
    for quarter in (0,1,2,3):
        button=page.locator(f"[data-board-quarter='{quarter}']")
        if button.is_enabled():
            button.click()
        page.wait_for_function("q=>fixture.camera.quarter===q&&!fixture.shell.controller.rotation",arg=quarter)
        panel=page.locator('#workspace').bounding_box()
        for px,py in [(panel['x']-65,panel['y']+90),(panel['x']+60,panel['y']+panel['height']+45)]:
            scene(page,source,38,px,py)
            overlaps=page.evaluate("""()=>{
                const a=fixture.moveGuide(),drawn=fixture.inspect();
                if(!a||!drawn.guide||!drawn.guideEnd)return false;
                if(![drawn.guide,drawn.guideEnd].every((p,i)=>p.every((n,j)=>Math.abs(n-a.world[i][j])<.0002)))return false;
                const [s,t]=a.screen,points=Array.from({length:15},(_,i)=>{
                    const f=i/14;return document.elementFromPoint(s.x+(t.x-s.x)*f,s.y+(t.y-s.y)*f);
                });
                return points.some(n=>n?.closest('#workspace'))&&points.some(n=>n?.id==='board');
            }""")
            if overlaps:
                screen(page,f"{stem}-arrow-behind-panel")
                expect(page.locator('[data-copy=text]')).to_be_enabled()
                expect(page.get_by_placeholder('Shout (optional)')).to_be_visible()
                return True
    raise AssertionError('movement fixture needs a genuine panel overlap')


def movement(browser, url, declare, screen, width, height, diverter, floating=False):
    context = browser.new_context(viewport={"width":width,"height":height}, has_touch=width<700,
                                  permissions=["clipboard-read","clipboard-write"], reduced_motion="reduce")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(url)
    page.wait_for_function("()=>Boolean(globalThis.fixture)")
    declare(page)
    if width < 700:
        for quarter in (1, 0):
            button=page.locator(f"[data-board-quarter='{quarter}']")
            bounds=button.bounding_box()
            page.touchscreen.tap(bounds["x"]+22,bounds["y"]+22)
            expect(button).to_be_disabled()
            assert page.evaluate("fixture.shell.controller.rotation === null")
    source, first = (4007, 500500) if diverter else (4004, 500500)
    stem = f"{'diverter' if diverter else 'cannon'}-{width}"
    scene(page, source, 42, width/2, 124 if width<700 else 390)
    if diverter:
        page.mouse.click(*board_point(page, source))
    else:
        page.evaluate("fixture.select(1)")
    page.locator("#move-action").click()
    assert page.evaluate("fixture.proposal().mode") == ("deflector_move" if diverter else "move")
    old = page.evaluate("fixture.proposal().cell")
    pose = scene(page, first, 22, width/2, 420 if width<700 else 370)
    assert not page.evaluate("n=>fixture.camera.cellPoint(n).visible", source)
    assert old != first
    if width < 700:
        page.touchscreen.tap(*board_point(page, first))
    else:
        page.mouse.click(*board_point(page, first))
    target_panel(page, first)
    assert page.evaluate("fixture.summary().camera") == pose
    assert page.evaluate("fixture.inspect().ghostKind") == ("deflector" if diverter else "cannon")
    shout = page.get_by_placeholder("Shout (optional)")
    if floating:
        expect(shout).to_be_visible()
        assert shout.evaluate("node=>node.closest('#launch-editors').parentElement.id==='arena'")
        assert not shout.evaluate("node=>node.closest('#workspace')")
    shout.fill("far")
    payload = f"{'DMOVE' if diverter else 'MOVE'} 1 {first}|far"
    expect(page.locator("#text-memo")).to_have_text(payload)
    copies(page, payload)
    screen(page, f"{stem}-distant-move")
    page.locator("#board").press("Alt+ArrowRight")
    page.locator("#board").press("Enter")
    second = first+1
    target_panel(page, second)
    assert page.evaluate("fixture.summary().camera") == pose
    assert page.locator('#replace-choice').count()==0
    updated = f"{'DMOVE' if diverter else 'MOVE'} 1 {second}|far"
    expect(page.locator("#text-memo")).to_have_text(updated)
    copies(page,updated)
    third=second
    scene(page, 255250, 22)
    assert not page.evaluate("n=>fixture.camera.cellPoint(n).visible", third)
    expect(page.locator("#workspace")).to_be_visible()
    expect(page.locator('[data-copy="text"]')).to_be_enabled()
    assert not page.locator("#workspace").evaluate("node=>node.inert")
    if floating:
        expect(shout).to_be_visible()
        expect(shout).to_have_value("far")
        assert shout.evaluate("""node=>{const r=node.getBoundingClientRect(),p=document.getElementById('workspace').getBoundingClientRect();
            return r.top>=0&&r.bottom<=innerHeight&&(r.right<=p.left||r.left>=p.right||r.top>=p.bottom||r.bottom<=p.top)
                &&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===node;}""")
    fallback = denied_move_copy(page, context, updated) if width==1440 and not diverter else None
    screen(page, f"{stem}-offscreen-dock")
    scene(page, third, 22, width/2, 160 if width<700 else 390)
    target_panel(page, third)
    if width == 320:
        page.set_viewport_size({"width":320,"height":360})
        page.wait_for_function("()=>fixture.camera.viewport.height===360")
        expect(page.locator("#workspace")).to_be_visible()
        expect(page.locator("#cycles-display")).to_be_visible()
        expect(page.locator('[data-copy="text"]')).to_be_enabled()
        assert not page.locator("#workspace").evaluate("node=>node.inert")
        if floating:
            expect(shout).to_be_visible()
            expect(shout).to_have_value("far")
            assert shout.evaluate("node=>node.getBoundingClientRect().bottom<=innerHeight")
        screen(page, f"{stem}-contracted-move")
    if width==320:
        page.set_viewport_size({'width':320,'height':640})
        page.wait_for_function('()=>fixture.camera.viewport.height===640')
    overlap=guide_overlap(page,screen,width,source,third,stem)
    assert not page.evaluate("n=>fixture.choose(n)",source)
    expect(page.locator('[data-copy=text]')).to_be_disabled()
    expect(page.locator('#text-memo')).to_have_text('')
    page.wait_for_function("()=>fixture.inspect().guideEnd===null")
    assert page.evaluate("n=>fixture.choose(n)",third)
    expect(page.locator('#text-memo')).to_have_text(updated)
    expect(page.locator('[data-copy=text]')).to_be_enabled()
    assert not errors, errors
    context.close()
    return {"overlap":overlap,"kind":stem, "first":first, "keyboard_destination":third, "native_clipboard":"PASS", "consecutive_quotes":"PASS", "manual_fallback":fallback}


def tile_cases(page, screen, variant, width):
    prefix=f"{variant}-{width}"
    invalid, legal = 5003, 10003
    label = page.locator("#build-action")
    for scale in (2,18,48):
        # At far zoom the genuine cannon halo overlaps several cells. Looking
        # at a remote tile leaves the picked tile unambiguous.
        test_cell=510510
        scene(page, test_cell, scale, width/2, 130 if width<700 else 380)
        page.mouse.move(*board_point(page, test_cell))
        page.wait_for_function("n=>fixture.shell.hover()?.cell===n", arg=test_cell)
        if variant == "after":
            page.wait_for_function("([cell,marker])=>fixture.inspect().tileHighlights.some(h=>h.cell===cell&&h.kind==='hover'&&h.marker===marker)", arg=[test_cell,scale==2])
        screen(page, f"{prefix}-hover-{scale}")
    scene(page,invalid,48,width/2,140 if width<700 else 390)
    page.mouse.click(*board_point(page,invalid))
    expect(label).to_be_disabled()
    if variant != "after":
        screen(page,f"{prefix}-invalid")
        return
    expect(label).to_have_attribute("aria-pressed","true")
    expect(page.locator("#preparation-note")).to_have_text("Choose a tile at least four tiles from every other structure.")
    expect(page.locator('[data-copy="text"]')).to_be_disabled()
    page.wait_for_function("()=>fixture.inspect().tileHighlights.some(h=>h.kind==='invalid'&&h.cell===5003)")
    screen(page,f"{prefix}-invalid")
    page.locator("#close-panel").click()
    # The fixture repositions the camera without a user pan. Use a distinct
    # pixel so the invalid and legal clicks are not a native double-click.
    scene(page,legal,48,width/2+24,140 if width<700 else 390)
    pose=page.evaluate("fixture.summary().camera")
    page.mouse.click(*board_point(page,legal))
    expect(label).to_have_attribute("aria-pressed","true")
    expect(page.locator('[data-copy="text"]')).to_be_enabled()
    expect(page.locator("#text-memo")).to_contain_text(" 10003")
    assert page.evaluate("fixture.summary().camera")==pose
    page.wait_for_function("()=>fixture.inspect().ghostKind==='cannon'")
    screen(page,f"{prefix}-auto-build")
    icon=page.locator('[data-copy=text]')
    before=page.locator('#text-memo').text_content()
    icon.click()
    expect(page.locator('#copy-feedback')).to_contain_text('Copied.')
    assert before.startswith('NEW ') and page.evaluate('navigator.clipboard.readText()')==before
    assert page.evaluate('fixture.choose(10004)')
    expect(page.locator('#text-memo')).to_contain_text(' 10004')
    assert page.evaluate('fixture.choose(10003)')
    scene(page,legal,2,70,300)
    page.wait_for_function("()=>fixture.inspect().tileHighlights.some(h=>h.cell===10003&&h.kind==='destination'&&h.marker)")
    screen(page,f"{prefix}-far-destination")
    page.locator("#deflect-action").click()
    expect(page.locator("#text-memo")).to_contain_text("DEFLECT 10003")
    expect(icon).to_be_enabled()
    icon.click()
    expect(page.locator('#copy-feedback')).to_contain_text('Copied.')
    assert page.evaluate('navigator.clipboard.readText()') == 'DEFLECT 10003 N'
    assert page.evaluate('fixture.choose(10004)')
    expect(page.locator('#text-memo')).to_have_text('DEFLECT 10004 N')
    assert page.locator('#replace-choice').count()==0
    page.locator("#close-panel").click()


def compass_and_turret(page, screen):
    scene(page,4004,66,650,400)
    button = lambda q: page.locator(f"[data-board-quarter='{q}']")
    positions = """()=>[...document.querySelectorAll('#board-compass button')].map(n=>{
        const b=n.getBoundingClientRect(),f=getComputedStyle(n,'::before');
        return {x:b.x+b.width/2,y:b.y+b.height/2,hit:b.width,face:parseFloat(f.width)+parseFloat(f.borderLeftWidth)+parseFloat(f.borderRightWidth),
                fill:f.backgroundColor,disabled:n.disabled,pressed:n.getAttribute('aria-pressed')};
    })"""
    fills=["rgb(18, 21, 23)","rgb(240, 242, 242)","rgb(151, 157, 160)","rgb(240, 242, 242)"]
    controls=page.evaluate(positions)
    assert [c["fill"] for c in controls]==fills and all(c["face"]==34 and c["hit"]==44 for c in controls), controls
    button(1).hover()
    assert button(1).evaluate("b=>getComputedStyle(b,'::before').outlineStyle")=="solid"
    page.locator("#board").focus()
    page.keyboard.press("Tab")
    button(1).focus()
    assert button(1).evaluate("b=>b.matches(':focus-visible')&&getComputedStyle(b).outlineStyle==='solid'")
    timings = []
    page.evaluate("fixture.pauseFrames(true)")
    try:
        for start in range(4):
            for end in range(4):
                page.evaluate("q=>{fixture.camera.angle=-q*Math.PI/2;fixture.draw()}",start)
                if start == end:
                    assert button(end).is_disabled()
                    continue
                first = page.evaluate(positions)
                page.evaluate("q=>document.querySelector('[data-board-quarter=\"'+q+'\"]').click()",end)
                ready=page.evaluate(positions)
                assert all(abs(a["x"]-b["x"])+abs(a["y"]-b["y"])<.1 for a,b in zip(first,ready))
                if start==0 and end==1:
                    page.evaluate("fixture.draw(fixture.shell.controller.rotation.start+76)")
                    screen(page,"compass-NE-early")
                page.evaluate("fixture.draw(fixture.shell.controller.rotation.start+130)")
                mid = page.evaluate(positions)
                assert all(abs(a["x"]-b["x"])+abs(a["y"]-b["y"])>10 for a,b in zip(first,mid))
                if start==0 and end==1:
                    screen(page,"compass-NE-intermediate")
                    page.evaluate("fixture.draw(fixture.shell.controller.rotation.start+236)")
                    screen(page,"compass-NE-late")
                page.evaluate("fixture.draw(fixture.shell.controller.rotation.start+320)")
                settled=page.evaluate(positions)
                assert settled[end]["disabled"] and settled[end]["pressed"]=="true"
                assert [c["fill"] for c in settled]==fills
                timings.append([start,end])
            page.evaluate("q=>{fixture.camera.angle=-q*Math.PI/2;fixture.draw()}",start)
            screen(page,f"compass-settled-{'NESW'[start]}")
        # Retarget through the real controller's interpolated starting angle.
        retarget = page.evaluate("""()=>{
            fixture.camera.angle=0;fixture.draw();
            const m=fixture.shell.controller,base=performance.now();
            m.now=()=>base;
            document.querySelector('[data-board-quarter="1"]').click();
            fixture.draw(base+140);
            const before=fixture.camera.angle;
            m.now=()=>base+140;
            document.querySelector('[data-board-quarter="3"]').click();
            const jump=Math.abs(m.rotation.from-before);
            fixture.draw(base+460);m.now=()=>performance.now();
            return {jump,quarter:fixture.camera.quarter};
        }""")
        assert retarget=={"jump":0,"quarter":3},retarget
        page.evaluate("fixture.camera.angle=0;fixture.draw()")
        # Snapshot instanced angles from the actual renderer and keep the draft fixed.
        page.evaluate("""()=>{fixture.select(1);fixture.setHeading(270);fixture.draw();
            document.getElementById('close-panel').click();fixture.draw(performance.now()+350);}""")
        base=page.evaluate("performance.now()+1000")
        sample="""([t,q])=>{fixture.camera.angle=-q*Math.PI/2;fixture.draw(t);
            const {base,turret}=fixture.inspect().cannonParts;
            return {rotation:Math.atan2(turret[2],turret[0]),base:base.slice(0,16),
                    memo:document.getElementById('text-memo').textContent};}"""
        idle=page.evaluate(sample,[base,0])
        page.evaluate("fixture.select(1)")
        entry=page.evaluate(sample,[base+10,0])
        mid=page.evaluate(sample,[base+148,0])
        screen(page,"turret-enter-mid")
        end=page.evaluate(sample,[base+290,0])
        assert idle["rotation"]==entry["rotation"]
        assert len({round(r["rotation"],2) for r in (idle,mid,end)})==3,(idle,mid,end)
        assert idle["base"]==mid["base"]==end["base"] and entry["memo"]==mid["memo"]==end["memo"]
        for q in range(1,4):
            assert page.evaluate(sample,[base+291,q])["rotation"]==end["rotation"]
        page.locator("#close-panel").click()
        just_closed=page.evaluate(sample,[base+300,0])
        returning=page.evaluate(sample,[base+430,0])
        screen(page,"turret-exit-mid")
        assert just_closed["rotation"]==end["rotation"] and returning["rotation"]!=end["rotation"]
        page.evaluate("fixture.select(1)")
        interrupted=page.evaluate(sample,[base+430,0])
        assert interrupted["rotation"]==returning["rotation"]
        screen(page,"turret-interrupted")
        page.evaluate("fixture.setHeading(45)")
        assert page.evaluate(sample,[base+431,0])["rotation"]!=interrupted["rotation"]
    finally:
        page.evaluate("fixture.pauseFrames(false)")
    return {"compass_transitions":timings,"retarget":retarget,"turret":{
        "idle":idle["rotation"],"enter_mid":mid["rotation"],"draft":end["rotation"],
        "exit_mid":returning["rotation"],"memo":end["memo"]}}
