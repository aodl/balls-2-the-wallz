#!/usr/bin/env python3
"""Loopback-only, allowlisted static demo server. Not a production asset server."""
import argparse, functools, http.server, sys
from pathlib import Path
from urllib.parse import unquote, urlsplit
ROOT=Path(__file__).resolve().parents[1]
class ObserverHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.bin':'application/octet-stream'}
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        raw=unquote(urlsplit(self.path).path)
        if raw=='/':
            self.send_response(302);self.send_header('Location','/apps/btz-observer/');self.end_headers();return
        target=(ROOT/raw.lstrip('/')).resolve()
        allowed=[ROOT/'apps/btz-observer',ROOT/'packages/client',ROOT/'packages/protocol',ROOT/'packages/runtime',ROOT/'packages/kernels/btz']
        if ('\\' in raw or not target.is_relative_to(ROOT) or not any(target.is_relative_to(d) for d in allowed)
            or (target.is_file() and target.suffix not in {'.html','.css','.mjs','.json','.bin','.svg'})
            or (target.is_dir() and target!=ROOT/'apps/btz-observer')):
            self.send_error(404);return
        super().do_GET()
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
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8080);a=p.parse_args()
    if not 0<=a.port<=65535:p.error('port outside range')
    with http.server.ThreadingHTTPServer(('127.0.0.1',a.port),ObserverHandler) as server:
        print(f'Observer: http://127.0.0.1:{server.server_port}/apps/btz-observer/',flush=True)
        print('Local synthetic recordings only. No IC certificate, ledger or funds.',flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:pass
if __name__=='__main__':main()
