"""The full installed suite must retain every active test and expose historical omissions."""
import unittest
from verify_s14_local import installed_test_inventory

class InstalledInventoryTests(unittest.TestCase):
    def test_active_and_ignored_are_distinct(self):
        listing='a: test\nfunding::pending: test\nold_upgrade: test\n3 tests, 0 benchmarks\n'
        self.assertEqual(installed_test_inventory(listing,'old_upgrade: test\n'),(['a','funding::pending'],['old_upgrade']))

    def test_explicit_historical_probe_is_selected(self):
        self.assertEqual(installed_test_inventory('old: test\n','old: test\n',ignored=True),(['old'],[]))

    def test_empty_selection_cannot_pass(self):
        with self.assertRaisesRegex(ValueError,'No installed tests'):
            installed_test_inventory('old: test\n','old: test\n')

    def test_inconsistent_inventory_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'inconsistent'):
            installed_test_inventory('a: test\n','missing: test\n')

if __name__=='__main__':unittest.main()
