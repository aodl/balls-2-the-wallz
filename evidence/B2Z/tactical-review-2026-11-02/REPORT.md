# Final narrow corrections and bridge-defence experiment

No ICP spent, cycles transferred, identities changed, campaign restarted, backend
upgraded, rules/DTR modified or production gameplay paused. The reviewed casualty,
counterfactual, adaptive, scoped proposal and executor recovery implementations and
historical evidence remain intact.

## Source, CI and packaging

Corrective source: `bbf8617` (full SHA in identities.json). Existing workflow fix
`dc4447b9c568ce2ec2486361e10a3bb89b1366ef` is already published. Run 41438652555
has PASS for Source conformance, Native conformance, Browser HTTP and Web Crypto,
Packaged DTR and clean consumers, and Runtime-lab Wasm. S14/million-cell installed
qualification also passed; the run completed with overall SUCCESS.
The follow-up `bbf8617` source has focused local PASS evidence and is not yet
published or exact-commit CI qualified. The green workflow wrapper named BLOCKED production inventory remains a substantive
BLOCKED inventory check, not production qualification. [Exact CI capture](ci.json).
Earlier failed runs remain failed; no manual rerun or unrelated local qualification
was launched for this task.

Prepared app SHA-256:
`678a0e531200f92eb709d9454fba1c1ae2a30f08c382fb92068b5aedb720c8ed`.
The clean-source build exactly matches the mobile-tested bundle. CSS and source
identities are in [the manifest](identities.json). These frontend assets are
packaged locally and **not deployed**. No installed asset identity or live-deployed
success is asserted.

## Two mobile corrections

`catchupIndicator` now requires verified gameplay, fresh operational data,
`run.running === true`, source binding checked, ReserveProtection with admission
closed, no transition and no operational errors before explaining funding-only
resumption. An operator pause or unchecked source falls back to the ordinary
non-healthy message. Focused regressions cover both cases as well as existing
freshness/verification/transition failures.

At mobile widths the bottom gameplay-status block sits above the minimap with a
bounded viewport width and wrapping. No toolbar or camera behaviour changed.
One focused Chromium session (sandbox enabled, production CSP, actual mainnet
certificate verification, no payment) checked 390×844 and 320×640 at DPR 3.
All 13 toolbar controls remain accessible with fitting labels; status bounds are
above minimap bounds at both sizes. [Structured result](mobile.json),
[390 screenshot](mobile-390.png), [320 screenshot](mobile-320.png).
The first harness launch preceded asset-build completion and received an empty
local HTTP response; after the build completed, the focused check passed. Browser
security/CSP was not weakened. The passing browser is a local candidate connected
read-only to production, not a deployed client.

## Conservative decision policy

Eight Conserve ticks cover 40 assumed seconds. Admission after 60/120 seconds would
occur at ticks 12/24, outside that horizon. The strict consent screen correctly
excludes those paid candidates; increasing a timeout would not assess them.

The existing consent evaluator now has an optional **planning-only** conditional
path. A trusted caller must supply an already valid campaign approval, the identical
certified snapshot head/root, and a complete population in which all players,
cannons and balls belong to approved accounts. At least one candidate admission
must be evaluated; all scenarios must complete with reconciled casualties and
matched Wait horizons. Only then may an immediately favourable candidate remain
on a conditional shortlist despite unassessed late admissions. The ranking still
omits those late outcomes, reports non-robustness and retains Wait.

Outside-player presence, missing ownership, uncertified/wrong state or absent
approval retain the strict exclusion. Regression tests demonstrate a favourable
immediate candidate can be selected conditionally while its long-delay robustness
is explicitly false. The signer/executor and expired runner are unchanged. The
optional planner is not connected to paid dispatch; future integration must recheck
population, freshness, approval and admission before dispatch and stop on outside
entry. Prompt/session parameters cannot create signing authority.

Current prerequisites fail: approval expired and an outside retained cannon
exists. The ordinary runner therefore remains on the strict path/Wait. No expanded
forecast horizon, work/time bound, claimed source latency or spending authority was
introduced. Snapshot exclusivity cannot prove that an outside player will never
join later; this planner does not claim that guarantee.

## Matched Move versus Wait

Command:

```
node tools/b2z_matched_strategies.mjs .work/bridge-defence --bridge-defence
```

The existing runner/kernel uses one narrow bridge with left/right endpoint cannon
starts and swaps public player accounts between those seats. These are two tested
starting positions, not independent geometric seeds. Each Move/Wait pair uses
identical initial bytes, the same fixed northbound attack admitted at tick 1,
eight logical ticks and the same fee-inclusive 0.25 ICP ceiling. Target cell 103
is the attacked bridge cell. Move admission varies at ticks 0, 2 and 4. Exact state
and attack hashes, receipts and rational outcomes are retained in
[the six paired results](bridge-results.json).

| Start | Move admitted | Incremental score | Extra territory | Outcome |
|---|---:|---:|---:|---|
| Left anchor | 0 | 508/15625 | 3 cells | Applied; bridge remains connected |
| Right anchor | 0 | 508/15625 | 3 cells | Applied; bridge remains connected |
| Left anchor | 2, 4 | 0 | 0 | NOT_OWN_TERRITORY |
| Right anchor | 2, 4 | 0 | 0 | DORMANT_REVIVAL_REQUIRED |

The original defending ball survives in all Move and Wait runs. Immediate Move
retains one connected active island; Wait and delayed Move leave two retained
islands, only one active. Each Move costs 20,000 e8s including the 10,000-e8s fee
(0.0002 ICP), including rejected moves under the retained-payment policy. Wait
costs zero; no infinite score-efficiency value is assigned.

Twelve executions/six pairs used 14,568 cursor work units in 4.320 seconds total.
Individual runs used 1,197–1,218 units and approximately 0.159–0.668 seconds on this
host. These are pure-kernel work/wall measurements, not IC cycles or real Ledger
admission latency. No native game implementation or second simulation engine was
introduced.

Immediate mobile defence is effective for this attacked cell, but late movement
fails after topology changes. This is evidence of latency-sensitive counterplay,
not proof that movement is excessively strong. Diagonal/multi-direction attacks,
other bridge geometries and earlier attacker adaptation remain untested. Movement
prices and combat rules remain unchanged; no authoritative gameplay defect was
demonstrated.

## Focused verification

- PASS: 89 agent/reference/UI tests including existing executor/budget cases.
- PASS: 37 final UI/analysis regressions after the last planning-only adjustment.
- PASS: 20 native/reference comparisons plus bounded work and wrong-artifact
  rejection. No payment execution/reconciliation code changed, so the already
  reviewed installed payment/restart evidence was reused.
- PASS: six matched bridge pairs, focused mobile check and unchanged dependency
  pins. Prior campaign PASS/FAIL/BLOCKED evidence was not rewritten.

No general UI redesign, tournament framework or historical 900-second local
browser programme was added. Remaining limitations are the selected fixture,
unevaluated long admissions and the separate publication/CI of the new follow-up source.
