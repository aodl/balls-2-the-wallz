#!/usr/bin/env python3
"""Export the immutable delivery baseline and reviewed inputs; no tests or deployment."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import zipfile

BASE = 'b96c64b43a412c022143787cd9d6ed94da2bbc67'
ARTIFACT = 'bf610b2081c2f044e54a15bceca91f2208e00b1ded7826a4d56fec81dfa13295'
HARNESS = '20ecd7716612a4554e8e753f13d68d41cf05437943ebb27d3a8784312239b507'
ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def safe_name(name):
    p = Path(name)
    if p.is_absolute() or '..' in p.parts or p.suffix == '.pem' or p.name.startswith('.env'):
        raise ValueError('unsafe package path: ' + name)
    return p


def verify(root):
    for line in (root / 'SHA256SUMS').read_text().splitlines():
        sha, name = line.split('  ', 1)
        if digest(root / safe_name(name)) != sha:
            raise ValueError('package checksum mismatch: ' + name)
    manifest = json.loads((root / 'baseline/vendor/b2z/delivery/manifest.json').read_text())
    for label in ['A0', 'A2']:
        compressed = root / 'baseline/vendor/b2z/delivery' / (label + '.wasm.gz')
        raw = root / 'inputs' / (label + '.wasm')
        if digest(compressed) != manifest[label]['gzip_sha256'] or digest(raw) != manifest[label]['sha256']:
            raise ValueError('frozen module mismatch: ' + label)
        if gzip.decompress(compressed.read_bytes()) != raw.read_bytes():
            raise ValueError('compressed module mismatch: ' + label)
    if digest(root / 'inputs/harness') != HARNESS:
        raise ValueError('reviewed reference harness mismatch')


def build(destination, artifact):
    if digest(artifact) != ARTIFACT:
        raise ValueError('reviewed Actions artifact ZIP mismatch')
    names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', BASE], cwd=ROOT, text=True).splitlines()
    for name in names:
        safe_name(name)
    destination.mkdir(parents=True, exist_ok=False)
    source = subprocess.check_output(['git', 'archive', '--format=tar', BASE], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(source)) as tar:
        for member in tar.getmembers():
            safe_name(member.name)
            if not (member.isfile() or member.isdir()):
                raise ValueError('non-regular baseline entry: ' + member.name)
        tar.extractall(destination / 'baseline', filter='data')
    with zipfile.ZipFile(artifact) as z:
        for name in z.namelist():
            if not name.startswith('delivery-inputs/') or name.endswith('/'):
                continue
            rel = safe_name(name[len('delivery-inputs/'):])
            out = destination / 'inputs' / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(z.read(name))
    (destination / 'inputs/harness').chmod(0o755)
    shutil.copyfile(ROOT / 'tools/frozen_delivery_host.py', destination / 'host.py')
    shutil.copyfile(Path(__file__), destination / 'package_frozen_delivery.py')
    shutil.copyfile(ROOT / 'docs/operations/FROZEN_DELIVERY_HOST.md', destination / 'RUNBOOK.md')
    (destination / 'PACKAGE.json').write_text(json.dumps({
        'baseline_commit': BASE,
        'reviewed_input_artifact_id': 12884987721,
        'reviewed_input_artifact_sha256': ARTIFACT,
        'reference_harness_sha256': HARNESS,
        'reference_harness_source_root': '/home/runner/work/balls-2-the-wallz/balls-2-the-wallz',
        'native_harness_policy': 'Use reference binary at its embedded root, or compile unchanged baseline native harness only and record the new identity. Never build comparison Wasm.',
        'dtr_revision': '77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68',
        'normal_only': True, 'prerequisite_wait_seconds': 180,
        'automatic_measurement_retry': False,
    }, indent=2) + '\n')
    files = sorted(p for p in destination.rglob('*') if p.is_file())
    (destination / 'SHA256SUMS').write_text(''.join(digest(p) + '  ' + str(p.relative_to(destination)) + '\n' for p in files))
    return archive_package(destination)


def archive_package(destination):
    verify(destination)
    archive = destination.with_suffix('.tar.gz')
    # Provisioning may have installed node_modules in the exported source.
    # Export only the reviewed manifest entries, never dependency/cache trees.
    names = [safe_name(line.split('  ', 1)[1]) for line in (destination / 'SHA256SUMS').read_text().splitlines()]
    names.append(Path('SHA256SUMS'))
    with archive.open('xb') as f, gzip.GzipFile(fileobj=f, mode='wb', filename='', mtime=0) as gz, tarfile.open(fileobj=gz, mode='w') as tar:
        for name in sorted(names):
            p = destination / name
            info = tar.gettarinfo(str(p), arcname=str(Path(destination.name) / p.relative_to(destination)))
            info.mtime = info.uid = info.gid = 0
            info.uname = info.gname = ''
            with p.open('rb') as src:
                tar.addfile(info, src)
    archive.with_name(archive.name + '.sha256').write_text(digest(archive) + '  ' + archive.name + '\n')
    return archive


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--artifact', type=Path)
    p.add_argument('--output', type=Path)
    p.add_argument('--verify', type=Path)
    p.add_argument('--archive', type=Path, help='archive only verified manifest entries, excluding installed dependencies')
    a = p.parse_args()
    if a.archive:
        print(archive_package(a.archive.resolve()))
    elif a.verify:
        verify(a.verify.resolve())
        print('PASS: package, reference harness and both frozen compressed/decompressed modules')
    elif a.artifact and a.output:
        print(build(a.output.resolve(), a.artifact.resolve()))
    else:
        p.error('use --verify PACKAGE or --artifact ZIP --output NEW_DIRECTORY')


if __name__ == '__main__':
    main()
