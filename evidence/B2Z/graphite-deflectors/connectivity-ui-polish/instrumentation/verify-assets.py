"""Verify and retain exact European frontend assets using read-only requests."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import time
import urllib.request

ORIGIN = "https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io"
INVENTORIES = {
    "connectivity": "557569b78dbf49052d3990bd68253cbb68c23e034d47f49565a65080b3a8301d",
    "premium": "3ea59d7c6d8df7a2f1aa7bb2ce27e7e48243e021dca4abcadaea1dd85cd3c909",
    "responsive": "137f32c93728602eafa269b031fa3325c675767211ab9e4388a079370e857cf3",
    "rollback": "e8a9303538dbb2cc5028b21cf5ae97caacdb9c438497a35a567e30a9071a0c67",
    "graphite": "0b14bcccf7f1ed76bcfd4039b6aabcfb1965c7e6b94e437e3cc46d7e165d7c3e",
}
MIME = {
    ".mjs": {"text/javascript", "application/javascript"},
    ".js": {"text/javascript", "application/javascript"},
    ".html": {"text/html"},
    ".css": {"text/css"},
    ".svg": {"image/svg+xml"},
    ".bin": {"application/octet-stream"},
    ".did": {"application/octet-stream", "text/plain"},
    ".md": {"text/markdown", "text/plain"},
    ".json": {"application/json"},
    ".flac": {"audio/flac"},
}


def digest(body):
    return hashlib.sha256(body).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release", choices=INVENTORIES)
    parser.add_argument("inventory", type=Path)
    parser.add_argument("frozen", type=Path)
    parser.add_argument("--served", type=Path)
    args = parser.parse_args()
    inventory_bytes = args.inventory.read_bytes()
    assert digest(inventory_bytes) == INVENTORIES[args.release]
    inventory = json.loads(inventory_bytes)
    names = {row["path"] for row in inventory}
    assert len(inventory) == len(names) == (80 if args.release == "rollback" else 81)
    assert {p.relative_to(args.frozen).as_posix() for p in args.frozen.rglob("*") if p.is_file()} == names
    for row in inventory:
        path = args.frozen / row["path"]
        assert not path.is_symlink() and path.resolve().is_relative_to(args.frozen.resolve())
        body = path.read_bytes()
        assert len(body) == row["bytes"] and digest(body) == row["sha256"], row["path"]
    print(f"PASS {len(names)} exact frozen files", flush=True)
    if args.served is None:
        return
    args.served.mkdir(parents=True, exist_ok=False)
    bodies = args.served / "frontend"
    policy = json.loads((args.frozen / ".ic-assets.json5").read_text())
    nonce = time.time_ns()

    def fetch(row):
        name = row["path"]
        url = f"{ORIGIN}/{name}?release-preflight={nonce}"
        request = urllib.request.Request(url, headers={"Accept-Encoding": "identity", "Cache-Control": "no-cache"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    assert response.status == 200
                    assert response.url.startswith(ORIGIN + "/")
                    body = response.read()
                    headers = {key.lower(): value for key, value in response.headers.items()}
                break
            except OSError:
                if attempt == 2:
                    raise
                time.sleep(2**attempt)
        assert digest(body) == row["sha256"] and len(body) == row["bytes"], name
        rule = policy[1] if name.endswith(".flac") else policy[2] if name == "audio/b2z-v1/manifest.json" else policy[0]
        for key, value in rule["headers"].items():
            assert headers.get(key.lower()) == value, (name, key, headers.get(key.lower()))
        assert headers.get("content-encoding", "identity") == "identity", name
        assert headers["content-type"].split(";", 1)[0] in MIME[Path(name).suffix], (name, headers["content-type"])
        assert "version=2" in headers["ic-certificate"], name
        output = bodies / name
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(body)
        return {"file": name, "sha256": row["sha256"], "bytes": len(body), "headers": headers}

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        rows = list(pool.map(fetch, [row for row in inventory if row["path"] != ".ic-assets.json5"]))
    (bodies / ".ic-assets.json5").write_bytes((args.frozen / ".ic-assets.json5").read_bytes())
    (args.served / "served.json").write_text(json.dumps({"files": rows}, indent=2) + "\n")
    print(f"PASS {len(rows)} public bodies and headers. Verify IC-v2 witnesses and signed inventory next.")


if __name__ == "__main__":
    main()
