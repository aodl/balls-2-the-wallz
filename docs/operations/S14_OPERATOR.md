# Controlled mainnet MVP — operator runbook

This is the single deployment procedure for `checkpoint/s14-lean-index-poke`. **Every mainnet command and payment below is user executed.** Codex has executed none of them. Use Bash, dfx **0.31.0**, Rust **1.94.1**, Node >=22.16 and Python 3.11. Commands/flags were checked against the installed dfx help; the actual asset-canister route is rehearsed locally in [deployment evidence](../../evidence/S14/mvp-preparation.json). Review CI for the exact candidate before spending funds; new CI is pending user confirmation.

This is an experimental, publicly reachable game for a controlled personal exercise. No login or wallet connection is needed. **Join costs 10 ICP. Payments are retained, including rejected/underfunded commands and overpayments. Refunds and automatic payouts are unavailable.** Accrued area-time scores remain; this is not a prize-bearing launch. A public account remains payable even while gameplay is paused or its URL is unadvertised.

## Launch configuration and funding

`tools/prepare_mvp_release.py` freezes the normal backend, constructor, empty world and readable `launch.json`. It does not deploy or spend. The fixed profile uses:

| Setting | Value |
|---|---|
| Network / backend / observer | `ic` / `btz` / `observer` |
| ICP ledger | `ryjl3-tyaaa-aaaaa-aaaba-cai` |
| ICP index | `qhbym-qaaaa-aaaaa-aaafq-cai` |
| Receiving account | backend principal + numeric subaccount **0**, using ICP AccountIdentifier derivation |
| Numeric subaccount bytes | 32 zero bytes (`24 zeros || u64 big endian`) |
| Index trust | configured official index supplies account-history contents/completeness |
| Event Horizon | reviewed sender supplied before installation, or **disabled** |
| Fallback / lag retries | independent **60 s** / bounded **2 s and 10 s** |
| Starting world | **16×8**, empty: zero cannons/balls |
| Limits | 32 cannons, 64 balls total, 32 balls per cannon |
| Autonomous run | 2 logical ticks/segment, Step(512), 1 s callback pacing |
| Publication retention | 3 publications, at most 8 MiB |
| Join | **1,000,000,000 e8s = 10 ICP**, includes first cannon/ball |
| Additional ball | **10,000,000 × n² e8s**, n = your active ball count when applied |
| Relocation | **10,000 e8s = 0.0001 ICP** |

Wallet fees are additional. The first extra ball with one active ball is 0.1 ICP; with two it is 0.4 ICP. Capacity, eligibility and price are evaluated on the authoritative state at application time. Do not stack purchases without checking their outcomes.

Keep three funding flows separate:

1. **Operator cycles** fund backend/observer execution and storage. Choose separate budgets; no lifetime is promised. These commands use the selected identity's funded cycles-ledger balance (`--no-wallet`), not gameplay ICP.
2. **Gameplay ICP** goes to the backend's receiving AccountIdentifier and becomes a command. It does **not** replenish canister cycles; no automatic ICP-to-cycles conversion exists.
3. **Event Horizon subscription endowment** follows that service's reviewed Jupiter route, separately. It is optional for first play; fallback works without it.

Official IDs were rechecked on 2026-10-15 against [IC system canisters](https://docs.internetcomputer.org/references/system-canisters/). Price/rule values come from this checkout's kernel and are authenticated by the observer's configuration hash.

## A. Local preflight and frozen artifacts

Supply only these public operational choices. Do not supply private keys, identity exports or seed phrases. This example creates one controller, which must be your selected identity's principal. Additional controllers require your separate explicit review; no controller is removed by this procedure.

```bash
cd /home/codexdev/src/btz
set -euo pipefail
BTZ_IDENTITY='YOUR_EXISTING_DEPLOYMENT_IDENTITY_NAME'
BTZ_CONTROLLER='YOUR_REVIEWED_CONTROLLER_PRINCIPAL'
BTZ_BACKEND_CYCLES='YOUR_BACKEND_CYCLES_BUDGET_AS_INTEGER'
BTZ_OBSERVER_CYCLES='YOUR_OBSERVER_CYCLES_BUDGET_AS_INTEGER'
BTZ_EH_PRINCIPAL='' # disabled unless you supply the reviewed ICP Event Horizon principal
BTZ_RELEASE='.work/s14/user-release' # choose a NEW directory on subsequent builds

git status --short
git branch --show-current
git rev-parse HEAD
# Require the reviewed S14 branch and a clean worktree.
test -z "$(git status --porcelain)"
dfx --version
dfx identity whoami
# Explicitly inspect the chosen identity; this does not switch the active identity.
CHOSEN_PRINCIPAL=$(dfx --identity "$BTZ_IDENTITY" identity get-principal)
test "$CHOSEN_PRINCIPAL" = "$BTZ_CONTROLLER"

# Refuse unexpected existing mainnet aliases. Never delete these records to bypass this check.
python3.11 - <<'PY'
import json
from pathlib import Path
for path in [Path('canister_ids.json'), Path('.dfx/ic/canister_ids.json')]:
    if path.exists():
        value=json.loads(path.read_text())
        for name in ['btz','observer']:
            if value.get(name,{}).get('ic'):
                raise SystemExit(f'STOP: existing {name} at {path}: {value[name]["ic"]}; inspect/reconcile, do not recreate or reinstall')
print('No existing mainnet deployment aliases found')
PY

npm ci --ignore-scripts
RELEASE_ARGS=(--output "$BTZ_RELEASE")
if [ -n "$BTZ_EH_PRINCIPAL" ]; then RELEASE_ARGS+=(--event-horizon "$BTZ_EH_PRINCIPAL"); fi
python3.11 -B tools/prepare_mvp_release.py "${RELEASE_ARGS[@]}"
cat "$BTZ_RELEASE/launch.json"
cat "$BTZ_RELEASE/manifest.json"
sha256sum "$BTZ_RELEASE/normal.wasm" "$BTZ_RELEASE/generated.did"
```

The manifest records the source commit/tree, actual DTR pins/locks/package, tools, normal exports and file hashes. DTR is already published at `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client **0.12.0**, package SHA-256 `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`. No DTR publication, sibling override or floating dependency is needed. Normal exports exclude synthetic inputs, test traps, manual steps and old scanner methods. Install the frozen `normal.wasm` with `--wasm`; later test builds cannot substitute their output.

Stop on any failed preflight. Existing IDs or installed code require inspection, not `reinstall`. The constructor processes account history **from the beginning**. It never skips prior payments. Root schema 7 is for a fresh index application, not migration from old disposable scanner schemas.

## B. User creates/funds the backend

Review the chosen cycles budget and existing funded cycles-ledger balance before this expenditure. Conversion/funding of that balance is a separate user action; this procedure never converts ICP automatically.

```bash
dfx --identity "$BTZ_IDENTITY" cycles balance --network ic
dfx --identity "$BTZ_IDENTITY" canister create btz --network ic --no-wallet \
  --controller "$BTZ_CONTROLLER" --with-cycles "$BTZ_BACKEND_CYCLES"
BTZ_BACKEND=$(dfx --identity "$BTZ_IDENTITY" canister id btz --network ic)
printf '%s\n' "$BTZ_BACKEND" > "$BTZ_RELEASE/backend-id.txt"
dfx --identity "$BTZ_IDENTITY" canister status btz --network ic
```

Read back the **actual** backend ID, controller and balance. Require an empty module (`Module hash: None`) before phase C. If creation times out, inspect its result/ID records before retrying; do not create another canister blindly.

## C. User installs the backend and checks readiness

```bash
dfx --identity "$BTZ_IDENTITY" canister install btz --network ic --mode install \
  --wasm "$BTZ_RELEASE/normal.wasm" --argument-file "$BTZ_RELEASE/init.did"
dfx --identity "$BTZ_IDENTITY" canister info btz --network ic
dfx --identity "$BTZ_IDENTITY" canister status btz --network ic
dfx --identity "$BTZ_IDENTITY" canister call btz lab_status '()' --network ic --query

BTZ_ACCOUNT=$(dfx --identity "$BTZ_IDENTITY" ledger account-id --of-principal "$BTZ_BACKEND" \
  --subaccount 0000000000000000000000000000000000000000000000000000000000000000)
printf '%s\n' "$BTZ_ACCOUNT" > "$BTZ_RELEASE/receiving-account.txt"
```

Compare the installed module hash with the manifest's `normal.wasm` SHA-256 and controllers with your choices. Poll `lab_status` until `source.binding_checked=true`, official ledger/index, `network="ic"`, subaccount 0 and no source error. Compare its recipient bytes with the independently derived account above and, in phase D, the certified receiving descriptor. Empty history is valid. Gameplay is initially paused; initialization starts index reconciliation independently. Do not send gameplay payments before readiness and certified identity checks pass.

## D. User builds/deploys the real observer

Keep the same clean checkout as the backend manifest. The ACTUAL backend ID, not a sample ID, is embedded in the bundle. No URL parameter can replace it, its endpoint or root.

```bash
node tools/build_observer_mainnet.mjs --canister "$BTZ_BACKEND" --output .work/s14/assets
cat .work/s14/assets/build-manifest.json
cp .work/s14/assets/build-manifest.json "$BTZ_RELEASE/observer-build-manifest.json"
# Require local_test_only=false, source_dirty=false, intended backend and network ic.
# Require no test adapter/root and the single endpoint https://icp-api.io.
dfx --identity "$BTZ_IDENTITY" canister create observer --network ic --no-wallet \
  --controller "$BTZ_CONTROLLER" --with-cycles "$BTZ_OBSERVER_CYCLES"
dfx --identity "$BTZ_IDENTITY" deploy observer --network ic --mode install --no-wallet
BTZ_OBSERVER=$(dfx --identity "$BTZ_IDENTITY" canister id observer --network ic)
dfx --identity "$BTZ_IDENTITY" canister status observer --network ic
dfx --identity "$BTZ_IDENTITY" canister url observer --network ic
BTZ_OBSERVER_URL="https://${BTZ_OBSERVER}.icp0.io/"
printf '%s\n' "$BTZ_OBSERVER_URL" > "$BTZ_RELEASE/observer-url.txt"
```

Open the certified **non-raw** URL. Do not use `raw.icp0.io` or bypass a certificate error. Confirm the tool-reported URL corresponds to this canister. Verify the app shows the intended backend, the exact `$BTZ_ACCOUNT`, SDK mainnet certification, configuration/rules identities and the prices above. Module imports, MIME types, CSP and configuration files must load without browser errors. The production bundle never fetches/trusts a replacement root. The explicit disposable local-test root is compiled only into local acceptance assets; never deploy those to mainnet.

## E. User starts autonomous play once

```bash
dfx --identity "$BTZ_IDENTITY" canister call btz start_autonomous \
  '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
dfx --identity "$BTZ_IDENTITY" canister call btz lab_status '()' --network ic --query
dfx --identity "$BTZ_IDENTITY" canister call btz retention_status '()' --network ic --query
```

Repeat the status query after a short wait; require multiple completed segments, no run/source error and a fresh observer publication. Close the browser, wait, query again and reopen: advancement must continue independently. Two logical ticks, callback pacing and actual publication spacing are distinct; a segment need not finish every second.

## F. Play card — user wallet only

Record these actual deployment values before sending:

```bash
printf 'Observer: %s\nBackend: %s\nReceiving AccountIdentifier: %s\nNumeric subaccount: 0\n' \
  "$BTZ_OBSERVER_URL" "$BTZ_BACKEND" "$BTZ_ACCOUNT" | tee "$BTZ_RELEASE/play-card.txt"
node tools/command.mjs memo angle 0
node tools/command.mjs memo angle 16384
# Replace 1 with a cell currently owned by YOUR cannon in the certified reference.
node tools/command.mjs memo move 1
```

| Command example | Legacy numeric memo (exact decimal string) | Equivalent eight bytes (hex) |
|---|---|---|
| ANGLE 0, initially right (+x) | `4779544133607882752` | `42545a1100000000` |
| ANGLE 16384, initially down (+y) | `4779544133607899136` | `42545a1100004000` |
| MOVE cell 1 **only if owned** | `4779544137902850049` | `42545a1200000001` |

Use the **decimal integer** in a wallet's legacy numeric-memo field, preserving every digit. Never round through a JavaScript Number. Do not send ASCII bytes of that decimal string, or paste a hex string into a decimal field. For an explicit eight-byte ICRC memo, use precisely the hex bytes; legacy numeric memo must be zero when a blob is present. The codec's angle range is 0–65535 (one turn); 32768 points left, 49152 up. Actual directions use the existing fixed integer approximation.

A concrete solo exercise, at the unchanged prices with one active ball before purchase, costs **10.1001 ICP plus three wallet fees**: join 10, first additional ball 0.1, relocation 0.0001. An optional opponent's distinct funding account adds **10 ICP plus its wallet fee**: **20.1001 ICP plus four fees** in total. Review those expenditures yourself; these are not tiny test amounts. No prices were reduced for the MVP.

1. Open the observer with no login. Require **Gameplay running**, no source errors and fresh certification. Compare receiving account/backend independently.
2. In your existing wallet, send **10 ICP** to `$BTZ_ACCOUNT` with ANGLE 0's exact numeric memo. The wallet fee is separate; the recipient must receive the full command amount. Record the ledger transaction ID.
3. Wait for the **Recent certified command outcomes** table to show that ID exactly once as `ACCEPTED / cannon_spawned`. See your funding AccountIdentifier in the cannon table, starting territory and first moving ball. Reload: the authoritative cannon persists. Older receipts can disappear after reconnect/retention gaps; absence is unresolved, not rejection or loss.
4. Read your **current certified** ball count and **Next ball** price in the cannon table. With one active ball it is 10,000,000 e8s = **0.1 ICP**. Send that exact current price with ANGLE 16384; do not deliberately underpay to probe. Wait for `ball_spawned` and two balls. A transfer without a poke must still be discovered by fallback.
5. Pick a cell from **Owned MOVE cell IDs** for your cannon, preferably different from its anchor. Encode that ID offline with `npm run memo -- move CELL_ID`; send **0.0001 ICP** with its exact memo. Wait for `ACCEPTED / cannon_moved`. IDs are row × 16 + column, zero-based from the upper left; the cell must still be yours when applied. Only one move per cannon per segment is allowed.
6. Optionally repeat the join from a second distinct funding AccountIdentifier for territorial competition. A shared-sender custodial wallet may map several people to one cannon; this is account identity, not one human per player. Some wallets cannot preserve the required memo or expose their funding account: do not use them for this exercise.

The read-only reference uses the latest verified snapshot, which may be ahead of animation playback. Another payment/collision can change price, eligibility or territory before execution. Wait for each outcome before another purchase. There is no guaranteed payment-to-publication deadline: index lag + up to another **60 seconds** fallback + calls/retries + segment completion. If unhealthy/paused, stop purchases and inspect status. Do not resend an unresolved payment merely because an initial index poll is empty.

## Event Horizon — optional acceleration after first play

Use the configured ICP instance's pinned [subscriber guide](https://github.com/aodl/Event_Horizon/blob/3e2493f526998daa2f8f7a2d4e5c08ff1e3120c5/docs/subscriber-guide.md). Never infer its principal from a poke. If configured before installation, subscription admission can happen later; the backend already accepts only that caller's exact subaccount-0 positive matches. Empty/global, other accounts and neuron targets do no index work. Poke values never prove payment.

```bash
# Only if BTZ_EH_PRINCIPAL is the reviewed sender installed in the constructor:
dfx --identity "$BTZ_IDENTITY" canister call "$BTZ_EH_PRINCIPAL" get_instance '()' \
  --network ic --query --candid interfaces/event-horizon.instance.did
dfx --identity "$BTZ_IDENTITY" canister call "$BTZ_EH_PRINCIPAL" get_pricing '()' \
  --network ic --query --candid interfaces/event-horizon.instance.did
node tools/prepare_s14_subscription.mjs --subscriber "$BTZ_BACKEND" --subaccount 0 \
  --alias YOUR_REVIEWED_JUPITER_ALIAS
```

Review instance ICP ledger, current pricing, Jupiter alias and Faucet staking destination. The account declaration is **`<BTZ_BACKEND>.0`**, full routed memo **`<reviewed alias>.<BTZ_BACKEND>.0`**, at most 32 bytes. Never request a global subscription. User alone funds the documented route; no destination/amount is invented here. Admission may take stake-recognition/evidence time (the reviewed guide describes seven-day recognition). First play does not wait for it.

If no sender is known, leave pokes disabled and use fallback. **Source configuration is immutable in the current application; there is no existing setter.** Enabling/changing a disabled sender later needs a separately reviewed state-preserving configuration upgrade. A routine same-version upgrade preserves the original configuration and cannot enable it; never reinstall a funded backend to change it.

## Minimal operations and supported upgrades

```bash
# Public source/run progress; controller-only inbox/phase; funding and retention:
dfx --identity "$BTZ_IDENTITY" canister call btz lab_status '()' --network ic --query
dfx --identity "$BTZ_IDENTITY" canister call btz controller_work '()' --network ic --query
dfx --identity "$BTZ_IDENTITY" canister call btz retention_status '()' --network ic --query
dfx --identity "$BTZ_IDENTITY" canister status btz --network ic
dfx --identity "$BTZ_IDENTITY" canister status observer --network ic

# Gameplay pause. This does NOT stop source reconciliation or prevent transfers.
dfx --identity "$BTZ_IDENTITY" canister call btz pause_autonomous '()' --network ic
# Resume with the SAME reviewed run settings:
dfx --identity "$BTZ_IDENTITY" canister call btz start_autonomous \
  '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
```

`source.last_error` / `run.last_error` require investigation; source cursor, pending rows and controller inbox distinguish download/admission from publication. A full inbox waits for publication retirement. Callback traps can recover after the 45-second lease through ordinary fallback. Bounded oldest-first history staging survives interruption, but large backlogs re-read newer pages and can be expensive; no arbitrary-load claim is made. Monitor cycles balances explicitly; actual mainnet consumption is not yet measured.

For a reviewed supported upgrade, first pause and record source cursor/pending inputs, committed segment, certified world/scores, module and controllers. Build/freeze the replacement from a clean checkout into a **new** release directory. For a same-version recovery exercise, use the existing frozen module:

```bash
dfx --identity "$BTZ_IDENTITY" canister call btz pause_autonomous '()' --network ic
dfx --identity "$BTZ_IDENTITY" canister install btz --network ic --mode upgrade \
  --wasm "$BTZ_RELEASE/normal.wasm" --argument '()' --upgrade-unchanged
dfx --identity "$BTZ_IDENTITY" canister info btz --network ic
dfx --identity "$BTZ_IDENTITY" canister call btz lab_status '()' --network ic --query
dfx --identity "$BTZ_IDENTITY" canister call btz controller_work '()' --network ic --query
dfx --identity "$BTZ_IDENTITY" canister call btz start_autonomous \
  '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
```

Verify fresh certificates/publications, preserved accrued scores, source progress without duplicates and resumed autonomous segments. Never use reinstall, uninstall-code, skip-pre-upgrade or a reset as recovery. Observer playback pause is separate from backend pause. Keep controller keys in the existing identity tooling; never export them for BTZ.

## Local reproduction and final gates

The backend/game/source are unchanged from the S14 closeout. Existing installed trap, stale-response, 256/257/513/1,025-history recovery and independent native replay remain applicable. This preparation adds actual dfx assets hosting and the public play reference; [evidence](../../evidence/S14/mvp-preparation.json) distinguishes rerun and reused checks.

```bash
npm ci --ignore-scripts
python3.11 -B tools/check.py source --output .work/s14/mvp-source
python3.11 -B tools/check.py native --output .work/s14/mvp-native
python3.11 -B tools/check.py wasm --output .work/s14/mvp-wasm
DFX_IDENTITY=codex_local python3.11 -B tools/verify_s14_local.py \
  --output .work/s14/mvp-assets --test-filter deployed_bundle --asset-canister \
  --index-wasm .work/s14/upstream/ic-icp-index-canister.wasm \
  --browser-python /home/codexdev/dtr-s08-playwright/bin/python
```

The index path is the existing checksum-bound local artifact; alternatively prepare the checksum-pinned artifact cache with `tools/fetch_s09_artifacts.py` (HTTPS downloads, no Git checkout). On this host the browser also needs the user-local library/TMPDIR settings in the evidence reproduction command. The owned PocketIC server is compiled before startup and cleaned up by its owner; no shared dfx network is reset. No global-scanner benchmark or historical remote-cloning upgrade path is required.

- **Implemented and locally verified:** pinned consumers; normal module/interface; index/poke/backlog/trap recovery; deterministic gameplay/replay; certified live observer; dfx asset serving; read-only price/cell/outcome reference; reconnect/upgrade.
- **Ready for user-operated mainnet verification:** review exact-commit CI, choose public identity/controller/cycles budgets and optional EH principal, create/install/fund both canisters, verify hosted certification/account, start, send wallet payments and confirm fallback.
- **Before public paid/prize launch:** actual mainnet operational observations, wallet compatibility, explicit public-money decision and unfinished payout/settlement/refund policy. No automatic distributions may be advertised.
- **Deferred/removed:** global ledger scanning, old hint/manual ingress, wallet/login/sending frontend, adaptive polling, capacity campaigns and payout implementation.

User-only remote step, after reviewing the final local HEAD and any remote divergence:

```bash
git status --short
git branch --show-current
git log -6 --oneline
git diff 2ce72c5cac736df7fbb40b2312d2c5c72e3f13d4..HEAD --stat
git push origin checkpoint/s14-lean-index-poke
```

No DTR push is required. Do not force-push. No mainnet check or new remote CI is represented as locally executed.
