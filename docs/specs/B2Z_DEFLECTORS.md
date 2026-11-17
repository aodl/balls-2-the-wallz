# Four-direction boundary Deflector — provisional Rules12 candidate

This specification supersedes the abandoned arbitrary-angle/interior-midpoint
proposal. Its negative numerical evidence remains in the historical graphite
report and [superseded specification](../../evidence/B2Z/graphite-deflectors/boundary-deflector/SUPERSEDED_MIDPOINT_SPEC.md).
Candidate implementation is not production activation or completed qualification.
The paid European Rules7 world and both qualified predecessor freezes are protected.

## Direction and contact

A Deflector is a blocked tile, separate from cannon IDs/capacity and never a
territory anchor, ball source or claimant. It has one immutable orientation:
NE, SE, SW or NW. Use canonical positive-x east, positive-y south coordinates.
Front faces are NE:N/E, SE:S/E, SW:S/W, NW:N/W. Other faces are rear.
Front selects the arrow vector; rear selects its opposite. Incoming velocity
only determines the genuine contacted face, exact position and time. Both
outgoing components have canonical magnitude22627 at nominal speed32000.

**Coordinate conflict resolved explicitly in the candidate:** the owner brief's
binary labels would point in the wrong directions under the existing heading
helper. Named directions and the normative front-face table take precedence:
NE=57344, SE=8192, SW=24576, NW=40960. Cannon precision/math are unchanged. This
mapping is pinned in the new candidate configuration, requiring owner review.

Use the existing boundary-crossing scheduler, occupancy classification, intent
ordering and blocked-vertex response. Keep the open-space source cell on impact.
The exact position is continuous; no centre teleport, interior event, artificial
pause or speed increase. A simultaneous two-axis vertex uses the existing blocked
vertex response with **no front/rear claim**. Tangencies do not attempt entry.
Intent structure IDs are revalidated after equal-time topology changes. Existing
canonical player/ball event order, strike cancellation/expiry and topology order
remain intact; no secondary collision scheduler is introduced.

## Numerical model and provisional progress policy

World schema7 stores `x0`, `y0` as integer numerators with a shared positive BigInt
`den`; position is numerator/den + integer velocity*time. Reduce all three by their
common gcd. Existing integer balls migrate exactly with den1. Bound den<=65536,
abs(numerator)<=6553600000000000000, logical time<=1000000000. Fractional balls
must have both component magnitudes22627. No host floating point affects execution.
See the [proof and executed stress](../../evidence/B2Z/graphite-deflectors/boundary-deflector/NUMERICAL_PROOF.md).

A tight adjacent arrangement permits195494 contacts in one tick. The rejected
rearm/reflection experiment violated the required contact law and is retained only
as historical negative research. The candidate instead requires **toroidal
Chebyshev tile distance>=2 between Deflectors**. Adjacent cardinal/diagonal sites,
including seams, reject as `DEFLECTOR_TOO_CLOSE`. This provisional placement policy
requires owner approval. Every accepted ordinary impact always redirects according
to orientation and face; there is no cooldown or skipped/mirror response.

The candidate accepts at most **one logical tick per publication**. Prepare/commit
and subsequent start configuration reject larger allowances instead of changing
operating policy. Historical limits remain unchanged. The exact decimal fixed-slot
schema7 encoding fits the measured64-ball maximum-horizon corridor at566136 event
bytes and4161 events; the legal diamond uses385333 bytes and2817 events. Full
installed/capacity and financial qualification remain distinct requirements.

## State, lifecycle and processing-time placement

`deflectors` are cell-sorted `{id, owner, cell, orientation}` with monotonically
increasing `next_deflector_id`. Owner is the canonical player, never an island
label. Binary occupancy lookup is bounded by log2(256). Placement requires an
owned active island, no cannon/Deflector/inclusive live-ball closure and Rules11's
7x7 toroidal Chebyshev enemy exclusion (distance0–3 invalid,4 permitted). Different
same-player islands and neutral cells are not enemies. Dormant enemy land remains
enemy land. Move and cannon construction also reject occupied Deflector cells.
A structure is removed when its tile genuinely ceases to belong to its owner,
including pruning/lifecycle expiry. It never keeps an otherwise empty island alive.

Provisional price10000000e8s (0.1ICP),16/player,256/world; no sell/move/rotate/refund.
These are candidate policy, not approved live economics. Reject with established
retained-payment accounting: amount_used0 and remainder=received amount, no credit
or automatic refund. Replayed source positions cannot duplicate structures.
First Join, Fire/Revive, ordinary cannon prices and Rules11 War Cry remain unchanged.

## Memo, source and successful presentation

Adapter7 accepts only canonical `DEFLECT <cell> <NE|SE|SW|NW>` (cell0–999999,
no leading zeros except0). No arbitrary angle, quantity or War Cry is accepted.
Eight-byte command: b7,cell24,orientation0–3,three reserved zero bytes.
BTZPAY04 authenticates account32,amountu64,command8,cry length and exact bounded
UTF-8. Existing FIRE/NEW/MOVE grammar and successful-launch War Cry association are
retained. Malformed paid commands receive deterministic rejection; present malformed
text never falls back to numeric interpretation. Historical adapters and Rules7,
9,10,11 identities/receipts/sealed publications retain their original interpretation.
No delegated spender support or ICRC2 is enabled.

Verified raw motion events carry exact trajectory and explicit contact metadata.
Animation projection preserves rational tracks and genuine turn points. Structures
and turns become visible only after successful authenticated event application.
No extra Deflector audio, predicted collision or locally fabricated purchase.

## Frontend and upgrade boundary

The contextual toolbar is Focus · Fire · Move · Build cannon · Build deflector ·
Close only under the exact authenticated supporting identity. Build cannon retains
its cube; Build deflector has a distinct wedge icon and accessible name. Unsupported
identities expose no actionable DEFLECT memo. No local feature flag grants authority.

A cooperative cached search proposes a legal owned tile. No legal site disables the
action. The owner-coloured graphite base stays fixed; its upper wedge snaps to one
of four directions. Native board aiming and four44px directional buttons share one
orientation model. The same measured floating-editor/dock instance reserves its
space, retains focus/gesture locks and excludes aim/pan/pinch input. No quantity or
War Cry editor appears for this nonlaunch action. Preserve the approved read-only
panel, `Deflect & Pay`, full-value copying, payer reassociation and frozen Update/Keep.
The chosen-tile retained-payment warning and active clearance risk remain explicit.

Direct Rules11→12 uses controller-only prepare/drain/commit, exact predecessor and
current manifest, official Index/ledger watermark, completed old batches, healthy
source/resources and unchanged operating configuration. Schema6→7 adds empty
structures and den1; projection back to6 must exactly match predecessor state bytes.
Metadata version8 binds source/cursor, ledger cutover, adapter6→7, old/new identity,
state hashes and preserved predecessor projection. Idempotent identical commits;
stale/conflicting manifests fail. No production operation is authorised here.
The new durable preparation record is already incompatible with the old module's
strict root decoder. From preparation onward use forward-compatible recovery;
after epoch commit old frontends are also incompatible rollback targets. Use a
qualified compatible frontend first and state-preserving forward recovery, never
reinstall/reset/reindex paid history or reverse the authenticated epoch.
