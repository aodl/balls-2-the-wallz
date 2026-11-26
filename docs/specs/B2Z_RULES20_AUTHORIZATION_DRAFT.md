# Rules20 authorization storage draft

Status: **unintegrated prototype** on `codex/rules20-auth-registry`.
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

The prototype converts a validated v2 registry to v3 rows and back to a v2
**in-memory** execution view. It proves exact Rust/JavaScript canonical hashes
for one and two grants, including a digit-leading account, and rejects duplicate
or unsorted rows. No current canister, world schema or payment admission uses
the new record.

## Required activation boundary

Before activation, add an explicit successor world schema and authenticated
Rules20 identity. Migrate the exact installed Schema11 state without changing
paid state, source cursor, retained receipts, historical publication bytes or
old decoder behavior. Qualify grants, revokes, expiry and delegated spending
through real disposable Ledger/Index admission, interrupted cursors, independent
replay, same-ID upgrade and compatible recovery. The prototype's v2 execution
adapter is a correctness aid; a production implementation must measure its
grant-count cost before using it in the checkpoint path.
