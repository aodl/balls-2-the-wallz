"""Bounded, re-entrancy-safe capture for the synchronous Playwright verifier.

A body() call can yield to another response handler or to the main greenlet.
Reserve identity BEFORE that call; finalisation pumps the dispatcher while the
context is alive, rather than assuming listener removal joins existing handlers.
"""
import hashlib
import time


class WireCapture:
    def __init__(self, page, directory, *, max_packets, max_bytes, timeout_seconds=15):
        self.page, self.directory = page, directory
        directory.mkdir()
        self.max_packets, self.max_bytes = max_packets, max_bytes
        self.timeout_seconds = timeout_seconds
        self.accepting = True
        self.pending = {}
        self.responses = {}
        self.packets = {}
        self.errors = []
        self.error_context = []
        self.total_bytes = 0
        self.sequence = 0
        self.peak_pending = 0
        self.fence = None
        self.finalization = {'status': 'NOT_FINALIZED'}
        page.on('response', self.capture)
        page.on('requestfailed', self.request_failed)

    @staticmethod
    def method(request):
        if request.method != 'POST' or not request.url.endswith('/query'):
            return None
        body = request.post_data_buffer or b''
        return next((name for name in ['observation_bundle', 'retained_publication', 'observation'] if name.encode() in body), None)

    @staticmethod
    def identity(request, method):
        return {'method': method, 'url': request.url,
                'request_sha256': hashlib.sha256(request.post_data_buffer or b'').hexdigest()}

    def fail(self, error, context):
        self.errors.append(str(error))
        self.error_context.append({**context, 'error': str(error), 'error_epoch_ms': time.time()*1000,
                                   'capture_accepting': self.accepting,
                                   'finalization_state': self.finalization['status'],
                                   'body_read_ms': (time.monotonic()-context['body_started_monotonic'])*1000 if 'body_started_monotonic' in context else None})

    def capture(self, response):
        if not self.accepting:
            return
        request = response.request
        method = self.method(request)
        if method is None:
            return
        sequence = self.sequence
        self.sequence += 1
        context = {**self.identity(request, method), 'sequence': sequence, 'status': response.status,
                   'response_epoch_ms': time.time()*1000, 'body_started_monotonic': time.monotonic(),
                   'timing_at_response': request.timing}
        if sequence >= self.max_packets:
            self.fail('wire capture packet bound', context)
            return
        self.responses[id(request)] = sequence
        self.pending[sequence] = context
        self.peak_pending = max(self.peak_pending, len(self.pending))
        try:
            data = response.body()  # may dispatch other handlers or finalisation
            if self.total_bytes + len(data) > self.max_bytes:
                raise ValueError('wire capture byte bound')
            name = f'{sequence:04}.cbor'
            (self.directory/name).write_bytes(data)
            self.total_bytes += len(data)
            self.packets[sequence] = {**self.identity(request, method), 'sequence': sequence,
                                      'file': name, 'status': response.status, 'timing': request.timing,
                                      'response_epoch_ms': context['response_epoch_ms'],
                                      'body_completed_epoch_ms': time.time()*1000,
                                      'body_read_ms': (time.monotonic()-context['body_started_monotonic'])*1000,
                                      'response_sha256': hashlib.sha256(data).hexdigest()}
        except Exception as error:
            self.fail(error, context)
        finally:
            self.pending.pop(sequence, None)
            self.responses.pop(id(request), None)

    def request_failed(self, request):
        method = self.method(request)
        if method and (self.accepting or id(request) in self.responses):
            self.fail('wire request failed: ' + str(request.failure),
                      {**self.identity(request, method), 'sequence': self.responses.get(id(request)),
                       'timing': request.timing})

    def finish(self, fence):
        """Keep the original publication fence; join bodies before context close."""
        if self.finalization['status'] == 'PASS':
            return self.fence  # retain the FIRST fence, including before reconnect
        if self.finalization['status'] != 'NOT_FINALIZED':
            raise RuntimeError('wire capture finalisation already failed or is re-entrant')
        self.finalization = {'status': 'FENCING'}
        try:
            self.fence = fence()  # original page.evaluate; can dispatch callbacks
        except Exception as error:
            self.fail(error, {'stage': 'publication_fence'})
            self._drain(incomplete=True)
            raise
        self._drain()
        return self.fence

    def abort(self):
        if self.finalization['status'] not in ['PASS', 'FAIL']:
            self.fail('incomplete wire capture: publication fence not established', {'stage': 'abort'})
            self._drain(incomplete=True)

    def _drain(self, incomplete=False):
        self.accepting = False
        self.page.remove_listener('response', self.capture)
        started = time.monotonic()
        deadline = started + self.timeout_seconds
        self.finalization = {'status': 'DRAINING', 'fence': self.fence,
                             'fence_epoch_ms': time.time()*1000, 'accepted_responses': self.sequence,
                             'pending_at_fence': sorted(self.pending), 'peak_pending': self.peak_pending,
                             'timeout_seconds': self.timeout_seconds}
        try:
            while self.pending and time.monotonic() < deadline:
                # Public sync API yields to the same dispatcher as body(). No
                # threads/private Playwright APIs, sleeps, or application fetches.
                self.page.wait_for_timeout(min(25, max(1, (deadline-time.monotonic())*1000)))
            if self.pending or time.monotonic() > deadline:
                for context in list(self.pending.values()):
                    self.fail('wire capture drain timeout', {**context, 'stage': 'drain'})
                if not self.pending:
                    self.fail('wire capture drain deadline exceeded', {'stage': 'drain'})
            if self.errors or incomplete:
                raise RuntimeError('wire capture finalisation failed: ' + '; '.join(self.errors))
            self.finalization['status'] = 'PASS'
        except BaseException as error:
            if not self.errors:
                self.fail(error, {'stage': 'drain'})
            self.finalization['status'] = 'FAIL'
            raise
        finally:
            self.finalization.update(pending_after_drain=sorted(self.pending),
                                     drain_ms=(time.monotonic()-started)*1000,
                                     completed_epoch_ms=time.time()*1000)
            # Pending body handlers can still report genuine close errors after
            # explicit timeout failure. Leave requestfailed attached until close.
            if not self.pending:
                self.page.remove_listener('requestfailed', self.request_failed)

    def index(self, query_timings):
        if self.finalization['status'] != 'PASS' and not self.errors:
            self.fail('incomplete wire capture finalisation', {'stage': 'index'})
        return {'packets': [self.packets[n] for n in sorted(self.packets)],
                'errors': list(self.errors), 'bytes': self.total_bytes,
                'complete_through': self.fence, 'query_timings': query_timings,
                'capture_finalization': dict(self.finalization),
                'pending_at_index': sorted(self.pending),
                'error_context': list(self.error_context)}
