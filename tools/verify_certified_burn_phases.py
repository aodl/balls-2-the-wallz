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
    parser.add_argument("--slow-index", action="store_true", help="stop the disposable Index for active minutes 20–30")
    parser.add_argument("--full-speed", action="store_true", help="exercise a bounded disposable Full Speed burst inside the measured hour")
    parser.add_argument("--reserve-protection", action="store_true", help="exercise disposable liquid-budget protection after the established hour")
    parser.add_argument("--held-index", action="store_true", help="hold a real disposable Index response across active meter samples")
    parser.add_argument("--index-fixture", type=Path, help="test-only Index response-hold Wasm, required by --held-index")
    parser.add_argument("--treasury-credit", action="store_true", help="exercise a genuine Ledger/CMC treasury credit after the established window")
    parser.add_argument("--cmc", type=Path, help="exact disposable CMC fixture Wasm, required for treasury credit")
    parser.add_argument("--artifacts", type=Path, default=Path.home() / "dtr-s09-artifacts")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if len(set(args.phase_ms)) != len(args.phase_ms) or any(not 0 <= n < 60_000 for n in args.phase_ms):
        parser.error("distinct Index phases must be in [0, 60000) milliseconds")
    if args.treasury_credit != bool(args.cmc):
        parser.error("treasury credit requires --cmc and --cmc requires --treasury-credit")
    if args.held_index != bool(args.index_fixture) or args.held_index and args.slow_index:
        parser.error("held Index requires --index-fixture and cannot combine with --slow-index")
    if args.full_speed and (args.slow_index or args.held_index or args.treasury_credit):
        parser.error("Full Speed uses its own comparable disposable measurement")
    if args.reserve_protection and (args.slow_index or args.held_index or args.full_speed or args.treasury_credit):
        parser.error("ReserveProtection uses a separate disposable measurement")
    if args.cmc and sha256(args.cmc) != "d336165b2f81ca4e587ed5e749dbda69717c941c33c3c1086f667f3d706f7cb5":
        parser.error("disposable CMC fixture checksum mismatch")
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
        **({"B2Z_CMC_MOCK_WASM": str(args.cmc.resolve())} if args.cmc else {}),
        **({"S14_SLOW_INDEX_WASM": str(args.index_fixture.resolve())} if args.index_fixture else {}),
    }
    report = {
        "source": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "profile_sha256": sha256(args.profile),
        "compact_sha256": sha256(args.compact),
        "prior_sha256": sha256(args.prior),
        "candidate_sha256": sha256(args.candidate),
        "world_sha256": sha256(args.world),
        "cmc_sha256": sha256(args.cmc) if args.cmc else None,
        "index_fixture_sha256": sha256(args.index_fixture) if args.index_fixture else None,
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
                 **({"B2Z_BURN_SLOW_INDEX_PROBE": "1"} if args.slow_index else {}),
                 **({"B2Z_BURN_HELD_INDEX_PROBE": "1"} if args.held_index else {}),
                 **({"B2Z_BURN_FULL_SPEED_PROBE": "1"} if args.full_speed else {}),
                 **({"B2Z_BURN_PROTECTION_PROBE": "1"} if args.reserve_protection else {}),
                 **({"B2Z_BURN_TREASURY_CREDIT_PROBE": "1"} if args.treasury_credit else {}),
                 "POCKET_IC_SERVER_URL": server[3],
                 "S14_DEPLOYMENT_OUTPUT": str(location / "evidence")},
            )
            if row["status"] == "PASS":
                result = json.loads((location / "evidence" / "result.json").read_text())
                if (result["status"] != "PASS" or result["index_phase_ms"] != phase
                        or result["slow_index"] != args.slow_index
                        or bool(result["held_index"]) != args.held_index
                        or bool(result["full_speed"]) != args.full_speed
                        or bool(result["reserve_protection"]) != args.reserve_protection
                        or bool(result["treasury_credit"]) != args.treasury_credit):
                    row.update(status="FAIL", reason="phase evidence mismatch")
            report["checks"].append(row)
            (output / "results.json").write_text(json.dumps(report, indent=2) + "\n")
            print(row["status"], phase, flush=True)
        finally:
            stop_pocketic(*server[:3])
    return int(any(row["status"] != "PASS" for row in report["checks"]))


if __name__ == "__main__":
    raise SystemExit(main())
