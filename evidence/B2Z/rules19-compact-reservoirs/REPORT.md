# Compact Reservoir qualification

Rules19 and Schema11 preserve the paid 1,000 × 1,000 world and the existing Adapter12 `BTZPAY09` financial wire. The four Reservoirs at 998000, 998001, 999000 and 999001 migrate to `[[998000,998002],[999000,999002]]`. The serialized range array is 33 bytes. The old bitmap was 249,751 bytes. At the observed cutover the full state fell from 274,953 to 25,239 bytes, a reduction of 249,714 bytes (90.8%). The two-Ball committed coordinator image was 70,740 bytes after four compact checkpoints. The legacy-publication probe occupied 572,951 bytes at the corresponding endpoint despite its smaller private representation.

The canonical form uses binary-searchable half-open occupied ranges, with a bounded lowercase bitmap when there are more than 14,000 occupied runs. Both validators reject malformed, ambiguous and noncanonical data. The cutoff changes the encoding, and the full board remains available for gameplay. The observer generates the GPU occupancy texture from authenticated cells. The water renderer and browser-side animation are unchanged. See the [schema and compatibility contract](../../../docs/specs/B2Z_COMPACT_RESERVOIRS_19.md).

## Measured costs

PocketIC used the captured paid-world seed at segment 17529, original high-cell locations, and the 13-node application subnet schedule. All four columns are measured balance deltas. Values are billions of cycles. Checkpoint cases used a 512-unit work budget and four ordinary checkpoints. Payment includes real valueless Ledger/Index admission and its checkpoint. Idle and protected rates extrapolate from 900 virtual seconds with 15 fallback polls and zero checkpoints. The compact instrumented column includes validation, publication, certification, retention and instrumentation. [Cycle cost schedule](https://docs.internetcomputer.org/references/cycle-costs/)

| Workload | Unit | Rules18 exact | Small optimisation | Rules19 instrumented | Rules19 plain |
| --- | --- | ---: | ---: | ---: | ---: |
| Two Balls | Checkpoint | 4.282 | 4.081 | 0.387 | 0.387 |
| Moderate, 14 Balls | Checkpoint | 4.457 | 4.250 | 0.528 | 0.523 |
| Large, 86 Balls | Checkpoint | 5.302 | 5.081 | 1.226 | 1.224 |
| Paid join | Admission and checkpoint | 7.716 | 7.254 | 0.828 | 0.823 |
| Idle, admission open | Day | 146.4 | 130.6 | 118.9 | 116.8 |
| ReserveProtection | Day | 199.1 | 166.5 | 153.2 | 151.7 |

The plain developer backend used 1,548,892,900 cycles for four two-Ball checkpoints, or 0.387223225B each. That is 91.0% below the exact baseline. With retention saturated it used 0.409B per checkpoint across four checkpoints. Moderate and large committed coordinator images were 80,352 and 115,632 bytes in the instrumented runs. The compact cutover includes a predecessor drain. Cost windows start from the same captured world and retain the same Reservoir locations, populations and ordered input scenarios. The independent legacy-versus-successor replay pins the state, logical start and input order exactly across both encodings, including the cutover predecessor.

The internal-only experiment retained the Rules18 public bytes and matched all 20 checkpoint artifacts byte for byte. It cost 2.802B per checkpoint and still needed two callbacks. Re-encoding the large public representation, hashing and retaining it account for substantial ongoing work even with a compact private state. Schema11 removes it from the ordinary hot path. Its four checkpoints each completed in one callback.

| Per-checkpoint measurements | Rules18 instrumented | Rules19 instrumented |
| --- | ---: | ---: |
| Complete driver, instructions | 4,242,536,220 | 362,930,933 |
| Coordinator restore, instructions | 796,705,522 | 33,612,469 |
| Seal, instructions | 693,799,237 | 64,958,357 |
| Step, instructions | 1,167,089,795 | 130,494,210 |
| Publish, instructions | 532,278,160 | 38,495,369 |
| Persist, instructions | 785,115,113 | 70,965,271 |
| Snapshot within persistence, instructions | 42,188,614 | 1,864,328 |
| Stable image/current bytes read and written | 3,967,370 | 206,953 |
| Additional retained-history bytes written | 291,419 | 37,304 |

The full driver includes overlapping subspans. Certification itself used approximately 1,065 instructions per compact checkpoint. Most of the persistence cost was preparing and committing the certified catalog and artifacts. At the standard 13-node rate the compact span accounts for ~0.363B of ~0.387B net per checkpoint. The ~0.024B gap includes costs outside the instrumented spans and system charges. The measurements do not assign individual charges to that residual. Allocated stable pages stayed at 513 in both active samples. Protected operation still polls Index on its original 60-second schedule. The lower measured protected number is an incidental result of the retained optimisations and smaller Schema11 state. The earlier live slope near 0.257T/day has a different retained journal and source workload.

## Deterministic proof

The disposable transition authenticates the production-format predecessor, checks the same source cursor and anchor, and reads the exact retained predecessor through the installed canister. The two-Ball cutover manifests were `df8b5bc7b09b6acc9ffc5236c35585197e93904831697d939bbc37b359b0f9df` and `c196b3ccf0b3c8860af5c4f5a070b3bed4f39dfe6e1a8ad4694d7b3cb485857c`. The old state hash was `6dfdaf47acc245c54f7e2bc3ecb22c6ecf9c1c47137fbf806c4afd3bc64d7d54`. The compact state hash was `4e4befda1e7a02d8870b27ba1e2eddc123cf4a4cb6274c9bdca8510fbbb75a5d`. Original historical files and frozen artifacts are retained.

The independent JavaScript replay checks exact successor state, event and score bytes against installed outputs. A second replay of the same ordered inputs in the legacy kernel compares ownership, trajectories, scores, placement, receipts and spawn seed after mapping the encoding and version tags and proving the tariff predecessor reference. An authorized Cannon construction or legacy angle input that can start a join computes the original Rules18 semantic preimage, including the original bitmap bytes. Ordinary ticks skip that projection. The signed Ledger qualification drains an in-flight Rules18 FIRE payment, admits a later Rules19 FIRE, and independently checks 20 authenticated publications. The unchanged Rules18 catalog and proof identities remain part of the standard suite. [Measured counters and replay summary](measurements.json) · [Executable and asset digests](artifact-pins.json)

## Operating projection

One checkpoint per logical tick, the measured two-Ball rate and a 0.153T/day compact background reference give the following ceilings at nominal pacing. They exclude paid joins, growth and IC price changes. A 30-day month is used. Performance limits and adaptive transitions can reduce the number of checkpoints. None of these figures changes an operating threshold.

| Tier | Checkpoints/day | Rules19 T/day | Rules19 T/30 days |
| --- | ---: | ---: | ---: |
| ReserveProtection | 0 | 0.153 | 4.60 |
| Trickle | 864 | 0.488 | 14.63 |
| Lifeline | 4,320 | 1.826 | 54.77 |
| Survival | 8,640 | 3.498 | 104.95 |
| Conserve | 17,280 | 6.843 | 205.30 |
| Steady | 25,920 | 10.188 | 305.65 |
| Economy | 43,200 | 16.879 | 506.36 |
| Cruise | 64,800 | 25.241 | 757.24 |
| Normal or active Full Speed | 86,400 | 33.604 | 1,008.12 |

## Activation and recovery budget

Keep the European frontend `s2jxj-liaaa-aaaas-amynq-cai` and backend `s5ir5-gqaaa-aaaas-amyna-cai`. The derivation origin is permanently `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`. The 2026-11-24 23:07 UTC signed checks recorded 856.129B liquid and 919.972B total backend cycles. The frontend had 1,345.140B total, 0 reserved, a management idle estimate of 6.788B/day and module `8954384cd1141601504e62ad44c902d04d3b638dbee721732b3ebdff05542b9f`. Treasury conversion was enabled and idle with 0.001 ICP observed, no pending conversion and no recorded error. Refresh both balances and the platform freezing requirements before any authorized rollout.

1. Recheck sufficient frontend headroom for installation and recovery. Exact disposable frontend upgrade and rollback consumed 185.488B and 181.100B cycles respectively. Allow at least **0.45T liquid** above the existing freezing reserve, covering both attempts and about 83B contingency. The signed frontend status showed a 30-day freezing threshold and an estimated 6.788B/day management idle charge at the time of the read. Activate the dual-schema frontend first. Check installed Wasm and certified assets, the stable Internet Identity origin, historical playback, native payment Copy and genuine retained-gap reconnect. The old frontend may be restored while the backend remains Rules18.
2. Confirm healthy Ledger/Index, the exact certified predecessor and a recent signed liquid balance. The disposable paid-world backend upgrade consumed 24.982B and the transition 2.540B. A preliminary **2.1T liquid** backend review floor allows the 1.25T Trickle entry threshold, two 25B module attempts, a 3B transition, a 0.49T first day at Trickle and 0.257T protected contingency. The current reading is below the existing entry floor and this rollout budget. Review the actual balance, storage and timing before choosing when to activate.
3. Upgrade the same backend and verify restored Schema10, Ledger cursor, certified predecessor, funds, source binding and acceptance of queued inputs. An old binary can be restored before preparation. Allow time for IC installation rate limits between successive module attempts. Pause authoritatively, prepare the compact transition, and wait for the existing source drain and binding checks. Commit against the exact predecessor manifest only after verifying payment and resource readiness. Then check the new epoch, paid state, receipts, resync, reserve and measured operating slope. From durable preparation onward, recovery requires the dual-schema module because the old module rejects the new transition record. Keep a known-good dual-schema executable available for that boundary.

Production activation requires a green exact-source hosted qualification, a refreshed resource budget and separate authorization. The mainnet read-only assessment did not spend ICP, fund, deploy, change thresholds or create snapshots. Residual operating exposure comes from fragmented worlds that select bitmap encoding, the legacy entropy cost for occasional Cannon-bearing inputs, population growth, real Index replies and production history that are larger than the disposable fixtures.
