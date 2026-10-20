# Chunked publication and recovery — S04 model

`packages/storage/chunks.mjs` is an executed, game-independent persistence model. It implements the existing `SegmentJournal` document-store contract for Life and B2Z without importing either game. It is NOT an IC certificate, a production stable-memory implementation or an external-call transaction protocol.

## Commit boundary

A canonical descriptor contains format version 4, monotonically increasing document revision, total length, chunk size, full payload hash and ordered chunk hashes. A chunk hash binds the `DTRCHUNK4` domain, its index, byte length and contents. Existing chunks are immutable. A reserved generation carries the expected previous root revision and descriptor hash.

`begin` reserves one upload. `put` validates its generation, position, exact size and hash; duplicate identical chunks are idempotent and out-of-order writes fail. `commit` requires all chunks and verifies the whole payload before replacing the root. Repeating the acknowledged generation's commit is idempotent when no later upload intervened. Aborted/stale generations cannot overwrite newer work.

Until root publication, readers see exactly the preceding document. A root can describe either a prepared/running/ready journal or the published game head: **durably committing a new cursor is not publishing partial gameplay**. Final game publication remains the journal's explicit ready-to-head transition.

## Recovery

The serialized diagnostic storage image retains committed root, incomplete upload, writer generation and chunk objects. On restore, both root and uploaded-prefix integrity are checked. A corrupt committed chunk fails closed: there is no fallback to genesis or silently selected older game history.

After inspection, explicit `discardUnpublished()` abandons only chunks not yet referenced by a new root. Work resumes from the last durable journal cursor. If the write actually committed but its acknowledgement was lost, the new root is retained. This is not retrying a money transfer; monetary reconciliation remains a different protocol.

Garbage collection retains the current root's and reserved upload's referenced chunks and visits a bounded number of sorted keys per call. Orphaned chunks are reclaimable after abort. Admission fails before advancing a chunk position when the object/byte ceiling is reached. A caller should collect between slices and handle capacity as backpressure, not discard committed state.

## Bounds and limits

Default maxima: 16 MiB per canonical payload, 64 KiB per chunk, 4,096 chunks per payload, 8,192 stored objects and 64 MiB stored bytes. These are reference safety ceilings, not measured IC capacity. Full assembly/hash/decode is bounded but not incremental or instruction-budgeted. Sorting the bounded chunk index and whole-document serialization still cost work.

The diagnostic image itself uses the 16 MiB canonical codec and hexadecimal chunk representation, so it may reach its own export limit before the internal store's byte ceiling. It is a test/recovery transport, not a claim that 64 MiB of chunks fit in a 16 MiB snapshot. Production stable storage should persist chunk pages directly rather than serialize this image.

## Demonstration

```
node tools/chunked_demo.mjs b2z admission --journal .work/chunks.json --fault chunk:0 --budget 1
node tools/chunked_demo.mjs b2z admission --journal .work/chunks.json --recover yes
```

The first command saves partial chunk work and reports `INTERRUPTED`, with the original published board. The second explicitly discards only the unpublished upload, resumes the durable cursor, and reaches the same commitment as an uninterrupted run. `--fault before_root` and `--fault after` exercise pre-publication interruption and lost acknowledgement. No wallet or network is used.

The local file writer uses an exclusive lock and temporary-file fsync/rename. A hard kill may leave a lock; establish that no writer remains before removing it. No lock is automatically stolen. Local checksums establish integrity against trusted metadata, not authentication of an untrusted file supplier.

## Evidence

Executed tests include 54 Node storage/recovery cases, of which 36 inject failures into prepare/advance/publish for Life, admission, severance and near-impact. Four Python tests exercise real process exits/restarts, three failure modes, corruption and lock handling. The old atomic-document store remains as a comparison reference. No IC trap/upgrade test is claimed.
