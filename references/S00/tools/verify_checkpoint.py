#!/usr/bin/env python3
"""Verify checkpoint payload identity, not software correctness or publisher identity."""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path, PurePosixPath
import re
import sys
from typing import Dict, List

MANIFEST_NAME = "FILES.sha256"
_HASH = re.compile(r"^[0-9a-f]{64}$")


def read_manifest(path: Path) -> Dict[str, str]:
    """Parse a strict SHA-256 manifest with safe POSIX-relative file paths."""
    entries: Dict[str, str] = {}
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line or "  " not in line:
            raise ValueError(f"manifest line {number}: expected '<sha256>  <path>'")
        digest, name = line.split("  ", 1)
        pure = PurePosixPath(name)
        if not _HASH.fullmatch(digest):
            raise ValueError(f"manifest line {number}: invalid SHA-256")
        if (not name or pure.is_absolute() or "\\" in name or ":" in name
                or any(c in name for c in ("\x00", "\r", "\n"))
                or any(p in ("", ".", "..") for p in name.split("/"))):
            raise ValueError(f"manifest line {number}: unsafe path")
        if name == MANIFEST_NAME:
            raise ValueError("manifest must not include itself")
        if name in entries:
            raise ValueError(f"duplicate manifest entry: {name}")
        entries[name] = digest
    if not entries:
        raise ValueError("manifest is empty")
    return entries


def verify(root: Path) -> List[str]:
    """Return every detected integrity problem. An empty list means matched identity."""
    root = root.resolve()
    if not root.is_dir():
        return [f"checkpoint directory does not exist: {root}"]
    manifest = root / MANIFEST_NAME
    if manifest.is_symlink():
        return ["manifest cannot be a symlink"]
    try:
        entries = read_manifest(manifest)
    except (OSError, UnicodeError, ValueError) as error:
        return [f"cannot load manifest: {error}"]

    problems: List[str] = []
    actual = set()
    for path in root.rglob("*"):
        name = path.relative_to(root).as_posix()
        if path.is_symlink():
            problems.append(f"symlink not permitted: {name}")
            continue
        if path.is_file() and name != MANIFEST_NAME:
            actual.add(name)
    expected = set(entries)
    problems.extend(f"missing file: {name}" for name in sorted(expected - actual))
    problems.extend(f"unexpected file: {name}" for name in sorted(actual - expected))
    for name in sorted(expected & actual):
        path = root / name
        # Prevent traversing a symlinked parent even if glob behavior changes.
        if any(p.is_symlink() for p in (path, *path.parents) if p != root.parent):
            problems.append(f"symlink in path: {name}")
            continue
        try:
            with path.open("rb") as handle:
                digest = hashlib.file_digest(handle, "sha256").hexdigest()
            if digest != entries[name]:
                problems.append(f"checksum mismatch: {name}")
        except OSError as error:
            problems.append(f"cannot read {name}: {error}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path,
                        default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    problems = verify(args.root)
    if problems:
        for problem in problems:
            print(f"FAIL: {problem}", file=sys.stderr)
        return 1
    print("PASS: manifest coverage and SHA-256 checksums match every checkpoint payload file.")
    print("This verifies identity/integrity only, not authorship or software correctness.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
