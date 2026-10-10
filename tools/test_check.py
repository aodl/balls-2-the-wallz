import unittest
from pathlib import Path
from check import blocked_requirements,classify,planned_checks
class TestEvidenceClassification(unittest.TestCase):
    def test_missing_tool_is_not_pass(self):self.assertEqual(classify(None,''),'BLOCKED')
    def test_explicit_blocked_exit_is_blocked(self):self.assertEqual(classify(2,'BLOCKED: dependency unavailable'),'BLOCKED')
    def test_nonzero_exit_is_failure(self):self.assertEqual(classify(1,'# tests 1\n# pass 1\n','node-tests'),'FAIL')
    def test_zero_tests_is_failure(self):self.assertEqual(classify(0,'# tests 0\n# pass 0\n','node-tests'),'FAIL')
    def test_ignored_node_test_is_failure(self):self.assertEqual(classify(0,'# tests 2\n# pass 1\n# skipped 1\n','node-tests'),'FAIL')
    def test_actual_node_execution(self):self.assertEqual(classify(0,'# tests 2\n# pass 2\n# fail 0\n# skipped 0\n# cancelled 0\n','node-tests'),'PASS')
    def test_node_24_info_prefix(self):self.assertEqual(classify(0,'ℹ tests 2\nℹ pass 2\nℹ fail 0\nℹ skipped 0\nℹ cancelled 0\n','node-tests'),'PASS')
    def test_rust_all_ignored_is_failure(self):self.assertEqual(classify(0,'test result: ok. 0 passed; 0 failed; 3 ignored;','rust-tests'),'FAIL')
    def test_rust_empty_filter_is_failure(self):self.assertEqual(classify(0,'test result: ok. 0 passed; 0 failed; 0 ignored;','rust-tests'),'FAIL')
    def test_actual_rust_execution(self):self.assertEqual(classify(0,'test result: ok. 5 passed; 0 failed; 0 ignored;','rust-tests'),'PASS')
class TestPythonEvidence(unittest.TestCase):
    def test_empty_suite_is_not_pass(self):self.assertEqual(classify(0,'Ran 0 tests in 0.000s\n\nOK\n','python-tests'),'FAIL')
    def test_skipped_suite_is_not_pass(self):self.assertEqual(classify(0,'Ran 2 tests in 0.001s\n\nOK (skipped=1)\n','python-tests'),'FAIL')
    def test_ran_suite_is_pass(self):self.assertEqual(classify(0,'Ran 3 tests in 0.001s\n\nOK\n','python-tests'),'PASS')
class TestPlan(unittest.TestCase):
    def test_all_uses_existing_locks_and_real_browser_gate(self):
        checks=planned_checks('all',Path('/tmp/check-output'))
        commands=[part for _,command,_,_,_ in checks for part in command]
        self.assertNotIn('generate-lockfile',commands)
        self.assertIn('observer-http-webcrypto',[name for name,_,_,_,_ in checks])
        self.assertGreaterEqual(dict((name,timeout) for name,_,_,_,timeout in checks)['runtime-lab-wasm'],600)
    def test_unimplemented_requirements_remain_blocked(self):
        ids={name for name,_ in blocked_requirements()}
        self.assertIn('pocketic-integration',ids)
        self.assertIn('live-ledger-wallet',ids)
if __name__=='__main__':unittest.main()

