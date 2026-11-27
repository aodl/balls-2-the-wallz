# Frontend artifact boundary after the independent replay correction

Observed 26 November 2026. No production installation was performed.

## Decision

Retain the frozen Rules19-compatible manufacturing review candidate from source
`0855896239ba222892a372e6eeba22530fa59afc`. PR #18 changed
`packages/kernels/b2z/purchases-v6.mjs` for independent JavaScript execution and
replay. The embedded frontend does not consume that module: the current
`tools/build_observer_playability.mjs` output at master `6d0a30e` records 225
esbuild inputs, none named `purchases-v6.mjs`. The frontend source, embedded
canister source and builder paths have no Git diff from `0855896` to `6d0a30e`.
The current generated `app.mjs` is SHA-256
`0ba82cbb0ef59cbf013f314ad090e898184c01dc305a7edfc6751b814fae9be8`,
matching the frozen candidate's asset inventory. The current stylesheet and
the temporary developer-profile index injection also match. The build
manifest's source commit is private build metadata excluded from embedded
assets. The existing candidate is therefore the applicable executable; a new
Wasm freeze would not add the replay correction to its runtime.

The correction remains essential to exact independent verification. It is
included in current source and must be qualified as such; it is not an absent
frontend gameplay fix.

## Exact release and recovery

| Item | Identity |
|---|---|
| Candidate raw `frontend.wasm` | `1a22f9aca323738492db1df02acf021753b665dd468c9d3b916d23289057dff5` |
| Candidate embedded inventory | `addbee9e943b06b26226f0894f74ba39be0dad680ae48770fc4ff2c7c363bc2e` |
| Candidate Candid | `9c5d4382d7dc279ab1fbd63de66311e3d9a38bc7e2562501861701b26f60c141` |
| Installed compatible recovery raw `trickle-frontend.wasm` | `2a6da764e4e7f63bf367bc6e55265df00a4714121019e895e67d0598521475ff` |
| Installed backend | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` |

The candidate and manifest are in the [candidate release](https://github.com/aodl/balls-2-the-wallz/releases/tag/candidate/europe-prelaunch-frontend-manufacturing-2026-11-26).
The compatible installed recovery module is in the [production release](https://github.com/aodl/balls-2-the-wallz/releases/tag/production/europe-rules19-prelaunch-trickle).
Both archives were downloaded during this follow-up. The candidate raw Wasm,
inventory and release-manifest SHA-256 values matched their published release
digests. The recovered production archive matched its published ZIP digest
`23c68b6bb4724a317962ad26c9e8c4c3df162823d73d8b438cbe7efc34715b64`;
its contained raw frontend independently rehashed to the recovery identity
above. Raw downloads and observations are retained under `.work/`.

The already executed same-ID disposable rehearsal used byte-identical
candidate and recovery modules: 91 certified HTTP responses and 28 alternate
routes verified in each phase. Measured candidate installation was
185,524,191,169 cycles and recovery was 185,492,867,154 cycles. The permanent
Internet Identity derivation origin remains
`https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`.

## Read-only production position

At 20:30:43 UTC on 26 November, certified module identities were still the
installed hashes above. The signed status reported running capped Trickle,
open admission, no pending source records and no last error. Publication head
was 18,530. Settled backend liquid cycles were 2,809,241,536,225. The frontend
had approximately 309,326,767,443 cycles beyond the measured freezing
requirement and the historical 450B installation-plus-recovery allowance.
This is headroom evidence, not an authorization or guarantee of installation.

Over the preceding 6,176.2869 seconds and 61 publications, backend liquid
cycles declined by 38,891,976,408, equivalent to 544,059,366,901 cycles/day
for that observed workload. At that rate the conditional projections were
about 3.33 days to ReserveProtection and 1.36 days to the default Full Speed
cycle floor. This is settled **net balance decline**; unknown credits or a
changed workload can alter the estimate. The exact raw observation is
`.work/frontend-boundary-production-2030.json`.

## Owner installation decision

The candidate is a frontend-only same-ID upgrade for
`s2jxj-liaaa-aaaas-amynq-cai`, compatible with the currently installed
Rules19 backend. Its release manifest and raw executable above define the
only reviewed bytes. Verify the candidate checksum, asset inventory, Candid,
installed backend identity, liquid cycles and recovery bytes immediately before
any separately authorized installation. Follow
`docs/operations/PRODUCTION_RELEASES.md` and
`docs/operations/S14_OPERATOR.md`; preserve the installed canister ID and
permanent origin. Owner sign-in and physical-device acceptance remain owner
review tasks. This report does not authorize installation.
