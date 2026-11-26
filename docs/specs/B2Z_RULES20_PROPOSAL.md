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

For a territory-only simultaneous-axis vertex, prefer the left orthogonal
candidate from an even canonical source tile and the right from an odd tile.
If the preferred side cannot be captured, the only eligible side takes
precedence. With two friendly passage sides and a foreign diagonal target,
use a single eligible diagonal contact. Mixed structure/territory contacts
must continue to use the genuine obstruction law. The final decision table,
contact resolution, versioned encodings and genuine payment acceptance
remain pending independent executable proof.
