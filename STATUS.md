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
checkerboard corners and symbolic tariffs. A dedicated authenticated recovery
operation now repairs the demonstrated obstructed Rules19 predecessor in a
disposable installed test, preserving its complete ordered pending prefix and
historical Rules19 policy. Exact Rust/JavaScript replay and subsequent ordinary
Rules20 activation passed with the pinned candidate. A second installed case
retired four genuine pending inputs in order, including two grants and two
paid commands at Rules19 prices, with independent replay. The adversarial recovery
matrix and other feature-specific gates remain open. A further installed case
retired six pending grants, a revoke and paid inputs in original order. A
fresh six-input rerun also applied a valid post-fence Rules20 Fire payment
to the Cannon created by the retained prefix, with exact replay. A
fresh UTC-crossing case passed recovery preparation before midnight,
commitment after midnight, same-ID restart both before commitment and after
the recovery boundary, ordinary Rules20 activation and
exact independent public replay. A separate disposable resource case proved
that the exact recovery executable rejects preparation and commitment below
its liquid-cycle floor without changing the publication or pending queue,
then completes recovery after headroom is restored. The UTC case's first five
attempts exposed and then isolated a stale lifecycle error and an observer
endpoint validation gap; the failed runs remain recorded in the recovery
report.
Two more installed cases preserved an original reserved seal and a partially
executed cursor through the exact Rules19 failure. Version-1 recovery bound
the original seal and stage hash, retired the old inputs in their original
order and at Rules19 prices, then applied a later Rules20 payment. Every
captured public output matched independent JavaScript replay. The controlled
disposable test hook only sealed and stepped genuine admitted inputs; the
exact installed module produced the failure. A genuine ICRC-2 payment whose
original Ledger block time followed the pending grant's seven-day expiry was
retained through the same obstruction. The recovery receipt rejected its
spender under Rules19 policy, preserved its received value, then applied an
unrelated old-policy payment and a later Rules20 payment. This case exposed
the overdue lifecycle timer's exact wait error; the exceptional recovery now
admits that identified error without relaxing ordinary transitions. Exact
independent replay passed. Additional tamper and arrival combinations remain
release gates. The earlier source
`95a439e3` passed [standard](https://github.com/aodl/balls-2-the-wallz/actions/runs/45964043400),
[financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45964043269)
and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45964043439)
hosted jobs, including the named installed successor gates. Published
predecessor source `68430e67` also passed all three hosted workflows,
including standard installed-IC qualification. The installed finite overdue
lifecycle barrier case also completed: the recovered old-policy segment,
an intervening sealed zero-input predecessor interval and a later Rules20
payment all matched independent public replay. Source `b0c93c7f` passed all
three hosted workflows. Later published source `d18efb56` passed its
[financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/46079629817)
and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/46079629827)
workflows; its [standard workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/46079629851)
was superseded and cancellation requested after the same historical browser
predicate failed on the telemetry branch. The corrected standard gate needs
fresh exact-source execution. The later developer artifact records **20 named installed
PASS cases**, including recovery, interrupted passage and paid tariffs. The later
thirteen-row active-owner corner matrix passed 31 native Rules20 public-output
comparisons and focused JavaScript tests; exact-source hosted qualification
subsequently passed in the `adc5a8e1` developer workflow. The recovery branch
is **not yet a final production release**. Four local
authenticated high-population payment cases passed. A subsequent genuine
1,000-account Fire batch paid for the first two of three symbolic Ball
prices; its receipt, frontend quote and independent public replay agree.
Two additional genuine payments retained the previous linear tariff during
the first exponential grace window, including an unrepresentable current
first-Cannon price; both matched the frontend quote and independent replay.
At the authenticated 1,000-account tariff, a further genuine payment bought
the same account's second Cannon for 40 ICP. The target-filtered source
omitted an unrelated preceding Ledger transfer, and the exact receipt,
frontend quote, wallet memo and independent public replay agreed.
An installed 1,037-account case fulfilled exactly one Ball from a two-item
Fire request before the next symbolic price exceeded the Ledger bound; the
receipt, frontend prefix quote and independent public replay matched.
A separate stopped-Index fixture admitted a genuine Ledger payment only
after the first exponential grace window and still selected its original
linear block-time tariff with exact frontend and replay agreement.
An installed partial Fire batch also survived a same-ID restart after its
private cursor had durably priced exactly one Ball from the original sealed
payment. The earlier publication remained identical; the final two-of-three
receipt and independent replay passed. This case is in the named release
suite and passed in the `adc5a8e1` hosted developer workflow.
An installed paid Cannon/Diverter case kept two first-passage exceptions
active through a same-ID restart and subsequent tick. Both pre-existing Balls
kept their exact cells and headings; independent replay matched the public
state, events and scores. The observer now accepts only a bound exception for
a Ball occupying a Diverter. Two later genuine Ledger/Index relocation
payments moved those structures while their exceptions remained active;
the same authoritative segment retired both rows, recorded exact receipts
and matched independent replay. A sealed, partially stepped checkpoint
with both exceptions active survived a same-ID upgrade; autonomous
continuation and later paid relocation matched independent replay.
Structure and Ball destruction remain separate passage gates. A separate
authenticated 1,001-account fixture paid for the first and second personal
Diverters at 2 and 8 ICP with exact receipts, frontend wallet quotes and
independent public replay; the refactored original first-Cannon case passed
again. The named mid-batch overflow, interrupted purchase and Diverter cases
passed in the same hosted developer workflow.
Published Rules20 source `adc5a8e1` passed
[financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/46087123057)
and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/46087123064),
the latter executing all **22 named installed successor cases**. Its exact
backend candidate raw Wasm SHA-256 is
`5c373613320ce733de51da958a1cf16f0e1febc8b788791afe0fc312d7c61a18`.
The separate reproduced Rules20 public frontend candidate is
`c029a5b5d52ba132dcc8981e98bf5445218cc75075a4dea8e6b37c5b6da2fc6c`.
Its disposable same-ID installation over the exact installed manufacturing
frontend and restoration of that frontend passed certified asset/route checks;
the respective PocketIC debits were **184.609B** and **185.525B cycles**.
The [standard workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/46087123070)
is still in installed-IC qualification. The newer local continuation passed
the complete source suite but has not been published or hosted; the
[candidate release procedure](docs/operations/RULES20_RELEASE_PREPARATION.md)
keeps installation conditional on all remaining gates.
The certified burn
meter remains disabled and is tracked separately. Sustained Full Speed throughput,
physical devices, dense-scene P09
qualification and wider-launch readiness remain open. Automatic player payouts
and refunds are unavailable.

[Outstanding-work register](ROADMAP.md) · [Repository consolidation](evidence/B2Z/repository-consolidation/REPORT.md) · [Historical status](https://github.com/aodl/balls-2-the-wallz/blob/315fe2ff1ff873c16e8f693025cc625b0ae59cab/STATUS.md)
