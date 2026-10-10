> Scope update: see [the S06 canister boundary](../README.md). This source remains uncompiled; no deployment is authorized.

# S04 arena laboratory — SOURCE ONLY

A small controller-only integration workload connecting `btz-native` to `ic-stable-structures`. It has not compiled, run in PocketIC or been deployed. **Do not send ICP or treat this as a production DTR arena.**

The root stores schema/version, effective fixture identity, revision and artifact hashes. Stable memory manager region 0 contains a small root `StableCell<Vec<u8>>`; region 1 contains `StableBTreeMap<u64, Vec<u8>>` artifact chunks. Never reuse those IDs for another schema.

Four fixed slots hold committed world (0), pending cursor (1), committed events (2) and scores (3). Chunks are 16 KiB; each artifact is capped at 1 MiB; four slots contain at most 256 live map entries. These are laboratory caps, not proven production capacity. The stable allocator may retain grown pages after replacing records; bounded live entries do not prove a fixed high-water stable-memory footprint.

Initialization accepts a canonical artificial world. `prepare`, `advance` and `publish` are controller-only, expected-revision-fenced updates with no awaits. Controller-supplied inputs are synthetic normalized envelopes, not authoritative ledger receipts. Repeated updates with old revisions fail; after an unknown outcome the operator reads status instead of blindly replaying a mutation.

All decoding, kernel work, serialization and artifact capacity checks happen before any stable writes. Once the write phase starts, failures must panic/trap and roll back that message. Returning `Err` after writing would not be rollback. The single-message atomicity boundary differs from the deliberately multi-write/interruption JavaScript storage model. Neither establishes asynchronous cross-canister atomicity.

`post_upgrade` loads and validates the existing root, world and pending cursor. It has no replacement-state argument and no genesis fallback. Unsupported schemas or corrupted required chunks trap closed. No custom heap serialization in pre_upgrade is used. The actual upgrade behavior must still be exercised in PocketIC.

Queries expose small status and at most one committed chunk. The pending slot is not public. `certified` is always false: a state hash is not a subnet certificate. The status does not expose a live cycles balance. There are no transfer, ledger, signing, controller-change, HTTP-outcall or timer methods.

The declared `arena-lab.did` is a candidate interface. The build and generated-Candid comparison are unexecuted gates. The laboratory does not use the entire generic journal/seal/inbox host and is not yet the reusable production IC adapter.

Future authorized tooling sequence: resolve and retain a real lockfile; compile; compare generated Candid; run controller/unauthorized calls, injected trap rollback, prepare/advance/publish, pending-spawn/impact upgrades, artifact overflow and corruption tests against native/JS golden outputs. Tool presence alone is not a pass.
