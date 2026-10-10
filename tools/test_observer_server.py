"""HTTP-serving behavior, independent of Chromium's environment navigation policy."""
import http.client, http.server, threading, unittest
from serve_observer import ObserverHandler
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
        status,headers,body=self.get('/apps/btz-observer/')
        self.assertEqual(status,200);self.assertIn(b'Not IC-certified',body)
        self.assertIn("frame-ancestors 'none'",headers['Content-Security-Policy'])
        self.assertEqual(headers['X-Content-Type-Options'],'nosniff')
    def test_module_mime(self):
        status,headers,_=self.get('/apps/btz-observer/app.mjs');self.assertEqual(status,200);self.assertEqual(headers['Content-type'],'text/javascript')
    def test_records(self):self.assertEqual(self.get('/apps/btz-observer/recordings/index.json')[0],200)
    def test_local_certificate_snapshot_is_disabled_by_default(self):
        for path in ['/s09-local/metadata.json','/s09-assets/ic-certificate.mjs']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_sensitive_paths(self):
        for path in ['/CHECKPOINT.json','/.git/config','/tools/check.py','/evidence/S06/verification/verification.json','/native/Cargo.toml']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_directory_listing_disabled(self):self.assertEqual(self.get('/packages/client/')[0],404)
    def test_traversal(self):
        for path in ['/apps/btz-observer/%2e%2e/%2e%2e/CHECKPOINT.json','/apps/btz-observer/%5c../CHECKPOINT.json','/../../etc/passwd']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_no_write_methods(self):self.assertEqual(self.get('/apps/btz-observer/','POST')[0],501)
    def test_head_does_not_bypass_allowlist(self):self.assertEqual(self.get('/CHECKPOINT.json','HEAD')[0],405)
    def test_root_redirect(self):self.assertEqual(self.get('/')[1]['Location'],'/apps/btz-observer/')
if __name__=='__main__':unittest.main()
