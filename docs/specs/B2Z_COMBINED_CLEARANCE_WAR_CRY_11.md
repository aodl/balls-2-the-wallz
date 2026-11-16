# Combined territory clearance and War Cry — Rules11 candidate

This is a new deterministic identity, not production activation. The deployed
European paid game remains Rules7. Standalone Rules9 and Rules10 retain their
historical meaning. Rules8 delegated payments remain separate and disabled.

## Identity and interpreter

Policy: `config/rules/v11-combined.json`. The exact configuration combines Rules7
entry/economics, Rules9 clearance and Rules10 cosmetic annotations:

- Rules: `5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756`.
- Configuration: `b2fcfaabecc226e4b99e1660b2341690e4ffb0eace29e152e26bc37d71f9e5df`.
- Unchanged world schema6: `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
- Source memo adapter6, normalized `BTZPAY03`, full memo maximum32 UTF-8 bytes.

One purchase interpreter enables both existing policies. Move and explicit or
implicit additional New inspect the processing-time world's7×7 neighbourhood.
Different non-neutral canonical players at wrapped Chebyshev distance0–3 exclude
a destination; distance4 is permitted subject to all other restrictions. Island
labels resolve to players. Neutral cells, friendly islands and unclaimed balls
are not enemies; dormant enemy-owned territory is. First Join keeps the existing
maximin entry policy. Fire/Revive physics and economics do not change.

Unsafe paid actions reject with `ENEMY_TERRITORY_TOO_CLOSE`, `amount_used=0` and
existing retained-payment accounting. No refund or internal credit is introduced.
A suffixed New cannot bypass clearance. Same-batch earlier territory changes are
visible to later purchases, with no speculative future ownership.

War Cry uses the unchanged strict Rules10 codec: supported FIRE/NEW directive,
one `|`, exact bounded Unicode text. Empty cry has no separator; Move cannot carry
text. Invalid present text never falls back to another grammar. The full normalized
record and Ledger position remain authenticated. Only gameplay seed material uses
the existing semantic BTZPAY03-to-BTZPAY02 projection; cosmetic text cannot reroll
any purchase, including another payment in its batch. Historical identities retain
their original input bytes and seed behaviour.

One annotation accompanies the first actual successful launch of an eligible
payment. Partial fulfilment can speak once; zero/rejected purchases cannot speak.
A rejected annotated New cannot donate words to the next payment. Cursor recovery
retains pending words until successful event application or receipt rejection.
The existing verified-only, pointer-transparent55+5-second bubble policy remains
unchanged, including hidden aging, deduplication and identity/epoch fences.

## Direct Rules7 cutover

Controller-only `prepare_combined_transition`, `combined_transition_status` and
`commit_combined_transition(expected_manifest)` use the established source drain.
Preparation requires exact Rules7/schema6/adapter4, paused error-free operation,
healthy checked source, no pending request/lifecycle barrier/competing transition,
minimum transition liquid headroom and an open resource-protection admission gate.
No threshold, funding operation or operating-mode override is introduced.

The existing global Ledger exclusive cutover is observed, the official Index must
reach it, and all admitted predecessor work is completed before commit. Commit
requires the exact current manifest, committed integer-time world, retired source
cursor, no staged execution or pending inputs, and the authenticated predecessor
source anchor. No admitted batch changes policy halfway through processing.

The authenticated checkpoint's metadata version7 binds exact old/new identities,
identical world hashes, logical boundary, source anchor/cursor, Ledger cutover,
Index completeness and adapter4→6. Only the committed epoch changes the adapter.
World, entities, ownership, scores, balances, receipt history, deadlines and source
ordering are retained. Identical commit retry is idempotent; stale/conflicting or
superseded retries fail. Old transactions are never rescanned or reinterpreted.

The optional durable `combined_transition` record is omitted when absent, preserving
old Root encoding. Once preparation persists this new field, an old module using
`deny_unknown_fields` must not be assumed to decode it. This is an earlier recovery
boundary than the epoch: after preparation use a compatible forward-recovery module.
After epoch commit, Rules7-only rollback is categorically unsafe, particularly once
adapter6 inputs are admitted. Never reset, reverse the epoch, restore an old world,
reset source cursors, reindex payments or manufacture refunds.

## Frontend and release separation

Production's approved79-file panel frontend remains unchanged and continues to
recognise Rules7 without War Cry or clearance claims. A separate combined-compatible
frontend adds the exact Rules11 configuration while retaining Rules7/9/10 replay.
Both capabilities follow authenticated configuration, never a local flag. The
packet's rules/capability identity changes at cutover, so old copied instructions
cannot silently become eligible; Update/Keep remains coherent and stale copies
remain unavailable. The shared panel, audio assets, editor dock and warning remain.

Before backend activation, separately qualify and approve deployment of the compatible
frontend. Then separately approve an exact normal backend Wasm, its state-preserving
upgrade, and the bounded prepare/commit/resume operation with exact stop conditions.
Do not deploy the compatibility frontend or touch the paid backend merely because
this specification or a disposable test exists. Future delegated-payment composition
requires another reviewed identity, source/financial qualification and explicit approval.

See `evidence/B2Z/combined-clearance-war-cry/REPORT.md` for actual test scope and
candidate status. A specification is not evidence that hosted qualification passed.
