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

## Integrated successor

The candidate now wires grants into ordered execution, includes the original
transfer fields in the certified receipt and exposes a metadata-version-14
prepare, drain, commit and same-module recovery path. The frontend exposes
optional signing only for the verified receiving account and exact successor.
The Rules17 predecessor remains usable for manual payments and can exercise a
read-only signed Ledger query during Internet Identity acceptance.

A read-only check at 21:33 UTC on 22 November confirmed the European frontend
`33016b1d731717a80e0c67cc52df77a996b88f3264d9b9ae1c7a58fc812369b6`
and Rules17 backend
`c066140f4ef3174b3f440694c19ec4116a03298fcc63b80636b0b5389bc210ca`.
The backend had two Cannons and two Balls in the authenticated Schema9 snapshot.
Signed operational status showed one-tick Trickle with open admission,
healthy source binding, zero pending records and cursor 40,647,923.
The frontend held 792.028B cycles with a 202.914B freezing floor, leaving
95.114B after the previous 494B combined proposed installation, compatible
reinstall, staging and contingency allowance. Backend liquid headroom after
its freezing floor was 2.313T. Refresh these observations before any release.

Mandatory gates remain the actual integrated disposable signed Ledger journey,
independent authenticated replay, hosted qualification on the frozen
candidate and real Internet Identity acceptance on the established European
origin. No mainnet deployment or financial operation was performed.

The 2,095 JavaScript tests and 61 runtime-host tests passed. The Chromium
journey passed at 1440×900, 390×844 and 320×640 using the real frontend
controls, native clipboard and native Web Locks. Its authentication and
Ledger connection use controlled fixtures. [Browser results](browser.json)

The first disposable run reached the Rules18 cutover but its signer stopped
waiting before the longer predecessor rehearsal finished. The next run also
reached cutover. Its Ledger rejected approval because the reused fixture
disabled ICRC-2. The financial test now explicitly enables ICRC-2 at local
Ledger initialization and checks advertised standards before the rehearsal.
Both failed runs remain separate from qualification.

The frozen build source is
`ed5a3b850c971bf1768c2d916e5212d1a38f5a54`.
The local embedded Wasm is
`da3fccaaec5d2c1828a9ca53bdf979cd6d8a95be9398b8c4ad17ee8d53d49b55`
with 89 public assets. The normal backend built locally is
`32f6a34c0daf727a413853bdf1b88037622e97b2449999ef13aaf4985bff1147`.
The published financial and standard gates still determine the hosted
artifact identities and release status.

With ICRC-2 enabled, the disposable Ledger accepted the actual signed owner
grant, approval and two authorized SDK identities. The authorized payment
used 360,000 e8s and produced one payer-attributed game receipt. The Ledger
deduplicated the exact retry after injected response loss. A different
spender and a post-revocation transfer both settled at the Ledger and were
rejected by the game. A stale expected allowance was refused by the Ledger.
A following manual payment succeeded. Independent replay matched all 17
publications, including state, events and scores, using the captured Index
transfer facts. The separate certificate capture initially failed because the
disposable source-drain test advanced its clock beyond the signing process's
wall clock. The revised capture measures freshness against the independent
disposable replica clock with the same age and future bounds, and verifies
that a stale observation still fails.
