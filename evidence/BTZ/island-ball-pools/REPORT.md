# Player-owned balls and island-based activity — local implementation

The operator's clarification supersedes launch-cannon attachment in the draft v6
rules. Balls now carry a funding-player owner. Independent connected-island
labels map compact cell storage to that player. Pricing, capacity admission,
activity and revival use the selected cannon's current island pool. Receipts
can identify a firing cannon without establishing an ongoing ownership link.

The Rust and JS split jobs discover connected row spans, assign island labels
and reconcile empty components resumably. A bridge-cut fixture keeps the
ball-bearing side active and makes the ball-free side dormant, releasing its
ordinary cells. Mirrored cases place balls on the opposite side or both sides.
Snapshots resume through canonical serialization; final states and dormancy
fences match across implementations. A visiting surviving ball keeps every
cannon on its current island active. Unanchored live occupants are reported to
capture pairing; reconciliation never silently removes them. Full capture
orchestration is still an integration task.

A uniform million-cell island takes fewer than 3,000 bounded row-span work units,
without a million-cell flood array. This is a pure algorithm test, not a cycle,
capacity, browser-delivery or installed-canister qualification. Draft limits
remain unqualified. The renamed island purchase ceiling prevents new launches
into a full pool; it does not evict existing balls after island mergers.
Zero-ball revival costs a positive price and reactivates all connected cannons,
cancelling their old expiry generations. Marker expiry releases its empty cell
and regroups the remaining bounded marker set; it never ages by logical ticks.

All 41 native tests, format and strict Clippy pass. The source wrapper's 1,478 JS
and 185 Python tests and other checks pass. Its overall result remains FAIL
because the newly added spec filename used BTZ; renaming only that new file to
the repository B2Z prefix makes the focused naming audit PASS. Original failure
logs remain untouched. Only unpublished draft-v6 fixtures were regenerated;
historical v3/v4/v5 world/event/price goldens retain their original bytes.

The new rules are **not deployed or fully qualified**. The v6 constructor remains
closed until command/capture orchestration, host activation/time/expiry handling,
independent installed replay and browser/API integration are ready. No long
qualification was repeated. Fresh controller queries confirm healthy running
production, Survival 0.1 ticks/s, 3,855,942,438,226 liquid / 4,004,119,660,996 total
cycles, zero pending source records and Idle treasury. No pause, install,
funding, frontend upload, controller/subnet change or remote Git operation ran.
