# Prelaunch release 1: integration harness correction

The push run [41085634240](https://github.com/aodl/balls-2-the-wallz/actions/runs/41085634240)
and PR run [41085986302](https://github.com/aodl/balls-2-the-wallz/actions/runs/41085986302)
for source `6f847b0a92566b8973fdae36d482c40a13f6c251` both remain **FAIL**.
Five substantive jobs passed in each run. The installed-IC job failed three
browser cases; the production-inventory job is informational, not qualification.

## Demonstrated causes and correction

- Both million-cell cases timed out looking for the text `Lifeline` in the
  prominent status. The requested UI now says `Reduced speed to conserve cycles`.
  The backend reported Lifeline, 50 milli-ticks/s, no performance limiting and
  no runtime error. Check the actual operational target rate, retain the original
  throughput assertions, and check the new player-facing conservation message.
- The epoch browser case used the historical synthetic `01…01` account. Local
  reproduction failed with `AccountIdentifier checksum` in Identify. Adapt only
  that disposable UI genesis to a real derived AccountIdentifier. The historical
  migration fixture and its original expected bytes remain unchanged.
- Retain transition-browser diagnostics in future CI uploads; the original
  workflow omitted this subdirectory. No production runtime or frontend source,
  dependency, capture integrity rule or playback threshold changes in this fix.

## Measurements retained

The failed overall jobs must not conceal their completed passing measurements.
The push run retained a **900.247300-second** Normal window with all seven strict
checks PASS: production bounds 0.997504–1.003058 ticks/s, admission 0.999725 ticks/s,
display 1.000113 ticks/s, no stalls/rebuffering/resynchronisations or performance
limiting, bounded queues, no sustained buffer deficit and conservation error
`2.49e-10` ticks. Economy also passed. The PR run independently retained a
900.464-second window with all seven checks PASS. Their subsequent Lifeline
measurements and capture/replay closeout did **not** complete; those gates are
not PASS.

The corrected local epoch case passed (103.04 seconds), including authenticated
transition, stale old MOVE rejection, clipboard checks, fresh-epoch playback and
reconnect after the retained-history gap. Browser sandbox enabled; no page errors.

An additional local million-cell follow-up failed at its 60-second startup
deadline, before any measured window. Retained diagnostics show repeated catch-up
gaps, about 4.15 seconds for the last HTTP fetch and 0.588 seconds for verification.
They do not establish a cause. This is retained as **FAIL at startup**, not a
completed Normal/Lifeline measurement. A preceding local wrapper invocation
selected zero tests because it omitted `--ignored`; it is also explicitly FAIL
and supplies no playback evidence. No new 900-second local trial was launched.
Exact published CI of the correction remains required before release.
The focused identity/camera/pricing/rollback tests passed (22/22), as did the
frozen delivery contract regressions (4/4), Rust harness build and format check.

## Artifact identities and custody

Complete original integration ZIPs, extracted measurements and independent
`SHA256SUMS` are under `.work/btz-prelaunch/ci-<run>/`:

| Run | Artifact | ZIP SHA-256 |
|---|---|---|
| 41085634240 | 12993992524 | `eb67139419be9f01cdeef0f536660be9a72fc5d2e32e295faeaea9aa840a788a` |
| 41085986302 | 12993318614 | `0cf2202a7ecfe84ef9226258631f1a5982d66e77936dc0c307d22b1949b1ec8a` |

Local reproductions are under `.work/btz-prelaunch/ci-fix-*`. Existing failed
historical qualification evidence remains untouched. The frozen release-1 normal
Wasm remains `c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526`;
frontend app `9d50b86a9a9ad16f73f9d226d66468be0a3a44965071ec292c7c41b59da52bf8`;
stylesheet `1b69b82f407d1374cd1cf0cd52b04c0339fe9d166886c5231324b4bcdac5a2cb`.
The correction does not rebuild or replace these artifacts.

Read-only production checks at 17:09 UTC on 30 October 2026 authenticated exact
A2 `2c289f…`, both original controllers and the original 34-node fiduciary subnet.
Controller queries reported 7.282791092226T liquid / 7.431238458546T total,
Conserve at 0.2 ticks/s without limiting, zero pending inputs, no source/runtime
error and an idle, unhalted treasury. These are observations, not deployment or
funding actions. Mainnet was not changed during this correction.
