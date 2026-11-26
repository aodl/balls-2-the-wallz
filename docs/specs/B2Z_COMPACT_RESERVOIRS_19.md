# Rules19 compact Reservoir state

Rules19 changes the canonical state encoding to Schema11. Adapter12 and its `BTZPAY09` payment envelope continue to carry the same Ledger facts. The Rules18 gameplay policy, one-tick segments, terrain and ownership, authorisation registry, tariff schedule and browser renderer carry forward through the existing authenticated transition.

## Canonical occupancy

For at most 14,000 occupied runs, `reservoir_ranges` contains ascending pairs of unsigned tile indices. Each pair is a half-open interval `[start,end)` within the board's cell count. The empty set is `[]`. Overlapping or touching intervals, empty ranges, duplicates, malformed integers and a second occupancy field are invalid. Adjacent occupied cells always merge into one interval. A binary search finds a cell and insertion merges adjacent intervals.

For more than 14,000 runs the unique encoding is the historical trimmed lowercase bitmap in `reservoirs`. A fragmented world can therefore occupy the full million-cell domain within the existing bitmap byte bound. Compact ranges have a bounded worst-case JSON length below the 250,000-byte bitmap limit. The cutoff chooses an encoding. A purchase that crosses it preserves every occupied tile. The existing world and coordinator limits apply independently.

The four paid placements become `[[998000,998002],[999000,999002]]`. Their positions still cross the arena seam in presentation. The observer validates the schema and builds the same verified occupancy set for the existing GPU texture, excavation, water animation and shared-edge renderer.

## Entropy and replay

Schema11 ordinary checkpoints validate and commit ranges directly. Authorized explicit Cannon construction and legacy angle inputs that can initiate a join still use the exact Rules18 spawn preimage. The kernel projects the current ranges back to the historical bitmap for that preimage and applies the original schedule and authorisation field exclusions. Ordered inputs use the same gameplay projection. Empty ticks and payments that cannot spawn a Cannon avoid that projection. Execution uses consensus elapsed metadata as before.

Historical publications and their manifests retain their exact bytes. The first Rules19 publication is a zero-time authenticated schema transition with the new rules, schema and configuration identities. Future publications use Schema11 state, event and score version tags. A future tariff snapshot references the actual committed predecessor hash in its epoch. Semantic comparison across encodings maps that authenticated reference and the version tags while requiring the effective tariff and all gameplay and receipt facts to agree.

## Historical transition and current recovery

For the original activation, the controller pauses gameplay, prepares `compact_reservoir`, lets the existing Ledger/Index fence and ordered-input drain finish, and commits using the exact predecessor manifest. An open admission tier and the existing transition headroom are required. The transition carries the same source identity, cursor and anchor and retains the exact previous publication and artifacts under the existing history policy. An old module can be reinstalled before durable preparation while the state is Schema10. Preparation introduces a durable record that the old module must reject. After preparation, recovery uses a module that understands that record and both schemas. A frontend that verifies both schemas is required before activation.

[Application contract](B2Z_APPLICATION.md) · [Operator procedure](../operations/S14_OPERATOR.md)

The European compact epoch is already active. The installed capped profile
and its compatible public Rules19 recovery pair use the same Schema11 and
Adapter12. Use the [current artifact inventory](../operations/PRODUCTION_RELEASES.md)
and [same-canister procedure](../operations/B2Z_PRELAUNCH_TRICKLE.md).
