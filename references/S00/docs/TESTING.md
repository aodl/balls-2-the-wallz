# Testing infrastructure and verification posture

## Rule: evidence is a first-class output

A test command records its arguments, working directory, tool versions, exit code, counts, duration, source/artifact identity and log path. Use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, and `NOT_APPLICABLE` with a separate qualification field. A tool error can be classified as environmentally blocked without rewriting its nonzero exit code into success.

Required-but-blocked gates block release eligibility. A checkpoint may still be useful and delivered as source with limitations. Implementation progress, local verification and release readiness are separate fields. Never hand-generate a successful test log, lockfile, Wasm hash or SBOM that the corresponding tool did not produce.

## Test layers

| Layer | Principal checks | Execution environment |
|---|---|---|
| Repository contracts | Documentation links, schema/config references, production/debug separation, fixture registration, no secrets | Python/Node and later xtask |
| Pure kernel tests | Codecs, exact geometry, source-independent timeline, accounting arithmetic | Native Rust |
| Property/model tests | Invariants, optimized/reference agreement, arbitrary interruption and batching | Native Rust/fuzz tools |
| Cross-target conformance | Native versus Wasm replay roots; Rust versus JavaScript fixtures | Native/Wasm/Node |
| Canister integration | Real Wasm, calls, ledger/index/archive adapters, timers, upgrades, uncertainty | Pinned PocketIC |
| Browser end-to-end | Certification, reconnect, buffer depletion, stale/corrupt chunks, external wallet instructions | Browser runner plus local network |
| Adversarial workload | Worst-case topology, spawn search, event explosion, ingress bursts | Native benchmark and IC execution measurements |
| Release verification | Locked clean builds, dependency gates, SBOM, artifact/export/hash/config checks | Pinned build container |
| Operational validation | Actual subnet latency tails, cycle cost, availability and soak | Explicit authorized test deployment |

PocketIC is suited to deterministic multi-canister execution tests; it is not production consensus/network load evidence [R2](IC_REFERENCES.md). Mainnet tail-latency or cycle claims require measured deployment observations, not a fast local test.

## First requirement-to-test map

Stable requirement IDs connect specifications, test names and release evidence. The IDs below are planning targets, not claims that the tests exist yet.

| Requirement | Required test scenario | Stage |
|---|---|---|
| ING-001 | Same verified transfer discovered twice produces one input | S01/S05 |
| ING-002 | Reordered/malformed index page cannot partially advance cursor | S05 |
| ING-003 | Lost final Event Horizon hint is recovered by fallback polling | S05 |
| ING-004 | Index lag/archive transition/short page cannot falsely prove completeness | S01/S05 |
| ING-005 | Legacy memo, blob memo, conflicting forms and invalid funding identity | S01 |
| TIME-001 | Stored seal replay reproduces input assignment after scheduler delay | S02 |
| SIM-001 | Every work-budget partition yields byte-identical final roots and events | S02 onward |
| SIM-002 | Upgrade/resume at every safe point yields identical history | S02/S05 |
| SIM-003 | Failed staging work cannot change last committed public state | S05 |
| BTZ-001 | Exact corner collision and simultaneous capture fixtures | S03 |
| BTZ-002 | Annihilation grouping stable across epoch and execution boundaries | S03 |
| BTZ-003 | Cannon-rooted connectivity agrees with a slow full-board reference | S03/S04 |
| BTZ-004 | Region capture, last-ball death and neutralization preserve invariants | S04 |
| BTZ-005 | Spawn distribution, eligibility, bounded search and bootstrap fixtures | S04 |
| BTZ-006 | Ball-cap, player-cap, cumulative pricing and rejected-payment rules | S04 |
| PAY-001 | Lost reply before/after transfer execution never creates a duplicate award | S07 |
| PAY-002 | Dedup window expiry leaves unresolved obligations quarantined/reconciled, not silently lost | S07 |
| PAY-003 | Death/rejoin/day boundary retain earned entitlement exactly once | S04/S07 |
| CERT-001 | Wrong canister/network/path, stale certificate, missing witness or changed bytes rejected | S06 |
| UI-001 | Verified buffer depleted/recovered/background-tab/reconnect play deterministically | S06 |
| OPS-001 | Spoofed/repeated hints cannot create unbounded scans or allocations | S05 |
| OPS-002 | Telemetry gaps/topups/resets/changed canister set carry correct provenance | S06 |
| REL-001 | Production Wasm contains no debug or arbitrary state-mutation endpoints | S05/S08 |
| REL-002 | Fresh checkout and extracted ZIP build without hidden local/generated inputs | S01/S08 |

## Determinism tests must go beyond repeating the same code

Run a slow reference connectivity/physics model against the optimized kernel on tiny worlds. Retain minimal counterexamples as fixtures. For each canonical input transcript, vary work budgets, safe-point interruptions, snapshot frequency, collection insertion order and target architecture. Intermediate scheduling and telemetry may differ; game state, score and canonical logical events must not.

Tests must guard against iteration-order leaks, integer overflow, zero-time collision loops, inconsistent edge ownership, cannon-overlap rules and event duplication after resumption. Assertions should run after each logical event group, not just at the final state. A UI screenshot or repeated identical hash from one unchallenged implementation is insufficient conformance evidence.

## Ledger and settlement simulation

Build focused mock canisters for delayed replies, duplicate transfer results, unknown outcomes, source reordering, archive redirects, wrong schema, unauthorized callers and index lag. Also test pinned real ledger/archive Wasm where feasible: mocks alone can faithfully reproduce an incorrect assumption.

Preserve the exact attempted transfer identity before awaiting the ledger. Test a reply loss before execution, after execution, through restart, and past the deduplication window. Money movement is not an ordinary retryable pure function. Uncertainty is a durable state, not a reason to issue a fresh payment identity. Official retry guidance informs these tests [R3](IC_REFERENCES.md).

## Performance evidence

Record instructions or equivalent host work per simulated second, collision, ownership update, spawn candidate and connectivity visit; event bytes/second; retained state size; and p50/p95/p99 workload distributions. Include hostile layouts, not only random friendly boards. The purpose is to select defensible ball/player/board caps and buffer targets.

A fixed active-ball count does not bound zero-time recursion, cumulative pending inputs or event output. Test every bounded dimension and behavior at the boundary. Hard input-admission limits cannot be inferred solely from economic pricing.

## Runner and CI plan

Follow Jupiter's repo-aware `xtask` concept. Proposed commands are `doctor`, `test unit`, `test conformance`, `test pocketic`, `test all`, `security`, `verify-artifacts`, and `checkpoint`. These names are a contract proposal until implemented. Early Python/Node checks may remain small separate programs invoked by the runner.

The runner must fail when a named test matches zero tests, an ignored suite is not executed, a required Wasm/server binary is absent, or an obligatory release check is skipped. Pin the PocketIC library and actual server artifact, then run capability probes. Publish failed and blocked logs as well as successes.

Add explicit correctness CI alongside dependency-security CI. Cheap unit/codec/source checks run on every change; canister integration runs on relevant changes and before merging; clean release and full migration/soak gates run before a release. No secret identities or authorized mainnet actions belong in untrusted pull-request jobs.

## S00 verification is separate

The included Python package verifier checks manifest coverage, paths and checksums. Its tests and logs establish planning-package integrity only. Jupiter test execution evidence is retained verbatim and qualified. Neither implies that the planned DTR Rust workspace has been compiled.
