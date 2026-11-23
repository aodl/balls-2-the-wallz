#!/usr/bin/env python3
"""Verify the historical Rules18 freeze and the reviewed integration inputs."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from build_embedded_frontend import ROOT, report

FROZEN_ASSETS = "evidence/B2Z/rules18-delegated-payments/artifacts"
HISTORICAL_SOURCE = "351d96d7059f7f84957af1470c86a7028c588392"
REVIEWED_SOURCE = "53e737c382e0cc0299cf8c35dd5e2449cc78ce70"
# Current public observer bundle, without the separate developer entry point.
PUBLIC_APP = "4eec4514ef88a46bc8d95f5bc95825ef4c8e0f46881ee3edd9ccb198ff64b8b5"


def run(*command, cwd=ROOT):
    subprocess.run(command, cwd=cwd, check=True)


def public_observer(out, inventory):
    observer = out / "public-observer"
    run("node", "tools/build_observer_playability.mjs", "--canister",
        "s5ir5-gqaaa-aaaas-amyna-cai", "--output", str(observer))
    expected = {row["path"]: row["sha256"] for row in inventory}
    expected["app.mjs"] = PUBLIC_APP
    rows = [{"path": path.relative_to(observer).as_posix(),
             "sha256": sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size}
            for path in sorted(observer.rglob("*")) if path.is_file()]
    actual = {row["path"]: row["sha256"] for row in rows}
    if expected.keys() != actual.keys() or any(
        actual[name] != digest for name, digest in expected.items() if name != "build-manifest.json"
    ):
        raise ValueError("Public observer differs from the approved inventory and app")
    for name in ("index.html", "app.mjs"):
        body = (observer / name).read_bytes()
        for marker in (b"developer-speed.mjs", b"dev_simulation_speed", b"set_dev_simulation_speed",
                       b"bind_dev_speed_operator"):
            if marker in body:
                raise ValueError(f"Developer control in public {name}")
    report(out / "public-inventory.json", rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument("--backend-only", action="store_true")
    scope.add_argument("--public-observer", action="store_true")
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    frozen = ROOT / FROZEN_ASSETS
    provenance = json.loads((frozen / "provenance.json").read_text())
    # Match the reviewed integration tree for every frozen input and all source
    # directories that can supply additional runtime assets to the builds.
    paths = sorted({row["path"] for row in provenance["backend_inputs" if args.backend_only else "inputs"]})
    paths += [FROZEN_ASSETS, "canisters/runtime-lab"]
    if not args.backend_only:
        paths += ["apps/b2z-observer", "canisters/frontend", "tools/build_dev_speed_frontend.py"]
    run("git", "diff", "--exit-code", REVIEWED_SOURCE, "--", *paths)

    with tempfile.TemporaryDirectory(dir=out.parent, prefix="rules18-freeze-") as directory:
        baseline = Path(directory) / "source"
        run("git", "worktree", "add", "--detach", str(baseline), HISTORICAL_SOURCE)
        try:
            if not args.backend_only:
                run("npm", "ci", "--offline", "--ignore-scripts", cwd=baseline)
            command = [sys.executable, "-B", "tools/verify_approved_panel_freeze.py",
                       "--artifacts", str(baseline / FROZEN_ASSETS),
                       "--output", str(out / "historical")]
            if args.backend_only:
                command.append("--backend-only")
            run(*command, cwd=baseline)
        finally:
            if (baseline / "node_modules").is_dir():
                shutil.rmtree(baseline / "node_modules")
            run("git", "worktree", "remove", str(baseline))
    if args.public_observer:
        public_observer(out, json.loads((frozen / "frontend-inventory.json").read_text()))
    report(out / "result.json", {
        "status": "PASS", "historical_checkout": HISTORICAL_SOURCE,
        "reviewed_integration_inputs": REVIEWED_SOURCE, "backend_only": args.backend_only,
        "public_observer": args.public_observer,
    })


if __name__ == "__main__":
    main()
