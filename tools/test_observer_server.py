"""HTTP-serving behavior, independent of Chromium's environment navigation policy."""
import concurrent.futures, hashlib, http.client, http.server, json, tempfile, threading, unittest
from pathlib import Path
from unittest.mock import patch
import serve_observer
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
    def test_v6_assets_and_public_docs_use_the_explicit_deployment_allowlist(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            for name in ['configuration-playability.bin','backend.did','agent-api.md']:(root/name).write_bytes(b'public-test-asset')
            (root/'private-note.txt').write_text('not served')
            with patch.object(serve_observer,'DEPLOYMENT_ASSETS',root):
                for name in ['configuration-playability.bin','backend.did','agent-api.md']:
                    with self.subTest(name=name):self.assertEqual(self.get('/'+name)[::2],(200,b'public-test-asset'))
                self.assertEqual(self.get('/private-note.txt')[0],404)
                self.assertEqual(self.get('/.well-known/ic-architecture')[0],404)
class ProxyDiagnosticTests(unittest.TestCase):
    def setUp(self):
        self.entered=threading.Event();self.release=threading.Event();self.headers_observed=threading.Event();self.calls=[]
        owner=self
        class Upstream(http.server.BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def do_POST(self):
                body=self.rfile.read(int(self.headers['Content-Length']));owner.calls.append(body)
                if b'headers-delay' in body:
                    owner.entered.set();owner.release.wait(5)
                reply=b'reply:'+body;status=503 if body==b'artifact_bundle unavailable' else 200
                self.send_response(status);self.send_header('Content-Length',str(len(reply)));self.end_headers();self.wfile.flush()
                if b'body-delay' in body:
                    owner.entered.set();owner.release.wait(5)
                self.wfile.write(reply)
        self.upstream=http.server.ThreadingHTTPServer(('127.0.0.1',0),Upstream)
        self.proxy=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
        self.threads=[]
        for server in [self.upstream,self.proxy]:
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();self.threads.append(thread)
        self.directory=tempfile.TemporaryDirectory();self.addCleanup(self.directory.cleanup)
        self.path=Path(self.directory.name)/'proxy.jsonl'
        self.trace_complete=threading.Condition();self.trace_rows=0
        class CompleteTrace(serve_observer.ProxyTrace):
            def write(trace,row):
                super().write(row)
                with owner.trace_complete:
                    owner.trace_rows+=1;owner.trace_complete.notify_all()
        self.trace=CompleteTrace(self.path)
        real_urlopen=serve_observer.urllib.request.urlopen
        def observed_urlopen(request,*args,**kwargs):
            response=real_urlopen(request,*args,**kwargs)
            if b'body-delay' in request.data:
                read=response.read
                def observed_read(*read_args,**read_kwargs):
                    # The production proxy records header arrival immediately
                    # before read. Upstream flush alone does not prove receipt.
                    owner.headers_observed.set()
                    return read(*read_args,**read_kwargs)
                response.read=observed_read
            return response
        self.patches=[patch.object(serve_observer,'IC_GATEWAY',f'http://127.0.0.1:{self.upstream.server_port}/'),
            patch.object(serve_observer,'LIVE_CANISTER','aaaaa-aa'),patch.object(serve_observer,'PROXY_TRACE',self.trace),
            patch.object(serve_observer.urllib.request,'urlopen',observed_urlopen)]
        for item in self.patches:item.start()
    def tearDown(self):
        self.release.set()
        for server in [self.proxy,self.upstream]:server.shutdown();server.server_close()
        for thread in self.threads:thread.join()
        for item in reversed(self.patches):item.stop()
        self.trace.close()
    def post(self,body):
        c=http.client.HTTPConnection('127.0.0.1',self.proxy.server_port,timeout=5)
        c.request('POST','/api/v3/canister/aaaaa-aa/query',body,headers={'Authorization':'not-recorded'})
        response=c.getresponse();result=response.status,response.read();c.close();return result
    def wait_trace(self,count):
        # Receiving the response body is not a join of the proxy handler's
        # finally block. Synchronise with the completed diagnostic write.
        with self.trace_complete:self.assertTrue(self.trace_complete.wait_for(lambda:self.trace_rows>=count,timeout=5))
    def delayed(self,stage):
        body=b'artifact_bundle '+stage.encode()+b'-delay'
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future=pool.submit(self.post,body)
            try:
                self.assertTrue(self.entered.wait(3))
                if stage=='body':self.assertTrue(self.headers_observed.wait(3))
                self.assertEqual(self.post(b'lab_status'),(200,b'reply:lab_status'))
                self.wait_trace(1)
                self.assertFalse(future.done(),'slow request must remain blocked while independent query finishes')
            finally:self.release.set()
            self.assertEqual(future.result(),(200,b'reply:'+body))
        self.wait_trace(2)
        rows=[json.loads(line)for line in self.path.read_text().splitlines()]
        self.assertEqual(len(rows),2);fast,slow=rows
        self.assertEqual([fast['method'],slow['method']],['lab_status','artifact_bundle'])
        self.assertEqual(slow['request_sha256'],hashlib.sha256(body).hexdigest())
        self.assertEqual(bytes.fromhex(slow['request_body_hex']),body)
        self.assertEqual(slow['response_sha256'],hashlib.sha256(b'reply:'+body).hexdigest())
        self.assertNotIn('Authorization',self.path.read_text());self.assertNotIn('not-recorded',self.path.read_text())
        fast_end=fast['started_epoch_ms']+fast['finished_ms']
        self.assertGreater(slow['started_epoch_ms']+slow['upstream_complete_ms'],fast_end)
        if stage=='headers':self.assertGreater(slow['started_epoch_ms']+slow['upstream_headers_ms'],fast_end)
        else:self.assertLess(slow['started_epoch_ms']+slow['upstream_headers_ms'],fast['started_epoch_ms'])
        self.assertEqual(self.calls.count(body),1,'proxy must not add retries')
    def test_slow_upstream_headers_do_not_block_other_queries(self):self.delayed('headers')
    def test_slow_upstream_body_is_distinguished_from_header_wait(self):self.delayed('body')
    def test_upstream_error_is_preserved_without_proxy_retry(self):
        body=b'artifact_bundle unavailable';self.assertEqual(self.post(body),(503,b'reply:'+body));self.wait_trace(1)
        row=json.loads(self.path.read_text());self.assertEqual(row['status'],503)
        self.assertEqual(self.calls,[body]);self.assertIn('upstream_headers_ms',row)
    def test_trace_refuses_old_output_and_bounds_new_output(self):
        before=self.path.read_bytes()
        with self.assertRaises(FileExistsError):serve_observer.ProxyTrace(self.path)
        self.assertEqual(self.path.read_bytes(),before)
        path=Path(self.directory.name)/'bounded.jsonl';trace=serve_observer.ProxyTrace(path,max_bytes=256)
        try:
            for _ in range(10):trace.write({'large':'x'*200})
        finally:trace.close()
        self.assertEqual(path.read_text(),'{"truncated":true}\n')
        self.assertLessEqual(path.stat().st_size,256)
if __name__=='__main__':unittest.main()
