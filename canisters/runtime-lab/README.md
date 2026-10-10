> Scope update: see [the S08 canister boundary](../README.md). This source builds to Wasm locally; no deployment is authorized.

# Current runtime laboratory — SYNTHETIC INPUT ONLY / DO NOT SEND ICP

This is a controller-only, synthetic-input canister using the generic native coordinator and the BTZ adapter. It is not the production arena. No live-ledger/source verification, Event Horizon call, timer, transfer, payout, balances endpoint or mainnet deployment is implemented here.

`apply` takes a revision and a bounded canonical coordinator action. `ingest` is controller-supplied test data, **not a trusted claim that a payment happened**. `seal` fixes the complete currently supplied prefix. Publication and inbox retirement share the same saved coordinator image.

Memory 0 is the version-5 small root; memory 1 holds bounded chunks. Slot 0 is the hidden coordinator image, slots 1/2/3 are committed state/events/scores. Each artifact is capped at 1 MiB. The small root is capped at 64 KiB. This schema is a NEW canister laboratory, not an automatic migration from arena-lab v4.

All authorization, revision checks, deserialization, computation and serialization happen before stable writes. Writes and certified-data replacement have no await boundary. Any late failure must trap to roll back; an ordinary error reply is not rollback. Upgrade verifies the existing image and output artifacts and restores the certified-data root; it never reinitializes genesis on error.

`observation` returns canonical public bytes and the IC certificate supplied by the system API. `artifact_chunk` requires the matching publication root and exposes no pending cursor. Public queries read the small root and one requested output chunk, not the hidden full host image.

The source calls the real certification APIs and its locked Wasm build passes. **No generated-Candid comparison, actual certificate, IC signature verifier, PocketIC upgrade test or cycle measurement has executed.** The browser adapter remains fail-closed without a real certificate-verification dependency. The no-await image write is bounded but still inefficient whole-image serialization, not a production capacity proof.

Dependency pins and the generated Cargo lock are committed. Build artifacts remain ignored. See the S05 verification gates and publication/coordinator specs before any authorized local-only integration work.
