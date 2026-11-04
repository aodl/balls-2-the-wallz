# Adaptive counterplay — bounded local development

Baseline: merged master `c4c955f1cfc43a6f5fa857f76edc209d9fc7a4d0`.
Development branch: `development/b2z-adaptive-counterplay`.
Initial implementation: `4ec6d38a9aec0d4ac2f951d4d79f10225086c2ee`.
The following closing commit includes this report and a conservative summary fix:
unavailable/budget-excluded responses remain unassessed rather than becoming
complete forecasts. No final measured row has such an exclusion.

No production query/deployment, signing, payment, pause, controller operation,
funding or campaign operation was performed. All payment values below are
valueless encoded inputs to the existing pure game kernel, not disposable-Ledger
transfers. This phase does not exercise Ledger/Index transport again.

## Implementation and evidence-supported policy change

The existing matched runner now accepts `--adaptive-defence`: five defensive
investments, four follow-ups, two geometries, both endpoint/account seats. Existing
historical modes remain available. No new simulator or framework. Follow-up quotes
are computed from each arm's actual public state at its stated response tick;
canonical payments, receipts, births, deaths, ownership and scores come from the
unchanged exact kernel. These synthetic states are **not IC-certified snapshots**.

The local-counterplay evaluation adds a Pareto shortlist to the existing Frugal,
Anchor and Adaptive entry points. Historical `b2z-policies-3` behaviour remains a
holdout. Other five policies and ordinary forecast inputs remain unchanged. There
is no unsupported claim that all six strategic policies improved.

Mean and worst canonical score comparisons use exact integer fractions for
eligibility, dominance and ranking. Derived decimal displays are labelled. A
candidate needs complete unique rows for every declared response, positive mean
incremental score, nonnegative worst incremental score, and no reduction in worst
support survival versus Wait. Anchor/Adaptive prioritise support survival, then
worst score, then full cost; Frugal prefers cheaper eligible investments. There is
no weighted utility or payout claim. A positive fully assessed investment can be
chosen instead of waiting indefinitely. Missing/conflicting futures are excluded.

This selector is explicitly **local planning-only**. No live runner, campaign
approval, signer or outside-player guard was weakened or connected to it. No new
opponent-style learning/classification system was added: adaptation here is to
bounded public-state counterplay, not learned recognition of six behavioural types.
All eight original policies remain available.

## Reproduction

```sh
node tools/b2z_matched_strategies.mjs .work/counterplay-early --adaptive-defence
node tools/b2z_counterplay_report.mjs .work/counterplay-early/results.json
node tools/b2z_matched_strategies.mjs .work/counterplay-late --adaptive-defence --late-counterplay
node tools/b2z_counterplay_report.mjs .work/counterplay-late/results.json
node --test tests/js/b2z-counterplay.test.mjs tests/js/b2z-agent-analysis.test.mjs
node tools/test_b2z_native_forecast.mjs
```

Pinned npm lock SHA-256:
`06c12c7a029b645e1bfb7c1aa3137664d579c9f4fbf00092f6999e7b9eda71e5`.
DTR remains `282d709143dacb4bca769a4d6e72b97fc93ef518`.
Existing native binary used for equality checks:
`fd30fa3687a02247b60729edaa01273e059be49e8e16720addf1148adc14b2a0`.
No lock, dependency, kernel, executor or authoritative rule changes.

## Initial two-stage experiment and next local experiment

Each experiment has 80 rows/executions: 64 paid candidate arms and 16 shared Wait
controls. Identical initial state, budget ceiling and response rule are matched
within each comparison. Requoting means resulting payment amounts may differ;
these are matched response policies, not identical sealed future-input bytes.
Natural accrual is recorded separately from incremental score versus Wait.

Synthetic geometries: bent nearby bridge, and straight bridge with a connected
long friendly approach. The original historical pending strike is removed only in
these explicit synthetic setups, preserving the previously accepted fixture and
historical evidence. Deterministic seeds 17/28 set threat admission at tick 2/1;
both seats are tested for each. This is two fixed seeds across geometries, not a
random population or a seed-by-geometry tournament.

Defender choices: proactive Move, proactive support Fire, reactive Move at tick 4,
support/revival Fire at tick 12, Wait. At an assumed five seconds/logical tick these
are 0/20/60-second admissions. The initial follow-up is admitted at tick 4 or 6;
the next experiment admits it at tick 14 or 16 after delayed support is visible.
Responses: original heading 49152, alternate connection 57344, changed angle 40960
with two extra ticks delay, Wait. Thirty-two logical ticks (160 assumed elapsed
seconds) evaluate these choices. No 120-second-delay safety claim.

Both response sets quote from public current state, retain account/cannon targeting
and keep full fee-inclusive expenditure. All quoted follow-ups in final records
were available and within budget. Receipts include applied and rejected actions;
rejections still count as expenditure. Canonical birth/death attribution is complete
in every final arm, including purchased balls destroyed within the horizon.

### Actual comparison

Score units below are canonical area-time, not financial returns. Means equally
weight four selected responses; this is not an estimate of opponent probabilities.

| Geometry/seat and response timing | Holdout Anchor | New Anchor | New choice mean / worst incremental score |
|---|---|---|---:|
| Bent bridge, both seats, early | proactive Move | proactive Move | +0.115759 / +0.008438 (seat 0) |
| Long approach, seat 0, early | Wait | support at 60s | +0.081191 / +0.029371 |
| Long approach, seat 1, early | proactive Move | proactive Move | +0.097023 / +0.063476 |
| Bent bridge, both seats, late | proactive Move | proactive Move | +0.127308 / +0.057414 (seat 0) |
| Long approach, seat 0, late | Wait | proactive support | +0.079390 / +0.053248 |
| Long approach, seat 1, late | proactive Move | proactive Move | +0.112337 / +0.104250 |

Frugal and Adaptive make the same changes on these fixtures. Holdout Adaptive has
no prior matched history and delegates to Frugal; this is not a trained allocator
comparison. Supporting purchases preserve at least one ball in every tested
response at long-approach seat 0. Move there has higher mean score but loses all
support under a response, whereas Wait retains one. The explicit survival-first
rule deliberately accepts lower mean score. At seat 1 cheap Move also preserves
support, making expensive support less compelling. On the bent bridge, support
can have negative incremental value; its purchase is not preferred.

The attacker also adapts: maximising its own accrued score, it chooses the changed
angle after proactive Move in the early long-approach seat 0 case, but the alternate
connection after support. Minimising defender score instead chooses alternate
versus Move and original versus support. Both objectives are recorded separately;
"worst for defender" is not silently called the attacker's economic optimum.

Wait costs 0 ICP. Every Move costs **0.0002 ICP** including the fixture Ledger fee,
even when rejected. One support/recovery ball costs **0.1001 ICP**. Defender ceiling
is 0.25 ICP; attacker ceiling is 0.75 ICP, fixed across corresponding arms. Initial
attack plus follow-up costs 0.2002 or 0.5002 ICP depending on the actual pool at
requote; waiting after the opening costs 0.1001 ICP. Full values, remainders,
receipts, replacement prices, retained territory, island/cannon survival and exact
casualty/payment attribution are in the results. No zero-spend infinite efficiency.

## Work, verification and preserved failures

- Early final experiment: **498,224 cursor work units / 46.799 seconds**.
- Later follow-up experiment: **408,252 work units / 39.596 seconds**.
- Each invocation enforces 2,000,000 total cursor work and 300 seconds at cursor
  yields. These bounds apply to this offline multi-trial runner; normal forecast
  worker limits are unchanged. The wall bound is cooperative, not a hard process
  kill or a bound on every indivisible kernel operation.
- **36 focused tests PASS**, including existing consent/casualty handling, matched
  reward attribution, incomplete responses, Pareto cost dominance, a positive
  investment versus Wait, exact tiny rational gains/downside, duplicate conflicts.
- **20 native/reference fixture/forecast comparisons PASS** plus native bounded
  incomplete and artifact-identity rejection checks. These verify existing forecast
  plumbing; they do not independently replay every 32-tick tactical trajectory.
- Tactical outputs are deterministic exact-kernel conditionals, not live forecast
  accuracy measurements. No measured billed IC cycles, query bytes, model inference
  cost or empirical Ledger latency; no model service was used.

The first exploratory fixture had an inadequate attacker budget; all intended paid
follow-ups were excluded. Its raw status said PASS for execution, but it is
**CONFOUNDED / not adaptive-strategy evidence** (budget-confounded-results.json).
The next run genuinely FAILed on unordered same-tick input positions. Its log is
preserved. Canonically sorting the local fixture inputs and assigning monotonic
positions fixed the harness; no authoritative bug was found or reclassified away.
An intermediate corrected run lacked separate attacker-score instrumentation; the
final early run adds that required metric, without changing the game outcomes.

## CI, limits and next question

Exact-commit remote CI is **BLOCKED pending operator publication** of the local
branch; no earlier green run qualifies this source. Supplied AGENTS.md reserves
remote writes to the operator. No credentials were inspected or requested.

This is a selected head-to-head tactical comparison, not a four-player population
study or proof of global policy superiority. Long-term price manipulation, Sybil
advantages, global capacity and billed topology externalities were not retested.
No balance change is proposed. The next useful small experiment is to spend the
same attacker budget on an additional sequential response versus conserving it,
checking whether the observed survival investment persists beyond this horizon.
