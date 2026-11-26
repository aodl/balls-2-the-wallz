#!/usr/bin/env python3
"""Check growth, active retention inputs and the evidence archive against Git."""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from pathlib import PurePosixPath
import re
import subprocess

from repository_inventory import ROOT, git, path_issue, tree

POLICY = 'config/repository_hygiene.json'
RETENTION = 'evidence/B2Z/repository-consolidation/'
MEDIA = {'.png', '.jpeg', '.jpg', '.gif', '.webp', '.webm', '.mp4', '.mov', '.wav', '.flac'}
HASH = re.compile(r'[0-9a-f]{64}')


def policy_problems(entries, baseline, policy):
    problems = []
    for path in sorted(set(policy['required']) - entries.keys()):
        problems.append(f'{path}: required active retention input is missing')
    evidence_size = 0
    for path, entry in entries.items():
        under_evidence = path.startswith('evidence/')
        if under_evidence:
            evidence_size += entry.size
        if issue := path_issue(path):
            problems.append(f'{path}: {issue}')
            continue
        if entry == baseline.get(path):
            continue
        if entry.mode not in ('100644', '100755'):
            problems.append(f'{path}: unsupported tracked file mode {entry.mode}')
            continue
        media = under_evidence and PurePosixPath(path).suffix.lower() in MEDIA
        if not media and entry.size <= policy['max_new_file_bytes']:
            continue
        approval = policy['approved'].get(path, {})
        if not (approval.get('reason', '').strip() and entry.size <= approval.get('max_bytes', 0)):
            reason = 'raw evidence media' if media else 'new or changed large tracked file'
            problems.append(f'{path}: {reason} ({entry.size} bytes); archive it or record a reviewed exception')
    if evidence_size > policy['max_evidence_bytes']:
        problems.append(f'evidence/: {evidence_size} bytes exceed the reviewed {policy["max_evidence_bytes"]} byte budget')
    return problems


def archive_problems(rows, entries, baseline, anchor):
    problems = []
    seen = set()
    for row in rows:
        path = row['path']
        if path in seen:
            problems.append(f'{path}: duplicate archive entry')
        seen.add(path)
        original = baseline.get(path)
        if (not path.startswith('evidence/') or row['source_commit'] != anchor
                or row['archive_id'] != 'pre-consolidation-git-tree' or not row['category']
                or not HASH.fullmatch(row['sha256']) or original is None
                or (str(original.size), original.oid) != (row['bytes'], row['git_blob'])):
            problems.append(f'{path}: archive row does not match the immutable source tree')
        if path in entries:
            problems.append(f'{path}: archived payload still tracked in the active tree')
    if not seen:
        problems.append('archived-files.tsv: archive manifest is empty')
    for path in sorted(baseline.keys() - entries.keys() - seen):
        if path.startswith('evidence/'):
            problems.append(f'{path}: removed baseline evidence lacks an archive entry')
    return problems


def digest_problems(rows):
    problems = []
    with subprocess.Popen(['git', '-C', str(ROOT), 'cat-file', '--batch'],
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE) as blobs:
        for row in rows:
            blobs.stdin.write((row['git_blob'] + '\n').encode())
            blobs.stdin.flush()
            if blobs.stdout.readline().decode().split() != [row['git_blob'], 'blob', row['bytes']]:
                problems.append(f'{row["path"]}: archive blob unavailable')
                break
            data = blobs.stdout.read(int(row['bytes']))
            if blobs.stdout.read(1) != b'\n' or hashlib.sha256(data).hexdigest() != row['sha256']:
                problems.append(f'{row["path"]}: archive SHA-256 mismatch')
        blobs.stdin.close()
        if blobs.wait():
            problems.append('git cat-file failed during archive verification')
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', default='HEAD')
    parser.add_argument('--verify-history', action='store_true')
    args = parser.parse_args()
    try:
        commit, entries = tree(args.ref)
        policy = json.loads(git('show', f'{commit}:{POLICY}'))
        anchor, baseline = tree(policy['baseline'])
        problems = policy_problems(entries, baseline, policy)
        for name in ('archived-files.tsv', 'archive-verification.json', 'executables.json'):
            if RETENTION + name not in entries:
                problems.append(f'{RETENTION}{name}: retention record missing')
        if not problems:
            manifest = git('show', f'{commit}:{RETENTION}archived-files.tsv')
            rows = list(csv.DictReader(io.StringIO(manifest.decode()), delimiter='\t'))
            problems.extend(archive_problems(rows, entries, baseline, anchor))
            record = json.loads(git('show', f'{commit}:{RETENTION}archive-verification.json'))
            if (record['git_anchor']['sha'] != anchor or record['files'] != len(rows)
                    or record['manifest_sha256'] != hashlib.sha256(manifest).hexdigest()):
                problems.append('archive verification record does not match the archive manifest')
            releases = json.loads(git('show', f'{commit}:{RETENTION}executables.json'))['releases']
            expected_releases = {
                'production/europe-rules19': ('rules19-backend.wasm', 'rules19-frontend.wasm'),
                'production/europe-rules19-prelaunch-trickle': ('prelaunch-trickle.wasm', 'trickle-frontend.wasm'),
            }
            for tag, names in expected_releases.items():
                files = releases.get(tag, {}).get('files', {})
                if any(not HASH.fullmatch(files.get(name, {}).get('sha256', '')) for name in names):
                    problems.append(f'{tag}: missing recorded raw executable identities')
            if args.verify_history and not problems:
                problems.extend(digest_problems(rows))
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'repository hygiene: {error}\n')
    if problems:
        parser.exit(1, '\n'.join(problems) + '\nSee docs/operations/REPOSITORY_MAINTENANCE.md.\n')
    print(f'PASS: repository hygiene at {commit} ({len(rows)} archived payloads)')


if __name__ == '__main__':
    main()
