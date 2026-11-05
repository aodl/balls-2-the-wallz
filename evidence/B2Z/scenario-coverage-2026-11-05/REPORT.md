# B2Z bounded scenario coverage — 5 November 2026

The comparison does **not** justify changing the default scheduler, candidate set,
three scenarios, horizon or limits. The maintained correction only makes decision
coverage and absence of campaign authority explicit. These are local synthetic
kernel trials, not authenticated production observations or real transactions.

## Source and publication

Reviewed remote head `2a73e4df0423e09e25d3f9c9ee52c957f4e805b2` contains executable
source `6bffc2ceaf11d041ae5e084b567174d2a60eff02`. The suffix changes only STATUS
and evidence. Exact-head [CI 42088731555](https://github.com/aodl/balls-2-the-wallz/actions/runs/42088731555)
is completed SUCCESS: Source, Native, Runtime-lab Wasm, Browser HTTP/WebCrypto,
Packaged DTR/clean consumers and S14/million-cell installed-IC all pass.
Production inventory remains **BLOCKED**, regardless of its green informational
wrapper. The timestamped job details are in `reviewed-ci.json`.

Normal local merge `d9d3ac2efc58c6d16c14198891474263bad3300b` preserves both parents
and has the same tree as the reviewed head. Publication failed because the current
HTTPS environment has no authenticated GitHub access; no credentials were read or
requested. Last checked remote master remains `cbb8813`. The operator has the exact
non-forced merge-push command; this is **not a published merge**.

New implementation: `a88ace35f523f47b11741e12b6b2814bd55bfe73` and
`b00e74c24a3ac854a5a92c303e3c37a25674a065`. New exact-head CI is **NOT_RUN pending
publication**. Earlier green CI does not qualify this source. No production assets
were packaged or deployed. `source.json` records pins and the frozen native helper.

## Small maintained change

The shared decision annotation, consumed by ordinary policy decisions, the direct
counterplay selector and forecast-choice replies, separates:

* `declared_scenarios`: the **selected action versus matched Wait**, with each
  row COMPLETE or UNASSESSED. This is not completeness of every candidate.
* `known_omitted_schedules` and `omitted_candidates`: explicit unassessed work.
  The immediate-own/one-tick-response warning stays structured.
* `unenumerated_legal_actions` and `beyond_horizon`: UNKNOWN.
* `robust_against_all_plausible_responses: false`.
* `campaign_eligibility`: NOT_ESTABLISHED, `eligible: null`,
  `spending_authorized: false`. A local planner has no trusted campaign state.

Missing/duplicate rows, an unadmitted paid action, mismatched comparison windows,
interrupted work or explicitly incomplete casualty accounting cannot produce a
complete assessment. Caller-provided approval booleans do not establish authority.
The trusted executor must independently establish consent, expiry, account,
authenticated snapshot, current population, source health and budgets. The expired
campaign remains stopped. Rankings and the fail-closed outside-player guard are
unchanged. There is no change to the kernel, worker, DTR or payment executor.

## Comparable experiment

Each forecast uses the same 5,000 ms evaluation deadline, existing 300 ms termination
allowance, 100,000 cursor-work budget and four logical ticks. No limit was raised.
Synthetic Conserve pacing maps the selected 0/5/10-second admission assumptions to
0/1/2 ticks. The existing 60/120-second assumptions would extend beyond this horizon
and remain UNASSESSED. A delay is uncertainty, never a wallet-controlled action.

Four public decision states: the existing combined bent seam bridge, a held-out
dual-route loop, and a mirrored/rotated seat for each. The loop adds a second route
between anchors (16 cells/16 adjacency edges versus the bridge's 9 cells/8 edges),
so it is not simply the old bridge translated. The same fixture/opening constructs
all initial worlds deterministically; the four exact initial-state bytes, hashes
and public-head hashes are retained. No new random-seed claim is made.

At public head 4, Wait and three Fire quantity-one proposals are legal and affordable:
original, alternate and changed-angle. The angle transform mirrors physical seats.
Prefix selection is declared from those public proposals before observing outcomes;
it does not inspect the later 32 ticks. Every row retains the complete available
list, quote, memo and any omitted candidate. Attacker budget is 0.75 ICP and defender
budget 0.25 ICP, both fee-inclusive; fixture Ledger fee is 10,000 e8s.

The declared timing schedules are own/opponent: 0/none, 1/1, 2/1; C also assesses
0/1. Opponent selection uses the ordinary public-state response helper at response
time, not private intentions or hindsight. Both score gain and disruption of the
specific cannon-2 island are evaluated; player-wide survival is kept separately.

| Allocation | Paid candidates | Timing schedules | Complete evaluations | Complete selected/Wait | Complete paid alternatives | Mean wall ms | Reported work | Conservative charge |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 3 | 3 | 3/4 | 8/8 | 11/12 | 4,703 | 49,800 | 134,720 |
| B | 2 | 3 | 4/4 | 8/8 | 8/8 | 3,629 | 33,768 | 33,768 |
| C | 2 | 4 | 4/4 | 8/8 | 8/8 | 2,146 | 45,478 | 45,478 |

All selected/Wait comparisons complete (100%), even in A's one partial evaluation.
A's unfinished third candidate is explicitly UNASSESSED. Its extra 84,920 work
reservation is conservative accounting, **not measured computation**. One completed
A reply took 5,199 ms including worker startup/termination overhead; the pre-existing
allowance is unchanged. B/C omit changed-angle, without claiming it is inferior.

A/B were interleaved forward/reverse by seat. C was corrected and run separately,
without builds or tests in the timed interval. Its substantially faster wall times
are not evidence that four scenarios are faster than three: reported deterministic
work is 35% higher than B, and host timing varied. No robust latency/general capacity
claim follows from four states. Measured segment work accounts for roughly 89–91%
of scenario wall time; summary computation is below 1%. The original larger physics
branches, not summarisation, dominate this sample.

An initial C3 draft replaced the distinct own1/opponent1 schedule. That replacement
was unjustified for paid actions and is preserved as a **discarded modelling attempt**
in `preliminary-screen.json.gz`. Final C retains all original schedules and adds 0/1;
the existing identical-Wait reuse avoids redundant baseline work. No new cache is
introduced. The C prototype is evidence only and is absent from maintained source.

## Decisions and realised outcomes

Every allocation and seat chooses alternate for the score objective. For specific
island disruption it chooses original on the combined bridge and Wait on the
held-out loop. Objective rules are explicit lexicographic worst, then best tested
benefit, followed by full cost; disruption additionally compares supporting-ball
reduction. No opponent probability or score-to-ICP exchange rate is invented.

Within the four-tick forecast, alternate's incremental score range is 0.045253–0.181013
in all allocations. Adding 0/1 changes intermediate support/casualty facts, but not
the chosen action or these extrema. Thirty corrected-C conditional checks reproduce
the forecast-end state/support when the realised public input sequence is identical.
All 36 legacy B rows exactly equal C's corresponding rows. This checks prediction
faithfulness within its assumptions, not 32-tick predictive completeness.

At 32 ticks, with a public response at head 5, the results below apply equally to
both mirrored seats. Gains subtract the same-response Wait baseline, including
natural ongoing score. Delays 0/1/2 are **separate scenarios**, not optimised choices.

| Geometry/action | Incremental attacker score at delays 0 / 1 / 2 | Target active at delays 0 / 1 / 2 | Supporting balls at target | Marginal cost versus Wait |
| --- | --- | --- | --- | ---: |
| Combined / alternate | 2.655801 / 5.764548 / 5.429822 | no / yes / yes | 0 / 1 / 1 | 0.4001 ICP |
| Combined / original | 0.001049 / 0.044371 / 0.001376 | yes / no / yes | 2 / 0 / 2 | 0.4001 ICP |
| Loop / alternate | 6.130455 / 5.787176 / 5.451467 | yes / yes / yes | 1 / 1 / 1 | 0.4001 ICP |
| Loop / Wait | 0 | yes | 1 | 0 ICP |

The combined bridge's immediate attack has the lowest score gain but disrupts the
target more effectively. On the loop, immediate admission has the highest gain and
does not disable the target. The earlier timing conclusion therefore does not
generalise to topology. The disruption policy's original attack produces lasting
target inactivity in only one of three admission cases: transient forecast-end
disruption does not establish lasting shutdown. No tested allocation corrects that
short-horizon limitation, so no new policy heuristic is justified.

Costs include the opening 0.1001 ICP: Wait spends 0.1001, an extra attack 0.5002.
Each extra attack creates one additional ball; full event-based births, deaths,
payment attribution, island support, territories, future replacement prices and
exact rational scores are in the raw results and `summary.json`. All cannons remain
retained. In the two loop/delay-2 trials, pricing falls before admission: a 0.4 ICP
payment buys the requested one ball for 0.1 and **retains 0.3 ICP**, with an applied
quantity-limit receipt. No refund, price reservation or withdrawable balance is
implied. Across the 22 independent trials, 62 receipts apply, zero reject, total
synthetic expenditure is 11.6062 ICP including 0.0062 fees; retained remainder is
0.6 ICP. These totals count separate counterfactual trials, not a funded campaign.

## Verification and reproduction

* PASS 58 focused JS tests (analysis, counterplay, choice, delivery, costs, coverage,
  interface), 20 existing native/reference comparisons and 170 JS source checks.
* PASS 22 realised futures × 32 segments = 704 JS/native comparisons **per batch**.
  The corrected rerun repeats the same 22 futures; it is not 22 extra unique cases.
  States, events, score/checkpoint hashes and receipts agree. Both batches' realised
  outcomes are identical. Canonical payment bytes pass through the synthetic kernel
  path, not a real Ledger/Index deployment.
* Preserved FAIL: the first new interface test lacked `source_cursor`; the fixture
  was corrected. No application failure was dismissed and no verifier weakened.
* BLOCKED: authenticated remote publication/merge and new exact-head CI. Production
  inventory is separately BLOCKED; no deployment or spending occurred.

`python3.11 evidence/B2Z/scenario-coverage-2026-11-05/summarise.py` verifies shared
inputs, unchanged legacy rows and realised results, and regenerates `summary.json`.
`source.json`, raw logs and compressed archives retain identities and failures.

To reproduce the expensive experiments, use a disposable worktree at `2a73e4d`,
apply the corresponding decompressed prototype patch (both patches pass a clean
`git apply --check` at that base), install the existing locked npm dependencies and
reuse/build the existing native helper before timing. From that worktree run
`node tools/b2z_matched_strategies.mjs .work/coverage-reproduction --coverage-allocation`.
The driver uses the frozen helper at `.work/b2z-native-release/target/release/native-conformance-v4`;
the archive's pinned helper hash is checked. The preliminary patch runs A/B/C3; the
corrected patch runs final C4. Those alternative scenario inputs remain offline
experimental sources, not a new production option.

The most informative next bounded experiment is to hold a candidate fixed and
compare one alternative public response heading against the existing last-heading
response, reusing the same budget. That tests counterplay diversity directly before
spending compute on more candidates. It remains a proposal, not additional work or
authority to spend.
