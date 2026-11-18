#!/usr/bin/env bash
set -euo pipefail
export DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity
method="$1"
arg="$2"
output="$3"
case "$method" in
  pause_autonomous|start_autonomous) mode=--update; format=status ;;
  prepare_combined_transition|prepare_deflector_transition|commit_combined_transition|commit_deflector_transition) mode=--update; format=blob ;;
  combined_transition_status|deflector_transition_status) mode=--query; format=blob ;;
  *) exit 2 ;;
esac
dfx canister call s5ir5-gqaaa-aaaas-amyna-cai "$method" "$arg" --network ic --candid canisters/runtime-lab/runtime-lab.did "$mode" --output json > "$output"
if test "$format" = blob; then jq -e '.Ok|implode|fromjson' "$output"; else jq -e '.Ok' "$output"; fi
