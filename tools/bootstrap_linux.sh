#!/bin/sh
# User-scoped toolchain setup and one-time online fetch. No deployment or system package changes.
set -eu

cd "$(dirname "$0")/.."
python_bin=${PYTHON_BIN:-python3}
node_bin=${NODE_BIN:-node}

"$python_bin" -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ required"'
"$node_bin" -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22||(a===22&&b<16)) throw new Error("Node 22.16+ required")'
command -v rustup >/dev/null

rustup toolchain install 1.94.1 --profile minimal --component rustfmt --component clippy --target wasm32-unknown-unknown

for manifest in Cargo.toml native/Cargo.toml canisters/runtime-lab/Cargo.toml; do
  cargo +1.94.1 fetch --manifest-path "$manifest" --locked
done

printf 'Python: %s\n' "$("$python_bin" --version 2>&1)"
printf 'Node: %s\n' "$("$node_bin" --version)"
printf 'Rust: %s\n' "$(rustc +1.94.1 --version)"
printf 'Cargo: %s\n' "$(cargo +1.94.1 --version)"
