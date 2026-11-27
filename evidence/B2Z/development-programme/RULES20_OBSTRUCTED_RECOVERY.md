# Rules20 recovery from an obstructed Rules19 journal

## 27 November 2026 disposable reproduction

The exact installed Rules19 Wasm
`b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90`
was installed on a disposable canister with genuine ICP Ledger and Index
fixtures. One ordinary Rules19 interval had committed before the incident.
The grants use real Ledger memo decoding and account-history admission.

The digit-leading account's grant entered at position 2. Its checkpoint
failed with `reserved/noncanonical key`. A later unrelated 1 ICP `NEW 0 1`
payment entered at position 3. The Index cursor advanced to 4. Two inputs
remained pending, and the publication stayed at segment 5. The committed
received total stayed at 108,100,000 e8s. Resuming and upgrading to the
identical installed module both preserved the failure and pending work.

The compatible Rules20 test Wasm
`61c61972452e78caa32195edb14d76a952892ae983b9ea1c83d8e7a7be3fb2d3`
opened the stable journal and preserved its exact publication. After the
upgrade's clean Index reconciliation, ordinary transition preparation
returned `finish existing source reconciliation and recover errors before
cutover`. This gate is a **PASS** for the reproduction and a **BLOCKED**
result for recovering the predecessor. The fixture and runner are in
[the Rules18 cost harness](../../../tools/s09-integration/tests/support/rules18_cost.rs)
and [the Rules20 runner](../../../tools/verify_rules20_installed.py).
Raw exact-source logs and sealed captures are under
`.work/final-qualification/installed-ef5795d1/`.

## Recovery boundary

The normal Rules19 execution cannot retire the failed prefix because the
grant must remain in the authorization registry at publication. Starting
again clears the run error but re-executes the same canonical write. The
pinned DTR coordinator also rejects transition preparation and application
with a staged segment, inbox reservation or pending input, even if B2Z's
run-error precondition were relaxed. A context checkpoint likewise requires
an empty inbox. The Rules20 decoder's ability to read Schema11 and the
healthy-path migration establish compatibility at their respective
boundaries. Neither operation provides a source-preserving transition out
of this state.

The recovery protocol needs a versioned authenticated boundary that can
retain an admitted, unretired suffix. It must bind the last published
manifest, retired source position and anchor, current admitted cursor and
anchor, retained seal and ordered pending input digest. The upgrade must
either carry the sealed work or deterministically replay it from its
unchanged committed predecessor and exact seal. Replaying the failed draft
requires Rules19 command, tariff, clock and motion semantics with a
canonical grant-row representation. A recovery identity must make that
distinction explicit to independent verifiers. A bounded Ledger tip and
Index watermark can fence new work while the retained prefix is consumed.

A release proof must account for every retained input and compare retained
head, source position, receipts, spent and retained amounts, and state,
events and scores in both kernels through a durable interruption. The old
module remains the rollback executable only on the old decoder side of the
new boundary. A separate exact compatible recovery executable is required
after it. Removing inputs, substituting a later Ledger time or treating a
settled admission cursor as a retired game prefix would change paid
history. The pinned DTR boundary and recovery-specific replay support are
the current engineering blockers to a release candidate.
