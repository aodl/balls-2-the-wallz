#!/usr/bin/env python3
"""TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys

from build_embedded_frontend import ROOT, digest, report

PRODUCTION_SOURCE = "351d96d7059f7f84957af1470c86a7028c588392"
FROZEN_ASSETS = "evidence/B2Z/rules18-delegated-payments/artifacts"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    frozen = ROOT / FROZEN_ASSETS
    verification = output / "verified-base"
    baseline = output / "rules18-source"
    subprocess.run(["git", "worktree", "add", "--detach", str(baseline), PRODUCTION_SOURCE], cwd=ROOT, check=True)
    dependencies = baseline / "node_modules"
    try:
        subprocess.run(["npm", "ci", "--offline", "--ignore-scripts"], cwd=baseline, check=True)
        subprocess.run([sys.executable, "-B", "tools/verify_approved_panel_freeze.py", "--artifacts",
                        str(baseline / FROZEN_ASSETS), "--output", str(verification)], cwd=baseline, check=True)
    finally:
        if dependencies.is_dir():
            shutil.rmtree(dependencies)
        subprocess.run(["git", "worktree", "remove", str(baseline)], cwd=ROOT, check=True)
    observer = verification / "reproduced"
    refresh = output / "current-observer"
    subprocess.run(["node", "tools/build_observer_playability.mjs", "--canister",
                    "s5ir5-gqaaa-aaaas-amyna-cai", "--output", str(refresh)], cwd=ROOT, check=True)
    player = observer / "app.mjs"
    shutil.copyfile(refresh / "app.mjs", player)
    target = observer / "developer-speed.mjs"
    subprocess.run([str(ROOT / "node_modules/.bin/esbuild"), "apps/b2z-observer/developer-speed-entry.mjs",
                    "--bundle", "--platform=browser", "--format=esm", "--minify", "--outfile=" + str(target)],
                   cwd=ROOT, check=True)
    index = observer / "index.html"
    html = index.read_bytes()
    assert html.count(b"</body>") == 1
    index.write_bytes(html.replace(b"</body>", b'<script type="module" src="/developer-speed.mjs"></script></body>'))
    rows = json.loads((frozen / "frontend-inventory.json").read_text())
    for file in (index, player, target):
        rows = [row for row in rows if row["path"] != file.name]
        data = file.read_bytes()
        rows.append({"path": file.name, "bytes": len(data), "sha256": digest(data)})
    inventory = output / "inventory.json"
    report(inventory, sorted(rows, key=lambda row: row["path"]))
    subprocess.run([sys.executable, "-B", "tools/build_embedded_frontend.py", "--observer", str(observer),
                    "--inventory", str(inventory), "--output", str(output / "release"), "--developer-speed"],
                   cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
