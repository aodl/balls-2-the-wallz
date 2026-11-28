# Certified burn: active Trickle qualification blocker

Observed 27 November 2026 in disposable PocketIC. This is a **FAIL** for the
feature-enabled backend, not a production observation. The feature remains off
in ordinary backend profiles and is not approved for integration or installation.

The existing paused same-ID certificate/restart/recovery rehearsal passed. An
extended ignored installed test now starts capped ordinary Trickle after that
rehearsal and advances 65 simulated minutes, verifying each certified record
against its IC certificate and publication. It requires a genuine established
rolling window at the end. That requirement failed in four controlled variants:

| Sampling variant | Final quality | Certified window | Certified short-window rate | Settled management net rate |
|---|---|---:|---:|---:|
| Original timer plus Index reply | stale | 5 min | 12.584T/day | 0.406T/day |
| Timer callback only | preliminary | 5 min | 12.584T/day | 0.407T/day |
| Post-Index callback only | stale | 5 min | 12.584T/day | 0.406T/day |
| Post-Index liquid balance | stale | 5 min | 12.584T/day | 0.406T/day |

The latter two runs recorded a zero reported treasury-credit counter throughout
all 13 five-minute observations. Source work was not pending at those snapshots.
Management cycle readings were settled at the sampled endpoints. The large
short-window rate and alternating stale/preliminary records are consistent
with temporary message reservations and refunds affecting in-canister balance
samples, but the exact reservation boundary has not yet been demonstrated.
A genuine gross execution rate cannot be inferred from this mismatch.

The machine summary [CERTIFIED_BURN_ACTIVE_BLOCKER.json](CERTIFIED_BURN_ACTIVE_BLOCKER.json)
records exact Wasm hashes, rates and the raw `.work/` locations. The raw
certificates, full samples and original FAIL logs remain outside the active
source tree. The new ignored installed test is retained as a release gate; it
must pass without relaxing its full-window assertion before enabling the
feature.

Next, instrument the disposable callback balance and reservation state in a
bounded test-only way, compare it with settled management readings, and select
a defensible observation point or different accounting basis. Recheck active
Trickle, pause, protection, known credits, unknown top-ups, restart, browser
verification, existing certified consumers and incremental daily overhead.
The currently installed Rules19 backend and the qualified frontend-only review
candidate do not depend on this experimental capability.
