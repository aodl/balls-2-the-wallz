# ADR 0004 — Exact native port and explicit durable publication

Status: accepted for S04 source architecture; native and IC execution gates remain blocked.

## Decisions

Use exact-pinned established arbitrary-precision Rust libraries in a separate native workspace rather than inventing a bignum package or reducing the S03 score contract to 128 bits. Keep the original registry-free workspace runnable independently. A compiler-generated dependency lock and supply-chain review are mandatory before native promotion; direct pins alone do not freeze transitive dependencies.

Port complete B2Z v3 world/cursor/event/score behavior against existing canonical bytes. Do not change game physics or economics merely to simplify the port. Extract the wire codec but keep grids and collision algorithms in B2Z. Add an actual bidirectional continuation gate, not a source-level claim of language equivalence.

Add chunked root-publication tests below the generic journal. Keep committed head, persisted work-in-progress and unpublished storage upload distinct. Explicit recovery may discard only unpublished upload work. Corruption never authorizes a genesis reset.

Author a small controller-only IC laboratory using fixed stable memory regions and no awaits. It is a B2Z integration workload, not the final generic arena or a permissionless game. All application validation precedes stable writes. After the write boundary, a failure must trap; returning an error variant does not undo writes. No token, ledger, timer, treasury, raw randomness or certificate API is added to the laboratory.

## Alternatives rejected

A fourth broad framework for storage or observability is premature. Content chunks remain a module; the game-independent wire crate is justified by native/canister consumers. Splitting the physics across canisters would reintroduce asynchronous authority problems. A monolithic unbounded StableCell or whole-heap pre-upgrade snapshot is not a production persistence strategy.

A source inspection or mock IC status is not a substitute for compilation, generated Candid, stable-memory migration tests, instruction measurements or certificate verification. The checkpoint may be delivered while these gates are visibly blocked, but cannot be called a release.
