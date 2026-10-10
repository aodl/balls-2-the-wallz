import hashlib
import tempfile
import unittest
from pathlib import Path

from fetch_s09_artifacts import checked_existing, digest


class TestS09ArtifactSafety(unittest.TestCase):
    def test_existing_matching_file_is_reused(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "artifact"
            path.write_bytes(b"pinned")
            expected = hashlib.sha256(b"pinned").hexdigest()
            self.assertTrue(checked_existing(path, expected, 6))
            self.assertEqual(digest(path), (expected, 6))

    def test_existing_different_file_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "artifact"
            path.write_bytes(b"keep")
            with self.assertRaises(RuntimeError):
                checked_existing(path, hashlib.sha256(b"other").hexdigest(), None)
            self.assertEqual(path.read_bytes(), b"keep")


if __name__ == "__main__":
    unittest.main()
