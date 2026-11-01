# B2Z overnight pilot: local findings and forecast correction

## Scope and financial boundary

Rules 7 production is unchanged. The operator approved eight hours using the
four verified remaining balances, frozen at 6.8999 ICP aggregate (including fees),
with one retained cannon/two live balls per player, no top-ups and no deliberate
outside-player attacks. The prior Expander smoke used 1.1001 ICP. This report is
an interim local engineering record, not a claim that the eight-hour run ended.

The three remaining accounts joined sequentially. Ledger blocks 39965749,
39965854 and 39965882 each applied a 1.1 ICP two-ball join plus 0.0001 ICP fee;
all have durable authenticated receipts and actual same-page presentation witnesses.
Overnight spend at the phase boundary is 3.3003 ICP; remaining ceiling 3.5996 ICP.
No unresolved payments. Budget/expiry/journal remain fixed across process restarts.
Entities remain running under ordinary conservation, as selected before the pilot.

## Actual integration defect and fix

The pilot initially refreshed authenticated state before admission without
refreshing its separately sourced operational health. Its next admission check
correctly refused a null operational view. Commit b2bf2d4 fetches that health after
refresh. The process resumed its original journal; the completed first join was
not replayed. The initial failure remains in private raw logs.

At five cannons/eleven balls, JS forecasts routinely hit their 1.5-second bound.
The policies waited instead of purchasing on nonexistent predictions. On one
frozen authenticated production snapshot, three candidates × three scenarios ×
eight ticks completed with the existing native kernel in 4017.77 ms. The JS engine
at the same 5000 ms allowance hit the hard bound at 5324.74 ms with only the first
scenario complete. This is local wall time, not billed canister cycles.

The existing native-conformance executable now exposes bounded stdin segment
execution. There is no new physics implementation, canister or DTR extension.
Release executable SHA-256:
`baf2578c1388ade63abb722be761aa8860b549c7331d33bf40f389e23982c795`.
The worker checks the frozen hash; cache identity includes it. New planning engine
and bounds start a separately labelled experiment phase, retaining all financial
accounting and prior episodes. Shortlists retain action-type diversity and
adaptive rewards use canonical score change per logical tick.

An additional local integration failure occurred when explicitly replaying all
parent Node execArgv into file workers. Node's test runner includes process-wide
flags that Workers reject. The correction uses Node's normal inherited flag
handling unless inline-source flags need removal; security/runtime flags are
preserved. Both the failed and passing test logs remain under `.work/`.

## Adjacent friendly cannons: no gameplay defect reproduced

Six geometries cover east/west/north/south and east/south toroidal seams. Real
canonical valueless purchases place the adjacent second cannon (4 ICP), fire in
each direction (0.4 then 0.9 ICP), and fire opposing launches in one segment
(1.6 and 2.5 ICP). Prices reflect the actual sequential shared-island pool.
These local endowments do not expand the live pilot's one-cannon limit.

Across 24 stages, the first contact reflects after 2/125 logical tick. Reflected
balls escape through the existing launch-cell exemption, do not enter the other
cannon, preserve friendly territory/anchors, and advance strictly in time. No
zero-time loop or friendly annihilation occurred. Independent Rust execution,
including cursor snapshot/restore, matches exact JS state/events/scores hashes.
An initial test-oracle FAIL comparing numeric 0 and -0 was corrected; it was not
an authoritative gameplay defect. The original failure is retained privately.

## Checks actually executed

- PASS: 46 focused JS tests (analysis, executor, interface, adjacent cannons).
- PASS: 18 native fixture/forecast equality cases; bounded incomplete output has
  no invented state; wrong native hash fails closed even with a warmed cache.
- PASS: independent Rust adjacent-cannon recovery/equality test (24 stages).
- PASS: runner syntax and whitespace checks.
- NOT RUN: remote CI for these unpublished local changes; pushes are user-owned.
- NOT CLAIMED: installed-IC or billed-cycle evidence from pure-kernel tests.

Raw outputs and private transaction/receipt witnesses stay under `.work/`.
No private signing material was inspected, copied, exported or committed.
