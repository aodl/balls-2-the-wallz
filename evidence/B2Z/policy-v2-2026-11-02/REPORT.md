# B2Z policy and strategy findings — 2 November 2026

## Implemented: local decision defects, no gameplay rule change

Source commit `a518991` corrects the existing agent tooling. Production backend,
frontend, DTR identities, memo/payment semantics and economics are unchanged.
The pilot resumes in labelled phase `policy-v2-diverse-headings`, retaining the
original approval, balances, journals and 07:14:09.902 UTC spending expiry.

The preceding phase made 149 Wait choices out of 151 decisions. Waiting itself is
valid, but investigation found two information/decision defects:

- The small shortlist repeatedly offered only the first/current firing heading.
  It can now rotate through all eight exact cardinal/diagonal headings, with a
  per-player cursor. The pilot allows five candidates under the same five-second,
  eight-tick and 60,000-work-unit bounds, retaining movement alternatives.
- Ranking included score the player would already earn while waiting. For Frugal
  Expander, that could make the same useful purchase less attractive merely
  because the existing territory was productive. V2 compares marginal outcomes
  with Wait under the same complete scenario and logical horizon, with fees where
  supplied. The original ranking remains selectable as `b2z-policies-1` holdout.

Actions admitted after the forecast horizon are explicitly unassessed, rather
than averaged as if their purchases had completed. Decisions list scored and
unassessed scenarios; immediate-admission success does not demonstrate robustness
to 60/120-second delays. This limitation remains visible rather than extending
runtime bounds or claiming unknown futures are authenticated.

The read-only APIs expose heading rotation and an exact owned `cannon_id` for
planning. Explicitly selecting another player's cannon while owning none now
fails NOT_OWNER instead of silently returning a new-cannon purchase alternative.

## Actual read-only checks

All eight headings were evaluated at authenticated head 82679 with the frozen
existing native kernel (`baf2578c1388ade63abb722be761aa8860b549c7331d33bf40f389e23982c795`).
Four batches each completed nine scenario rows in 1.73–2.00 seconds; total 7.31s.
The old Frugal ranking chose Wait in all four; the new marginal ranking chose a
firing alternative in each. These are hypotheses from one snapshot, not proof
of a winning policy or an instruction to spend irrespective of future conditions.
[Structured comparison](heading-comparison.json).

A five-candidate current-snapshot check completed in 2.499 seconds, including two
firing headings and two moves. [Exact evidence](five-candidate-comparison.json).
No transfer or budget reservation was made by either screen.

## Local batch/admission experiment

The same public snapshot supplies a player with one ball. Valueless canonical
inputs buy two extra balls for 0.5 ICP total game price. Four bounded native runs
cover one identical-heading batch, two identical-heading payments admitted in one
segment, two different headings in one segment, and those different headings with
the second admitted two logical ticks later. Horizon: eight logical ticks. Explicit
elapsed-time assumption: five seconds per tick. All four completed in 1.555 seconds.

| Local scenario | Cells gained | Accrued score delta | Full hypothetical ICP including fees |
|---|---:|---:|---:|
| batch-identical | 16 | 1.706852352 | 0.5001 |
| separate-identical-same-admission | 16 | 1.706852352 | 0.5002 |
| separate-diverse-same-admission | 25 | 1.803218001 | 0.5002 |
| separate-diverse-delayed | 188 | 2.369390484 | 0.5002 |

The identical-heading cases have exactly matching balls, cannons, ownership,
credits and lifecycle state; batching saves one 0.0001 ICP fee. Diversification and
admission order materially alter the outcome in this selected case. The delayed
case's higher score is not evidence that latency is generally beneficial. All
purchases applied fully and retained zero remainder. No authoritative defect was
reproduced and no balance change is proposed from this sample.

[Canonical outcomes](batch-results.json), [exact initial public state](snapshot.json).
The initial state hash is checked against its previously verified reference. The
saved JSON alone is not a new certificate or independent fresh authentication.
Reproduce locally from the repository root with the already qualified native tool:
`node evidence/B2Z/policy-v2-2026-11-02/reproduce-batch.mjs`.
The script performs no network, signing or payment operation. Its three-ball
hypotheticals do not expand the live two-ball campaign limit.

## Tests and remaining boundaries

PASS: 50 focused JS tests (analysis, executor, shared interface), including heading
coverage, marginal-vs-Wait ranking, fee-inclusive ranking, delayed/unmatched
scenarios, selectable v1 holdout and explicit cannon ownership failure.
PASS: 18 native fixture/forecast equality checks, bounded incomplete-state output
and wrong-artifact rejection. Runner syntax and whitespace checks pass.
Remote CI NOT RUN: local unpublished commits; remote pushes remain user-owned.
No separate installed-IC or billed-cycle qualification is claimed from these tests.

These are observation/agent integration fixes, not gameplay/economic defects.
The next useful check is the effect of the labelled v2 phase on actual canonical
score, purchases and receipt/presentation latency under the unchanged budget.
At each stopping point, the operator requested a one-hour sleep followed by another
inspection and targeted improvement/test cycle. This cadence never extends paid
approval, resets spending limits or authorizes top-ups.
