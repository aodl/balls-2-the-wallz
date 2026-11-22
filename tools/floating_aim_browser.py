"""Click-to-aim, eligibility and compass checks for the populated Schema7 fixture."""

from playwright.sync_api import expect
from interaction_polish_browser import scene, board_point


def ground_point(page, opposite=False):
    result = page.evaluate("""reverse => {
        const origin=fixture.point(1);
        for(let dy=-180; dy<=180; dy+=28) for(let dx=-260; dx<=260; dx+=24){
            const x=origin.x+(reverse?-dx:dx),y=origin.y+(reverse?-dy:dy);
            if(Math.hypot(dx,dy)<140||x<22||x>innerWidth-22||y<90||y>innerHeight-28)continue;
            if(document.elementFromPoint(x,y)?.id==='board')return [x,y];
        }
        return null;
    }""", opposite)
    assert result, "no unobstructed board point outside the aim handle vicinity"
    return result


def angle(page):
    return page.evaluate("fixture.proposal().degrees")


def wait_new_heading(page, before):
    page.wait_for_function("a => fixture.proposal().degrees !== a", arg=before)


def fire_gestures(page, context, screen, width):
    x0 = width/2
    scene(page, 4004, 42, x0, 205 if width < 700 else 360)
    page.evaluate("fixture.select(1)")
    expect(page.locator("#action-prompt")).to_have_text("Pay to Fire")
    rounds = []
    for quarter in range(4):
        if quarter:
            page.locator(f"[data-board-quarter='{quarter}']").click()
        page.wait_for_function("q=>fixture.camera.quarter===q&&!fixture.shell.controller.rotation", arg=quarter)
        if not page.evaluate("fixture.camera.cellPoint(4004).visible"):
            scene(page, 4004, 42, x0, 205 if width < 700 else 360)
        compass = page.evaluate("""() => {
            const n=document.querySelector('[data-board-quarter="0"]');
            return {angle:parseFloat(n.style.getPropertyValue('--north-angle')),
                    matrix:getComputedStyle(n,'::after').transform,
                    width:n.getBoundingClientRect().width};
        }""")
        assert abs(compass["angle"] + quarter * 1.5707963267948966) < 1e-9
        assert compass["matrix"] != "none" and compass["width"] == 44
        screen(page, f"north-point-{width}-{quarter}")
        x,y = ground_point(page)
        page.mouse.move(x,y)
        page.wait_for_function("()=>fixture.shell.hover()===null")
        assert not any(t["kind"]=="hover" for t in page.evaluate("fixture.inspect().tileHighlights"))
        before = angle(page)
        before_position = page.evaluate("fixture.summary().camera")
        page.mouse.down()
        page.wait_for_timeout(75)
        assert angle(page) == before
        page.mouse.up()
        wait_new_heading(page,before)
        assert page.evaluate("fixture.summary().camera") == before_position
        assert page.evaluate("fixture.summary().selected") == 1
        assert page.locator("#replace-choice").count()==0
        memo = page.locator("#text-memo").text_content()
        assert memo.startswith("FIRE"), memo
        expect(page.locator('[data-copy=text]')).to_be_enabled()
        page.locator('[data-copy=text]').click()
        assert page.evaluate("navigator.clipboard.readText()") == memo
        rounds.append({"quarter":quarter,"memo":memo,"before_release":before,"after_release":angle(page)})

    before=angle(page)
    before_pose=page.evaluate("fixture.summary().camera")
    x,y=ground_point(page)
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(x+22,y+8,steps=3)
    page.mouse.move(x,y,steps=3)
    page.mouse.up()
    assert angle(page)==before, "returning to press position must not turn a pan back into a click"
    x,y=ground_point(page)
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(x+22,y,steps=3)
    page.mouse.up()
    assert angle(page)==before and page.evaluate("fixture.summary().camera")!=before_pose

    x,y=ground_point(page)
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(x+1,y)
    page.evaluate("""() => {
        const canvas=document.querySelector('#board');
        if(canvas.hasPointerCapture(1))canvas.releasePointerCapture(1);
    }""")
    page.mouse.move(x+1,y)
    page.mouse.up()
    assert angle(page)==before

    if width < 700:
        x,y=ground_point(page, opposite=True)
        cdp=context.new_cdp_session(page)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y,"id":1}]})
        assert angle(page)==before
        cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        wait_new_heading(page,before)
        before=angle(page)
        x,y=ground_point(page)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y,"id":1}]})
        cdp.send("Input.dispatchTouchEvent",{"type":"touchCancel","touchPoints":[]})
        assert angle(page)==before
        cdp.detach()
    page.locator("#board").press("]")
    wait_new_heading(page,before)
    screen(page,f"click-aim-{width}")
    return {"viewports":width,"rounds":rounds,"pan":"PASS","capture_loss":"PASS","keyboard":"PASS"}


def scout_hover(page, screen):
    rows=[]
    page.evaluate("fixture.render('orbitScout')")
    # Synthetic owners and colours come from the populated canonical fixture.
    for test_cell, scale in [(510510,2),(510510,48),(750750,2),(750750,48),(4014,2),(4014,48)]:
        scene(page,test_cell,scale,720,380)
        target=board_point(page,test_cell)
        page.mouse.move(target[0]+25,target[1]+3)
        page.mouse.move(*target)
        if test_cell==510510:
            page.wait_for_function("n=>fixture.inspect().tileHighlights.some(h=>h.cell===n&&h.kind==='hover')",arg=test_cell)
        else:
            page.wait_for_function("()=>fixture.shell.hover()?.kind!=='tile'")
            assert not any(t["kind"]=="hover" and t["cell"]==test_cell for t in page.evaluate("fixture.inspect().tileHighlights"))
        screen(page,f"scout-{test_cell}-{scale}")
        rows.append({"cell":test_cell,"scale":scale,"owner":page.evaluate("n=>fixture.surface(n).owner",test_cell)})
    page.evaluate("fixture.render('orbit')")
    return rows
