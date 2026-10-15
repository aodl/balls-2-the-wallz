# S14 controlled deployment — user executed

No mainnet command below has been executed by Codex. Use the operator's reviewed identity and controllers; never export keys, switch identity automatically, reinstall a funded canister, remove controllers or use `--yes` to bypass review. Confirm there is no existing funded deployment requiring migration before creating a fresh backend. Root schema 7 does not import the old disposable scanner schema. The build does not implement refunds or automatic payouts. Keep public paid/prize participation closed pending an explicit launch decision and settlement work.

## Publish dependencies first

Review both local branches. The tested local DTR changes are commits `5e2af85` (ordered admission) and `7df2a45` (network client); JavaScript pack version 0.12.0. No npm registry publication is required: BTZ vendors an inspected npm-pack artifact.

```sh
cd /home/codexdev/src/dtr
git status --short
git log -4 --oneline
# User only:
git push -u origin checkpoint/s14-sparse-input-mainnet-client
```

Then return the published immutable revision to Codex. The next authorized local continuation updates every BTZ Cargo pin and real lock, constructs/vendors the exact package, verifies integrity and consumer/application checks, and records remote-pinned validation. S14's temporary override is explicit; the checked-in old pin must not be mistaken for a consumer of the new API. Do not deploy the unpublished dependency staging state.

Only after that continuation and review:

```sh
cd /home/codexdev/src/btz
git status --short
git log -6 --oneline
git diff c75192cb2e4c33a04675b57abfd4d42121255bfd..HEAD --stat
# User only:
git push -u origin checkpoint/s14-lean-index-poke
```

Never force-push; inspect and reconcile remote divergence. New CI is NOT_RUN until the user pushes.

## Local reproduction

Use Python 3.11, Rust 1.94.1, Node >=22.16 and the inspected dependency package. Before dependency publication, the explicit development override is:

```sh
npm install --ignore-scripts --no-save --package-lock=false /home/codexdev/src/dtr/.work/s14/dtr-timeline-runtime-0.12.0.tgz
DFX_IDENTITY=codex_local python3.11 -B tools/s14_development.py \
  --dtr /home/codexdev/src/dtr --revision f42a22a9a33e0935295f9c40a7076becbc95d9cb -- \
  python3.11 -B tools/verify_s14_local.py \
  --index-wasm .work/s14/upstream/ic-icp-index-canister.wasm --output .work/s14/local
```

`tools/fetch_s09_artifacts.py` obtains checksum-pinned PocketIC/ICP ledger/index artifacts by HTTPS (no Git checkout). The upstream index compressed SHA-256 is `3015c0d83b832e6cb5685e98c0cef690c3b89661343965767bb11397cc9f7b3f`, IC source revision `d3b3351fa343a893aea2cfa8d39ac6b0d507b477`. Build binaries before starting the owned PocketIC server. The runner cleans only its owned server. Restore the published package with `npm ci --ignore-scripts` when ending development override use. Cargo overrides restore tracked locks even on command failure; do not run overlapping override sessions.

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
dfx canister call "$EH_PRINCIPAL" get_instance '()' --network ic --query
dfx canister call "$EH_PRINCIPAL" get_pricing '()' --network ic --query
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

The source timer continues independently while gameplay is paused. Preserve pending records and scores; a capacity error needs reviewed recovery, never cursor skipping. Verify fresh certified observation, monotonic source progress, no duplicate commands and unchanged accrued scores after upgrade. Operator funding, availability, index lag, real cycle burn, wallet memo compatibility and financial settlement remain user-operated verification/product gates.
