# BTZ text commands — adapter v2

S15 is an additive account-index input extension. Kernel rules, world v3, economics, `BTZPAY02`, eight-byte commands, seals, publication v6, source identity/anchors and animation v1 stay unchanged. DTR is unchanged at `1f47c1a0a104875bd13475d561b8d5aa10770d99`. Deploy the upgraded backend before publishing the text-emitting observer. This document describes that release; it is not evidence that mainnet has accepted a text payment.

The primary commands are `BTZ ANGLE 37.5`, `BTZ ANGLE 225` and `BTZ MOVE 83`. ANGLE creates a cannon for a new sending account or adds a ball for an existing account using existing payment/eligibility rules. MOVE relocates an existing cannon under existing ownership rules. There are no JOIN/FIRE commands or extra fields.

## Grammar

The **original** ICRC-1 memo must contain 1–32 bytes. Text is ASCII encoded as UTF-8. Only ASCII SPACE (`0x20`) may surround the command. Interior separators are exactly one SPACE. Keywords use ASCII case-insensitive comparison. Numbers have one or more ASCII decimal digits; leading zeroes are accepted. No signs are allowed.

```text
command = SPACE* "BTZ" SPACE ("ANGLE" SPACE angle | "MOVE" SPACE cell) SPACE*
angle   = DIGIT+ ("." DIGIT{1,2})?       ; numeric value 0 through 359.99
cell    = DIGIT+                        ; numeric value 0 through 4294967295
```

Empty input, non-ASCII, malformed UTF-8, all control characters (including tabs/newlines), exponent notation, NaN/infinity, extra commands, trailing junk, overflow, missing decimal digits and additional fractions are invalid. The UI emits uppercase keywords, single separators, no surrounding spaces or leading zeroes, and removes trailing fractional zeroes. It may wrap the local numeric value 360 to 0; wire input 360 remains invalid. The degree symbol is a UI label only.

Angles are clockwise in screen coordinates: 0 right, 90 down, 180 left, 270 up. For integer centidegrees `c`, the wire heading is:

```text
floor((c * 65536 + 18000) / 36000) mod 65536
```

Rust and JavaScript use integer arithmetic at this boundary. The preview uses the resulting heading's existing integer CORDIC velocity, rather than an independently rounded direction. Simulation heading, velocity, collision, capture and scoring rules are unchanged. MOVE's u32 wire range is distinct from board bounds and ownership, which the kernel checks at application.

## Blob precedence and normalization

When `icrc1_memo` is present, it is the only memo source. A valid old eight-byte binary command remains supported. Otherwise the bounded text parser produces the existing command. Invalid/empty blobs produce the existing all-zero invalid command; they never fall back to the numeric field. The legacy numeric command is decoded only when the blob is absent. ASCII decimal digits are never interpreted as bytes of the numeric legacy field.

The inspected upstream ICP ledger's `icrc1_send` constructs `memo: Memo(0)` and preserves supplied `icrc1_memo` bytes. Its index preserves both fields. Adapter v2 deliberately accepts a valid blob even if a compatible index record also contains a nonzero legacy memo. The local installed integration asserts the real upstream values, original bytes, sending accounts, amounts and transaction IDs. The source still hashes the complete raw Candid transaction-with-ID and orders original global IDs; normalization does not replace raw digests or renumber records.

Malformed commands become ordinary deterministic invalid-command receipts and retained payments. They do not trap reconciliation or prevent a later valid transfer from advancing. No additional source, scanner or gameplay pipeline exists.

## Upgrade and historical replay

The deployed predecessor module is `2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c` (adapter v1). Adapter v2 is recorded in source, the release manifest and tests. The source descriptor's identity is deliberately unchanged: it identifies the same receiving account and official index, not a new stream.

Existing root schema 7, world, economic profile, payment tally, scores, inbox, source cursor, normalized pending rows and retained publications are restored in place. Already normalized rows are durable payload bytes and are never parsed again. An old invalid row remains invalid after upgrade. Account history below the admitted watermark is not replayed or skipped. A previously downloaded but unadmitted row uses its stored normalized payload; new downloads after the upgrade use v2. No historical golden is rewritten.

Canonical-input replay with each run's captured inputs and seals is authoritative. For **raw-history** replay, choose the normalizer from the actual processing epoch, including persisted pending payloads: `decodeLedgerMemoV1` / `decode_ledger_v1` preserve v1's binary/numeric-only and mixed-field rejection; the ordinary helpers implement v2. Transaction timestamps alone cannot identify the normalization epoch. Preserve upgrade provenance and captured canonical inputs. Equal command text in distinct transactions does not imply equal source anchors or spawn histories.

The explicit deployed-module upgrade integration installs the exact predecessor, creates two players and completed publications using real ledger/index transactions, pauses with two normalized pending payments, upgrades, compares the complete publication bytes/cursor/inbox/controllers, then drains inputs and replays each actual seal in Rust and JavaScript. A text row normalized as invalid by v1 must stay invalid. This is local evidence, not a claim about a real mainnet text payment.

## Wallet and observer behavior

A player picks Start a cannon, Add a ball or Move cannon, then aims or selects an owned cell and prepares one complete card. Local aiming works before verification and during outages. Payment copying requires a fresh authenticated destination/configuration/state and healthy operation. A changed price or eligibility marks a prepared card stale without replacing its amount or memo; explicit refresh updates the entire card. This is not a quote reservation.

The card shows the authenticated ICRC owner and numeric subaccount separately from the derived AccountIdentifier. Default subaccount 0 may be omitted or supplied as 32 zero bytes. The mainnet owner remains `s34gv-3qaaa-aaaar-qcifa-cai`; the derived default AccountIdentifier remains `344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`.

Copy text memo is primary. An advanced hexadecimal ICRC memo field receives **UTF-8 bytes of the same text**, not the old eight-byte command or ASCII legacy integer. Some wallets lack the required memo controls. No login, wallet connection, signing, allowance, account linking or transaction submission is provided. Selected cannon means local inspection, not authenticated ownership.

Join stays 1 ICP; ball base stays 0.1 ICP times active-ball-count squared; move stays 0.0001 ICP. Prices come from authenticated configuration/current state and use integer ICP formatting. Wallet fees are separate. Payments/excess are retained; refunds and automatic payouts remain unavailable.

## References

The [ICRC-1 standard](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/README.md) defines account and memo fields; [ICP ledger documentation](https://docs.internetcomputer.org/guides/digital-assets/ledgers/) describes the ledger family. The reviewed [Jupiter source](https://github.com/aodl/JUPITER_FAUCET_SUITE/tree/a16f3dccd31a43f13779ba28bfd3506bb2f2f2e9) supplied the bounded ASCII declaration principle only; BTZ has no Jupiter dependency or routing/payout machinery. Shared byte cases are in `tests/fixtures/text-memos.tsv` and run in Rust and JavaScript; the CLI and UI use the same JavaScript helper.
