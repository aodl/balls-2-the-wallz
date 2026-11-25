# Rules19 European activation and operating trial

Rules19 activated on 25 November 2026 on the existing European canisters. The bounded Lifeline trial passed and autonomous gameplay was paused at 08:00:32 UTC. The qualified source was `3f93d8b4c57f3c0ba752f3a8f6975e76069b9dc7`. The only production mutations were the authorized pause and resume operations, canister upgrades and compact epoch transition. [Preflight](PRODUCTION_PREFLIGHT.md) · [Artifact pins](artifact-pins.json)

| Canister | Certified installed Wasm SHA-256 |
| --- | --- |
| Frontend `s2jxj-liaaa-aaaas-amynq-cai` | `48de515cac98524e02a60f48112d8a65ca05bc2cb497528227f22b9e0df855e1` |
| Backend `s5ir5-gqaaa-aaaas-amyna-cai` | `b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de` |

The frontend installed first and passed certified checks of all 90 public assets and their 96 representations. The browser verified the paused Rules18 experience before the backend upgrade. The backend installation window used 24,195,032,844 cycles. Immediately after installation, the Rules18 publication, state, event and score bytes matched the paused predecessor. The later commitment window used 1,538,497,750 cycles.

## Certified paid-state continuity

| Field | Value |
| --- | --- |
| Rules18 predecessor at segment 17,575 | `2933e18232da97d129dbfff84ebd2d525e09bb250e2322423278bdc21a30bd2a` |
| Rules19 cutover at segment 17,576 | `1b6559ca4b336194d17d54f3423115ce901f5ee8e6cfd6dd7245dd3e2bceae3c` |
| Final Rules19 manifest at segment 17,638 | `7845eee2d8ec88117a35b605718df6eb3aad14eac2a333b32db6ac39e2a8d367` |
| Exclusive Ledger cutoff and Index watermark at commitment | 40,695,827 |
| Paid source cursor | 40,647,923 |
| Source anchor | `25d7197d35ab46d868a0d4cd945959df7890d7763bfa7e5686c07e97d6cb6e52` |
| Paid total and Reservoir cells | 108,100,000 e8s, cells 998000, 998001, 999000 and 999001 |

Independent transition replay matched the complete Schema11 state projected from Schema10, the authenticated metadata-version-15 commitment and the retained predecessor artifacts. The source descriptor, Adapter12, paid structures, ownership, credits, authorization registry and financial totals carried across the zero-time boundary. The final Index account history still held 11 transfers with the latest at 40,647,922 and 100,000 e8s in treasury. The treasury worker reported idle and healthy. Independent JavaScript replay matched state, event and score bytes for segments 17,577–17,582 and 17,633–17,638. No gameplay transaction was sent for the trial.

## Operating measurements

Trials used existing one-tick Adaptive Lifeline configuration with Full Speed excluded from the public build. The entire window ran for 24 min 52 s and the settled active measurement window for 20 min 28 s. The game completed 62 ordinary checkpoints using 62 callbacks and 62 driver messages. The cost estimate uses 61 complete intervals between active balance samples. The two-Ball population and financial source cursor stayed fixed.

| Measure | Cycles |
| --- | ---: |
| Settled total trial debit including pause and resume | 28,968,099,985 |
| Margin below the 40B cap | 11,031,900,015 |
| Paused background debit over 255.34 s and five Index polls | 555,278,114 |
| Short-window background projection per day | 187,888,664,355 |
| Gross per ordinary active checkpoint | 456,003,268 |
| Background-adjusted per ordinary checkpoint | 412,223,876 |
| Median of 43 intervals with one checkpoint and no new Index poll | 415,565,954 |
| Trickle projection per day at 864 checkpoints | 544,050,093,204 |

The initial paused monitor stopped on a temporary 84.4B balance decline. A subsequent settled read recovered roughly 84.1B with no checkpoint or treasury credit. Later raw samples reproduced temporary excursions during Index calls. The resumed monitor used settled readings, retained the original start balance and time for budget enforcement, and stopped sampling at the original time limit. The gross and adjusted checkpoint costs come from settled samples. The 0.412B estimate is about 90.4% below the qualified 4.282B Rules18 baseline and about 6.5% above the qualified 0.387B compact result. The Trickle projection corresponds to about 3.81T per seven days or 16.32T per thirty days of burn at this workload. [Qualification measurements](REPORT.md)

The backend ended with 3,468,020,801,142 liquid and 3,528,089,587,662 total cycles. The frontend management balance was 1,158,637,667,461 cycles with estimated liquid headroom of 955,495,902,361. Both canisters retained 30-day freezing thresholds and reported zero reserved cycles. The short trial supports monitored continuation at the observed workload. Longer-run billing and performance under a larger world remain open.

## Browser and admission

Chromium authenticated live Schema11 delivery at widths 1440, 390 and 320 and performed native manual-wallet memo copying with `FIRE 1 37.5 1`. On the exact established frontend origin, the Internet Identity entry opened the real `id.ai` provider. The canister-ID derivation origin and certified alternative-origins 404 were preserved. A new owner authentication ceremony was outside the browser run. A separate controlled query interruption held an observer at 17,576, confirmed eviction of its next required publication, and recovered at 17,594. The final paused browser disabled payment preparation and preserved local editing. The seven focused JavaScript tests passed.

The [machine-readable production evidence](production-evidence.json) records both executable identities, the cutover, the exact replay artifact digests, checkpoint observations, final balances and browser results. Raw controller, certificate, replay, browser and sampling results are retained under `.work/rules19-rollout-20261125/` in the release worktree.
