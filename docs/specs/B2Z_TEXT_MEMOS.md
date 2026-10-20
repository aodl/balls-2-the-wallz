# B2Z text commands — adapter v3

Canonical wallet memos are `ANGLE 37.5`, `ANGLE 225` and `MOVE 83`. No product prefix is needed. ANGLE starts a cannon for a new funding account, or buys another ball for an existing cannon under the unchanged payment rules. MOVE relocates an existing cannon subject to ordinary ownership and eligibility checks.

The original `icrc1_memo` contains 1–32 bytes of ASCII text encoded as UTF-8. Only ASCII SPACE (`0x20`) may surround a command, within that original length limit. Interior separators are exactly one SPACE. Keywords are ASCII case-insensitive. Numbers contain unsigned ASCII decimal digits; leading zeroes are accepted. ANGLE permits an integer or a decimal with one or two fractional digits, from 0 through 359.99 degrees. MOVE permits an unsigned 32-bit integer, 0 through 4294967295; the game separately checks board bounds and ownership. Empty text, non-ASCII or malformed UTF-8, controls, signs, exponent notation, NaN, extra fields, embedded commands, trailing junk and overflow are rejected. The UI emits uppercase keywords and removes unnecessary leading/trailing decimal zeroes.

Degrees run clockwise on screen: 0 right, 90 down, 180 left, 270 up. The degree symbol appears only in labels. Authoritative parsing uses integer arithmetic:

```
heading = floor((centidegrees * 65536 + 18000) / 36000) mod 65536
```

The existing deterministic heading, velocity, collisions, territory and scoring rules are unchanged. UI geometry may use browser floating point; its arrow follows the final quantized heading. A preview does not launch a ball or predict an authoritative trajectory.

## Classification and compatibility

A present ICRC blob is the only memo source, even with a nonzero legacy numeric field. Historic eight-byte commands are recognized by the exact three-byte magic `42 54 5a`, then validated for length, opcode (`0x11` ANGLE, `0x12` MOVE) and ANGLE's zero upper payload bits. ASCII text goes to the text grammar regardless of its length: `ANGLE 12`, `ANGLE 99` and `MOVE 123` each occupy eight bytes. Arbitrary or malformed binary blobs remain invalid.

Published S15 `BTZ ANGLE 37.5` and `BTZ MOVE 83` commands remain accepted by that same parser. `B2Z ANGLE 37.5` is not a command. The website and CLI generate only prefix-free text. Legacy numeric commands are decoded only when the blob is absent. Empty or malformed present blobs never fall back. ASCII decimal digits are never treated as the numeric memo field.

The upstream ICP ledger preserves the supplied ICRC memo bytes and exposes numeric memo zero for these transfers; its official index preserves both fields. The local integration calls actual `icrc1_transfer`, reads the same bytes through the upstream index and preserves sending accounts, amounts, fees, original global transaction IDs and complete raw Candid digests. Invalid commands become deterministic invalid-command receipts and retained payments, without blocking later valid transfers.

## Upgrade and replay

Adapter v3 extends deployed S15 adapter v2, whose normal module is `c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4`. Source identity, source cursor semantics, root schema 7, economic configuration, canonical eight-byte command and normalized payment encoding remain unchanged. Existing worlds, scores, payment tallies, publications, seals, inbox and already normalized pending rows restore in place. Stored canonical payloads are never reparsed. A prefix-free memo normalized as invalid by v2 stays invalid after upgrading.

Captured canonical inputs and seals are authoritative for replay. Raw-history replay must use the actual normalization epoch: `decodeLedgerMemoV1` / `decode_ledger_v1` preserve the original binary/numeric and mixed-field rules; `decodeLedgerMemoV2` / `decode_ledger_v2` preserve S15's prefixed grammar and original classifier. Ordinary helpers implement v3. Transaction timestamps alone do not identify the processing epoch. Keep upgrade provenance and durable pending payloads. Distinct transactions need not have identical source anchors or spawn histories.

The explicit local installed-module probe creates players and completed publications using real ledger/index transactions, queues already normalized binary and rejected prefix-free inputs, upgrades the exact S15 module and compares publication bytes, identity, cursor, inbox and controllers. It then drains pending work and replays each run's actual captured canonical inputs and seals in Rust and JavaScript. This supplies local evidence; real mainnet gameplay transfers remain user-owned.

## Wallet presentation

Pick Start a cannon, Add a ball or Move cannon; aim or select an owned cell; prepare one stable instruction card. Local aiming remains usable before verification and during outages. Copying requires fresh certified destination/configuration/state and healthy operation. Changed prices or eligibility mark the complete card stale and require refresh. No quote reservation is implied.

Use an ICRC-1 text/UTF-8 memo field in an existing wallet. Advanced hexadecimal entry encodes exactly the same text: `ANGLE 37.5` is `414e474c452033372e35`. Some wallets do not expose the required memo controls. There is no login, wallet connection, signing, allowance, account linking or transaction submission. Selected cannon is local inspection, not proof of ownership.

ICRC owner remains `s34gv-3qaaa-aaaar-qcifa-cai`, with default subaccount omitted or 32 zero bytes. Wallets requiring an AccountIdentifier use the derived `344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`. These representations are labelled separately and authenticated before actionable copying.

Join remains 1 ICP; additional-ball base remains 0.1 ICP times active-ball-count squared; MOVE remains 0.0001 ICP. Exact integer formatting and certified configuration determine the card amount. Wallet fees are separate. Payments and excess are retained; refunds and automatic payouts remain unavailable.

Shared byte fixtures `tests/fixtures/text-memos.tsv` (unchanged S15 compatibility cases) and `tests/fixtures/text-memos-v3.tsv` run in Rust and JavaScript. The CLI and UI use the same JavaScript helper. See [immutable identifier policy](../architecture/LEGACY_IDENTIFIERS.md).
