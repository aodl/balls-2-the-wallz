import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
url,out=sys.argv[1:];out=Path(out);out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 page=b.new_page(viewport={'width':640,'height':480})
 page.goto(url);page.wait_for_function('()=>globalThis.graphite')
 for ink,name in enumerate(['lime','cyan','magenta','amber']):
  page.evaluate('(ink)=>graphite.scene({cannons:1,deflectors:1,scale:64,angle:45,ink,select:true})',ink)
  page.screenshot(path=str(out/f'{name}.png'),clip={'x':224,'y':170,'width':192,'height':150})
 b.close()
