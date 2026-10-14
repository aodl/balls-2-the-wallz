import copy
import unittest
from s13_analysis import cases, validate_pair, distribution, CONFIG, validate_trace

class PolicyValidation(unittest.TestCase):
    def setUp(self):
        self.one=dict(source={'revision':'one'},normal_wasm_sha256='wasm',initial_world_sha256='world',ledger_fixture_sha256='fixture',
                      workload_sha256='workload',harness_sha256='harness',runtime_sha256='runtime',model_configuration_sha256='model',configuration=CONFIG,
                      case=cases('smoke')[0])
        self.five=copy.deepcopy(self.one);self.five['case']=cases('smoke')[1]
    def test_inventory(self):
        self.assertEqual(len(cases('smoke')),2);self.assertEqual(len(cases('extended')),20)
    def test_pair(self):validate_pair(self.one,self.five)
    def test_reject_every_identity_mismatch(self):
        for key in ('source','normal_wasm_sha256','initial_world_sha256','ledger_fixture_sha256','workload_sha256','harness_sha256','runtime_sha256','model_configuration_sha256','configuration'):
            other=copy.deepcopy(self.five);other[key]='wrong'
            with self.subTest(key=key),self.assertRaises(ValueError):validate_pair(self.one,other)
    def test_reject_schedule_hint_duration_backlog(self):
        for key in ('arrival_period_seconds','arrival_batch','hints','duration_seconds','initial_tip'):
            other=copy.deepcopy(self.five);other['case'][key]='wrong'
            with self.subTest(key=key),self.assertRaises(ValueError):validate_pair(self.one,other)
    def test_reject_stale_trace_before_cost(self):
        for key in ('source','normal_wasm_sha256','workload_sha256','harness_sha256','runtime_sha256','model_configuration_sha256'):
            other=copy.deepcopy(self.one);other[key]='wrong'
            with self.subTest(key=key),self.assertRaisesRegex(ValueError,'incompatible'):validate_trace(other,self.one)
    def test_missing_trace(self):
        with self.assertRaises(ValueError):validate_trace(self.one,self.one)
    def test_censored_visible(self):
        result=distribution([1,2,3],7)
        self.assertEqual(result['unresolved_samples'],4);self.assertEqual(result['completed_samples'],3)
    def test_empty_distribution_not_zero(self):
        self.assertEqual(distribution([],2)['median'],'NOT_MEASURED')

if __name__=='__main__':unittest.main()
