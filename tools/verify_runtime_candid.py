#!/usr/bin/env python3
"""Generate and semantically compare the current runtime-lab Candid service."""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "canisters/runtime-lab/Cargo.toml"
BEGIN = "DTR_RUNTIME_CANDID_BEGIN\n"
END = "\nDTR_RUNTIME_CANDID_END"


def extract(output: str) -> str:
    if output.count(BEGIN) != 1 or output.count(END) != 1:
        raise ValueError("generated Candid markers missing or ambiguous")
    return output.split(BEGIN, 1)[1].split(END, 1)[0].strip() + "\n"


def reject_test_exports(candid: str) -> None:
    prohibited = ("__canbench__", "__tracing__", "test_")
    found = [name for name in prohibited if name in candid]
    if found:
        raise ValueError("normal Candid contains test/benchmark exports: " + ", ".join(found))


def run(command: list[str], timeout: int = 600) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / ".work/runtime-lab.generated.did")
    args = parser.parse_args()
    generated = run([
        "cargo", "test", "--manifest-path", str(MANIFEST), "--locked", "--offline",
        "tests::print_generated_candid", "--", "--exact", "--nocapture",
    ])
    if generated.returncode:
        sys.stderr.write(generated.stdout + generated.stderr)
        return generated.returncode
    try:
        candid = extract(generated.stdout + generated.stderr)
        reject_test_exports(candid)
    except ValueError as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(candid)
    print(f"PASS runtime-lab generated Candid: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
