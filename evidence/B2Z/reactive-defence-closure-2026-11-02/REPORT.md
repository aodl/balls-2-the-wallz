# Tactical closure: pause notices and reactive defence

Source `c2dc7c2` (full identity in identities.json). No backend, DTR, rules,
payment executor, identities, campaign or production assets changed. No ICP spent.
The frontend is packaged locally, not deployed.

## UI corrections and actual geometry checks

On short mobile viewports the compact notice is placed below the toolbar. At
320×640 the toolbar occupies y=110–250 and the notice starts at y=270: a measured
20-pixel gap, with no intersection. At 390×844 it retains central placement
(y=354–490), also below the toolbar. The status/minimap separation remains intact.
All thirteen controls are scrolled into view and checked for label width, viewport
bounds, toolbar clipping and enabled keyboard focus at both sizes. These are
rectangle-intersection assertions, not merely visibility/clickability checks.
[320 image](mobile-320.png), [390 image](mobile-390.png), [measurements](mobile.json).

Fresh operational status with verified gameplay now gives a non-spinning
operator-pause message when run.running is false. A checked source binding yields
`operator-paused`; an unchecked binding yields the distinct
`paused-source-unverified` warning. Neither promises funding-only resumption.
Stale status, unverified gameplay, transitions and verification errors cannot be
classified as a healthy operational pause. Healthy Reserve still requires enabled
gameplay, verified gameplay, fresh operations, checked source, no errors and closed
admission. No playback clock, head, trajectory or certificate rule changed.

The focused Chromium check uses production CSP and genuine read-only mainnet
certificate verification. Manual-stop/unchecked-source states are focused unit
fixtures; no production pause was performed. The clean-source packaged app is
`98a38af6899ab7289f4ed69a68e9724c9953a5187e3ed4ca4a7a1479014fe5de`;
CSS is `760ffc86ad7d9306a6b9ec1506f936aabc43263d8675e1f27e33de9cd09eeb24`.
The exact frozen bundle was checked after packaging; no installed-asset success
or production deployment is claimed. Reproduction scripts are included beside
this report and require the existing reviewed browser environment and staged assets.

## Genuine experiment confound, preserved and corrected

The historical bridge fixture contains a strike due at logical tick 1/16. A
one-tick replay with **no payment inputs** already changes ownership of bridge cell
103. Clearing that strike in a new local setup prevents that capture. The exact
states/events and assertions are retained in
[pending-strike-reproduction.json](pending-strike-reproduction.json).

This is an experimental attribution defect, not an authoritative gameplay defect.
The earlier matched comparisons remain valid conditional on their initial world,
including its existing threat. They do not isolate the new Fire at tick 1 as the
cause of every earlier loss. Original fixtures, old-mode behaviour and all prior
evidence remain untouched. Only the new synthetic experiment mode clears the
inherited strike before admitting the explicitly recorded opposing inputs.

The distant setup also requires a friendly approach corridor: neutral captures
reflect, so distance alone cannot be treated as free-flight travel time. Failed
predicted-outcome assertions are retained in hypothesis-FAIL.log and
corridor-FAIL.log. Those were faulty fixture expectations; no game rule was changed
to satisfy them. The final experiment still asserts exactly one terminal Move
receipt, full costs, and successful canonical launch receipts for every intended
opposing attack.

## Matched proactive/reactive comparison

```
node tools/b2z_matched_strategies.mjs .work/reactive-defence --reactive-defence
```

Eighteen pairs / thirty-six executions use the existing exact JS reference kernel
and runner, two geometries, both endpoint cannon positions and swapped public
account seats. Each Move/Wait pair has identical initial state, opposing inputs,
horizon and budgets. Geometry A is a bent bridge across the world seam with a
nearby source; geometry B is a straight bridge with a longer explicitly endowed
friendly attack corridor. Geometry and approach distance are not independently
randomised, so this is not a causal comparison of shape alone.

Attacks are admitted at tick 1. Proactive Move is admitted at tick 0; reactive
Move at tick 2 or 12. Sixteen logical ticks and explicit five-second elapsed inputs
model an eighty-second Conserve window, including sixty-second admission at tick
12. Existing local limits remain 2,000,000 work units / 60 seconds; forecast runtime
limits are unchanged. [Exact rational results, receipts, state/input hashes and
measurements](results.json).

| Geometry / attack | Move admission | Incremental score versus Wait | Extra final cells | Both cannon starts |
|---|---:|---:|---:|---|
| Bent / cardinal | 0 | 29651/390625 | 4 | Applied |
| Bent / cardinal | 2, 12 | 0 | 0 | Rejected |
| Straight friendly approach / cardinal | 0, 2 | 94028/1953125 | 3 | Applied |
| Straight friendly approach / cardinal | 12 | 0 | 0 | Rejected |
| Bent / cardinal + diagonal | 0 | left: -98304/353546875; right: 0 | 0 | Applied, defence fails |
| Bent / cardinal + diagonal | 2, 12 | 0 | 0 | Rejected |

The original defending ball survives both Move and Wait in every cardinal case.
It dies in both arms of every two-direction case. One proactive multi-direction
seat earns slightly less canonical score than Wait; no unverified causal story
is attached to that timing difference.

Each Move costs 20,000 e8s including fee (0.0002 ICP), including rejected moves;
Wait costs zero. The cardinal attacker spends 0.1001 ICP and the two-direction
attacker 0.5002 ICP. Opponent inputs/costs are identical within every matched pair,
but the more expensive response does not establish equal-budget dominance. All
amounts are valueless synthetic inputs; there is no Ledger update or live action.
Defender ceilings remain 0.25 ICP per run and no infinite zero-spend efficiency is
reported.

Total measured work: 89,941 cursor work units; wall time 13.339 seconds, within the
unchanged bounds. These are local cursor/time measurements, not IC billed cycles.
The sixteen-tick horizon is necessary to actually admit tick-12 actions; it does
not turn unassessed 60/120-second production forecasts into established successes.

**Strategic finding:** cheap cannon defence can work proactively and reactively
when processing precedes impact along a known friendly approach. Nearby attacks
leave much less reaction time, and a single defended cell does not protect against
an additional diagonal route. Admission delay and intervening ownership are part
of the strategy; geographic distance alone is insufficient. This selected sample
justifies neither a movement-price change nor a combat-rule change.

## Consent, verification and publication

Conditional ranking remains planning-only. Future live integration must derive
campaign validity, expiry, approved accounts and stop state from trusted durable
orchestrator state, and use an actually verified observer snapshot. Caller/model
booleans are not authority. Recheck the whole current population immediately before
dispatch. The current expired campaign stays stopped. No integration into its
runner or signer was made.

PASS: 38 focused UI/analysis tests, including manual stop, freshness, verification
and unchecked-source cases; eighteen matched pairs with receipt assertions; exact
packaged mobile check at both sizes. The prior approved native/game/payment
qualification is reused within its scope; no unrelated local qualification was
repeated. Earlier failures remain preserved.

The predecessor CI capture is recorded separately in predecessor-ci.json. It is
not evidence that this new source passed CI. Final publication/CI status is
reported explicitly; no earlier failed or green run is relabelled for this source.
