# Linux development setup

This checkout requires Node 22.16 or later, Python 3.11 or later, and the repository-pinned Rust 1.94.1 toolchain. Setup is user-scoped; do not replace the system Python or change the global Rust default.

## Python

Use an existing Python 3.11+ interpreter when available. One reviewed user-scoped option is:

```sh
python3 -m pip install --user uv==0.9.7
"$HOME/.local/bin/uv" python install 3.11
```

Pass the resulting interpreter to project commands explicitly when `python3` is older:

```sh
PYTHON_BIN="$HOME/.local/bin/python3.11" tools/bootstrap_linux.sh
"$HOME/.local/bin/python3.11" -B tools/check.py source
```

Do not create a virtual environment inside the checkout. The checkpoint packager excludes common environment directories and secret-shaped files as defense in depth, but secrets still do not belong in the tree.

## Rust and dependency bootstrap

`tools/bootstrap_linux.sh` verifies Node and Python, installs Rust 1.94.1 plus rustfmt, Clippy and `wasm32-unknown-unknown` through rustup, and fetches the three committed lockfiles. It does not regenerate locks, install system packages, deploy canisters or change rustup's global default.

```sh
PYTHON_BIN="$HOME/.local/bin/python3.11" tools/bootstrap_linux.sh
```

Dependency resolution is a deliberate maintenance operation. If a manifest changes, review it and run `cargo generate-lockfile --manifest-path ...` once, inspect the diff, then rerun the bootstrap. Routine tests and CI use `--locked` and may use `--offline` after this fetch.

## Browser verification

Browser tests use the exact dependency in `tools/browser-requirements.txt` and its matching Playwright Chromium build. Install them in a user-scoped virtual environment outside the checkout. Do not install OS packages or alter browser policy without explicit approval.

```sh
python3.11 -m venv /path/outside/checkout/browser-venv
/path/outside/checkout/browser-venv/bin/pip install --require-hashes \
  -r tools/browser-requirements.txt
/path/outside/checkout/browser-venv/bin/python -m playwright install chromium
```

Run the complete HTTP gate with the virtual environment's interpreter:

```sh
/path/outside/checkout/browser-venv/bin/python -B \
  tools/verify_observer_http.py --output .work/browser-http
```

Playwright's bundled browser still needs host shared libraries. Install system packages only with explicit approval; a missing library is a BLOCKED environment result, not permission to use sudo automatically.

All local IC commands must use `DFX_IDENTITY=codex_local`. These setup steps do not deploy to any network.
