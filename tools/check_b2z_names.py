#!/usr/bin/env python3
"""Audit current B2Z naming, with explicit immutable-byte/history exceptions."""
import argparse
import collections
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OLD = re.compile(r'BTZ|btz|Btz')
# Committed wire/hash/snapshot identifiers. Do not replace these with branding.
TOKENS = re.compile(r'BTZ_SMALL_BOARD_RULES_0[23]|BTZ_STATE_0[23]_TYPED_JSON|BTZ-SPAWN-(?:INPUT|RANK)-03|BTZ-ICP-INDEX(?:-ANCHOR)?-01|BTZPAY02|BTZCUT02|btz-animation-1|BTZ/1|btz-s(?:12|13)-[a-z0-9-]+')
FIXTURE_READERS = {'tools/coordinator_vectors.mjs', 'tools/host_bridge.mjs', 'tools/verify_host_native.py', 'native/native-conformance/src/bin/host_v5.rs', 'tests/js/coordinator.test.mjs'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    files = sorted(set(subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines()))
    rows = []; failures = []
    for name in files:
        path = ROOT / name
        if not path.is_file():
            continue  # Staged path migrations can still list the removed source path.
        history = name.startswith(('evidence/', 'checkpoints/', 'references/', 'vendor/', 'benchmarks/')) or name in ('CHECKPOINT.json', 'FILES.sha256', 'CHANGELOG.md')
        if OLD.search(name) and not history:
            failures.append(name + ': obsolete current path')
        try:
            text = path.read_text()
        except UnicodeError:
            continue
        archived_status = False
        for number, line in enumerate(text.splitlines(), 1):
            if '<!-- ARCHIVED_STATUS -->' in line:
                archived_status = True
            if not OLD.search(line):
                continue
            if history or archived_status:
                category = 'archived release/provenance'
            elif name.startswith('tests/fixtures/') or '/recordings/' in name:
                category = 'frozen fixture/recording bytes'
            elif name == 'docs/architecture/LEGACY_IDENTIFIERS.md':
                category = 'explicit compatibility policy'
            else:
                cleaned = TOKENS.sub('', line)
                # Published binary magic, legacy prefixed grammar and compatibility tests.
                cleaned = re.sub(r'BTZ(?=\\x|` \(`42 54 5a`\)| ANGLE| MOVE| \"| /)', '', cleaned)
                cleaned = cleaned.replace('BTZ ANGLE', '').replace('BTZ MOVE', '')
                if name == 'packages/protocol/memo.mjs':
                    cleaned = cleaned.replace('BTZ', '')  # only regex/comment for the S15 prefix
                if name in FIXTURE_READERS:
                    cleaned = cleaned.replace("'btz'", '').replace('"btz"', '')
                if name in ('tools/b2z_reference.py', 'tools/generate_s12_fixtures.mjs'):
                    cleaned = cleaned.replace('BTZ JS', '').replace('BTZ kernel abstract work units', '')
                if name == 'tools/check_docs.py':
                    cleaned = cleaned.replace("'BTZ_'", '').replace("'btz'", '')
                if name in ('tools/reference_fixtures.py',):
                    cleaned = cleaned.replace("b'BTZ'", '')
                if name == 'tools/verify_s14_deployment.py' and "assert 'BTZ' not in" in line:
                    cleaned = cleaned.replace("'BTZ'", '')
                if name == 'tools/check_b2z_names.py':
                    category = 'audit patterns for compatibility spellings'
                elif OLD.search(cleaned):
                    failures.append(f'{name}:{number}: {line}')
                    continue
                else:
                    category = 'immutable protocol/legacy decoder/fixture metadata'
            rows.append({'path': name, 'line': number, 'classification': category})
    result = {'status': 'FAIL' if failures else 'PASS', 'classified_occurrences': rows, 'counts': dict(collections.Counter(r['classification'] for r in rows)), 'failures': failures}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'counts': result['counts'], 'failures': failures}, indent=2))
    return bool(failures)

if __name__ == '__main__':
    raise SystemExit(main())
