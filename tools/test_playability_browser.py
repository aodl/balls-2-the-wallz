"""Short sample analysis cannot substitute for the separate 900s gate."""
import copy
import math
import unittest
from playability_browser import short_summary, browser_time

class ShortSampleTests(unittest.TestCase):
    def test_consensus_nanoseconds_become_explicit_utc_datetime(self):
        self.assertEqual(browser_time('1609459200000000000').isoformat(), '2021-01-01T00:00:00+00:00')
    def data(self):
        rows=[dict(wall_epoch_ms=100000+i*250,wall_ms=i*250,admitted_ticks=i/4,played_ticks=i/4,
                   buffer_ticks=5,phase='PLAYING',resyncs=0,target_rate=1,nominal_rate=1,
                   performance_limited=False,queue_segments=5,buffer_bytes=5000,visible_balls=4,
                   fetch_ms=1,verify_ms=2,artifact_ms=3,derive_ms=4,catchup_ms=0) for i in range(181)]
        polls=[dict(query_started_epoch_ms=100000+t*1000,query_completed_epoch_ms=100010+t*1000,
                    completed_ticks=100+math.floor(t)) for t in [i/2-.25 for i in range(93)]]
        return rows,polls
    def test_complete_short_sample_has_honest_scope_and_independent_bounds(self):
        rows,polls=self.data();r=short_summary(rows,polls)
        self.assertEqual(r['status'],'PASS');self.assertEqual(r['seconds'],45)
        self.assertIn('not the historical sustained 900s',r['qualification'])
    def test_incomplete_duration_or_unbracketed_endpoints_do_not_pass(self):
        rows,polls=self.data()
        for r,p in [(rows[:-1],polls),(rows,polls[1:]),(rows,polls[:-2])]:
            with self.subTest(samples=len(r),polls=len(p)):
                with self.assertRaises(ValueError):short_summary(r,p)
    def test_stall_performance_limit_resync_or_lost_buffer_remain_failures(self):
        for mutation in [dict(phase='STALLED'),dict(performance_limited=True),dict(resyncs=1),dict(buffer_ticks=2)]:
            rows,polls=self.data();rows[90].update(mutation)
            if 'buffer_ticks' in mutation:rows[-1].update(mutation)
            with self.subTest(mutation=mutation):self.assertEqual(short_summary(rows,polls)['status'],'FAIL')

if __name__=='__main__':unittest.main()
