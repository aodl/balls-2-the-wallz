# Continuous-delivery diagnosis

The original selected-A2 **900.031-second FAIL remains a FAIL**. No acceptance
threshold, retention count, buffer, authentication, publication request, pace or
window length has been relaxed. The capture is a v5 four-ball world with a **v6
genesis catalog**; it is not the authentic paid-v8 upgrade fixture.

The raw historical trace was reconstructed before preparing the controlled run.
CBOR/Candid request decoding identifies method, requested segment and expected
publication hash. Browser request digests and timestamps join 2,738 browser
requests to 2,740 proxy records; all captured browser requests have a match.
Identical anonymous requests can recur: matching uses the nearest unused temporal
occurrence, and retains the original evidence rather than asserting an exact
transport identity where none was recorded. All 1,621 captured catalog/error
replies decode. The first parser attempt accidentally passed a sliced Node Buffer
to Candid; the independent byte copy corrected that diagnostic error. Its failed
output and correction are preserved; no original capture was changed.

Four sampled non-playing episodes contain 40, 49, 26 and 36 samples, respectively.
Their sampled spans are 23.299, 28.382, 17.149 and 21.033 seconds. Only two include
STALLED samples (8 and 6). Five observed resynchronisation increments are not a
count of independent failures: some occur in the same recovery episode. Seven
captured replies explicitly report `publication unavailable: snapshot resync
required`. Producer progress stays approximately 0.988–0.996 ticks/s at Normal;
admission/display and continuous buffer predicates fail.

| Historical request method | Captured requests | Upstream-header p95 | Maximum | Requests >5 s |
| --- | ---: | ---: | ---: | ---: |
| artifact_bundle | 315 | 3.891 s | 14.447 s | 10 |
| retained_publication | 346 | 1.955 s | 13.528 s | 7 |
| observation_bundle | 1,502 | 0.533 s | 8.242 s | 15 |
| lab_status | 559 | 3.383 s | 13.558 s | 17 |

These are measured **individual request intervals**, not frame-sampled SDK
last-duration values. One proxy 502 is preserved. Proxy completion tails are much
smaller than the largest upstream waits, but neither their difference nor a low
median attributes the upstream queue to a particular component.

Examples from the request/publication ledger:

- Retained segment 160 takes 13.604 s browser start-to-end, including 13.528 s
  proxy upstream-header wait, and returns retention expiry. The latest already
  arrived current catalog was only segment 164; it stays stale throughout this
  request. The following current catalog reaches 179. This is consistent with
  losing the retention margin during delivery, not proof of exact server eviction
  time or cause of the upstream delay.
- Expected artifact publication `f36f4c6d…` at segment 333 waits 13.268 s upstream;
  segment 368 / `65c21815…` waits 8.815 s; segment 652 / `9743e84c…` waits 14.447 s.
  The complete hashes and timing joins remain in the machine-readable ledger.
- Catalog, artifact and operational-status waits overlap the recovery periods.
  They implicate a shared delivery path but do not exclude A2-specific message or
  query scheduling.

The historical capture **does not establish** CPU or I/O pressure, cgroup
throttling, exact certificate-verification/admission timestamps, actual IC query
execution intervals, or every artifact response body. Incident endpoints are
sampling brackets. A response body's expected hash identifies the request; it
does not prove when the upstream executed it. Correlation is not root cause.

The new harness records bounded post-verification and admission-boundary events
without changing returned values, requests or authentication. A sandboxed Chromium
unit checks the diagnostic wrappers preserve the counter and push behaviour.
Per-hop wire capture and the unchanged continuous-playback assertions remain in
place. Certification start time is not separately instrumented; the event marks
successful return from the existing certificate path.

The predeclared sequential comparison uses exact normal A0 then exact normal A2,
one full 900-second Normal gate each, the same four-ball fixture, ten frontend
asset hashes, pinned PocketIC/Ledger/Index inputs, browser/viewport/sandbox,
polling and real-time clock mode. Both disposable subnets explicitly have 34
fiduciary nodes. The historical failed browser fixture used PocketIC's default
application subnet; that disclosed difference is not a measured A2 saving or a
change to production. A test-hook module is used only by the existing subsequent
low-funding fault phases, never as the Normal comparison binary.

Five-second resource samples record per-process CPU without arguments/environment,
runnable state, available memory, swap, CPU/I/O/memory pressure and exposed cgroup
quotas/throttling. The fixed prerequisite requires a quiet 60-second window;
foreign heavy jobs abort an already-started case without a favourable rerun.
No other user's process is stopped. The predeclaration and every rejected
prerequisite are retained even if no case starts.

In this attempt the resource prerequisite never passed. Neither browser case nor
the planned cross-case ten-asset equality assertion executed. The input hashes
and required equality are a reproducible plan, not a fabricated completed match.

See `acceptance.json` and the independent snapshot's `raw/matched/outcomes.json`
for the **actual comparison outcome**. A prerequisite rejection is BLOCKED, not a
browser FAIL or PASS. Without an admissible matched window, the missing
discriminator remains one sequential A0/A2 comparison on an otherwise quiet host.
Do not substitute A1 or rerun until a favourable sample appears. No candidate
code change is justified solely by the old correlation.
