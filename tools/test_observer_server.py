"""HTTP-serving behavior, independent of Chromium's environment navigation policy."""
import http.client, http.server, tempfile, threading, unittest
from pathlib import Path
from serve_observer import ObserverHandler, observer_dependency_error
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
    def test_only_packaged_dtr_modules_are_served_from_dependencies(self):
        path='/node_modules/@dtr/timeline-runtime/packages/client/verification.mjs'
        status,headers,_=self.get(path);self.assertEqual(status,200);self.assertEqual(headers['Content-type'],'text/javascript')
        self.assertEqual(self.get('/node_modules/@icp-sdk/core/package.json')[0],404)
    def test_records(self):self.assertEqual(self.get('/apps/btz-observer/recordings/index.json')[0],200)
    def test_local_certificate_snapshot_is_disabled_by_default(self):
        for path in ['/s09-local/metadata.json','/s10-live/metadata.json','/s10-live/root-key.der','/s09-assets/ic-certificate.mjs']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_sensitive_paths(self):
        for path in ['/CHECKPOINT.json','/.git/config','/tools/check.py','/evidence/S06/verification/verification.json','/native/Cargo.toml']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_directory_listing_disabled(self):self.assertEqual(self.get('/packages/client/')[0],404)
    def test_traversal(self):
        for path in ['/apps/btz-observer/%2e%2e/%2e%2e/CHECKPOINT.json','/apps/btz-observer/%5c../CHECKPOINT.json','/../../etc/passwd']:
            with self.subTest(path=path):self.assertEqual(self.get(path)[0],404)
    def test_no_write_methods(self):self.assertEqual(self.get('/apps/btz-observer/','POST')[0],404)
    def test_head_does_not_bypass_allowlist(self):self.assertEqual(self.get('/CHECKPOINT.json','HEAD')[0],405)
    def test_root_redirect(self):self.assertEqual(self.get('/')[1]['Location'],'/apps/btz-observer/')
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
if __name__=='__main__':unittest.main()
