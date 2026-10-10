#!/bin/sh
# No installer, deployment, transfer, or silent dependency update.
set -eu
cd "$(dirname "$0")/.."
python3 -B tools/check.py all --output .work/ci
