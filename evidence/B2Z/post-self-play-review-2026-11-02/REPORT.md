# Focused post-self-play review — local corrections, CI pending

No real ICP spent, campaign restarted, identity changed, production deployment,
backend/rules/economics change or DTR modification. The expired campaign's original
PASS/FAIL/BLOCKED evidence, 32 overnight transfers and earlier smoke remain intact.

## Exact source and artifacts

- `9550a83`: formatting only, separated from corrective diffs for review.
- `a66d55e`: lifecycle casualty accounting, matched strategy rewards, caller-scoped
  proposals, focused fixtures and the existing installed executor rehearsal.
- Executable candidate `b4a00231b91d6029cdb5ffa3cfdc39f0c8ae518a`: also fixes the
  Reserve Protection indicator. Evidence/status commits add no executable changes.
- Prepared frontend app SHA-256:
  `046c831e2fdc51780dc8a99bc6bbebaf15a47782e211070167a6bda7492034c0`.
  This exact clean-source bundle passed the focused mobile HTTP check. Not deployed.
- DTR remains `282d709143dacb4bca769a4d6e72b97fc93ef518` with existing locks.
- Existing installed fixture uses normal v6 Wasm
  `b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e`.
  This qualifies the shared executor/payment path, not a new rules-7 backend release.
- [Full source, dependency, wrapper and frontend hashes](identities.json).

## Reproductions and corrections

**FAIL preserved:** the minimal one-tick Fire fixture purchased ball 4, then lost
both own balls 3/4 in canonical mutual destruction with opposing balls 1/2. Initial
versus final population subtraction counted one own casualty; the actual count is
two. [Original assertion failure](original-casualty-FAIL.log) and the committed
[exact fixture](../../../tests/fixtures/forecast-newborn-loss.json) retain native
state/event/score hashes. No collision/capture rule changed.

**PASS:** metrics now audit cannon/ball births, purchase receipts and exact canonical
destruction pairs. Birth records retain payer, payload, Ledger-like synthetic
position, item ordinal/price and event slot/time/sequence. Death records retain
pair IDs, event time and positions. Births minus canonical deaths must reconcile
exactly with the final world. First-New births also work when cannon/player IDs
differ. An absent death event fails reconciliation instead of inventing a loss.

Counterfactual birth identity uses exact payment input, slot, ordinal and birth
state, excluding independently allocated global IDs. A natural-loss exception also
requires matching death time/positions and the paired entities' origins. Shifted
IDs with the same demonstrated origin compare correctly; changed input or missing
attribution does not. The campaign guard excludes paid candidates on incomplete
lifecycle/causality, missing scenarios, unadmitted actions, unequal comparison
horizons or additional outside-player losses. Wait remains available. These bounded
predictions cannot prove safety against unknown future inputs.

The Raider now charges the same-horizon newborn loss: in the one-tick reproduction
its Fire loses two balls rather than one and selects Wait. Policy v3 preserves the
eight policy types and v1/v2 holdouts. Immediate-admission ranking can still be
useful but explicitly reports non-robustness across unassessed delays. Eight ticks
at Conserve cover forty assumed seconds; 60/120-second admissions remain unassessed
and fail the restricted shortlist. Bounds were not extended to conceal that limit.

A reproducible allocator test gives passive-rich Expander a raw reward of 10,000
but zero incremental benefit, and Defender raw 10 with positive matched benefit.
V2 selects Expander; V3 selects Defender. Unmatched opponent effects, historical
absolute accrual and mismatched state/input/horizon/budget records receive no causal
policy credit. Live observations are labelled descriptive; no retroactive live
causal-learning claim is made.

## Matched trials and work bounds

[Sixteen small paired diagnostic/policy rows](matched-trials.json) use two existing
fixtures, two player positions, eight logical ticks, a fee-inclusive 0.25 ICP ceiling
and identical initial bytes/opponent input stream in candidate and Wait. Twelve
policy decisions (Expander/Raider/Adaptive) select Wait. Four explicitly labelled
forced-Fire diagnostics show that paid extra territory/score can exist without
beating the short-horizon cost heuristic; one seat has no affordable Fire. This is
not a ninth policy or a statistical winner claim.

Natural Wait score is reported separately from incremental score. For example,
bridge-left seat 0 accrues `388/15625` naturally; forced Fire adds
`8662025676992/29462951171875` for 10,010,000 e8s including fee. Different public
opponent assumptions can change the outcome; the fixed experimental stream is
labelled separately from ranking forecasts.

The native run completed in 3.995 seconds with 22,803 pure-kernel experimental work
units; the JS run completed the same 16 rows/22,803 units in 4.452 seconds. Individual
native evaluations used 68–4,486 cursor work units. All use the existing bounds:
eight logical ticks, two candidates, 60,000 work units and 5,000 ms worker / 5,300 ms
parent cutoff. Native max-work=1 returns incomplete without invented output;
artifact identity mismatch fails closed. No LLM inference calls or billed mainnet
cycle attribution is claimed.

## Signing boundary and payment preservation

Untrusted sessions receive caller-bound proposals and own status only; no submit,
reconcile, stop, foreign-player plan access or arbitrary destination fields.
Trusted code supplies caller identity outside JSON and checks it again before
submitting an immutable plan. The multi-player endpoint remains explicitly trusted
orchestrator only. Scoped CLI mode cannot enable mainnet signing. This is an
application capability boundary, not an OS sandbox: independent sessions must not
have signing-environment/trusted-endpoint access.

**FAIL preserved:** the existing installed harness inherited rules-7 identifiers
from the current campaign template while installing its pinned v6 module; it
stopped before payment. [Failure](stale-installed-binding-FAIL.log). The narrow
harness correction asserts the known v6 rules/config/schema and binds its verified
epoch. Authentication was not disabled or dynamically widened.

**PASS:** one corrected [installed rehearsal](installed-restart-PASS.json), 256.423
seconds, four separately signed valueless Ledger payments, exact Index discovery,
authoritative receipts, SQLite restart after deliberately lost acceptance response,
identical Ledger duplicate with no second debit and four restored receipt proofs.
The exact final executor/ledger/observer/common/harness bytes match the installed
run's source manifest. [Receipts](installed-receipts.json).

The fixture's total net backend balance decline was 147,542,753,614 cycles over
243.087 seconds including source, publication and maintenance. It is a disposable
IC measurement, not a per-action cost or production cost prediction.
[Measurement scope](installed-cost.json). No test recompilation overlapped execution.

## Mobile and verification

**FAIL reproduced in production:** after verified connection at head 85761,
Reserve Protection correctly reported pause but the central Catching up spinner
persisted. [Before screenshot](mobile-before.png). All 13 toolbar controls were
reachable by scrolling and their labels fit; no toolbar redesign was needed.

**PASS in exact prepared candidate:** fresh healthy operational Reserve Protection
replaces the spinner with an explicit pause explanation. Authentication errors,
transitions and stale operational data cannot receive that explanation. No clock,
trajectory, authenticated playback or payment availability was changed. A mobile
390×844 / DPR 3 HTTP browser using production CSP and genuine mainnet certificates
checked every control's visibility, bounds, label width and enabled keyboard focus.
[After screenshot](mobile-after.png), [structured result](mobile-after.json).
This is a local candidate connected read-only to production, not deployed assets.
The first harness attempt used CSP-incompatible string polling; it was corrected
to the existing external polling helper without changing CSP/browser security.

- **PASS:** [106 focused JS tests](focused-js-PASS.log), including economics,
  budgets, immutable plans, ambiguity/restart, scopes, proof verification, stale
  response recovery, casualties, ranking, camera and observer delivery.
- **PASS:** [20 native/reference comparisons](native-equality-PASS.log), including
  the new exact reproduction, plus bounded work and bad-artifact rejection.
- **PASS:** five display/reference tests, native format/clippy, documentation links.
- **CI BLOCKED/pending:** no run yet for `b4a0023` at the recorded check. Operator
  push requested. No release-qualified claim is made.
- Earlier [CI 41419529020](https://github.com/aodl/balls-2-the-wallz/actions/runs/41419529020)
  on `b7adfda` has a Native conformance failure; other named completed source,
  browser, package and Wasm jobs pass. Installed qualification was still running
  at capture. Public logs return HTTP 403; the precise failed native subcheck is
  unknown. Operator error/artifact text requested. Local rebuilt native equality,
  format and clippy pass; those do not prove that remote failure resolved.

No historical 900-second browser programme was repeated. A stale local debug
wrapper initially lacked segment-json; rebuilding the current locked source fixed
that local tooling mismatch. The immutable release wrapper's independent equality
result was also retained; this is not evidence about the unknown remote CI error.

## Remaining limits and one next experiment

Short-horizon heuristics can prefer Wait even when a paid action yields some later
benefit. Delayed admission beyond the forecast cannot be judged; restricted live
shortlists therefore become conservative. Adaptive allocation has no trustworthy
matched live reward dataset yet. Selected fixtures do not establish general policy
strength, and public APIs cannot reveal future opponent intent or guarantee price.

Next local experiment: paired Move-versus-Wait defence at a narrow bridge, rotate
both player positions and freeze identical attack inputs with 0/2/4-tick admission.
Keep budget and logical horizon equal; measure incremental score, defending-ball
survival and cost. This tests mobile-cannon counterplay without a new rule, funded
campaign or broader tournament.
