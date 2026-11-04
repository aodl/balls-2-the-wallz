# B2Z overnight campaign — complete and reconciled

The approved eight-hour window expired at **07:14:09.902 UTC on 2 November 2026**.
The runner recorded expiry and its persistent stop flag at 07:14:15.362 UTC; no
transfer was submitted after the approval deadline. Both runner and witness exited.
No paid campaign remains active. Further funded play requires a new explicit
campaign approval; depositing funds does not restart or expand this one.

## Exact financial reconciliation

**32 overnight transfers, all applied; zero unresolved, rejected or partially
filled outcomes.** Official Ledger balances equal frozen opening balances minus
full journal expenditure. The existing bounded official ICP Index matcher
independently matched payer, destination, amount, fee, exact memo and immutable
creation timestamp for every recorded block. All **33** historical B2Z receipt
proofs reverify, including the earlier single-account smoke. No transfer was retried
with a new timestamp, fabricated, refunded or omitted.

| Ordinary player | Overnight actions | Overnight ICP including fees | Remaining ICP |
|---|---:|---:|---:|
| b2z-agent-expander | 13 | 0.0026 | 0.8973 |
| b2z-agent-defender | 10 | 1.3017 | 0.6983 |
| b2z-agent-raider | 6 | 1.2010 | 0.7990 |
| b2z-agent-adaptive | 3 | 1.1005 | 0.8995 |

Overnight game transfers: **3.6026 ICP**; Ledger fees: **0.0032 ICP**; full overnight
expenditure: **3.6058 ICP**. Including the earlier **1.1001 ICP** smoke, total spend
from the four funded accounts is **4.7059 ICP**, leaving **3.2941 ICP**. These are
fresh official Ledger/Index results, not inferred balances from game entities.
The closeout signer route was explicitly disabled and performed read-only queries.
[Full transfer/receipt/balance reconciliation](results.json).

## Live state, deployment and operational aftermath

No backend/frontend deployment or authoritative game/economic change was made by
this overnight agent work. Fresh genuine IC certificate checks confirm the same
two controllers, existing 34-node fiduciary placement and module hashes:

- Backend `s34gv-3qaaa-aaaar-qcifa-cai`:
  `cfcf6130432a040a40738627df65da65d0d5c57195c04d3bb147a848af6d8303`.
- Observer `s45ab-wiaaa-aaaar-qcifq-cai`:
  `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Public app: `ddebfaf3fbc43b3d0b0eb1139c5e35ce0e8d5a3077bdb9f226393c5e2edd778a`.
- Rust DTR: `282d709143dacb4bca769a4d6e72b97fc93ef518` (unchanged pin).
- Local frozen forecast executable:
  `baf2578c1388ade63abb722be761aa8860b549c7331d33bf40f389e23982c795`.

Rules **7**, world schema **6**, epoch index **4**
`4fb7adbb6e71fa4b0333988167d5e13c1a41c14173f154cdba1aafba9c0cd7a4`,
final authenticated head **85761**. The receiving account and official Ledger/Index
binding remain unchanged. Actual authenticated capacities include 128 cannons,
64 global balls and 16 retained cannons/player; the pilot enforced its lower
one-cannon/two-ball limits throughout.
[Certified module/controller/subnet observations](certified-canister-metadata.json),
[final authenticated state and evidence](final-snapshot.json).

Each test player retains one cannon/two balls. Final territories are
475/763/1786/363 cells. Exact canonical accrued scores are in the final observation.
These different starts, policy phases and funding rates do not constitute a
controlled tournament or prove one policy superior. The original player remains
dormant with its anchor/credits; earlier missing combat history is not reconstructed.

Gameplay naturally reached **ReserveProtection**; admission and physics are paused,
with healthy source and zero pending records. Operational liquid samples varied
around 2.63–2.85T during closeout; execution reservations and separate sampling
scopes prevent interpreting them as a precise marginal bot-burn or runway meter.
No Normal-mode funding prerequisite or automatic top-up was introduced. Existing
entities remain under ordinary conservation, as selected; stopping software does
not delete them or eliminate source/storage/maintenance costs.

## Actual improvements and evidence

- Existing native kernel now provides bounded local forecasts; no second physics
  engine or DTR extension was introduced. Exact native/JS fixture/forecast equality
  and work/hash bounds pass.
- Local custom quotes, explicit target ownership, heading rotation, fee-inclusive
  marginal-vs-Wait ranking, public active-opponent assumptions, missing/late
  forecast coverage, dormant revival and paused-game semantics were corrected.
- Adaptive passive queries reduce duplicate observations at slow tiers while
  preserving urgent payment reads and the unchanged financial freshness guard.
- Significant canonical events and final states now have bounded durable proof
  archives. All **13** captured publications independently reverify. They contain
  actual movement/entity evidence; no new live death is claimed if none was recorded.
- A real retired-artifact race was reproduced, then corrected with bounded fresh
  authenticated snapshot handoff. Paused monitor startup now uses the normal
  read-only certificate window, while payments still require thirty-second freshness.

Key implementation commits: `8961d8a`, `d457dc9`, `4fbcfab`, `32068d2`, `a518991`,
`56eb9f1`, `aa2d442`, `e165399`, `2edb523`, `80bc903`, `7e07794`, `d8c48d5`.
All changes remain local; **remote CI NOT RUN** for unpublished commits. Latest
relevant focused suite: **74 PASS**, with earlier **80 PASS** covering retired
transport/live-delivery and **18 native equality** checks. Existing installed-IC
financial evidence was reused; no unrelated 900-second qualification was repeated.

There were **29** complete no-refresh presentation witnesses for the 32 overnight
actions. Three early moves lack a complete witness because of preserved harness
failures (Accepted-vs-applied wording and hidden selector), despite authentic applied
receipts. Five browser windows each recorded one initial navigation and zero page
errors; no continuous-window claim spans safe process restarts. One real observer
availability stop caused explicitly recorded missing heads 84035–84542. No missing
receipt or combat was inferred from counts. Bounded forecast timeouts/partial
results remain failures/limitations, not manufactured completed predictions.

[Desktop pause confirmation](paused-desktop.png), [mobile](paused-mobile.png): the
public site correctly says **Gameplay paused to conserve cycles**, uses the B2Z
title, and respects the viewport coverage minimum. This final check was read-only.

## Strategic findings and limitations

Local adjacent-cannon tests passed 24 independent Rust/JS stages (both directions,
simultaneous shots and toroidal seams), without a reproduced authoritative defect.
No extra live ICP was needed. Batch vs same-heading separate payments produced
identical game state while batching saved a fee. Different headings/admission
order produced different exact outcomes in one selected snapshot; this is a
hypothesis worth broader controlled testing, not a balance-change mandate.

The 16-tick realistic-delay screen did not fit the five-second budget; the live
runner kept its proven eight-tick limit and exposes unassessed delay scenarios.
Future budgets, opponent intent and source admission order remain unknown.
No claim of optimal strategy, full new-player fairness or isolated backend cost
follows from this small integration pilot. No prices, combat rules, capacity or
source scheduling were changed to help a test agent win. Event Horizon remains
disabled/60-second Index fallback; MCP discovery/terms opt-in remains inactive.
IMCP2 was not used to execute payments or bypass its restrictions.

Further work remains read-only or valueless local engineering. Next targeted
hypothesis: check whether forecast loss accounting includes newly spawned balls
that die within the same horizon, before using attrition rankings in another
funded campaign. Reproduce first, then make only the justified local fix.
