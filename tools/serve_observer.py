#!/usr/bin/env python3
"""Loopback-only, allowlisted observer server and byte-preserving local IC proxy."""
import argparse, hashlib, http.server, json, re, threading, time, urllib.error, urllib.request
from pathlib import Path
from urllib.parse import unquote, urlsplit
ROOT=Path(__file__).resolve().parents[1]
REQUIRED_DTR_MODULES=(
    'packages/client/playout.mjs',
    'packages/client/verification.mjs',
    'packages/runtime/canonical.mjs',
)
LOCAL_SNAPSHOT=None
LIVE_CONFIG=None
LIVE_CANISTER=None
IC_GATEWAY=None
GENERATED_ASSETS=None
DEPLOYMENT_ASSETS=None
PROXY_TRACE=None
QUERY_METHODS=('observation_bundle','retained_publication','artifact_bundle','retained_artifact_chunk','artifact_chunk','lab_status','observation')
def query_method(body):
    # Diagnostic label only; the proxy forwards the original bytes unchanged.
    return next((name for name in QUERY_METHODS if name.encode() in body),None)
class ProxyTrace:
    """Optional bounded local diagnostics; never log headers or identity material."""
    def __init__(self,path,max_bytes=16*1024*1024):
        self.file=Path(path).open('x',buffering=1);self.lock=threading.Lock()
        self.bytes=0;self.max_bytes=max_bytes;self.truncated=False
    def write(self,row):
        line=json.dumps(row,separators=(',',':'))+'\n'
        with self.lock:
            if self.truncated:return
            if self.bytes+len(line.encode())+128>self.max_bytes:
                self.file.write('{"truncated":true}\n');self.truncated=True;return
            self.file.write(line);self.bytes+=len(line.encode())
    def close(self):self.file.close()
def observer_dependency_error(root=ROOT):
    package=root/'node_modules/@dtr/timeline-runtime'
    missing=[str(package/relative) for relative in REQUIRED_DTR_MODULES if not(package/relative).is_file()]
    if not missing:return None
    return ('installed DTR observer modules are missing: '+', '.join(missing)
      +'. Run `npm ci --ignore-scripts` from the B2Z repository root before starting the observer.')
class ObserverHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.bin':'application/octet-stream'}
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        raw=unquote(urlsplit(self.path).path)
        if DEPLOYMENT_ASSETS is not None:
            name='index.html' if raw=='/' else raw.removeprefix('/')
            if name in {'index.html','app.mjs','style.css','icon.svg','configuration.bin','configuration-legacy.bin','configuration-torus.bin','configuration-million.bin','deployment.json','build-manifest.json'}:
                return self.serve_explicit(DEPLOYMENT_ASSETS/name)
        if DEPLOYMENT_ASSETS is not None and re.fullmatch(r'/recordings/(?:index\.json|(?:dense|admission|severance|near-impact)/[0-9]{3}/(?:catalog|(?:state|events|scores|render)-[0-9]+)\.bin)',raw):
            return self.serve_explicit(DEPLOYMENT_ASSETS/raw.removeprefix('/'))
        if raw=='/':
            self.send_response(302);self.send_header('Location','/apps/b2z-observer/');self.end_headers();return
        if raw.startswith('/s09-local/'):
            name=raw.removeprefix('/s09-local/')
            if LOCAL_SNAPSHOT is None or name not in {'metadata.json','catalog.bin','certificate.cbor','root-key.der','initial-state.bin','state.bin','events.bin','scores.bin'}:
                self.send_error(404);return
            return self.serve_explicit(LOCAL_SNAPSHOT/name)
        if raw.startswith('/s10-live/'):
            name=raw.removeprefix('/s10-live/')
            if LIVE_CONFIG is None or name not in {'metadata.json','root-key.der'}:
                self.send_error(404);return
            return self.serve_explicit(LIVE_CONFIG/name)
        if raw=='/s09-assets/ic-certificate.mjs':
            if GENERATED_ASSETS is None:self.send_error(404);return
            return self.serve_explicit(GENERATED_ASSETS/'ic-certificate.mjs')
        target=(ROOT/raw.lstrip('/')).resolve()
        allowed=[ROOT/'apps/b2z-observer',ROOT/'packages/protocol',ROOT/'packages/kernels/b2z',ROOT/'node_modules/@dtr/timeline-runtime/packages']
        if ('\\' in raw or not target.is_relative_to(ROOT) or not any(target.is_relative_to(d) for d in allowed)
            or (target.is_file() and target.suffix not in {'.html','.css','.mjs','.json','.bin','.svg'})
            or (target.is_dir() and target!=ROOT/'apps/b2z-observer')):
            self.send_error(404);return
        super().do_GET()
    def do_POST(self):
        raw=unquote(urlsplit(self.path).path)
        allowed=False
        if IC_GATEWAY is not None and LIVE_CANISTER is not None:
            escaped=re.escape(LIVE_CANISTER)
            allowed=bool(re.fullmatch(rf'/api/v[23]/canister/{escaped}/(?:query|read_state)',raw)
              or re.fullmatch(r'/api/v[23]/subnet/[a-z0-9-]{3,80}/read_state',raw))
        if not allowed:self.send_error(404);return
        declared=self.headers.get('Content-Length','')
        if not declared.isdigit() or int(declared)>2*1024*1024:self.send_error(413);return
        body=self.rfile.read(int(declared))
        started=time.monotonic();trace={'started_epoch_ms':time.time()*1000,'path':raw,
            'method':query_method(body) if raw.endswith('/query') else 'read_state','request_sha256':hashlib.sha256(body).hexdigest()}
        if PROXY_TRACE is not None and len(body)<=1024:trace['request_body_hex']=body.hex()
        request=urllib.request.Request(IC_GATEWAY+raw.lstrip('/'),data=body,method='POST',headers={'Content-Type':'application/cbor'})
        try:
            with urllib.request.urlopen(request,timeout=15) as response:
                trace['upstream_headers_ms']=(time.monotonic()-started)*1000
                content=response.read(2*1024*1024+1);status=response.status;content_type=response.headers.get('Content-Type','application/cbor')
        except urllib.error.HTTPError as error:
            trace['upstream_headers_ms']=(time.monotonic()-started)*1000
            content=error.read(2*1024*1024+1);status=error.code;content_type=error.headers.get('Content-Type','application/cbor')
        except Exception as error:
            self.send_error(502,str(error))
            trace.update(status=502,error_type=type(error).__name__,finished_ms=(time.monotonic()-started)*1000)
            if PROXY_TRACE is not None:PROXY_TRACE.write(trace)
            return
        trace['upstream_complete_ms']=(time.monotonic()-started)*1000
        if len(content)>2*1024*1024:self.send_error(502,'upstream response too large');return
        try:
            self.send_response(status);self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        finally:
            trace.update(status=status,response_bytes=len(content),response_sha256=hashlib.sha256(content).hexdigest(),finished_ms=(time.monotonic()-started)*1000)
            if trace['method']=='artifact_bundle' and len(content)<=1024:trace['small_response_hex']=content.hex()
            if PROXY_TRACE is not None:PROXY_TRACE.write(trace)
    def serve_explicit(self,target):
        if not target.is_file():self.send_error(404);return
        content=target.read_bytes();self.send_response(200)
        self.send_header('Content-Type',self.guess_type(str(target)));self.send_header('Content-Length',str(len(content)));self.end_headers()
        self.wfile.write(content)
    def do_HEAD(self):
        # The demonstration does not need HEAD. Avoid bypassing the GET allowlist.
        self.send_error(405)
    def list_directory(self,path):self.send_error(404);return None
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        super().end_headers()
def main():
    global LOCAL_SNAPSHOT,LIVE_CONFIG,LIVE_CANISTER,IC_GATEWAY,GENERATED_ASSETS,DEPLOYMENT_ASSETS,PROXY_TRACE
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8080)
    p.add_argument('--local-snapshot',type=Path);p.add_argument('--live-config',type=Path);p.add_argument('--ic-gateway');p.add_argument('--live-canister')
    p.add_argument('--generated-assets',type=Path);p.add_argument('--deployment-assets',type=Path)
    p.add_argument('--proxy-trace',type=Path);a=p.parse_args()
    if not 0<=a.port<=65535:p.error('port outside range')
    if dependency_error:=observer_dependency_error():p.error(dependency_error)
    if a.deployment_assets:
        DEPLOYMENT_ASSETS=a.deployment_assets.resolve()
        if not DEPLOYMENT_ASSETS.is_dir():p.error('deployment assets missing')
    if a.local_snapshot:
        LOCAL_SNAPSHOT=a.local_snapshot.resolve()
        if not LOCAL_SNAPSHOT.is_dir():p.error('--local-snapshot is not a directory')
    if a.generated_assets:
        GENERATED_ASSETS=a.generated_assets.resolve()
        if not GENERATED_ASSETS.is_dir():p.error('--generated-assets is not a directory')
    if any((a.live_config,a.ic_gateway,a.live_canister)):
        if not all((a.live_config,a.ic_gateway,a.live_canister)):p.error('live mode requires --live-config, --ic-gateway and --live-canister')
        LIVE_CONFIG=a.live_config.resolve();LIVE_CANISTER=a.live_canister
        if not LIVE_CONFIG.is_dir() or not {'metadata.json','root-key.der'}.issubset({path.name for path in LIVE_CONFIG.iterdir()}):p.error('--live-config is incomplete')
        gateway=urlsplit(a.ic_gateway)
        if gateway.scheme!='http' or gateway.hostname not in {'127.0.0.1','localhost','::1'} or gateway.username or gateway.password or gateway.query or gateway.fragment:p.error('--ic-gateway must be loopback HTTP')
        IC_GATEWAY=a.ic_gateway if a.ic_gateway.endswith('/') else a.ic_gateway+'/'
    if a.proxy_trace:PROXY_TRACE=ProxyTrace(a.proxy_trace)
    with http.server.ThreadingHTTPServer(('127.0.0.1',a.port),ObserverHandler) as server:
        print(f'Observer: http://127.0.0.1:{server.server_port}/apps/b2z-observer/',flush=True)
        print('Offline replay is default; explicit S09 snapshot and S10 live-local certificate modes are available. No real funds.',flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:pass
    if PROXY_TRACE is not None:PROXY_TRACE.close()
if __name__=='__main__':main()
