# B2Z current status

**28 November 2026.** Rules20 source
`995bbb962c3fe01da98775bbadffc2ba7491f4d1` is qualified and merged
as master `114f81a7808732e42624c7251456a19fa7979b1f`; their Git trees
are identical. The paid backend still runs Rules19. The manufacturing
frontend is still installed. No Rules20 production installation or operating
change has been authorized.

| Role | Canister | Installed source | Certified raw Wasm SHA-256 |
| --- | --- | --- | --- |
| Paid Rules19 / Schema11 / Adapter12 capped-Trickle backend | `s5ir5-gqaaa-aaaas-amyna-cai` | `741dbf898ade58ed2fa3a064d8bbe1acb577ed4a` | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` |
| Manufacturing frontend at the permanent `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io` origin | `s2jxj-liaaa-aaaas-amynq-cai` | `0855896239ba222892a372e6eeba22530fa59afc` | `1a22f9aca323738492db1df02acf021753b665dd468c9d3b916d23289057dff5` |

The last read-only certified settled observation at **08:15:57 UTC** found
unchanged module identities, authenticated head **19,817**, logical time
**19,799**, source cursor **40,647,923**, zero pending records, no signed
source or run error, and open **0.01 tick/s** capped Trickle. Backend total
was **2,018,479,621,495 cycles** and liquid **1,960,545,644,365 cycles**;
frontend total was **767,608,641,574 cycles**. Frontend headroom after
estimated freezing and a conservative 450B installation/recovery allowance
was **113,891,761,984 cycles**. The new balance bracket was shorter than one
hour, so it did not establish a new rate. The latest eligible 07:48 settled
bracket measured **595,947,449,743 cycles/day** net over 3,618 seconds.
Applying that dated rate to the 08:15 liquid balance yields a conditional
**1.61 days** to the 1T backend ReserveProtection level, absent credits or
a workload change. The backend is below the 2.07T Full Speed eligibility
floor; this does not stop ordinary Trickle. Funding, owner sign-in and any
Full Speed decision remain owner tasks.
[Latest read-only position](evidence/B2Z/development-programme/production-operating-2026-11-28-0815.json) ·
[eligible rate bracket](evidence/B2Z/development-programme/production-operating-2026-11-28-0748.json).

## Qualified Rules20 candidate

The [frozen production review candidate](https://github.com/aodl/balls-2-the-wallz/releases/tag/candidate/europe-rules20-recovery-2026-11-28)
contains the exact capped-Trickle Rules20 backend
`5c373613320ce733de51da958a1cf16f0e1febc8b788791afe0fc312d7c61a18`
and direct-root public frontend
`c029a5b5d52ba132dcc8981e98bf5445218cc75075a4dea8e6b37c5b6da2fc6c`.
All 13 release assets were downloaded back and checksum verified. The backend
uses pinned [DTR recovery source 1c7fa8b3](https://github.com/aodl/dtr/commit/1c7fa8b3bd2c3973a9dc6525b2fe8bb744f21e2e)
and exact vendored JavaScript package 0.16.0. Optional operational burn
telemetry is disabled in this release profile.

[Standard 46115172981](https://github.com/aodl/balls-2-the-wallz/actions/runs/46115172981),
[financial 46115172970](https://github.com/aodl/balls-2-the-wallz/actions/runs/46115172970)
and [developer/prelaunch 46115172920](https://github.com/aodl/balls-2-the-wallz/actions/runs/46115172920)
all passed on the exact source. The standard workflow's deliberately named
`BLOCKED production inventory (not a pass)` job remains an informational
production-authority boundary, not installed production acceptance. The
developer run executed **28/28** named
installed successor cases. The exact installed Rules19 executable was
reproduced in a disposable environment with a valid digit-leading grant
and later payment durably pending. The versioned DTR recovery boundary
retained their complete ordered prefix; Rules19-policy execution retired
them once, preserved historical publications and value, and allowed the
ordinary Rules20 transition. Independent JavaScript replay matched public
state, events and scores. Passage, corner, authenticated tariff and
interrupted/restart cases also passed.
[Exact release manifest](evidence/B2Z/development-programme/RULES20_RELEASE_MANIFEST_2026-11-28.json) ·
[Recovery proof](evidence/B2Z/development-programme/RULES20_OBSTRUCTED_RECOVERY.md) ·
[release and compatibility procedure](docs/operations/RULES20_RELEASE_PREPARATION.md) ·
[dated closeout](evidence/B2Z/development-programme/FINAL_QUALIFICATION_2026-11-28.md).

A future authorized production operation must start with a fresh certified
paid-state, source and resource preflight. Install the compatible Rules20
frontend first. A healthy drained Rules19 predecessor uses the ordinary
transition; the specifically obstructed predecessor uses the authenticated
recovery checkpoint and old-policy drain before ordinary activation. The
installed Rules19 backend is compatible only before the first durable
successor boundary. After that boundary the exact Rules20 backend and
frontend are their own compatible recovery executables. No frontend or
backend module was installed under this development instruction.

## Optional certified operational burn

Separate telemetry source `21a35f7643611fd947ffe6a0bf431874c2387ed8`
uses the existing Rules19 backend lineage and an older DTR pin. Its exact
optional backend is `076b62a2e82123dccca9e73fa64471e071ed997b556cde6a0b07a42103910edd`;
it is **not** in the Rules20 release. On those hosted bytes, active Trickle
estimated **395.617B/day** versus **396.930B/day** settled movement
(0.331% difference, below the predeclared 5% target), and the measured
matched incremental cost was **5.008B cycles/day**. Different Index phases,
a held response and refund, Full Speed, known credits, stale state and
restart were qualified in disposable cases. Live composed/direct-root
browser, maintained agent, read-only operator and genuine receipt acceptance
passed [developer/prelaunch 46118611056](https://github.com/aodl/balls-2-the-wallz/actions/runs/46118611056);
[financial 46118611068](https://github.com/aodl/balls-2-the-wallz/actions/runs/46118611068)
passed, and [standard 46118611065](https://github.com/aodl/balls-2-the-wallz/actions/runs/46118611065)
also passed its installed S14/million-cell and official Ledger/Index jobs.
The source-specific evidence update is published as `e928e973` on the
telemetry branch, with no runtime or test-input change. Unknown external credits can
understate this **net**
balance decline estimate; gross burn is not established. A combined
Rules20/composed-root release requires separate exact-source qualification.
[Concise telemetry manifest](evidence/B2Z/development-programme/CERTIFIED_BURN_QUALIFICATION_2026-11-28.json) ·
[full telemetry evidence](https://github.com/aodl/balls-2-the-wallz/blob/codex/certified-burn-integration/evidence/B2Z/development-programme/CERTIFIED_BURN_SELF_STATUS.md).

Owner physical-device review, actual owner sign-in, sustained Full Speed
throughput and wider-launch capacity remain separate. Automatic player
payouts and refunds are unavailable. [Outstanding work](ROADMAP.md) ·
[installed release retention](docs/operations/PRODUCTION_RELEASES.md).
