#!/usr/bin/env python3
"""Measure a committed Git tree independently of its checkout and object storage."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
import json
from pathlib import Path, PurePosixPath
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIRS = {'.git', '.work', '.dfx', '.venv', 'venv', 'node_modules', 'target',
              '__pycache__', '.pytest_cache', '.mypy_cache', '.cache', '.canbench'}
INSTALLATION_NAMES = {'id_rsa', 'id_ed25519', 'identity.json', 'credentials.json',
                      'seed-phrase.txt', 'wallet-key.json', '.npmrc', '.netrc'}
SECRET_SUFFIXES = {'.pem', '.key', '.p12', '.pfx', '.keystore'}


@dataclass(frozen=True)
class Entry:
    path: str
    mode: str
    oid: str
    size: int


def git(*args, root=ROOT):
    return subprocess.check_output(['git', '-C', str(root), *args])


def tree(ref, root=ROOT):
    commit = git('rev-parse', '--verify', '--end-of-options', ref + '^{commit}',
                 root=root).decode().strip()
    entries = {}
    for record in git('ls-tree', '-rlz', commit, root=root).split(b'\0'):
        if not record:
            continue
        meta, raw_path = record.split(b'\t', 1)
        mode, kind, oid, size = meta.decode().split()
        path = raw_path.decode()
        if kind != 'blob':
            raise ValueError(f'unsupported Git tree entry: {path} ({kind})')
        entries[path] = Entry(path, mode, oid, int(size))
    return commit, entries


def path_issue(path):
    parts = path.split('/')
    lower_parts = [part.lower() for part in parts]
    name = lower_parts[-1]
    if (any(part in ('', '.', '..') for part in parts)
            or any(ord(char) < 32 or char in '\\:' for char in path)):
        return 'unsafe archive path'
    if set(lower_parts) & CACHE_DIRS or name.endswith(('.pyc', '.pyo')):
        return 'build, dependency or work directory'
    if (name == '.env' or name.startswith('.env.') or name in INSTALLATION_NAMES
            or PurePosixPath(name).suffix in SECRET_SUFFIXES):
        return 'credential or key path'
    return None


def grouped(entries, key):
    counts = Counter()
    sizes = Counter()
    for entry in entries:
        group = key(entry.path)
        counts[group] += 1
        sizes[group] += entry.size
    return {group: {'files': counts[group], 'bytes': size}
            for group, size in sorted(sizes.items(), key=lambda row: (-row[1], row[0]))}


def summarize(ref, root=ROOT):
    commit, entries = tree(ref, root)
    evidence = [entry for path, entry in entries.items() if path.startswith('evidence/')]
    blobs = defaultdict(list)
    for entry in entries.values():
        blobs[entry.oid].append(entry)
    duplicate_groups = [rows for rows in blobs.values() if len(rows) > 1]
    duplicate_groups.sort(key=lambda rows: (-rows[0].size * (len(rows) - 1), rows[0].path))
    return {
        'source_commit': commit,
        'tree': git('rev-parse', commit + '^{tree}', root=root).decode().strip(),
        'files': len(entries),
        'bytes': sum(entry.size for entry in entries.values()),
        'top_level': grouped(entries.values(), lambda path: path.split('/')[0] if '/' in path else '(root)'),
        'extensions': grouped(entries.values(), lambda path: PurePosixPath(path).suffix.lower() or '(none)'),
        'evidence_extensions': grouped(evidence, lambda path: PurePosixPath(path).suffix.lower() or '(none)'),
        'evidence_collections': grouped(evidence, lambda path: '/'.join(path.split('/')[:3])),
        'largest_files': [vars(entry) for entry in sorted(entries.values(), key=lambda row: (-row.size, row.path))[:25]],
        'duplicates': {
            'identity': 'Git blob object ID for identical bytes',
            'groups': len(duplicate_groups),
            'extra_files': sum(len(rows) - 1 for rows in duplicate_groups),
            'extra_bytes': sum(rows[0].size * (len(rows) - 1) for rows in duplicate_groups),
            'largest_groups': [
                {'oid': rows[0].oid, 'blob_bytes': rows[0].size, 'paths': [row.path for row in rows]}
                for rows in duplicate_groups[:20]
            ],
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ref', nargs='?', default='HEAD')
    args = parser.parse_args()
    print(json.dumps(summarize(args.ref), indent=2))


if __name__ == '__main__':
    main()
