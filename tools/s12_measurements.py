"""Small source-bound S12 measurement validator and instruction regression gate."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SMOKE = {'callback_step_persist_medium_512', 'ledger_page_all_irrelevant'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_totals(path):
    text = path.read_text()
    pattern = re.compile(r'^  ([a-z0-9_]+):\n    total:\n      calls: (\d+)\n'
        r'      instructions: (\d+)\n      heap_increase: (\d+)\n'
        r'      stable_memory_increase: (\d+)', re.M)
    rows = {n: dict(calls=int(c), instructions=int(i), heap_increase_pages=int(h),
                   stable_memory_increase_pages=int(s)) for n, c, i, h, s in pattern.findall(text)}
    if not rows:
        raise ValueError('empty current benchmark result')
    return rows


def configuration(name, fixture):
    if 'ledger' in name:
        return {'fixture_sha256': digest(fixture), 'work_budget': None,
                'logical_ticks': None, 'page_records': 64}
    data = json.loads(fixture.read_text())
    workload = ('ball-dense-high' if 'high' in name else
                'empty-motion' if 'empty' in name else
                'many-cannon-frontier' if 'many_cannon' in name else
                'small-reference' if 'small' in name else 'ball-dense-medium')
    row = next(r for r in data['workloads'] if r['name'] == workload)
    return {'fixture_sha256': digest(fixture), 'workload': workload,
            'initial_state_hash': row['initial_state_hash'], 'rules': row['rules'],
            'work_budget': 512 if ('512' in name or name.startswith('warm_')) else 100000,
            'logical_ticks': 2 if name.startswith('warm_') else int(row['logical_end']) - int(row['logical_start'])}


def validate(document, expected_source=None):
    if document.get('schema') != 'btz-s12-current-measurements-v1':
        raise ValueError('current measurement manifest required')
    if expected_source is not None and document['source'] != expected_source:
        raise ValueError('stale source revision/tree or working-tree identity')
    rows = document['benchmarks']
    if not rows or len(rows) != len({r['name'] for r in rows}):
        raise ValueError('empty/duplicate current results')
    if document['profile'] == 'smoke' and {r['name'] for r in rows} != SMOKE:
        raise ValueError('smoke inventory differs from executed cases')
    if document['profile'] == 'extended':
        declared = set(re.findall(r'#\[bench\(raw\)\]\s+fn (\w+)\(\) -> BenchResult',
            (ROOT / 'canisters/runtime-lab/src/lib.rs').read_text()))
        if {r['name'] for r in rows} != declared:
            raise ValueError('extended inventory differs from declared benchmark exports')
    if {r['name'] for r in rows} != set(document['executed_names']):
        raise ValueError('current inventory differs from executed cases')
    for row in rows:
        if row['configuration'] != configuration(row['name'], ROOT / 'benchmarks/s12/workloads.json'):
            raise ValueError('fixture/work budget/logical interval mismatch')
        if row['instructions'] <= 0 or row['calls'] <= 0:
            raise ValueError('invalid measured count')
    return document


def load_current(path, expected_source=None):
    document = validate(json.loads(path.read_text()), expected_source)
    for artifact in document['raw_results']:
        target = path.parent / artifact['path']
        if digest(target) != artifact['sha256']:
            raise ValueError('current raw measurement hash mismatch')
    actual = {}
    for artifact in document['raw_results']:
        if artifact['path'].endswith('.yml'):
            actual.update(load_totals(path.parent / artifact['path']))
    if not actual:
        raise ValueError('missing structured current results')
    if actual:
        expected = {r['name']: {k: r[k] for k in ('calls', 'instructions', 'heap_increase_pages', 'stable_memory_increase_pages')} for r in document['benchmarks']}
        if actual != expected:
            raise ValueError('manifest counts differ from structured current measurements')
    return document


def compare(current, baseline, threshold_percent=2.0):
    rows = []
    old = {r['name']: r for r in baseline['benchmarks']}
    if not current['benchmarks']:
        return {'status': 'FAIL', 'reason': 'empty current results', 'rows': []}
    for row in current['benchmarks']:
        prior = old.get(row['name'])
        reason = None
        if prior is None:
            reason = 'missing baseline'
        elif row['configuration'] != prior['configuration']:
            reason = 'changed workload/work budget'
        elif current['tool'] != baseline['tool']:
            reason = 'incompatible tool/runtime'
        delta = None if reason else 100 * (row['instructions'] / prior['instructions'] - 1)
        outcome = ('INCOMPARABLE' if reason else 'REGRESSION' if delta > threshold_percent
                   else 'IMPROVEMENT' if delta < -threshold_percent else 'WITHIN_THRESHOLD')
        rows.append({'name': row['name'], 'current_instructions': row['instructions'],
                     'baseline_instructions': prior['instructions'] if prior else None,
                     'change_percent': delta, 'outcome': outcome, 'reason': reason,
                     'status': ('NOT_RUN' if row['name'] in current.get('informational_names', []) else 'FAIL') if reason else 'FAIL' if outcome == 'REGRESSION' else 'PASS'})
    missing = set(baseline.get('monitored_names', [])) - {r['name'] for r in current['benchmarks']}
    for name in sorted(missing):
        rows.append({'name': name, 'status': 'FAIL', 'reason': 'missing current result'})
    return {'status': 'FAIL' if any(r['status'] == 'FAIL' for r in rows) else
            'PASS',
            'threshold_percent': threshold_percent, 'metric': 'deterministic instructions', 'rows': rows}
