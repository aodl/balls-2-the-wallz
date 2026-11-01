# B2Z first live player payment — PASS

The operator funded only `b2z-agent-expander` with 2 ICP and explicitly requested
this account be tried before funding the other three. The operator delegated the
aftermath choice; the small population is left running under ordinary conservation.
No full multi-account spending campaign was started.

## Exact expenditure and outcome

- Player funding account:
  `fe4db8b522fe596c4ec90677de13a3cc2049e92c513beb614880a8b149e9c383`.
- One immutable action: `New { angle:0, quantity:2, cell:none }`, text `NEW 0 2`,
  memo bytes `c6000002ffffff00`.
- Game payment **1.1 ICP**; official Ledger fee **0.0001 ICP**.
- **Total spent 1.1001 ICP; remaining player balance 0.8999 ICP.**
- Official ICP Ledger block **39,964,703**.
- Authoritative result **applied, 2/2 balls, cannon #5, zero retained remainder**.
  Per-item prices are 1 ICP for the cannon/first ball and 0.1 ICP for the next ball.
- Certified receipt publication **81392**, logical time **135543**, epoch index 4
  `4fb7adbb6e71fa4b0333988167d5e13c1a41c14173f154cdba1aafba9c0cd7a4`.
- Receipt/state reference root:
  `9e4d3a07b00bbfb219447c66f7c54926bfad51941a3a3bec552ffb6123aa0db2`.
- Source cursor advanced to **39,964,704**, following this genuine incoming
  payment. No synthetic Ledger position or history reset was used.

The pre-existing world was fully coloured. The new authenticated entry rule
admitted the player without requiring a neutral patch. A fresh post-test snapshot
at head 81400 shows the account owning cannon #5 and two live balls.
[Authoritative result](result.json) · [Fresh authenticated state](restart-and-current-state.json).

## Complete acceptance path

**PASS:** ordinary player dfx signature → official Ledger acceptance → official
Index/source reconciliation → authenticated authoritative receipt → same-page
browser presentation. The exact Index record matches payer, recipient, amount,
fee, memo and immutable creation timestamp, with one matching transaction.
The player's balance decline equals the journaled full cost exactly.
[Ledger/Index reconciliation](index-reconciliation.json).

The existing browser observed the genuine receipt **5.833 seconds** after the
Ledger-accepted signal, then the new cannon on its verified buffered display
**20.059 seconds** later (about 25.892 seconds total). Unlike the earlier local
upper-bound measurement, the visible timestamp is taken immediately after the
selected-cannon/rendered-logical-time assertions, before screenshots.
There were **zero reloads/resyncs/page errors**. One genuine stale certified
response (head 81392 after accepted head 81393) was discarded; its warning
recovered once, the accepted head stayed monotonic and no active error remained.
This is retained in diagnostics, not hidden as an error-free transport claim.
[Timings](timings.json) · [Before](before-desktop.png) ·
[After desktop](after-desktop.png) · [After mobile](after-mobile.png).

**PASS:** restart independently re-verifies the saved receipt certificate,
predecessor linkage and event commitment. The small durable receipt proof survives
on-chain retention advancement. [Reviewed receipt proof](receipt-proof.json).

## Narrow integration fixes and executable controls

Signer tooling source `c7ddf8e` adds a trusted-launch, per-command acknowledgement
for the explicitly authorized plaintext ordinary player identity. A read-only
probe first reproduced dfx's `mainnet_plaintext_identity` refusal; the corrected
read-only fee probe passes. It never reads/exports keys and does not make plaintext
storage secure. The warning is not inherited globally or controllable through
policy JSON. The player remains outside the backend controller set.

The smoke policy uses a new journal, only Expander in `approved_player_aliases`,
only New actions, one outstanding action, one cannon/two balls, and a hard
**1.1001 ICP aggregate/per-action ceiling including fees**. The signer accepts
only Expander. Before dispatch, SQLite durably reserves the exact amount, fee,
memo, account, destination, plan hash and immutable creation timestamp. Its
post-test emergency stop is persistent. No further payment, duplicate retry,
refund, top-up or transfer to another destination was executed. All four player
identities remain a public catalog; the other three were not authorized to sign.

**PASS:** 25 focused executor tests, including the single-account exclusion,
per-command warning scope, budgets, ambiguity/restart and duplicate prevention.
The actual mainnet test sent exactly one transaction, with no induced failures or
deliberate duplicate submission. The earlier four-identity valueless installed
Ledger/source tests remain applicable within their documented scope.
No production backend, frontend or rules update was needed for these local
signer/orchestration corrections. Remote Git/CI for the new local tooling commit
has not been run; publication remains operator-owned.

## Next boundary

The first live payment integration works, so the remaining three accounts can be
funded. Funding does not automatically start more purchases. The **1.1001 ICP
already spent must count toward any previously proposed 5 ICP pilot budget**;
only 3.8999 ICP of that envelope would remain. Any next approved campaign must
carry that expenditure into its executable limits rather than reset it away.
No unresolved transaction remains. The single-payment test is stopped; the
cannon/balls keep running and consuming backend cycles under conservation.

This proves the paid join/receipt/presentation path, not strategic balance or
long-running reliability with four agents. Backend cycle cost per player action
and future-population cost were not isolated in this short test. Further local
reproductions and scoped fixes can continue; live spending and authoritative
rule/backend changes keep their existing authorization boundaries.
