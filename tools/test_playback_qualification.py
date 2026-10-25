import unittest
from playback_qualification import continuous_summary


class ContinuousPlaybackTests(unittest.TestCase):
    def fixture(self, deficit=0):
        rows=[]
        for second in range(901):
            admitted=second*(1-deficit)
            rows.append(dict(wall_epoch_ms=10000+second*1000, admitted_ticks=admitted,
                             played_ticks=second,buffer_ticks=17+admitted-second,
                             phase='PLAYING',resyncs=0,target_rate=1,nominal_rate=1,
                             performance_limited=False,queue_segments=18,buffer_bytes=700000))
        polls=[dict(query_started_epoch_ms=10000+s*1000-10,query_completed_epoch_ms=10000+s*1000+10,
                    segment_id=s,publication_ticks=1) for s in range(-2,905,2)]
        return rows,polls

    def test_stationary_buffer_and_poll_uncertainty(self):
        rows,polls=self.fixture(); result,aligned=continuous_summary(rows,polls)
        self.assertEqual(result['status'],'PASS')
        self.assertLess(result['produced_ticks_bounds'][0],900)
        self.assertGreater(result['produced_ticks_bounds'][1],900)
        self.assertEqual(result['buffer_conservation_error'],0)
        self.assertEqual(len(aligned),901)

    def test_slow_drain_fails_despite_acceptable_tick_rates(self):
        rows,polls=self.fixture(.01); result,_=continuous_summary(rows,polls)
        self.assertTrue(result['checks']['rates'])
        self.assertFalse(result['checks']['no_sustained_buffer_deficit'])
        self.assertEqual(result['status'],'FAIL')

    def test_rebuffering_cannot_hide_deficit(self):
        rows,polls=self.fixture();rows[450]['phase']='BUFFERING'
        self.assertFalse(continuous_summary(rows,polls)[0]['checks']['no_stall_or_rebuffer'])

    def test_resync_and_counter_jump_cannot_pass(self):
        rows,polls=self.fixture();rows[-1]['resyncs']=1;rows[-1]['buffer_ticks']+=5
        result,_=continuous_summary(rows,polls)
        self.assertFalse(result['checks']['no_resynchronization'])
        self.assertFalse(result['checks']['buffer_accounting'])

    def test_missing_poll_bracket_is_not_pass(self):
        rows,polls=self.fixture()
        with self.assertRaises(ValueError):continuous_summary(rows,polls[2:])

    def test_short_window_is_not_pass(self):
        rows,polls=self.fixture()
        with self.assertRaises(ValueError):continuous_summary(rows[:-1],polls)


if __name__=='__main__':unittest.main()
