import gzip, json, mimetypes, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
root=Path(sys.argv[1]).resolve()
policy=json.loads((root/'.ic-assets.json5').read_text())[0]['headers']
cache={}
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  name=urlsplit(self.path).path.lstrip('/') or 'index.html'
  p=(root/name).resolve()
  if not p.is_relative_to(root) or not p.is_file():
   self.send_error(404);return
  zipped=p.suffix in ['.mjs','.css','.html'] and 'gzip' in self.headers.get('accept-encoding','')
  key=(p,zipped)
  if key not in cache:
   data=p.read_bytes();cache[key]=gzip.compress(data,compresslevel=6,mtime=0) if zipped else data
  data=cache[key]
  self.send_response(200)
  for k,v in policy.items():self.send_header(k,v)
  self.send_header('Content-Type',{'.mjs':'text/javascript','.flac':'audio/flac'}.get(p.suffix,mimetypes.guess_type(p.name)[0] or 'application/octet-stream'))
  self.send_header('Content-Length',len(data))
  self.send_header('Cache-Control','no-cache' if p.suffix=='.html' else 'public, max-age=3600')
  self.send_header('Vary','Accept-Encoding')
  if zipped:self.send_header('Content-Encoding','gzip')
  self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[2])),Handler).serve_forever()
