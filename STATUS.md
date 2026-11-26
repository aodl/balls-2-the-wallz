# B2Z current status

Operational observation **2026-11-26 06:47 UTC**. The current published source is
[the maintained master branch](https://github.com/aodl/balls-2-the-wallz/commits/master/).
The installed source is `741dbf898ade58ed2fa3a064d8bbe1acb577ed4a`.
Rules19 / Schema11 / Adapter12 (`BTZPAY09`) runs in the capped
`prelaunch-trickle` profile. This is controlled European prelaunch.

| Installation | Canister | Certified raw module SHA-256 |
| --- | --- | --- |
| Backend | `s5ir5-gqaaa-aaaas-amyna-cai` | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` |
| Embedded frontend | `s2jxj-liaaa-aaaas-amynq-cai` | `2a6da764e4e7f63bf367bc6e55265df00a4714121019e895e67d0598521475ff` |

## Operating position

- The authenticated head was segment **18,039**, logical time **18,023**.
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
  zero pending records, cursor 40,647,923 and Event Horizon disabled.
  The Index returned 11 account-history records and 100,000 e8s in treasury.
  The worker was enabled and idle at acceptance. Its fresh controller-only
  status was unavailable.
- Repeated settled samples had backend total **3.177T** and liquid
  **3.119T** cycles. Frontend management total was **0.9668T** and estimated
  liquid **0.7631T**. Both reported a 30-day freezing threshold and zero
  separately reserved cycles in the management read. Estimated freezing
  reserve was approximately 0.058T backend and 0.204T frontend.
- Backend liquid was above the 2.07T default Full Speed cycle floor.
  At the original measured and conservative workloads (0.521–0.544T/day),
  about **3.9–4.1 days** remained to the 1T protection boundary and
  **1.9–2.0 days** to the Full Speed cycle floor from the observation.
  These estimates assume comparable work and no credits. The roughly
  10½-hour net comparison was consistent with that range. Review the
  runway before owner playtesting or any separately approved operation.

[Machine-readable production observation](evidence/B2Z/repository-consolidation/production-observation.json)

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

Complete owner acceptance and manage dated runway. The next product feature
is Cannon/Diverter manufacturing presentation. Sustained Full Speed throughput,
physical devices, dense-scene P09 qualification and wider-launch readiness
remain open. Automatic player payouts and refunds are unavailable.

[Outstanding-work register](ROADMAP.md) · [Repository consolidation](evidence/B2Z/repository-consolidation/REPORT.md) · [Historical status](https://github.com/aodl/balls-2-the-wallz/blob/315fe2ff1ff873c16e8f693025cc625b0ae59cab/STATUS.md)
