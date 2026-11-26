# Rules19 authorization registry encoding incident

Observed 2026-11-26 in a disposable PocketIC with the exact installed European
backend executable (`b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90`).
No production payment, setting or canister was changed.

## Reproduction and consequences

`rules18_cost::rules19_digit_leading_grant_wire_boundary` in
`tools/s09-integration/tests/support/rules18_cost.rs` uses the official
disposable Ledger and Index. It submits a zero-amount authorization grant from
a valid ICP account whose canonical 64-character hex identifier begins with a
digit. Rules19 uses this account string as a canonical object key. That key
fails the wire grammar at the next publication with
`reserved/noncanonical key`.

The initial grant advanced the source cursor to 3. The prior publication head
remained at segment 4, and autonomous gameplay stopped. A subsequent unrelated
valid 100,000,000 e8s transfer at source position 3 advanced the source cursor
to 4, but the publication still did not advance. Retrying the ordinary run and
upgrading to the identical installed backend executable both reproduced the
same error; neither restored autonomous gameplay. The failure is therefore
durable across the tested same-module recovery and blocks publication of later
valid gameplay, although source reconciliation continues. The test checks the
world's received total against its pre-grant baseline: both are 108,100,000
e8s, so the later real transfer is **not yet applied to gameplay**. Its
Ledger/Index position remains a source fact. The controller still retains two
pending inputs (the grant and the later payment). Recovery must preserve and
apply both in order; source admission is not a committed receipt or a Ledger
refund. The [concise machine result](authorization-digit-leading-grant.json)
records each observation.

The concise JSON result is retained alongside this report. Full disposable
logs and captures remain under `.work/development-programme/authorization-consequence-probe/`.
The ignored test can be rerun with the pinned PocketIC, Ledger, Index,
Schema10 world fixture, profile Wasm and exact installed Rules19 Wasm. It must
not be run against production.

## Repair boundary

The separate `codex/rules20-authorization-integration` branch introduces
canonical sorted grant rows in Schema12. Each account remains a validated row
value, including digit-leading identifiers. Rust and independent JavaScript
grant/revoke and canonical encoding tests pass; historical Schema10/11 map
decoding and published bytes remain unchanged. The implementation updates rows
directly during ordered input processing, without a complete map conversion on
every checkpoint.

This is **not yet a deployable repair**. The authenticated epoch transition,
successor identity, interrupted commit/recovery, real paid successor execution,
and full exact-source qualification remain required. A narrow separately
versioned repair would protect production sooner than the larger mechanics and
tariff successor if those remain delayed, but it still needs the same paid-state
transition and recovery proof. No old Rules19 executable can be called a safe
rollback after a Schema12 commit without proving decoder compatibility.
