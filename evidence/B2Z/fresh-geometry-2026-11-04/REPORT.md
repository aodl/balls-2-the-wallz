# Fresh combined geometry and bounded-compute trade-offs

Qualified parent: `ff10c8020db386b62ea28db5e02b482a19acff06`.
[CI 41869373848](https://github.com/aodl/balls-2-the-wallz/actions/runs/41869373848)
completed SUCCESS with all six substantive jobs passing: Native conformance;
Source conformance; Runtime-lab Wasm; Browser HTTP/Web Crypto; Packaged DTR/clean
consumers; S14 and million-cell installed-IC qualification. The informational
production-inventory wrapper remains substantively **BLOCKED**. No merge was needed
before continuing on `development/b2z-fresh-geometry`.

New tools-only source: `e5f7f1a6b5d261e471d2d4c88ef1b66f8f492ee5`. The following
closing commit records these results. Policy, forecast worker, game kernel, DTR,
executor, economics, identities, signing privileges and production are untouched.
No real ICP, cycles transfer, account funding or campaign operation occurred.

## Fresh case and reproduction

This case combines the previously separate bent toroidal bridge and connected
long hostile approach. It was not used to choose the earlier forecast policy.
Seed 41 seals opening admission at tick 2; both defending cannon positions/account
seats are tested. Five defences and six response modes produce **60 exact-kernel
arms** (48 paid defender arms and 12 shared Wait controls), with ten public-policy
decision points. This is one additional topology, not a tournament or population
sample. All states remain synthetic, not IC-authenticated observations.

```sh
node tools/b2z_matched_strategies.mjs .work/fresh-trials --fresh-counterplay
node tools/b2z_forecast_attack_experiment.mjs .work/fresh-forecast .work/fresh-trials/results.json
```

The fresh flag implies the existing adaptive and closed-loop modes. Historical
modes keep their existing case definitions. The forecast tool now accepts an
optional raw/compressed archive path; its default archive remains unchanged.

Both player ceilings are unchanged: 0.25 ICP defender, 0.75 ICP attacker, with full
fees and retained rejected payments counted. The strategic horizon is 32 logical
ticks at an assumed five seconds/tick. Defence admissions remain ticks 0/4/12 and
responses tick 4. The forecast itself retains four ticks, 0/5/10-second assumptions,
five-second/100,000-work per-call limits and the same fallback/eligibility rules.
No 60/120-second safety claim or paid-play permission follows from this experiment.

## Actual results

The 60-arm kernel batch passed at **458,391 cursor work units / 186.888 seconds**.
Canonical receipts and complete ball births/deaths remain in fresh-trials.json.gz.
The first ten-point forecast run hit its wall bound in all ten cases and chose
Wait. It is preserved, including its incomplete work counters. The repeated run
was needed for corrected incomplete-work accounting, not to alter policy weights.
It produced the following mixed result:

| Measure | Recorded accounting run |
|---|---:|
| Forecast evaluations complete / partial / timed out | 3 / 4 / 3 |
| Paid choices / Wait | 6 / 4 |
| Canonical score versus geometric holdout: improve / tie / lose | 5 / 3 / 2 |
| Full cost difference over ten independent cases | −1.6004 synthetic ICP |
| Best tested long-horizon score reached | 3/10 versus geometric 0/10 |
| Matching-input four-tick replay hashes | 8 PASS |
| Reactive-input accuracy comparisons | 2 UNASSESSED |

Paid selections in partial evaluations have all required scenarios assessed for
that chosen candidate and Wait; other alternatives remain explicitly unassessed.
Missing Wait or no eligible paid candidate returns Wait. A partial evaluation is
not described as a complete comparison of all alternatives.

Five gains are approximately **5.366004–6.098160** canonical score units. The two
losses are **−0.04419072** each: Wait conserves 0.4001 ICP but gives up the geometric
follow-up's small score benefit. Three ties also include cases where conserving
avoids paying for zero marginal score. Exact rational deltas, costs, rejected
payments, retained islands/cannons and remaining budgets are in the raw records.
No score-to-ICP exchange rate makes either side automatically preferable.

The first all-Wait run and the mixed repeated run use the same frozen policy.
Compute availability changes which predictions finish inside the fixed wall limit;
the run does not establish why that availability differed. The earlier 12/20
improvement is therefore not a general reliability guarantee. No new ranking rule
was fitted to this case. Policies are retained unchanged rather than tuned to one
favourable subset. A useful next test is a smaller explicitly declared shortlist
or staged forecast, measured against these frozen counterfactuals and budgets.
It must continue to label omitted futures and longer delays as unassessed.

## Work-accounting correction and preserved failure

Canceled evaluations may expose only a last reported work counter. Treating that
counter as the entire batch-budget charge understates unknown in-flight work.
The offline tool now keeps **reported work** separate from **budget charge** and
reserves the full requested allowance for incomplete/unknown evaluations. Known
larger counts cannot be undercharged. No worker limit increased and no retry loop
or new persistence framework was introduced.

The accounting run reported **90,607 known work units**, but charged **732,459**
against its two-million-work batch cap, including seven incomplete evaluations'
reservations. Wall time was **50.508 seconds**. These are local cursor counters and
conservative budget charges, not a gross CPU meter, billed IC cycles or actual ICP
consumption. Reservations are not measured consumption.

An initial 120-arm exploratory batch (two fresh opening timings) failed the
existing combined work/time guard. Its exact counter at failure was not captured;
the cause was not established. Its FAIL log remains preserved and was not called
environmental or green. The smaller 60-arm batch kept the same 300-second and
two-million-work limits. The runner now writes work/time/completed-row evidence
before failing that guard. This is a narrow diagnostic addition, not a qualification
framework or a higher runtime limit.

## Verification and limitations

- **47 focused regressions PASS** on the new tools branch; both changed tools pass
  Node syntax checks. Budget/state-hash validation passes on the recorded artifacts.
- All initial-state hashes validate. Eight matching-input conditional predictions
  agree exactly with replay. Two actual queued reactive inputs differ from the
  model and remain UNASSESSED; no invented accuracy is reported.
- Parent native/reference equality and exact-commit CI are reused within their
  existing scope. This new topology was not independently replayed in Rust.
- No historical 900-second browser qualification or production test was run.
- New-source CI still requires publication; the parent's success does not qualify
  this new tools/evidence commit. No authenticated GitHub publishing route was
  available in this environment at the last attempt.

Compressed artifacts preserve their original JSON bytes and hashes. Prototype
setup/payment logic matches the maintained fresh mode; source provenance is in
artifacts.json. Final numeric counter validation changes no recorded valid count.
The old accepted PASS/FAIL/BLOCKED campaign and experiment archives remain intact.
