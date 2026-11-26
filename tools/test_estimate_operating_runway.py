"""Focused offline checks for the read-only operating-runway calculator."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from estimate_operating_runway import _record, compare  # noqa: E402


class OperatingRunwayTest(unittest.TestCase):
    def test_exact_elapsed_duration_and_floor(self):
        first = {"time_ns": 1_000_000_000, "liquid_cycles": 3_000_000_000_000, "head": 12}
        last = {"time_ns": 86_401_000_000_000, "liquid_cycles": 2_500_000_000_000, "head": 112}
        result = compare(first, last, 1_000_000_000_000, 2_070_000_000_000)
        self.assertEqual(result["net_cycles_per_day_floor"], "500000000000")
        self.assertEqual(result["net_T_cycles_per_day"], "0.500000")
        self.assertEqual(result["reserve_protection_seconds_at_observed_rate"], "259200")
        self.assertEqual(result["publication_delta"], 100)

    def test_credit_or_top_up_does_not_invent_burn(self):
        first = {"time_ns": 1, "liquid_cycles": 3_000, "head": 1}
        last = {"time_ns": 2_000_000_001, "liquid_cycles": 4_000, "head": 2}
        result = compare(first, last, 1_000, 2_000)
        self.assertEqual(result["net_decline_cycles"], "-1000")
        self.assertEqual(result["rate_status"], "unavailable: no positive settled net decline")
        self.assertNotIn("net_cycles_per_day_floor", result)

    def test_refuse_reversed_head_and_unsettled_sample(self):
        with self.assertRaisesRegex(ValueError, "ordered"):
            compare({"time_ns": 1, "liquid_cycles": 5, "head": 4},
                    {"time_ns": 2, "liquid_cycles": 4, "head": 3}, 1, 2)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.json"
            path.write_text(json.dumps({"health": {"observed_at_ns": "1000", "liquid_cycles": "4"},
                                        "settlement": {"settled": False}, "publication": {"head": "1"}}))
            with self.assertRaisesRegex(ValueError, "unsettled"):
                _record(path)

    def test_reviewed_iso_observation_uses_integer_time(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.json"
            path.write_text(json.dumps({"settled": True, "observation_utc": "2026-11-26T12:42:54.589Z",
                                        "backend": {"settled_liquid_cycles": "2986425135592"},
                                        "publication": {"head": "18250"}}))
            observed = _record(path)
            self.assertEqual(observed["liquid_cycles"], 2_986_425_135_592)
            self.assertEqual(observed["time_ns"] % 1_000_000_000, 589_000_000)


if __name__ == "__main__":
    unittest.main()
