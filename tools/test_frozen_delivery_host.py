import hashlib
import json
from pathlib import Path
import tempfile
import tarfile
import unittest
from unittest.mock import patch
import frozen_delivery_host as host
from package_frozen_delivery import safe_name, verify, archive_package


class FrozenDeliverySafety(unittest.TestCase):
    def test_unsafe_export_paths_are_rejected(self):
        for name in ['../escape', '/absolute', 'keys/identity.pem', '.env', 'sub/.env.secret']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                safe_name(name)

    def test_tampered_export_fails_before_execution(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / 'source').write_text('tampered')
            (root / 'SHA256SUMS').write_text(hashlib.sha256(b'original').hexdigest() + '  source\n')
            with self.assertRaisesRegex(ValueError, 'package checksum mismatch'):
                verify(root)

    def test_transport_archive_excludes_installed_dependency_tree(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / 'package'; root.mkdir()
            (root / 'source').write_bytes(b'baseline')
            (root / 'node_modules').mkdir()
            (root / 'node_modules/unwanted-cache').write_bytes(b'exclude')
            (root / 'SHA256SUMS').write_text(hashlib.sha256(b'baseline').hexdigest() + '  source\n')
            with patch('package_frozen_delivery.verify'):
                archive = archive_package(root)
            with tarfile.open(archive) as tar:
                self.assertEqual(set(tar.getnames()), {'package/source', 'package/SHA256SUMS'})

    def setup_state(self, root):
        state = root / 'state'; evidence = state / 'evidence'; evidence.mkdir(parents=True)
        harness = root / 'harness'; harness.write_bytes(b'native')
        (evidence / 'READY.json').write_text(json.dumps({'harness': str(harness), 'harness_sha256': host.digest(harness), 'baseline': 'b96', 'browser_python': '/unused/python', 'artifacts': '/unused/artifacts'}))
        return state, evidence

    def test_missing_preparation_cannot_claim_or_start_attempt(self):
        with tempfile.TemporaryDirectory() as d, patch.object(host, 'verify_package'), patch.object(host.subprocess, 'call') as call:
            root = Path(d)
            with self.assertRaises(FileNotFoundError):
                host.run(root, root / 'state')
            call.assert_not_called()
            self.assertFalse((root / 'state/evidence/attempt').exists())

    def test_attempt_cannot_be_repeated_after_interruption(self):
        with tempfile.TemporaryDirectory() as d, patch.object(host, 'verify_package'), patch.object(host.subprocess, 'call') as call:
            root = Path(d); state, evidence = self.setup_state(root)
            (evidence / 'attempt').mkdir()
            with self.assertRaises(FileExistsError):
                host.run(root, state)
            call.assert_not_called()

    def test_changed_runtime_library_prevents_attempt(self):
        with tempfile.TemporaryDirectory() as d, patch.object(host, 'verify_package'), patch.object(host.subprocess, 'call') as call:
            root = Path(d); state, evidence = self.setup_state(root)
            library = root / 'library.so'; library.write_bytes(b'changed')
            (evidence / 'RUNTIME_LIBRARIES.json').write_text(json.dumps({str(library): hashlib.sha256(b'original').hexdigest()}))
            with self.assertRaisesRegex(RuntimeError, 'browser library changed'):
                host.run(root, state)
            call.assert_not_called()
            self.assertFalse((evidence / 'attempt').exists())

    def test_missing_second_case_never_becomes_pass(self):
        with tempfile.TemporaryDirectory() as d, patch.object(host, 'verify_package'):
            root = Path(d); state, evidence = self.setup_state(root)
            def finish(*args, **kwargs):
                comparison = evidence / 'attempt/comparison'; comparison.mkdir()
                (comparison / 'outcomes.json').write_text(json.dumps([{'label': 'A0', 'status': 'PASS'}]))
                return 0
            with patch.object(host.subprocess, 'call', side_effect=finish):
                self.assertEqual(host.run(root, state), 1)
            verdict = json.loads((evidence / 'attempt/VERDICT.json').read_text())
            self.assertEqual(verdict['status'], 'BLOCKED')
            self.assertTrue((evidence / 'SHA256SUMS').exists())

    def test_failed_case_and_original_nested_manifest_are_preserved(self):
        with tempfile.TemporaryDirectory() as d, patch.object(host, 'verify_package'):
            root = Path(d); state, evidence = self.setup_state(root)
            def finish(*args, **kwargs):
                comparison = evidence / 'attempt/comparison'; comparison.mkdir()
                (comparison / 'outcomes.json').write_text(json.dumps([{'label': 'A0', 'status': 'FAIL'}]))
                (comparison / 'SHA256SUMS').write_text('original raw manifest\n')
                return 1
            with patch.object(host.subprocess, 'call', side_effect=finish):
                self.assertEqual(host.run(root, state), 1)
            self.assertEqual(json.loads((evidence / 'attempt/VERDICT.json').read_text())['status'], 'FAIL')
            self.assertIn('attempt/comparison/SHA256SUMS', (evidence / 'SHA256SUMS').read_text())


if __name__ == '__main__':
    unittest.main()
