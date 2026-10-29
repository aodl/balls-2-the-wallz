import ast,copy,gzip,hashlib,json,shlex,unittest
from pathlib import Path
from unittest.mock import Mock,patch
from prepare_delivery_ci import ROOT,verify_contract
class DeliveryContract(unittest.TestCase):
 def test_cold_runner_fetches_all_graphs_before_offline_provenance(self):
  from check_dtr_provenance import MANIFESTS
  workflow=(ROOT/'.github/workflows/pinned-a2-delivery.yml').read_text()
  commands=[shlex.split(line.strip())for line in workflow.splitlines()if line.strip().startswith(('cargo ','rustup ','python -B tools/check_dtr_provenance.py'))]
  install=commands.index(shlex.split('rustup toolchain install 1.94.1 --profile minimal --target wasm32-unknown-unknown'))
  provenance=commands.index(shlex.split('python -B tools/check_dtr_provenance.py --output .work/delivery-provenance.json'))
  self.assertEqual(sum('tools/check_dtr_provenance.py'in line for line in commands),1)
  for manifest in MANIFESTS:
   fetch=commands.index(['cargo','+1.94.1','fetch','--manifest-path',manifest,'--locked'])
   self.assertLess(install,fetch)
   self.assertLess(fetch,provenance)
  self.assertFalse(any('metadata'in line for line in commands[:provenance]))
  self.assertIn('--prerequisite-wait-seconds 180',workflow)
 def test_original_assertions_and_900_second_call(self):verify_contract()
 def test_exact_normal_modules(self):
  pins={'A0':'7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51','A2':'2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb'}
  manifest=json.loads((ROOT/'vendor/b2z/delivery/manifest.json').read_text())
  for name,sha in pins.items():
   compressed=(ROOT/'vendor/b2z/delivery'/f'{name}.wasm.gz').read_bytes()
   self.assertEqual(hashlib.sha256(compressed).hexdigest(),manifest[name]['gzip_sha256'])
   self.assertEqual(hashlib.sha256(gzip.decompress(compressed)).hexdigest(),sha)
 def test_normal_only_failure_cannot_become_success(self):
  module=ast.parse((ROOT/'tools/verify_s14_deployment.py').read_text())
  branch=next(n for n in ast.walk(module)if isinstance(n,ast.If)and any(isinstance(x,ast.Constant)and x.value=='normal-only-exact-production-artifact-no-fault-phases'for x in ast.walk(n)))
  for status in ['FAIL','PASS']:
   record=Mock();stop=Mock();import os
   namespace={'os':os,'sustained':True,'report':{'million_sustained_analysis':{'status':status}},'record':record,'stop_capture':stop}
   function=ast.FunctionDef(name='exercise',args=ast.arguments(posonlyargs=[],args=[],kwonlyargs=[],kw_defaults=[],defaults=[]),body=[copy.deepcopy(branch)],decorator_list=[])
   exec(compile(ast.fix_missing_locations(ast.Module(body=[function],type_ignores=[])),'normal-only-gate','exec'),namespace)
   with patch.dict(os.environ,{'S14_QUAL_NORMAL_ONLY':'1'}):
    if status=='FAIL':
     with self.assertRaises(AssertionError):namespace['exercise']()
     record.assert_not_called()
    else:namespace['exercise']();record.assert_called_once()
if __name__=='__main__':unittest.main()
