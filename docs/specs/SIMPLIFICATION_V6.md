# S06: current simplification contract

This is the current architectural decision for S06. It supersedes conflicting S04/S05 requirements for private cross-language cursor equality, operationally versioned observation downloads, and dependency-free production tooling. Historical evidence and fixtures remain available; preserving them does not preserve every old design as a product obligation.

## 1. Deliberately unchanged

BTZ v3 rules, pricing, initial placements, causal annihilation, canonical source inputs, state, audit events, scores and seals are unchanged. The same reference fixtures must still pass. Life remains the second kernel. There is no new game, financial subsystem, storage framework, consensus rule or real deployment in this checkpoint.

## 2. One coordinator on the current execution path

`packages/runtime/coordinator.mjs` directly applies the four operations to one owned record: ingest, seal, advance, publish. It no longer reconstructs a SegmentJournal and VerifiedInbox, revalidates both, and invokes nested compare-and-swap stores for every action.

The only operational authority is the coordinator's outer revision. Old nested counters remain in the version-5 export codec to keep useful regression/import fixtures working; they are not independent transactional authorities. Those private export bytes may change in a later version without a game-rule migration.

The current JS store copies trusted typed objects with `structuredClone`, rather than converting them to canonical JSON and immediately parsing them again. Expensive full validation occurs on create/import/restore. Before committing a replacement, the host checks canonical structural and byte limits once. Failed preparation never changes the committed record.

A kernel may provide `fork(cursor)` for an independent copy of trusted in-memory work. BTZ and Life do so. The coordinator keeps a private cursor cache; forked work cannot mutate committed work before the outer commit. Kernels without a fork use restore as the compatibility fallback. Cached cursors never bypass a real import's hash and invariant checks.

Proposals are opaque, single-use capabilities registered by their originating coordinator. A stale, copied or fabricated proposal cannot be committed. Pre-commit failures preserve the previous record. Lost post-commit acknowledgements preserve the committed replacement and recover without reapplying inputs.

Status and publication accessors copy only the fields they expose, not the private working cursor or input queue. The full `store.read()` remains a diagnostic/export compatibility accessor, not the public query path.

### Remaining cost and persistence limitations

This is a consolidation of the executed reference, not a production stable-memory implementation. The model still copies a bounded record, snapshots the working cursor at each durable advance and canonically encodes a whole replacement for its byte check. It is not zero-copy and does not yet persist individual typed records to IC stable structures.

The native host remains the S05 authored algorithm with the S06 public contract. Its typed hot-path/storage port is not falsely inferred from the JS changes. Compile and profile it before more architecture is added. The current IC lab retains whole bounded images and only the latest public artifact set.

## 3. Stable publication version 6

A v6 publication contains:

```text
version = 6
identity = source_id, rules_hash, config_hash, schema_hash
head = segment_id, logical_end, source_to_exclusive,
       manifest_hash, state_hash, seal
chunk_bytes = 16384
artifacts = state, events, scores [, render]
render_format = null | short versioned format identifier
```

There is no operational revision or ingest head in the publication identity. Those belong to operational status, which may be certified separately in a future production host. Repeated queries while ingesting, sealing or simulating the next segment return exactly the same publication bytes for the last committed segment.

Each artifact remains at most 1 MiB; the catalog remains at most 64 KiB. Descriptors bind byte length, whole-object SHA-256 and ordered chunk SHA-256s. The canonical game manifest is still computed from state, original audit events and scores. An optional render artifact has its own hash in the catalog; it cannot replace or alter those three roots.

A supplied render artifact must have a fixed projection format for the publication stream. Its exact bytes are covered by the publication digest. The client verifies the original game-manifest roots and optional artifact integrity independently. Application-level render semantics remain the game's responsibility.

### Retention is small and explicit

`PublicationWindow` retains consecutive completed catalogs and artifacts, by publication digest. Its defaults are three entries and 8 MiB total catalog/artifact bytes; callers can set explicit bounded limits. Oversize single publications fail without evicting existing data. Adding the same retained digest is idempotent. Changed identity/format, conflicting same-height data, backwards or missing segments are rejected.

Old downloads remain valid while their catalog is retained, even after a new segment is committed. Eviction returns an explicit snapshot-resynchronization error. Returned bytes are copies. Operational updates do not refresh or expand this cache.

The window is a bounded in-memory reference cache. It is not a durable multi-segment archive; after process loss it may start from the current committed snapshot and clients resynchronize. No upload state machine, content-addressed object-store framework or orphan collector was added. Persisted retention in the IC host remains an implementation gate.

### Authentication remains a separate production gate

The offline demonstration uses `offline-pinned-content`. This proves integrity relative to a supplied root, not its IC authenticity. S09's separate local mode supplies `verifyCertificatePublication` with exact `@icp-sdk/core` 6.1.0 and a root deliberately exported from the same disposable PocketIC instance. Real signature, delegation/canister-range, root-key, time and certified-data-path checks execute in Rust and Chromium. Production endpoint/root trust, availability and mainnet behavior remain separate gates.

Clients reject mixed v5/v6 sequences until explicit resynchronization. v6 sequencing uses committed segment height, predecessor links and stable catalog digest, not ingestion or private revision counters. The old v5 codec/fixtures remain explicitly named historical adapters; they are not the default protocol.

## 4. BTZ animation projection 1

`packages/kernels/btz/animation.mjs` derives `btz-animation-1` from a preceding committed snapshot and the original BTZ v3 event artifact. It includes both source hashes, preserves receipts and all non-motion events, and retains increasing source sequence IDs. Gaps are intentional projection omissions, not missing ledger commands.

For each ball, the renderer needs the trajectory equation `(x0, y0, vx, vy)` and owner/id. Ordinary traversal into another same-owner cell does not change that equation. Such a motion record is omitted. Reflection/trajectory changes are emitted as `trajectory` events. Explicit vertex-blocked effects are retained even when the equation is unchanged. Cannon/ball creation, movement, territory changes, strikes and destruction are preserved.

The preceding snapshot supplies initial balls and board state. Render consumers must check the projection's `initial_state_hash` and `source_events_hash` against the authenticated predecessor and original event descriptor before playback. Hash consistency does not prove that an arbitrary projector implemented the rules correctly; replay/reference conformance provides that additional evidence.

The projection is optional derived presentation data. It does not change the authoritative game-event schema or erase the audit trace. Therefore historical game manifests remain byte-identical. The game kernel still generates its verbose internal/audit events: this checkpoint reduces observer payload, not the kernel's event-production allocation.

All seven complete BTZ traces test exact ball trajectories at every original event boundary and unchanged non-motion events. The dense fixture reduces the observer event payload from 39,928 bytes to 4,502 bytes, omitting 146 unchanged motion events. This is data volume, not a frame-rate or cycle measurement.

## 5. Public conformance, private implementation freedom

Required compatibility:

- canonical inputs/configuration, public snapshots, authoritative outcomes and game-event/scoring bytes;
- deterministic results under different work budgets;
- recovery from each implementation's own supported saved state;
- no loss or duplicate application of sealed inputs and no partial publication.

Not a permanent release requirement: JavaScript and Rust resuming from identical private queues, phase labels, scratch buffers, caches or working-image encodings.

The native game/host runners now default to public output comparisons plus native-own interruption/recovery. `--legacy-cursors` on the Python native wrappers opts into the older bidirectional private-byte diagnostics. Existing JS private fixtures remain useful regression tests, not a promise to preserve those bytes forever.

S08 executes the actual native checks with committed lockfiles and Rust 1.94.1. Public-output equality and each native implementation's own recovery pass; the optional legacy private-cursor diagnostics remain outside the release obligation.

Planned production upgrades should occur at completed segment boundaries where practical. Recovery may recompute an unpublished segment from its retained starting state and seal rather than translate another implementation's internal queue. Input deduplication, scores and committed history must still be preserved. Actual production migration/recomputation behavior is not implemented here.

## 6. One current service candidate

`canisters/runtime-lab` is the only current IC host candidate. Its source targets stable-root/publication version 6 and rejects malformed/old durable roots rather than inventing an untested migration. It retains controller-only synthetic mode and adds a trusted-configuration ledger mode confined to `pocketic-local`; generic `apply(Ingest)` is disabled in ledger mode. S09 executes install, authorization, traps, ignored client replies, upgrades at idle/sealed/partial/ready boundaries, an upstream ledger archive, fallback discovery and recertification. It is still not a production payment service.

`canisters/arena-lab`, the generic chunk-store experiment and the old independent journal/inbox demonstrations are frozen diagnostics. They remain in the self-contained checkpoint for evidence and reference, not as alternative production platforms to support. The separate interface probe remains a diagnostic tool, not a deployed game component.

The S08 native/publication public-output gates remain required. S09's local slice demonstrates the named certificate, ledger/archive and upgrade behaviors only. It does not establish production retention, finality, capacity or cycle cost. The current native publication source has no BTZ render artifact; the existing JS projection is derived in the browser from authenticated predecessor state and audit events.

## 7. Dependencies are not prohibited by an offline environment

The no-install source test tier stays available. The source policy no longer demands an empty npm graph or local-only Rust dependencies. Exact reviewed releases, matching real lockfiles and integrity-protected resolutions are permitted and preferred over bespoke replacements for standard facilities. Root/npm currently still have no new external dependencies. The npm metadata lock was regenerated locally with scripts disabled and offline mode, not invented.

Registry-free root packages and the separate native workspace are retained until native compilation can rationalize them safely. Do not perform a risky blind workspace merge solely to reduce directory count. Dependency audits, license review and reproducible builds remain required when the actual product dependency graph is resolved.

## 8. Evidence and references

Run `python3 -B tools/check.py source` for executed conformance, and `all` for explicit native/integration gates. Missing tools are BLOCKED, never a pass. Run `node tools/simplification_demo.mjs` for an offline retained-download and compact-stream demonstration.

`tools/measure_runtime.py` instruments only a disposable copy of the canonical codec. The before/after evidence compares equal scenario/rules/budget and verifies output bytes against direct kernel execution. It counts cumulative transformations, not peak memory or network volume. No claim about cycles, Wasm instruction counts or production speed follows from these numbers.

Primary technical references rechecked for this consolidation (20 September 2026):

- IC message execution: https://docs.internetcomputer.org/references/message-execution-properties/
- Rust stable structures: https://docs.internetcomputer.org/languages/rust/stable-structures/
- Certified variables/client verification: https://docs.internetcomputer.org/guides/backends/certified-variables/

These references inform the chosen boundaries. They do not certify that the authored canister source compiles or behaves correctly.
