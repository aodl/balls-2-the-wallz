# Current B2Z upgrade procedure

**Completed, 2026-10-20:** backend `187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1` and prefix-free B2Z observer assets are deployed on the same two principals. Exact installed-S15 local recovery and public mainnet verification pass. [Release report](../../checkpoints/B2Z_IDENTITY_AND_MEMOS.md) / [evidence](../../evidence/B2Z/release.json). No reset or funds transfer occurred.

The current task authorizes a tested in-place upgrade on backend `s34gv-3qaaa-aaaar-qcifa-cai` and an asset update on frontend `s45ab-wiaaa-aaaar-qcifq-cai`, using `codex_local`. Verify `dfx --identity codex_local canister id b2z --network ic` and the observer alias resolve exactly to those principals. Never create another canister to repair an alias. Record modules/controllers/cycles, certified state/scores/source identity/cursor and pending work; prove recovery from the installed S15 module locally; freeze normal Wasm and assets; upgrade backend first, then observer. Use the reviewed DFX 0.31.0 asset-only upload with `NPM_CONFIG_IF_PRESENT=true`. Verify preserved publication bytes while paused, then resume the existing run configuration and validate genuine mainnet certificates and autonomous progress. No reinstall, reset, funding, controller, Event Horizon, price or physics changes are part of this release.

Canonical wallet commands are prefix-free: `ANGLE 37.5`, `ANGLE 225`, `MOVE 83`. The [adapter v3 grammar](../specs/B2Z_TEXT_MEMOS.md) retains published legacy formats. New frontend assets must follow backend acceptance of the new syntax. The alias mapping changes no on-chain principal, subaccount or receiving AccountIdentifier.

The following S14/S15 initial provisioning and transition instructions are historical reference. Their create/install/reset phases are not instructions for this existing deployment. New current operations use the additive upgrade procedure above.

---

# Controlled mainnet MVP — operator runbook

**S15 deployed, 2026-10-20:** normal module `c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4` and the readable-memo observer are live on the same two principals. The upgrade preserved the publication/state/events/scores and source/configuration identity in place. The user resolved the initial cycle shortage. [S15 report](../../checkpoints/S15_TEXT_MEMO_AIMING.md) / [evidence](../../evidence/S15/release.json) record exact provenance and public certificate/copy/aim checks. No real text-memo gameplay payment has yet been verified. The S14 activation/reset text below is historical; it grants no new reset authority.

**S15 continuation:** the current task explicitly authorizes a tested state-preserving backend upgrade and subsequent observer asset upload to the existing two IDs under `codex_local`. It does not authorize a reset/reinstall, funding transfer, settings/controller change, Event Horizon change or remote Git action. Record pre-upgrade certified world/scores/configuration/source progress and controllers; freeze the normal artifact with `tools/prepare_mvp_release.py` and pass the exact deployed-module local recovery probe before upgrading. Stop a deployment operation on an actual preservation, funding or authorization blocker. The earlier reset proposal below remains historical and must not be repeated.

**Current deployment, 2026-10-19: activated and verified.** The exact reviewed source `717069497c7e9beb90c37e70320a8b946524531f` passed user-confirmed CI 39306785701. The user explicitly approved the one-time empty-game reset, which was executed after fresh no-obligation checks. The existing backend now runs approved Wasm `2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c`; the existing certified observer displays **1 ICP**. [Activation record](../../evidence/S14/ux-pricing/mainnet-activation.json). The staging/reset proposal below is historical procedure, **not authorization to repeat a reset**. For routine operation use the pause/resume and state-preserving upgrade instructions; never reinstall a participating game.

This is the single deployment procedure for `checkpoint/s14-lean-index-poke`. **Every mainnet action requires explicit operator authorization.** Codex installed the existing baseline under the user’s two-canister authorization; the staged UX/pricing release requires fresh exact-release approval. All real transfers, funding, controller changes and remote Git operations remain user-owned. Use Bash, dfx **0.31.0**, Rust **1.94.1**, Node >=22.16 and Python 3.11. Commands/flags were checked against the installed dfx help; the actual asset-canister route is rehearsed locally in [deployment evidence](../../evidence/S14/mvp-preparation.json). Review CI for the exact candidate before spending funds; new CI is pending user confirmation.

This is an experimental, publicly reachable game for a controlled personal exercise. No login or wallet connection is needed. **The staged fresh-game profile costs 1 ICP to join; the existing live profile still costs 10 ICP until approved activation. Payments are retained, including rejected/underfunded commands and overpayments. Refunds and automatic payouts are unavailable.** Accrued area-time scores remain; this is not a prize-bearing launch. A public account remains payable even while gameplay is paused or its URL is unadvertised.

## Existing deployment and staged UX/pricing release

The existing canisters are **b2z `s34gv-3qaaa-aaaar-qcifa-cai`** and **observer `s45ab-wiaaa-aaaar-qcifq-cai`**. Both are installed. The public observer is `https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/`. **Do not run the create/fresh-install examples below against this deployment.** The live backend remains on the original **10 ICP** profile until a separately approved transition. The staged build initializes a **1 ICP** profile; the observer selects prices only from the configuration hash in a verified publication and can honestly display either supported profile.

The root npm package intentionally has no `build` script. Use **`NPM_CONFIG_IF_PRESENT=true` on DFX build/install/deploy commands** to preserve the prebuilt observer assets without changing the repository. This was verified on dfx 0.31.0.

### Release approval and the one-time empty-game option

This section is a **proposal, not authorization to run a reset**. The user must approve the exact reviewed source and frozen artifact hashes and explicitly approve discarding the empty timeline. No reset has been performed. An installed local old-to-new upgrade preserves the historical configuration and public output, then keeps advancing; it does **not** change the price. DTR has no supported in-place journal repricing action. Do not rewrite a journal identity or old seal. No DTR modification is proposed.

At preparation time, the official account index returned no transactions, no oldest transaction and zero balance. Certified state had no cannons, balls, area-time credits or retained payments, and controller work showed no queued inputs/source progress. This is finite, timestamped evidence, not a guarantee about payments arriving later. Before approval is acted on, repeat the account-history/balance query, certified state/score/tally inspection, source/pending input checks and controller/module comparison. Confirm no wallet transfer is outstanding or waiting for index visibility. **If any receiving-account transaction, score or pending input exists, stop; this empty-game proposal no longer applies.** The account remains publicly payable even when paused.

An approved reset would discard the old empty world's logical time, segment/checkpoint history, private coordinator continuation and retained publication chain. It preserves canister principals, controllers, the derived receiving account and the external ledger/index history. Source initialization remains `FromBeginning`; no cursor skipping is allowed. Public preflight artifacts and the old Wasm are retained, but they are not a full private-state backup and cannot restore the discarded timeline. Do not promise rollback: the old module is not a compatible reader of the new price profile. Allow several minutes for pause/install/readiness/start/browser verification; no mainnet downtime bound is promised.

After **separate source/artifact and reset approval**, the intended sequence is:

1. Recheck both existing canister IDs, module hashes, controllers and cycles. Reconfirm the empty-payment conditions above. Never create canisters or change settings/controllers.
2. Build/freeze from the approved clean checkout into a new release directory with `tools/prepare_mvp_release.py`; record `manifest.json`, `normal.wasm`, `generated.did`, `init.did` and `launch.json`. Generate observer assets for the actual backend using the existing builder and retain its manifest. Do not substitute a test-feature module.
3. Upload the approved observer assets to **observer only**. It can still display the certified historical 10 ICP price while the old game runs. Check the installed CLI's help first. The targeted route is `NPM_CONFIG_IF_PRESENT=true dfx --identity codex_local build observer --network ic`, followed by `dfx --identity codex_local canister install observer --network ic --mode upgrade --no-asset-upgrade` for an asset-only upload. No `--all`, install, reinstall or canister creation applies to the already-installed observer.
4. Pause **b2z only** through `pause_autonomous`; source reconciliation continues. Recheck no payment/history/score/input appeared. Record the last public state and configuration again. Stop on any mismatch.
5. **Only with explicit reset approval**, fresh-install the approved module into the same backend using `--mode reinstall`, the exact frozen `--wasm` and `--argument-file init.did`. Keep the interactive destructive confirmation. This is intentionally not described as a state-preserving upgrade. Do not run it merely because a deployment command fails.
6. Require official index/ledger binding, unchanged subaccount-0 receiving address, healthy source, and the new configuration hash/1 ICP join. Event Horizon remains disabled; fallback remains 60 seconds. Do not change controllers or send funds.
7. Start once with `(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})`. Verify several certified segments and bounded retention. **Reload the observer into a fresh session**: an old session must not silently accept a reset as continuation of its old chain. Do not weaken anti-rollback checks to avoid this explicit restart.
8. Verify the hosted page's authenticated address, **1 ICP** price, current next-ball prices and errors before suggesting a transfer. The user alone sends gameplay ICP. The solo join/first-ball/move exercise is **1.1001 ICP plus three fees**, if one ball is active at the additional-ball application point. Payments remain retained; no refunds/automatic payouts exist.

The concrete backend reset command, **not to be run before the approvals and preflight above**, is:

```bash
# PROPOSAL ONLY — separately approved one-time empty-game reset.
# Verify b2z resolves to s34gv-3qaaa-aaaar-qcifa-cai immediately before use.
dfx --identity codex_local canister install b2z --network ic --mode reinstall \
  --wasm .work/ux-pricing/release-final/normal.wasm \
  --argument-file .work/ux-pricing/release-final/init.did
```

Do not add `--yes`, change the target, or substitute the default target-directory Wasm. The release’s generated constructor retains default subaccount 0, the official index/ledger, disabled Event Horizon and `FromBeginning` history policy. If any preflight is uncertain, retain the current backend and do not execute this command.

If the user approves only the frontend, deploy only the reviewed assets and keep the currently certified 10 ICP price. Do not imply the 1 ICP backend transition has occurred. Mainnet/remote CI results must be recorded after their actual execution.

## Launch configuration and funding

`tools/prepare_mvp_release.py` freezes the normal backend, constructor, empty world and readable `launch.json`. It does not deploy or spend. The fixed profile uses:

| Setting | Value |
|---|---|
| Network / backend / observer | `ic` / `b2z` / `observer` |
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
| Join (staged fresh profile) | **100,000,000 e8s = 1 ICP**, includes first cannon/ball |
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
cd /home/codexdev/src/b2z
set -euo pipefail
B2Z_IDENTITY='YOUR_EXISTING_DEPLOYMENT_IDENTITY_NAME'
B2Z_CONTROLLER='YOUR_REVIEWED_CONTROLLER_PRINCIPAL'
B2Z_BACKEND_CYCLES='YOUR_BACKEND_CYCLES_BUDGET_AS_INTEGER'
B2Z_OBSERVER_CYCLES='YOUR_OBSERVER_CYCLES_BUDGET_AS_INTEGER'
B2Z_EH_PRINCIPAL='' # disabled unless you supply the reviewed ICP Event Horizon principal
B2Z_RELEASE='.work/s14/user-release' # choose a NEW directory on subsequent builds

git status --short
git branch --show-current
git rev-parse HEAD
# Require the reviewed S14 branch and a clean worktree.
test -z "$(git status --porcelain)"
dfx --version
dfx identity whoami
# Explicitly inspect the chosen identity; this does not switch the active identity.
CHOSEN_PRINCIPAL=$(dfx --identity "$B2Z_IDENTITY" identity get-principal)
test "$CHOSEN_PRINCIPAL" = "$B2Z_CONTROLLER"

# Refuse unexpected existing mainnet aliases. Never delete these records to bypass this check.
python3.11 - <<'PY'
import json
from pathlib import Path
for path in [Path('canister_ids.json'), Path('.dfx/ic/canister_ids.json')]:
    if path.exists():
        value=json.loads(path.read_text())
        for name in ['b2z','observer']:
            if value.get(name,{}).get('ic'):
                raise SystemExit(f'STOP: existing {name} at {path}: {value[name]["ic"]}; inspect/reconcile, do not recreate or reinstall')
print('No existing mainnet deployment aliases found')
PY

npm ci --ignore-scripts
RELEASE_ARGS=(--output "$B2Z_RELEASE")
if [ -n "$B2Z_EH_PRINCIPAL" ]; then RELEASE_ARGS+=(--event-horizon "$B2Z_EH_PRINCIPAL"); fi
python3.11 -B tools/prepare_mvp_release.py "${RELEASE_ARGS[@]}"
cat "$B2Z_RELEASE/launch.json"
cat "$B2Z_RELEASE/manifest.json"
sha256sum "$B2Z_RELEASE/normal.wasm" "$B2Z_RELEASE/generated.did"
```

The manifest records the source commit/tree, actual DTR pins/locks/package, tools, normal exports and file hashes. DTR is already published at `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client **0.12.0**, package SHA-256 `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`. No DTR publication, sibling override or floating dependency is needed. Normal exports exclude synthetic inputs, test traps, manual steps and old scanner methods. Install the frozen `normal.wasm` with `--wasm`; later test builds cannot substitute their output.

Stop on any failed preflight. Existing IDs or installed code require inspection, not `reinstall`. The constructor processes account history **from the beginning**. It never skips prior payments. Root schema 7 is for a fresh index application, not migration from old disposable scanner schemas.

## B. User creates/funds the backend

Review the chosen cycles budget and existing funded cycles-ledger balance before this expenditure. Conversion/funding of that balance is a separate user action; this procedure never converts ICP automatically.

```bash
dfx --identity "$B2Z_IDENTITY" cycles balance --network ic
dfx --identity "$B2Z_IDENTITY" canister create b2z --network ic --no-wallet \
  --controller "$B2Z_CONTROLLER" --with-cycles "$B2Z_BACKEND_CYCLES"
B2Z_BACKEND=$(dfx --identity "$B2Z_IDENTITY" canister id b2z --network ic)
printf '%s\n' "$B2Z_BACKEND" > "$B2Z_RELEASE/backend-id.txt"
dfx --identity "$B2Z_IDENTITY" canister status b2z --network ic
```

Read back the **actual** backend ID, controller and balance. Require an empty module (`Module hash: None`) before phase C. If creation times out, inspect its result/ID records before retrying; do not create another canister blindly.

## C. User installs the backend and checks readiness

```bash
dfx --identity "$B2Z_IDENTITY" canister install b2z --network ic --mode install \
  --wasm "$B2Z_RELEASE/normal.wasm" --argument-file "$B2Z_RELEASE/init.did"
dfx --identity "$B2Z_IDENTITY" canister info b2z --network ic
dfx --identity "$B2Z_IDENTITY" canister status b2z --network ic
dfx --identity "$B2Z_IDENTITY" canister call b2z lab_status '()' --network ic --query

B2Z_ACCOUNT=$(dfx --identity "$B2Z_IDENTITY" ledger account-id --of-principal "$B2Z_BACKEND" \
  --subaccount 0000000000000000000000000000000000000000000000000000000000000000)
printf '%s\n' "$B2Z_ACCOUNT" > "$B2Z_RELEASE/receiving-account.txt"
```

Compare the installed module hash with the manifest's `normal.wasm` SHA-256 and controllers with your choices. Poll `lab_status` until `source.binding_checked=true`, official ledger/index, `network="ic"`, subaccount 0 and no source error. Compare its recipient bytes with the independently derived account above and, in phase D, the certified receiving descriptor. Empty history is valid. Gameplay is initially paused; initialization starts index reconciliation independently. Do not send gameplay payments before readiness and certified identity checks pass.

## D. User builds/deploys the real observer

Keep the same reviewed source checkout as the backend manifest. The newly generated public `canister_ids.json` is recorded separately in the asset manifest; other source changes must be absent. The ACTUAL backend ID, not a sample ID, is embedded in the bundle. No URL parameter can replace it, its endpoint or root.

```bash
node tools/build_observer_mainnet.mjs --canister "$B2Z_BACKEND" --output .work/s14/assets
cat .work/s14/assets/build-manifest.json
cp .work/s14/assets/build-manifest.json "$B2Z_RELEASE/observer-build-manifest.json"
# Require local_test_only=false, source_dirty=false, intended backend and network ic.
# Require no test adapter/root and the single endpoint https://icp-api.io.
dfx --identity "$B2Z_IDENTITY" canister create observer --network ic --no-wallet \
  --controller "$B2Z_CONTROLLER" --with-cycles "$B2Z_OBSERVER_CYCLES"
dfx --identity "$B2Z_IDENTITY" deploy observer --network ic --mode install --no-wallet
B2Z_OBSERVER=$(dfx --identity "$B2Z_IDENTITY" canister id observer --network ic)
dfx --identity "$B2Z_IDENTITY" canister status observer --network ic
dfx --identity "$B2Z_IDENTITY" canister url observer --network ic
B2Z_OBSERVER_URL="https://${B2Z_OBSERVER}.icp0.io/"
printf '%s\n' "$B2Z_OBSERVER_URL" > "$B2Z_RELEASE/observer-url.txt"
```

Open the certified **non-raw** URL. Do not use `raw.icp0.io` or bypass a certificate error. Confirm the tool-reported URL corresponds to this canister. Verify the app shows the intended backend, the exact `$B2Z_ACCOUNT`, SDK mainnet certification, configuration/rules identities and the prices above. Module imports, MIME types, CSP and configuration files must load without browser errors. The production bundle never fetches/trusts a replacement root. The explicit disposable local-test root is compiled only into local acceptance assets; never deploy those to mainnet.

## E. User starts autonomous play once

```bash
dfx --identity "$B2Z_IDENTITY" canister call b2z start_autonomous \
  '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
dfx --identity "$B2Z_IDENTITY" canister call b2z lab_status '()' --network ic --query
dfx --identity "$B2Z_IDENTITY" canister call b2z retention_status '()' --network ic --query
```

Repeat the status query after a short wait; require multiple completed segments, no run/source error and a fresh observer publication. Close the browser, wait, query again and reopen: advancement must continue independently. Two logical ticks, callback pacing and actual publication spacing are distinct; a segment need not finish every second.

## F. Play card — user wallet only

**S15 text instructions apply only after the backend's tested adapter-v2 upgrade.** Never publish the text-emitting frontend first. The [text contract](../specs/B2Z_TEXT_MEMOS.md) documents grammar, compatibility and historical replay. Previously published binary/numeric instructions remain supported; new preparation uses readable text.

Use the observer's single action panel: **Start a cannon → aim → prepare**, **Add a ball → selected cannon → aim → prepare**, or **Move cannon → selected cannon → owned cell → prepare**. Require fresh verification and healthy operation, compare the authenticated receiving descriptor, then copy the complete card. Selection is local inspection, not proof that a wallet owns a cannon. No selection sends a command.

| ICRC-1 text / UTF-8 memo | Meaning |
|---|---|
| `ANGLE 37.5` | Start a cannon, or add a ball for the same sending account, clockwise down/right. |
| `ANGLE 225` | Start a cannon, or add a ball, clockwise up/left. |
| `MOVE 83` | Relocate only if cell 83 is still owned when applied. |

The ICRC-1 owner is `s34gv-3qaaa-aaaar-qcifa-cai`, default subaccount omitted/all zero bytes. Its AccountIdentifier is `344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`; use that representation only in a wallet field requiring it. These are distinct address representations. Use an ICRC-1 text/UTF-8 memo field; if the wallet exposes a hexadecimal ICRC memo instead, the panel copies the exact UTF-8 bytes of the same text. Some wallets lack the required controls. Wallet integration and transaction submission are absent.

Offline preparation, never signing/sending:

```bash
node tools/command.mjs memo angle 37.5
node tools/command.mjs memo angle 225
node tools/command.mjs memo move 83
```

Join remains **1 ICP**, an additional ball **0.1 ICP × active-ball-count²**, relocation **0.0001 ICP**, with wallet fees separate. The solo join/first extra ball/relocation exercise is **1.1001 ICP plus three fees** only if the current certified ball count still gives 0.1 ICP. Payments and excess are retained; refunds and automatic payouts remain unavailable. Prepared cards are not reservations. A certified change requires explicit full refresh; on-chain changes may still occur later.

The user performs every real transfer. Record its original transaction ID and wait for exactly one certified outcome. An absent receipt is unresolved, not proof of rejection/loss. The index can lag; independent fallback checks every 60 seconds, then calls/retries and segment completion take additional time. Do not resend an unresolved transfer. No text-memo mainnet payment has been verified merely by upgrading code or copying instructions.

## Event Horizon — optional acceleration after first play

Use the configured ICP instance's pinned [subscriber guide](https://github.com/aodl/Event_Horizon/blob/3e2493f526998daa2f8f7a2d4e5c08ff1e3120c5/docs/subscriber-guide.md). Never infer its principal from a poke. If configured before installation, subscription admission can happen later; the backend already accepts only that caller's exact subaccount-0 positive matches. Empty/global, other accounts and neuron targets do no index work. Poke values never prove payment.

```bash
# Only if B2Z_EH_PRINCIPAL is the reviewed sender installed in the constructor:
dfx --identity "$B2Z_IDENTITY" canister call "$B2Z_EH_PRINCIPAL" get_instance '()' \
  --network ic --query --candid interfaces/event-horizon.instance.did
dfx --identity "$B2Z_IDENTITY" canister call "$B2Z_EH_PRINCIPAL" get_pricing '()' \
  --network ic --query --candid interfaces/event-horizon.instance.did
node tools/prepare_s14_subscription.mjs --subscriber "$B2Z_BACKEND" --subaccount 0 \
  --alias YOUR_REVIEWED_JUPITER_ALIAS
```

Review instance ICP ledger, current pricing, Jupiter alias and Faucet staking destination. The account declaration is **`<B2Z_BACKEND>.0`**, full routed memo **`<reviewed alias>.<B2Z_BACKEND>.0`**, at most 32 bytes. Never request a global subscription. User alone funds the documented route; no destination/amount is invented here. Admission may take stake-recognition/evidence time (the reviewed guide describes seven-day recognition). First play does not wait for it.

If no sender is known, leave pokes disabled and use fallback. **Source configuration is immutable in the current application; there is no existing setter.** Enabling/changing a disabled sender later needs a separately reviewed state-preserving configuration upgrade. A routine same-version upgrade preserves the original configuration and cannot enable it; never reinstall a funded backend to change it.

## Minimal operations and supported upgrades

```bash
# Public source/run progress; controller-only inbox/phase; funding and retention:
dfx --identity "$B2Z_IDENTITY" canister call b2z lab_status '()' --network ic --query
dfx --identity "$B2Z_IDENTITY" canister call b2z controller_work '()' --network ic --query
dfx --identity "$B2Z_IDENTITY" canister call b2z retention_status '()' --network ic --query
dfx --identity "$B2Z_IDENTITY" canister status b2z --network ic
dfx --identity "$B2Z_IDENTITY" canister status observer --network ic

# Gameplay pause. This does NOT stop source reconciliation or prevent transfers.
dfx --identity "$B2Z_IDENTITY" canister call b2z pause_autonomous '()' --network ic
# Resume with the SAME reviewed run settings:
dfx --identity "$B2Z_IDENTITY" canister call b2z start_autonomous \
  '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
```

`source.last_error` / `run.last_error` require investigation; source cursor, pending rows and controller inbox distinguish download/admission from publication. A full inbox waits for publication retirement. Callback traps can recover after the 45-second lease through ordinary fallback. Bounded oldest-first history staging survives interruption, but large backlogs re-read newer pages and can be expensive; no arbitrary-load claim is made. Monitor cycles balances explicitly; actual mainnet consumption is not yet measured.

For a reviewed supported upgrade, first pause and record source cursor/pending inputs, committed segment, certified world/scores, module and controllers. Build/freeze the replacement from a clean checkout into a **new** release directory. For a same-version recovery exercise, use the existing frozen module:

```bash
dfx --identity "$B2Z_IDENTITY" canister call b2z pause_autonomous '()' --network ic
dfx --identity "$B2Z_IDENTITY" canister install b2z --network ic --mode upgrade \
  --wasm "$B2Z_RELEASE/normal.wasm" --argument '()' --upgrade-unchanged
dfx --identity "$B2Z_IDENTITY" canister info b2z --network ic
dfx --identity "$B2Z_IDENTITY" canister call b2z lab_status '()' --network ic --query
dfx --identity "$B2Z_IDENTITY" canister call b2z controller_work '()' --network ic --query
dfx --identity "$B2Z_IDENTITY" canister call b2z start_autonomous \
  '(record {segment_ticks=2:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic
```

Verify fresh certificates/publications, preserved accrued scores, source progress without duplicates and resumed autonomous segments. Never use reinstall, uninstall-code, skip-pre-upgrade or a reset as recovery. Observer playback pause is separate from backend pause. Keep controller keys in the existing identity tooling; never export them for B2Z.

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
