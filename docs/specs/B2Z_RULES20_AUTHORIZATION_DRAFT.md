# Rules20 authorization storage draft

Status: **unintegrated successor kernel** on
`codex/rules20-authorization-integration`.
Rules18/19 and the installed Rules19 backend retain their historical
authorization encoding.

## Canonical successor record

```text
{
  version: 3,
  recipient: canonical 32-byte account hex,
  ledger_time_ns: exact nonnegative integer,
  last_position: exact integer or null,
  grants: [
    {
      account: canonical 32-byte account hex,
      activation_position: exact integer,
      expires_at_ns: exact integer,
      spender_principal: canonical principal hex
    }
  ]
}
```

Grant rows are strictly increasing by lowercase account bytes. Duplicates and
noncanonical accounts fail validation. The account is a string **value**,
because a valid account beginning with a digit is not a valid DTR canonical
object key. Historical v2 grant maps remain decodable for historical replay;
they must not be canonically re-encoded after a digit-leading grant.

Schema12 world validation and state-only migration now carry the row record in
Rust and independent JavaScript. The successor input path applies grants,
revokes and delegated authorization directly against sorted rows. Complete
Schema12 world bytes containing a digit-leading grant round-trip in both
implementations; exact historical Schema10/11 bytes remain unchanged. The
optional v2 conversion is retained only for diagnostic comparison and is not
used on every checkpoint. No installed canister or authenticated epoch
transition has activated Schema12.

## Required activation boundary

Before activation, add an authenticated successor identity and host transition.
Migrate the exact installed Schema11 state without changing
paid state, source cursor, retained receipts, historical publication bytes or
old decoder behavior. Qualify grants, revokes, expiry and delegated spending
through real disposable Ledger/Index admission, interrupted cursors, independent
replay, same-ID upgrade and compatible recovery. Measure row search, insertion
and canonical encoding cost at representative grant counts. A valid grant that
cannot be published under Rules19 is a live production risk; the disposable
consequences are recorded in
`evidence/B2Z/development-programme/AUTHORIZATION_REGISTRY_INCIDENT.md`.
