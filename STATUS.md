# B2Z current status

Operational observation **2026-11-27 16:14:19 UTC**. The maintained
[master](https://github.com/aodl/balls-2-the-wallz/commits/master/) verifier source
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

- Authenticated head **19,240**, logical time **19,223** and source cursor
  **40,647,923**. The world contained two Cannons under one funding account,
  two Balls, one Diverter and four Reservoir tiles.
- Gameplay and admission were active at **0.01 ticks/s** with one tick per
  checkpoint. The official Index was bound, with zero pending records and
  no signed source error. Event Horizon was disabled in the installed
  configuration.
- Settled backend total was **2.405T**, liquid **2.347T** and estimated
  freezing reserve **0.058T**. Frontend total was **0.772T**, with a
  **0.204T** estimated freezing reserve and **0.568T** above freezing.
  Conservative frontend installation/recovery headroom was **0.118T**.
- Across two comparable settled observations at 13:31 and 16:14 UTC,
  backend liquidity declined **64.663B cycles**, approximately **0.571T/day**.
  At the observed workload
  and without intervening credits, the conditional projection was
  **11.7 hours** to the 2.07T default Full Speed cycle floor and **2.36 days**
  to the 1T protection boundary. The
  balance floor is one of the owner's Full Speed eligibility checks; crossing
  it does not by itself stop ordinary Trickle operation.
  An earlier bracket rebounded by 83.7B cycles in 34 seconds. The projection
  uses the repeated comparable observations.

[Preflight, installation, browser and later observation](evidence/B2Z/development-programme/production-manufacturing-2026-11-27.json)

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
checkerboard corners and symbolic tariffs. A dedicated authenticated recovery
operation now repairs the demonstrated obstructed Rules19 predecessor in a
disposable installed test, preserving its complete ordered pending prefix and
historical Rules19 policy. Exact Rust/JavaScript replay and subsequent ordinary
Rules20 activation passed with the pinned candidate. A second installed case
retired four genuine pending inputs in order, including two grants and two
paid commands at Rules19 prices, with independent replay. The adversarial recovery
matrix and other feature-specific gates remain open. A further installed case
retired six pending grants, a revoke and paid inputs in original order. A
fresh UTC-crossing case passed recovery preparation before midnight,
commitment after midnight, same-ID restart, ordinary Rules20 activation and
exact independent public replay. A separate disposable resource case proved
that the exact recovery executable rejects preparation and commitment below
its liquid-cycle floor without changing the publication or pending queue,
then completes recovery after headroom is restored. The UTC case's first five
attempts exposed and then isolated a stale lifecycle error and an observer
endpoint validation gap;
the failed runs remain recorded in the recovery report. The earlier source
`95a439e3` passed [standard](https://github.com/aodl/balls-2-the-wallz/actions/runs/45964043400),
[financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45964043269)
and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45964043439)
hosted jobs, including the named installed successor gates. The recovery branch
is under fresh hosted qualification and is **not** a production
release candidate. Four local
authenticated high-population payment cases passed. The certified burn
meter remains disabled and is tracked separately. Sustained Full Speed throughput,
physical devices, dense-scene P09
qualification and wider-launch readiness remain open. Automatic player payouts
and refunds are unavailable.

[Outstanding-work register](ROADMAP.md) · [Repository consolidation](evidence/B2Z/repository-consolidation/REPORT.md) · [Historical status](https://github.com/aodl/balls-2-the-wallz/blob/315fe2ff1ff873c16e8f693025cc625b0ae59cab/STATUS.md)
