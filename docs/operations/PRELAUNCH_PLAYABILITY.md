# BTZ pre-launch releases

The release branch starts at `ca809caeaf0014d5ecb27bab05d8be78eccfd282`, which
contains the deployed A2 lineage and the authenticated stale-observation recovery.
The historical paired A0/A2 delivery FAIL and interrupted attempts remain unchanged.
The current backend is the existing fiduciary canister; no constructor, transfer,
controller change or subnet change is part of this release.

## Release 1: conservation and observer

This release preserves world v5, its paid-v8 history and the A2 codec/cache. It
changes operational policy and presentation, without a game-rules transition.
Liquid-cycle entry/exit thresholds in T cycles are Normal 40/30, Cruise 30/24,
Economy 20/16, Steady 15/12, Conserve 5/4, Survival 3.5/3 and Lifeline 3/2.5.
Rates remain 1, .75, .5, .3, .2, .1 and .05 logical ticks/s. Existing hysteresis,
Index floor, protected reserve and performance limiting remain in force. The
protected reserve is already reflected in the policy, not subtracted again.

The observer identifies a declared ICP account locally; it does not log in,
prove control, connect a wallet or send transactions. A principal and 32-byte
subaccount derive the standard SHA-224/CRC32 AccountIdentifier. The versioned
network/backend preference stores only that declaration and selected cannon.
Colours derive from authenticated funding-account bytes. A declaration cannot
change the authoritative paying account. Current v5 still allows one cannon per
account and one ball per legacy payment; the versioned purchase release is separate.

The action card is a board overlay. Quotes refresh on verified state/aim/action
changes and are independently revalidated before copying. A confirmed receipt is
shown separately from buffered presentation. The optional Show confirmed state
button moves presentation forward to the already authenticated snapshot; it does
not change the monotonic accepted head, camera, certificate path or game state.
A known operator pause drains the finite verified remainder instead of waiting
for a startup buffer that the paused producer cannot fill. It resumes the ordinary
startup policy when production resumes. New own cannons are located when they enter presentation; normal publications do
not reset the camera. Overview uses CSS-pixel coverage on both axes; the minimap
shows the whole world. Bodies retain their cell proportions.

`runtime_health` is a bounded public operational query, not certified gameplay.
Samples are taken by existing callbacks at most every 15 seconds, retained for
five minutes/21 samples, and require at least a minute of observations. The UI
refreshes on a 15-second cadence. The value is total-balance net decline, not a
claim of gross billed cycles or a runway forecast. Liquid balance and reservation
gap are separate. Positive balance movements, known treasury credits and clock
discontinuities restart the rate; upgrades restart the meter. Stale or insufficient
samples show Measuring/Unavailable. Gameplay remains independently certified.
The normal artifact includes its generated, checked public `candid:service`.

Event Horizon stays disabled and the independent Index fallback stays 60 seconds.
The canonical EH canister did not publish accessible `candid:service` in the
read-only check; no verified relevant subscription/cadence-health source is
available. Repository HEAD is not deployed-ABI evidence. No external deployment,
subscription purchase or invented cadence-health method is used. The ICRC Index
poke PR is still an unmerged design reference, not a runtime dependency.

## Qualification and installation boundary

Focused tests cover authentic stale certificates and persistent/invalid/conflicting
responses, ICP account derivation/storage, deterministic colours, camera coverage,
conservation boundaries, health resets and bounded sampling. Disposable installed
Ledger/Index/browser tests must show receipts AND rendered join/fire/move without
navigation, then authenticated reconnect and negative certificate/configuration
checks. The exact normal artifact must preserve paid-v8 state, unfinished work,
retained bytes, source and pending treasury recovery from the frozen A2 predecessor.
The ordinary six substantive CI jobs must pass before deployment.

Mainnet procedure: rehash frozen normal module/assets; authenticate current module,
both existing controllers and 34-node fiduciary placement; measure liquid funds
against the protected reserve plus bounded upgrade/recovery cost; capture source,
finance and certified history; pause autonomous gameplay only; install once in
upgrade mode with empty arguments; authenticate paid/source/finance preservation;
upload frozen observer assets; resume the captured run configuration; observe
real publication and operational health. Ambiguous updates require authenticated
reconciliation before any further update. There is no automatic reinstall or
rollback. The MCP discovery opt-in remains inactive pending specific operator
acceptance of the external terms; ordinary public queries need no such opt-in.

Release 2 will separately version the requested purchases, shared ownership,
dormancy/time facts and capture outcomes. Those semantics are not active in v5.
