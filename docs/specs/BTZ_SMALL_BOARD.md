> Historical S02/v2 reference. S03 behavior is specified in [BTZ v3 admission and impacts](BTZ_V3_ADMISSION_AND_IMPACTS.md); the v2 source remains available for replay tests.

# BTZ small-board reference rules — S02 / version 2

This document is normative for **the S02 reference slice**. It is not a final public-money protocol. Choices needed to make the prototype executable are explicit; missing mechanics are not treated as completed.

## State and bounds

Finite rectangular four-neighbour grid; each cell has owner 0 (neutral) or a live cannon ordinal. Maximum 32 by 32 / 1024 cells, 32 cannons, 64 balls total and 32 per cannon. Segment duration is 1–64 integer logical ticks; absolute logical time is capped at 1,000,000,000. These are demonstration resource bounds, not production benchmark results.

One live cannon per opaque 32-byte funding-account fixture identifier. Ordinals increase and are not reused. Cannons occupy a complete cell. One cannon must have at least one ball. All owned cells must connect to its anchor after each resolved event group. Ball records are sorted by increasing ball ID; cannon records by ordinal. Retired accounts' area-time credits survive removal of their cannon.

A position uses 1024 units per cell. A ball stores integer intercepts `x0`, `y0`, integer velocities `vx`, `vy`, and an explicit cell-side index:

```text
x(t) = x0 + vx*t
y(t) = y0 + vy*t
```

Logical collision time is a reduced exact fraction. Grid crossing of vertical line `X` occurs at `(X-x0)/vx`. Reflecting at X changes `x0` to `2*X-x0` and reverses vx. Intercepts remain integers, avoiding per-impact floating-point rounding or tiny artificial epsilon offsets.

The explicit cell index owns an edge/corner position's side. It updates on a passage and stays on the reflected side for a wall. Point balls have no finite radius. Grid-aligned, full-cell cannon obstacles keep reflection planes on integer grid lines; arbitrary curved geometry is out of scope.

## Inputs and synthetic payments

`BTZPAY02 || account:32 bytes || amount:u64be || BTZ-memo:8 bytes` is a **synthetic normalized adapter envelope**, not a ledger block or payment proof. The S01 memo stays unchanged. A production adapter must independently establish the payer, recipient, amount and absence of unauthorized delegated control before constructing an equivalent envelope.

Commands apply in source order at the checkpoint's integer start. Invalid normalized envelopes trap the stage: the host must not advance effects for unreadable source data. A readable payment with an invalid memo is instead a retained payment with a rejection receipt.

For an existing cannon, ANGLE creates exactly one ball when funded and within limits. Prototype additional-ball price is `10_000_000 * active_ball_count^2` e8s. Active count includes the existing initial ball. Overpayment and underpayment are retained in an audited received-amount tally; no refund or token transfer is implemented. Required price is evaluated after earlier accepted commands. Hard capacity limits remain independent of pricing.

MOVE costs a prototype 10,000 e8s, requires currently owned territory, and permits one successful move per cannon per segment. Failed moves do not use this success allowance. Moving onto a ball does not apply an impulse: a ball already in the cannon cell exits freely; attempts to enter a cannon cell from an adjacent cell reflect. ANGLE launches from the cannon-cell center under the same exit rule. MOVE/ANGLE ordering therefore matters.

Headings cover all u16 angles using a fixed 24-step integer CORDIC table and integer rounding. The quantized velocity is the rule, not a claim of mathematically identical speed at all angles. Tests sweep every angle against an independent trigonometric oracle and check quarter-turn symmetry. Host trig is never used in simulation.

**Unknown-account creation is not implemented.** The explicit offline outcome is `JOIN_NOT_IMPLEMENTED_IN_S02`. Existing cannons come from artificial genesis fixtures. The proposed frontier sampling, 3x3 seed, collision/ball exclusion, non-severing placement and bounded admission policy remain S03 work.

## Event time and half-open segments

Segments simulate `[start, end)`. An impact exactly at end is left as a pending geometric boundary in the final state and belongs to the next segment, after its checkpoint commands. This removes ambiguity between boundary input and impact. Splitting an input-free interval must preserve its final state; event sequence numbers reset per segment, so segment event roots need not equal an unsplit segment's root.

The next candidate crossing is computed for each ball. Equal-time crossings form a batch. Area-time is accrued for the interval before changing ownership. Work boundaries are arbitrary; in-progress batches, connectivity searches and ownership transfers remain hidden.

## Simultaneous mechanics

1. Form geometric impact intents from the pre-batch state.
2. Pair opposing impacts on opposite sides of the same orthogonal edge, at the **same exact logical time** and within 64 position units along that edge. Edge order then ball ID determines unambiguous pairing. Each ball pairs at most once, including corner impacts. Paired balls produce no capture.
3. Remove paired balls and neutralize any now-ballless cannon before normal impacts.
4. Resolve surviving normal intents in `(cannon ordinal, ball ID)` order. A ball destroyed by an earlier transfer has no later attack.
5. A target directly won earlier in this batch cannot be directly captured again by a later tied intent. The older cannon therefore wins a same-cell exact tie. Cascades follow this documented sequential resolution, not an unspecified unordered set operation.

Only exact-time annihilation exists in S02. A nonzero temporal window introduces delayed-resolution/causality choices and must be designed and tested explicitly; zero here is not advertised as approximating that future mechanic. Opponent anchor cells are not capturable attack intents.

A pre-batch wall hit still reflects even if an older tied attack has changed ownership. A pre-batch passage is rechecked and reflects if its destination is no longer legally enterable. This prevents a ball entering newly foreign territory.

## Exact corners

Simultaneous x/y crossings are one compound event. Each blocked axis reflects; legal passages update the appropriate cell coordinate. At most one capturable target is selected per ball, using row-major target index when both axes offer candidates. The age priority resolves **competing cannons**, not the ambiguous axes of a single ball.

If both side-adjacent cells permit passage but the diagonal destination is foreign or a cannon, both axes reflect and no capture is awarded. This explicit no-corner-cutting rule prevents slipping through a zero-width vertex into foreign territory. It is a provisional BTZ geometry decision made visible in tests, not a general DTR requirement.

## Capture, severance and extinction

A surviving attack chips one adjacent non-anchor cell and reflects. For a defender-owned cell, flood from its cannon in the post-chip grid, then transfer every defender cell unreachable from that cannon to the attacker. Four-neighbour graph connectivity is authoritative; no dividing-vector approximation is used.

The connectivity search, transfer scan, ball scan and elimination cleanup are resumable. This reference deliberately uses a straightforward flood fill; it does not yet implement the proposed local articulation precheck or chunked dynamic connectivity optimization.

**All defender balls whose explicit cells are stolen are destroyed**, including balls in the directly chipped cell as well as detached regions. Otherwise a direct chip could leave a defender ball in foreign territory. Exact opposing annihilation has already been resolved before this deletion rule.

After ball destruction, any cannon with no ball is removed and its remaining territory becomes neutral. Its score record stays. A live anchor cannot be directly captured; an extinct anchor is no longer protected. New cannon placement on those neutral regions remains unimplemented.

## Scores and money boundary

Account scores accumulate the exact integral of owned area over logical time. Fractions are reduced with exact integer arithmetic. The segment reports a delta relative to initial credits. Elimination stops future accrual but does not erase prior credit. The reference does not close UTC days, calculate payouts, round monetary allocations or send ICP.

These credits are gameplay records, not a finished payable-ledger implementation. Daily UTC versus logical settlement periods, rounding, distributable revenue, fees, restart identity and durable payout obligations remain explicit later decisions. Received payment tally is treasury-denominated ICP, not automatic conversion to cycles.

## Persistence, rendering and limits of current evidence

Every safe point can serialize the cursor; result bytes exist only when done. Canonical typed JSON is a convenient reference encoding. `BTZ_IDENTITY.rules_hash` hashes a version label for fixture selection; it is **not** a reproducible source/Wasm hash. Source identity is provided separately by the checkpoint file manifest. Production identity must bind actual rules/build/configuration artifacts.

The reference emits diagnostic motion events for grid passages as well as reflections. An efficient public timeline should compact unchanged trajectories rather than retain every traversed internal cell. Area scans and repeated candidate searches prioritize an easily checked baseline over speed.

The complete state machine is JS; Rust currently mirrors geometry/CORDIC/connectivity primitives only. Independent Python Fraction and union-find fixtures establish selected geometry/topology correctness. Analytical game tests and repeat/resume tests add evidence but do not constitute an independent complete game implementation or security audit.
