# Rules19 capped Trickle production activation

Continuous capped Trickle passed the production acceptance on 25 November 2026. The existing European canisters remain in service with Rules19 Schema11 and Adapter12. Gameplay is running at 10 milliticks per second with one logical tick per checkpoint. The funding tier is Lifeline, resource admission is open, and Full Speed is off.

## Installed release

The installed source is `741dbf898ade58ed2fa3a064d8bbe1acb577ed4a`. All 11 substantive hosted jobs passed on that commit. [Standard verification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45633690667) · [Financial qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45633690844) · [Developer speed](https://github.com/aodl/balls-2-the-wallz/actions/runs/45633690703)

| Role | Existing canister | Installed SHA-256 | Compatible rollback SHA-256 |
|---|---|---|---|
| Frontend | `s2jxj-liaaa-aaaas-amynq-cai` | `2a6da764e4e7f63bf367bc6e55265df00a4714121019e895e67d0598521475ff` | `48de515cac98524e02a60f48112d8a65ca05bc2cb497528227f22b9e0df855e1` |
| Backend | `s5ir5-gqaaa-aaaas-amyna-cai` | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` | `b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de` |

The controller and both published predecessor hashes matched before installation. The frontend finished first at `2026-11-25T19:31:15Z`. Production HTTP certification verified 91 assets, 98 asset representations and 28 route responses. The established canister-ID Internet Identity origin and its certified alternative-origins response were verified. The backend completed its in-place upgrade while paused at `2026-11-25T19:34:08Z`.

The certified head stayed at **17,638** across the upgrade. All 16 available publications and their state, event and score bytes matched. The certified state preserved the authorization registry, receipts, ownership, scores, 108,100,000 e8s of received value and Reservoirs at 998000, 998001, 999000 and 999001. The source cursor remained 40,647,923. The official Index returned the same 11 account records before and after the acceptance, with its newest record at 40,647,922 and a 100,000 e8s treasury balance. The treasury worker stayed enabled and idle.

## Production acceptance

The first run reached eight published checkpoints and stopped roughly 28 seconds before its 15-minute endpoint. The off-chain monitor had allowed about four seconds for an Index reservation to clear. The Index call settled normally, and the controller and certified reads confirmed a healthy source, unchanged financial cursor and safe pause. Independent replay matched all eight checkpoints. The second run retained the same production protection and health checks, with a longer read window for settling transient reservations.

| Measurement | Result |
|---|---:|
| Second acceptance, UTC | 2026-11-25 19:54:14 to 2026-11-25 20:09:19 |
| Duration | 905.5 s |
| New checkpoints and callbacks | 9 and 9 |
| Time between certified ordinary checkpoints | 100.030–100.317 s |
| Independent replay | 9 checkpoints, head 17,647 to 17,656 |
| Index calls | 15 calls |
| Gross backend operating debit | 5,461,510,462 cycles |
| Isolated checkpoint debit, median | 414,414,471 cycles |
| Paused background observation | 106,419,666 cycles in 72.0 s |
| Backend installation window | 23,560,750,109 cycles |
| Frontend installation window | 185,514,872,901 cycles |

Checkpoint timing comes from the authenticated checkpoint wall timestamps. Replay compared the complete state, event and score bytes. Isolated cost uses adjacent settled polls with one checkpoint and no Index-call counter change. The gross reading includes background expenditure. The second window used consecutive settled observations to exclude interleaved reservations. The paused measurement covers a short observation with one Index poll. Installation windows include routine balance changes during measurement.

Chromium authenticated an advancing Rules19 head at 0.01 ticks/s with no delivery failure. The 1440-, 390- and 320-pixel browser checks copied the exact manual-wallet memo through the native clipboard and kept direct payment hidden while signed out. The acceptance submitted no gameplay transaction.

## Reserves and owner access

| Canister | Total cycles | Liquid cycles |
|---|---:|---:|
| Backend, acceptance end | 3,411,268,771,894 | 3,353,535,712,714 |
| Frontend, post-acceptance management read | 969,769,783,441 | 766,063,966,651 estimated |

Both canisters retained their 30-day freezing thresholds. The backend retains its 1T liquid ReserveProtection entry. The 15-minute debit projects to 0.521T cycles/day at this workload. The previous conservative model projects 0.544T/day, allowing about 4.3 days from the acceptance endpoint before ReserveProtection and about 2.4 days before falling below the 2.07T minimum to arm a default Full Speed window. These are workload-based estimates.

The controller re-established the previously verified owner binding at `2026-11-25T19:35:14Z`. Anonymous access was denied, and Chromium opened the real provider at `https://id.ai` from the permanent origin. The owner can open **Game status → DEV ONLY · Simulation speed → Sign in as owner** to complete the real authentication ceremony. The acceptance left the speed override inactive. [European game](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io)

[Production measurements and replay](production-measurements.json) · [Same-canister installation and recovery](../../../docs/operations/B2Z_PRELAUNCH_TRICKLE.md)
