#!/usr/bin/env python3
"""Bind a new release build to the exact installed Rules19 interface."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import tempfile

from verify_s14_local import ROOT, wasm_exports

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("profile", choices=("public-launch", "developer-speed", "prelaunch-trickle"))
parser.add_argument("wasm", type=Path)
args = parser.parse_args()
prior = (ROOT / "vendor/b2z/rules19-b258ec23.wasm.gz").read_bytes()
decoded = gzip.decompress(prior)
pins = json.loads((ROOT / "evidence/B2Z/rules19-compact-reservoirs/artifact-pins.json").read_text())
assert hashlib.sha256(decoded).hexdigest() == pins["wasm"]["public_backend"]
with tempfile.TemporaryDirectory(dir=args.wasm.resolve().parent) as directory:
    predecessor = Path(directory) / "rules19.wasm"
    predecessor.write_bytes(decoded)
    expected = set(wasm_exports(predecessor))
expected.update({
    "canister_update prepare_rules20_transition",
    "canister_update commit_rules20_transition",
    "canister_query rules20_transition_status",
})
if args.profile != "public-launch":
    expected.update({
        "canister_update set_dev_simulation_speed",
        "canister_query dev_simulation_speed",
        "canister_update bind_dev_speed_operator",
    })
actual = set(wasm_exports(args.wasm))
assert actual == expected, {"missing": sorted(expected - actual), "unexpected": sorted(actual - expected)}
print(json.dumps({"profile": args.profile, "sha256": hashlib.sha256(args.wasm.read_bytes()).hexdigest(),
                  "exports": sorted(actual)}, indent=2))
