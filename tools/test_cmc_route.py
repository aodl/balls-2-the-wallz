import unittest
from verify_cmc_route import route, EXPECTED


class CmcRouteTests(unittest.TestCase):
    def test_official_self_top_up_route(self):
        result = route()
        self.assertEqual(result['cmc_account_identifier'], EXPECTED)
        self.assertEqual(result['subaccount_hex'],
                         '0a000000000230120a0101000000000000000000000000000000000000000000')
        self.assertEqual(result['top_up_memo'], 1347768404)
        self.assertNotEqual(result['cmc_account_identifier'],
                            '344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a')
