"""Executed separate-process recovery, including persisted partial chunk uploads."""
import json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ChunkedDemoTests(unittest.TestCase):
    def run_demo(self,file,*args,success=True):
        p=subprocess.run(['node','tools/chunked_demo.mjs','btz','admission','--journal',str(file),*args],cwd=ROOT,capture_output=True,text=True,timeout=30)
        if not success:
            self.assertNotEqual(p.returncode,0);return p
        self.assertEqual(p.returncode,0,p.stderr);return json.loads(p.stdout)
    def compare(self,fault):
        with tempfile.TemporaryDirectory()as t:
            a=Path(t)/'resume.json';b=Path(t)/'whole.json'
            interrupted=self.run_demo(a,'--fault',fault,'--budget','1')
            self.assertEqual(interrupted['status'],'INTERRUPTED')
            self.assertEqual(interrupted['published_cannon_count'],0)
            if fault!='after':
                before=a.read_bytes();p=self.run_demo(a,success=False)
                self.assertIn('explicitly --recover yes',p.stderr);self.assertEqual(a.read_bytes(),before)
            resumed=self.run_demo(a,'--recover','yes');whole=self.run_demo(b)
            self.assertEqual(resumed['status'],'COMMITTED');self.assertFalse(resumed['unpublished_upload'])
            for key in ['published_state_hash','published_manifest_hash','published_area_time']:
                self.assertEqual(resumed[key],whole[key])
            again=self.run_demo(a);self.assertEqual(again['journal_revision'],resumed['journal_revision'])
    def test_partial_chunk_restart(self):self.compare('chunk:0')
    def test_prepublication_restart(self):self.compare('before_root')
    def test_lost_acknowledgement_restart(self):self.compare('after')
    def test_corruption_and_lock_are_not_reset(self):
        with tempfile.TemporaryDirectory()as t:
            file=Path(t)/'image.json';self.run_demo(file,'--fault','chunk:0');file.write_bytes(b'corrupt')
            self.run_demo(file,'--recover','yes',success=False);self.assertEqual(file.read_bytes(),b'corrupt')
            lock=Path(str(file)+'.lock');lock.write_text('external holder');self.run_demo(file,success=False);self.assertTrue(lock.exists())
if __name__=='__main__':unittest.main()
