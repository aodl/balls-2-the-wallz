# Proposed Rules20 successor

Rules19 remains the active ruleset. The proposed successor requires an
authenticated epoch and an independently verified state-preserving transition.
This branch defines and tests bounded pricing and grace-prefix selection. It has no active
successor configuration or migration.

## Tariff inputs and amounts

The existing daily observation still counts unique canonical funding accounts
with retained Cannons, including dormant ones. Store the applicable
population and the tariff formula identity. All population-priced actions use
the authenticated tariff selected by immutable Ledger block time. The
previous tariff during the existing one-hour grace window retains its own
formula identity, including a linear Rules17–19 tariff at activation. Compare
affordable prefixes even when the newer price is unrepresentable. Existing
tie-breaking and fixed-price actions retain their prior meaning.

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
A separate successor change must bind this arithmetic to scheduling,
affordability, receipts, cursor serialization, API/configuration and replay.
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

The current prototype has Rust and independent JavaScript tests for the
canonical row, first entry, an unrelated arriving Ball, retirement, a later
return, and exact-corner tangency. Those tests do **not** establish paid
construction acceptance, cursor interruption/restart, full output equality,
or an authenticated Rules19-to-Rules20 epoch transition.

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
| No capturable side and a genuine structure in a side cell | Preserve the structure obstruction/contact law. No parity bypass. |
| No eligible contact | Preserve normal reflection or passage without inventing capture. |

The Rust and independent JavaScript classifiers now exercise the four diagonal
directions, both parities, mixed neutral/enemy sides, both toroidal seams and
the historical Rules19 branch. This is **focused classifier evidence only**.
The successor identity, complete equal-time replay, strike/capture output
equality, contact with Diverters, payment acceptance, interrupted cursor and
authenticated migration still require qualification before activation.
