# Bounded forecast attack selection

Parent `5730a14197b81d02d6aec91fa75165d546366ae7` passed all six substantive jobs
in [CI 41823976844](https://github.com/aodl/balls-2-the-wallz/actions/runs/41823976844).
The informational production-inventory wrapper remains substantively BLOCKED.
The old branch was left unchanged; no merge or deployment was performed.

New branch: `development/b2z-bounded-attack-forecast`.
Executable source: `80b6a9eacfd53560d3156f8b725bb1587403f540`.
The closing commit adds this evidence/STATUS only. New-source CI is separate from
the parent's passing run and awaits publication. No production, spending,
campaign, controller, DTR, identity or backend operation occurred.

## Reproduced cache defect and correction

With a one-work-unit limit, evaluateActions returns bounded_partial. Repeating the
same snapshot/options previously returned cache_hit=true for the incomplete
result, preventing a fresh bounded attempt after a transient timeout. The failing
assertion and exact reproduction are preserved. Only complete evaluations with
the expected number of complete rows are now cached. Complete evaluations retain
the existing 32-entry cache and reuse behaviour. No automatic retry loop, larger
work limit, timer change or new cache system was added.

This is an agent integration defect; no authoritative gameplay invariant failed.
The regression checks both fresh incomplete attempts and retained complete hits.

## Selection and experiment

`chooseForecastAttack` uses the existing exact-kernel worker and existing Pareto
eligibility. It requires complete matched Wait comparisons, known integer full
prices, the selected own cannon and an explicit discretionary allocation. At equal
full cost it prefers worst incremental score, then mean score, then stable ID.
The previous counterplay selector's decisions remain unchanged; it exposes its
eligible IDs as additive diagnostic data. The new selector has its own identity:
`b2z-forecast-attack-1`.

No exchange rate between score and ICP is assumed. Cheapest eligible improvement
comes first, with positive mean and nonnegative worst incremental canonical score.
Missing, incomplete, unadmitted and unknown-island predictions cannot justify a
paid choice. Missing/paused Wait assessment returns Wait. Corrupt predicted state
remains an error. This is pure local planning, not snapshot authentication, campaign
consent, a signing boundary or a live-runner integration.

The new tool reconstructs all twenty held-out public decision points from the
previous exact initial worlds, opening inputs and already admitted defence. It
checks every public-state hash. The policy sees only this state and affordable
proposals, never the defender's future action or retrospective oracle outcomes.
After selection, the tool matches proposal memo/amount to the corresponding
previously executed 32-tick exact-kernel branch. Realised long-horizon utility is
reused evidence, not a newly executed thirty-two-tick campaign or live observation.

It also executes each selected action through the canonical local payment path
for four more ticks. For the sixteen no-new-opponent-input comparisons, terminal
state hashes agree exactly with the corresponding conditional forecast. Four
reactive Move cases have actual queued opponent input absent from the no-new-action
scenario: their accuracy is UNASSESSED, not claimed as successes or engine errors.

Bounds are unchanged in the worker: at most five candidates, 100,000 work units,
5,000 ms per evaluation. This experiment uses **four logical ticks**, with declared
admission scenarios **0/5/10 seconds** at assumed Conserve pacing. It makes no
60/120-second safety claim. The offline tool additionally caps total work at
2,000,000 and wall time at 300 seconds. The final batch used **160,590 cursor work
units / 34.253 seconds**, including exact prefix/conditional replay. Cached work
is not counted again. These are local measurements, not billed cycles.

Eight-tick preparatory JS and native forecasts exceeded the existing wall bound
in some cases; these partial results are preserved. They demonstrate the observed
limit on this host, not a universal capacity claim. The shorter horizon is an
explicitly weaker forecast, not a hidden relaxation of completeness.

## Results and economic trade-offs

Twenty recorded situations: both endpoint/account seats, bent-near and long-
approach geometries, seeds 22/33 and all five defence choices. These positions were
used in preparation and earlier reviews; this is not a blind independent holdout
or evidence of global superiority.

| Measure | Geometric holdout | Bounded forecast |
|---|---:|---:|
| Exact best tested long-horizon score | 8/20 | 13/20 |
| Score versus geometric holdout | baseline | 12 improve, 8 tie, 0 lose |
| Full expenditure difference over matched arms | baseline | 0 e8s |

The bent-bridge proactive-support cases choose the original heading instead of
the geometric changed angle, gaining about **0.299635** canonical score units at
identical cost. The long-approach cases choose the alternative connection instead
of repeating the original attack, improving score by about **5.306638–6.166278**
units at identical cost. All other bent-bridge choices tie the geometric holdout.
Exact rational values and per-case costs are retained in summary.json.

The new selector still misses seven long-horizon oracle choices; its largest
remaining gap is approximately **0.811990** score units. A four-tick prediction
cannot guarantee the best thirty-two-tick action. It also uses only three selected
future-input scenarios whose equal treatment is not an opponent probability model.

Chosen attacks cost the same as their holdout counterparts: one additional ball
costs 0.1001 or 0.4001 ICP including fee, depending on the current island pool.
Opening plus response is 0.2002 or 0.5002 ICP; these are valueless synthetic inputs.
Canonical score is not ICP revenue. No real transfer, account balance consumption,
refund or spending authority was introduced.

## Preserved reporting mistake

The first comparison run deleted next_state_hex fields while trimming its report,
which also mutated cached forecast objects. Later decisions lacked those fields
and fell back to Wait. That run is preserved as CONFOUNDED. The reporting tool now
constructs a separate trimmed projection and does not mutate evaluator replies.
No new persistence layer or cache-copy framework was required.

## Verification and reproduction

- **47 focused tests PASS**: existing consent/casualty/version/island checks plus
  cache retries/reuse, cost/scope validation, budget requirements, marginal versus
  passive accrual, missing futures, exact equal-cost ranking and corruption errors.
- **20 native/reference fixture/forecast comparisons PASS**, plus native work-limit
  and artifact-identity rejection checks.
- Source inventory and 166 JS syntax checks PASS. This is not compilation or new
  backend qualification. No historical 900-second programme was rerun locally.

```sh
node --test --test-concurrency=1 tests/js/b2z-agent-analysis.test.mjs tests/js/b2z-counterplay.test.mjs tests/js/b2z-forecast-choice.test.mjs
node tools/test_b2z_native_forecast.mjs
node tools/b2z_forecast_attack_experiment.mjs .work/b2z-forecast-attack
```

Pinned dependencies and native binary are unchanged from the parent evidence.
Compressed artifacts preserve their exact original JSON; hashes are in artifacts.json.

The next useful experiment is a fresh approach geometry or admission beyond ten
seconds, checking whether the short-horizon benefit persists or appropriately
returns Wait. No rule/pricing change is supported by this comparison.
