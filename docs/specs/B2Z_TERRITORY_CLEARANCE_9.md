# Territory clearance rules 9 — candidate, not activated

Rules 9 succeed exact rules 7 while preserving world schema 6, memo adapter 4,
existing economics, first-entry maximin spawn, physics and paid accounting.
Rules 8 remain reserved for experimental delegated-payment authorization. This
change neither imports nor enables that work. Future composition requires another
reviewed identity and explicit transition; a shared number does not imply compatibility.

A Move or additional New destination must have toroidal Chebyshev distance at
least four from every different non-neutral canonical player. Island/territory
labels are resolved to player identities first. Neutral cells, same-player
separate islands and unclaimed moving balls do not create exclusion. Dormant
owned territory remains enemy territory. A 7×7 neighborhood (offsets −3..3)
provides the exact bounded test, including both seams. For enemy `(0,0)`:

| Candidate | Distance | Clearance |
| --- | --- | --- |
| (3,0), (3,3), (997,0), (997,997) | 3 | Reject |
| (4,0), (4,4), (996,0) | 4 | Permit subject to other rules |

The ordinary Move/Build restrictions still apply. Explicit and implicit additional
New paths filter clearance; an implicit path cannot choose an unsafe site.
First Join remains automatic and uses existing farthest-entry rules. Fire and
Revive remain unchanged. Rejection reason is `ENEMY_TERRITORY_TOO_CLOSE`.
Rejected payment accounting retains the original semantics: no refunds, new
credits or altered historical receipts. Checks use actual processing-time ownership,
not the browser's earlier proposal or speculative future state.

## Identity and activation boundary

- Rules hash: `cfb882f7fb231214bac3df61e34a66ceb8c71e1216caabee899495c0910b2b70`.
- Configuration hash: `0567d064106d26a14791f9d07bd64a2e4f87b26789dbef7167b2ee7e96114153`.
- Unchanged schema: `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
- Policy source: `config/rules/v9-clearance.json`; generated configuration is
  `apps/b2z-observer/configuration-clearance.bin`.

The candidate normal host introduces authorized `prepare_clearance_transition`,
`clearance_transition_status` and `commit_clearance_transition(expected_manifest)`.
Preparation requires the exact v7 predecessor, paused healthy operation, existing
liquid headroom and no competing transition. It uses the established global Ledger
cutover/index watermark and account-history drain. Every pre-cutover admitted input
finishes under v7; no rule switch occurs within an admitted segment. Commit requires
the exact unchanged committed manifest and a drained source/journal boundary.
The authenticated epoch binds old/new identities, source anchor/cursor, Ledger
cutover, index completeness and identical old/new world hashes. Activation changes
no world bytes, balances, entities, deadlines, source adapter or memo grammar.
Repeated identical commit is idempotent; conflicting or superseded retry is rejected.
New publications use v9, while historical command replay retains original identity.

## Release sequence and rollback boundary

This document grants no production authority. Qualify the JS/native executor,
normal Wasm, upgrade/source/accounting boundaries, replay, certified browser and
installed disposable game before presenting artifacts for owner approval.

The usability frontend may be released first after its own six gates. It uses
legality from the certified active identity: v7 does not claim clearance enforcement;
v9 enables the new policy. A frontend release alone cannot activate the rule.
Deploy a v9-compatible frontend before separately authorizing the backend upgrade
and cutover. Keep existing paid state; never reinstall/reset or reindex inputs.

Before preparing the transition, the current audio frontend is a retained rollback
for v7. After v9 activation that old frontend intentionally cannot verify the new
identity. An after-cutover rollback must itself understand v9 and be qualified.
Likewise the old backend must not be blindly restored after writing the new
transition record or activating v9. Preserve the new root/epoch/history and use an
explicitly reviewed compatible recovery artifact or forward fix. Do not undo paid
history, reset source cursors, manufacture a reverse epoch or improvise refunds.

## Separately approvable production procedure (not executed by this task)

1. Obtain six substantive hosted PASS for the final source and approve the exact
   frontend inventory. Install only those frozen frontend assets using the existing
   assets-only operator route. Verify every served byte/header and certificate;
   confirm certified rules7 remains active and no four-cell enforcement is claimed.
   Retain the current audio74 rollback until any backend transition is prepared.
2. Seek a separate decision naming the normal backend Wasm and the rules9 activation.
   Before that decision, do not pause, install, prepare or commit anything on mainnet.
   Under later authorization, preserve the existing normal module, current RunConfig,
   certified publication/state/source cursor, account-history watermark, receipts,
   funding/accounting and verified identity. Confirm matching frontend recovery bytes.
3. Pause through the existing owner `pause_autonomous` operation; do not stop/reset
   the canister or alter settings. Upgrade the existing backend with the exact normal
   Wasm, mode **upgrade**, empty `()` post-upgrade argument. No constructor, reinstall,
   new canister or new source configuration is involved. Independently compare the
   preserved publication, world bytes, financial state and source cursor immediately
   after upgrade, before proceeding. A build is not this preservation proof.
4. Call owner `prepare_clearance_transition()`. Poll its authorized status until
   phase `ready` and the existing journal/source boundary is drained. Retain exact
   Ledger cutover/index evidence. Earlier admitted commands execute under rules7.
   Abort escalation on lifecycle/source errors; never clear errors or alter cursors
   merely to proceed. Preparation itself crosses the old-module rollback boundary.
5. Obtain the current authenticated committed manifest; call
   `commit_clearance_transition(expected_previous_manifest)` with that exact hash.
   A changed manifest requires re-observation, not relaxed comparison. Verify the
   epoch metadata commitment, old/new identity, identical world-state hash, source
   anchor/cursor and unchanged financial accounting. Verify rules9 configuration in
   both browser observation and read-only quote APIs before announcing enforcement.
6. Resume with the preserved RunConfig through existing `start_autonomous`; verify
   ordinary publication/observation recovery. Production payment tests require their
   own explicit authority; disposable valueless tests do not authorize real payments.

Stop on any mismatch. After preparation/activation use a qualified compatible
recovery artifact or forward fix; never restore a world snapshot, reverse paid
history, reset/reinstall, reindex a Ledger input or blindly restore the old module.
The installed disposable test pins the actual European predecessor module hash,
executes an old-rule payment on it, then proves upgrade and cutover preservation.
That proof does not authorize or replace fresh production observations and approval.
