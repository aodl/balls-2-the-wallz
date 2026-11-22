# B2Z Rules17 daily economy

Rules17 activates from the exact Rules16 predecessor at the authenticated
exclusive Ledger cutoff. Schema9 adds the daily tariff schedule. Adapter11
wraps the unchanged Rules16 normalized transfer and command with a
big-endian nat64 Ledger block timestamp. The source identity, account history,
gameplay state, Reservoirs, receipt history, treasury and logical clock are
preserved. The first durable Rules17 preparation record requires a
Rules17-compatible recovery module.

## Exact prices

| Action | e8s received by B2Z |
|---|---:|
| Cannon, including one Ball | 1,000,000 × P × (retained Cannons + 1)² |
| Diverter | 100,000 × P × (current Diverters + 1)² |
| Each additional Ball | 10,000 × P × (current world-wide Balls + 1)² |
| Reservoir | 10,000,000 |
| Cannon Move, Diverter Move or Reorient | 10,000 |

Each requested Ball after the included Ball increments the projected inventory
in a batch. A payment creates the affordable prefix. Use the actual inventory
in deterministic payment order. Overflow in the Ledger's nat64 price range is
a representational failure. The per-payment quantity stays bounded at 64.

## UTC and durable evidence

The bootstrap counts unique funding accounts with retained Cannons at the
actual cutover commit. Dormant retained Cannons count. A last-cannon retirement
removes the account from future snapshots, even if its receipts and scores
remain. Every multiplier has a floor of one.

An ordinary Rules17 result becomes ready and publishes in the same atomic
message. At a UTC boundary the prior committed world is the population
preimage. If the callback is late, that world still spans the boundary,
provided no intervening commit occurred. Every result and cannon-expiry
checkpoint advances this same clock. An idle arena uses a zero-logical-time
checkpoint for the daily observation. No extra simulation tick is required.

Each record carries the exact UTC boundary, first boundary spanned if an
outage covered multiple days, previous committed state hash and time,
population, previous and next multipliers, announcement, effective time and
grace end. A delayed observation publishes the tariff from the last boundary
for the next midnight. Earlier missed announcements leave the last published
tariff in force. The schedule is validated and included in the authenticated
world; replay recomputes it from the committed predecessor and elapsed fact.

## Ledger payments

The configured Index supplies account history and block timestamp. When a
timestamp is absent, the configured Ledger or its designated archive is
queried for that exact position. Sender, recipient, amount, fee, spender and
memo must match the Index record. Failure leaves reconciliation retryable and
the payment position unconsumed. Client creation time has no pricing role.

The tariff is selected using immutable block time. During the one-hour grace
period, select the tariff that fulfils the longest prefix, with the current
tariff winning ties. A lower current tariff always wins. Keep the chosen
tariff through the continuation and record it and the block timestamp in the
receipt. Earlier epochs keep their original adapter, pricing and receipts.

## Bounds and operating cost

Rules17 removes the legacy registered-player, Cannon, Diverter and Ball
inventory quotas. World space, identifiers, arithmetic, encoded artifacts,
journal and message budgets remain finite. The legacy public API inventory
limit fields use zero to indicate the absence of a quota. Sorting and
partitioning by physical strike edge avoids comparing distant edges.
Concentrated collisions at one edge and very large encoded worlds still
require workload measurement. Paid ICP remains held by the existing
recipient and does not automatically fund cycles.
