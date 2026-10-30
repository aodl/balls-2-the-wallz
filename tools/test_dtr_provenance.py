import unittest
from check_dtr_provenance import check_packages
class Provenance(unittest.TestCase):
 def test_wrong_revision_and_path_cannot_qualify_a2(self):
  rev='7'*40
  for source in [None,'registry+x','git+https://github.com/aodl/dtr.git?rev='+rev+'#'+'e'*40,'git+https://github.com/other/dtr.git?rev='+rev+'#'+rev]:
   with self.subTest(source=source),self.assertRaises(ValueError):check_packages([{'name':'dtr-host','version':'0.14.1-cost.1','source':source}],rev)
 def test_every_resolved_dtr_package_is_checked(self):
  rev='7'*40;good={'name':'dtr-host','version':'0.14.1-cost.1','source':'git+https://github.com/aodl/dtr.git?rev='+rev+'#'+rev}
  self.assertEqual(len(check_packages([good],rev)),1)
  with self.assertRaises(ValueError):check_packages([good,{**good,'name':'dtr-wire','source':None}],rev)
  for name in ['life-conformance','dtr-source-model']:
   with self.subTest(name=name),self.assertRaises(ValueError):check_packages([good,{**good,'name':name,'source':None}],rev)
  with self.assertRaises(ValueError):check_packages([good,{**good,'name':'another-upstream-crate','source':'git+https://github.com/aodl/dtr.git?rev='+rev+'#'+'e'*40}],rev)
 def test_no_dtr_is_not_a_pass(self):
  with self.assertRaises(ValueError):check_packages([{'name':'other'}],'7'*40)
if __name__=='__main__':unittest.main()
