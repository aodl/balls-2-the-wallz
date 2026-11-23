# Rules18 optional delegated payments

Rules18 extends the Rules17 economy with opt-in ICRC-2 authorization for the
default certified B2Z receiving account. Manual payments work independently
with the same prices, gameplay and Ledger block-time tariff selection.

## Identities and permissions

Funding account A owns the ICP and the resulting game assets. Internet
Identity principal S signs the individual transfer. G is the authenticated
B2Z receiving account. The default receiving subaccount is required for this
version.

The official ICP Ledger allowance authorizes S to spend from A within its
amount and expiry. A separate direct, zero-value transfer from A to G grants or
revokes gameplay access with the existing domain-separated memo. Ledger
approval alone does not enter the game. Each optional Pay operation freezes
the exact amount, fee, memo, accounts and creation timestamp and requires a
user click. The canister never submits a transfer. Signing out leaves both
permissions in place.

## Permanent European Internet Identity origin

The frontend canister `s2jxj-liaaa-aaaas-amynq-cai` is the permanent identity
anchor for this deployment. The only production authentication origin and
the fixed `AuthClient` derivation origin are both
`https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`. The game recipient belongs to
the separate backend canister `s5ir5-gqaaa-aaaas-amyna-cai`.

The production sign-in entry must fail closed unless `location.origin`
equals that exact HTTPS origin. Browser hostnames, URL parameters, user input
and remote configuration may not set or override the derivation origin.
Custom domains, raw URLs and alternate gateway names cannot serve as a
fallback. Publishing any alternative-origin metadata requires a separate
explicit owner decision. The same derived S is bound to the browser signer,
gameplay grants, Ledger allowance, immutable intents and receipt checks.

Each release must verify that the authenticated frontend module is installed
on the designated frontend canister, its certified JavaScript keeps the
fixed origin, and the origin regressions reject custom hosts, raw and alternate
gateways, and the backend's origin. Any future frontend canister migration
or gateway naming change requires an explicit identity-migration review and
proof of principal continuity before changing the pin. This invariant assumes
no future naming-system capability and adds no custom DNS dependency. Provider
normalization does not change the application's pinned origin.
[Internet Identity specification](https://docs.internetcomputer.org/references/internet-identity-spec/#alternative-frontend-origins)

## Ordered source and financial records

Adapter12 (`BTZPAY09`) binds each incoming transfer to its official Index
position, payer and optional spender account, recipient, amount, fee, exact
memo, immutable Ledger block time, creation time and normalized row digest.
The Index Candid type must actually declare `Transfer.spender`. A missing
authoritative block timestamp uses the existing Ledger and Archive recovery
path. A record without a verified time remains unconsumed.

Rules18 checks the recipient, strictly increasing input positions and
nondecreasing block timestamps. Each account has one current grant. A
successful owner grant becomes effective after its source position for seven
days, measured by Ledger block time. Replacement and revocation take effect
at their ordered position. A different spender, an expired grant or setup sent
using a spender produces a separate rejected receipt. Ledger-confirmed
spending and certified game outcomes remain distinct. Financial journal
records are reconciled only against exact authenticated receipts. A lost
response or expired retained history leaves the intent unresolved. Browser
Web Locks and durable intent storage are required for optional Pay.

An authorized gameplay transfer enters the unchanged Rules17 interpreter.
The same inventory counts, included Ball, prices, midnight grace and
affordable prefix apply. The new registry and full transfer envelope do not
affect placement entropy. Receipts from earlier epochs retain their original
format and meaning.

## Activation and recovery

Schema10 adds an initially empty authorization registry; the daily schedule,
inventory, territory, Reservoirs and all other Schema9 fields are preserved.
Transition metadata version 14 commits the exact predecessor, world
projection, official Ledger cutoff and Index coverage, source anchor, recipient
and adapter change. A persisted preparation record is the old decoder
compatibility boundary. Continue only with the qualified normal Rules18
module after preparation. No snapshot, reinstall, replayed historic payment
or recreated world is needed for this transition.

The compatible frontend can verify Internet Identity on its established
European origin while Rules17 is active. It can perform a signed read-only
Ledger fee query in that state. Optional Pay and owner setup require the
exact Rules18 certified configuration. Real sign-in and session lifecycle
acceptance are external release checks; disposable keys exercise signing and
Ledger processing separately.
