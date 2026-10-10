# ADR 0003 — causal wall effects and exhaustive bounded admission

Date: 2026-09-20. Accepted for the S03 **reference**, not an immutable monetary launch.

## Problem

S02 excluded creation and only paired exactly simultaneous impacts. Looking ahead for later opposing hits can be wrong if an intervening capture changes a wall. A search truncated by an operational work budget cannot honestly claim that no spawn exists.

## Decision

Use immediate physical reflection plus a short pending contested-wall effect. Match real later arrivals before the inclusive expiry; otherwise apply a still-valid chip at expiry. Persist outstanding effects in the world. Add a one-outstanding-effect-per-ball cooldown. Keep neutral captures immediate and canonically order timestamp arrivals before expiries.

Use deterministic hash-ranked directed frontier candidates with protected nine-cell insertion. Exclude cannon cells, ball centres including exact patch boundaries, and all defender disconnections. Continue a search across work slices until success or exhaustive absence. Limit the number of admitted searches separately and publish a distinct capacity-rejection reason. Add a final safe interior fallback for a full single-owner board.

Keep v2 source intact in `packages/kernels/btz-v2` and continue testing it. Version 3 does not silently read version-2 worlds or local journals.

## Alternatives considered

Holding a ball at the wall until resolution complicates the integer motion equation and visually pauses it. Speculatively evaluating future trajectories requires invalidation/rollback and creates avoidable causal complexity. Fixed collision buckets have boundary artifacts and change more physics than this effect-window approach. An unbounded spawn attempt or budget-derived rejection is not acceptable for the shared bounded-work posture.

## Consequences

A contested chip is delayed; another move/capture can invalidate it. An extra bounce during the fuse has no new chip. Small tolerance constants and eight search attempts per segment are explicit test configuration, not proven game balance. Edge-weighted eligibility is not equal-player fairness. Payments for admission-work rejection are retained and must be disclosed in any actual product.

The complete Rust port remains open. S03 adds portable search/pairing source and conformance targets instead of falsely calling primitive parity a whole-kernel port. Arbitrary-precision credits require an explicit numerical implementation decision before that port can be called conformant.

### Committed input normalization

The source commitment represents each selected input as an unsigned source position
and payload bytes. JavaScript `0`, `"0"` and `0n` are equivalent at that boundary;
transport metadata is not committed. Before a new staged segment reaches either
kernel, the shared host now produces only `{position: bigint, payload_hex}`.
The direct BTZ constructor applies the same normalization. Spawn entropy hashes
these canonical envelopes, never the original adapter wrapper. Regression tests
require byte-identical gameplay for equivalent wrappers and extra uncommitted
metadata. Existing staged snapshots are not silently reinterpreted by this change.
