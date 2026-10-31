# Rules branch published; release stopped at fresh funding guard

The operator published `release/btz-prelaunch-rules` at exact head
`3bddd886ca8acf87d8cd78da74a327bff98afc80`. The remote head matches the saved
candidate, and current default `c84b888…` remains its ancestor.
[Verification run 41205667919](https://github.com/aodl/balls-2-the-wallz/actions/runs/41205667919)
is in progress. At the saved observation, Native conformance, Browser HTTP/Web
Crypto, and Packaged DTR/clean consumers passed. Source, Wasm and installed-IC
qualification were still running. The informational production-inventory job
does not count as a substantive pass. No final CI success is claimed.

The immediately refreshed, query-only production preflight at
**2026-10-31 13:28:35 UTC** reported **2,885,064,561,308 liquid cycles** and
**3,033,241,784,078 total cycles**. The retained reviewed release/recovery guard is
**3,357,988,370,090 liquid cycles**, leaving an observed shortfall of
**472,923,808,782 cycles (0.472923808782T)**.

That guard is the previously saved `3T + 2 × 53,994,185,045 + 0.25T` protection,
upgrade/recovery and maintenance allowance. It is not Normal-mode entry funding,
an old 10T estimate, or a transfer instruction. Liquid balance already excludes
the IC's deductions; the reserve is not subtracted twice. Future preflight must
use a fresh balance rather than treating this shortfall as a permanent quote.

Production is still release 1/v5, reporting running **Lifeline, 0.05 ticks/s**,
without performance limiting. Source cursor is **39,711,127**, with no pending
inputs, unfinished operation, source/runtime error or treasury error. Treasury
is Idle. No production pause, upgrade, rules activation, frontend upload,
controller change, token transfer, cycles purchase or top-up was performed.

The task explicitly requires stopping safely when fresh cycles cannot cover the
bounded release and retained protection reserve. No local qualification was
restarted after this failed preflight. The remote CI run was left running.
The [earlier final browser/receipt/capture failure](../restart-20261031/REPORT.md)
remains FAIL and is not superseded by branch publication or ordinary CI. Its
remaining affected gate must also pass before deployment can proceed. No new
deployment approval is being requested.

[Reviewed snapshot](summary.json) records the exact query results and CI job
states; `RAW_SHA256SUMS` identifies the raw controller snapshot and GitHub API
replies under `.work/`. This is an evidence-only continuation; executable bytes
and frozen artifacts are unchanged.
