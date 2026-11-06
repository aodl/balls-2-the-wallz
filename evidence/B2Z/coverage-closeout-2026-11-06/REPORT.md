# B2Z coverage close-out — 6 November 2026

Implementation: **`a8cd5a3935ec5bc17eb1625aa96a168ab09c76b6`**. The existing planner
is retained as the stable baseline. No scheduler, default candidate/scenario,
horizon, time/work limit, kernel, pricing, DTR, executor or campaign change.
The prior A/B/C archives and negative findings are unchanged and were not rerun.

## Reproduction and correction

The pre-fix focused regressions reproduce COMPLETE with absent/null/malformed
accounting flags, missing tactical support evidence and conflicting activity data.
`reproduced-FAIL.log` is preserved. All normal and tactical comparisons now require
both `lifecycle_complete === true` and `casualty_attribution_complete === true` on
the selected action and its unique matched Wait row. Tactical support must be a
nonnegative safe integer for the specific defended island. Any supplied activity
flag must be boolean and agree with that support count. Zero support is a valid
measured loss, not successful survival.

Duplicate rows/candidate identities, invalid scenario names, incomplete statuses,
invalid logical/elapsed comparisons and unadmitted paid actions are UNASSESSED.
Equal logical horizons remain compatible with older rows without elapsed metadata;
provided malformed/conflicting windows fail closed. Idle comparisons require the
matching explicit elapsed window. An unrelated timeout does not invalidate a
genuinely completed selected/Wait pair. Known omissions, unknown futures and
NOT_ESTABLISHED campaign eligibility remain separate; no caller boolean grants
spending authority.

`assessCandidate()` is the shared row-pair assessment. The normal policy, tactical
selector, forecast-choice path and annotation use it. Compatibility fields
`forecast_coverage` and `robustness` derive from that same assessment. Two tactical
producers now carry the lifecycle evidence already established by canonical
simulation. Old synthetic unit fixtures were corrected to include real completion
evidence; the intermediate fixture failures remain in `first-focused.log`.

## Focused checks and existing gameplay

* **PASS:** 64 focused JS tests; final eight coverage cases also rechecked after
  removing a duplicate fixture property. Missing/null/false/truthy/malformed flags,
  both baselines, support counts, conflicting duplicates, partial evaluations and
  consistency of compatibility fields are covered.
* **PASS:** 20 existing native/reference comparisons, including bounded work and
  wrong-native-artifact rejection; source inventory/170 JS syntax checks.
* **PASS:** the unchanged matched runner, `bridge_left`/`mutual`, both seats:
  16 rows, 22,803 cursor work, 9,374 ms. Frugal/Attrition/Adaptive all choose Wait
  (12/12), cost zero and incremental canonical score zero. The three affordable
  forced-Fire diagnostics gain 0.293997, 0.055097 and 0.002368 canonical score for
  **0.1001 synthetic ICP each**. The fourth has no affordable Fire. Positive score
  alone does not justify expenditure, and no score-to-ICP exchange rate is assumed.
* **PASS:** unchanged three-step local runner: 12 matches, 24 player outcomes,
  72 decisions, 31 paid actions, 41 abstentions, **1.5047 synthetic ICP** including
  fees. 14,487 simulation cursor work, 66,535 ms; no inference calls/billed-cycle
  measurement. Its older one-tick/1,000 ms screen produced 48 complete, 20 hard
  timeouts and four partial evaluations. Those interrupted futures remain
  UNASSESSED. This runner uses shorter explicit test limits, not altered planner
  defaults. Its absolute final scores are not matched Wait gains.

The old runner does not persist complete forecast outcomes or final island-local
state. Do not infer predictive accuracy or island survival from its player-wide
ball count. For island evidence, the already-qualified held-out closed-loop records
were re-annotated with current code, **without resimulation**. All 12 historical
Frugal/Anchor/Adaptive choices remain unchanged and COMPLETE for their declared
responses. Against the recorded public response policy:

| Existing position | Choice | Incremental defender score vs Wait | Synthetic cost | Target island |
| --- | --- | ---: | ---: | --- |
| Bent near, seat 0 | proactive Move | 0.154583 | 0.0002 ICP | active, one support |
| Bent near, seat 1 | proactive Move | 0.154768 | 0.0002 ICP | inactive, zero support |
| Long approach, seat 0, Frugal | proactive Move | 0.109582 | 0.0002 ICP | active, one support |
| Long approach, seat 0, Anchor/Adaptive | proactive support | 0.106198 | 0.1001 ICP | active, two supports |
| Long approach, seat 1 | proactive Move | 0.109582 | 0.0002 ICP | active, one support |

These reused records demonstrate useful cheap defence and a specific failure;
they do not establish a universal strategy. The opponent policy is the same public
conditional rule in each counterfactual, not necessarily identical realised inputs.
The new paired runner's realised input stream differs from forecast scenarios, so a
numerical forecast-accuracy claim would be confounded. Exact-input agreement is
provided by the native/reference tests. No new physics or strategy defect was
demonstrated, and no ranking change or additional experiment follows.

## Publication and remaining limits

Fresh remote reconciliation: master is already **`d9d3ac2`**, containing the
reviewed late-payoff merge. Do not repeat that merge. Coverage remote is
**`aad11ff`**, containing executable `b00e74c` plus evidence only. Its exact
[CI 42200724739](https://github.com/aodl/balls-2-the-wallz/actions/runs/42200724739)
passes all six substantive jobs. Production inventory remains **BLOCKED**.

The new correction's publication and exact-head CI remain **BLOCKED** by unavailable
authenticated HTTPS GitHub write access (`push.log`). The parent run does not qualify
this new source. No credentials were read/exported, and no premature merge is
prepared. After publication, require exact-head CI before a normal history-preserving
merge based on a fresh master check.

Remaining demonstrated limitations: short-budget forecasts often omit futures;
declared responses are not exhaustive; geometric opponent policies have known
hindsight-oracle gaps; older local-runner summaries do not establish island survival
or forecast accuracy. Keep these limitations explicit and stop expanding the planner.

Reproduction commands (existing tools, valueless local inputs):

```sh
node --test --test-concurrency=1 tests/js/b2z-decision-coverage.test.mjs tests/js/b2z-counterplay.test.mjs tests/js/b2z-forecast-choice.test.mjs tests/js/b2z-agent-analysis.test.mjs tests/js/b2z-agent-interface.test.mjs tests/js/b2z-forecast-progress.test.mjs tests/js/b2z-forecast-cost.test.mjs
node tools/test_b2z_native_forecast.mjs .work/b2z-native-release/target/release/native-conformance-v4
node tools/b2z_matched_strategies.mjs .work/b2z-coverage-closeout/matched
node tools/b2z_local_matches.mjs .work/b2z-coverage-closeout/local-matches
```

`verification.json`, compressed outputs and `gameplay-summary.json` retain exact
scores, decisions, scope and failures. No real ICP, funding, identity, controller,
deployment, gameplay pause or production operation occurred.
