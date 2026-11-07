# European B2Z release — locally qualified; publication/install blocked

Source **`a69723e56bb30b4eaa6698fc9653670e4ed1bab2`**. No mainnet installation or
asset upload occurred. The actual non-force push failed because HTTPS Git could
not obtain a username. GitHub contains reviewed UI `3306728`; the European source
has no hosted CI run. No parent CI is claimed to qualify changed code.

```sh
git push origin a69723e56bb30b4eaa6698fc9653670e4ed1bab2:refs/heads/release/btz-prelaunch-playability
```

Publish this exact source first and pass its applicable substantive hosted jobs.
The separately labelled production-inventory job is an informational BLOCKED
inventory, not a passing qualification. Existing controller authority then permits
installation on the new targets using the [current operator procedure](../../../docs/operations/S14_OPERATOR.md).
Do not substitute a later test build, create/reinstall a canister, use former IDs,
change controllers, buy/transfer cycles, send ICP or endow a notifier.

| Frozen identity | Value |
|---|---|
| Normal backend SHA-256 | `c4b7b9101353bd0bb6155e6d03ed2d125481c09c4813e5060b3020e1d3e3b9ff` |
| Frontend JS SHA-256 | `0870c699ee1b3c3f40c25ddbd3104996608d539156be9b39d9cebb8a297a8642` |
| Complete frontend file-manifest SHA-256 | `a860019ec2622c2145d8de889530e562b77791ddd85266590ddbe75109ddd922` |
| DTR revision / client | `282d709143dacb4bca769a4d6e72b97fc93ef518` / `0.15.0` |

[Backend provenance/exports](backend-manifest.json), [frontend provenance](frontend-build-manifest.json),
[all 15 file identities](frontend-ready-files.json), [headers](security-headers.json).
Clean-source reviewed builders froze `.work/europe/final/backend/normal.wasm` and
`.work/europe/final/frontend/`. The final normal Wasm is byte-identical to the
installed-test artifact; frontend payloads also match. Final commits after the
first freeze changed tests/document routing only. DTR, locks, game kernels,
physics, scoring, prices and memo interpretation are unchanged from reviewed inputs.

## Targets and authority

[Certified target/controller/node checks and management balances](target-preflight.json)
confirm both empty targets on the expected subnet, with the same 13-node membership:
`bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`.
Controller access worked; both original controller principals remain unchanged.

- Backend `s5ir5-gqaaa-aaaas-amyna-cai`: **1,499,893,175,518 total cycles**.
- Frontend `s2jxj-liaaa-aaaas-amynq-cai`: **1,499,893,435,616 total cycles**.
- Module hashes: **None**. Actual post-install liquid balance, rules/epoch,
  treasury/source readiness and speed are **NOT_RUN**, rather than deployed claims.
- [Website target](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/) is **not installed**.
- Newly derived default-account destination:
  `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
  The latest signed [Ledger/Index account check](account-check.json) returns zero
  balance from both, no transactions/no oldest ID, and the official Ledger binding.
  Certified game-source/destination verification awaits installation; do not treat
  the documented address as an already running game's payment instruction.

The normal treasury derives its beneficiary from self, checks the immutable
source/default account and certified source identity, official Ledger/Index/CMC,
and every durable plan. Duplicate identity, timestamp, recovery and funding policy
remain intact. No old world, receipts, scores, credits, cursor or intents are imported.
Old local Activity remains backend-scoped. The former deployment was untouched.

## Executed qualification and floor

[Reviewed checks and raw-result references](verification.json): **49 host tests,
130 focused JS tests, 14 HTTP/browser checks, five responsive task journeys,
15 relevant installed cases plus the explicit starting-budget probe PASS**.
Raw setup failures and the first consolidated failure remain under `.work/europe/`.
The corrected floor probe tests permitted execution and explicit below-exit
protection separately; it does not relax the policy to satisfy a timing assertion.

[Fresh normal installation](fresh-activation.json) traverses all four authenticated
transitions from empty v3 genesis to rules 7/world schema 6, 1000×1000, epoch index 4.
It preserves zero received money, credits/entities and source cursor during activation,
recovers a clean upgrade, then admits/applies a valueless Ledger payment without a
website or poke. Admission/application took 60/61 virtual seconds in that sample.
The existing bounded driver now supplies required transition seals while stopped,
under the independent transition floor; ordinary empty/dormant worlds still sleep.

The proposed eight bands and hysteresis pass boundaries, replenishment and identical
32-tick state comparisons. Trickle publishes one tick/100 seconds. A separate
[104-second real-cadence sample](trickle-real-cadence.json) produces one additional
tick. Browser/model tests cover cold snapshot rendering, bounded verified coverage,
several publications, reconnect, tier changes and slow/error labels. This combines
qualified tests; it is not a deployed European Trickle browser journey.

[Floor/recovery measurement](floor-and-recovery.json): current-rules one-ball
execution at a 1.4T liquid test target costs **256,145,126 cycles**; below-exit
protection plus upgrade/source/paused-treasury maintenance costs **19,326,280,043**.
The 1T application exit is retained, with source/treasury/transition floors
0.15T/0.2T/0.5T. SDK liquid balances already exclude platform/message/call reserves;
a previous ingress/query balance does not guarantee a later callback's balance.
Maximum-population capacity and indefinite lifetime are not qualified.

The [1.5T starting-budget rehearsal](natural-budget.json) activates current rules
and keeps a healthy source, but naturally selects **Reserve Protection**. Its
post-activation query liquid estimate is **1.421258308323T**, about **0.078742T below
entry before further consumption and scheduling-context reserves**. These are
local estimates, not actual European post-install balances or a guaranteed top-up
quote. Essential fresh activation succeeded locally; no funding action is performed.

## Polling and optional assistance

[Settled cost breakdown, hints, pacing profiles and latency qualifications](polling-and-pacing-costs.json):

| Equivalent ~one-hour idle configuration | Backend cycles |
|---|---:|
| Maintenance/storage; source off, treasury paused | 292,956,479 |
| Maintenance/storage plus empty enabled treasury; source off | 468,487,036 |
| 60-second fallback, empty treasury enabled | 3,466,464,079 |
| 600-second fallback, same conditions | 742,127,545 |
| 3,600-second fallback, same conditions | 514,089,932 |

Empty reconciliation's measured marginal component is about **45.6–50.0M cycles**.
Ten minutes saves **2,724,336,534 cycles/hour** in these conditions; hourly adds only
**228,037,613/hour**. A valid hint with bounded retries costs **144,941,527 target
cycles**, with three Index calls; four ignored hints still cost **23,302,263** in
message execution. Sender overhead is separately recorded and is not asserted to
be the real service's cost. Storage, maintenance, reservations/refunds and zero
credits remain separate from the polling inference. Instruction counters are not
substituted for cycle debits.

At active or Trickle operation, conditional backend saving before external service
cost is `2.7243B - 0.14494B × hint bursts/hour - health cost/hour`. One burst with
zero health cost leaves 2.5794B/hour; twenty erase the saving. Real health cost and
traffic are unknown. The bounded trajectory profiles measured 29.71M cycles/second
Normal and 1.636M/second Trickle, including maintenance; these are not current-world
lifetime or pure simulation-cost estimates. Longer fallback increases missed-hint
delay; one hour is never a guaranteed completion deadline.

[Live Event Horizon checks](event-horizon.json) verify instance `eo6ei-gaaaa-aaaar-qchra-cai`
and the official ICP Ledger. Its certified module is unchanged, Candid metadata is
absent, and the documented subscription-preview query is not deployed. Relevant
new subscription, outbound ABI and usable cadence/health remain unestablished.
**Assistance is disabled; production candidate fallback stays 60 seconds.** No
endowment, service mutation, new notifier, invented API or health polling service.
Known backlog and barriers remain prompt. The [600-second expiry check](long-fallback-expiry.json)
reconciles expiry before ordinary fallback is due, using the candidate with a
local test-only interval override. Treasury recovery remains independent.

## Interface and remaining limits

The completed `3306728` human interface is retained. Exact copy bytes, recipient/
no-refund visibility, denial, explicit replacement and missing-cannon packet-warning
regressions pass at 320×640, 390×844 and desktop, plus landscape/tablet. Screenshots
are explicitly synthetic: [320px](synthetic-320x640-payment.png),
[390px](synthetic-390x844-payment.png), [desktop](synthetic-1440x900-payment.png).
Prior local [human-interface report](../human-interface-final/REPORT.md)/manifests
were found and preserved; their independent inclusion in the supplied ZIP is not claimed.

Current receipts omit original memo evidence, so automatic packet association
remains unavailable. No human participants, actual-device/soft-keyboard study or
real-wallet payment test occurred. No refunds or automatic payouts are added.
Actual installed hashes, served files/CSP, certified clean European state/source,
actual speed/liquid balance and production desktop/mobile smoke remain pending
source publication and exact-commit CI. No deployment success is claimed.
