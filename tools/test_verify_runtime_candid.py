import unittest

from verify_runtime_candid import extract, reject_test_exports


class TestGeneratedCandidExtraction(unittest.TestCase):
    def test_extracts_one_marked_service(self):
        text = "noise\nDTR_RUNTIME_CANDID_BEGIN\nservice : {}\nDTR_RUNTIME_CANDID_END\nmore"
        self.assertEqual(extract(text), "service : {}\n")

    def test_rejects_missing_or_repeated_markers(self):
        with self.assertRaises(ValueError):
            extract("service : {}")
        with self.assertRaises(ValueError):
            extract("DTR_RUNTIME_CANDID_BEGIN\na\nDTR_RUNTIME_CANDID_END\nDTR_RUNTIME_CANDID_END")

    def test_normal_interface_rejects_benchmark_and_test_exports(self):
        reject_test_exports('service : { lab_status: () -> (); }')
        for name in ('__canbench__dense', '__tracing__dense', 'test_metrics'):
            with self.assertRaises(ValueError):
                reject_test_exports(f'service : {{ {name}: () -> (); }}')


if __name__ == "__main__":
    unittest.main()
