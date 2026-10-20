> Historical checkpoint contract. Conflicting S06 requirements are superseded by [the current simplification contract](SIMPLIFICATION_V6.md).

# Atomic coordinator v5

Status: executed JS reference; matching native source and IC laboratory authored but uncompiled. B2Z gameplay stays v3; this is a host schema version, not a rules change. No implicit import/migration of separate historical v2 inbox/journal images is supported.

## Responsibility and authority

The host connects four operations: `ingest`, `seal`, `step`, `publish`. Inputs are already-classified payload bytes with absolute source positions. The API is trusted internal infrastructure, not a public proof of payment. S09's runtime-lab ledger mode obtains and classifies inputs through its configured replicated ledger/archive calls and disables generic external `Ingest`; controller-driven synthetic mode remains a separate test path. This local slice is not public payment admission or production scalability evidence.

A source page has at most 256 positions, including irrelevant records represented by null. Null consumes its position; omission would be a gap. At most 4,096 selected payloads (each <=1,024 bytes) are retained. A proposed page is rejected whole on capacity, gap, malformed payload or stale revision; the cursor does not move.

## Durable image

The canonical image is `{version:5, revision, journal, inbox}`. The embedded journal and inbox retain their version-2 field formats; existing v1 seals/manifests and canonical BigInt encodings are unchanged. The outer revision is a safe unsigned JSON integer. Source/logical positions are tagged u64 values. The JS and native implementations target the same bytes, including embedded pending cursor bytes.

The reference image is capped at 8 MiB and also subject to inherited canonical node/depth limits. Native IC laboratory images have the stronger 1 MiB cap. These are admission/allocation bounds, not measured IC instruction limits. The current implementation still clones, validates and serializes whole bounded images; it is not a scalable record-level storage engine.

## Operations

| Operation | Atomic effect |
|---|---|
| ingest | Advance verified-prefix cursor and retain all selected payloads together. |
| seal | Derive a seal covering the complete supplied prefix, reserve exactly those inputs, and initialize a hidden kernel cursor. |
| step | Run bounded logical work and save the resulting cursor; completed work becomes ready but is not yet public gameplay. |
| publish | Replace committed state/events/scores and retire exactly the reserved source range in the SAME outer-image commit. |

Seals fix the full current prefix. Arbitrary interior cutoffs are not accepted by this coordinator, because the inbox does not retain every interior anchor. The selected source anchor is opaque authenticated-source metadata supplied by the future adapter; the host does not manufacture an ICP block hash.

New source pages may arrive while a segment is staged. Their inputs remain outside that sealed batch and survive its eventual publication. A kernel begin/step failure never leaves half an input reservation committed. A corrupt normalized envelope still halts simulation rather than turning uncertain source decoding into a donation.

## State invariants

The journal source ID equals the inbox source ID. Committed `source_to_exclusive` equals inbox `retired_to`. The inbox's last acknowledged manifest equals the committed manifest (or both are genesis/null). A reservation exists exactly when a simulation stage exists; seal hash and selected input bytes agree. The stage must extend the committed chain and match configured source/rules/config/schema identity. Committed state and ready cursor results must reproduce their recorded hashes.

Kernel work partitioning does not define game time. Every budget/resume partition must preserve canonical output. The kernel cannot consult a clock, notification delivery time, network source or frontend.

## Failure and replay semantics

`propose` runs against an immutable read and returns a trusted local proposal. `commit` compares the outer revision. A stale callback cannot overwrite a newer seal or saved cursor. Proposals are not accepted over a public canister API.

The storage adapter must commit the whole image or retain the old image. Tests inject faults immediately before commit and after commit but before acknowledgement. Repeating publication of the already-committed manifest is idempotent and does not increment the revision. Neither recovery nor replay may drop a live reservation, reset genesis, or erase earned accounting.

The S05 file demonstration proves these transitions across actual process exits. It does not prove IC transaction rollback, power-loss tolerance of every filesystem, or monetary settlement.

## Fairness and time boundary

Recording a seal makes replay deterministic; it does not prove cutoff fairness. Controller-selected synthetic seals in the laboratory are not a production time policy. The production mapping from ledger positions/wall-clock arrivals to logical input checkpoints remains open. Public deterministic look-ahead is not removed by this host or by the playout buffer.

## Native evidence

`native/dtr-host` imports no game or IC library. B2Z implements its adapter in `native/b2z-native/src/host.rs`. A non-B2Z toy kernel is used by authored Rust unit tests; the executed JS host runs both Life and B2Z.

`tools/verify_host_native.py` is an actual native command runner, not a replacement oracle. It requires exact intermediate image comparisons, imported-JS continuations and native-to-JS resumptions. Until it executes, native equivalence is unverified.
