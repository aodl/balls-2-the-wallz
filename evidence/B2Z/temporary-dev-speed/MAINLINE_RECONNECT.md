# Installed-IC reconnect qualification

The pre-merge pass and both mainline failures ran source
`1160ec17dbd06e9adf0ac6b11993c42505bd226e` in Chromium 153.0.8010.12.
All three built the same mainnet-policy observer JavaScript
`27bd705f6b413a18b382244cfd902cebc28540147922ae7306682077a6795318`.
The disposable builds embed each runner's pinned loopback endpoint and root.
The test used genuine disposable IC certificates and a synthetic v3 player
fixture. The separate financial job exercises the official Ledger and Index.

| Installed-IC run | Epoch checkpoint | Reconnect transport and authority | Visible world | Resync |
| --- | --- | --- | --- | --- |
| [Pre-merge](https://github.com/aodl/balls-2-the-wallz/actions/runs/45255689591/job/137979011423) | 3 | The second tab accepted head 24 from its recorded head 2 | 32×32 | At least one, as required by the passing assertion |
| [Mainline attempt 1](https://github.com/aodl/balls-2-the-wallz/actions/runs/45272303715/job/138036736602) | 6 | Requests resumed. The second-tab video renders the new epoch and shows fresh accepted authority via the “Playback delayed” status. The exact second-tab head was unavailable. | 32×32, with ball motion | The required resync never registered alongside the new world in the 30-second window. The second-tab counter was unavailable. |
| [Mainline attempt 2](https://github.com/aodl/balls-2-the-wallz/actions/runs/45272303715/job/138082871758) | 6 | Requests resumed. The second-tab video renders the new epoch and shows fresh accepted authority via the “Playback delayed” status. The exact second-tab head was unavailable. | 32×32, with ball motion | The required resync never registered alongside the new world in the 30-second window. The second-tab counter was unavailable. |

The original failure snapshot belonged to the foreground payment tab, which
accepted heads 35 and 36 respectively. Both failing attempts logged bursts of
successful queries around reconnect, consistent with replaying retained
publications. Both passed the original Move Copy, transition fence, new Move
Copy and continuous new-epoch playback. The later new-epoch payment stage in
the passing run let the producer build a larger gap before reconnect. The
second-tab status and rendered motion show that transport, verification and
presentation recovered while the test waited for the snapshot resync path.

The delivery switch stops new polling work. A pending observation can still
accept publications after the harness reads its baseline. At the 16-publication
boundary this makes a gap recorded as 17 compatible with ordinary retained
catch-up. Once caught up, the observer has no reason to resync. A local
instrumented run directly observed the race: the reconnect tab advanced from
head 61 before the pause to head 68 when the pending work settled.
Background scheduling can affect when the pending work completes. Certificate
freshness, poll and retry timing, and the warm-return rate controller can affect
when the browser catches up or renders. The recorded fresh authority and new
world in both failures point to the test's eviction precondition.

The harness captures the baseline after pending work settles, requires a
certified foreground head at least 17 publications ahead, and queries the
installed canister to prove that the first needed publication was evicted.
Recovery still has 30 seconds to verify and accept the new epoch at or beyond
the foreground reference, increment the resync count and render the 32×32
arena in the same session. The report records the reconnecting tab's requests,
errors, accepted head and identity, delivery pause, clock, resync counter and
world dimensions. The test exercises UX-04/05 presentation and UX-06 payment
authority with the existing native Copy and cold reload checks.

In a focused disposable run with video disabled, the frozen head was 19,
the foreground certified head was 42, and the installed API confirmed that
publication 20 had been evicted. The reconnect tab's first resync sample
accepted head 44 and displayed the 32×32 torus 657 ms after the pre-release
sample. The tab recorded zero request or page errors. This run exposed a
diagnostic comparison that conflated the decoded authoritative world's
dimensions with the view's derived torus flag. The final check reads the
reference dimensions and tests the torus flag on the rendered view.
