#!/bin/sh
# No installer, deployment, transfer, or silent dependency update.
set -eu
cd "$(dirname "$0")/.."
python_bin=${PYTHON_BIN:-python3}
"$python_bin" -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ required"'
"$python_bin" -B tools/check.py all --output .work/ci
