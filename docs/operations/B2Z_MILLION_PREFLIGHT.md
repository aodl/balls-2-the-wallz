# Million-cell candidate: future deployment preflight and activation order

This is a prepared procedure, **not authorization to execute it**. This
closure performs no mainnet mutation, v5 activation, merge to master,
financial action or controller change. Historical statements about an authorized
"current task" in S14_OPERATOR.md do not authorize this candidate.

## Development qualification and identity to carry forward

Development qualification is **PASS**. The unchanged 900.297-second frozen-artifact
Normal gate passed: zero stalls, resynchronizations and adaptive limiting; stable
verified buffering; measured CPU headroom. Lifeline reconnect and independent
replay of 1,037 installed publications pass. Historical FAIL reports remain
unchanged and the upstream-delivery risk remains unresolved and accepted for
source integration. Another speculative engineering pass is not a promotion gate.

- Tested source/harness: `12fe4b6c0395b7e04a8b19b3997cd6fd90c8ffff`.
  [CI 40193219784](https://github.com/aodl/balls-2-the-wallz/actions/runs/40193219784)
  passed all six substantive jobs, including the full 50-check installed suite.
  Original implementation: `62ace9f718d48e18793e7ddbd91bd7f5cd020ca9`;
  original evidence candidate: `ae3ef1ce38cee8a6b33b051c924a66d9bcba3dbf`.
- The documentation/evidence closure is a **new commit**. Require green CI on
  that exact published commit before promotion, using the guards in
  [B2Z_MILLION_PROMOTION.md](B2Z_MILLION_PROMOTION.md). Do not reuse the older
  run as verification of a changed commit. Preserve the development checkpoint
  and annotated candidate tag `rc/b2z-million-cell-v5-20261026`; never move it.
- Frozen normal Wasm SHA-256:
  `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`.
  The controlled observation confirmed this exact installed disposable module.
- Frozen production app SHA-256:
  `3c593c54fe09997eabada19d3aee02f2cc7c39d1d5a0baea59b3e3516f61b732`.
  Verify **every** production frontend file against its original build manifest
  (SHA-256 `6bdaa08ae70f33f5864ddcd619b6321edad1dd7aa3b6a92b31a9fed6d0364a92`).
- The approved disposable-root adapter actually served during qualification was
  `eb9c7cdd07e706c95738c5167f6674eda30692afb7b1ca956c06d191d2fd4451`.
  It has a separate trust configuration. Future mainnet assets come from the
  frozen **production** frontend directory, not the local adapter directory.
- DTR Rust/npm revision: `e1bfcf25071d11190d14f461288e12a21ca26cf8`;
  reviewed 0.14.0 archive SHA-256:
  `ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`.
- [Final closure](../../evidence/B2Z/million-cell-release/frozen-qualification-closure.json)
  and [durable evidence index](../../evidence/B2Z/million-cell-release/raw-evidence-index.json)
  pin the complete raw snapshot and the byte-identical original frozen manifest.
  The verified read-only local snapshot is
  `/home/codexdev/b2z-release-evidence/million-cell-v5-12fe4b6c-20261026`.
  Resolve original `.work/...` references relative to that snapshot root.
  Qualified installation inputs are under
  `.work/million-frozen-controlled/qualified-artifacts/` inside the snapshot.
- Keep original candidate verification.json, historical PASS/FAIL reports and
  manifests unchanged. Checkout-dependent Cargo/Rust bytes do not authorise
  substituting a CI build (`ebc07e28…`) or a fresh rebuild for frozen `7c078fb3…`.

**Mainnet remains v4 pending separate authorisation.** This document is prepared
only; closure did not query or change live state. Master promotion alone does not
install the Wasm or activate the authenticated v4→v5 world transition. The
informational production-inventory CI job is not deployment approval.

## Fresh read-only preflight, immediately before any separately authorized change

Use `codex_local` through existing tooling; never inspect/export identity keys.
Resolve both aliases and require backend `s34gv-3qaaa-aaaar-qcifa-cai` and
observer `s45ab-wiaaa-aaaar-qcifq-cai`. Record controller principals and installed
modules for both. The expected backend predecessor is exactly
`c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`.
Stop on an unexpected predecessor or controller set; do not repair settings or
create another canister.

Read-only examples for that future preflight:

```sh
DFX_IDENTITY=codex_local dfx identity whoami
dfx --identity codex_local canister id b2z --network ic
dfx --identity codex_local canister id observer --network ic
dfx --identity codex_local canister status b2z --network ic
dfx --identity codex_local canister status observer --network ic
dfx --identity codex_local canister call b2z lab_status '()' --network ic --query
dfx --identity codex_local canister call b2z controller_runtime '()' --network ic --query
dfx --identity codex_local canister call b2z controller_funding '()' --network ic --query
dfx --identity codex_local canister call b2z controller_work '()' --network ic --query
```

Record genuine total and liquid cycles separately, the selected funding tier,
nominal/supported rates, performance-limit flag, running state and errors. Inspect
the enabled treasury, pending plan/phase, halt/pause flags, last conversion and
conversion totals. Recheck after a scheduled maintenance interval. Independently
query the actual official ICP Ledger balance of the certified receiving account;
cached funding observations do not establish the current payment balance.

Authenticate the current certificate with the actual IC root and named backend;
retain world/config/source identities, logical time, account/cannon/ball state,
credits, earned scores, receipts, source cursor, Index watermark, pending inputs,
current publication and the full retained catalog/chunks with exact hashes.
Record unfinished controller work and funding leases. Distinguish a legitimate
new Ledger/Index event from state loss; no synthetic input may repair a mismatch.

Require ample liquid headroom for installation, source/treasury callbacks and
transition work at the observed burn rate. Reserve needs 3T liquid to enter
Lifeline; Normal entry needs 40T and exits below 30T. These are policy boundaries,
not installation cost estimates. A funded lower tier is valid operation, but
cannot prove live Normal-speed performance. If funding is insufficient, stop
and report a user-owned top-up requirement. Never transfer funds, buy cycles or
alter freezing settings as automatic recovery.

## Ordered future actions, only after separate explicit authorization

1. Confirm all required exact-commit CI and sustained-observation gates, bundle
   checksums, artifact identities and the fresh preflight. Check the installed
   DFX asset-only command semantics before preparing an upload.
2. Pause autonomous **gameplay only** through the existing controller API;
   retain its exact run settings and unfinished work. Source reconciliation and
   the independent treasury continue. Capture a confirmed committed v4 snapshot,
   publications and pending-work baseline. Reconcile any concurrent source or
   treasury progress instead of assuming pause freezes all subsystems.
3. Upgrade **only the existing backend**, in upgrade mode, with the explicitly
   frozen normal.wasm and empty upgrade arguments. Never reinstall, reset,
   skip preservation hooks, use constructor init/world files, or deploy all
   canisters. Do not change the Ledger, Index, source configuration or controllers.
4. Before world activation, verify the installed hash, controllers and the
   unchanged committed 32×32 v4 world, publication and retained chunk bytes.
   Reconcile source/treasury progress and verify economic-state continuity.
   This separately evidences the Wasm upgrade. Stop on actual preservation failure.
5. Upload the complete frozen frontend asset set to the **existing observer**
   with the reviewed asset-only route. Verify every public asset/hash and genuine
   certified v4 browser rendering. Do not substitute a just-built asset directory.
6. Restore the captured gameplay run settings. Establish healthy source and
   treasury progress, then call `prepare_million_transition()` once. It derives
   the Ledger fence and Index watermark itself. Supply no replacement world,
   accounts, cursor, cutover height or rules identity. Poll
   `million_transition_status` until the actual fenced v4 inputs/work/strikes
   have drained and preparation is ready. Remain bounded; investigate errors or
   inadequate cycles rather than bypassing the fence.
7. Authenticate the **then-current** v4 publication and its actual journal head
   manifest. Record that manifest and all paid/economic/source/treasury state.
   Commit with `commit_million_transition(expected_previous_manifest)` using
   that exact manifest. A stale manifest is a stop/review condition. After an
   ambiguous response, inspect status/certificate first; only an exact retry of
   the same manifest is valid. Do not prepare a fresh state to bypass recovery.
8. Authenticate the resulting v8 subsequent-epoch checkpoint with DTR 0.14.
   Verify the predecessor link, explicit 1000×1000 v5 identity, migration mapping,
   unchanged earned scores/accounts/credits/receipts, source fence/cursor,
   retained historical publications/chunks and treasury plan/totals. Verify new
   source events and treasury callbacks through ordinary operation, with no new
   gameplay payment or manual CMC transfer.
9. Verify certified browser rendering, toroidal seams, cold reconnect, actual
   selected tier, supported rate, performance-limit flag, and independent
   produced/admitted/displayed progress. A low-cycle mode remains correctly
   selected even though Normal's target is 1 tick/s. Preserve all before/after
   evidence and stop rather than claiming a missing comparison passed.

The authenticated world transition is a second, separately evidenced operation;
installing the new Wasm alone must leave v4 active. Recovery uses the tested
durable state and exact retry semantics. Do not roll back to an unqualified old
module after v5 activation, or perform controller/financial operations to recover.
