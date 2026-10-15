import copy
import json
import tempfile
import unittest
from pathlib import Path
from s12_measurements import ROOT, SMOKE, compare, configuration, digest, load_current, load_totals, validate


class Measurements(unittest.TestCase):
    def document(self):
        return {'schema': 'btz-s12-current-measurements-v1', 'source': {'revision': 'new'},
                'profile': 'smoke', 'executed_names': sorted(SMOKE), 'tool': {'version': '0.7'},
                'benchmarks': [{'name': n, 'instructions': 100, 'calls': 1,
                  'configuration': configuration(n, ROOT / 'benchmarks/s12/workloads.json')}
                  for n in sorted(SMOKE)]}

    def test_current_separate_and_baseline_unchanged(self):
        baseline = ROOT / 'benchmarks/s12/canbench_results.yml'
        before = digest(baseline)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'current.json'
            document = self.document()
            raw=Path(directory)/'current.yml'
            raw.write_text('benches:\n' + ''.join(f'  {n}:\n    total:\n      calls: 1\n      instructions: 100\n      heap_increase: 0\n      stable_memory_increase: 0\n    scopes: {{}}\n' for n in sorted(SMOKE)))
            for row in document['benchmarks']: row.update(heap_increase_pages=0,stable_memory_increase_pages=0)
            document['raw_results'] = [{'path':raw.name,'sha256':digest(raw)}]
            path.write_text(json.dumps(document))
            self.assertEqual(load_current(path)['profile'], 'smoke')
        self.assertEqual(digest(baseline), before)

    def test_missing_current(self):
        with self.assertRaises(FileNotFoundError):
            load_current(Path('/home/codexdev/nonexistent-s12-measurement'))

    def test_stale_revision(self):
        with self.assertRaises(ValueError):
            validate(self.document(), {'revision': 'old'})

    def test_configuration_mismatch(self):
        for key, value in [('work_budget', 1), ('fixture_sha256', 'wrong'), ('logical_ticks', 7)]:
            document = self.document()
            document['benchmarks'][0]['configuration'][key] = value
            with self.assertRaises(ValueError):
                validate(document)

    def test_empty_smoke_and_wrong_inventory(self):
        for names in [[], ['not_executed']]:
            document = self.document()
            document['executed_names'] = names
            with self.assertRaises(ValueError):
                validate(document)

    def test_extended_inventory(self):
        document = self.document()
        document['profile'] = 'extended'
        with self.assertRaises(ValueError): validate(document)

    def test_regression_and_noise(self):
        baseline = self.document()
        for instructions, status in [(110, 'FAIL'), (101, 'PASS'), (90, 'PASS')]:
            current = copy.deepcopy(baseline)
            current['benchmarks'][0]['instructions'] = instructions
            self.assertEqual(compare(current, baseline)['status'], status)

    def test_incomparable(self):
        baseline = self.document()
        for change in ['missing', 'name', 'budget', 'fixture', 'tool']:
            current = copy.deepcopy(baseline)
            if change == 'missing': baseline_copy = {**baseline, 'benchmarks': []}
            else: baseline_copy = baseline
            if change == 'name': current['benchmarks'][0]['name'] = 'wrong'
            if change == 'budget': current['benchmarks'][0]['configuration']['work_budget'] = 1
            if change == 'fixture': current['benchmarks'][0]['configuration']['fixture_sha256'] = 'wrong'
            if change == 'tool': current['tool'] = {'version': 'wrong'}
            self.assertEqual(compare(current, baseline_copy)['status'], 'FAIL')

    def test_missing_monitored_current_and_empty(self):
        baseline = self.document()
        baseline['monitored_names'] = list(SMOKE)
        current = {**baseline, 'benchmarks': baseline['benchmarks'][:1]}
        self.assertEqual(compare(current, baseline)['status'], 'FAIL')
        self.assertEqual(compare({**current, 'benchmarks': []}, baseline)['status'], 'FAIL')

    def test_zero_match(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'empty.yml'
            path.write_text('benches: {}\nversion: 0.7.0\n')
            with self.assertRaises(ValueError): load_totals(path)

    def test_raw_result_integrity_and_manifest_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);path=root/'manifest.json';raw=root/'current.yml'
            raw.write_text('benches:\n' + ''.join(f'  {n}:\n    total:\n      calls: 1\n      instructions: 100\n      heap_increase: 0\n      stable_memory_increase: 0\n    scopes: {{}}\n' for n in sorted(SMOKE)))
            document=self.document()
            for row in document['benchmarks']: row.update(heap_increase_pages=0,stable_memory_increase_pages=0)
            document['raw_results']=[{'path':raw.name,'sha256':digest(raw)}]
            path.write_text(json.dumps(document));load_current(path)
            document['benchmarks'][0]['instructions']=200
            path.write_text(json.dumps(document))
            with self.assertRaises(ValueError):load_current(path)
            document['benchmarks'][0]['instructions']=100
            path.write_text(json.dumps(document));raw.write_text(raw.read_text()+'# tampered\n')
            with self.assertRaises(ValueError):load_current(path)

    def test_extended_complete_inventory_is_identified(self):
        document=self.document();document['profile']='extended'
        import re
        names=json.loads((ROOT/'benchmarks/s12/historical-benchmark-inventory.json').read_text())['names']
        document['executed_names']=names
        document['benchmarks']=[{'name':n,'calls':1,'instructions':100,
            'configuration':configuration(n,ROOT/'benchmarks/s12/workloads.json')} for n in names]
        self.assertEqual(validate(document)['profile'],'extended')

    def test_new_informational_measurement_has_no_regression_claim(self):
        current=self.document();baseline=self.document()
        current['benchmarks'].append({'name':'warm_new','instructions':100,'configuration':{}})
        current['informational_names']=['warm_new']
        comparison=compare(current,baseline)
        self.assertEqual(comparison['status'],'PASS')
        self.assertEqual(comparison['rows'][-1]['status'],'NOT_RUN')
