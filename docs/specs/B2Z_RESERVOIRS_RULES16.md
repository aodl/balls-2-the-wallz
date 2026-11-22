# Rules16 reservoirs

Rules16 introduces inert excavations. Rules15 and all earlier epochs retain their
published canonical replay and payment rules.

## Construction

A reservoir requires an empty tile in an active island belonging to the actual
funding player. A cannon, Diverter, reservoir or live ball at the target blocks
construction. The existing closed-cell test includes ball edges and corners.

Reservoir construction can touch another reservoir, a cannon or a Diverter.
Enemy land must still be at least distance four by toroidal Chebyshev distance.
A diagonal or wraparound distance of three is rejected. Cannon and Diverter
placement keep their Rules15 spacing. A reservoir occupies its own tile.

One reservoir costs exactly 1,000,000 e8s. Existing reservoirs do not affect that
price. Ledger fees, rejected payments, excess amounts and exact-once retention
follow the existing payment policy. The new directive is `RESERVOIR <cell>`,
where the cell is a canonical decimal integer from 0 to 999999. This directive
uses a bare memo. Existing lawful Shout commands are retained.

## State and presentation

Reservoirs are terrain, with no active ability, resource production, collision or
score of their own. Ownership transfers through ordinary ball capture. The
excavation persists if territory changes hands or returns to neutral. Balls pass
over the liquid undisturbed.

Schema8 adds one bounded field to Schema7. The field is a lowercase hex bitmap
with four cells per digit, least-significant bit first, in canonical cell order.
Trailing empty digits are omitted. The maximum length on the million-cell world
is 250,000 bytes. Existing cannon, Diverter, ball, ownership, account and
financial fields retain their encodings.

Orthogonally adjacent tiles share the perimeter and water surface, including
across both toroidal seams. The observer displays the excavation only from
verified state or a verified construction event. Local names and quotes follow
the exact authenticated config. A Rules15 predecessor does not offer the new
purchase.

## Cutover and recovery

Adapter10 (`BTZPAY07`) adds the reservoir opcode after a paused, drained
Rules15 predecessor. The controller seals the Ledger and Index positions before
committing the successor against that exact manifest. Cutover metadata version
12 binds both identities, old and new world hashes, the source anchor, the
cursor and the verified Ledger cutoff. Migration adds an empty bitmap and keeps
the historical state and credits.

Before persisting the preparation record, verify the exact Rules15 predecessor
and the candidate's ability to read it. Once the first preparation record has
persisted, recover with the same qualified compatible module. This boundary is
intentional. Stop and inspect the certified state if a response is ambiguous.
Production remains on its previous module until exact hosted qualification and
the live operational gates pass. Follow the pre-launch no-snapshot policy.
