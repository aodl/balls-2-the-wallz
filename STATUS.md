# B2Z current status

Operational observation **2026-11-26 15:45:39 UTC**. The current published source is
[`0855896239ba222892a372e6eeba22530fa59afc`](https://github.com/aodl/balls-2-the-wallz/commit/0855896239ba222892a372e6eeba22530fa59afc)
on the maintained master branch.
The installed source is `741dbf898ade58ed2fa3a064d8bbe1acb577ed4a`.
Rules19 / Schema11 / Adapter12 (`BTZPAY09`) runs in the capped
`prelaunch-trickle` profile. This is controlled European prelaunch.

| Installation | Canister | Certified raw module SHA-256 |
| --- | --- | --- |
| Backend | `s5ir5-gqaaa-aaaas-amyna-cai` | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` |
| Embedded frontend | `s2jxj-liaaa-aaaas-amynq-cai` | `2a6da764e4e7f63bf367bc6e55265df00a4714121019e895e67d0598521475ff` |

## Operating position

- The authenticated head was segment **18,360**, logical time **18,344**.
  It contained two Cannons under one distinct funding account, two Balls,
  one Diverter and four Reservoir tiles. The funding-account count is
  derived from active Cannons. It does not measure unique humans or
  historical participation.
- Gameplay was running, admission open, 0.01 ticks/s and one tick per
  checkpoint. Full Speed was inactive as inferred from the effective
  rate. The observed public label **Trickle** describes the capped
  operating mode. The underlying private funding tier and owner-only
  eligibility gates could not be freshly read.
- Signed source health showed the official Index bound, no error,
  zero pending records and cursor **40,647,923**. Event Horizon was disabled
  in the installed configuration. The private treasury-worker state was not
  freshly established in this observation.
- Settled management readings had backend total **2.975029T** and estimated
  liquid **2.917196T** cycles. Frontend total was **0.964347T**. Estimated
  freezing reserve was approximately 0.057834T backend and 0.203706T frontend.
- Backend liquid was above the 2.07T default Full Speed cycle floor.
  Across a 10,965.596-second settled bracket with 110 ordinary publications,
  backend liquid declined 69.229B cycles, equivalent to **0.545470T/day**
  of observed net balance movement. Under the same workload, with no
  intervening credits, about **3.51 days** remained to the 1T protection
  boundary and **1.55 days** to the Full Speed cycle floor. These dated
  projections are not gross charges or guarantees. Review the runway before
  owner playtesting or any separately approved operation.

[Latest reviewed production observation](evidence/B2Z/development-programme/production-observation-2026-11-26-1545.json) · [Previous observation](evidence/B2Z/development-programme/production-observation-2026-11-26-1449.json)

The raw signed read-only observation and its settled cycle bracket are retained
in the operator's development-programme archive. Its SHA-256 is recorded in
the reviewed observation linked above; the raw capture stays outside Git.

## Qualification and acceptance

The installed source passed all 11 substantive hosted jobs and on
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
focused corrections; their earlier failures remain preserved. A separate
historical Shout browser fixture failure has a focused local correction on
[PR #18](https://github.com/aodl/balls-2-the-wallz/pull/18), with exact-source
hosted qualification pending. Production installation has not occurred.
The Rules20 construction, corner and pricing successor remains incomplete and
inactive. A disposable Ledger/Index test identified an existing Rules19
authorization-registry encoding boundary for some valid accounts; a compatible
versioned backend repair is outstanding. Sustained Full Speed throughput,
physical devices, dense-scene P09
qualification and wider-launch readiness remain open. Automatic player payouts
and refunds are unavailable.

[Outstanding-work register](ROADMAP.md) · [Repository consolidation](evidence/B2Z/repository-consolidation/REPORT.md) · [Historical status](https://github.com/aodl/balls-2-the-wallz/blob/315fe2ff1ff873c16e8f693025cc625b0ae59cab/STATUS.md)
