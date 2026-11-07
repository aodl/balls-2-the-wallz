import unittest
from verify_cmc_route import route, EXPECTED


class CmcRouteTests(unittest.TestCase):
    def test_official_self_top_up_route(self):
        result = route()
        self.assertEqual(result['cmc_account_identifier'], EXPECTED)
        self.assertEqual(result['subaccount_hex'],
                         '0a000000000240661a0101000000000000000000000000000000000000000000')
        self.assertEqual(result['top_up_memo'], 1347768404)
        self.assertNotEqual(result['cmc_account_identifier'],
                            'c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde')
