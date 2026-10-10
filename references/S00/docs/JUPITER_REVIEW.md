# Jupiter Faucet reference review

## Scope and provenance

Reference: `JUPITER_FAUCET_SUITE-master (3).zip`, supplied by the user. Its exact SHA-256 and per-file inventory are recorded in [archive-inventory.json](../evidence/jupiter/archive-inventory.json). The inventory contains 408 files, including 182 Rust files. This was a targeted source/design review and a limited execution exercise, **not** an exhaustive correctness or security audit and not a verification of any live deployment.

Source paths and line ranges below refer to that archive's `JUPITER_FAUCET_SUITE-master/` root. [source-evidence.json](../evidence/jupiter/source-evidence.json) records hashes and line anchors for the selected files. No permission to publish or copy Jupiter implementation code is inferred from the upload. The new project can use the design lessons independently; check ownership and dependency licensing before extracting code for publication.

## Overall assessment

The most useful characteristic is not the number of canisters. It is the explicit allocation of responsibility: applications own incentives; infrastructure owns narrow funding/transport functions; read models and frontends do not quietly become financial authorities. This is a better model for DTR than cloning Jupiter's entire suite.

The archive contains seven canister directories—Disburser, Faucet, Historian, Relay, SNS Rewards, Lifeline and Frontend—and six shared crates. DTR/BTZ does not need seven deployment units merely because Jupiter uses them. The separation of permissions, operation lifetimes, and authoritative versus reconstructable data is what should transfer.

## Patterns to adopt

### 1. Narrow authorities, reusable infrastructure, separate read models

`README.md:3–24` and `docs/architecture/canister-roles.md:3–25` distinguish application incentives, funding/routing, and observation. `docs/architecture/shared-infrastructure.md` makes reuse of existing infrastructure an explicit product boundary.

**DTR application:** BTZ owns combat, pricing, area-time and elimination. DTR owns sequencing, continuation and proofs. Event Horizon only accelerates discovery. Jupiter may fund operational canisters through a documented adapter. Neither service decides who won, which payment is genuine, or what a prize recipient is owed.

### 2. Fenced asynchronous work, not just a busy boolean

`crates/ic-clients/src/timer_guard.rs:18–81` defines a generation/expiry lease and documents checking ownership after each await. Its tests exercise a superseded operation trying to complete after a newer owner exists. `canisters/faucet/src/scheduler/index_health.rs` uses the same discipline around observations.

**DTR application:** a persisted scan generation and continuation identify the currently authorized ingestion or settlement attempt. A late callback cannot advance the wrong cursor or overwrite a newer snapshot. Synchronous persistence batching may be useful, but `crates/persistence-batch/src/lib.rs` explicitly warns against holding its batch across an await. A fencing helper reduces misuse; it does not itself supply distributed transactions.

### 3. Validate a whole history page before moving the cursor

`canisters/faucet/src/scheduler/index_health.rs:155–185` validates ordering and oldest-record anchors. A short page alone is not proof of exhaustion. `crates/ic-clients/src/index.rs:61–98` also makes clear that the ICP index wire model has distinct legacy `memo` and optional `icrc1_memo` fields and account-identifier history.

**DTR application:** do not turn the earlier pseudocode `ledger[cursor++]` into an unchecked production assumption. Specify the actual adapter, archive traversal, index lag, verified completeness through a sealed watermark, and canonical normalization. An unchanged account balance does not establish that no relevant transfer occurred. Notification counts do not establish anything about payment validity.

### 4. Lifecycle rules belong in the protocol

`docs/operations/deployment.md`, `crates/ic-clients/src/lifecycle.rs`, and `canisters/historian/src/state/stable.rs` distinguish install/upgrade paths and stable storage. `README.md:86–90` specifically protects Historian histories from reinstall.

**DTR application:** preserve ledger cursors, checkpoint seals, in-progress simulation, earned scores, payout obligations and rules/configuration history. Allocate stable memory IDs in a reviewed registry. An upgrade cannot silently become a new match or replay from the wrong input position. Routine upgrade commands should not accidentally feed fresh-install arguments to migration logic.

### 5. Effective configuration is part of what users must verify

`docs/architecture/canister-roles.md:27–40` requires publishing complete effective runtime configuration. `docs/operations/reproducible-builds.md:43–56` distinguishes module identity from configuration identity.

**DTR application:** publish a versioned, certified configuration document containing the actual effective limits, price formula, rejection rules, board geometry, timing policy and ledger identities. A `rules_hash` alone is insufficient when two deployments use the same code with different economic constants. Logs aid diagnosis; retained configuration records and certified roots support historical replay.

### 6. A repo-aware test runner that rejects misleading green results

`docs/development/testing.md:1–31` makes `xtask` the orchestration entry point. `tools/xtask/src/test_runner.rs:168–195` rejects an exact test invocation that ran zero tests or did not actually execute the intended ignored integration test. Regression tests cover those cases at `:733–828`.

**DTR application:** one documented command family, capability probes, named suites and machine-readable results. Full validation must explicitly execute integration suites. A default `cargo test` with ignored PocketIC tests is not integration evidence. The runner itself needs tests for failure/skip reporting.

### 7. Pin capabilities, not only version strings

`tools/xtask/README.md:177–188` pins a PocketIC server release and describes capability smoke tests. The source uses a precise Rust toolchain and a separate Node version in CI.

**DTR application:** pin a tested Rust/CDK/CLI/PocketIC/Node combination and the actual downloaded server artifact. Probe features used by the project, including management status settings and ledger behavior. Do not copy older dependency versions from a tutorial over a compatible tested lockfile. Tool versions observed in Jupiter are reference pins, not proof that they will compile a new workspace here.

### 8. Shared cross-language fixtures

`crates/memo-policy/src/lib.rs:175–181` and `canisters/frontend/web/test/advanced-memo-builder.test.mjs:20–24` read the same memo fixture data.

**DTR application:** share golden vectors for memo encoding, heading interpretation, canonical state bytes, hashes, certificate paths and fixed-point trajectory rendering. This is simpler and more effective than separately written Rust and JavaScript examples that merely look equivalent.

### 9. Canonical release artifacts and honest reproducibility scope

`Dockerfile.repro`, `tools/scripts/build-canister`, and `docs/operations/reproducible-builds.md` pin inputs and preserve evidence. The build script emits deterministic gzip packages. The reproducibility guide explicitly limits its two-clean-build claim to the same environment.

**DTR application:** distinguish source ZIP identity, raw Wasm, uploaded deployment package, Candid, rules/schema/configuration and actual deployment observations. Record all hashes, rather than treating a single build hash as proof of every property. Reproduce using the pinned builder, then seek an independent rebuild as a stronger later gate. ZIP-based work must not require an unavailable `.git` directory to invent source provenance.

### 10. Reachability-aware dependency security

`docs/security/dependency-scanning.md`, `tools/scripts/check-production-reachability`, and `.github/workflows/dependency-security.yml` distinguish production runtime, host build/proc-macro, frontend and tooling dependencies. The workflow pins actions and security tools and exports SBOMs.

**DTR application:** keep deterministic kernels small and transport-free, isolate generated wire types, use locked resolution and artifact-specific SBOMs, and review exceptions with an owner, rationale, expiry and demonstrated reachability. Do not copy Jupiter's exceptions wholesale. The observer's certificate verifier and payment/memo presentation remain security-sensitive even when the browser is non-authoritative.

## Patterns that require different policy in BTZ

**Best-effort payments:** Jupiter explicitly allows some perpetual allocations/rewards to be abandoned after bounded duplicate-safe attempts (`canisters/relay/README.md:250–260`). It separately applies stronger journalling to finite splitter funds (`:359–363`). BTZ prize obligations must use the latter kind of durable accounting, not disappear merely because transfer acknowledgment was lost. Incoming no-refund rules do not remove outgoing settlement risk.

**Immutable deployment:** controllerless children can be a good final product boundary. They are not an excuse to make an unbenchmarked game immutable before its recovery, funding and capacity model is established. DTR needs a staged and visible control policy.

**Cycles estimates:** `canisters/frontend/web/src/tracker-cycles.js` estimates consumption using observed balances and known top-ups. That is useful observation, not a protocol-exact burn counter. Jupiter Relay also uses a baseline-only first sample before measuring replenishment need (`canisters/relay/README.md:65–88`). DTR must retain uncertainty and sample coverage when adapting this technique.

**Documentation checks:** the install-args validator is substantial and has self-tests. Adopt executable contracts, not a single ever-growing script tied to exact prose wording. Prefer structured deployment manifests, generated command examples and small semantic validators.

**Canister count and specialization:** no need initially for a separate historian, metrics service, arbitrary factory or generic neuron/funding library. Add independent deployment units only for a concrete permission, scalability or lifecycle boundary.

## Review observations that are not audit findings

Only `dependency-security.yml` was present under `.github/workflows` in this supplied archive. I did not find a separate full correctness workflow here; that does not establish what runs outside this archive. DTR should explicitly add it.

No top-level project license or notice was found in the inventory, although vendored licensing material exists. Resolve intended licensing before publishing copied components. This is a provenance check, not a judgment about the user's rights in their own project.

## Checks actually executed

| Check | Observed result | Scope qualification |
|---|---|---|
| Hermetic npm-lock check | PASS | Source-level script execution |
| Frontend export-boundary check | PASS | Source-level script execution |
| Mainnet install-args validator | PASS | Artifact-hash subchecks skipped because `release-artifacts/` was absent |
| Install-args validator self-tests | PASS | Validator self-tests only |
| Frontend Node test command | Nonzero exit; 137 passed, 12 failed | All 12 observed failures were test-file imports lacking `@icp-sdk/core`; suite not green |
| Dependency installation | BLOCKED, nonzero exit | npm registry resolution failed with `EAI_AGAIN` |
| Rust compile/unit tests | BLOCKED | Rust/Cargo not installed |
| Canister Wasm/PocketIC | BLOCKED | Required build/runtime tools absent |
| Docker reproducibility/security gate | BLOCKED | Required tools/network absent; not executed |

The initial Node run used v22.16.0, not the source workflow's pinned v24.15.0. The raw command results, logs, environment and qualifications are in [verification.json](../evidence/jupiter/verification.json). An import failure is not evidence of a gameplay defect, but it cannot count as a passed test either.
