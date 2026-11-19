#!/usr/bin/env python3
"""Build the complete immutable B2Z site. No CLI identities, network, or deployment."""
import argparse
import gzip
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CRATE = ROOT / "canisters/frontend"
PRIVATE = {".ic-assets.json5", "build-manifest.json", "deployment.json"}
WEB_GZIP = {".html", ".css", ".mjs", ".md"}
TOTAL_LIMIT = 100 * 1024**2
CODE_LIMIT = 12 * 1024**2
AUDIO_SHA = "76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def reproducible_gzip(data):
    buf = BytesIO()
    with gzip.GzipFile(fileobj=buf, filename="", mode="wb", compresslevel=9, mtime=0) as stream:
        stream.write(data)
    return buf.getvalue()


def report(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def stage(args, out):
    src = args.observer.resolve()
    entries = json.loads(args.inventory.read_text())
    expected = {row["path"]: row for row in entries}
    if len(entries) != len(expected):
        raise ValueError("duplicate inventory path")
    if any(p.is_symlink() for p in src.rglob("*")):
        raise ValueError("symlink in asset directory")
    actual = {p.relative_to(src).as_posix() for p in src.rglob("*") if p.is_file()}
    if actual != set(expected):
        raise ValueError("candidate inventory does not describe the complete website")
    public = out / "compile/public"
    public.mkdir(parents=True)
    for name in ("Cargo.toml", "Cargo.lock", "frontend.did", "build.rs"):
        shutil.copyfile(CRATE / name, public.parent / name)
    shutil.copytree(CRATE / "src", public.parent / "src")

    policy = json.loads((src / ".ic-assets.json5").read_text())
    base = policy[0]
    if base["match"] != "**/*" or base["security_policy"] != "hardened":
        raise ValueError("the existing hardened policy is required")
    approved = {key.lower(): value for key, value in base["headers"].items()}
    assert set(approved) == {
        "content-security-policy", "referrer-policy", "x-content-type-options", "permissions-policy"
    }
    approved.update({
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-frame-options": "DENY",
        "x-xss-protection": "1; mode=block",
    })
    with (public.parent / "policy.rs").open("w") as policy_rs:
        policy_rs.write("const SECURITY_HEADERS: &[(&str, &str)] = &[\n")
        for key, value in sorted(approved.items()):
            assert key.isascii() and value.isascii()
            policy_rs.write(f"    ({json.dumps(key)}, {json.dumps(value)}),\n")
        policy_rs.write("];\n")
    rows = []
    for name in sorted(actual):
        if Path(name).suffix == ".gz":
            raise ValueError(f"unreviewed precompressed input: {name}")
        data = (src / name).read_bytes()
        row = expected[name]
        if (len(data), digest(data)) != (row["bytes"], row["sha256"]):
            raise ValueError(f"frozen bytes differ: {name}")
        if name in PRIVATE:
            continue
        target = public / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        variants = [{"encoding": "identity", "embedded_path": name, "bytes": len(data), "sha256": digest(data)}]
        if target.suffix in WEB_GZIP:
            gz = reproducible_gzip(data)
            if len(gz) < len(data):
                target.with_name(target.name + ".gz").write_bytes(gz)
                variants.append({"encoding": "gzip", "embedded_path": name+".gz", "bytes": len(gz), "sha256": digest(gz)})
        rows.append({"path": "/"+name, "variants": variants})
    audio = [r for r in rows if r["path"].startswith("/audio/b2z-v1/")]
    if len(audio) != 61 or any(len(r["variants"]) != 1 for r in audio):
        raise ValueError("the complete identity-only audio set is required")
    if next(r["variants"][0]["sha256"] for r in audio if r["path"].endswith("/manifest.json")) != AUDIO_SHA:
        raise ValueError("approved audio manifest differs")
    # Source proof is checked for the release, including each FLAC. The mutation
    # test deliberately changes staged inputs after this boundary.
    approved_audio = json.loads((ROOT / "evidence/B2Z/graphite-deflectors/connectivity-ui-polish/artifacts/frontend-inventory.json").read_text())
    expected_audio = {"/"+r["path"]: (r["bytes"],r["sha256"]) for r in approved_audio if r["path"].startswith("audio/")}
    assert expected_audio == {r["path"]:(r["variants"][0]["bytes"],r["variants"][0]["sha256"]) for r in audio}
    report(out / "embedded-inventory.json", rows)
    shutil.copyfile(args.inventory, out / "source-inventory.json")
    return len(rows), sum(r["variants"][0]["bytes"] for r in rows)


def inspect_wasm(path):
    data = path.read_bytes()
    assert data[:8] == b"\0asm\x01\0\0\0"
    pos = 8

    def uleb():
        nonlocal pos
        value = shift = 0
        while True:
            byte = data[pos]
            pos += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value
            shift += 7

    sections = []
    exports = []
    while pos < len(data):
        tag = data[pos]
        pos += 1
        size = uleb()
        end = pos + size
        assert end <= len(data)
        sections.append({"id": tag, "bytes": size})
        if tag == 7:
            for _ in range(uleb()):
                n = uleb()
                exports.append(data[pos:pos+n].decode())
                pos += n + 1
                uleb()
        pos = end
    assert {e for e in exports if e.startswith("canister_")} == {
        "canister_init", "canister_post_upgrade", "canister_query http_request"
    }
    assert len(data) <= TOTAL_LIMIT
    assert next(s["bytes"] for s in sections if s["id"] == 10) <= CODE_LIMIT
    custom = [s["bytes"] for s in sections if s["id"] == 0]
    assert len(custom) <= 16 and sum(custom) <= 1024**2
    return {"sha256": digest(data), "bytes": len(data), "sections": sections, "exports": exports}


def build(out):
    compile_dir = out / "compile"
    registry = Path(os.environ.get("CARGO_HOME", str(Path.home()/".cargo"))).resolve()
    rustflags = f"--remap-path-prefix={compile_dir}=/src/b2z/frontend --remap-path-prefix={registry}=/cargo"
    env = {**os.environ, "RUSTFLAGS": rustflags, "CARGO_TARGET_DIR": str(out / "target"),
           "SOURCE_DATE_EPOCH": "1700000000"}
    env.pop("CARGO_ENCODED_RUSTFLAGS", None)
    manifest = compile_dir / "Cargo.toml"
    command = ["cargo", "+1.94.1", "build", "--manifest-path", str(manifest), "--target",
               "wasm32-unknown-unknown", "--release", "--locked", "--offline"]
    subprocess.run(command, cwd=compile_dir, env=env, check=True)
    shutil.copyfile(out / "target/wasm32-unknown-unknown/release/b2z_embedded_frontend.wasm", out / "frontend.wasm")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--observer", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    count, assets_bytes = stage(args, out)
    build(out)
    wasm = out/"frontend.wasm"
    info = inspect_wasm(wasm)
    zipped = reproducible_gzip(wasm.read_bytes())
    (out/"frontend.wasm.gz").write_bytes(zipped)
    info.update({"compressed_bytes": len(zipped), "compressed_sha256": digest(zipped),
                 "release_install_bytes": "uncompressed frontend.wasm",
                 "public_assets": count, "identity_asset_bytes": assets_bytes,
                 "embedded_inventory_sha256": digest((out/"embedded-inventory.json").read_bytes()),
                 "source_inventory_sha256": digest(args.inventory.read_bytes()),
                 "cargo_lock_sha256": digest((CRATE/"Cargo.lock").read_bytes()),
                 "rustc": subprocess.check_output(["rustc","+1.94.1","--version"],text=True).strip()})
    report(out/"module.json", info)
    print(f"Embedded {count} public files. Raw Wasm SHA-256 {info['sha256']} ({info['bytes']} bytes).")


if __name__ == "__main__":
    main()
