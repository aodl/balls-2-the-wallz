#!/usr/bin/env python3
"""Export and verify a lightweight, committed-source B2Z review ZIP."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

from repository_inventory import ROOT, git, path_issue, tree

REPOSITORY = 'https://github.com/aodl/balls-2-the-wallz'
INVENTORY = 'REVIEW-INVENTORY.json'
OMISSIONS = 'REVIEW-OMISSIONS.json'
GUIDE = 'REVIEW-README.md'
GENERATED = {GUIDE, INVENTORY, OMISSIONS}
REQUIRED = {'README.md', 'STATUS.md', 'AGENTS.md', 'ROADMAP.md', 'Cargo.lock',
            'package-lock.json', 'apps/b2z-observer/app.mjs',
            'canisters/runtime-lab/runtime-lab.did', 'tools/verify_s14_local.py',
            'apps/b2z-observer/audio/b2z-v1/manifest.json'}
EVIDENCE_INPUTS = (
    'evidence/B2Z/approved-action-panel-war-cry/artifacts/',
    'evidence/B2Z/approved-action-panel-war-cry/reference/',
    'evidence/B2Z/graphite-deflectors/connectivity-ui-polish/artifacts/',
    'evidence/B2Z/graphite-deflectors/reference/',
    'evidence/B2Z/rules15-floating-aim/artifacts/',
    'evidence/B2Z/rules16-reservoirs/artifacts/',
    'evidence/B2Z/rules16-toolbar-payments/artifacts/',
    'evidence/B2Z/rules18-delegated-payments/artifacts/',
    'evidence/B2Z/rules19-compact-reservoirs/',
    'evidence/B2Z/prelaunch-trickle/',
    'evidence/B2Z/repository-consolidation/',
)
EVIDENCE_FILES = {
    'evidence/B2Z/policy-v2-2026-11-02/snapshot.json',
    'evidence/B2Z/closed-loop-counterplay-2026-11-04/heldout-results.json.gz',
}


def disposition(entry):
    path = entry.path
    unsafe = path_issue(path)
    if unsafe:
        raise ValueError(f'{unsafe}: {path}')
    if entry.mode not in ('100644', '100755') or path in GENERATED:
        raise ValueError(f'unsupported or reserved archive entry: {path}')
    if path.startswith('apps/b2z-observer/audio/') and path.endswith('.flac'):
        return 'runtime audio payload'
    if path.startswith('vendor/b2z/') and path.endswith(('.wasm', '.wasm.gz')):
        return 'exact historical executable'
    if path.startswith('references/S00/') and path != 'references/S00/README.md':
        return 'historical source mirror and evidence'
    if path.startswith('evidence/') and not (
        path.endswith('.md') or path in EVIDENCE_FILES or path.startswith(EVIDENCE_INPUTS)
    ):
        return 'historical evidence payload'
    return None


def info(path, mode='100644'):
    item = zipfile.ZipInfo(path, date_time=(1980, 1, 1, 0, 0, 0))
    item.create_system = 3
    item.external_attr = int(mode, 8) << 16
    item.compress_type = zipfile.ZIP_DEFLATED
    return item


def metadata(entry, digest):
    return {'path': entry.path, 'bytes': entry.size, 'git_blob': entry.oid,
            'sha256': digest, 'mode': entry.mode}


def json_data(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def guide(commit):
    return f"""# B2Z source review

This archive presents committed source `{commit}`. It includes the Rust
authority, independent JavaScript replay, frontend, locks, tests, fixtures,
specifications and selected evidence. Read README.md and STATUS.md first.

With the committed locks and development dependencies, reviewers can inspect
and exercise the source and run tests whose inputs are included. For example,
run `node --test tests/js/b2z-agent-analysis.test.mjs` after `npm ci --ignore-scripts`.
Use a complete checkout for full qualification, the audio browser and embedded
frontend builds, predecessor upgrade tests, and tools that read Git history.

REVIEW-INVENTORY.json records the included files, SHA-256 values and source
identity. REVIEW-OMISSIONS.json lists omitted tracked entries and how to retrieve
them. Git history, local work, credentials, dependencies and build caches are
outside the export. The runtime audio manifest remains with the source.

For the exact complete source and history:

```sh
git clone {REPOSITORY}.git
cd balls-2-the-wallz
git checkout --detach {commit}
```

Use the full checkout's evidence index for older captures and the operator
release index for exact installed and compatible recovery executables.
"""


def archive_digest(stream):
    return hashlib.file_digest(stream, 'sha256').hexdigest()


def blob_bytes(entries):
    """Read reviewed blobs by object ID while keeping only one in memory."""
    with subprocess.Popen(['git', '-C', str(ROOT), 'cat-file', '--batch'],
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE) as blobs:
        for path, entry in sorted(entries.items()):
            disposition(entry)
            blobs.stdin.write((entry.oid + '\n').encode())
            blobs.stdin.flush()
            if blobs.stdout.readline().decode().split() != [entry.oid, 'blob', str(entry.size)]:
                raise ValueError(f'Git blob metadata mismatch: {path}')
            data = blobs.stdout.read(entry.size)
            if len(data) != entry.size or blobs.stdout.read(1) != b'\n':
                raise ValueError(f'incomplete Git blob: {path}')
            yield entry, data
        blobs.stdin.close()
        if blobs.wait():
            raise ValueError('Git blob retrieval failed')


def export(commit, entries, output):
    payload = []
    omissions = []
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for entry, data in blob_bytes(entries):
            row = metadata(entry, hashlib.sha256(data).hexdigest())
            if reason := disposition(entry):
                omissions.append({**row, 'category': reason})
            else:
                archive.writestr(info(entry.path, entry.mode), data)
                payload.append(row)
        text = guide(commit).encode()
        skipped = json_data({'source_commit': commit, 'files': omissions,
                             'retrieval': f'git show {commit}:PATH from {REPOSITORY}.git'})
        archive.writestr(info(GUIDE), text)
        archive.writestr(info(OMISSIONS), skipped)
        archive.writestr(info(INVENTORY), json_data({
            'schema_version': 1, 'source_commit': commit, 'files': payload,
            'generated': {GUIDE: hashlib.sha256(text).hexdigest(),
                          OMISSIONS: hashlib.sha256(skipped).hexdigest()},
        }))


def verify(output, commit, entries):
    expected = {path for path, entry in entries.items() if not disposition(entry)}
    if not REQUIRED <= expected:
        raise ValueError(f'required review source missing: {sorted(REQUIRED - expected)}')
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != expected | GENERATED:
            raise ValueError('archive coverage differs from the reviewed source')
        if bad := archive.testzip():
            raise ValueError(f'ZIP integrity check failed: {bad}')
        manifest = json.loads(archive.read(INVENTORY))
        skipped = json.loads(archive.read(OMISSIONS))
        if manifest['source_commit'] != commit or skipped['source_commit'] != commit:
            raise ValueError('source commit mismatch')
        if manifest['schema_version'] != 1:
            raise ValueError('unsupported review inventory')
        included = manifest['files']
        omitted = skipped['files']
        if ([row['path'] for row in included] != sorted(expected)
                or [row['path'] for row in omitted] != sorted(entries.keys() - expected)):
            raise ValueError('manifest coverage or order mismatch')
        rows = {row['path']: row for row in included + omitted}
        for entry, data in blob_bytes(entries):
            path = entry.path
            digest = hashlib.sha256(data).hexdigest()
            row = metadata(entry, digest)
            if reason := disposition(entry):
                row['category'] = reason
            else:
                with archive.open(path) as stream:
                    if archive_digest(stream) != digest:
                        raise ValueError(f'payload checksum mismatch: {path}')
                item = archive.getinfo(path)
                if item.file_size != entry.size or item.external_attr >> 16 != int(entry.mode, 8):
                    raise ValueError(f'payload size or mode mismatch: {path}')
            if row != rows[path]:
                raise ValueError(f'manifest identity mismatch: {path}')
        for name in (GUIDE, OMISSIONS):
            if hashlib.sha256(archive.read(name)).hexdigest() != manifest['generated'][name]:
                raise ValueError(f'generated entry checksum mismatch: {name}')
        uncompressed = sum(item.file_size for item in archive.infolist())
    with output.open('rb') as stream:
        digest = archive_digest(stream)
    return {'source_commit': commit, 'archive': str(output), 'sha256': digest,
            'payload_files': len(expected), 'omitted_files': len(entries) - len(expected),
            'uncompressed_bytes': uncompressed, 'compressed_bytes': output.stat().st_size,
            'manifest_verified': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='ZIP path, outside the checkout or under .work/')
    parser.add_argument('--ref', help='explicit committed source, even in a dirty checkout')
    parser.add_argument('--verify', action='store_true', help='verify an existing ZIP against the selected ref')
    args = parser.parse_args()
    try:
        commit, entries = tree(args.ref or 'HEAD')
        output = args.output.resolve()
        if args.verify:
            result = verify(output, commit, entries)
        else:
            if not args.ref and git('status', '--porcelain'):
                raise ValueError('working tree has changes; commit them or select an explicit --ref')
            if output.suffix != '.zip' or (output.is_relative_to(ROOT) and
                                            not output.is_relative_to(ROOT / '.work')):
                raise ValueError('use a .zip path outside the checkout or under .work/')
            output.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(dir=output.parent) as directory:
                staged = Path(directory) / output.name
                export(commit, entries, staged)
                result = verify(staged, commit, entries)
                os.replace(staged, output)
            result['archive'] = str(output)
        print(json.dumps(result, indent=2))
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        parser.exit(1, f'review export: {error}\n')


if __name__ == '__main__':
    main()
