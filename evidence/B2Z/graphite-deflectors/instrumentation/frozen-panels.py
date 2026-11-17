import functools,http.server,threading
from pathlib import Path
assets=Path('.work/graphite-deflectors/frozen/frontend').resolve()
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(assets)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
src=Path('evidence/B2Z/combined-clearance-war-cry/frontend80-deployment/instrumentation/live-panels-recovery.py');code=src.read_text().replace('.work/frontend80-deployment-20261116','.work/graphite-deflectors/frozen-acceptance').replace('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/',url).replace('Actual deployed authenticated mainnet state','Exact frozen graphite frontend on loopback, authenticated mainnet backend state')
Path('.work/graphite-deflectors/frozen-acceptance/live-panels-recovery.py').write_text(code)
try:exec(compile(code,'.work/graphite-deflectors/frozen-acceptance/live-panels-recovery.py','exec'),{'__name__':'__main__'})
finally:server.shutdown()
