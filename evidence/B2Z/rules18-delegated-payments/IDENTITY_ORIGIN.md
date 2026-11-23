# Permanent canister-ID Internet Identity origin

On 23 November 2026, the owner reported two successful real Internet Identity
sign-ins on the European origin. The signed official Ledger query was verified,
and the same derived principal returned after sign-out and sign-in. This closes
the owner-operated sign-in gate. Browser fixtures and disposable signing remain
separate evidence. The reported ceremony used a read-only Ledger query.

IC `read_state` authenticated the exact installed frontend Wasm on
`s2jxj-liaaa-aaaas-amynq-cai`. An HTTP v2 proof authenticated `/app.mjs` and
its exact qualified bytes. A second proof authenticated HTTP 404 for
`/.well-known/ii-alternative-origins`. The fixed frontend origin is unchanged
in the qualified source. [Certified origin check](identity-origin-live.json)

The SDK constructor regression confirms that a custom browser location and
supplied origin overrides cannot replace the fixed derivation origin. The
Chromium regression runs the production origin gate using intercepted fixture
responses and controlled signing. It allows the exact European frontend URL
and rejects a custom hostname, a raw gateway, an alternate gateway and the
backend canister hostname. It also exercises the disabled sign-in handler.
[Browser regression](identity-origin-browser.json)

The funding account, the derived signer principal and the separate backend
recipient remain distinct. The same signer is checked when verifying gameplay
grants, checking Ledger allowance, submitting immutable intents and matching
authenticated receipts. Keep the
[permanent release invariant](../../../docs/specs/B2Z_RULES18_DELEGATED_PAYMENTS.md#permanent-european-internet-identity-origin)
for future releases, including explicit identity migration review when any
canister or gateway name changes.
