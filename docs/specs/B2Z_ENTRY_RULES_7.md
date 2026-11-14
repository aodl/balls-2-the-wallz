# B2Z entry rules 7 — farthest safe first cannon

Status: implementation candidate; not activated in production. The existing
rules-v6 arena is fully claimed and rejects first joins because it searches only
neutral 3×3 patches. The operator has requested entry regardless of territory colour.

## Placement rule

For a funding account with no retained cannon, choose a legal 3×3 starting patch
whose **centre maximises the squared distance to its nearest existing cannon**.
Distance uses the shortest path on each axis of the 1000×1000 torus:
`min(abs(dx),1000-abs(dx))² + min(abs(dy),1000-abs(dy))²`.
All retained cannons, including dormant anchors, participate. A single cannon
therefore gives an antipodal centre 500 cells away on each axis when legal.
Ties choose the lowest row-major centre cell. With no cannons, choose cell zero.
There is no wall-clock randomness, account-ranking preference or dependence on
territory colour. Current paid inputs execute in their existing canonical order.

A legal patch contains no cannon footprint or live ball, including exact ball
positions on its closed edges/corners and toroidal seams. Removing its cells must
leave each affected existing island connected. Existing balls, cannon anchors,
credits and deadlines survive. A candidate that would cut a bridge is skipped;
it cannot silently clear disconnected territory or delete a defender. The search
then considers the next most distant legal location. Ordinary capacity and price
checks still apply. A quote is not a reservation or a guarantee of future legality.

The first payment acquires exactly the nine seed cells at placement time, even if
another player owns them. The spawn event records the prior owners and ownership
operations. Later ordinary physics and capture rules may change territory. No
additional region is granted, and no other player's accrued score is confiscated.
The existing new-cannon/first-ball price, batch surplus, positive recovery price,
fees, retained remainder policy and account authority remain unchanged.
Additional retained cannons still require legal cardinal adjacency; this release
does not grant arbitrary long-distance additional-cannon placement.

## Bounded implementation and compatibility

Rust and independent JS use exact integer maximin search with rectangular upper
bounds and a depth-first stack of at most 32 rectangles. Rectangles that cannot
beat the best legal point are pruned. Each step checks only the bounded cannon set;
no million-cell candidate list, sort or flat flood array is allocated. Candidate
connectivity reuses the existing resumable row-span flood, with isolated proposals
and early proof when all cells bordering the removed patch reconnect. Search and
proposal state survive canonical continuation save/restore.

This is **rules 7 with world schema 6**. The canonical world representation,
physics, lifecycle events, memo adapter 4, prices, capacities and schema commitment
are unchanged. A distinct rules hash (`B2Z_ENTRY_RULES_07`) and configuration include
`rules_version:7` and the exact first-entry policy. Historical rules-v6 cursors,
payments and publications keep their original neutral-only meaning. The client
accepts the exact old and new identity tuples, never a mixture of their fields.
DTR remains pinned and game-independent; no DTR source changes are needed.

## Authenticated activation and preservation

The normal code upgrade preserves the existing paid world and unfinished work.
Only the new first-entry rule activates at the subsequent authenticated epoch.
The application reuses its existing Ledger/Index cutover worker, paused gameplay
and old-input drain pattern. New controller-only methods are
`prepare_entry_transition`, `entry_transition_status` and
`commit_entry_transition(expected_previous_manifest)`.

Preparation requires the actual rules-v6 identity and memo adapter 4. Commit
requires an error-free paused runtime, the measured source fence, no unfinished
stage/input/strike/lifecycle barrier, matching source/inbox cursors and the exact
current predecessor manifest. Transition output preserves the complete world
bytes, accrued value and deadlines. Source identity, account, cursor/anchor and
financial state remain intact; the adapter does not change. No Ledger position or
elapsed-time fact is manufactured. Matching retries are idempotent; conflicting
predecessors fail. Existing lifecycle maintenance and evidence remain available.

Publish the compatible client before activation and verify its old-rule view.
After activation, verify the new authenticated configuration and source continuity,
then resume the captured gameplay settings. No reinstall, receiving-account reset,
controller/subnet change, payment replay or automatic downgrade is permitted.
This local preparation performs no real-money gameplay or production backend update.

## Clearance successor boundary

The [rules-9 candidate](B2Z_TERRITORY_CLEARANCE_9.md) preserves this exact first-Join
squared-Euclidean maximin metric and introduces a different, explicitly scoped
Chebyshev-distance restriction for Move/additional New. These are distinct actions,
not conflicting definitions of entry distance. v7 history has no retroactive
four-cell exclusion. Activate only through the separately qualified rules-only epoch.
