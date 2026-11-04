# Counterplay correctness and closed-loop decisions

Branch: `development/b2z-adaptive-counterplay`, continuing published `3f60e92`.
Code commits: `2ab0c7b` (version/island corrections and public attacker), `20d1979`
(matched response sets and legal hindsight oracle), `0063a17` (shared initial-state
and exact proposal records), `180af66` (integer discretionary investment budget).
Earlier accepted policies, results and budget/input-order failures remain unchanged.
No rules, DTR, executor, backend, live observation, spending or campaign operation.

## Correctness

`decide()` validates versions before dispatch. Local counterplay defaults to its
explicit `b2z-counterplay-2`; unknown versions fail `UNKNOWN_POLICY_VERSION`.
Explicit historical policy versions on counterplay data fail
`POLICY_EVALUATION_MISMATCH`, rather than being silently reinterpreted. Ordinary
historical forecast evaluation remains supported unchanged.

`defendedIslandSupport` resolves ownership at the defended cell in each snapshot,
then uses the existing snapshot-local island label to count friendly support on
that island. Labels are never assumed permanent across topology changes. Original
player-ball counts remain separate. The location is fixed at the original defended
cannon cell: moving a cannon to another island cannot silently change the strategic
objective to the destination island. If that location is lost, defended support is
zero even if other friendly islands remain active.

The small `agent-two-island-support.json` patch fixture adds a remote owned island,
anchor and ball to the existing bridge snapshot. Losing the defended ball leaves
one friendly ball globally but zero supporting the defended island. The regression
checks both facts and prevents Anchor from treating global survival as defence.
This is a derived-state fixture, not a new authoritative collision scenario.

## Closed-loop policy and separate oracle

At tick 4, the attacker receives only the actual public kernel state, own cannon,
remaining budget and affordable proposals. `public-attack-1` uses toroidal cell
geometry to aim a single ball toward the nearest opposing ball, or Wait if no
supported/affordable approach exists. It does not call the experiment's future
results, inspect the defender's private choice, or receive hindsight labels.
The same state produces the same decision. Proposals include repeat, alternate,
changed angle, two-ball purchase where affordable, and Wait. Its frugal rule does
not assume an extra identical-heading ball is worth purchasing.

The action is encoded through the existing canonical payment/memo path, processed
at the recorded tick and reconciled to normal receipts and exact births/deaths.
Payment proposals have the actual island price, fee and remaining budget. No live
Ledger calls or signing. All states here are synthetic exact-kernel outputs,
**not authenticated IC observations**.

The separate exhaustive oracle tests the same actions at the same admission time.
Unavailable or over-budget actions are excluded from this *available-action* oracle,
not counted as successful actions. Oracle selection maximises attacker canonical
score with lower expenditure as its tie-breaker. The report separately records the
worst response for defender score. Neither criterion asserts a conversion from
score to ICP. Public policy rows are excluded from oracle candidate sets.

Defender policy comparisons use the same four common single-ball/Wait response
scenarios for new and historical versions. They remain local planning comparisons;
this work does not turn the defender's exhaustive analysis into a live adaptive
policy or claim it was a closed-loop defender decision.

## Experiment and economic outcomes

Two 120-row experiments: the original two geometries/seats, and held-out opening
velocities/admissions. Original deterministic seeds are 17/28; held-out seeds
22/33 reverse the initial opponent ball's horizontal velocity and swap opening
admission from tick 2/1 to tick 1/2. Geometry is unchanged: this tests held-out
positions/motion/timing, not a wholly new map. Both endpoint/account seats are
included. Each invocation has 96 paid defender arms and 24 shared Wait controls across
five defences and six response modes, including public-policy execution.

All arms use 32 logical ticks, assumed five elapsed seconds/tick, defender ceiling
0.25 ICP and attacker ceiling 0.75 ICP. Defence admissions remain ticks 0/4/12
(0/20/60 seconds); response proposals at tick 4 see state before any same-tick
queued defensive move is applied. The kernel's canonical position order decides
that batch. The closed-loop changed-angle response and its oracle counterpart both
admit at tick 4; historical delayed-angle experiments remain separately preserved.

A = opening attack then conserve; B = repeat one additional attack; C = select a
response from current public state. Every recorded score is canonical accrued
area-time, with incremental comparisons against the corresponding Wait policy.
Raw results include territory, island activity, anchors, complete births/deaths,
receipts/rejections, expenditure, remaining budget, quotes and observation hashes.
The recorded held-out artifact additionally includes deduplicated exact initial
world bytes and exact opening/defender proposals. Reproduction of the original
initial snapshots is pinned by fixture, source, geometry, seat and state hash.

| Finding | Original positions | Held-out motion/timing |
|---|---:|---:|
| Public attacker exactly matches best tested score | 8/20 defender situations | 8/20 |
| Public attacker's score gain over conserving | 0 to 1.385729 | 0 to 1.385729 |
| Largest score gap to available-action oracle | 6.195920 | 6.195920 |

The public policy targets the changed angle on the bent bridge and the original
angle on the long approach. On 8/10 bent-bridge situations it reaches the oracle;
in the two proactive-support cases its gap is about 0.299635 score units. On the
long approach it is weak: changing angle can earn substantially more than its
chosen repeat. In proactive/reactive Move cases the chosen repeat costs an
additional **0.4001 ICP** yet produces **zero incremental attacker score** versus
conserving. This is a strategic targeting limitation, not autonomous adaptation
proved successful. No hindsight result was fed back into the policy during play.

One additional ball costs 0.1001 or 0.4001 ICP depending on the current pool,
including one fee. Full opening-plus-follow-up cost is 0.2002 or 0.5002 ICP;
conserving after the opening costs 0.1001 ICP. Rejected defender Move still costs
0.0002 ICP; a supporting/recovery ball costs 0.1001 ICP. Remaining balances include
all spent amounts/fees, not just `amount_used`.

The two-ball follow-up is affordable in only 2/20 defender situations in each set:
proactive support on the bent bridge, both seats. It costs **0.6002 ICP total**,
versus **0.2002** for repeating with one ball. Both produce exactly the same attacker
score and defender territory/survival within this horizon. The extra ball remains
alive, so future option value is unknown. In the original seat-0 example, the
attacker has three births/one death versus two births/one death; defender has one
birth/one death, one surviving supporting ball and five cells in both arms.
Attacker budget remaining is 0.1498 versus 0.5498 ICP. No claim of universal
redundancy, or justification for changing prices, follows from this small case.

## Strategy diversity and generalisation

Anchor/Adaptive retain the defended-island survival constraint. Frugal instead
requires a caller-declared *integer discretionary allocation*, set to 0.01 ICP in
these experiments, and ranks cheaper eligible improvements within it. This is a
policy objective, not a spending grant. Without a valid allocation it returns Wait.
All still require positive mean incremental score and nonnegative worst score over
the declared completed scenarios. No probability model or arbitrary utility weights.

At long-approach seat 0, Frugal chooses cheap proactive Move despite its island
survival downside. Anchor/Adaptive choose delayed support in the original scenario
and proactive support in held-out motion/timing. At other positions all three
choose cheap Move. Agreement is retained where justified; distinct policies are not
forced to disagree. Ordinary eight-policy forecasts and historical versions remain
available. Adaptive here has no newly trained behavioural model or private-opponent
information; its local counterplay ranking must not be described as online learning.

The economic preference for cheap Move and the warning about redundant same-heading
balls carry across the tested motion/timing change. The geometric attacker does
not generalise to the long approach. A useful next targeted change is a bounded
existing-kernel forecast for its affordable headings, compared with this frozen
public geometric holdout; it should include a rule for conserving when no assessed
paid action improves its objective. No broad tournament or new engine is needed.

## Verification, provenance and publication

**40 focused regressions PASS**, including unknown/historical versions, two-island
support, public direction changes, exhausted budget, integer discretionary budgets,
existing consent, canonical casualty accounting and matched reward handling.
**20 native/reference fixture/forecast comparisons PASS**, plus work-limit and
artifact-identity rejection checks. The kernel/forecast engine did not change.
These checks do not independently replay every tactical trajectory in Rust.

Cursor work and observed wall times are recorded in each raw artifact and the
manifest. The 2,000,000-work / 300-second cooperative offline-runner bounds are
unchanged; normal forecast worker bounds are unchanged. There was concurrent local
work during some executions; wall times are reported as observed, not billed cycles.
No empirical live latency or LLM inference cost is claimed. The attacker is scripted.

An exploratory closed-loop run had a mismatched delay between the public changed
angle and the enumerated angle. Its results are preserved as **CONFOUNDED**, not
used for the oracle-gap claims above. Aligning those admissions corrected the harness.
One repeated held-out execution froze decision code before the final metadata-only
recording addition; its hashes/outcomes agree with the final recorded case set.
Original accepted budget-confounded and input-order FAIL archives were untouched.

Remote inspection confirmed `3f60e92` already published. Its run `41813053697` was
still in progress at the recorded observation; it does not qualify these changes.
An ordinary push of the new correction failed because no GitHub authentication is
available (`could not read Username`, terminal prompts disabled). No credentials
were read/exported. Exact-new-commit CI remains **BLOCKED pending publication**;
no earlier green run is substituted. The final report provides the ordinary push
command. No release or production changes are requested.


Final measurements: original 712,493 cursor work / 65.681 seconds; recorded
held-out 774,830 / 161.191 seconds. The later integer-budget check changes no
recorded allocation (already bigint). The final metadata addition preserves all
120 held-out terminal state hashes; four exact initial worlds pass hash checks,
all budgets remain nonnegative and all casualty attribution is complete.
Compressed artifacts retain their exact original JSON bytes; uncompressed hashes
and execution-source provenance are in artifacts.json. For example:

```sh
gzip -dc evidence/B2Z/closed-loop-counterplay-2026-11-04/heldout-results.json.gz > .work/heldout-results.json
node tools/b2z_counterplay_report.mjs .work/heldout-results.json
```

Run new local trials with:

```sh
node tools/b2z_matched_strategies.mjs .work/closed-loop --adaptive-defence --closed-loop
node tools/b2z_matched_strategies.mjs .work/closed-loop-heldout --adaptive-defence --closed-loop --held-out
```
