"""Actual separate-process restart verification, not merely object reconstruction."""
import json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class DemoTests(unittest.TestCase):
    def command(self,file,budget,slices,name='severance'):
        p=subprocess.run(['node','tools/demo.mjs','b2z',name,'--journal',str(file),'--budget',str(budget),'--slices',str(slices)],
            cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(p.returncode,0,p.stderr)
        return json.loads(p.stdout)
    def test_restart_during_capture_matches_uninterrupted_process(self):
        with tempfile.TemporaryDirectory()as t:
            a=Path(t)/'resume.json';b=Path(t)/'whole.json'
            first=self.command(a,1,30)
            self.assertEqual(first['status'],'RUNNING')
            for _ in range(20):
                if first['kernel_phase']=='topology':break
                first=self.command(a,1,1)
            self.assertEqual(first['kernel_phase'],'topology')
            second=self.command(a,7,10000);whole=self.command(b,10000,10000)
            self.assertEqual(second['status'],'COMMITTED')
            for key in ['published_state_hash','published_manifest_hash','published_area_time']:
                self.assertEqual(second[key],whole[key])
            again=self.command(a,1,1)
            self.assertEqual(again['journal_revision'],second['journal_revision'])
            self.assertEqual(again['slices_this_process'],0)
    def test_restart_inside_exhaustive_spawn_matches_fresh_process(self):
        with tempfile.TemporaryDirectory()as t:
            a=Path(t)/'spawn.json';b=Path(t)/'whole.json'
            first=self.command(a,1,10,name='admission')
            self.assertEqual(first['kernel_phase'],'spawn')
            self.assertEqual(first['published_cannon_count'],0)
            second=self.command(a,127,10000,name='admission');whole=self.command(b,10000,10000,name='admission')
            self.assertEqual(second['status'],'COMMITTED');self.assertEqual(second['published_cannon_count'],2)
            for k in ['published_state_hash','published_manifest_hash','published_area_time']:self.assertEqual(second[k],whole[k])
    def test_mismatched_scenario_and_existing_lock_fail_closed(self):
        with tempfile.TemporaryDirectory()as t:
            file=Path(t)/'demo.json';self.command(file,1,1)
            cmd=['node','tools/demo.mjs','b2z','duel','--journal',str(file)]
            p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=10)
            self.assertNotEqual(p.returncode,0);self.assertIn('mismatch',p.stderr)
            lock=Path(str(file)+'.lock');lock.write_text('external holder')
            p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=10)
            self.assertNotEqual(p.returncode,0);self.assertTrue(lock.exists())
    def test_corrupted_local_journal_is_not_silently_reset(self):
        with tempfile.TemporaryDirectory()as t:
            file=Path(t)/'demo.json';self.command(file,1,1);file.write_bytes(b'bad data')
            p=subprocess.run(['node','tools/demo.mjs','b2z','severance','--journal',str(file)],cwd=ROOT,capture_output=True,text=True,timeout=10)
            self.assertNotEqual(p.returncode,0);self.assertEqual(file.read_bytes(),b'bad data')
if __name__=='__main__':unittest.main()
