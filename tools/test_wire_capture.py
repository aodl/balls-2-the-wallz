import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from types import SimpleNamespace
from wire_capture import WireCapture


class Page:
    def __init__(self):self.listeners={}
    def on(self,event,handler):self.listeners[event]=handler
    def remove_listener(self,event,handler):self.listeners.pop(event,None)
    def wait_for_timeout(self,ms):__import__('time').sleep(ms/1000)


def response(body=b'original', identity=b'observation_bundle'):
    request=SimpleNamespace(method='POST',url='http://127.0.0.1/query',post_data_buffer=identity,timing={'responseEnd':1},failure=None)
    return SimpleNamespace(request=request,status=200,body=lambda:body)


class CaptureSafety(unittest.TestCase):
    def test_reentrant_body_reads_reserve_unique_order_before_yield(self):
        with tempfile.TemporaryDirectory()as d:
            c=WireCapture(Page(),Path(d)/'wire',max_packets=4,max_bytes=100)
            first=response();second=response(b'second')
            def nested():c.capture(second);return b'first'
            first.body=nested;c.capture(first);self.assertEqual(c.finish(lambda:80),80)
            index=c.index([]);self.assertEqual([p['sequence']for p in index['packets']],[0,1]);self.assertEqual(c.peak_pending,2)
            self.assertEqual((c.directory/'0000.cbor').read_bytes(),b'first');self.assertEqual((c.directory/'0001.cbor').read_bytes(),b'second')
            c.capture(response(b'after fence'));self.assertEqual(c.sequence,2)
            self.assertEqual(c.finish(lambda:999),80)

    def test_body_read_error_is_preserved_with_request_context(self):
        with tempfile.TemporaryDirectory()as d:
            c=WireCapture(Page(),Path(d)/'wire',max_packets=4,max_bytes=100);r=response()
            def fail():raise RuntimeError('Target page closed')
            r.body=fail;c.capture(r)
            with self.assertRaisesRegex(RuntimeError,'finalisation failed'):c.finish(lambda:80)
            i=c.index([]);self.assertIn('Target page closed',i['errors']);self.assertEqual(i['error_context'][0]['sequence'],0);self.assertTrue(i['error_context'][0]['request_sha256'])

    def test_limits_remain_fatal(self):
        for packets,size in [(0,10),(1,1)]:
            with self.subTest(packets=packets,size=size),tempfile.TemporaryDirectory()as d:
                c=WireCapture(Page(),Path(d)/'wire',max_packets=packets,max_bytes=size);c.capture(response())
                with self.assertRaises(RuntimeError):c.finish(lambda:80)
                self.assertTrue(c.index([])['errors'])

    def test_missing_finalization_is_not_success(self):
        with tempfile.TemporaryDirectory()as d:
            c=WireCapture(Page(),Path(d)/'wire',max_packets=4,max_bytes=100)
            with self.assertRaises(RuntimeError):c.abort()
            self.assertEqual(c.finalization['status'],'FAIL');self.assertTrue(c.index([])['errors'])

    def test_pending_body_timeout_cannot_become_success(self):
        with tempfile.TemporaryDirectory()as d:
            c=WireCapture(Page(),Path(d)/'wire',max_packets=4,max_bytes=100,timeout_seconds=.01);c.pending[0]={'sequence':0}
            with self.assertRaisesRegex(RuntimeError,'drain timeout'):c.finish(lambda:80)
            self.assertEqual(c.index([])['capture_finalization']['status'],'FAIL')

    def test_exceptional_scope_drains_before_driver_exit_and_preserves_failure(self):
        with tempfile.TemporaryDirectory()as d:
            page=Page();c=WireCapture(page,Path(d)/'wire',max_packets=4,max_bytes=100)
            c.pending[0]={'sequence':0}
            page.wait_for_timeout=lambda _ms:c.pending.pop(0)
            with self.assertRaisesRegex(SystemExit,'143'):
                with ExitStack()as finalizers:
                    finalizers.push(c)
                    raise SystemExit(143)
            self.assertFalse(c.pending);self.assertFalse(c.accepting)
            self.assertEqual(c.index([])['capture_finalization']['status'],'FAIL')

    def test_drain_dispatch_error_is_retained_even_during_incomplete_abort(self):
        with tempfile.TemporaryDirectory()as d:
            c=WireCapture(Page(),Path(d)/'wire',max_packets=4,max_bytes=100)
            def fail(*_):raise RuntimeError('driver unexpectedly closed')
            c.page.remove_listener=fail
            with self.assertRaisesRegex(RuntimeError,'driver unexpectedly closed'):c.abort()
            self.assertEqual(c.finalization['status'],'FAIL')
            self.assertIn('driver unexpectedly closed',c.index([])['errors'])

    def test_interrupted_body_retains_response_context_and_original_interrupt(self):
        with tempfile.TemporaryDirectory()as d:
            c=WireCapture(Page(),Path(d)/'wire',max_packets=4,max_bytes=100);r=response()
            def interrupted():raise SystemExit(143)
            r.body=interrupted
            with self.assertRaisesRegex(SystemExit,'143'):
                with ExitStack()as finalizers:
                    finalizers.push(c);c.capture(r)
            self.assertEqual(c.finalization['status'],'FAIL')
            self.assertEqual(c.error_context[0]['sequence'],0)
            self.assertIn('143',c.errors)


if __name__=='__main__':unittest.main()
