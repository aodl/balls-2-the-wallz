import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('benchmark_s12', ROOT / 'tools/benchmark_s12.py')
BENCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BENCH)


class S12BenchmarkRunnerTests(unittest.TestCase):
    def test_ledger_aggregate_uses_conservative_minimum(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = []
            for index, rate in enumerate((120.0, 80.0, 100.0)):
                path = root / f'{index}.json'
                path.write_text(json.dumps({'page_limit': 64, 'qualification': 'controlled',
                    'traffic': 'irrelevant', 'scenarios': [{
                        'name': 'paused-arrivals', 'evidence_class': 'controlled',
                        'initial_backlog': 256, 'arrivals_per_service_window': 0,
                        'arrival_model': 'fixture', 'final_tip': 256, 'final_cursor': 256,
                        'final_backlog': 0, 'records_processed': 256,
                        'elapsed_seconds': 256 / rate,
                        'sustained_records_per_second': rate, 'ledger_calls': 4,
                        'archive_calls': 2, 'received_candid_bytes': 1000,
                        'outcome': 'DRAINED', 'trace': [{'rate': rate}]}]}))
                paths.append(path)
            output = root / 'aggregate.json'
            BENCH.aggregate_ledger_traces(paths, output)
            row = json.loads(output.read_text())['scenarios'][0]
            self.assertEqual(row['sustained_records_per_second'], 80.0)
            self.assertEqual(row['sustained_records_per_second_distribution']['median'], 100.0)

    def test_ledger_aggregate_rejects_deterministic_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            documents = []
            for index, backlog in enumerate((0, 1)):
                path = root / f'{index}.json'
                path.write_text(json.dumps({'page_limit': 64, 'qualification': 'controlled',
                    'traffic': 'irrelevant', 'scenarios': [{
                        'name': 'paused-arrivals', 'initial_backlog': 1,
                        'arrivals_per_service_window': 0, 'final_tip': 1,
                        'final_cursor': 1, 'final_backlog': backlog,
                        'records_processed': 1, 'elapsed_seconds': 1,
                        'sustained_records_per_second': 1, 'ledger_calls': 1,
                        'archive_calls': 0, 'received_candid_bytes': 1,
                        'outcome': 'DRAINED', 'trace': []}]}))
                documents.append(path)
            with self.assertRaises(ValueError):
                BENCH.aggregate_ledger_traces(documents, root / 'aggregate.json')


if __name__ == '__main__':
    unittest.main()
