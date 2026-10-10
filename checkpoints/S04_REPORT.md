# S04 — Native port and durable storage

Date: 20 September 2026. Delivery complete as a **source/conformance checkpoint**. Promotion: **BLOCKED**. No real-funds or deployment authorization.

Predecessor: `DTR_BTZ_S03_Admission_and_Causal_Simulation.zip`, SHA-256 `2edce604affe695c40632a28f9eea44b4b59f4d8523d07d0cffd06c10d347df2`. The supplied S03 ZIP was extracted and its full manifest verified before modification. Historical source and evidence are retained.

## Delivered

1. Complete authored Rust BTZ v3 game source, including exact bounded arbitrary-precision world/accounting, command interpreter, admission, physics, causal strikes, topology, events and portable cursors. This is no longer merely a collection of mechanics primitives, but it **has not compiled or established native equivalence**.
2. A separate native workspace and reusable canonical wire crate, using exact-pinned existing numeric/serialization libraries. No fabricated dependency lock, no new arithmetic framework and no change to S03 game outputs.
3. Executed independent large-fraction comparisons and phase/subphase cursor recovery fixtures. An actual future native runner compares complete outputs and both directions of Rust/JS continuation. Native checks remain unexecuted rather than simulated.
4. An executed generic chunk-backed journal adapter: immutable position-bound chunks, reserved generations, atomic root publication, incomplete-upload recovery, integrity/capacity checks and bounded orphan collection. Both Life and BTZ use it.
5. A real separate-process demonstration which saves a partial upload, exits, explicitly abandons only unpublished upload work, and resumes to the uninterrupted commitment. Lost acknowledgements and corruption are separately handled.
6. A source-only controller-restricted IC laboratory using a small StableCell root and StableBTreeMap artifact chunks, fixed region IDs, no-await writes, and fail-closed post-upgrade loading. No source-supplied ledger authority, timer, payment, certificate or production generic-host claim.
7. Updated verification commands, contracts, ADR, decision register, current status and continuation instructions. S04 keeps the previous rule identities and complete v3 traces unchanged.

## Recorded verification

See [machine-readable results](../evidence/S04/verification/verification.json), adjacent environment data and per-check logs. Counts below describe the executed source suite, not hypothetical native execution.

| Check | Outcome |
|---|---|
| Retained S03 baseline | PASS: 840 Node tests and 35 Python tooling tests before new changes. |
| Final Node suite | **PASS: 1,108 tests; zero failed, skipped or cancelled.** |
| Final Python tooling suite | **PASS: 39 tests.** |
| New exact arithmetic cases | 144 independent Python Fraction comparisons executed in JS. |
| Portable saved cursors | 70 implementation-derived snapshots resumed under varying budgets to complete S03 byte outputs. |
| New chunk/recovery cases | 54 Node tests, including 36 game/operation/failure combinations. |
| New process tests | Four Python tests: partial upload, pre-root interruption, lost acknowledgement, corruption/lock behavior. |
| Native gate source | 7 full traces + 70 imported cursors + 144 numeric comparisons, then 4 Rust-to-JS continuations; NOT EXECUTED. |
| Native Rust/Wasm | BLOCKED: Cargo/rustc unavailable. No rustfmt/Clippy result claimed. |
| IC Candid/PocketIC | BLOCKED: laboratory has not compiled; declared interface and actual upgrade/trap behavior remain unverified. |
| Dependency/reproducible Wasm | BLOCKED: no resolved lockfiles, audit or binary reproduction. |
| Source archive | Full manifest, fresh extraction/source rerun and deterministic-repeat checks performed at release; external release JSON records archive-specific results. |

## Findings and safeguards

Preserving intermediate state is as important as matching completed worlds. The new snapshots cover command application, spawn phases, search, area accounting, collision batching, delayed effects and topology transfer. They ensure the future native gate has a concrete continuation contract, not merely a final hash target.

Exact accumulated area-time is not narrowed to a machine integer. The inherited canonical capacity limits remain; arbitrary precision is bounded by those limits, not unlimited memory. Native canonical output recursively sorts object keys so dependency feature unification cannot accidentally change commitment ordering.

Stable publication has three distinct layers: unpublished storage chunks, durably stored simulation progress, and publicly committed gameplay. Recovering a failed upload never publishes half a capture or erases the last durable cursor. A missing/corrupt committed chunk halts rather than resetting the world.

For the IC laboratory, validation and serialization happen before any stable writes. After writing begins, failures must trap; returning an error value would not itself roll back writes. This posture is based on current official references, but actual behavior remains an executable IC gate.

## Explicit limits

The full native **gameplay source** is authored. The full native **generic runtime/IC service** is not complete. The laboratory deliberately uses controller-supplied synthetic inputs and does not validate ledger history or implement the generic sealed inbox. It is not a deployable paid game.

The chunk model still assembles/hashes/decodes whole bounded documents. Its diagnostic image has a lower effective export capacity than its internal object-store ceiling because hexadecimal serialization expands bytes. The IC laboratory caps each artifact at 1 MiB and has no proven stable-memory high-water or instruction-cost bound. These are conformance aids, not scalable production claims.

No actual cycle burn, ETH-equivalent measurement, certification, browser viewer, live wallet interoperability, final input cutoffs, settlement or target-subnet capacity validation was added. Prices and mechanical limits remain test configuration. Local integrity hashes are not certificates or proof of correct game logic.

## Next substantial checkpoint

Prioritize actual native compilation and bidirectional conformance as soon as authorized tooling is available; fix defects rather than changing goldens to fit the port. Bring the generic journal/seal/input orchestration onto durable IC interfaces with real upgrade/fault tests, then connect verified ledger/archive ingestion and certified observation. Preserve the existing Life workload and keep unexecuted gates visible when tools remain absent. Do not add public-money settlement until source authority and durable obligations have executable evidence.
