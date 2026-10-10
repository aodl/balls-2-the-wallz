"""Self-tests for the small checkpoint-integrity tool; no external dependencies."""
from __future__ import annotations

import hashlib
from pathlib import Path
import tempfile
import unittest

from verify_checkpoint import MANIFEST_NAME, read_manifest, verify


class CheckpointVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / "docs").mkdir()
        (self.root / "README.md").write_text("checkpoint\n")
        (self.root / "docs" / "plan.md").write_text("plan\n")
        self.make_manifest()

    def make_manifest(self) -> None:
        lines = []
        for p in sorted(self.root.rglob("*")):
            if p.is_file() and p.name != MANIFEST_NAME:
                lines.append(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(self.root).as_posix()}")
        (self.root / MANIFEST_NAME).write_text("\n".join(lines) + "\n")

    def test_valid_payload(self) -> None:
        self.assertEqual(verify(self.root), [])

    def test_modified_file(self) -> None:
        (self.root / "README.md").write_text("changed")
        self.assertIn("checksum mismatch: README.md", verify(self.root))

    def test_missing_file(self) -> None:
        (self.root / "docs" / "plan.md").unlink()
        self.assertIn("missing file: docs/plan.md", verify(self.root))

    def test_unlisted_file(self) -> None:
        (self.root / "unexpected.txt").write_text("extra")
        self.assertIn("unexpected file: unexpected.txt", verify(self.root))

    def test_missing_manifest(self) -> None:
        (self.root / MANIFEST_NAME).unlink()
        self.assertTrue(verify(self.root)[0].startswith("cannot load manifest:"))

    def test_invalid_hash(self) -> None:
        (self.root / MANIFEST_NAME).write_text("BAD  README.md\n")
        self.assertIn("invalid SHA-256", verify(self.root)[0])

    def test_duplicate_entry(self) -> None:
        m = self.root / MANIFEST_NAME
        m.write_text(m.read_text() + m.read_text().splitlines()[0] + "\n")
        self.assertIn("duplicate manifest entry", verify(self.root)[0])

    def test_parent_traversal(self) -> None:
        (self.root / MANIFEST_NAME).write_text("0" * 64 + "  ../outside\n")
        self.assertIn("unsafe path", verify(self.root)[0])

    def test_absolute_path(self) -> None:
        (self.root / MANIFEST_NAME).write_text("0" * 64 + "  /outside\n")
        self.assertIn("unsafe path", verify(self.root)[0])

    def test_backslash_path(self) -> None:
        (self.root / MANIFEST_NAME).write_text("0" * 64 + "  docs\\plan.md\n")
        self.assertIn("unsafe path", verify(self.root)[0])

    def test_manifest_self_reference(self) -> None:
        (self.root / MANIFEST_NAME).write_text("0" * 64 + "  " + MANIFEST_NAME + "\n")
        self.assertIn("must not include itself", verify(self.root)[0])

    def test_empty_manifest(self) -> None:
        (self.root / MANIFEST_NAME).write_text("")
        self.assertIn("manifest is empty", verify(self.root)[0])

    def test_symlink_file(self) -> None:
        (self.root / "link.md").symlink_to(self.root / "README.md")
        self.assertIn("symlink not permitted: link.md", verify(self.root))

    def test_dot_component(self) -> None:
        (self.root / MANIFEST_NAME).write_text("0" * 64 + "  docs/./plan.md\n")
        self.assertIn("unsafe path", verify(self.root)[0])


if __name__ == "__main__":
    unittest.main()
