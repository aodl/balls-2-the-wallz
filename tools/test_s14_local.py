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


class InstalledResultTests(unittest.TestCase):
    log='test result: ok. 1 passed; 0 failed; 0 ignored;'

    def test_success_needs_live_server(self):
        from verify_s14_local import installed_case_result
        self.assertEqual(installed_case_result({'status':'PASS'},self.log,None)['status'],'PASS')
        self.assertEqual(installed_case_result({'status':'PASS'},self.log,0)['status'],'FAIL')

    def test_empty_rust_run_cannot_pass(self):
        from verify_s14_local import installed_case_result
        self.assertEqual(installed_case_result({'status':'PASS'},'test result: ok. 0 passed; 0 failed; 0 ignored;',None)['status'],'FAIL')

    def test_process_failure_is_never_overridden(self):
        from verify_s14_local import installed_case_result
        self.assertEqual(installed_case_result({'status':'FAIL'},self.log,None)['status'],'FAIL')

if __name__=='__main__':unittest.main()

class DevelopmentOverrideLockTests(unittest.TestCase):
    def test_only_dtr_packages_may_change_during_local_resolution(self):
        from s14_development import frozen_dependencies
        before=b'[[package]]\nname="dtr-wire"\nversion="0.14.0"\n[[package]]\nname="syn"\nversion="3.0.7"\nchecksum="original"\n'
        dtr_only=before.replace(b'0.14.0',b'0.14.1-cost.1')
        self.assertEqual(frozen_dependencies(before),frozen_dependencies(dtr_only))
        self.assertNotEqual(frozen_dependencies(before),frozen_dependencies(dtr_only.replace(b'3.0.7',b'3.0.9')))
        self.assertNotEqual(frozen_dependencies(before),frozen_dependencies(dtr_only+b'[[package]]\nname="syn"\nversion="2.0.0"\n'))
