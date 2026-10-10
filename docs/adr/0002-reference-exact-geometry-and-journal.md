# ADR 0002 — Exact grid reference and explicit staged publication

Date: 2026-09-20. Status: adopted for S02 prototype; economics and remaining mechanics are not finalized.

Use integer trajectory intercepts with reduced fractional collision time to avoid epsilon/rounding behavior during grid reflection. Retain a per-ball cell-side index. Define compound-corner selection and half-open segment boundaries explicitly rather than pretending cannon-age priority specifies single-ball geometry.

Implement whole-document journal/inbox models first, with revision fences and atomic publication, to test recovery independently of IC libraries. An actual subprocess demo proves record serialization survives process boundaries. This does not replace stable structures or establish IC upgrade behavior.

Implement exact-time annihilation as an isolated mechanic. Defer the proposed nonzero window rather than introducing a causally inconsistent lookahead. Artificial genesis substitutes for spawning only in tests and is labeled accordingly.

Keep the complete executable JS reference and independent Python geometry/topology model while porting Rust primitives. Existing kernel/API separation remains: DTR contains no grid, cannon or payment-price concepts.

Consequences: more executable coverage now; honest native/IC blockers; a clear reference against which optimizations must be checked; no production-throughput promise from a convenient but inefficient baseline.
