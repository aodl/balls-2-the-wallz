"""Cold-start uncertainty is separate from the complete steady no-stall gate."""
import copy
import unittest
import json
from pathlib import Path
from cold_playback_qualification import cold_startup_summary, cold_cadence_ready

class ColdStartupTests(unittest.TestCase):
    def test_actual_failed_run_prefix_is_preserved_without_relabelling_its_full_result(self):
        fixture=json.loads((Path(__file__).resolve().parents[1]/'tests/fixtures/cold-lifeline-startup-746df11.json').read_text())
        result=cold_startup_summary(fixture['rows'])
        self.assertEqual(result['pre_cadence_exhaustion_samples'],1)
        self.assertAlmostEqual(result['seconds'],20.6326)
    def rows(self):
        return [dict(wall_ms=t,consumed_ticks=c,verified_ticks=v,buffer_ticks=v-c,
                     phase=phase,resyncs=0,delivery_failures=0,delivery_error=None,
                     elastic=dict(samples=samples,expected_period_seconds=period))
                for t,c,v,phase,samples,period in [
                    (4284.8,.009995,1,'PLAYING',1,None),
                    (24367.4,1,1,'STALLED',1,None),
                    (24917.4,1.0266,2,'PLAYING',2,20.305)]]
    def test_recorded_truthful_exhaustion_is_reported_before_steady_measurement(self):
        rows=self.rows();self.assertFalse(cold_cadence_ready(rows[0]));self.assertTrue(cold_cadence_ready(rows[-1]))
        result=cold_startup_summary(rows);self.assertEqual(result['pre_cadence_exhaustion_samples'],1)
        self.assertEqual(result['status'],'PASS');self.assertIn('not the 120-second',result['scope'])
    def test_a_stall_with_available_coverage_is_an_assertion_failure(self):
        rows=self.rows();rows[1]['verified_ticks']=2;rows[1]['buffer_ticks']=1
        with self.assertRaises(AssertionError):cold_startup_summary(rows)
    def test_an_established_cadence_stall_is_never_relabelled_startup(self):
        rows=self.rows();rows[1]['elastic']=copy.deepcopy(rows[-1]['elastic'])
        with self.assertRaises(AssertionError):cold_startup_summary(rows)
    def test_unverified_advance_rewind_resync_and_delivery_failure_remain_failures(self):
        for mutation in [dict(consumed_ticks=2),dict(consumed_ticks=-1),dict(resyncs=1),dict(delivery_failures=1)]:
            rows=self.rows();rows[1].update(mutation)
            with self.subTest(mutation=mutation):
                with self.assertRaises(AssertionError):cold_startup_summary(rows)
    def test_missing_cadence_never_completes_qualification(self):
        with self.assertRaises(AssertionError):cold_startup_summary(self.rows()[:-1])

if __name__=='__main__':unittest.main()
