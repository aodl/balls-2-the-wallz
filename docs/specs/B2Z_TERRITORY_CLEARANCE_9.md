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
