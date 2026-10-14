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
