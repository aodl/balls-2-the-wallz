# Proposed Rules20 successor

Rules19 remains the active ruleset. The proposed successor requires an
authenticated epoch and an independently verified state-preserving transition.
This branch defines and tests bounded pricing, grace-prefix selection,
checkerboard contact and one-traversal construction exceptions. It includes
a Schema11-to-12 migration for authorization rows and the tariff formula
boundary. A versioned Rules20/Schema12 configuration and identity select the
migrated state in both independent cursors. The host now implements an
authenticated, source-fenced zero-time cutover from the exact Rules19
predecessor. Production remains Rules19; the successor is not qualified for
installation.

The exact draft identity is rules hash
`4e5ddc6f2108115e567894c5827047d76915d84c74d797f951a518390d62cc21`,
schema hash
`efedaa4a8350dcc126369de4c911c564abc0b61b79d64ddb7a18e43788958778`,
and configuration hash
`cc9a7925c7818976750738aa614d2df6d2972aa5efe57080c4fa021832912f4c`.
The payment adapter remains Adapter12/BTZPAY09. A no-input successor segment
from a migrated paid fixture produced identical state, event and score
SHA-256 identities in Rust and JavaScript, including cursor restoration.
A disposable authenticated epoch rehearsal preserved the predecessor paid
world and public bytes, then applied and independently replayed three genuine
Ledger/Index inputs: a Join, a digit-leading authorization grant and a later
unrelated payment. This is focused evidence, not complete release qualification.

## Tariff inputs and amounts

The existing daily observation still counts unique canonical funding accounts
with retained Cannons, including dormant ones. Store the applicable
population and the tariff formula identity. All population-priced actions use
the authenticated tariff selected by immutable Ledger block time. The
previous tariff during the existing one-hour grace window retains its own
formula identity, including a linear Rules17–19 tariff at activation. Compare
affordable prefixes even when the newer price is unrepresentable. Existing
tie-breaking and fixed-price actions retain their prior meaning.

The Schema12 draft stores `economy_formula_start_ns` as an exact UTC midnight
boundary, in addition to the existing authenticated daily population
schedule. It is the effective boundary of the first tariff observed after
the successor epoch. Earlier tariff snapshots keep the historical linear
formula; successor snapshots at or after this boundary use the symbolic
exponential formula. At a grace boundary, the active and previous snapshot
each carry their own formula meaning. The value is computed from the
predecessor committed clock during migration, not from a browser clock. This
field is encoded identically by the Rust and JavaScript Schema12 migrations.
The successor payment continuation now carries a tagged
`tariff20` record containing immutable Ledger block time and the selected
linear multiplier or exponential population. Rules17–19 retain their original
numeric tariff and receipt fields. The successor receipt adds `price_tariff`
and the host quote path evaluates the current symbolic tariff. Activation
requires the separately prepared and committed authenticated host epoch.

For population at most 1,000 the multiplier is `max(1, population)`. Above
1,000 it is `1000 × 2^(population-1000)`. Evaluate the applicable base amount
and personal count before the bounded binary shift. The representable
unsigned Ledger amount supplies the limit. An unrepresentable item is
unavailable under that tariff. A fixed action or an eligible older-tariff
prefix is independently evaluable. Controls should disclose the
unrepresentable price and emit no payment packet for it.

The independent scalar implementations agree on the following examples for
the first Cannon, with the included Ball and before wallet fees.

| Applicable population | Exact first Cannon price |
| ---: | ---: |
| 999 | 9.99 ICP |
| 1,000 | 10 ICP |
| 1,001 | 20 ICP |
| 1,002 | 40 ICP |
| 1,010 | 10,240 ICP |
| 1,034 | 171,798,691,840 ICP |
| 1,035 | Unrepresentable |

The shared exact fixtures cover all three base amounts, personal inventories,
Ledger limits, up to one million world accounts, and maximum encoded counts.
The successor Cannon and Diverter planning functions now accept either a
historical linear tariff or a symbolic exponential tariff. They use exact
bounded prices and fail closed when a first item exceeds the Ledger amount.
The Rust and JavaScript planners now select the formula using Ledger block
time, compare valid grace prefixes and carry the formula through Ball batch
continuation. Focused tests cover a linear grace payment despite an
unrepresentable current price, partial Ball purchase and durable tariff
roundtrip. The authenticated identity, three genuine paid inputs and
independent successor replay have focused disposable coverage. High-population
paid admission, interruption and complete hosted qualification remain gates.
Existing tariff bytes remain historical source inputs.

The prepared-purchase vectors compare independent current and previous tariffs.
They include a cheaper current tariff after a population decline, exact tie
priority, partial Ball fulfilment, and a representable linear tariff while the
current exponential tariff overflows. The caller still has to supply the actual
authenticated grace window, legal purchase and representational capacity.

## Authoritative gameplay acceptance boundary

Keep explicit new Cannon and Diverter construction separate from relocation
and automatic Join. The exception belongs to each existing Ball and exact
new structure generation during their first contiguous passage. Evaluate
entry, tangency, exit and seams using exact rational position and canonical
direction. Carry active exceptions across checkpoints and interrupted work
when they cannot be derived. Retire them on exit, relocation or destruction.
An epoch transition starts with no exceptions for historical structures.

The provisional Schema12 representation is a canonically sorted row per
affected Ball: Ball ID, structure kind, structure ID and original cell. Only
explicit new Cannon or Diverter construction can create a row. A Ball already
inside the new cell receives one; a Ball at an entry face receives one only
when its forward crossing would enter owned terrain. At an exact diagonal
corner, side-tile tangency alone grants none. The side gets a row only if the
structure-free single-contact law would enter that side; a clear friendly
diagonal passage grants the diagonal cell instead. The row is removed after
the Ball exits the cell or the exact structure leaves it. This state is
distinct from Cannon launch and from any general structure grace period.

The current implementation has Rust and independent JavaScript tests for the
canonical row, first entry, an unrelated arriving Ball, retirement, a later
return, and exact-corner tangency. Disposable rehearsals establish the
authenticated Rules19-to-Rules20 epoch, three initial paid inputs, and both
genuine Cannon and Diverter purchases on existing Ball tiles in one later
segment. Independent JavaScript replay matched its exact public bytes. Those
checks do **not** yet establish an interrupted passage/restart, an actual
later encounter with the new structure or complete public-output equality
for the contact matrix.

For a territory-only simultaneous-axis vertex, prefer the left orthogonal
candidate from an even canonical source tile and the right from an odd tile.
With canonical grid coordinates (positive y points south), the x-side is
geometrically left when the x and y velocity signs agree; otherwise the
y-side is left. Parity is `(source_x + source_y) mod 2`, so it alternates on
both axes and across the even-width toroidal seams. No physical epsilon is
added to the Ball.

| Exact vertex ownership/contact | Chosen single contact and motion |
| --- | --- |
| Both orthogonal side cells capturable | Prefer the parity-selected left/right side. Both faces reflect under the existing single-face contact law; only the chosen side may capture. |
| Exactly one orthogonal side capturable | Choose that side, regardless of parity. The other friendly face passes or the obstructed face reflects according to its actual law. |
| Both side cells clear and friendly; diagonal cell capturable | Select the diagonal as one contact. Pass the parity-selected side and reflect the other face, leaving the Ball in the friendly side cell. |
| Both side cells clear and friendly; diagonal cell friendly | Pass both faces. |
| Both side cells clear and friendly; diagonal cell contains a structure | Preserve the solid blocked-vertex response; no diagonal capture. |
| A genuine structure in either side cell or the diagonal cell, with a simultaneous territory candidate | Suppress the territory capture. Keep the existing per-axis passage/reflection law; the both-friendly-side diagonal structure remains a blocked vertex. No parity bypass. |
| No eligible contact | Preserve normal reflection or passage without inventing capture. |

The Rust and independent JavaScript classifiers now exercise the four diagonal
directions, both parities, mixed neutral/enemy sides, both toroidal seams and
the historical Rules19 branch. This is **focused classifier evidence only**.
The successor identity, authenticated migration and paid construction over
occupied Balls have focused disposable coverage. Complete equal-time replay,
strike/capture output equality, later contact with the new structures and
interrupted cursor recovery still require qualification before activation.
