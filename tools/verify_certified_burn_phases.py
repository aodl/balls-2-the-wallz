#!/usr/bin/env python3
"""Compare certified self-status burn at distinct disposable Index timer phases."""
import argparse
import json
from pathlib import Path
import subprocess

from profile_rules18_cost import checked_artifacts, harness
from verify_s09_local import execute, sha256, start_pocketic, stop_pocketic


CASE = "rules18_cost::certified_operational_burn_roundtrip"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--compact", type=Path, required=True)
    parser.add_argument("--prior", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--world", type=Path, required=True)
    parser.add_argument("--phase-ms", type=int, action="append", required=True)
    parser.add_argument("--artifacts", type=Path, default=Path.home() / "dtr-s09-artifacts")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if len(set(args.phase_ms)) != len(args.phase_ms) or any(not 0 <= n < 60_000 for n in args.phase_ms):
        parser.error("distinct Index phases must be in [0, 60000) milliseconds")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    env = {
        **checked_artifacts(args.artifacts),
        "DFX_IDENTITY": "codex_local",
        "B2Z_PROFILE_FIXED_TIME_NS": "1795543283000000000",
        "B2Z_PROFILE_FIDUCIARY": "0",
        "B2Z_COST_PROFILE_WASM": str(args.profile.resolve()),
        "B2Z_COST_COMPACT_WASM": str(args.compact.resolve()),
        "B2Z_BURN_PRIOR_WASM": str(args.prior.resolve()),
        "B2Z_BURN_CANDIDATE_WASM": str(args.candidate.resolve()),
        "B2Z_COST_WORLD": str(args.world.resolve()),
    }
    report = {
        "source": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "profile_sha256": sha256(args.profile),
        "compact_sha256": sha256(args.compact),
        "prior_sha256": sha256(args.prior),
        "candidate_sha256": sha256(args.candidate),
        "world_sha256": sha256(args.world),
        "checks": [],
    }
    binary = harness(output, env)
    for phase in args.phase_ms:
        location = output / f"phase-{phase:05d}"
        server = start_pocketic(env["POCKET_IC_BIN"], location,
                                hard_ttl_seconds=1200, idle_ttl_seconds=120)
        try:
            row = execute(
                f"phase-{phase:05d}",
                [binary, "--ignored", "--exact", CASE, "--nocapture", "--test-threads=1"],
                location, 900,
                {**env, "B2Z_BURN_INDEX_PHASE_MS": str(phase),
                 "POCKET_IC_SERVER_URL": server[3],
                 "S14_DEPLOYMENT_OUTPUT": str(location / "evidence")},
            )
            if row["status"] == "PASS":
                result = json.loads((location / "evidence" / "result.json").read_text())
                if result["status"] != "PASS" or result["index_phase_ms"] != phase:
                    row.update(status="FAIL", reason="phase evidence mismatch")
            report["checks"].append(row)
            (output / "results.json").write_text(json.dumps(report, indent=2) + "\n")
            print(row["status"], phase, flush=True)
        finally:
            stop_pocketic(*server[:3])
    return int(any(row["status"] != "PASS" for row in report["checks"]))


if __name__ == "__main__":
    raise SystemExit(main())
