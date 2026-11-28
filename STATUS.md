# B2Z current status

Latest settled operational observation **2026-11-28 00:29:56 UTC**. Published
[master](https://github.com/aodl/balls-2-the-wallz/commits/master/) remains
`cf6605efecd0115b1faebaec37f5efafedad3a40`; its qualified implementation/tooling ancestor
[`ae734acdc431adf69978ab41be07a8222139c69d`](https://github.com/aodl/balls-2-the-wallz/commit/ae734acdc431adf69978ab41be07a8222139c69d)
passed the [standard](https://github.com/aodl/balls-2-the-wallz/actions/runs/45923880788),
[financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45923880915)
and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45923880797)
qualification. The paid backend runs Rules19 / Schema11 / Adapter12
(`BTZPAY09`) in the capped `prelaunch-trickle` profile.

| Installation | Canister | Qualified source | Certified raw module SHA-256 |
| --- | --- | --- | --- |
| Paid backend | `s5ir5-gqaaa-aaaas-amyna-cai` | `741dbf898ade58ed2fa3a064d8bbe1acb577ed4a` | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` |
| Embedded manufacturing frontend | `s2jxj-liaaa-aaaas-amynq-cai` | `0855896239ba222892a372e6eeba22530fa59afc` | `1a22f9aca323738492db1df02acf021753b665dd468c9d3b916d23289057dff5` |

## Operating position

- Authenticated head **19,538**, logical time **19,520** and source cursor
  **40,647,923**. The world contained two Cannons under one funding account,
  two Balls, one Diverter and four Reservoir tiles.
- Gameplay and admission were active at **0.01 ticks/s** with one tick per
  checkpoint. The official Index was bound, with zero pending records and
  no signed source error. Event Horizon was disabled in the installed
  configuration.
- Settled backend total was **2.207T**, liquid **2.149T** and estimated
  freezing reserve **0.058T**. Frontend total was **0.770T**, with a
  **0.204T** estimated freezing reserve and **0.566T** above freezing.
  Conservative frontend installation/recovery headroom was **0.1160T**.
- Across comparable settled observations at 23:29 and 00:29 UTC,
  backend liquidity declined **24.705B cycles** in 3,632 seconds across
  37 publications, approximately **0.588T/day**. At that workload, the
  conditional intervals from the 00:29 balance are **3.23 hours** to the
  2.07T default Full Speed cycle floor and **1.96 days** to the 1T
  protection boundary, absent credits or a workload change. The
  balance floor is one of the owner's Full Speed eligibility checks; crossing
  it does not by itself stop ordinary Trickle operation.
  An earlier bracket rebounded by 83.7B cycles in 34 seconds. The 20:27
  observation was unsettled and excluded; this projection uses settled
  comparable observations. Funding before any desired
  future Full Speed window is an owner decision; no funding was performed.

[Preflight, installation and browser](evidence/B2Z/development-programme/production-manufacturing-2026-11-27.json) · [Latest reviewed operating observation](evidence/B2Z/development-programme/production-operating-2026-11-28-0029.json)

## Qualification and acceptance

The installed backend source passed all 11 substantive hosted jobs and on
25 November passed the production capped Trickle acceptance. Its
905.5-second accepted window covered nine checkpoints 100.030–100.317 s
apart, exact independent replay, and authenticated browser/manual-wallet
behavior at three viewport sizes. No gameplay transfer was sent in that
acceptance. The earlier paused Rules19 trial remains historical.

The owner binding was established, anonymous owner access was denied, and
the official identity provider opened on the permanent origin. The latest
real owner sign-in is pending. Earlier Rules18 real sign-in and signed
Ledger read are separate release evidence. [Owner acceptance procedure](docs/operations/B2Z_PRELAUNCH_TRICKLE.md#owner-sign-in-acceptance)

[Standard qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45633690667) · [Financial qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45633690844) · [Developer/Trickle qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45633690703) · [Production acceptance](evidence/B2Z/prelaunch-trickle/PRODUCTION.md) · [Exact installed and recovery artifacts](docs/operations/PRODUCTION_RELEASES.md)

## Continuation

Complete owner acceptance and manage dated runway. Cannon/Diverter manufacturing,
the interaction and audio addendum, and verified-coverage corrections are in
the [qualified frontend candidate](evidence/B2Z/development-programme/frontend-candidate.json)
from source `0855896`. All eleven substantive hosted jobs passed on that exact
source ([standard](https://github.com/aodl/balls-2-the-wallz/actions/runs/45833070734),
[financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45833070824),
[developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45833070929)).
The exact developer frontend Wasm and all six prerelease assets were retrieved
and rehashed; a byte-identical module passed disposable same-ID frontend
upgrade and recovery. [Frozen prerelease](https://github.com/aodl/balls-2-the-wallz/releases/tag/candidate/europe-prelaunch-frontend-manufacturing-2026-11-26).
The short and full 900-second local installed reliability cases passed after
focused corrections; their earlier failures remain preserved. The later
Deflector clipboard and audio-contact browser fixture failures also remain
recorded as FAIL, with qualified corrections in the [programme report](evidence/B2Z/development-programme/REPORT.md).
The [read-only operator tool](docs/operations/B2Z_PRELAUNCH_TRICKLE.md#read-only-runway-observation)
uses exact settled health-sample time for workload-specific net runway.
The qualified `dcd52e4` tooling source has identical application, canister,
native, dependency, fixture and active-specification Git objects to the prior
qualified master; [input-invariance record](evidence/B2Z/development-programme/tooling-input-invariance.json).
The manufacturing frontend was installed in place on 27 November. Certified
delivery, the existing backend binding, the permanent Internet Identity
origin and read-only desktop/390/320 browser acceptance passed. The earlier
capped Trickle frontend is retained for exact compatible recovery.

Rules20 development implements Schema12 authorization, initial passage,
checkerboard corners and symbolic tariffs. The separate successor branch now
has a positive exact-installed recovery from the obstructed Rules19 journal.
Published `adc5a8e1` passed financial and developer/prelaunch workflows with
22 named installed successor cases; its standard workflow remains active.
Further installed destruction, corner and adversarial recovery gates keep
Rules20 off production.

Certified operational burn remains **disabled in normal release profiles**.
The optional branch's replicated self-status meter passed the established
active Trickle, shifted Index phases, held reservation/refund, bounded Full
Speed, identified treasury credit and ReserveProtection comparisons. Exact
source `f504ec08` passed hosted financial and developer/prelaunch workflows;
its standard installed-IC job remains active. The maintained live browser
and agent accepted direct and composed roots. Dormant operation, prolonged
unavailability, wider concurrent reservations and a compatible release
profile remain open. Unknown external credits cannot be reconstructed;
the display is an approximate settled net-balance rate. [Detailed burn
evidence](evidence/B2Z/development-programme/CERTIFIED_BURN_SELF_STATUS.md)
records the actual tolerances and limitations. Sustained Full Speed
throughput, physical devices, dense-scene P09 and wider-launch readiness
remain open. Automatic player payouts and refunds are unavailable.

[Outstanding-work register](ROADMAP.md) · [Repository consolidation](evidence/B2Z/repository-consolidation/REPORT.md) · [Historical status](https://github.com/aodl/balls-2-the-wallz/blob/315fe2ff1ff873c16e8f693025cc625b0ae59cab/STATUS.md)
