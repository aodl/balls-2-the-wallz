# Completed forecast rows must survive later interruption

Branch: `development/b2z-streamed-forecast-progress`.
Executable source: `ce8a28e7ba2f843552b5a40bfe59d26bc24eb270`.
Parent: published `e7ff49186d689f5cfc1256a014d8415ab5225c66`.
The parent's CI run 41906883732 was still running its installed-IC job at this
recording; the other five substantive jobs had passed. Parent and child CI results
remain distinct. The original branch/source was not changed or merged.

## Deterministic failure and narrow fix

The forecast worker appended cached rows to its final results but did not stream
them to the parent. The parent uses streamed rows if its hard deadline terminates
later computation. A completed equivalent Wait scenario could therefore disappear
from a partial reply even though the worker had already calculated/reused it.
Error rows were also withheld until the final message.

A deterministic regression supplies two equivalent one-tick scenarios and stops
at the first paid-action progress message. Before the fix, the prefix has only the
first Wait row and the later Fire row: the completed cached Wait row is missing.
After the fix the prefix includes that cached row, marked complete/cache-hit,
before the Fire progress. This test does not depend on a slow host or lengthen a
deadline. The preserved assertion FAIL is an agent delivery defect, not a physics,
certificate, authoritative receipt-retention or game-rule failure.

One small publish function now appends and streams cached, freshly computed and
error rows. The complete final array is unchanged. Native-artifact mismatch still
fails before simulation; errors do not become safe futures. No new trajectory,
receipt, birth/death or gameplay state is invented. A hard deadline can still stop
unfinished work; the fix queues rows which were already computed before continuing.

The implementation replaces duplicated delivery paths (16 lines added, 12
removed). It changes no physics, pricing, work/time limits, snapshot authenticity,
public API, DTR epoch, backend, payment executor or campaign/signing authority.
No production operation, real ICP payment, funding or controller action occurred.

## Verification and replay

**50 focused tests PASS**: the previous 47 plus streamed cached rows before
interruption, exact agreement of all streamed/final rows, and streaming of invalid
kernel-context errors. The latter is a synthetic context test, not an IC certificate
qualification. **20 existing native/reference fixture/forecast comparisons PASS**,
including bounded work and artifact-identity rejection checks. The original bad
prefix and the corrected prefix are included.

```sh
node --test --test-concurrency=1 tests/js/b2z-agent-analysis.test.mjs tests/js/b2z-counterplay.test.mjs tests/js/b2z-forecast-choice.test.mjs tests/js/b2z-forecast-progress.test.mjs
node tools/test_b2z_native_forecast.mjs
node tools/b2z_forecast_attack_experiment.mjs .work/progress-replay evidence/B2Z/fresh-geometry-2026-11-04/fresh-trials.json.gz
```

A ten-point fresh-geometry replay still timed out overall in all ten evaluations.
All ten partial replies now include the cached Wait scenario; the preserved
before-run had none. Five fully assessed candidate prefixes permitted an original-
angle proposal; five returned Wait. Required selected-candidate/Wait scenarios
remain mandatory, while later uncomputed candidates remain unassessed. This does
not establish improved strategic strength: hard deadlines and long-horizon oracle
gaps remain. We do not infer a complete future from entity counts.

The replay reported 67,082 known cursor work units and conservatively charged
1,015,443 against its unchanged two-million-work batch budget. Wall time was
64.847 seconds. These are local measurements/reservations, not billed cycles.
Eight matching-input four-tick state hashes agree; two actual reactive inputs were
not in the no-new-opponent scenario and remain UNASSESSED.

## Negative shortlist preparation retained

A separate scratch probe used current ownership geometry to select one paid
heading before the same exact-kernel forecasts. It still timed out in all ten
cases and returned Wait. This heuristic was not added to maintained policy code.
Its raw results are preserved rather than tuning the policy to this one case.
Neither comparison proves an environmental cause for deadline failures, nor a
universal capacity limit. Only the missing completed-row delivery had a stable
minimal reproduction and is fixed here.

The most useful next measurement is per-scenario computation cost and a bounded
schedule that preserves complete selected-action comparisons. No new simulator,
reinforcement-learning system, larger runtime limit or live campaign is warranted.

## Publication and scope

New-commit remote CI remains required; a parent pass cannot qualify this correction.
The environment lacked authenticated GitHub publishing at the previous attempts.
All prior PASS/FAIL/BLOCKED archives remain unchanged. This commit is local agent
correctness work and does not authorise production or paid gameplay.
