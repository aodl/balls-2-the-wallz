import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('s12_cost_model', ROOT / 'tools/s12_cost_model.py')
MODEL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODEL)


class S12CostModelTests(unittest.TestCase):
    def test_committed_canbench_inventory_is_complete(self):
        rows = MODEL.load_canbench(ROOT / 'benchmarks/s12/canbench_results.yml')
        for name in ('coordinator_empty_motion', 'coordinator_ball_dense_medium',
                     'coordinator_ball_dense_high', 'persistence_publication_medium',
                     'ledger_page_all_irrelevant'):
            self.assertGreater(rows[name]['instructions'], 0)

    def test_mu_uses_controlled_paused_arrival_trace(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'trace.json'
            path.write_text(json.dumps({'scenarios': [{
                'name': 'paused-arrivals', 'sustained_records_per_second': 10,
                'evidence_class': 'controlled', 'records_processed': 100,
                'elapsed_seconds': 10, 'received_candid_bytes': 5000}]}))
            mu, record = MODEL.controlled_mu(path)
            self.assertEqual(mu, 10)
            self.assertEqual(record['bytes_per_record'], 50)

    def test_mu_uses_slowest_aggregated_sample(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'trace.json'
            path.write_text(json.dumps({'scenarios': [{
                'name': 'paused-arrivals', 'sustained_records_per_second': 8,
                'sustained_records_per_second_distribution': {
                    'samples': [10, 8, 12], 'min': 8},
                'evidence_class': 'controlled', 'records_processed': 80,
                'elapsed_seconds_samples': [8, 10, 6.666666667],
                'received_candid_bytes': 4000}]}))
            mu, record = MODEL.controlled_mu(path)
            self.assertEqual(mu, 8)
            self.assertEqual(record['elapsed_seconds'], 10)
            self.assertEqual(record['selection'], 'minimum repeated local-host throughput')

    def test_cost_projection_separates_measured_and_unmeasured(self):
        assumptions = json.loads((ROOT / 'benchmarks/s12/cost-assumptions.json').read_text())
        benches = MODEL.load_canbench(ROOT / 'benchmarks/s12/canbench_results.yml')
        workloads = MODEL.workload_rows(ROOT / 'benchmarks/s12/workloads.json')
        output = MODEL.project(assumptions, benches, workloads, 100, {
            'source': 'fixture', 'scenario': 'paused-arrivals', 'evidence_class': 'controlled',
            'records': 100, 'elapsed_seconds': 1, 'received_candid_bytes': 5000,
            'bytes_per_record': 50})
        self.assertIn('actual production cycle burn', output['classification']['not_measured'])
        rows = {row['name']: row for row in output['scenarios']}
        self.assertGreater(
            rows['high-legal-occupancy']['projection']['13_node_application']['cycles_per_day'],
            rows['quiet-existing-ball']['projection']['13_node_application']['cycles_per_day'])
        self.assertEqual(output['backlog_estimates']['arrival_scenarios'][-1]['outcome'],
                         'DOES_NOT_DRAIN')


if __name__ == '__main__':
    unittest.main()
