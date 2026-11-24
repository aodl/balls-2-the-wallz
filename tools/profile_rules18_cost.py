#!/usr/bin/env python3
"""Run the Rules18 cost matrix against an owned, disposable PocketIC server."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys

from verify_s09_local import ROOT, execute, sha256, start_pocketic, stop_pocketic


CASES = (
    "protected", "protected_paused", "protected_no_index", "protected_no_treasury",
    "idle", "two_ball", "moderate", "large", "payment", "retained",
)
ARTIFACTS = {
    "POCKET_IC_BIN": ("bin/pocket-ic", "b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db"),
    "ICP_LEDGER_WASM": ("wasm/ledger-canister.wasm", "7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc"),
    "ICP_INDEX_WASM": ("wasm/ic-icp-index-canister.wasm", "6090e959fe05a4e283f935bd7670d51a4cebd5728c6676012d6f8b3bab8a8d30"),
}


def checked_artifacts(artifacts):
    files = {}
    for name, (relative, expected) in ARTIFACTS.items():
        path = artifacts / relative
        if sha256(path) != expected:
            raise ValueError(f"checksum mismatch for {path}")
        files[name] = str(path.resolve())
    return files


def harness(output, env):
    command = [
        "cargo", "test", "--manifest-path", "tools/s09-integration/Cargo.toml",
        "--locked", "--offline", "--test", "s14_index", "--no-run", "--message-format=json",
    ]
    row = execute("build-harness", command, output, 360, env)
    log = output / row["log"]
    if row["status"] != "PASS":
        raise ValueError(f"test harness build failed, see {log}")
    for line in log.read_text().splitlines():
        if not line.startswith("{"):
            continue
        row = json.loads(line)
        if row.get("executable") and row.get("target", {}).get("name") == "s14_index":
            return row["executable"]
    raise ValueError(f"test executable absent from {log}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--world", type=Path, required=True, help="canonical Schema10 two-Ball state")
    parser.add_argument("--time-ns", default="1795543283000000000", help="disposable UTC consensus clock")
    parser.add_argument("--profile-wasm", type=Path, required=True, help="cost-profile,developer-speed build")
    parser.add_argument("--measure-wasm", type=Path, help="upgrade fixture to an explicit release before measurement")
    parser.add_argument("--measure-instrumented", action="store_true", help="upgraded build exports profiling counters")
    parser.add_argument("--case", action="append", choices=CASES, dest="cases")
    parser.add_argument("--jobs", type=int, default=1)
    parser.add_argument("--artifacts", type=Path, default=Path.home() / "dtr-s09-artifacts")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.jobs < 1 or (args.measure_instrumented and not args.measure_wasm):
        parser.error("positive job count and explicit measured Wasm for instrumented upgrades required")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    env = {
        **checked_artifacts(args.artifacts), "DFX_IDENTITY": "codex_local",
        "B2Z_PROFILE_FIDUCIARY": "0", "B2Z_PROFILE_FIXED_TIME_NS": args.time_ns,
        "B2Z_COST_WORLD": str(args.world.resolve()), "B2Z_COST_PROFILE_WASM": str(args.profile_wasm.resolve()),
    }
    for name in ("B2Z_PROFILE_INITIAL_CYCLES", "B2Z_COST_MEASURE_WASM", "B2Z_COST_PROFILE_ACTIVE"):
        os.environ.pop(name, None)
    if args.measure_wasm:
        env["B2Z_COST_MEASURE_WASM"] = str(args.measure_wasm.resolve())
        if args.measure_instrumented:
            env["B2Z_COST_PROFILE_ACTIVE"] = "1"
    report = {
        "source_revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "world_sha256": sha256(args.world),
        "seed_module_sha256": sha256(args.profile_wasm),
        "measured_module_sha256": sha256(args.measure_wasm or args.profile_wasm),
        "virtual_time_ns": args.time_ns,
        "checks": [],
    }
    command = [
        harness(output, env), "--ignored", "--exact", "rules18_cost::rules18_cost_matrix",
        "--nocapture", "--test-threads=1",
    ]
    server = start_pocketic(env["POCKET_IC_BIN"], output, hard_ttl_seconds=1800, idle_ttl_seconds=120)
    try:
        def run(case):
            location = output / case
            return execute(
                case, command, location, 600,
                {**env, "POCKET_IC_SERVER_URL": server[-1], "B2Z_COST_CASE": case,
                 "S14_DEPLOYMENT_OUTPUT": str(location)},
            )

        with ThreadPoolExecutor(max_workers=args.jobs) as executor:
            for row in executor.map(run, dict.fromkeys(args.cases or CASES)):
                report["checks"].append(row)
                (output / "results.json").write_text(json.dumps(report, indent=2) + "\n")
                print(row["id"], row["status"], flush=True)
    finally:
        stop_pocketic(*server[:3])
    return int(any(row["status"] != "PASS" for row in report["checks"]))


if __name__ == "__main__":
    sys.exit(main())
