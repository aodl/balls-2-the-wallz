# B2Z bounded forecast scheduling — 5 November 2026

## Source, closure and CI

The published streamed-progress tip is `27cdaf7f8a00cadc5fb9730d4dda4d0849070e40`.
It contains reviewed executable source `ce8a28e7ba2f843552b5a40bfe59d26bc24eb270`;
the suffix changes only STATUS and the reviewed evidence directory. There are no
additional executable changes in that published tip.

Both public CI results were checked again: parent `e7ff49186d689f5cfc1256a014d8415ab5225c66`
[41906883732](https://github.com/aodl/balls-2-the-wallz/actions/runs/41906883732) and child
[41914128217](https://github.com/aodl/balls-2-the-wallz/actions/runs/41914128217) each
passed Source, Native, Runtime Wasm, Browser HTTP/WebCrypto, packaged DTR/consumers,
and installed S14/million-cell jobs. Production inventory remains **BLOCKED**;
its informational wrapper's green conclusion is not production verification.
Exact job identities are preserved in `reviewed-ci.json`.

Remote master was still `c4c955f1cfc43a6f5fa857f76edc209d9fc7a4d0` at the final
read-only check. A normal history-preserving local merge was prepared on
`integration/b2z-streamed-forecast-merge`: `cbb8813cacc723bf5f7beac83231fbca94b32dc8`.
Its tree exactly equals the qualified child. **Remote merge remains BLOCKED**:
the non-forced HTTPS push could not authenticate. No credentials were inspected.
The new measurement source is local `5bd3475729308664d9f3102f1f188362fbf9334f` on
`development/b2z-forecast-scheduling`; its exact-commit CI is **NOT RUN** pending
publication. Earlier green CI does not qualify these new measurements.

## Minimal maintained change

Retain the existing candidate-major scheduler and all policy/physics/financial
boundaries. Add bounded per-scenario/candidate cost telemetry and an opt-in bypass
of the completed-evaluation cache for fair measurements. Default caching and the
worker's identical-scenario reuse remain unchanged. Timing fields stay outside
deterministic forecast rows. Completed, cached and error delivery still share the
reviewed publisher. Metrics contain no extra world copies.

`segment_ms` measures the existing segment wrapper, including native subprocess,
serialization and recovery where applicable; it is not pure physics CPU time.
`summary_ms` measures derived result construction. Other task wall time includes
cloning, inputs/quotes, decoding and audit processing; time outside tasks also
includes worker startup, message delivery, termination and unreported work.
No billed cycles or inference costs were measured by this offline experiment.

In one predeclared fresh case, JS used 4,456.6 ms in segment execution of 4,920.6 ms
sampled task wall time (**90.6%**); result summaries used 21.6 ms. Wait/original/
alternate/changed-angle cost 1,781/3,581/4,906/4,906 reported cursor units and
481/751/1,986/1,702 ms. Work units are clearly not interchangeable with wall time.
The same native case used 1,716.4 ms in segment execution of 2,770.9 ms task time
(**61.9%**), with 33.3 ms summaries and 1,021.2 ms other task work. Both used exactly
15,174 reported units. These are single probes, inclusive of scheduling/GC pauses;
no unmeasured cause of individual stalls is asserted.

## Matched comparison

Unchanged per evaluation: **5,000 ms worker deadline + existing 300 ms termination
allowance, 100,000 work, four logical ticks, at most five candidates**. Each batch
retains 300 seconds/two million work including replay and conservative reservations.
Conserve scenarios are admission at 0/5/10 seconds (0/1/2 ticks). Default 60/120-second
futures, other opponent actions and omitted candidates remain **UNASSESSED**.

Control: existing candidate-major order. Challenger: complete Wait first, then
scenario-major across legal affordable candidates in ascending full cost, preserving
their declared order at equal cost. This is not the rejected geometric shortlist.
Fresh data are the existing ten combined bridge/long-approach decision points
(seed 41, both positions, five defence states). Both schedules receive identical
states, quotes, funds, horizons, scenarios and work limits, with completed-evaluation
caching disabled. Challenger reverses case order; no competing benchmark runs/builds
were launched. Host variation was recorded, not used to discard failures. This is
one paired comparison, not a statistically powered speed claim.

| Fresh ten cases | Selected/Wait complete | At least one complete paid alternative | Complete paid alternatives | Entire evaluation complete | Mean wall ms | Reported work | Conservative charge |
|---|---:|---:|---:|---:|---:|---:|---:|
| JS existing | 100% | 100% | 22/30 | 3/10 | 5,062 | 124,206 | 740,142 |
| JS challenger | 100% | 80% | 23/30 | 7/10 | 4,947 | 133,328 | 402,378 |
| Native existing | 100% | 100% | 30/30 | 10/10 | 1,399 | 148,080 | 148,080 |
| Native challenger | 100% | 100% | 30/30 | 10/10 | 1,232 | 148,080 | 148,080 |

The first percentage includes Wait selections. Challenger returns Wait twice with
no complete paid candidate; existing JS makes ten paid selections. Minimum complete
paid alternatives are 1 versus 0 (native: 3 for both). Thus a higher overall complete
count does not establish more reliable useful decisions. JS unobserved-work
reservations are **615,936 versus 269,050**, separate from reported work. Every
incomplete evaluation reserves the entire requested allowance; last delivered work
is a lower bound, never an assertion that interrupted work was free. Native complete
runs need no such additional reservation. Totals exclude separately recorded replay.

Realised outcomes reuse the exact previously executed 32-tick branches only after
selection; memo, amount and decision-state identities are checked. Full costs below
include the opening and response transfers plus each fee, across independent valueless
cases. No real ICP is spent or monetarily equivalent value assigned to canonical score.

| Fresh ten cases | Incremental canonical score versus matched conservation | Full synthetic ICP cost |
|---|---:|---:|
| JS existing | +53.499201 | 5.0020 |
| JS challenger | +47.405065 | 4.2018 |
| Either native schedule | +59.597067 | 5.0020 |

The challenger preserves 0.8002 more synthetic ICP but loses 6.094136 incremental
score versus JS control. These are distinct objectives, not one weighted utility.
Native outcomes/choices agree exactly. All 216 shared complete fresh forecast rows
are equal across schedules (96 JS + 120 native), plus 24 supplemental archived-case
rows. No partial result claims a global optimum.

### Additional held-out situation

After freezing the maintained source and rejecting the challenger, run one new
combined-geometry state with the opening ball's horizontal velocity reversed,
seat 1, Wait defence, seed 41. Its initial state is
`a3bc85aec61dd3e3a9a50ee6591e5d8e7aba3afa27838b7fe6d8dc88d338ec75`, absent from
the fresh archive. The existing matched runner executes only this situation's six
response arms: 46,608 work / 12.255 seconds. Its setup patch/script and full inputs,
canonical receipts, outcomes and scores are retained; there is no second simulator.

Both JS schedules select the alternate approach using two fully assessed paid
alternatives, with complete selected-action/Wait comparisons; both whole evaluations
are partial. Existing versus challenger: 5,178/5,157 ms, 13,055/14,458 reported units,
100,000/100,000 conservative charge. Both native schedules complete all three paid
alternatives, selecting the same action in 1,329/1,191 ms at identical 15,174 work.
All four have **+6.089852** incremental canonical score versus matched conservation
and **0.5002 ICP** full synthetic cost. No reliability or outcome advantage emerges.
A supplemental old straight-approach case also ties under both engines; it is
clearly separate from this newly held-out state.

Across all fresh, supplemental and new held-out schedule runs, 40 matching-input
selected-state replays pass; eight checks with an actual reactive input absent
from the no-new-opponent model are UNASSESSED. The two phase-profiling probes add
two matching hashes. Missing or unmodelled futures are never converted to successes.

## Verification, decision and next experiment

- **PASS:** 52 focused JS tests, including bounded scenario/candidate costs,
  deterministic forecasts free of timing fields, zero-work scenario cache hits,
  completed-evaluation cache bypass and unchanged normal caching.
- **PASS:** 20 existing exact native/reference fixture/forecast comparisons,
  bounded native work and native artifact mismatch rejection.
- **PASS:** source inventory with Python 3.11 (168 JS syntax checks). An initial
  invocation of the host's older `python3` failed because it lacks `tomllib`;
  its log is preserved separately and does not conceal an application failure.
- **PASS:** complete-schedule equality regression for the experimental alternative;
  it remains evidence, not a maintained alternative implementation.
- **BLOCKED:** publishing the prepared merge; **NOT RUN:** new-source remote CI.

The maintained scheduler is unchanged. The minimal justified change is cost
observability and uncached measurement controls, not a new selection policy.
No game-rule, DTR, executor, consent/signing, source-history, identity or production
change occurred; the expired campaign remains stopped. Dependencies and native
source are unchanged. The frozen optimized native helper hash is
`baf2578c1388ade63abb722be761aa8860b549c7331d33bf40f389e23982c795`;
DTR remains `282d709143dacb4bca769a4d6e72b97fc93ef518`.

The next useful local experiment is a predeclared Wait-plus-two-affordable-actions
prefix, rotating those equal-cost actions on held-out positions. Compare the
reliability gained against opportunities lost by explicitly omitting the third
candidate. This tests a computation allocation trade-off without a geometric
heuristic, new cache or larger limit. Native completion on these small cases does
not establish completion at every population or at long mainnet admission delays.

Reproduce maintained cost checks and either archived decision point:

```sh
node --test --test-concurrency=1 tests/js/b2z-agent-analysis.test.mjs tests/js/b2z-counterplay.test.mjs tests/js/b2z-forecast-choice.test.mjs tests/js/b2z-forecast-progress.test.mjs tests/js/b2z-forecast-cost.test.mjs
node tools/test_b2z_native_forecast.mjs .work/b2z-native-release/target/release/native-conformance-v4
node tools/b2z_forecast_attack_experiment.mjs .work/scheduling-replay evidence/B2Z/fresh-geometry-2026-11-04/fresh-trials.json.gz --no-cache
```

`experimental.patch.gz` applies to the qualified `27cdaf7` tree in a disposable
checkout. Run its tool with `--schedule=wait-first-scenario-major`; add
`--reverse-cases` for the fresh challenger. The archived new-heldout reproduction
uses the maintained source and a temporary worker-only schedule patch, restoring
the worker in `finally`. Neither patch is active in maintained code. Detailed
per-case score fractions, costs, coverage, reservations and measurements are in
`comparison.json`; exact artifact hashes and source identities are in `artifacts.json`.
