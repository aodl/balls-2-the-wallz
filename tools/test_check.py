import unittest
from check import classify
class TestEvidenceClassification(unittest.TestCase):
    def test_missing_tool_is_not_pass(self):self.assertEqual(classify(None,''),'BLOCKED')
    def test_nonzero_exit_is_failure(self):self.assertEqual(classify(1,'# tests 1\n# pass 1\n','node-tests'),'FAIL')
    def test_zero_tests_is_failure(self):self.assertEqual(classify(0,'# tests 0\n# pass 0\n','node-tests'),'FAIL')
    def test_ignored_node_test_is_failure(self):self.assertEqual(classify(0,'# tests 2\n# pass 1\n# skipped 1\n','node-tests'),'FAIL')
    def test_actual_node_execution(self):self.assertEqual(classify(0,'# tests 2\n# pass 2\n# fail 0\n# skipped 0\n# cancelled 0\n','node-tests'),'PASS')
    def test_rust_all_ignored_is_failure(self):self.assertEqual(classify(0,'test result: ok. 0 passed; 0 failed; 3 ignored;','rust-tests'),'FAIL')
    def test_rust_empty_filter_is_failure(self):self.assertEqual(classify(0,'test result: ok. 0 passed; 0 failed; 0 ignored;','rust-tests'),'FAIL')
    def test_actual_rust_execution(self):self.assertEqual(classify(0,'test result: ok. 5 passed; 0 failed; 0 ignored;','rust-tests'),'PASS')
class TestPythonEvidence(unittest.TestCase):
    def test_empty_suite_is_not_pass(self):self.assertEqual(classify(0,'Ran 0 tests in 0.000s\n\nOK\n','python-tests'),'FAIL')
    def test_skipped_suite_is_not_pass(self):self.assertEqual(classify(0,'Ran 2 tests in 0.001s\n\nOK (skipped=1)\n','python-tests'),'FAIL')
    def test_ran_suite_is_pass(self):self.assertEqual(classify(0,'Ran 3 tests in 0.001s\n\nOK\n','python-tests'),'PASS')
if __name__=='__main__':unittest.main()

