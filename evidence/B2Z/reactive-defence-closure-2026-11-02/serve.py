from pathlib import Path
import sys,http.server,json
sys.path.insert(0,str(Path('tools').resolve()))
import serve_observer as module
module.DEPLOYMENT_ASSETS=Path('.work/b2z-reactive-review/frozen-assets').resolve()
def headers(self):
 for name,value in json.loads((module.DEPLOYMENT_ASSETS/'.ic-assets.json5').read_text())[0]['headers'].items():self.send_header(name,value)
 self.send_header('Cache-Control','no-store');http.server.SimpleHTTPRequestHandler.end_headers(self)
module.ObserverHandler.end_headers=headers
http.server.ThreadingHTTPServer(('127.0.0.1',8189),module.ObserverHandler).serve_forever()
