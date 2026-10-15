> Historical implementation context. The active S14 application is specified in [BTZ application](BTZ_APPLICATION.md). Existing memo/seal encodings remain; earlier global-scanner, local-only and future-implementation statements below do not define the current application.

# S09 executed local supplement

`canisters/runtime-lab` now executes this contiguous-scan baseline in disposable PocketIC tests against the pinned upstream ICP ledger and its ledger-established archive. The trusted local install configuration fixes network `pocketic-local`, ledger principal, recipient account, page limit, fallback interval and optional hint caller. Typed inter-canister `query_blocks` and archive `get_blocks` calls validate bounded ranges and advance only a contiguous decoded prefix. The durable cursor, canonical inbox records and domain-separated source anchor are saved with the coordinator image. The anchor binds the prior anchor, source indices and exact decoded block values; it is deliberately not labelled an ICP ledger block hash.

This evidence is local correctness, not production cost/finality. The index path remains outside this selected full-ledger path. The controller chooses an explicit seal at the currently verified watermark; the seal records that watermark but does not claim production wall-clock fairness. Test-only fault hooks are feature-gated and absent from the normal Wasm.

# S02 scope extension

Canonical S01 seals and half-open source ranges are unchanged. A bounded persistent inbox **model** and reserve/publish/acknowledge protocol are now executed and tested; see [the S02 journal contract](JOURNAL_AND_INBOX.md). No live source adapter or production cutoff policy has been added. The retained S01 discussion below is the baseline, not evidence of later live integration.

# Source ingestion, checkpoint assignment and asynchronous wake-ups

## Authoritative source and completeness

The v1 correctness baseline is a **contiguous full-ledger scan from a configured genesis cursor**, with archive recovery. It is not a claim that full-ledger scanning has acceptable production cost. That cost is a required operational gate. A future account-index optimization must prove completeness relative to a fixed ledger watermark before replacing this baseline.

`cursor` means the first source block not yet consumed. All ranges are half-open `[from, to_exclusive)`. Persist the cursor and the resulting inbox/receipts atomically. Replaying an old page, receiving a future page with a gap, or advancing to an advertised tip after a short reply is forbidden. A failed page produces no partial transition. In the pure model, `consumePage` returns the transition; a real stable-memory transaction is not implemented.

The pinned ledger may return a local sub-range plus archive callback ranges [R1](../IC_REFERENCES.md). `planQuery` chooses a range beginning exactly at the cursor. Validate bounds, overlap, route shape and requested maximum. An empty local block list has an unspecified `first_block_index`; do not mistake that value for progress. A missing prefix triggers retry, never omission. Archive routes come from the configured authoritative ledger, not Event Horizon or a browser. The pure model validates routing metadata; S09 additionally executes the callback obtained from the configured ledger and restricts it to the expected bounded `get_blocks` shape.

Index history is descending with exclusive `start`; its validation helper is **discovery only** [R2](../IC_REFERENCES.md). An input hash proves included bytes, not missing transactions. A public query without proof is not an authoritative payment source. Production reads need the configured ledger's replicated call context or independently verified certificates/encoded-block chaining, and a clear archive trust story. Neither path is implemented in S01.

## Genesis and timing

Record source identity, genesis cursor and genesis state/configuration. Payments before that cursor do not become retroactive commands. A production launch must communicate when command acceptance actually begins.

A **seal** commits exactly which source range feeds exactly which logical segment. Once sealed, its assignment cannot change. Logical durations do not depend on the execution budget or timer punctuality. `makeSeal` refuses a cutoff beyond the declared verified cursor and validates canonical ordered inputs.

The initial assignment contract is sequential: source ranges and logical intervals remain contiguous; a paid input appears at most once and only in its first committed source range. Empty-input segments still have a seal. A committed history includes seals, configuration/rules versions and source records; the bare ledger is insufficient to replay host-chosen timing.

**Open host policy:** how frequently to obtain a fresh ledger tip, how far commands must be scheduled ahead, and whether delayed discovery stalls or moves future assignments. The current pure model takes an explicitly chosen cutoff; it does not pretend timer-dependent selection has become timestamp-neutral. No promise that every payment before a wall-clock time enters a particular epoch is made. The IC host stage must choose, expose and test this policy before accepting payments. User-supplied `created_at_time` is not authoritative ordering.

## Canonical seal encoding

All integers are unsigned big-endian. Fixed 32-byte hashes are raw bytes, not text. `Seal` is exactly 308 bytes:

```text
8 bytes   "DTRSEAL1"
5 × u64   segment_id, logical_start, logical_end, source_from, source_to_exclusive
1 × u32   input_count (at most 4096)
8 × 32    source_id, source_anchor, rules_hash, config_hash, schema_hash,
          previous_state, previous_manifest, input_root
```

`source_id` is a domain-separated source-identity digest chosen in genesis. `source_anchor` is intended to bind the verified boundary block (or inherited anchor for an empty range). Test fixtures use synthetic hashes. S01 does **not** define normalized JSON as an ICP block hash or supply a raw protobuf verifier.

Input-root preimage: `"DTRINPUT1" || count:u32 || [position:u64 || payload_length:u32 || payload_bytes]*`. Maximum payload: 1024 bytes. Positions strictly increase and lie inside the seal's source range. These are DTR commitments, not native ICP ledger hashes.

Manifest preimage: `"DTRMANI1" || SHA256(seal_bytes) || SHA256(final_state_bytes) || SHA256(event_bytes) || SHA256(score_bytes)`. The JavaScript host uses Node's SHA-256 implementation. Pure Rust emits canonical bytes and accepts host-supplied hashes; it does not implement cryptography from scratch. Hashing is not certification.

A successor must reference the previous manifest and final state, increment segment ID, maintain contiguous logical/source ranges, and preserve source identity. Configuration/rules migrations still need explicit activation records and validation in a later stage.

## Event Horizon and fallback

The proposed `ledger_hint : () -> ()` receiver is our contract, not a description of unpublished Event Horizon implementation. A configured sender allowlist may reduce expensive unsolicited update traffic; it grants no payment authority. Multiple hints only set one dirty bit. They never supply balances, command arguments, tips or trusted transaction IDs.

The host admits one fenced scan lease with monotonically increasing generation and nonce. It checks source identity, cursor, generation and nonce again after each await. Expired/stale callbacks cannot complete a replacement operation. Hints received while a scan is running remain dirty after successful completion. Failed work requests another attempt; an independent one-shot fallback re-arms only after bounded work returns and discovers records when every hint is lost. Hints coalesce and carry no transaction authority.

No claim of zero-cost rejected updates is made. The future canister must bound callback decoding, timers, storage and ingress admission as well as the inner loop. The source model is not a stable-memory implementation or a liveness proof under a permanently unavailable ledger.
