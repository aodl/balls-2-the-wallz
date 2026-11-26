import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import check_repository_hygiene as hygiene
import package_review
from repository_inventory import Entry, path_issue, tree


class ReviewExportTests(unittest.TestCase):
    def test_tracked_only_repeatable_and_manifest_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            audio = 'apps/b2z-observer/audio/test.flac'
            text = root / 'README.md'
            (root / audio).parent.mkdir(parents=True)
            (root / audio).write_bytes(b'approved audio')
            text.write_text('committed\n')
            subprocess.run(['git', '-C', str(root), 'add', 'README.md', audio], check=True)
            subprocess.run(['git', '-C', str(root), '-c', 'user.name=Test',
                            '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'source'], check=True)
            commit, entries = tree('HEAD', root)
            text.write_text('uncommitted\n')
            (root / 'untracked.txt').write_text('ignore\n')
            first, second = root / 'a.zip', root / 'b.zip'
            with patch.object(package_review, 'ROOT', root), patch.object(package_review, 'REQUIRED', {'README.md'}):
                package_review.export(commit, entries, first)
                package_review.export(commit, entries, second)
                self.assertEqual(first.read_bytes(), second.read_bytes())
                result = package_review.verify(first, commit, entries)
                self.assertEqual(result['omitted_files'], 1)
                with zipfile.ZipFile(first) as archive:
                    self.assertEqual(archive.read('README.md'), b'committed\n')
                    self.assertNotIn('untracked.txt', archive.namelist())
                    skipped = json.loads(archive.read(package_review.OMISSIONS))
                    self.assertEqual(skipped['files'][0]['sha256'], hashlib.sha256(b'approved audio').hexdigest())
                with zipfile.ZipFile(first, 'a') as archive:
                    archive.writestr('../unsafe', b'bad')
                with self.assertRaisesRegex(ValueError, 'coverage'):
                    package_review.verify(first, commit, entries)

    def test_refuses_credential_cache_and_symlink_entries(self):
        for name in ('keys/test.PEM', '.env.local', 'foo/node_modules/file', 'escape/../file'):
            with self.subTest(name=name):
                self.assertIsNotNone(path_issue(name))
                with self.assertRaises(ValueError):
                    package_review.disposition(Entry(name, '100644', 'object', 10))
        with self.assertRaises(ValueError):
            package_review.disposition(Entry('plain', '120000', 'object', 10))


class HygieneTests(unittest.TestCase):
    def test_blocks_new_captures_and_preserves_reviewed_baseline(self):
        policy = {'required': [], 'max_new_file_bytes': 10,
                  'max_evidence_bytes': 50, 'approved': {}}
        old = Entry('evidence/old.png', '100644', 'old', 30)
        new = Entry('evidence/new.png', '100644', 'new', 2)
        existing = {old.path: old}
        current = existing | {new.path: new}
        self.assertEqual(hygiene.policy_problems(existing, existing, policy), [])
        self.assertIn('raw evidence media', hygiene.policy_problems(current, existing, policy)[0])
        policy['approved'][new.path] = {'reason': 'normative reference', 'max_bytes': 2}
        self.assertEqual(hygiene.policy_problems(current, existing, policy), [])

    def test_requires_archive_entry_for_baseline_evidence_deletion(self):
        path = 'evidence/capture.png'
        entry = Entry(path, '100644', 'object', 25)
        baseline = {path: entry}
        self.assertTrue(hygiene.archive_problems([], {}, baseline, 'anchor'))
        row = {'path': path, 'source_commit': 'anchor', 'archive_id': 'pre-consolidation-git-tree',
               'category': 'capture', 'bytes': '25', 'git_blob': 'object', 'sha256': 'a' * 64}
        self.assertEqual(hygiene.archive_problems([row], {}, baseline, 'anchor'), [])
        self.assertIn('still tracked', hygiene.archive_problems([row], baseline, baseline, 'anchor')[0])
