# BTZ v6 playability — island occupancy clarification

This is the developing next rules identity. Production release 1 remains v5;
no v6 activation or production capacity claim is made by this document.
Historical v3/v4/v5 events retain their original interpretation.

The operator's latest clarification replaces launch-cannon ball attachment.
A ball belongs to its canonical funding player. Its firing cannon appears in
the purchase receipt, but supplies no ongoing ownership, pricing or lifecycle
link. Connected same-player territory is an island. Every cannon on an island
is active while any friendly ball occupies that island. All its cannons share
the same current ball pool. Enemy balls do not provide support.

A split is reconciled at the authoritative operation boundary. An island with
cannons but no friendly balls enters the ordinary zero-ball/dormant state:
release ordinary land, retain reflective cannon cells, start each newly dormant
cannon's 24 elapsed-hour deadline and preserve paid receipts/accrued credits.
Other ball-bearing islands of the same player remain intact. A visiting friendly
ball keeps its current island active, regardless of where it was fired. No
special cancellation exception based on a ball's launcher is required.
The existing mutual-destruction rule still cancels an ownership-transfer
proposal that would remove a defending live occupant: pair one attacker with
one eligible defender; unpaired balls survive the cancelled transfer. An
unanchored ball-bearing component is reported to that capture resolution,
never silently deleted by island reconciliation.

Cell storage uses connected-island labels mapped explicitly to funding players.
These labels and their allocation counter are independent of cannon IDs.
Migration initially preserves existing numeric labels and all ball/entity/value
fields, then adds the mapping. Topology updates maintain the connected-label
invariant through bounded resumable row-span work. Dormant anchor regrouping
uses only the bounded cannon set; elapsed expiry does not scan the million-cell
board or manufacture simulation ticks or Ledger positions.

Firing prices use the selected cannon's **current island ball count**:
`10,000,000 e8s × max(1, n)²`, summed sequentially for the requested quantity.
Two cannons on one island see the same price. Disconnected islands use their
own counts. One existing ball gives 0.5 ICP for two more, or 1.4 ICP for three.
A first 1.5 ICP purchase still creates one cannon with three balls in total.
Cannon prices remain account-wide retained-count scaling: 1, 4, 9 ICP, including
one ball. Surplus at an additional cannon follows the resulting island count:
with one existing island ball, a second cannon and two surplus balls cost
`4 + 0.4 + 0.9 = 5.3 ICP`. Quotes are not reservations; partial-fill/remainder
receipts retain the existing non-refundable policy and exclude the Ledger fee.

The former proposed per-cannon ball purchase ceiling becomes an island
admission ceiling, currently drafted as 64. Merging islands never deletes
existing balls to enforce that ceiling; further purchases wait until there is
room. The global draft 512-ball/128-cannon limits and 16 retained cannons per
player remain unqualified engineering targets. The final supported limits must
come from the bounded admission screen. Moves cannot leave a ball-bearing island
without its last cannon. Dormant movement remains disallowed until revival.

The pure Rust and JS interpreters now execute targeted/batched commands and
atomic capture proposals. Work continuations preserve payment totals and item
prices; incomplete proposals cannot change the committed world. Captures inspect
current occupants before transfer: a direct opposing occupant takes priority,
otherwise the lowest live unanchored defender is paired with the attacker. Both
die and the whole proposed transfer is cancelled. Unpaired balls survive.
Ownership operations reconstruct compact storage independently, including empty
island pruning, split labels and friendly-island merges. Discovering that all
adjacent seeds remain connected retains the early-connectivity shortcut.

A logical segment's result remains unavailable until an explicit completion-time
fact is supplied. That fact stamps new dormant deadlines and is included in the
authenticated event output for independent replay. The host must supply IC time;
the pure kernel and reference have no clock. Idle expiry continues to require a
separate zero-logical-time application checkpoint, never fabricated Ledger input.

Synthetic cross-language fixtures are development evidence. IC-host activation,
completion-time plumbing and expiry scheduling, public APIs, dual-version browser
replay and the consolidated installed qualification remain required before the
authorised second release. No v6 state or capacity has been deployed.
