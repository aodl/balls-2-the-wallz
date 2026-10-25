# Million-cell candidate: future deployment preflight and activation order

This is a prepared procedure, **not authorization to execute it**. The current
qualification task performs no mainnet mutation, v5 activation, merge to master,
financial action or controller change. Historical statements about an authorized
"current task" in S14_OPERATOR.md do not authorize this candidate.

## Identity and evidence to carry forward

- Published candidate/evidence commit: `ae3ef1ce38cee8a6b33b051c924a66d9bcba3dbf`.
  Its tested implementation is `62ace9f718d48e18793e7ddbd91bd7f5cd020ca9`;
  the candidate adds status/evidence documents. Exact-candidate CI run:
  [40144120473](https://github.com/aodl/balls-2-the-wallz/actions/runs/40144120473).
  Record actual final conclusions; an informational inventory job is not approval.
- The extended observation has a separate harness commit and local result.
  Record that SHA and its own CI outcome separately. Old CI never qualifies a
  changed harness or product source. Remote publication remains user-owned.
- Frozen normal Wasm SHA-256:
  `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`.
- Frozen production app SHA-256:
  `3c593c54fe09997eabada19d3aee02f2cc7c39d1d5a0baea59b3e3516f61b732`.
  Verify **every** frontend file against its build manifest, not just the app.
- DTR Rust/npm revision: `e1bfcf25071d11190d14f461288e12a21ca26cf8`;
  reviewed 0.14.0 archive SHA-256:
  `ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`.
- Keep original candidate verification.json unchanged. A later report describes
  CI and observation results without rewriting its historical provenance.
  Checkout-dependent Cargo/Rust binary hashes do not authorize substituting a
  CI binary or a fresh rebuild for the frozen, installed-tested artifact.

The extended timing gate uses the real sandboxed observer, normal rendering,
screenshots, certified wire replies and dense raw telemetry, without optional
software video encoding. The original short recorded cases remain separate.
The video-on 900-second run failed and remains recorded as FAIL; the current
review report must state the video-free gate's actual outcome independently.

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
