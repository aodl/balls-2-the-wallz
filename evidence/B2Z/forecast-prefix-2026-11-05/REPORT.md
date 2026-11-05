# B2Z bounded candidate prefixes — 5 November 2026

## Publication and CI

The operator published both requested refs. Master is the history-preserving merge
`cbb8813cacc723bf5f7beac83231fbca94b32dc8`, containing reviewed `ce8a28e`; its tree
matches the reviewed streamed-progress tip. Measurement branch head is
`c614239efeefa5932a0c357768d6adc56847c391`, including source `5bd3475`.

Both exact-commit runs completed successfully: master
[42000588294](https://github.com/aodl/balls-2-the-wallz/actions/runs/42000588294) and
measurement head [42000663809](https://github.com/aodl/balls-2-the-wallz/actions/runs/42000663809).
Each passed all six substantive jobs: Source, Native, Runtime Wasm, Browser
HTTP/WebCrypto, packaged DTR/consumers and installed S14/million-cell integration.
Production inventory remains **BLOCKED**, despite its green informational wrapper.
`published-ci-PASS.json` records exact SHAs and individual jobs; observation history
is retained. The streamed-progress branch closure is complete; no repeat merge.

New experiment-only source: `b29ca4c1a9fbd6e7b73f655ef305116efbe95aee`, branch
`development/b2z-forecast-prefix`. Its exact-commit CI awaits publication. Parent
passes do not qualify later source. Prior evidence remains unchanged.

## Small implementation

The existing offline runner accepts `--paid-candidates=2` and `--reverse-paid`.
It truncates the already legal/affordable recorded proposal order before reversing
paid actions, always keeping Wait. It records omitted proposals, their exact full
cost and explicit **UNASSESSED** status. Defaults retain the full original set.
The change adds 31 runner lines plus usage documentation. There is no forecast,
policy, game kernel, DTR, payment executor, signing or observation architecture
change, and no new cache, simulator, campaign, deployment or financial operation.

## Predeclared matched experiment

Reuse ten existing fresh cases (combined seam bridge/long approach, seed 41,
both player positions/five defence states), plus the separately recorded reversed-
velocity held-out situation. That situation is now reused evidence, not another
new blind holdout. Decisions receive the exact same public state, quotes, remaining
budget and declared futures. No realised outcome chooses the prefix.

The full set is Wait/original/alternate/changed-angle. The prefix removes the third
paid proposal. Compare forward/reversed paid order; full-forward, prefix-reverse,
prefix-forward, full-reverse execution balances the two orders without overlapping
runs or builds. One paired comparison cannot separate all host variation.

Unchanged: four ticks, 0/5/10-second admission assumptions at synthetic Conserve,
5,000 ms worker deadline, existing 300 ms termination allowance, 100,000 work/call,
300 seconds/two million work per batch. Completed-evaluation caching is disabled;
existing identical-scenario reuse remains. Default 60/120-second futures and
unmodelled opponent actions remain **UNASSESSED**. No selected action is described
as globally optimal. The maximum observed call wall time was 5,359 ms including
startup/termination; the configured worker/time/work fences were not enlarged.

## Results

All 66 calls retain complete selected-action/Wait comparisons and at least one
fully assessed paid alternative. Completion below concerns only the scheduled set;
prefix completion does not establish completion of omitted futures.

| Fresh ten cases | Whole calls complete | Fully assessed paid alternatives | Mean wall ms | Reported work | Extra conservative reservation | Incremental canonical score |
|---|---:|---:|---:|---:|---:|---:|
| JS full forward | 3/10 | 22/30 | 5,142 | 131,172 | 609,740 | +53.567508 |
| JS full reverse | 6/10 | 22/30 | 5,026 | 126,811 | 365,953 | +56.248209 |
| JS prefix forward | 10/10 | 20/20 | 3,289 | 100,430 | 0 | +59.597067 |
| JS prefix reverse | 9/10 | 19/20 | 3,688 | 98,066 | 92,096 | +59.597067 |
| Native prefix forward | 10/10 | 20/20 | 1,430 | 100,430 | 0 | +59.597067 |
| Native prefix reverse | 10/10 | 20/20 | 1,178 | 100,430 | 0 | +59.597067 |

The prefix chooses the same action under both orders in **10/10** fresh cases;
the full set does so in **5/10**. Relative to full-forward, prefix-forward has one
realised score gain/nine ties/no losses; relative to full-reverse it has two gains,
six ties and **two losses**. Greater stability does not mean universal superiority.

Score is incremental versus the matched same-defence/opening-attack conservation
branch over 32 logical ticks. All fresh arms spend **5.0020 synthetic ICP** across
ten independent valueless trials: **4.0010 ICP response expenditure**, plus openings
and fees. All chosen receipts apply. Receipt amounts plus fees exactly reconcile
the reported expenditure; retained payments would count even on rejection.
Canonical score is never converted to ICP utility. The hindsight best original
proposal set still exceeds the prefix's combined score by **0.263773**. This oracle
is computed after decisions and was not available to the choosing policy.

In the reused held-out situation, all six orders/engines choose alternate, spend
**0.5002 ICP** including the opening/fees and earn **+6.089852** incremental score.
JS full calls complete all 3 paid alternatives in 4,807/4,749 ms; JS prefix completes
both in 3,160/3,080 ms. Native prefix uses 1,005/966 ms. Prefix uses 10,268 reported
work versus 15,174 for the full set. Every held-out call completes; no extra work
reservation is needed. The hindsight gap is 0.067720, with changed-angle better at
32 ticks. Neither a complete short forecast nor a stable choice proves best play.

Reported cursor work is distinct from reserved unobserved work. Interrupted calls
are charged their entire allowance in the enclosing budget. Across the 66 calls,
728,759 work is reported and 1,796,548 conservatively charged, excluding separately
recorded replay. Reservations are not measured consumption or billed IC cycles.
The qualified full native fresh baseline used 148,080 work; the prefix's 100,430
is 32.2% less deterministic work. Its earlier-session wall times are not used as a
controlled speed comparison.

## Bounded look-ahead diagnostic

After inspecting the small hindsight gap, probe this same held-out state using
the existing frozen native helper at 4/8/16 ticks. This is a diagnostic, not blind
validation. All time/work limits and the three 0/5/10-second admission assumptions
remain unchanged; no 60/120-second admission claim follows.

| Horizon | Call wall ms | Reported work | Scheduled alternatives complete | Choice |
|---|---:|---:|---:|---|
| 4 | 1,310 | 15,174 | 3/3 | alternate |
| 8 | 2,572 | 32,150 | 3/3 | alternate |
| 16 | 4,418 | 57,941 | 3/3 | alternate |

All matching-input selected-state hashes agree with JS replay. The 32-tick outcome
and full cost remain unchanged. At eight/sixteen ticks alternate has a slightly
higher predicted mean than changed-angle under the tested scenarios; increasing
the window alone does not reveal the later hindsight advantage. No general horizon
increase is justified by one complete state near the deadline. The scratch probe
leaves maintained sources untouched.

A three-branch playback trace then reproduces the archived Wait/alternate/changed-
angle results exactly, including final states, receipts and score. The changed
angle first overtakes at **logical head 30**, 26 ticks after the decision at head 4.
At the longest forecast endpoint (head 20), it is still behind by 0.010899 canonical
score; by head 32 it leads by 0.067720. This is a later payoff outside the permitted
forecast horizon, not a demonstrated short-forecast arithmetic defect. The diagnostic
uses the existing matched runner's 32-tick playback, 23,315 work/7.707 seconds;
it does not expand the agent forecast limit. No retrospective trace enters a policy.

## Verification and limits

- **PASS:** 52 focused JS tests and source inventory (168 JS syntax checks).
- **PASS:** exact declared prefixes/order, Wait preservation, explicit omissions,
  identical state/budget/fences and receipt-plus-fee reconciliation assertions.
- **PASS:** 195 shared completed JS/native prefix rows agree exactly, as do 195
  shared completed rows across prefix orderings. Forecast timings are excluded.
- **PASS:** 54 matching-input selected-state hashes; twelve actual reactive-input
  comparisons absent from the prediction model remain **UNASSESSED**. The separate
  look-ahead probe adds three matching hashes.
- **PASS:** invalid candidate limit is rejected before producing forecast output.
  Its expected nonzero invocation log is labelled separately.
- Existing 20 native/reference fixture comparisons are reused: the forecast,
  reference/native implementations and pinned binary are unchanged.

The frozen native helper remains SHA-256
`baf2578c1388ade63abb722be761aa8860b549c7331d33bf40f389e23982c795`; DTR remains
`282d709143dacb4bca769a4d6e72b97fc93ef518`. No real ICP, cycles transfers, production
changes, controller actions, campaign restart or signing privilege expansion.

Retain the default candidate-major scheduler and full default candidate set.
The explicit offline prefix is useful on these measured attack cases, but a new
policy-wide two-action cap could discard beneficial move/new/support choices that
were not tested. Next compare this late payoff under one/two-tick admission delays
and a public opponent response using the existing matched runner. Establish whether
the advantage survives counterplay before considering any new terminal heuristic
or adaptive look-ahead policy.

Reproduce the matched commands (repeat without `--paid-candidates=2` for full set,
and add `--reverse-paid --reverse-cases` for the corresponding reverse arm):

```sh
node tools/b2z_forecast_attack_experiment.mjs .work/prefix-replay evidence/B2Z/fresh-geometry-2026-11-04/fresh-trials.json.gz --no-cache --paid-candidates=2
node --test --test-concurrency=1 tests/js/b2z-agent-analysis.test.mjs tests/js/b2z-counterplay.test.mjs tests/js/b2z-forecast-choice.test.mjs tests/js/b2z-forecast-progress.test.mjs tests/js/b2z-forecast-cost.test.mjs
```

`summary.json` preserves exact fractions, decisions, expenditure, coverage and work;
compressed per-arm records retain forecasts and receipts. The small analysis and
scratch reproduction scripts are archival text, not another maintained framework.
