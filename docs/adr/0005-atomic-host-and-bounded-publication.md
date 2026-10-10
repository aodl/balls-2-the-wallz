# ADR 0005 — One durable coordinator image, bounded public catalog

Accepted for the S05 reference and source-only laboratory; production scaling is not approved.

## Context

The previous separate inbox and journal could each be tested atomically, but their connecting publication/acknowledgement path still needed a durable owner. Native gameplay alone was not the generic host. Query content hashes also needed a precise boundary from IC certificate authentication.

## Decision

Combine inbox, reservation and journal into one revision-fenced coordinator image. Seal only the full supplied prefix, because interior anchors are not retained. Commit final game publication and source retirement together. Keep the underlying immutable chunk store reusable, but do not mistake durable upload work for public game truth.

Implement the same host byte contract in Rust behind a game-independent trait. Put the BTZ adapter on the game side. Continue exercising the JS host with Life, and require actual native image/recovery equality before promotion.

Use a small flat ordered chunk-hash catalog covered by one publication root, with a separate mandatory certificate-verification dependency. No hand-rolled BLS, new observability framework, shared physics hierarchy or additional canister fleet is introduced. Operational telemetry remains separate and unmeasured values remain null.

## Consequences

Atomicity is easier to reason about and fuzz, at the cost of repeated whole-image encoding. This is suitable as a bounded conformance/laboratory model, not proof of economical execution at target scale. Controller-supplied test inputs are explicitly not payment authority. Latest-only publication requires explicit snapshot recovery if a client misses segments. No already-earned prize can be forgotten during recovery; payout lifecycle is still not implemented.
