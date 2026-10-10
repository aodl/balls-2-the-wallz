import unittest
from observation_reference import canonical,digest,build
class IndependentPublication(unittest.TestCase):
    def test_canonical_order(self):self.assertEqual(canonical({'b':2,'a':1}),b'{"a":1,"b":2}')
    def test_standard_empty_sha256(self):self.assertEqual(digest(b''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    def test_tag_remains_typed(self):self.assertEqual(canonical({'n':{'$integer':'123'}}),b'{"n":{"$integer":"123"}}')
if __name__=='__main__':unittest.main()
