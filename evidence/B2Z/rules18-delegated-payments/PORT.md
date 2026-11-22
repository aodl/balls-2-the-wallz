# Rules18 delegated-payment port

This branch starts from the Rules17 tactical frontend source
`1cd92576eae01d6f014db0d348576519cf53a909`. The reusable implementation
was recovered from `38987fe84813ddb6b8cceef293dd42a98fd64985`. GitHub
reports both runs successful for that exact historical commit. The new
port has separate local tests. [Historical verification](https://github.com/aodl/balls-2-the-wallz/actions/runs/43049100060) · [Historical financial suite](https://github.com/aodl/balls-2-the-wallz/actions/runs/43049099998)

## Ported and locally tested

- The original Internet Identity session and stable derivation origin, owner
  setup and revocation command builders, explicit funding-account parsing,
  signed Ledger transport and immutable intent journal with browser locking.
  The signing transport remains separate from the observer.
- The original owner grant and revocation memo bytes. A funding account’s
  direct grant and the Ledger’s spender allowance remain separate. The
  authorization kernel checks immutable block time, ordered source position,
  the exact spender and recipient, expiry and revocation.
- The successor transfer envelope uses provisional Adapter12 `BTZPAY09`.
  It binds the payer, optional spender, recipient, amount, fee, Ledger
  position, block timestamp, creation time, exact memo and source digest.
  The Rust and JavaScript shared fixture yields the same Rules17 normalised
  purchase input, including the immutable block timestamp. A setup memo
  cannot produce a purchase input.
- The authorization index uses exact account keys. Ordinary lookups and
  revocation no longer scan all grants. The local tests admitted 2,048
  independent grants in both implementations. Expired grants fail at the
  precise deadline. Measuring the full serialized state and its publication
  cost remains an installed-IC task.
- The historical Candid type-table guard rejects a reply whose Transfer type
  omits the optional spender field. Current host unit tests also verify
  that the candidate normalizer treats Approve as a non-payment and
  rejects a transfer without a block timestamp. The live adapter remains
  unchanged.
- The frontend quote bridge matches prices and exact memo bytes for all
  seven action types, including Shout where supported. This bridge
  reuses the Rules17 quote builder and accepts a verified pricing time.

Local results include 28 JavaScript checks, two native authorization and
envelope checks, four Index wire checks and a source normalizer check.
SDK signing, intent recovery and owner command tests use local fixtures.
The 17 shared Rust protocol tests also passed.

## Activation gates still open

The Rules18 configuration and schema, durable registry and receipt
wiring, official Index and Ledger archive path, authenticated frontend
capability and migration still need integration. The candidate Index decoder
and normalizer are test-only. The recovered authentication, journal and
Ledger modules are not mounted in the game.

The new source still requires the state-preserving Rules17 cutover rehearsal,
official disposable Ledger/Index financial tests, independent authenticated
replay and exact-source hosted qualification. Real Internet Identity
acceptance on the established European frontend origin requires an
owner-controlled sign-in once the gated candidate is ready. No mainnet
allowance or payment is needed to verify that sign-in ceremony.
