# S10 live-local execution

This specification defines the bounded local-only progression and observation path added in S10. It does not change BTZ v3 rules, publication v6, animation v1, canonical payment memos, audit events, scores or segment seals.

## Autonomous progression

`runtime-lab` persists one run record: running state, generation, fixed logical segment duration, local wall-clock pacing, per-callback work budget and bounded counters. The coordinator remains the authoritative execution state.

The S10 demonstration uses two logical ticks per segment, one wall-clock second between callbacks and a work budget of 100,000. A controller performs one explicit `start_autonomous` call. Each generation-fenced one-shot timer callback rearms from its current time and performs at most one existing coordinator action:

1. an idle coordinator seals every input in the currently verified contiguous prefix;
2. a running coordinator performs one bounded `Step`;
3. a ready coordinator publishes the completed segment.

The one-shot does not replay missed wall-clock intervals. A late callback therefore delays delivery but neither changes the two-tick logical interval nor creates an unbounded catch-up loop. Duplicate starts with the same configuration are idempotent. A different configuration is rejected while running. Pause increments the generation and preserves committed and staged coordinator state. Post-upgrade recovery increments the generation, restores the one timer and continues an unfinished stage.

Direct controller `Seal`, `Step` and `Publish` actions are rejected while autonomous execution is running. Ledger fallback polling remains independent. The browser has no update method and cannot influence progression.

## Local input assignment

The local policy is “seal the verified head visible at the next idle progression callback.” A seal assigns the whole currently verified contiguous source range in canonical ledger order, including explicit rejected-command receipts. Payments discovered after that seal remain pending for a later segment. Empty ranges are valid, so already active balls continue through segments without new payments.

Ledger head, verified ingest head, sealed input head, simulation head and browser presentation head remain distinct. The timing observed in evidence is a local demonstration value, not a production fairness or latency claim.

Each ledger and archive call has a bounded wait. The matching generation/nonce/source/cursor lease is refreshed at a verified ledger-to-archive handoff, giving each external call its own 45-second recovery window. A replacement lease continues to fence late responses.

## Publication retention and authentication

The canister retains three completed publications in total, including the current head, subject also to an 8 MiB total byte limit. It stores exact publication-v6 bytes and their three immutable authoritative artifacts. Queries read bounded catalog metadata or requested chunks; they do not restore the hidden simulation cursor.

The current publication remains the canister's certified-data value. A retained predecessor is authenticated by walking backward from that genuinely certified current publication: each successor seal binds the predecessor manifest, state hash, logical time and source watermark, while the predecessor manifest binds its seal and artifacts. Retention-directory metadata is only a locator and is never a trust root. An unavailable segment returns `snapshot resync required`.

Retention is durable in the S10 host, but it is an intentionally small recent window rather than permanent history. Exceeding the count or byte limit evicts the oldest complete publication before the new atomic publish is committed. Operational status and counters are not content-addressed publication fields.

## Live observer

The existing observer has an explicit `Live local IC — test-network certified` mode. A loopback-only proxy conveys allowlisted IC query and `read_state` bytes between the browser and the still-running disposable PocketIC gateway. It cannot submit update calls or construct outcomes.

The browser receives a harness-pinned root key and canister identifier, forbids automatic root replacement, and uses the pinned standard IC SDK to verify certificate signatures, certificate time, canister path, certified data, publication commitment and artifact hashes. Authentication failure never falls back to offline replay.

A short disconnect walks retained predecessors and appends them in order. If the required predecessor has been evicted, the observer authenticates the newer current snapshot, preserves its in-session anti-rollback floor, discards the incompatible buffered timeline and visibly reports that unavailable animation was skipped. It never synthesizes missing events. Playback remains deliberately behind verified data and stops at data exhaustion.

Offline recordings remain separately labeled as pinned content rather than IC-certified data.

## Scope

This is a disposable PocketIC service path with valueless local-ledger records. The constants above are initial local limits, not evidence for production capacity, cost, fairness or finality. Production ledger scaling, settlement, real wallets, governance, reproducible release Wasm and unbounded historical access remain outside S10.
