import copy
import json
import unittest
from pathlib import Path
from s12_cost_model import scenario_cost

ROOT=Path(__file__).resolve().parents[1]

class CostSensitivity(unittest.TestCase):
    def setUp(self):
        self.assumptions=json.loads((ROOT/'benchmarks/s12/closeout-cost-assumptions.json').read_text())
        self.tariff=self.assumptions['tariff_13_node_cycles']
        self.model=self.assumptions['model']
        self.spec=copy.deepcopy(self.assumptions['scenarios'][1])
        names=['seal','early','middle','late','finalize','evict']
        self.benches={f'warm_{p}_medium_512':{'instructions':1000000+i*100000} for i,p in enumerate(names)}
        self.benches['warm_ledger_staged_admission']={'instructions':2000000}
        self.benches['warm_ledger_empty_poll']={'instructions':1000000}
    def cost(self,**changes):
        return scenario_cost({**self.spec,**changes},self.tariff,self.model,self.benches)
    def test_tariff_sensitivity(self):
        old=self.cost()
        self.tariff['per_wasm_instruction']*=2
        new=self.cost()
        for i in (0,1):
            self.assertAlmostEqual(new['cycles_per_day_sample_range'][i]-old['cycles_per_day_sample_range'][i],old['instruction_components_per_day_sample_range'][i])
        self.assertEqual(old['game_callback_base_cycles_per_day'],new['game_callback_base_cycles_per_day'])
    def test_zero_arrivals_polling_enabled_and_disabled(self):
        self.assertGreater(self.cost(ledger_records_per_second=0)['polling_cycles_per_day'],0)
        self.assertEqual(self.cost(ledger_enabled=False,ledger_records_per_second=0)['polling_cycles_per_day'],0)
    def test_traffic_increases_processing(self):
        self.assertGreater(self.cost(ledger_records_per_second=20)['ledger_processing_instruction_cycles_per_day'], self.cost(ledger_records_per_second=1)['ledger_processing_instruction_cycles_per_day'])
    def test_cadence_independent_terms(self):
        old=self.cost(segment_seconds=20);new=self.cost(segment_seconds=10)
        self.assertEqual(new['game_callback_base_cycles_per_day'],2*old['game_callback_base_cycles_per_day'])
        for key in ['polling_cycles_per_day','storage_cycles_per_day','ledger_processing_instruction_cycles_per_day','ledger_bytes_cycles_per_day']:
            self.assertEqual(new[key],old[key])
    def test_storage_sensitivity(self):
        old=self.cost();self.model['storage_bytes']*=2
        self.assertEqual(self.cost()['storage_cycles_per_day'],2*old['storage_cycles_per_day'])
    def test_budget_mismatch_requires_measurement(self):
        self.model['work_budget']=256
        with self.assertRaises(ValueError):self.cost()
    def test_missing_callback_is_not_zero(self):
        del self.benches['warm_middle_medium_512']
        with self.assertRaises(ValueError):self.cost()
    def test_fresh_measurement_changes_cost(self):
        old=self.cost()['cycles_per_day_sample_range'][1]
        self.benches['warm_late_medium_512']['instructions']*=3
        self.assertGreater(self.cost()['cycles_per_day_sample_range'][1],old)
    def test_no_default_baseline_cli(self):
        source=(ROOT/'tools/s12_cost_model.py').read_text()
        self.assertIn("'--current-measurements', type=Path, required=True",source)
        self.assertNotIn("default=ROOT / 'benchmarks/s12/canbench_results.yml'",source)

    def test_empty_and_nonempty_poll_opportunities_not_double_counted(self):
        row=self.cost(ledger_records_per_second=1)
        self.assertAlmostEqual(row['polls_per_day_assumption']+row['pages_per_day_assumption'],row['fallback_opportunities_per_day'])
        observed=self.cost(observed_empty_polls_per_day=1234)
        self.assertEqual(observed['polls_per_day_assumption'],1234)

    def test_kernel_only_budget_changes_callback_count(self):
        self.spec={**self.assumptions['scenarios'][2]}
        self.benches['kernel_ball_dense_high']={'instructions':1000000}
        old=self.cost();self.model['work_budget']=256;new=self.cost()
        self.assertGreater(new['modeled_callbacks_per_segment'],old['modeled_callbacks_per_segment'])
        self.assertGreater(new['game_callback_base_cycles_per_day'],old['game_callback_base_cycles_per_day'])

    def test_finite_backlog_does_not_become_a_full_day_of_arrivals(self):
        row=self.cost(backlog_records_assumption=4096)
        self.assertEqual(row['pages_per_day_assumption'],64)
