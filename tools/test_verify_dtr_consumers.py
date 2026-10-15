import unittest
from verify_dtr_consumers import cargo_metadata_document

class CargoSourceLocationTests(unittest.TestCase):
    def test_dependency_download_messages_do_not_hide_metadata(self):
        log=' Downloading crates ...\n  Downloaded libc v0.2.190\n{"packages":[],"version":1}\n'
        self.assertEqual(cargo_metadata_document(log),{'packages':[],'version':1})

    def test_missing_or_ambiguous_metadata_fails_closed(self):
        for log in ['Downloading crates ...\n','{"version":1}\n','{"packages":[]}\n{"packages":[]}\n']:
            with self.subTest(log=log),self.assertRaises(ValueError):cargo_metadata_document(log)
