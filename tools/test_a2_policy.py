import unittest
from types import SimpleNamespace
from pathlib import Path
from run_matched_delivery import selected_cases

class A2Policy(unittest.TestCase):
 def args(self):return SimpleNamespace(a2_only=True,normal_only=True,asset_reference=Path('original-assets'),a0=None,a2=Path('frozen-A2'),a2_sha256='2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb')
 def test_a2_only_cannot_execute_control(self):
  a=self.args();self.assertEqual(selected_cases(a),[('A2',a.a2)])
 def test_original_pair_still_requires_both_cases(self):
  a=self.args();a.a2_only=False;a.a0=Path('frozen-A0');self.assertEqual([label for label,_ in selected_cases(a)],['A0','A2'])
 def test_a2_policy_does_not_allow_other_wasm_or_fault_phases(self):
  for name,value in [('normal_only',False),('asset_reference',None),('a2_sha256','other-binary')]:
   a=self.args();setattr(a,name,value)
   with self.subTest(name=name),self.assertRaises(ValueError):selected_cases(a)
if __name__=='__main__':unittest.main()
