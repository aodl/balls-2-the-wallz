#!/usr/bin/env python3
"""Run the exact installed Rules19/Rules20 cases on disposable PocketIC."""
import argparse
import json
from pathlib import Path
import subprocess

from profile_rules18_cost import checked_artifacts, harness
from verify_s09_local import execute, sha256, start_pocketic, stop_pocketic

INSTALLED = "b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90"
COMPACT = "b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de"
CASES = (
    "rules19_digit_leading_grant_wire_boundary",
    "rules19_multi_pending_recovery",
    "rules20_paid_epoch_and_recovery",
    "rules20_paid_construction_over_existing_balls",
    "rules20_paid_threshold_population",
    "rules20_paid_symbolic_population",
    "rules20_paid_second_doubling_population",
    "rules20_paid_unrepresentable_population",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--installed", type=Path, required=True)
    parser.add_argument("--compact", type=Path, required=True)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--world", type=Path, required=True)
    parser.add_argument("--artifacts", type=Path, default=Path.home() / "dtr-s09-artifacts")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--case", choices=CASES, action="append")
    args = parser.parse_args()

    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    if sha256(args.installed) != INSTALLED or sha256(args.compact) != COMPACT:
        raise ValueError("exact Rules19 installed and prelaunch-predecessor hashes required")
    env = {
        **checked_artifacts(args.artifacts),
        "DFX_IDENTITY": "codex_local",
        # Start the published fixture before the seeded dormant-account
        # deadlines. Advance across UTC only in the individual test.
        "B2Z_PROFILE_FIXED_TIME_NS": "1795543283000000000",
        "B2Z_PROFILE_FIDUCIARY": "0",
        "B2Z_RULES20_INSTALLED_WASM": str(args.installed.resolve()),
        "B2Z_COST_COMPACT_WASM": str(args.compact.resolve()),
        "B2Z_COST_PROFILE_WASM": str(args.profile.resolve()),
        "B2Z_RULES20_CANDIDATE_WASM": str(args.candidate.resolve()),
        "B2Z_COST_WORLD": str(args.world.resolve()),
    }
    report = {
        "source": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "candidate_sha256": sha256(args.candidate),
        "installed_sha256": INSTALLED,
        "checks": [],
    }
    binary = harness(out, env)
    for case in args.case or CASES:
        case_out = out / case
        server = start_pocketic(env["POCKET_IC_BIN"], case_out, hard_ttl_seconds=1500, idle_ttl_seconds=120)
        try:
            result = execute(
                case, [binary, "--ignored", "--exact", f"rules18_cost::{case}", "--nocapture"],
                case_out, 1380, {**env, "POCKET_IC_SERVER_URL": server[3],
                                  "S14_DEPLOYMENT_OUTPUT": str(case_out / "evidence")},
            )
            if result["status"] == "PASS":
                transcript = (case_out / result["log"]).read_text()
                if "test result: ok. 1 passed;" not in transcript:
                    result.update(status="FAIL", reason="expected exactly one executed test")
            report["checks"].append(result)
            (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")
            print(result["status"], case, flush=True)
        finally:
            stop_pocketic(*server[:3])
    return int(any(result["status"] != "PASS" for result in report["checks"]))


if __name__ == "__main__":
    raise SystemExit(main())
