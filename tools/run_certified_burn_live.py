#!/usr/bin/env python3
"""Run the live burn consumer gate on a recent disposable PocketIC clock."""
import argparse
import json
import subprocess
import time
from pathlib import Path

from profile_rules18_cost import checked_artifacts, harness
from verify_s09_local import execute, sha256, start_pocketic, stop_pocketic

parser = argparse.ArgumentParser(description=__doc__)
for name in ("profile", "compact", "prior", "candidate", "world"):
    parser.add_argument("--" + name, type=Path, required=True)
parser.add_argument("--artifacts", type=Path, default=Path.home() / "dtr-s09-artifacts")
parser.add_argument("--browser-python", type=Path, required=True)
parser.add_argument("--agent-only", action="store_true")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=False)
env = {
    **checked_artifacts(args.artifacts),
    "DFX_IDENTITY": "codex_local", "B2Z_PROFILE_FIDUCIARY": "0",
    "B2Z_PROFILE_FIXED_TIME_NS": str(time.time_ns() - 70 * 60 * 1_000_000_000),
    "B2Z_COST_PROFILE_WASM": str(args.profile.resolve()),
    "B2Z_COST_COMPACT_WASM": str(args.compact.resolve()),
    "B2Z_BURN_PRIOR_WASM": str(args.prior.resolve()),
    "B2Z_BURN_CANDIDATE_WASM": str(args.candidate.resolve()),
    "B2Z_COST_WORLD": str(args.world.resolve()),
    # Keep the venv entrypoint: resolve() follows its symlink to the base
    # interpreter and loses the pinned Playwright site-packages.
    "B2Z_BURN_BROWSER_PYTHON": str(args.browser_python.absolute()),
}
if args.agent_only:
    env["B2Z_BURN_AGENT_ONLY"] = "1"
report = {"source": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
          "virtual_time_ns": env["B2Z_PROFILE_FIXED_TIME_NS"],
          "artifacts": {name: sha256(getattr(args, name)) for name in
                        ("profile", "compact", "prior", "candidate", "world")}}
binary = harness(out, env)
server = start_pocketic(env["POCKET_IC_BIN"], out, hard_ttl_seconds=1200, idle_ttl_seconds=120)
try:
    row = execute("live-consumers", [binary, "--ignored", "--exact",
                                     "rules18_cost::certified_operational_burn_live_consumers",
                                     "--nocapture", "--test-threads=1"], out, 900,
                  {**env, "POCKET_IC_SERVER_URL": server[3],
                   "S14_DEPLOYMENT_OUTPUT": str(out / "evidence")})
    report["check"] = row
    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")
    print(row["status"], row["log"], flush=True)
finally:
    stop_pocketic(*server[:3])
if row["status"] != "PASS":
    raise SystemExit(1)
