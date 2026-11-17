# Deflector engine design notes — proposed mechanics, not current gameplay

## Required semantic distinction

A mirror computes an outgoing angle from incoming angle and surface normal. This device stores an absolute heading. Incoming trajectory controls the encounter point/time; stored heading controls outgoing velocity. Local preview alone is not authority.

The owner referred to balls entering the tile, so a small literal triangle collider is not equivalent: it would miss rays through the rest of the square. The recommended development model treats the tile as the activation region and the wedge as a directional indicator. Show subtle contact feedback at the true turn point.

## Candidate contact calculation

For unit-cell local coordinates and an incoming position p at entry time te, with velocity v, compute positive candidate exit times for the square's forward x/y sides:

```
dtx = (1 - px)/vx  when vx > 0;  (0 - px)/vx when vx < 0
 dty analogous; zero component contributes infinity
 dt = min(nonnegative applicable forward exit candidates)
 tc = te + dt/2
 pc = p + v*(dt/2)
```

The actual implementation must use canonical units and exact/versioned bounded arithmetic. The expression is geometry reasoning, not a floating-point production algorithm. A tangent/zero-duration corner touch is not a qualifying interior traversal. Do not clamp an invalid negative time until it looks valid.

All normal entries into a nondegenerate cell chord produce positive interior contact; rays may turn at different x/y locations. The stored outgoing heading is independent of entry side. Ownership/topology/ball destruction may invalidate a scheduled contact before it occurs. Preserve normal tie handling and source chronology.

## Why this changes the numeric problem

Current B2Z trajectories have integer intercepts:

```
x(t) = x0 + vx*t
y(t) = y0 + vy*t
```

A turn at rational time tc to integer canonical velocity v' requires:

```
x0' = x(tc) - vx'*tc
y0' = y(tc) - vy'*tc
```

These intercepts are not generally integers, unlike the old axis reflection `x0' = 2*wall - x0`.

Example in illustrative unit-cell coordinates: enter `(0, 1/2)` at time zero with velocity `(5,12)`; exit at `1/24`, contact at `1/48`, position `(5/48, 3/4)`. Turn to `(13,0)`, which has the same Euclidean speed as `(5,12)`. The new x intercept is `-1/6`; multiplying by the current illustrative 1024-unit tile yields `-512/3`, not an integer. Silently rounding it breaks exact continuity.

This example demonstrates the representation issue; it is not a replacement for B2Z's actual heading quantizer/speed policy.

### Required resolution

Compare exact anchored rational representation against a formally bounded fixed-point/event-time scheme, using existing canonical libraries. For exact rational arithmetic, prove storage and denominator growth over long repeated chains. For fixed point, document rounding mode, error and tie order, prove long-run bounds, and keep JS/native byte-level parity. Never use JavaScript Number/Rust floating-point independently for consensus geometry.

If new state/schema is needed, migrate explicitly at an authenticated rule boundary. Do not change the type/meaning of old x0/y0 fields inside historical schema6 while claiming historical hashes are unchanged.

`CONTACT_VECTORS.json` contains independently calculated Fraction-based unit-cell examples to seed tests. It is **not** an authenticated B2Z fixture, canonical speed table, production parser or proof of bounded long-run arithmetic. The generator is included for reproducibility.

## Event-progress safety

Strictly positive time for each isolated turn does not prove the absence of a sequence with decreasing intervals. Test Zeno-like corner/grazing loops, returns through neighbouring empty cells and wall/cannon reflections, not only two arrows facing each other at cell centres.

One-per-residence latch prevents immediate self-trigger at the same point; it may not solve all re-entry patterns. Before claiming readiness, prove a lower progress bound or specify a small versioned simulated-distance/time rearm policy. That policy must be visible in the candidate rules review and tested against the 'every entering path' expectation. Do not quietly skip events, remove balls, or throttle by host time.

Budget exhaustion in a message should yield/persist exact continuation, not silently ignore a turn. Bound structure storage, neighbourhood lookup, current encounters and emitted events. Measure a worst legal looping scene with official scheduler/work budgets.

## Territorial and lifecycle integration

Current balls are constrained to their owner's territory. Deflector placement does not bypass enemy wall/capture logic or appropriate another player's projectile. The provisional rule removes the structure when its cell ceases to belong to its owner; a pending redirect must check the same stable structure ID/generation at the actual event.

A Deflector must not be placed into `world.cannons` just to reuse rendering or occupancy code. It is passable to balls and does not anchor islands, spawn a ball, count toward cannon pricing or receive launch annotations. Existing cannon occupancy checks must still prevent two structures sharing one cell.

Topology clearing/splitting/merging/retirement must preserve or remove structures deterministically. Same-player relabelling is not enemy capture. Budget removal work and avoid a full-world scan per touched tile.

## Preserve independent trust

Use real source-admitted valueless payments in an installed disposable scenario. Authenticate creation, contact event and outgoing state through the normal certificate/artifact chain, then independently replay JS/native and compare both observers. Local screenshots of lines turning are not a substitute.

The renderer should only display the verified piecewise trajectory. A static outgoing preview arrow is allowed before payment; a speculative animated future path labelled as actual gameplay is not.
