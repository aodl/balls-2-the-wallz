#!/usr/bin/env python3
"""Two clean pinned builds plus independent mutations, with no network or deployment."""
import argparse
import json
from pathlib import Path
import shutil
from types import SimpleNamespace

from build_embedded_frontend import build, digest, inspect_wasm, report, stage


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--observer", type=Path, required=True)
    p.add_argument("--inventory", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--first-build", type=Path, required=True)
    args = p.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    first = args.first_build.resolve()
    clean = out/"second"
    stage(SimpleNamespace(observer=args.observer, inventory=args.inventory), clean)
    build(clean)
    left = inspect_wasm(first/"frontend.wasm")
    right = inspect_wasm(clean/"frontend.wasm")
    assert left == right, (left["sha256"], right["sha256"])
    assert (first/"frontend.wasm").read_bytes() == (clean/"frontend.wasm").read_bytes()
    assert (first/"embedded-inventory.json").read_bytes() == (clean/"embedded-inventory.json").read_bytes()
    print("PASS complete independent Rust builds byte-identical", left["sha256"], flush=True)

    manifest = json.loads((clean/"embedded-inventory.json").read_text())
    directory = clean/"compile/public"
    audio = next(r["path"].lstrip("/") for r in manifest if r["path"].endswith(".flac"))
    representatives = ["index.html", "app.mjs", "style.css", "balls-to-the-wallz-b2z-wordmark.svg", audio]
    cases = []
    for name in representatives:
        path = directory/name
        original = path.read_bytes()
        data = bytearray(original)
        offset = len(data)//2
        data[offset] ^= 1
        path.write_bytes(data)
        try:
            build(clean)
            changed = inspect_wasm(clean/"frontend.wasm")
            assert changed["sha256"] != left["sha256"], name
            case = {"path": name, "offset": offset, "original_sha256": digest(original),
                    "mutated_sha256": digest(data), "mutated_wasm_sha256": changed["sha256"]}
            cases.append(case)
            if name == "index.html":
                # Retain the exact mutation for the deliberately disposable
                # embedded-to-embedded recovery rehearsal. Never qualify it for release.
                shutil.copyfile(clean/"frontend.wasm", out/"disposable-mutation.wasm")
            print("PASS single-byte change reidentifies module", name, changed["sha256"], flush=True)
        finally:
            path.write_bytes(original)
    build(clean)
    assert inspect_wasm(clean/"frontend.wasm") == left
    report(out/"results.json", {"status": "PASS", "clean_builds": [left, right],
        "mutations": cases, "restored_module_sha256": left["sha256"],
        "scope": "Each mutation is isolated to a disposable staged identity representation. Original release and source assets retain exact bytes."})


if __name__ == "__main__":
    main()
