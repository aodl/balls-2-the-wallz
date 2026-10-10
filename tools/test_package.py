import json,tempfile,unittest,zipfile
from pathlib import Path
from package_checkpoint import package
class TestPackaging(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.base=Path(self.temp.name);self.root=self.base/'source';self.root.mkdir();(self.root/'CHECKPOINT.json').write_text(json.dumps({'checkpoint_id':'S01'}));(self.root/'README.md').write_text('source\n')
 def tearDown(self):self.temp.cleanup()
 def test_complete_fresh_extraction(self):
  result=package(self.root,self.base/'a.zip');self.assertTrue(result['fresh_extraction_verified']);self.assertEqual(result['payload_files'],2)
 def test_repeated_packaging_is_identical(self):
  a=package(self.root,self.base/'a.zip');b=package(self.root,self.base/'b.zip');self.assertEqual(a['sha256'],b['sha256'])
 def test_build_cache_excluded(self):
  p=self.root/'target/debug';p.mkdir(parents=True);(p/'temporary').write_text('not source');package(self.root,self.base/'a.zip')
  with zipfile.ZipFile(self.base/'a.zip')as z:self.assertFalse(any('target/'in n for n in z.namelist()))
 def test_symlink_rejected(self):
  (self.root/'alias').symlink_to('README.md')
  with self.assertRaisesRegex(ValueError,'symlink'):package(self.root,self.base/'a.zip')
 def test_output_inside_source_rejected(self):
  with self.assertRaisesRegex(ValueError,'outside'):package(self.root,self.root/'a.zip')
 def test_manifest_not_self_referential(self):
  package(self.root,self.base/'a.zip');self.assertNotIn('  FILES.sha256',(self.root/'FILES.sha256').read_text())
if __name__=='__main__':unittest.main()
