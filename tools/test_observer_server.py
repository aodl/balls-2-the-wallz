"""HTTP-serving behavior, independent of Chromium's environment navigation policy."""
import http.client, http.server, tempfile, threading, unittest, os, urllib.request, urllib.error
from unittest.mock import patch
from pathlib import Path
from serve_observer import ObserverHandler, observer_dependency_error, open_loopback_query
class Quiet(ObserverHandler):
    def log_message(self,*args):pass
class ObserverServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def get(self,path,method='GET'):
        c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=5);c.request(method,path)
        r=c.getresponse();result=(r.status,dict(r.getheaders()),r.read());c.close();return result
    def test_entry(self):
        status,headers,body=self.get('/apps/b2z-observer/')
        self.assertEqual(status,200);self.assertIn(b'Not IC-certified',body)
        self.assertIn("frame-ancestors 'none'",headers['Content-Security-Policy'])
        self.assertEqual(headers['X-Content-Type-Options'],'nosniff')
    def test_module_mime(self):
        status,headers,_=self.get('/apps/b2z-observer/app.mjs');self.assertEqual(status,200);self.assertEqual(headers['Content-type'],'text/javascript')
    def test_only_packaged_dtr_modules_are_served_from_dependencies(self):
        path='/node_modules/@dtr/timeline-runtime/packages/client/verification.mjs'
        status,headers,_=self.get(path);self.assertEqual(status,200);self.assertEqual(headers['Content-type'],'text/javascript')
        self.assertEqual(self.get('/node_modules/@icp-sdk/core/package.json')[0],404)
    def test_records(self):self.assertEqual(self.get('/apps/b2z-observer/recordings/index.json')[0],200)
    def test_local_certificate_snapshot_is_disabled_by_default(self):
        for path in ['/s09-local/metadata.json','/s10-live/metadata.json','/s10-live/root-key.der','/s09-assets/ic-certificate.mjs']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_sensitive_paths(self):
        for path in ['/CHECKPOINT.json','/.git/config','/tools/check.py','/evidence/S06/verification/verification.json','/native/Cargo.toml']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_directory_listing_disabled(self):self.assertEqual(self.get('/packages/client/')[0],404)
    def test_traversal(self):
        for path in ['/apps/b2z-observer/%2e%2e/%2e%2e/CHECKPOINT.json','/apps/b2z-observer/%5c../CHECKPOINT.json','/../../etc/passwd']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_no_write_methods(self):self.assertEqual(self.get('/apps/b2z-observer/','POST')[0],404)
    def test_head_does_not_bypass_allowlist(self):self.assertEqual(self.get('/CHECKPOINT.json','HEAD')[0],405)
    def test_root_redirect(self):self.assertEqual(self.get('/')[1]['Location'],'/apps/b2z-observer/')
    def test_missing_packaged_modules_have_actionable_setup_error(self):
        with tempfile.TemporaryDirectory() as directory:
            error=observer_dependency_error(Path(directory))
        self.assertIn('npm ci --ignore-scripts',error)
        self.assertIn('playout.mjs',error)
    def test_installed_packaged_modules_satisfy_prerequisite(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            for relative in ('packages/client/playout.mjs','packages/client/verification.mjs','packages/runtime/canonical.mjs'):
                path=root/'node_modules/@dtr/timeline-runtime'/relative;path.parent.mkdir(parents=True,exist_ok=True);path.touch()
            self.assertIsNone(observer_dependency_error(root))
class LoopbackQueryTests(unittest.TestCase):
    def test_environment_proxy_cannot_delay_or_receive_owned_ic_queries(self):
        seen=[]
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                seen.append((self.server.server_port,self.rfile.read(int(self.headers['Content-Length']))))
                self.send_response(200);self.send_header('Content-Length','5');self.end_headers();self.wfile.write(b'exact')
            def log_message(self,*args):pass
        upstream=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        proxy=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        threads=[threading.Thread(target=s.serve_forever,daemon=True)for s in [upstream,proxy]]
        for t in threads:t.start()
        try:
            proxy_url=f'http://127.0.0.1:{proxy.server_port}'
            with patch.dict(os.environ,{'http_proxy':proxy_url,'HTTP_PROXY':proxy_url,'no_proxy':'','NO_PROXY':''}):
                request=urllib.request.Request(f'http://127.0.0.1:{upstream.server_port}/api/v3/canister/local/query',data=b'public-query')
                with open_loopback_query(request)as response:self.assertEqual(response.read(),b'exact')
            self.assertEqual(seen,[(upstream.server_port,b'public-query')])
        finally:
            for s in [upstream,proxy]:s.shutdown();s.server_close()
            for t in threads:t.join()

    def test_non_loopback_and_credentialed_targets_are_rejected_before_network(self):
        for url in ['http://example.org/','https://127.0.0.1/','http://user:password@localhost/','http://localhost/?redirect=1']:
            with self.subTest(url=url),self.assertRaises(ValueError):open_loopback_query(urllib.request.Request(url))

    def test_loopback_redirect_cannot_escape_the_validated_target(self):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(302);self.send_header('Location','http://127.0.0.1:1/not-followed');self.end_headers()
            def log_message(self,*args):pass
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with self.assertRaises(urllib.error.HTTPError)as error:open_loopback_query(urllib.request.Request(f'http://127.0.0.1:{server.server_port}/'))
            self.assertEqual(error.exception.code,302)
        finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
