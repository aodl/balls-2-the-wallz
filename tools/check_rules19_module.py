#!/usr/bin/env python3
"""Check a reviewed Rules19 release artifact against its exact Wasm pin."""
import argparse
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
pins = json.loads((root / "evidence/B2Z/rules19-compact-reservoirs/artifact-pins.json").read_text())["wasm"]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("kind", choices=pins)
parser.add_argument("artifact", type=Path)
args = parser.parse_args()
actual = hashlib.sha256(args.artifact.read_bytes()).hexdigest()
if actual != pins[args.kind]:
    raise SystemExit(f"{args.kind} SHA-256 {actual} differs from pin {pins[args.kind]}")
print(args.kind, actual)
