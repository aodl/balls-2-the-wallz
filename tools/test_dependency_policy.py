import copy, unittest
from check_source import check_npm,check_version
class DependencyPolicy(unittest.TestCase):
    def base(self):
        package={'name':'test','version':'1.0.0','dependencies':{'example-sdk':'1.2.3'}}
        lock={'lockfileVersion':3,'packages':{'':copy.deepcopy(package),'node_modules/example-sdk':{'version':'1.2.3','resolved':'https://registry.example.org/x.tgz','integrity':'sha512-synthetic-policy-fixture'}}}
        return package,lock
    def test_exact_pinned_nonempty_dependency_graph_is_allowed(self):self.assertTrue(check_npm(*self.base()))
    def test_unlocked_direct_dependency_rejected(self):
        p,l=self.base();l['packages']['']['dependencies']={}
        with self.assertRaises(ValueError):check_npm(p,l)
    def test_unverified_resolution_rejected(self):
        p,l=self.base();l['packages']['node_modules/example-sdk'].pop('integrity')
        with self.assertRaises(ValueError):check_npm(p,l)
    def test_range_and_git_versions_rejected(self):
        for v in ['^1.2.3','~1.2.3','latest','git+https://example.org/a']:
            with self.subTest(version=v),self.assertRaises(ValueError):check_version(v)
    def test_bad_project_identity_rejected(self):
        p,l=self.base();l['packages']['']['version']='0.0.0'
        with self.assertRaises(ValueError):check_npm(p,l)
if __name__=='__main__':unittest.main()
