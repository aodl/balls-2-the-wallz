import contextlib,hashlib,io,json,sys,tempfile,unittest
from pathlib import Path
from check import BLOCKED_EXIT_CHECKS,blocked_requirements,classify,planned_checks,report_s14_failure,run_one,snapshot_artifact,tested_artifacts
class TestNestedFailureEvidence(unittest.TestCase):
    def test_failure_exposes_exact_test_and_bounded_tail_without_changing_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory);nested=out/'s14-local';(nested/'logs').mkdir(parents=True)
            result={'overall':'FAIL','reason':'Installed tests failed: browser_case','checks':[
                {'id':'setup','status':'PASS'},
                {'id':'installed--browser_case','status':'FAIL','exit_code':101,'elapsed_seconds':42.5,'log':'logs/browser.log'}]}
            path=nested/'results.json';path.write_text(json.dumps(result));before=path.read_bytes()
            (nested/'logs/browser.log').write_text('old line\n'*40+'AssertionError: exact failed assertion\n')
            captured=io.StringIO()
            with contextlib.redirect_stdout(captured):report_s14_failure(out)
            text=captured.getvalue();self.assertIn('Installed tests failed: browser_case',text)
            self.assertIn('installed--browser_case FAIL exit=101 elapsed=42.5s',text)
            self.assertIn('AssertionError: exact failed assertion',text)
            self.assertEqual(text.count('old line'),23);self.assertNotIn('setup PASS',text)
            self.assertEqual(path.read_bytes(),before)
    def test_missing_nested_evidence_is_explicit(self):
        with tempfile.TemporaryDirectory() as directory,contextlib.redirect_stdout(io.StringIO()) as captured:
            report_s14_failure(Path(directory))
        self.assertIn('S14 details unavailable',captured.getvalue())
    def test_actual_failed_browser_assertion_is_exposed_without_success_log_noise(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory);nested=out/'s14-local';nested.mkdir()
            (nested/'results.json').write_text(json.dumps({'reason':'browser failed','checks':[]}))
            for name,status in [('torus-scene','FAIL'),('other-scene','PASS')]:
                scene=nested/'deployment'/name;scene.mkdir(parents=True)
                (scene/'results.json').write_text(json.dumps({'status':status}))
                (scene/'browser.log').write_text(name+' actual assertion\n')
            with contextlib.redirect_stdout(io.StringIO()) as captured:report_s14_failure(out)
            self.assertIn('torus-scene actual assertion',captured.getvalue())
            self.assertNotIn('other-scene actual assertion',captured.getvalue())
class TestEvidenceClassification(unittest.TestCase):
    def test_missing_tool_is_not_pass(self):self.assertEqual(classify(None,''),'BLOCKED')
    def test_argparse_usage_exit_is_failure(self):self.assertEqual(classify(2,'usage: tool [-h]\ntool: error: required arguments'),'FAIL')
    def test_designated_wrapper_blocked_exit_is_blocked(self):self.assertEqual(classify(2,'BLOCKED: dependency unavailable',allow_blocked_exit=True),'BLOCKED')
    def test_real_argparse_usage_failure_is_not_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            row=run_one('usage',[sys.executable,'-c','import argparse;p=argparse.ArgumentParser();p.add_argument("required");p.parse_args()'],Path(directory))
        self.assertEqual(row['exit_code'],2);self.assertEqual(row['status'],'FAIL')
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
class TestArtifactEvidence(unittest.TestCase):
    def test_snapshot_survives_later_file_replacement(self):
        work=Path(__file__).resolve().parents[1]/'.work';work.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=work) as directory:
            path=Path(directory)/'artifact.wasm';path.write_bytes(b'normal')
            artifact=snapshot_artifact(path);path.write_bytes(b'test-hooks')
        self.assertEqual(artifact['sha256'],hashlib.sha256(b'normal').hexdigest())
        self.assertEqual(tested_artifacts([{'tested_artifacts':[artifact]}]),[artifact])
class TestPlan(unittest.TestCase):
    def test_all_uses_existing_locks_and_real_browser_gate(self):
        checks=planned_checks('all',Path('/tmp/check-output'))
        commands=[part for _,command,_,_,_ in checks for part in command]
        self.assertNotIn('generate-lockfile',commands)
        self.assertIn('observer-http-webcrypto',[name for name,_,_,_,_ in checks])
        self.assertGreaterEqual(dict((name,timeout) for name,_,_,_,timeout in checks)['runtime-lab-wasm'],600)
        self.assertEqual(BLOCKED_EXIT_CHECKS,{'observer-http-webcrypto','s14-index-poke-local-slice'})
        self.assertNotIn('cargo-tests',BLOCKED_EXIT_CHECKS)
    def test_component_modes_are_disjoint(self):
        out=Path('/tmp/check-output')
        modes={mode:{name for name,_,_,_,_ in planned_checks(mode,out)} for mode in ('source','native','wasm','browser','integration')}
        self.assertIn('cargo-tests',modes['native'])
        self.assertIn('runtime-lab-wasm',modes['wasm'])
        self.assertIn('runtime-lab-candid',modes['wasm'])
        self.assertEqual(modes['browser'],{'observer-http-webcrypto'})
        self.assertEqual(modes['integration'],{'s14-index-poke-local-slice'})
        self.assertTrue(all(not (modes[left]&modes[right]) for left in modes for right in modes if left<right))
        self.assertEqual(set().union(*modes.values()),{name for name,_,_,_,_ in planned_checks('all',out)})
    def test_unimplemented_requirements_remain_blocked(self):
        ids={name for name,_ in blocked_requirements()}
        self.assertNotIn('pocketic-integration',ids)
        self.assertIn('production-ledger-scalability',ids)
        self.assertIn('financial-and-settlement-integration',ids)
        self.assertIn('capacity-and-cost',ids)
        self.assertNotIn('probe-candid-wasm',ids)
if __name__=='__main__':unittest.main()

