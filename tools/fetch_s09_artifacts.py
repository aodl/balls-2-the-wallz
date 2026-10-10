#!/usr/bin/env python3
"""Fetch exact S09 PocketIC/ICP-ledger test artifacts without running installers."""
import argparse
import gzip
import hashlib
import json
import os
import shutil
import stat
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tools/s09-artifacts.json"


def digest(path: Path) -> tuple[str, int]:
    hashed = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            hashed.update(chunk)
            size += len(chunk)
    return hashed.hexdigest(), size


def checked_existing(path: Path, expected: str, expected_size: int | None) -> bool:
    if not path.exists():
        return False
    actual, size = digest(path)
    if actual != expected or (expected_size is not None and size != expected_size):
        raise RuntimeError(f"refusing to overwrite different existing file: {path}")
    return True


def download(url: str, destination: Path, expected: str, expected_size: int | None) -> None:
    if checked_existing(destination, expected, expected_size):
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".part")
    if temporary.exists():
        raise RuntimeError(f"refusing to overwrite existing partial file: {temporary}")
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "dtr-s09-artifact-fetch/1"})
        with urllib.request.urlopen(request, timeout=60) as response, temporary.open("xb") as output:
            shutil.copyfileobj(response, output, 1024 * 1024)
        actual, size = digest(temporary)
        if actual != expected or (expected_size is not None and size != expected_size):
            raise RuntimeError(f"download checksum/size mismatch for {url}")
        temporary.rename(destination)
    except BaseException:
        if temporary.exists():
            temporary.unlink()
        raise


def unpack_gzip(source: Path, destination: Path, executable: bool) -> dict[str, object]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".part")
    if temporary.exists():
        raise RuntimeError(f"refusing to overwrite existing partial file: {temporary}")
    try:
        with gzip.open(source, "rb") as compressed, temporary.open("xb") as output:
            shutil.copyfileobj(compressed, output, 1024 * 1024)
        payload_hash, payload_size = digest(temporary)
        if destination.exists():
            current_hash, current_size = digest(destination)
            if (current_hash, current_size) != (payload_hash, payload_size):
                raise RuntimeError(f"refusing to overwrite different existing file: {destination}")
            temporary.unlink()
        else:
            temporary.rename(destination)
        if executable:
            destination.chmod(destination.stat().st_mode | stat.S_IXUSR)
        return {"path": str(destination), "sha256": payload_hash, "size": payload_size}
    except BaseException:
        if temporary.exists():
            temporary.unlink()
        raise


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--record", type=Path)
    args = parser.parse_args()
    config = json.loads(MANIFEST.read_text())
    args.destination.mkdir(parents=True, exist_ok=True)
    rows = []
    for artifact in config["artifacts"]:
        archive = args.destination / "downloads" / Path(artifact["url"]).name
        download(artifact["url"], archive, artifact["sha256"], artifact.get("size"))
        archive_hash, archive_size = digest(archive)
        row = {
            "name": artifact["name"], "url": artifact["url"],
            "download": {"path": str(archive), "sha256": archive_hash, "size": archive_size},
        }
        if "gzip_output" in artifact:
            row["payload"] = unpack_gzip(
                archive, args.destination / artifact["gzip_output"], artifact.get("executable", False)
            )
        rows.append(row)
        print(f"VERIFIED {artifact['name']} {archive_hash}")
    result = {
        "schema_version": 1,
        "pocketic_version": config["pocketic_version"],
        "ic_revision": config["ic_revision"],
        "artifacts": rows,
    }
    record = args.record or args.destination / "verified-artifacts.json"
    record.parent.mkdir(parents=True, exist_ok=True)
    if record.exists() and json.loads(record.read_text()) != result:
        raise RuntimeError(f"refusing to overwrite different evidence record: {record}")
    record.write_text(json.dumps(result, indent=2) + "\n")
    print(f"PASS artifact record {record}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
