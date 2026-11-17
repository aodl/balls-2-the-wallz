import functools,http.server,threading
from pathlib import Path
assets=Path('.work/graphite-deflectors/frozen/frontend').resolve()
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(assets)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
source=Path('evidence/B2Z/combined-clearance-war-cry/frontend80-deployment/instrumentation');old='.work/frontend80-deployment-20261116';new='.work/graphite-deflectors/indexed-acceptance'
common=(source/'live-common.py').read_text().replace(old,new).replace('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/',url);Path(new+'/live-common.py').write_text(common)
code=(source/'live-clipboard-fields.py').read_text().replace(old,new).replace('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/',url).replace('Actual deployed','Exact frozen graphite served on loopback, mainnet-backed')
Path(new+'/live-clipboard-fields.py').write_text(code)
try:exec(compile(code,new+'/live-clipboard-fields.py','exec'),{'__name__':'__main__'})
finally:server.shutdown()
