import functools,http.server,json,threading
from pathlib import Path
root=Path('.work/graphite-deflectors/frozen-acceptance');root.mkdir(exist_ok=False)
assets=Path('.work/graphite-deflectors/frozen/frontend').resolve()
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(assets)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
source=Path('evidence/B2Z/combined-clearance-war-cry/frontend80-deployment/instrumentation');original='.work/frontend80-deployment-20261116'
common=(source/'live-common.py').read_text().replace(original,str(root)).replace('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/',url);(root/'live-common.py').write_text(common)
sha=json.loads(Path('evidence/B2Z/graphite-deflectors/artifacts/provenance.json').read_text())['javascript_sha256']
code=(source/'critical-mobile-instrumented.py').read_text().replace(original,str(root)).replace('bc2872444e4574ae818983e2d7ede46f7ff0c4c2d71b198b9b821c344636321c',sha).replace('Actual installed European frontend','Exact frozen graphite frontend served on loopback; authenticated European backend')
(root/'critical-mobile-instrumented.py').write_text(code)
try:exec(compile(code,str(root/'critical-mobile-instrumented.py'),'exec'),{'__name__':'__main__'})
finally:server.shutdown()
