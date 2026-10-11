import sys
import tempfile
import unittest
from pathlib import Path

from verify_s09_local import execute


ROOT = Path(__file__).resolve().parents[1]


class TestNestedExitClassification(unittest.TestCase):
    def output(self):
        work = ROOT / ".work"
        work.mkdir(exist_ok=True)
        return tempfile.TemporaryDirectory(dir=work)

    def test_external_argparse_usage_exit_two_is_failure(self):
        with self.output() as directory:
            row = execute(
                "usage",
                [
                    sys.executable,
                    "-c",
                    "import argparse; p=argparse.ArgumentParser(); p.add_argument('required'); p.parse_args()",
                ],
                Path(directory),
                10,
            )
        self.assertEqual(row["exit_code"], 2)
        self.assertEqual(row["status"], "FAIL")
        self.assertNotIn("exit_contract", row)

    def test_documented_prerequisite_wrapper_exit_two_is_blocked(self):
        with self.output() as directory:
            row = execute(
                "documented-wrapper",
                [
                    sys.executable,
                    "-c",
                    "print('BLOCKED: required browser environment is unavailable'); raise SystemExit(2)",
                ],
                Path(directory),
                10,
                allow_blocked_exit=True,
            )
        self.assertEqual(row["exit_code"], 2)
        self.assertEqual(row["status"], "BLOCKED")
        self.assertEqual(row["exit_contract"], "project-wrapper-exit-2-is-blocked")


if __name__ == "__main__":
    unittest.main()
