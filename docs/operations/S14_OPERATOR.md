# S14 controlled deployment — user executed

No mainnet command below has been executed by Codex. Use the operator's reviewed identity and controllers; never export keys, switch identity automatically, reinstall a funded canister, remove controllers or use `--yes` to bypass review. Confirm there is no existing funded deployment requiring migration before creating a fresh backend. Root schema 7 does not import the old disposable scanner schema. The build does not implement refunds or automatic payouts. Keep public paid/prize participation closed pending an explicit launch decision and settlement work.

## Published dependencies and next push

The user published both staging branches. User-provided CI evidence: DTR workflow 38778487685 passed; initial BTZ workflow 38778318985 failed against the old committed dependency (`IngestOrdered` unavailable). That compiler failure is addressed by the published immutable pins; it does not validate later local corrections. DTR is now pinned to the published immutable commit `1f47c1a0a104875bd13475d561b8d5aa10770d99`, tree `467bd2e25b1cf356ecdced7d69e26514a764c045`; the inspected 0.12.0 package SHA-256 is `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`. Real Cargo/npm locks consume those identities. No npm registry publication or sibling-source override is needed. The original local-override evidence remains historical in the S14 report.

Review and push the BTZ dependency-completion commit after local verification:

```sh
cd /home/codexdev/src/btz
git status --short
git branch --show-current
git log -6 --oneline
git diff a33f22df8dd55762a89ebdedb3f4a6170b73fd5d..HEAD --stat
# User only:
git push origin checkpoint/s14-lean-index-poke
```

Never force-push; inspect and reconcile remote divergence. CI for the dependency-completion commit has not run locally and must be reviewed after the user pushes. No further DTR source change was made.

## Local reproduction

Use Python 3.11, Rust 1.94.1 and Node >=22.16:

```sh
npm ci --ignore-scripts
python3.11 -B tools/verify_dtr_consumers.py --output .work/s14/consumers
python3.11 -B tools/check.py source --output .work/s14/source
python3.11 -B tools/check.py native --output .work/s14/native
python3.11 -B tools/check.py wasm --output .work/s14/wasm
python3.11 -B tools/fetch_s09_artifacts.py --destination /home/codexdev/dtr-s09-artifacts --record .work/s14/artifacts.json
DFX_IDENTITY=codex_local python3.11 -B tools/verify_s14_local.py --output .work/s14/local
# If Playwright is installed in a separate environment, add:
# --browser-python /path/to/that/environment/bin/python
```

The consumer wrapper resolves the published Git dependency using ordinary Cargo resolution in a fresh Cargo home, verifies revision/tree, archives the resulting local Git object, reproduces the npm package and runs an isolated installed JavaScript consumer. It performs no explicit remote Git checkout/clone/fetch and no URL rewrite. `tools/fetch_s09_artifacts.py` obtains checksum-pinned PocketIC/ICP ledger/index artifacts by HTTPS (no Git checkout). The upstream index compressed SHA-256 is `3015c0d83b832e6cb5685e98c0cef690c3b89661343965767bb11397cc9f7b3f`, IC source revision `d3b3351fa343a893aea2cfa8d39ac6b0d507b477`. Build binaries before starting the owned PocketIC server; the runner cleans only its owned server. Development overrides are unnecessary for the published configuration.

## Fresh mainnet installation (after dependency and CI gates)

The official [system canisters](https://docs.internetcomputer.org/references/system-canisters/) and [ledger guide](https://docs.internetcomputer.org/guides/digital-assets/ledgers/) confirmed the ICP IDs on 2026-10-15. The [index DID](https://github.com/dfinity/ic/blob/d3b3351fa343a893aea2cfa8d39ac6b0d507b477/rs/ledger_suite/icp/index/index.did) is retained exactly. Operator-supplied values are the reviewed Event Horizon principal, operator/controller principal and funded cycle budget. No Event Horizon principal is inferred from a poke.

Set these in your shell (public principals/amounts only, no key material):

```sh
cd /home/codexdev/src/btz
OPERATOR_PRINCIPAL='YOUR_REVIEWED_CONTROLLER_PRINCIPAL'
EH_PRINCIPAL='YOUR_REVIEWED_ICP_EVENT_HORIZON_PRINCIPAL'
INITIAL_CYCLES='YOUR_OPERATOR_FUNDED_CYCLE_AMOUNT'

# User creates and funds the new backend. Verify selected identity yourself first.
dfx canister create btz --network ic --controller "$OPERATOR_PRINCIPAL" --with-cycles "$INITIAL_CYCLES"
BTZ_BACKEND=$(dfx canister id btz --network ic)
dfx canister status btz --network ic

cargo build --manifest-path canisters/runtime-lab/Cargo.toml --release --target wasm32-unknown-unknown --locked
sha256sum canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm
python3.11 -B tools/verify_runtime_candid.py --output .work/s14/generated.did
node tools/prepare_s14_init.mjs --event-horizon "$EH_PRINCIPAL" --subaccount 0 --output .work/s14/mainnet-init.did
# Review constructor, normal exports, module hash, controllers and sufficient cycles first.
dfx canister install btz --network ic --mode install --argument-file .work/s14/mainnet-init.did

dfx canister call btz lab_status --network ic --query
# Require binding_checked=true, expected ledger/index, correct numeric target/account, no source error.
dfx ledger account-id --of-principal "$BTZ_BACKEND" --subaccount 0000000000000000000000000000000000000000000000000000000000000000
# Compare with source status and the certified observer's source descriptor.
dfx canister call btz start_autonomous '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
```

`FromBeginning` deliberately processes all existing account history. Never change the initial position to the newest ID to hide an unexpected history. A fresh backend default subaccount is the intended configuration. Index readiness is asynchronous; failure to bind or reconcile is visible and must be resolved before any payment exercise. A cycles amount is an operator budget, not a guaranteed service lifetime; monitor balances, pending-range capacity and source/game errors.

Build the observer for the exact backend and use the supported dfx asset-canister installer:

```sh
node tools/build_observer_mainnet.mjs --canister "$BTZ_BACKEND" --output .work/s14/assets
dfx canister create observer --network ic --controller "$OPERATOR_PRINCIPAL" --with-cycles "$INITIAL_CYCLES"
dfx deploy observer --network ic
```

This is one backend and one static observer. The bundle pins `https://icp-api.io`, the intended backend and the SDK mainnet root. It rejects root replacements and ignores URL deployment substitutions. Retrieve the backend ID independently, verify the certified source identity/receiving descriptor and rules/configuration identities, and compare account derivation before preparing any real transfer. Deployment/DNS alone does not establish the intended backend identity.

## Event Horizon declaration

Consult the instance's [subscriber guide](https://github.com/aodl/Event_Horizon/blob/3e2493f526998daa2f8f7a2d4e5c08ff1e3120c5/docs/subscriber-guide.md). Verify the configured instance's `get_instance` observed ledger is ICP and review `get_pricing`; current account price is not a hardcoded funding amount. The public read-only methods are:

```sh
dfx canister call "$EH_PRINCIPAL" get_instance '()' --network ic --query --candid interfaces/event-horizon.instance.did
dfx canister call "$EH_PRINCIPAL" get_pricing '()' --network ic --query --candid interfaces/event-horizon.instance.did
node tools/prepare_s14_subscription.mjs --subscriber "$BTZ_BACKEND" --subaccount 0 --alias YOUR_REVIEWED_JUPITER_ALIAS
```

The exact account declaration is `<BTZ_BACKEND>.0`; the full routed memo is `<reviewed alias>.<BTZ_BACKEND>.0`, bounded to 32 bytes. Numeric subaccount 0 is all-zero 32 bytes, not the AccountIdentifier itself. Do not fund a global subscription. No minimum amount suffix is required; BTZ independently filters exact-target positive amounts. A broader third-party route cannot bypass this filter.

Subscription creation/funding uses the instance's existing Jupiter mechanism: the operator sends the currently required productive endowment to the reviewed Faucet NNS neuron staking account with the complete routed memo. Obtain the actual staking destination and alias from that instance's reviewed configuration. This runbook does not invent a funding destination or execute a transfer. Admission is not immediate: reviewed Faucet stake recognition is seven days and payout/evidence processing can add delay. Polling works before admission and throughout outages. Verify eventual target-aware pokes and maintain operator-funded backend cycles separately.

## Controlled verification, pause and upgrade

After account/index binding, source freshness, observer certification and controllers are confirmed, the user may decide on a small real-money exercise. Check the existing retained-payment/no-refund rules, exact memo preservation, unique funding account and absence of automatic payouts first. Send only through the user's own wallet; the observer never connects/signs/sends. Verify one accepted/rejected public command outcome, send a second authorized test without a poke, and observe fallback. Unrelated/global/neuron pokes should not add reconciliation. No public paid/prize launch is implicit.

```sh
# User only; ordinary pause does not erase source progress or scores.
dfx canister call btz pause_autonomous '()' --network ic
# Record current source cursor, pending records, committed segment, scores, module hash and controllers.
# Build/review the supported replacement; never use reinstall.
dfx canister install btz --network ic --mode upgrade --argument '()'
dfx canister call btz lab_status --network ic --query
dfx canister call btz start_autonomous '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
```

The source timer continues independently while gameplay is paused. Preserve pending records and scores; bounded oldest windows re-read newer history until it drains; inbox/storage backpressure needs retirement or reviewed recovery, never cursor skipping. Verify fresh certified observation, monotonic source progress, no duplicate commands and unchanged accrued scores after upgrade. Operator funding, availability, index lag, real cycle burn, wallet memo compatibility and financial settlement remain user-operated verification/product gates.

## Short mainnet readiness checklist

- [ ] Review new BTZ CI for the exact local completion commit; DTR pin `1f47c1a` and package 0.12.0 must match real locks/integrity.
- [ ] Rebuild normal Wasm; check module hash, generated Candid and absence of test/fault exports.
- [ ] Review installed callback-trap recovery, stale-response fencing and 256/257/larger-backlog evidence. Re-reading large history amplifies calls; no production capacity promise follows.
- [ ] Review the actual built observer assets and CSP. Local acceptance serves that bundle against the live disposable backend, verifies account/config identities and reconnect/upgrade. Asset-canister hosting/certification still requires user-operated verification.
- [ ] Confirm intended backend, receiving account/subaccount, official index/ledger binding and reviewed Event Horizon sender/subscription target.
- [ ] Confirm fresh-deployment scope, controllers, sufficient operator-funded cycles and supported pause/upgrade procedures; never reinstall a funded canister.
- [ ] Verify retained-payment/no-refund disclosures and preserved area-time scores. Automatic payouts remain unavailable; public paid/prize participation remains a separate gated decision.
