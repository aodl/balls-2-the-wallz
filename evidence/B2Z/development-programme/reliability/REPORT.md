# Million-cell observation and presentation reliability

## Later qualification

The original full 900-second sustained Normal case ultimately passed on
product source `66420f5e1927578b8c42229bda0c906a1ead7ebe`, after two
separately retained failed attempts and focused verified-coverage corrections.
The untrimmed 900.48-second run admitted 0.99836 and displayed 0.99833
authenticated ticks/s, with zero stalls, rebuffering or resynchronization;
it completed cold Lifeline and exact independent replay of 1,049 consecutive
authenticated publications. The earlier failures remain failures. See the
[programme report](../REPORT.md) for the exact distinction.

A separate historical Rules13 Shout browser fixture timed out in PR #16's
[standard run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45832046550)
after its authenticated publication and independent replay had passed.
The obsolete fixture clicked a Reorient action that was already active and
hidden. PR #18 removes the redundant click and waits for the selected
Diverter/default Reorient state. Its focused installed browser rerun passed;
its exact `a8ea27a` source then passed the full [standard hosted run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45848907969),
including installed-IC qualification. The original failure, passing
local retry and corrected pass are recorded separately in the
[machine-readable evidence](shout-browser-fixture.json).

## Original investigation

Both consolidation short-run failures were browser observation aborts during
the disposable Normal-to-Economy Wasm upgrade. The corresponding upstream
query was still pending after the browser's ten-second request deadline.
The two proximal upstream requests took 10.553 and 10.744 seconds. They failed
well before the final capture fence. The harness now suspends observation
between the timed windows, waits for response capture to drain, and resumes
after the disposable upgrade marker. Response integrity, capture completeness
and independent replay retain their existing checks.

The original sustained run and the first short rerun had a separate failure.
In all six observed stalls, cadence confidence expired during a verified
delivery gap and presentation accelerated with less than one tick remaining.
The change retains the existing single-tick coverage cap until the normal
transport deadline or actual coverage exhaustion. It leaves the buffer size
and workload untouched. An arrival vector based on the original observations
failed before the change and passed after it. The existing prolonged-outage
test still reaches a genuine stall.

The local [short installed journey](short-installed.json) passed on source
`2e10e1967f38e20a8cdb7f469fefaaf1aa5e794f`. Normal sustained 1.013 backend
ticks per second and admitted 0.991 verified ticks per second over 89.85
seconds. The minimum remaining buffer was 0.772 ticks, with zero stalls
and zero resynchronizations. Economy, final wire capture, cold reconnect
and independent replay passed. The shared host still had delivery spikes
as long as 7.73 seconds. The archived candidate evidence is independently
retrievable by the recorded SHA-256.

The original sustained failure remains historical. A new run must meet
the full untrimmed sustained condition before closing that case.
