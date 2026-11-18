"""Check every registered compressed representation and prepare its IC-v2 proof input."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.request

root = Path(sys.argv[1])
signed = json.loads((root / "signed-inventory.json").read_text())
original = {row["file"]: row for row in json.loads((root / "served.json").read_text())["files"]}
rows = []
compressed = root / "compressed"
bodies = compressed / "frontend"
bodies.mkdir(parents=True, exist_ok=False)
for item in signed["files"]:
    name = item["key"].lstrip("/")
    assert name in original
    encodings = {entry["encoding"]: entry for entry in item["encodings"]}
    assert len(encodings) == len(item["encodings"])
    assert set(encodings) <= {"identity", "gzip"} and "identity" in encodings
    if "gzip" not in encodings:
        continue
    assert not name.endswith(".flac") and name != "audio/b2z-v1/manifest.json"
    request = urllib.request.Request(
        f"https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/{name}?release-gzip={time.time_ns()}",
        headers={"Accept-Encoding": "gzip", "Cache-Control": "no-cache"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        assert response.status == 200
        body = response.read()
        headers = {key.lower(): val for key, val in response.headers.items()}
    sha256 = hashlib.sha256(body).hexdigest()
    assert headers["content-encoding"] == "gzip" and "version=2" in headers["ic-certificate"]
    assert sha256 == encodings["gzip"]["sha256"] and len(body) == int(encodings["gzip"]["length"])
    assert gzip.decompress(body) == (root / "frontend" / name).read_bytes()
    for key in ("content-type", "content-security-policy", "permissions-policy", "referrer-policy", "x-content-type-options", "cache-control"):
        assert headers.get(key) == original[name]["headers"].get(key), (name, key)
    destination = bodies / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(body)
    rows.append({"file": name, "sha256": sha256, "bytes": len(body), "headers": headers})
(compressed / "served.json").write_text(json.dumps({"files": rows}, indent=2) + "\n")
(compressed / "inventory.json").write_text(json.dumps([{k: row[k] for k in ("sha256", "bytes")} | {"path": row["file"]} for row in rows], indent=2) + "\n")
print(f"PASS {len(rows)} registered gzip representations and decompressed identities")
