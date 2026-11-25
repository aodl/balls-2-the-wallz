# Rules19 production preflight and activation budget

**Qualified for a bounded trial after funding and operator approval. Activation is on hold.** The 25 November 2026 reads show an intact paid Rules18 world, healthy official source and sufficient frontend reserves. Backend liquidity is below the 2.1T release floor and production is in ReserveProtection. The release candidate is `3f93d8b4c57f3c0ba752f3a8f6975e76069b9dc7`. This preflight used production read interfaces and disposable local checks. Production state, funding and settings were untouched.

## European production baseline

Balances and operating status were read at 06:27:41–43 UTC. `B` and `T` mean billion and trillion cycles. The backend's signed `runtime_health` reply supplies a matched liquid/total pair. Its separate management read returned 839,248,610,081 total cycles. The frontend's liquid estimate uses management total less the freezing reserve and reported reserved cycles. Both management reads returned zero reserved cycles.

|  | Backend `s5ir5-gqaaa-aaaas-amyna-cai` | Frontend `s2jxj-liaaa-aaaas-amynq-cai` |
| --- | ---: | ---: |
| Total cycles | 839,250,134,081 | 1,343,108,264,962 |
| Liquid cycles | 775,407,401,711 | 1,139,461,801,402 estimated |
| Freezing threshold | 2,592,000 s | 2,592,000 s |
| Management idle cycles/day | 2,128,091,079 | 6,788,215,452 |
| Estimated IC freezing reserve | 63,842,732,370 | 203,646,463,560 |
| Operation | Running, ReserveProtection, 0 milliticks/s, admission closed | Running, certified observer |

The frontend serves the game at `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`. Fresh IC-v2 proofs covered `/`, `/app.mjs`, and the branded 404 for `/.well-known/ii-alternative-origins`, including security headers. The observer consumes the backend's certified source and mirrors its admission state. Treasury execution and Ledger/Index ingestion live on the backend.

The certified source binds the official ICP Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai`, official Index `qhbym-qaaaa-aaaaa-aaafq-cai`, and receiving numeric subaccount `0` (`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`). Event Horizon is disabled and the fallback is 60 seconds. The binding was checked and the backend reported zero pending records, no scan in flight, and no source or execution error. Ledger exclusive height and Index watermark were both 40,695,077. The latest indexed account transaction was 40,647,922, covered by the unchanged exclusive paid cursor 40,647,923. The transition worker obtains its own cutoff after preparation.

The public Ledger and Index both report a treasury balance of **100,000 e8s (0.001 ICP)**. The full receiving-account history reconciles 108,100,000 e8s gross received with 107,960,000 e8s transferred to the CMC, 40,000 e8s in outbound fees, and 100,000 e8s retained. The last controller treasury record at 23:07 UTC on 24 November showed enabled, idle, no error or pending conversion, and 1,881,495,420,000 cycles credited historically. A fresh treasury worker phase and snapshot inventory require the controller. The available plaintext CLI identity was rejected for mainnet, so the owner must refresh those reads with a secure controller before maintenance. The current balance is below the existing 1,010,000 e8s sweep threshold at the current fee. Credit no treasury funds to the release budget.

### Paid predecessor and release artifacts

The IC-certified head was segment **17,530**, logical time **17,516**, v3 epoch index 15. It has **Rules18 / Schema10 / Adapter12 (`BTZPAY09`)**, two Cannons, two Balls and no authorization grants. Certified `received_e8s` is **108,100,000**. The compact representation is `[[998000,998002],[999000,999002]]`. Each of the four certified cells matches a 1,000,000 e8s official Index transfer with the corresponding `RESERVOIR` memo.

| Certified cell | Coordinates | ICP Ledger position |
| --- | --- | --- |
| 998000 | (0, 998) | 40,640,427 |
| 998001 | (1, 998) | 40,640,372 |
| 999000 | (0, 999) | 40,640,301 |
| 999001 | (1, 999) | 40,640,355 |

| Authenticated boundary field | Value |
| --- | --- |
| Current manifest | `22ca0c89eb939a7a47324b222812306653bc8c6d8f8c7e2048b4ad102d16aa18` |
| Current publication | `9f030b690d1daf8277db05f445bbac8a14e389274e2d10e2c503c08ea2193ea7` |
| Current state | `1a451a566f24628c451b9f49f471599d3ed292423ea236300d94a82c63526222` |
| Rules18 rules | `3925d3aa0ef3fd031627290e6eeccd76f53b985625a25125b50ef34a4a2b4c22` |
| Schema10 | `dfcb89f63c4d0d662b5ba6797ceb56902636e8c3c0d41efb1e902baa5b521e9b` |
| Rules18 configuration | `6bcccdc6cb89cd32b680cead7c1ec7d7b6d7d294a36b44d7dd94be1a261b7934` |
| Source ID | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |
| Source anchor | `25d7197d35ab46d868a0d4cd945959df7890d7763bfa7e5686c07e97d6cb6e52` |
| Rules19 rules | `5312b93341d5f2a3958187a496631b643572d70a893e3c3ffb479896327c78e7` |
| Schema11 | `f9d567927ac1f62f2ffedd3f5672c4c1c4e0eb574a277b9dc5c4fc33415a08ae` |
| Rules19 configuration | `79f182f812a2556cbd1e7d960dc8717440eb65239d9856ca227074963cceea39` |

| Exact raw Wasm | SHA-256 |
| --- | --- |
| Installed Rules18 backend and pre-prepare rollback | `e23f01ebb66685a5e25bdcc31b0ed5341aa6afe4cd9ad1a8a11a3b502ea7e993` |
| Installed frontend and Rules18-only rollback | `8954384cd1141601504e62ad44c902d04d3b638dbee721732b3ebdff05542b9f` |
| Rules19 public backend and post-prepare recovery | `b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de` |
| Rules19 public dual-schema frontend | `48de515cac98524e02a60f48112d8a65ca05bc2cb497528227f22b9e0df855e1` |

The public release excludes developer speed and synthetic controls. The frontend embeds 90 public assets and has inventory SHA-256 `1075bfc9775bf041e49ce059b62d28c07f4a09318ff9a92bdde71c1e63278a70`. The `app.mjs` body SHA-256 is `9b94348bd68e188423c4e55e71abb3a9c6d1ca3544fc666eb9b1efea7868e10a`. The standard run archives the raw release modules in `mainline-public-frontend-wasm` and `wasm-evidence`. The exact-source standard and signed Ledger/Index artifacts independently supplied the same backend Wasm hash. The exact-source hosted frontend archive and both local rollback executables were rehashed. All three hosted runs succeeded, including the browser retained-gap recovery with the developer qualification pair. Seven focused local JavaScript tests passed. [Artifact pins](artifact-pins.json) · [Standard verification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45512136989) · [Signed financial qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45512136835) · [Cost and browser qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45512136843) · [Qualification report](REPORT.md)

## Funding decision

The **2.1T liquid pre-install floor** includes the following allowances. The IC freezing reserve is already reflected in backend liquid cycles.

| Backend budget component | Cycles |
| --- | ---: |
| Liquid held for Trickle re-entry | 1,250,000,000,000 |
| First module upgrade (24,981,878,814 measured) | 25,000,000,000 |
| Drain and cutover (2,539,883,302 measured) | 3,000,000,000 |
| One additional module attempt for rollback or forward recovery | 25,000,000,000 |
| First day at benchmark Trickle | 490,000,000,000 |
| Protected operation and recovery contingency | 257,000,000,000 |
| Unallocated allowance for delay, retry or a third module attempt | 50,000,000,000 |
| **Total pre-install liquid floor** | **2,100,000,000,000** |

The exact gap at the observed balance is **1,324,592,598,289 cycles**. The CMC certificate and witness verified **1.4719T cycles/ICP**, effective 06:24 UTC, equivalent to 14,719 cycles/e8s. The direct ICP Ledger to CMC top-up uses one **10,000 e8s (0.00010000 ICP)** Ledger fee. Compute the direct amount as `ceil(required_cycles / cycles_per_e8s)` and add the ICP fee to the funding balance. Reprice immediately before the owner's transfer and confirm delivery against fresh backend liquid. [CMC conversion](https://docs.internetcomputer.org/references/system-canisters/#cycles-minting-canister-cmc) · [ICP cycles and fees](https://docs.internetcomputer.org/concepts/cycles/)

| Direct CMC funding target | Net cycles required | ICP converted | ICP required with fee |
| --- | ---: | ---: | ---: |
| Minimum at the observed balance | 1,324,592,598,289 | 0.89992024 | **0.90002024** |
| Recommended with 100B extra liquid | 1,424,592,598,289 | 0.96785964 | **0.96795964** |

At this rate the recommended quote delivers 1,424,592,604,116 cycles and targets **2.2T liquid**. The extra 100B covers balance drift, conversion movement and a higher first-day burn. An owner authorization ceiling of **1.00010000 ICP including fee** allows repricing while keeping the release budget finite. Use a separately funded owner account. The frontend needs **zero top-up** at this observation. Its 1.139T estimated liquid is about **689.5B beyond** the 450B frontend installation and recovery allowance. The 185.488B candidate install benchmark used the developer frontend and the 181.100B recovery benchmark used the exact installed frontend. An additional exact-public-pair PocketIC rerun was blocked by local disk capacity. [Measured frontend and backend costs](measurements.json)

### Seven and thirty days of Trickle

At the existing 10 milliticks/s and one publication per tick, Trickle can schedule 864 checkpoints/day. The benchmark uses 0.387223225B per checkpoint plus 0.153T/day background. Use the retained-history figure of 0.40850121475B per checkpoint and a conservative 0.260T/day background for planning until the trial measures a mainnet slope. The latest observed decline since the 00:34 UTC Rules18 reading is about 0.256T/day in ReserveProtection. These are two-Ball projections at nominal pacing. Extra paid work, world growth and pricing changes increase the requirement.

|  | Cycles/day | 7 days of burn | 30 days of burn |
| --- | ---: | ---: | ---: |
| Benchmark | 0.487561T | 3.412926T | 14.626826T |
| Retention and live-background planning | 0.612945T | **4.290615T** | **18.388351T** |

Including a 1.35T operating reserve at the end of the window gives conservative total resources of **5.640615T for seven days** and **19.738351T for thirty days**. These amounts include the balance available when the operating window begins. Keep the existing 1.25T Trickle entry, 1.0T Trickle exit and 3.0T Lifeline entry thresholds. A single large runway deposit would select a faster tier. Stage separate owner-approved tranches after the trial, for example replenish near 1.45T to at most 2.8T, with lead time for the observed burn. Include one Ledger fee per tranche. [Adaptive tier policy](../../../canisters/runtime-lab/src/pace.rs)

## Production procedure after explicit authorization

For each same-ID installation, the controller uses `dfx canister install <canister-id> --network ic --identity <secure-controller> --mode upgrade --wasm <verified-raw-wasm> --argument '()'`. The frontend requires the chunked upgrade path. Record the installed certified module hash after every attempt.

1. **Stage both release and recovery pairs.** Retain byte-verified raw Wasm for all four hashes above. Refresh both management statuses, controller-only `controller_funding` and `controller_runtime`, installed predecessor `dev_simulation_speed`, snapshot and frontend chunk inventories, Ledger/Index reachability and the certified head. Require Adaptive on the predecessor, a clean lifecycle and expected resources. Save certified publications, state, events, scores, source descriptor and representative retained receipts. Arrange an owner browser on the original II origin and a maintenance window with no requested payments.
2. **Upgrade the frontend first.** Install the 90-asset dual-schema raw frontend on `s2jxj-liaaa-aaaas-amynq-cai` using the same-ID chunked upgrade path with empty Candid arguments. Verify the certified installed Wasm hash, all asset variants, CSP, and the certified alternative-origins 404. Keep the exact `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io` derivation origin. Check owner II sign-in, sign-out and sign-in continuity with a signed read-only official Ledger query. Confirm historical Rules18 playback, reconnect and the expected closed payment controls during ReserveProtection. If this gate fails, restore the exact predecessor frontend by upgrade while Rules18 is authoritative and halt. [Operator recovery policy](../../../docs/operations/S14_OPERATOR.md) · [Permanent II origin](../../../docs/specs/B2Z_RULES18_DELEGATED_PAYMENTS.md#permanent-european-internet-identity-origin)
3. **Pause while protected, then fund.** After frontend acceptance, close stale operator tabs and call `pause_autonomous` on the backend. Confirm authoritative pause, safe source state and disabled Copy and Pay in a new tab. The owner tops up the exact backend ID through the CMC and waits for completed notification and a fresh, signed read of at least 2.1T liquid, with 2.2T targeted. Funding after pause avoids running expensive Rules18 checkpoints during maintenance. Confirm the adaptive admission tier can open while the paused browser still withholds payment instructions. Preserve existing treasury and pacing policy.
4. **Install the backend with the epoch still on Rules18.** Upgrade `s5ir5-gqaaa-aaaas-amyna-cai` using the normal `b258ec…` raw Wasm and empty Candid arguments. Measure the total-cycle delta separately from subsequent activity. Verify the certified module, paused operation, unchanged Schema10 predecessor bytes, source binding and cursor, historical receipts, and current funding and lifecycle state. If an authorized lifecycle rollover advances the head, authenticate its retained predecessor and match the paid-state projection before proceeding. Wait for restored source reconciliation. Allow IC install-rate recovery time if a second module attempt is needed. Recheck that the reserve covers cutover and forward recovery before preparing the transition.
5. **Prepare and drain.** Call `prepare_compact_reservoir_transition()` once. Decode the canonical `Ok` blob from `compact_reservoir_transition_status()` and cross-check `controller_work`, `lab_status`, and the certified predecessor. Wait for `ready`, no lifecycle error or barrier, checked source binding, no in-flight or pending work, and Index coverage at least the worker's exclusive Ledger cutoff. Authenticate the exact post-drain predecessor manifest and source receipt order. Legitimate queued pre-cutoff payments must be accounted for before commitment. Use the resulting sealed manifest for the next step.
6. **Commit and verify while paused.** Call `commit_compact_reservoir_transition("<authenticated-ready-predecessor-manifest>")`. Check `complete` and authenticate the zero-time Rules19 epoch, its predecessor linkage and metadata-version-15 digest. Verify the successor against the schema migration, including the four Reservoirs, logical boundary, source ID/cursor/anchor, Adapter12, tariffs, ownership, Cannons, Balls, credits, authorizations, receipts and scores. Authenticate byte-identical retained predecessor artifacts. Verify the source rebinds and the metadata and state can be independently replayed.
7. **Run the bounded trial.** Start with the paused background measurement below. Resume with `start_autonomous(record { segment_ticks = 1 : nat64; pacing_seconds = 1 : nat32; work_budget = 512 : nat32 })` only when the paused checks pass. Keep the public build and Adaptive Trickle. Record the trial results and hand control back to the owner with live reserves and the measured runway.

### Rollback and recovery boundary

The last safe Rules18 binary rollback is **before the first durable compact preparation record**, after verifying `transition: null` and an intact Schema10 head. The old backend upgrade and old frontend upgrade are then available. Authenticate restored state and lifecycle before any approved resume. A timed-out preparation response is ambiguous until controller status and the certified head establish the actual boundary.

Once the record exists, including its `ledger`, `index`, or `drain` phases while the public world still reports Rules18, keep the dual-schema frontend and recover forward with the exact `b258ec…` backend via same-ID upgrade. Keep the game paused, restore normal source availability and allow the existing worker to continue the durable fence. Read status after each uncertain operation. At `ready`, re-authenticate the stored predecessor and retry commitment only with that exact manifest. At `complete`, verify the certified successor and proceed with acceptance. A failed check after commitment calls for a compatible forward repair while paused. Use the zero-snapshot policy and preserve existing durable state throughout. A Wasm archive recovers executable code. Loss of durable state would require a separately verified state-recovery procedure.

## Bounded mainnet operating acceptance

Use a **45-minute measurement cap** after the verified compact commit, a **40B total-cycle trial cap** outside the release install/cutover charges, and a **1.35T liquid stop floor**. Sample both canisters before and after. Stop on an unexpected tier, source or lifecycle error, an unexplained balance credit, an economic-policy mismatch, or resource pressure. If a gate fails, pause through the approved operator path and retain the dual-schema release for recovery. These are proposed trial gates. The underlying policy thresholds stay as compiled.

1. **Background window.** Once paused and settled, sample for 12 minutes. Capture timestamped total and liquid cycles, driver counters, source Index calls and treasury status at matching endpoints. Require zero checkpoints and approximately 12 one-minute fallback polls. Record the total debit and daily slope `debit × 86,400 / elapsed_seconds`. Compare with the conservative 0.260T/day planning envelope. Separate management idle charges, query samples and known credit movements from deployment and gameplay costs.
2. **Checkpoint window.** Resume Trickle and collect 12 consecutive ordinary one-tick checkpoints within 25 minutes. Sample `controller_runtime`, `lab_status`, certified heads, and total and liquid cycles with stable endpoint conditions. Calculate the raw total debit per completed checkpoint and the background-adjusted estimate using the paused slope. Report `callback_count` and driver-message deltas per checkpoint, elapsed spacing, population, Index calls and treasury movements. For two Balls, require at least 10 of the 12 checkpoints to finish in one working callback and investigate any extra callbacks. The proposed mean incremental cost gate is **≤0.60B/checkpoint** against the 0.387–0.409B disposable reference. Treat contaminated or insufficient windows as inconclusive and stop at the time or debit cap.
3. **Browser and financial continuity.** On the same certified HTTPS origin, exercise current Chrome/Chromium desktop and narrow mobile layouts with normal browser policy. Check historical Schema10, live Schema11, all four Reservoirs, verified playback and warm tab return. Hold a second observer at the authenticated Rules18 predecessor across the cutover. Continue within the trial cap until `retention_status` confirms eviction of the next required publication, then reconnect and check certified resync. The current catalog retains 16 entries, so allow up to 16 advancing compact checkpoints after the transition. If eviction falls beyond the time cap, mark mainnet gap coverage pending and retain the hosted proof. Label controlled network interruption separately from native visibility. Check disabled payment controls while paused, admission open on healthy Trickle, native exact manual-wallet Copy and the optional II signed Ledger read. Compare the exact quote and memo bytes against Adapter12 and certified tariffs. Verify sampled pre-existing receipts, accepted boundary inputs and unchanged paid totals unless separately reconciled to a spontaneous customer payment. Use disposable valueless Ledger/Index qualification for actual new-payment execution. The mainnet acceptance sends no approve, transfer, transfer-from, grant, revoke or gameplay payment.
4. **Closeout.** Independently replay the boundary and captured live checkpoints, compare state/event/score bytes and verify financial, source, reserve and browser gates. Report actual install, cutover and measurement debits separately, remaining liquid and total cycles, frontend recovery headroom, and the revised day-rate. Keep Adaptive Trickle when the approved gates pass. Hold further rollout on an inconclusive or failed gate.
