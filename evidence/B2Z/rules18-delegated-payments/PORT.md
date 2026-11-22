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
  that the candidate adapter treats Approve as a non-payment and rejects
  a transfer without a block timestamp. The candidate normalization path
  shares the production Rules17 Ledger and archive timestamp recovery.
  The live adapter remains unchanged.
- The frontend quote bridge matches prices and exact memo bytes for all
  seven action types, including Shout where supported. This bridge
  reuses the Rules17 quote builder and accepts a verified pricing time.

The provisional Rules18 configuration is
`6bcccdc6cb89cd32b680cead7c1ec7d7b6d7d294a36b44d7dd94be1a261b7934`.
The rules hash is
`3925d3aa0ef3fd031627290e6eeccd76f53b985625a25125b50ef34a4a2b4c22`
and the Schema10 hash is
`dfcb89f63c4d0d662b5ba6797ceb56902636e8c3c0d41efb1e902baa5b521e9b`.
The independent JS and Rust migration fixtures agree on exact pre/post
state hashes. They preserve the daily tariff schedule and all other
predecessor fields and add an empty recipient-bound authorization registry.

Local results include 29 JavaScript checks, three native authorization,
conversion and envelope checks, four Index wire checks and a source
normalizer check. SDK signing, intent recovery and owner command tests
use local fixtures. The 17 shared Rust protocol tests, 61 runtime host unit tests and normal
Wasm target check also passed.

## Activation gates still open

The paid runtime still needs to wire the registry into ordered execution,
publish and verify delegated receipts, and add the controller-only source
fence and epoch commitment. The source adapter has no active transition
to select it. The recovered authentication, journal and Ledger modules are
not mounted in the game. Official disposable Index and Ledger/archive tests
must exercise the full successor, including allowance and revocation.

The new source still requires the state-preserving Rules17 cutover rehearsal,
official disposable Ledger/Index financial tests, independent authenticated
replay and exact-source hosted qualification. Real Internet Identity
acceptance on the established European frontend origin requires an
owner-controlled sign-in once the gated candidate is ready. No mainnet
allowance or payment is needed to verify that sign-in ceremony.
