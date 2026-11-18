#!/usr/bin/env bash
set -euo pipefail
dest="$1"
mkdir -p "$dest"
export DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity
backend=s5ir5-gqaaa-aaaas-amyna-cai
for method in controller_runtime controller_funding controller_work lab_status retention_status source_descriptor
do
    dfx canister call "$backend" "$method" '()' --network ic --query --output json > "$dest/$method.json" &
done
failed=0
for pid in $(jobs -p); do wait "$pid" || failed=1; done
exit "$failed"
