# Frozen A2: staged pause, upgrade, verify, fund, resume proposal

This supersedes the funding-first ordering as a recommendation only. No mainnet mutation, pause, funding, install, resume, controller change, frontend deployment or merge is authorised. Frozen technical source remains `3e99d74b3661fb4ccec8e87ec3945b35d05e6f25`; release preparation source `adbb0e20a1961492827963f5e0f9b3ab505fcf83` is already published. CI [41022561960](https://github.com/aodl/balls-2-the-wallz/actions/runs/41022561960) completed SUCCESS on exact `adbb0e20a1961492827963f5e0f9b3ab505fcf83`: all six substantive jobs PASS; all six artifact digests and report checks verify. The production placeholder remains BLOCKED and is excluded. Historical FAIL/BLOCKED evidence remains unchanged.

## Recommendation and evidence

Prefer upgrade-before-funding, conditional on secure signing and sufficient fresh pre-upgrade liquid cycles. It removes the A0 Normal-speed funding-to-install deadline, allows A2/module/state verification before sending the pilot budget, and keeps gameplay still for the preservation checkpoint. It requires two additional explicit update operations (pause/resume) and intentional gameplay downtime. Source reconciliation, public payment arrivals and treasury services remain active: this is not a financial freeze, whole-canister stop or rollback facility.

The existing exact A0→A2 paid-v8 paused and persisted unfinished-phase cases PASS, with full finance/control equality and resumed content equality. A2 installation debits were 38,973,760,208 and 38,994,734,996 cycles under local 34-node pricing. The unfinished case preserves and recovers a staged cursor; the torn-image test fails closed. These are finite disposable tests, not a mainnet backup or an installation cost ceiling. See `upgrade-evidence-review.json` and the unchanged pinned-release report.

Source review confirms pause persists `running=false`, renews gameplay generation and clears the simulation timer without discarding pending inputs or work. Post-upgrade validates durable publication/artifacts, preserves the paused flag and restores source/treasury timers. Source and treasury nonces advance and leases renew intentionally; require preserved financial obligations and explained transitions, not equality of every transient counter. Start continues stored work with the original configuration. No new runtime change or test is needed.

## Fixed identities and operator gates

Backend `s34gv-3qaaa-aaaar-qcifa-cai`; observer `s45ab-wiaaa-aaaar-qcifq-cai` remains untouched. Required A0 module: `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`. Required A2 module/file: `2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb`. DTR remains `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68` with no epoch change.

Controllers must remain exactly `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae` and `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`. Subnet must remain `pzp6e-ekpqk-3c5x7-2h6so-njoeq-mt45d-h3h6c-q3mxf-vpeq5-fk5o7-yae`, 34 nodes. Reverify immediately before release; prior observations are not a perpetual assertion.

On the trusted workstation, the operator confirms an existing controller's public principal using `dfx --identity SECURE_EXISTING_CONTROLLER identity get-principal`, and confirms its existing OS-keyring/password-encrypted storage via their identity tooling. Do not inspect/export keys, copy identity directories, create a controller, rotate identities or move private material to this VM. Plaintext `codex_local` is not an acceptable update signer. Do not set `DFX_WARNING` to bypass plaintext protection on any update. This VM cannot independently attest remote storage or possession of an unspecified signer: authority and storage checks remain the deployment operator's pre-execution responsibility. Per the user's clarification, signing these preparation files is unnecessary and the agent will not be the update signer. A funding owner can differ from the backend controller; the user will select and check their funded source manually, without supplying account details to the agent.

## Public artifact distribution

Prepared public inputs are `/home/codexdev/b2z-release-evidence/a2-signing-inputs/{A2.wasm,A2.wasm.gz,runtime-lab.did,SHA256SUMS}`. Copy only these public files through an authenticated operator-controlled file-transfer channel to a release directory on the trusted workstation. No repository checkout, application rebuild, private key export or persistent runner is needed. The source host/SSH alias and workstation directory are operator supplied; no remote copy or publication is performed here. The expected hashes must be compared against this separately reviewed record, not only the co-transferred manifest.

On the signing workstation, in that directory:

```sh
sha256sum --check SHA256SUMS
printf '%s  %s\n' '2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb' 'A2.wasm' | sha256sum --check -
gzip -dc A2.wasm.gz | sha256sum
```

Gzip SHA-256 must be `2fde8cf962498a8267757ccd4ca505196261f33263ae32c0a04bdcdc6c42b17b`; decompression must yield the exact A2 hash above. Public Candid SHA-256 is `b2b3b2f669050af3f00ca93c7a75a896cf3ed907d59e9d0c38ceb8f255d8fd21`. Use the explicit Candid file for controller calls, since deployed Candid metadata is unavailable. Rehash the actual installation file immediately before install; the command below assumes the current directory is this verified release directory. Freeze its contents against replacement through the operation.

## Staged approval and future commands — do not execute now

1. Finish six-job exact-commit CI. Have the deployment operator verify secure signer/authority and have the user manually verify their chosen funded source/subaccount and sufficient balance; independently verify fee and fixed modules/controllers/subnet, certified paid-v8 current/retained history, scores/credits/receipts/source descriptor, source cursor/pending work and financial phase/nonce/credit counters. No unexpected runtime/source error or unexplained financial submission is acceptable. Snapshot the original run configuration. Latest recorded settings were `segment_ticks=1`, `pacing_seconds=1`, `work_budget=512`; stop and update the reviewed resume command if fresh settings differ.
2. Proposed conservative operator guard: at least **5T liquid immediately before pause/upgrade**, no new unexplained reservation/maintenance exposure, and no unresolved financial submission. This is an operational approval guard, not a runtime threshold change. It exceeds the contained 3T protection reserve plus 0.077989469992T local upgrade/recovery allowance, 0.25T verification margin and 0.05T one-hour provisional maintenance allowance (3.377989469992T combined). It is not a mainnet upper-bound proof. If insufficient, do not execute or silently fund first: return for a revised separate approval. Confirm freeze/resource reservations are understood from fresh total/liquid reads; do not lower settings.
3. After separate Stage A approval, pause gameplay once:

```sh
dfx --identity SECURE_EXISTING_CONTROLLER canister call s34gv-3qaaa-aaaar-qcifa-cai pause_autonomous '()' --network ic --update --candid ./runtime-lab.did
```

Confirm `lab_status.run.running=false`; record two paused observations, authenticated committed publication/retained catalog/chunk bytes and work phase/ready-manifest. Do not require pending source inputs to be zero or drain unfinished work by repeated pause/resume. If a stage remains, explicitly retain and account for the qualified unfinished phase; unknown/inconsistent phases are a stop. Gameplay committed history must be stable; source cursor, inbox and financial counters can legitimately advance and must be reconciled. Do not call `set_funding_paused`, stop the canister or prevent external payments.

4. Still under Stage A approval, after matching the exact A0 module and verifying the actual A2 file again, upgrade once in place with empty arguments:

```sh
dfx --identity SECURE_EXISTING_CONTROLLER canister install s34gv-3qaaa-aaaar-qcifa-cai --network ic --mode upgrade --wasm ./A2.wasm --argument '()'
```

5. Authenticate exact A2 module, same controllers/subnet, paused flag, old committed/retained artifact bytes and paid-v8 identity/financial state. Compare scores, credits, cannon/ball state, ownership, receiving account, cumulative receipts, source identity/cursor and pending/ready work. Allow only explained source admissions and treasury changes backed by ledger/credit evidence. Reconcile the expected source/treasury nonce increments and lease reset without losing/duplicating a plan or payment. Verify source and treasury callbacks remain healthy. If an anchor cannot be obtained or any continuity check fails, stop; do not fund, resume, reinstall, reset the epoch or roll back automatically.
6. Obtain **post-upgrade paused-A2 liquid balance Q_post**, total-minus-liquid difference and refreshed fee/account balance. Only now can the final funding quotation use the correct actual post-upgrade balance. Present the exact integer addition `max(0, 47_000_000_000_000 - Q_post)` plus the withdrawal fee for separate Stage B confirmation. A pre-upgrade query cannot establish Q_post; any current arithmetic is explicitly a planning snapshot. No automatic withdrawal is implied by Stage A approval.
7. After separate Stage B approval, the funded account's owner alone sends the exact approved addition. For an approved non-default subaccount, the future command is:

```sh
dfx --identity SECURE_FUNDED_OWNER cycles top-up --network ic --from-subaccount APPROVED_64_HEX_SUBACCOUNT --created-at-time APPROVED_CREATED_AT_NS s34gv-3qaaa-aaaar-qcifa-cai APPROVED_POST_UPGRADE_ADDITION
```

For a confirmed default-zero subaccount, omit `--from-subaccount` (or explicitly use 64 zeros). The identity principal must equal the approved public account owner. Record the exact amount, source account, destination, timestamp and ledger block index before/after the command. The DFX 0.31 source uses cycles-ledger `withdraw`, not a gameplay ICP transfer or CMC conversion. The backend receives the requested amount; the source account pays that amount plus the ledger withdrawal fee. Confirm an unambiguous ledger result and matching backend balance movement, separating concurrent consumption/treasury credits/reservations. An ambiguous or duplicate response requires read-only reconciliation with the original transaction identity; never resend with a new timestamp, silently retry or automatically add more funds. If materially below the target, requote and obtain separate approval.
8. Under explicit Stage B resume approval, once paused A2 and funding are verified, resume exactly the original configuration:

```sh
dfx --identity SECURE_EXISTING_CONTROLLER canister call s34gv-3qaaa-aaaar-qcifa-cai start_autonomous '(record {segment_ticks=1:nat64;pacing_seconds=1:nat32;work_budget=512:nat32})' --network ic --update --candid ./runtime-lab.did
```

Verify running Normal with nominal/supported 1000 milli, no limiter/errors, authentic consecutive progression, retained history and recovered pending work. A successful update response alone does not prove Normal operation. Do not change pacing/configuration to force a result.

## Funding and pilot monitoring

With no A0 Normal cutover term, the unchanged formula becomes `40 + 0.077989469992 + 4.0905305352 + 24*0.05 + 0.25 = 45.618520005192 T`. Retain the accepted provisional **47T liquid** target, including 1.381479994808T discretionary rounding. The 3T protected reserve is already within the 40T Normal entry requirement; do not add it again. Retain 0.077989469992T as future recovery contingency even after measuring actual installation debit; do not subtract an estimated installation cost again from Q_post. Account for actual observed upgrade/verification/maintenance debit through Q_post. Larger-world/fragmentation/population evidence retains its original qualifications. The current three-ball world is budgeted using the finite local four-ball maximum-tick projection, not a mainnet cost ceiling.

The 24-hour maintenance allowance is **not 24 hours of active Normal play**. The pilot budgets one hour of active work at 1 tick/s (4.0905305352T local projection) plus provisional maintenance, recovery and verification allowances. Fresh active-game debit cannot isolate maintenance. Source calls, arrivals, reservations, treasury credits and ongoing consumption remain separate. No future income is assumed. Normal exits below 30T, usually to Cruise if its floor is met; no guaranteed runway or rate is promised.

At resume, +1 minute, +5 minutes and then every 5 minutes through +60 minutes, use authenticated public status/history and the permitted controller queries. Record wall-time/publication/logical-tick progress, selected/supported rate and limiter, total/liquid balance, reservation gap, source cursor/pending work, treasury plans/credits/errors and cumulative receipts. Compute net debit separately from successful credits and reservation changes; do not label it maintenance-only. The existing observer remains unchanged and authenticates its ordinary playback; this is operational monitoring, not another sustained qualification programme. New workload, limiting, unexpected backlog/errors, financial ambiguity or unexpectedly rapid consumption stop further release actions and require review; a protective pause is permitted only if explicitly included in the future approval.

Recommended pilot-end policy: Stage B approval explicitly includes one `pause_autonomous` at +60 minutes, followed by paused-state/history/source/treasury/balance verification. This stops autonomous gameplay while source and treasury continue. It is not an automatic timer installed by this plan. If the user instead approves continued play, do not pause at +60; clearly report ongoing consumption and natural tier transitions, and make no automatic top-ups. Browser closure does not stop shared gameplay.

Any ambiguous pause/install/resume response is resolved by authenticated state/module/run reads before another update. Do not issue a compensating resume, retry installation, reinstall, reset, change controllers/subnets or roll back automatically. A verified paused state can remain paused awaiting the user's next decision; no implied authority to resume exists after an abort.

Primary route references: [cycles-ledger withdrawal specification](https://github.com/dfinity/cycles-ledger#withdrawing-cycles) and [DFX 0.31 top-up implementation](https://github.com/dfinity/sdk/blob/0.31.0/src/dfx/src/commands/cycles/top_up.rs). CI outcome and fresh financial observations are recorded separately. The user explicitly keeps funding manual and does not want their source-account details formalised here; no agent account-access verification is claimed. The 100M quotation applies to the documented cycles-ledger withdrawal route; a different manual route needs its actual fee checked. Deployment authority/security and sufficient source funds remain owner/operator pre-execution checks. Final mutation approval must name the two stages and their confirmation boundaries.


## Final read-only observation and current quotation

At 2026-10-30 08:39 UTC the five permitted controller queries all returned Ok. Total cycles are **6,504,985,115,972**; liquid cycles **6,358,126,763,402**; difference **146,858,352,570** (not another application reserve). A0 is running **Conserve 0.2 ticks/s**, supported 0.2, no limiter or run error, original run settings 1/1/512. The natural tier descent is not a manual pause or configuration change. The current balance exceeds the proposed 5T pre-upgrade guard, but it must be refreshed immediately before actual execution.

Treasury is Idle, unpaused, not halted, no error; reported successful credits remain 12,110,272,820,000 cycles (unchanged from the previous observation). Source binding is healthy, no error or pending source records; cursor remains 39,711,127. Controller work has no phase, ready manifest or pending input. Fresh authenticated public head is **64627**, world v5/publication v8, three balls/one cannon, unchanged certified configuration/rules/schema/source identities and cumulative received 620,000,000 e8s. All 16 retained catalogs and artifact/chunk hashes were checked. These sequential reads are not an atomic whole-state snapshot or a new independent mainnet replay. The future paused pre-upgrade anchor must be captured again.

Fresh IC-root-backed metadata again confirms exact A0, both unchanged controllers and the same 34-node fiduciary subnet. The observer module/controller read also remains unchanged. Live cycles-ledger `icrc1_fee` is **100,000,000 cycles**. Per the user's clarification, the funded source account is deliberately not queried/formalised here; the user checks their own account manually when funding is requested. DFX 0.31's top-up implementation uses the documented withdrawal route. No private identity files were inspected, and warning acknowledgement was used only in the five individual query subprocess environments; no update was sent.

**Current A0 planning snapshot only:** to reach 47T from the observed liquid balance would require **40,641,873,236,598 backend cycles**, plus **100,000,000 fee**, total **40,641,973,236,598 cycles** from the source account using that route. This is NOT the final funding instruction. Mainnet A2 is not installed, so a real post-upgrade Q_post does not exist yet; do not invent it or present an estimated post-upgrade amount as executable. After separately authorised paused A2 installation and verification, read Q_post and quote `max(0,47T-Q_post)` plus the actual route fee for the user's separate manual confirmation. The unnecessary A0 Normal-speed cutover allowance is removed from the formula. The 47T target remains provisional until that confirmation.

Decision: technical Normal qualification remains GO; recommend **paused upgrade → authenticate preservation → exact post-upgrade manual funding confirmation → resume**. No mainnet mutation is authorised now. Request separate Stage A approval for the operator's pause/upgrade/verification, then Stage B confirmation of exact manual funding, resume and the proposed +60-minute pause (or explicit continued-play choice). Existing-controller authority/secure storage and source-account sufficiency are operator/owner pre-execution checks, not agent claims of remote credential verification. New local documentation/evidence does not change executable source; any later publication of it remains user-owned and requires its own exact-commit CI.
