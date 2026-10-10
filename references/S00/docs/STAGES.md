# Checkpoint roadmap

Stage IDs define scope and evidence, not elapsed-time promises. The sequence is deliberately risk-first. A checkpoint can be delivered with transparent blocked checks; promotion to a funded release cannot bypass those checks.

## S00 — Reference review and engineering baseline (this package)

**Deliverables:** Jupiter source review, architecture boundaries, corrections/decision register, test strategy, observability plan, documentation/release contract, current-environment evidence and integrity-checked ZIP.

**Exit:** Planning package consistent and self-verifiable; limitations explicit. No compiled DTR or BTZ claim.

## S01 — Workspace and external-interface feasibility

**Build:** Minimal Rust/JS workspace, repo-aware doctor/test entrypoints, pinned toolchain plan, canonical fixture plumbing, tiny no-game canister probe and initial Candid contracts. Keep the implementation small enough to compile/review readily.

**Resolve early:** actual ICP ledger/index/archive discovery/completeness path; funding-account identity; legacy numeric versus blob memo compatibility; Event Horizon hint contract; public status capability; source seals and timing fairness. Capture actual Candid and representative transfer fixtures. Choose supported wallet paths rather than promising every wallet works.

**Evidence:** cargo metadata/check/unit where available, byte/codec fixtures, actual Wasm and PocketIC capability probes when available, source-only checks otherwise. Lockfiles are generated only with package tooling. A source-only delivery labels compiler/runtime gates blocked.

**Exit:** The external payment protocol and toolchain assumptions are explicit and testable. Do not build extensive game code atop an unverified imagined ledger API.

## S02 — Pure timeline runtime plus Life conformance

**Build:** Logical seals, transcript, canonical encoding, resumable kernel contract, snapshot/replay runner, staging model and a very small Life kernel. A second product UI is not required.

**Evidence:** golden roots; replay from genesis/snapshot; arbitrary safe-point interruption; work-partition invariance; native/Wasm agreement when tools permit. Checksummed fixtures are shared with JavaScript.

**Exit:** Both discrete progression and replay are demonstrable without ICP calls inside the kernel. The contract is not secretly tied to balls or continuous physics.

## S03 — BTZ minimal deterministic mechanics

**Build:** Tiny grid, fixed-point heading/trajectory rules, normal wall reflection/capture, cannon relocation, exact geometry/ordering and reference connectivity model. Define annihilation causality before optimization. Use synthetic zero-value inputs.

**Evidence:** pathological corner and near-simultaneous tests, slow reference comparisons, state invariants after each logical event group, canonical event trace. No production board size claim.

**Exit:** Mechanic semantics are settled sufficiently to generate reproducible traces; ambiguous outcomes are test cases, not implementation accidents.

## S04 — Full BTZ headless rules and viability benchmarks

**Build:** Spawn eligibility/distribution/search, severance transfer, ball deletion, last-ball cannon death, neutralization, hard admission bounds, integer price curve, area-time accounting and death/rejoin entitlement preservation.

**Evidence:** hostile topology/load benchmarks, property tests, price/Sybil/age/spawn-bias scenarios and event-size measurements. Establish provisional board/cannon/ball limits from measured work, not illustrative numbers from earlier discussion.

**Exit:** A defensible capacity envelope and documented overload policy. Failure of an intended capacity target is a design result to address, not a reason to hide the benchmark.

## S05 — Authoritative IC orchestration and ingestion

**Build:** Stable-memory layout, verified scan adapter, coalesced Event Horizon wakeup/fallback, fenced asynchronous continuations, seal-completeness handling, staging/atomic commits and explicit upgrades. Test against mocks and pinned real ledger/archive Wasm where feasible.

**Evidence:** dropped/duplicate hints; stale callbacks; page errors; archive transitions; delayed timers; restart/upgrade at every durable state; production/debug exports; invalid-payment bounded work.

**Exit:** Correct event history survives failures without duplicate input application. A delayed timer does not rewrite logical history. External integration remains test-funded only.

## S06 — Certified observer, client experience and telemetry

**Build:** Certified compact status and timeline chunks, independent verifier/replay entrypoint, browser playout buffer with adaptive rate, reconnect/snapshot paths, observer UI, offline memo helper, optional cycles metrics with provenance.

**Evidence:** corrupted/missing/stale/wrong-canister proofs, verified-versus-advertised buffer tests, background-tab recovery, clean source build, Life driving the same timeline client. Status/funding compatibility probe; no metric claims unsupported by coverage.

**Exit:** Modified frontend cannot affect game outcomes; legitimate clients can verify and animate published segments. No claim that buffering eliminates strategic bot advantage.

## S07 — Monetary accounting and optional Jupiter integration

**Build:** Durable daily obligations, treasury reserve/pool separation, integer allocation and remainders, fees/sub-fee handling, deduplicated settlement and reconciliation. Integrate funding through a narrow optional adapter, not a Jupiter fork. Keep earned entitlements separate from live cannon storage.

**Evidence:** ambiguous transfer results, delayed callbacks past dedup windows, upgrade/retry, death/rejoin/day boundary, payout sum/remainder conservation, funding interruption and stale telemetry.

**Exit:** Accounting and authorization reviewed; unknown outcomes do not lose or duplicate liabilities. No-refund incoming rules are clear but are not used as a substitute for payout correctness.

## S08 — Release hardening and authorized pilot gate

**Build:** Final configuration, production limits, deployment/lifecycle runbooks, reproducible artifacts, dependency/security evidence, migration fixtures and operational monitoring.

**Evidence:** all required correctness/integration gates; clean and independent build comparisons as specified; complete SBOM/advisory review; actual target-environment instruction/cycles observations; subnet tail-latency/soak; recovery drill and separate security/product legal review before real-value operation.

**Exit:** Only the specifically reviewed release/configuration is eligible for an explicitly authorized capped pilot. Missing tools, open money/correctness failures or absent authorization remain blockers. No deployment is performed by this planning package.

## ZIP cadence

Each S-stage produces a complete checkpoint ZIP, a short human review and machine-readable gate evidence. A complex stage may use suffixes such as `S04a` and `S04b`; each names its predecessor and does not silently relabel partial work as stage completion. No stage introduces a separate repository merely to give it its own ZIP.
