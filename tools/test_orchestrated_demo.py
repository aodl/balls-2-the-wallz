import json,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class OrchestratedRecovery(unittest.TestCase):
    def run_demo(self,path,name='admission',*options):
        r=subprocess.run(['node','tools/orchestrated_demo.mjs',name,'--journal',str(path),*options],cwd=ROOT,text=True,capture_output=True,timeout=30)
        self.assertEqual(r.returncode,0,r.stderr);return json.loads(r.stdout)
    def fault_case(self,name,fault):
        with tempfile.TemporaryDirectory()as d:
            p=Path(d)/'resume';baseline=self.run_demo(Path(d)/'baseline',name)
            first=self.run_demo(p,name,'--fault',fault);self.assertEqual(first['status'],'INTERRUPTED')
            second=self.run_demo(p,name);self.assertEqual(second['status'],'COMMITTED')
            self.assertEqual(second['manifest_hash'],baseline['manifest_hash']);self.assertEqual(second['pending_inputs'],0)
            self.assertEqual(second['observer_verification'],'offline-pinned-content')
            if fault=='publish:after':self.assertEqual(second['revision'],first['revision'])
    def test_b2z_seal_crash(self):self.fault_case('admission','seal:after')
    def test_b2z_publish_before(self):self.fault_case('admission','publish:before')
    def test_b2z_lost_publish_ack(self):self.fault_case('admission','publish:after')
    def test_life_lost_publish_ack(self):self.fault_case('life','publish:after')
    def test_corruption_does_not_reset_genesis(self):
        with tempfile.TemporaryDirectory()as d:
            p=Path(d)/'broken';p.write_text('corrupt')
            r=subprocess.run(['node','tools/orchestrated_demo.mjs','admission','--journal',str(p)],cwd=ROOT,text=True,capture_output=True,timeout=10)
            self.assertNotEqual(r.returncode,0);self.assertEqual(p.read_text(),'corrupt')
if __name__=='__main__':unittest.main()
