"""Native saved-frame contract: preserve real fractional snapshots, reject rewinds."""
import json,math,unittest
from pathlib import Path
from audio_lifecycle_browser import retained_source_frame

class SourceFrameContinuity(unittest.TestCase):
 def test_recorded_native_suspensions_preserve_the_actual_saved_frame(self):
  data=json.loads((Path(__file__).resolve().parents[1]/'tests/fixtures/audio-native-suspend-phase.json').read_text())
  self.assertEqual(len(data['rows']),32)
  self.assertEqual(sum(r['after']<r['before']for r in data['rows']),7)
  for row in data['rows']:
   with self.subTest(row=row):
    self.assertGreaterEqual(retained_source_frame(row['before'],row['after'])['after'],math.floor(row['before']))
 def test_one_full_saved_frame_lost_is_a_failure(self):
  for before in [0,1,128,1495934.0000000002,1597437.9999999998]:
   with self.subTest(before=before),self.assertRaises(AssertionError):
    retained_source_frame(before,math.floor(before)-1)
 def test_restart_and_nonfinite_state_cannot_pass(self):
  for before,after in [(48000,0),(float('nan'),0),(1,float('inf')),(-1,0),(0,-1)]:
   with self.subTest(before=before,after=after),self.assertRaises(AssertionError):
    retained_source_frame(before,after)
if __name__=='__main__':unittest.main()
