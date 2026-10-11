import tempfile
import unittest
from pathlib import Path

from verify_s10_local import select_upgrade_baseline


class TestUpgradeBaselineSelection(unittest.TestCase):
    def test_same_version_is_explicit(self):
        with tempfile.TemporaryDirectory() as directory:
            current=Path(directory)/'current.wasm';current.write_bytes(b'current')
            self.assertEqual(select_upgrade_baseline('same-version',current),current)

    def test_cross_version_never_falls_back_to_current(self):
        with tempfile.TemporaryDirectory() as directory:
            current=Path(directory)/'current.wasm';current.write_bytes(b'current')
            with self.assertRaisesRegex(ValueError,'requires the source-built historical S10 Wasm'):
                select_upgrade_baseline('cross-version',current)

    def test_cross_version_requires_an_actual_baseline_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);current=root/'current.wasm';current.write_bytes(b'current')
            with self.assertRaisesRegex(ValueError,'requires the source-built historical S10 Wasm'):
                select_upgrade_baseline('cross-version',current,root/'missing.wasm')
            historical=root/'historical.wasm';historical.write_bytes(b'historical')
            self.assertEqual(select_upgrade_baseline('cross-version',current,historical),historical)


if __name__=='__main__':unittest.main()
