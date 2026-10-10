# S02 journal and verified-inbox contract

Status: executed **offline reference/storage model**, not an IC stable-memory adapter. The model isolates the semantics an eventual durable canister host must preserve.

## Three distinct things

The authoritative source adapter verifies external records. `VerifiedInbox` stores the resulting contiguous prefix and selected canonical inputs. `SegmentJournal` computes and publishes one segment at a time. The game kernel never accesses the source or a clock.

A notification remains a hint only. S01 wakeup/coalescing/fallback and stale-lease tests remain. None of the new APIs makes Event Horizon authoritative.

## Input cursor and reservation

The inbox stores `cursor` (first unseen source position), `retired_to` (first position not fully acknowledged by gameplay), a bounded pending list and at most one reservation.

An adapter page provides up to 256 **consecutive** positions. `null` means a verified irrelevant record at that position, not a gap. Selected payloads are at most 1024 bytes; backlog is at most 4096. Malformed pages, a stale callback, a gap, replay or backpressure leaves the entire previous record intact. An empty prefix cannot change its boundary anchor.

A seal reserves exactly `[retired_to, cutoff)`, matching its source identity, input count/root and verified cursor. For a tip cutoff the anchor must match the current inbox anchor. Interior cutoff anchors still require separately retained proof from the trusted adapter; S02 does not solve that by trusting a hash supplied by a browser.

Reservation does not delete data. Ingestion may continue after the reserved cutoff. After publication, acknowledgement verifies the matching seal and output manifest, retires only that prefix and leaves later input pending. Retrying a completed acknowledgement is idempotent. A lost acknowledgement never justifies reapplying a segment.

## Host state machine

```text
committed head
     |
  prepare (validate source/rules/config/schema, state link and input root)
     v
  running cursor ---- advance/CAS ----> running cursor
     |
  kernel complete
     v
  ready manifest (still not visible as committed state)
     |
  publish/CAS
     v
  new committed head + outputs; staged cursor removed
```

A stage owns a monotonically increasing fence. Each proposed step also binds a storage revision. Two computations derived from one revision cannot both overwrite progress. Kernel exceptions and invalid/no progress produce no durable transition. An already-ready result is recomputed from the saved cursor when publishing, checking its commitment again.

The public `committed()` view exposes only the old head until final publication. State, events, accounting and committed source range move together. Operational revisions, work budgets and resume counts are excluded from game outputs and manifest hashes.

`publish(expected_manifest)` is idempotent for the last committed result. A wrong hash or incomplete stage fails closed. Rules/source/config changes are rejected by this v2 single-configuration host. Activation/migration is not implemented by adding an arbitrary setter.

## Crash matrix

| Failure | Recovery rule exercised |
|---|---|
| Before prepare/advance/publish storage write | Old document remains; retry from it. |
| Write completed, acknowledgement lost | Read durable state; do not assume failure means no effect. |
| Stale async-style result | Revision/fence check rejects it. |
| During capture flood fill or ownership transfer | Restore full hidden cursor; expose no partial board. |
| After publication, before inbox acknowledgement | Retain reservation and retry acknowledgement; do not rerun gameplay. |
| Corrupt/unknown snapshot | Halt for explicit recovery; never silently reset to genesis. |

The model uses whole-document compare-and-swap. The local CLI adds file locking, temp-file write, fsync, rename and directory fsync. Tests actually launch separate processes and resume a capture. This is evidence of the serialized model, not evidence of canister upgrades, multi-canister atomicity or crash safety on every filesystem.

## Canonical typed JSON (offline format)

UTF-8 compact JSON, lexicographically sorted ASCII object keys. Keys match `[a-zA-Z][a-zA-Z0-9_]*`, excluding `constructor`, `prototype` and `__proto__`. Values: null, boolean, well-formed string, safe integer Number excluding negative zero, arrays and plain objects. BigInt is emitted as the reserved single-field wire object `{"$integer":"canonical signed decimal"}` and restored as BigInt.

The encoder rejects sparse/decorated arrays, arbitrary class instances, unpaired surrogates, unsafe/fractional numbers, excessive depth/items and oversized payloads. The decoder re-encodes and compares **bytes**, rejecting alternate key order, duplicate keys, whitespace, BOMs and noncanonical integer tags. This is an explicitly versioned conformance format, not RFC 8785, not Candid, and not the final compact Rust state codec.

A hash supplied beside untrusted bytes does not authenticate those bytes. Restore expects a digest from a trusted durable record; CLI local checksums provide corruption detection only.

## Boundaries not solved by the model

No IC certificate verification, real ledger decoding/archive calls, wall-clock cutoff policy, independent seal authority, stable-memory transaction layer, financial transfer retry or configuration migration exists here. A malicious caller must not be allowed to invoke internal `commitProposal`/`proposePage` methods remotely. The future host owns authorization and verifies source completeness before invoking these trusted interfaces.
