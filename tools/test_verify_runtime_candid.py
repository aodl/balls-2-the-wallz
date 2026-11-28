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

    # TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
    def test_normal_interface_rejects_developer_speed(self):
        for name in ('dev_simulation_speed', 'set_dev_simulation_speed', 'bind_dev_speed_operator'):
            with self.assertRaises(ValueError):
                reject_test_exports(f'service : {{ {name}: () -> (); }}')

    def test_prelaunch_interface_allows_developer_controls_but_rejects_test_hooks(self):
        reject_test_exports('service : { dev_simulation_speed: () -> (); }', allow_developer=True)
        for name in ('__canbench__dense', '__tracing__dense', 'test_metrics'):
            with self.assertRaises(ValueError):
                reject_test_exports(f'service : {{ {name}: () -> (); }}', allow_developer=True)


if __name__ == "__main__":
    unittest.main()
