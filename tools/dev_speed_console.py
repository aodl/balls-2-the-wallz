#!/usr/bin/env python3
"""TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH."""
import argparse
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import secrets
import subprocess

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "tools" / "dev-speed-console"
FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/console.mjs": ("console.mjs", "text/javascript; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
}


@contextmanager
def operator_server(port, call):
    token = secrets.token_hex(32)

    class Handler(BaseHTTPRequestHandler):
        def reply(self, code, data, mime="application/json"):
            if not isinstance(data, bytes):
                data = json.dumps(data).encode()
            self.send_response(code)
            self.send_header("Content-Type", mime)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy",
                             "default-src 'none'; script-src 'self'; style-src 'self'; "
                             "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def valid_host(self):
            return self.headers.get("Host") == f"127.0.0.1:{self.server.server_port}"

        def allowed(self):
            return self.valid_host() and secrets.compare_digest(
                self.headers.get("X-B2Z-Operator", ""), token)

        def do_GET(self):
            if not self.valid_host():
                self.reply(403, {"error": "Use the local developer console origin"})
            elif self.path in FILES:
                name, mime = FILES[self.path]
                data = (ASSETS / name).read_bytes()
                if self.path == "/":
                    data = data.replace(b"__OPERATOR_TOKEN__", token.encode())
                self.reply(200, data, mime)
            elif self.path == "/status" and self.allowed():
                self.invoke(None)
            else:
                self.reply(404, {"error": "Unavailable"})

        def do_POST(self):
            origin = f"http://127.0.0.1:{self.server.server_port}"
            if (self.path != "/status" or not self.allowed() or
                    self.headers.get("Origin") != origin):
                self.reply(403, {"error": "Use the local developer console origin"})
                return
            length = self.headers.get("Content-Length", "")
            if len(length) > 3 or not length.isdecimal() or not 1 <= int(length) <= 128:
                self.reply(400, {"error": "Invalid request length"})
                return
            try:
                data = json.loads(self.rfile.read(int(length)))
                if not isinstance(data, dict) or set(data) != {"full_speed", "seconds"}:
                    raise ValueError("invalid fields")
                if type(data["full_speed"]) is not bool:
                    raise ValueError("invalid mode")
                seconds = data["seconds"]
                if data["full_speed"] and (type(seconds) is not int or not 1 <= seconds <= 300):
                    raise ValueError("invalid duration")
            except (ValueError, TypeError):
                self.reply(400, {"error": "Invalid development speed request"})
                return
            self.invoke(data)

        def invoke(self, request):
            try:
                self.reply(200, call(request))
            except RuntimeError as error:
                self.reply(409, {"error": str(error)})
            except (OSError, ValueError, subprocess.SubprocessError):
                self.reply(502, {"error": "Controller connection unavailable. Check the local dfx identity and development Wasm."})

    with ThreadingHTTPServer(("127.0.0.1", port), Handler) as server:
        yield server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--canister", required=True)
    parser.add_argument("--network", default="local")
    parser.add_argument("--port", type=int, default=18769)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]{5,64}", args.canister):
        parser.error("Use an explicit canister principal")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", args.network):
        parser.error("Use a configured network name")

    def call(request):
        verb = "set_dev_simulation_speed" if request else "dev_simulation_speed"
        argument = "()"
        if request:
            argument = (f"(true, opt {request['seconds']} : nat16)"
                        if request["full_speed"] else "(false, null)")
        result = subprocess.run(
            ["dfx", "canister", "call", args.canister, verb, argument,
             "--network", args.network, "--candid", str(ROOT / "interfaces" / "b2z-dev-speed.did"),
             "--output", "json"],
            capture_output=True, text=True, timeout=15, check=True,
        )
        data = json.loads(result.stdout)
        if isinstance(data, list) and len(data) == 1:
            data = data[0]
        if isinstance(data, dict) and "Ok" in data:
            return data["Ok"]
        if isinstance(data, dict) and isinstance(data.get("Err"), str):
            raise RuntimeError(data["Err"][:160])
        raise RuntimeError("Controller refused pace operation")

    with operator_server(args.port, call) as server:
        print(f"DEV ONLY console at http://127.0.0.1:{args.port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
