# BTZ release 2 — prepared candidate; installation remains NO-GO

The new release is **not deployed**. The final candidate's installed rehearsal
was stopped during disposable setup under sustained severe host contention.
Its browser, prelude and playback window **did not start**. A valid final
installed/browser/capture/replay/reconnect gate and six substantive exact-commit
CI passes remain required. Production was not paused or changed.

## Exact identities

| Item | Identity |
| --- | --- |
| Backend/harness source | `0cecccd5b02efe60ef9906ee990c754ecbc39919` |
| Latest frontend correction | `49a35d2078e715d071c68f2312a0e04ffd018dae` |
| Source tree | `4b6e24e60924c5fd786b77512f94b50ca5677d1b` |
| Final normal Wasm | `b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e` |
| Deterministic gzip | `d5bd1391d13a0bab7b86d3d0e5ce792e775f807a35416cb7ef4d972b5383cdb3` |
| Prepared observer `app.mjs` | `ba2c84787743bddd331466a885fe223a7b0a201efecc71bb3132d243b1bcdd67` |
| DTR generic checkpoint revision | `282d709143dacb4bca769a4d6e72b97fc93ef518` |
| SDK 0.15.0 archive | `22fb89851542ce19361a3b78a35c8a921d65e65e27890050b23cfcd1375e7720` |
| Installed predecessor, last authenticated read | `c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526` |

The normal artifact is 3,282,305 bytes; gzip is 1,029,784 bytes. Both checksums
must be checked immediately before installation. Empty upgrade arguments and
the checked public Candid service are frozen. No test hooks are exported.
The authenticated 82-publication browser case used frontend
`da1030795eafaa02f07e4866eb21c20ba19ae5fabd9cd111b2d4e392fa4e0fd3`.
The subsequent narrow frontend correction disables a known-invalid new-account
quote at the authenticated 1,024-player limit. Five focused quote tests pass,
including that new case and existing-owner continuation. It changes no backend
bytes. The prepared frontend still requires the pending final installed gate.
Production still has release 1 / world v5, as last verified; these v6 assets have
not been uploaded.

## Executed checks and their limits

* The complete **1,578-test base JS suite passes**, including historical goldens;
  five focused quote tests also pass after the one-case capacity correction.
  The exact-head CI will run the complete updated suite. The first broad
  runner hit its 300-second local timeout without a reported assertion failure;
  its FAIL is retained. The complete direct retry passes in 388.196 seconds.
  All **192 Python tests** and **47 host tests** pass. Current native purchase
  tests (9) and complete-segment conformance tests (2) pass. A stale-vector
  ordering failure from the development runner is preserved separately.
* The earlier `03993581…` normal module passed an untrimmed **45.1649-second**
  representative Normal sample: production 0.99635, display 0.99388 and admission
  1.10705 ticks/s while replenishing 5.11157 buffered ticks. No stall, rebuffer,
  resynchronisation or performance limiting occurred; conservation error was
  approximately `3.13e-13` ticks. This is **not** a new 900-second qualification.
* An earlier 45.0149-second sample remains **FAIL**: a retained-artifact query
  took 9.338 seconds, returned publication-unavailable, and one resynchronisation
  with BUFFERING occurred. Its independent final production bound was also
  missing. The trace does not prove which part of the shared host/simulator path
  caused that delay. It has not been relabelled environmental or PASS.
* The installed browser showed the v5→v6 transition, genuine disposable Ledger
  join, partial fire, dormant revival, targeted new cannon/move/rejections,
  shared-island prices, responsive controls and elapsed expiry without refreshing.
  A genuine query was delayed by 2.5 seconds without changing request/body bytes.
  Independent queries matched game/configuration/account/cannon/region/quote/
  receipt data against authenticated artifacts. Typed convenience replies remain
  explicitly uncertified. No real payment was made.
* Wire reconstruction passes through head **81**: **82 consecutive publications**,
  76 event artifacts, no capture/query-reply error and the original final fence.
  The explicitly supplied old preparation prefix is heads 0–2; the browser
  capture starts at head 3. No missing publication was fabricated or repaired.
  The corrected independent reference matches all 82 publications exactly:
  78 gameplay segments, four checkpoints, nine inputs assigned exactly once,
  work budget 23. The original attempt/replay FAIL is retained; the corrected
  replay is a separate result over the unchanged complete capture.
* Offline diagnosis found two reference issues: a neutral v5 capture stored an
  undefined optional anchor in private scratch, preventing checkpoint encoding;
  and v6 first-spawn probes used 60 bits on native/JS versus the actual 32-bit
  Wasm probe. The scratch fix does not change output. V6 now explicitly matches
  Wasm32 on every host. Only never-deployed v6 vectors were updated; historical
  v5 reference controls and historical publications are unchanged.
* The final Wasm has identical instruction, type, import, export, table, global,
  memory and element sections to the measured `03993581…` candidate. Only debug
  names and 16 data bytes identifying panic source coordinates differ. The
  checked structural proof supports retaining its bounded cost/capacity screen;
  it does not substitute for the pending final installed gate.
* The fixed 3/4-ball comparison used about **+0.83% / −0.24%** cycles against
  exact release 1 over eight ticks. Normal-module admission passed four ticks
  at **128 cannons / 64 balls / eight fragmented players**, peak observed Step
  2,119,993,128 instructions. Sandboxed maximum-state decoding/rendering passed
  desktop/mobile; point JS heap samples after rendering were about 34.0/42.8 MB.
  These are bounded screens, not peak-memory, leak-free or sustained-capacity
  rate claims. The earlier 128-ball artifact failure and 512-ball structural
  failure remain unchanged.

The actual proposed authenticated limits are **128 total cannons, 64 total
balls, 64 per purchase island, 16 retained cannons per account and 1,024 retained
funding-player records**. The global
ball cap has not increased. A friendly island's balls support all its cannons;
there is no ongoing launch-cannon attachment. First/additional cannon prices are
1/4/9 ICP; with one island ball, two additional balls cost 0.5 ICP and three cost
1.4 ICP. Dormant anchors count in cannon prices and expire after authenticated
24 elapsed-hour facts, not logical ticks. The expiry experiment used an explicit
disposable consensus-clock jump, not a day of wall-time observation.

## Final execution and source-control blockers

At 10:31 UTC the final candidate's setup had not reached its first publication
after eight minutes. Recorded CPU idle was zero, CPU PSI approximately 99%,
load approximately 23 on two vCPUs, and available memory approximately 1.7 GiB.
Only the owned unstarted rehearsal and its monitor were terminated; the owned
PocketIC server was cleaned up. No other session's work was killed. The result
is **BLOCKED_ENVIRONMENT**, with no playback verdict. The final post-capture
v6 reconnect check has not run and is not PASS.

GitHub has no published `release/btz-prelaunch-rules` branch or run for the
functional commit. Published release-1 success is not release-2 CI. Publication
is user-owned under the working rules and requires the owner's authenticated
Git session:

```sh
git -C /home/codexdev/src/b2z-prelaunch-rules push -u origin release/btz-prelaunch-rules
```

Require six substantive jobs PASS on that exact published head. No additional
deployment approval is being requested: the existing release mandate applies
after the remaining gates pass. The next host check is after the requested
30-minute cooldown; a failed window will not be automatically repeated.

## Production and deliberately deferred features

Query-only observations at 2026-10-31 09:40 UTC showed **4,218,820,863,225 liquid**
and **4,366,998,085,995 total** cycles, running Survival, no performance limiting,
source cursor 39,711,127 with zero pending rows/errors, and healthy Idle treasury.
Funds then covered the retained **3,357,988,370,090-liquid** release/recovery guard.
Balances must be refreshed before any installation. No funds were transferred,
requested, purchased or converted by this work. No controller, subnet, observer
module or production world was changed.

Event Horizon remains disabled with the 60-second Index fallback: a relevant
live subscription, usable deployed sender ABI and cadence-health source remain
unverified. Index-poke PR 11882 was rechecked open/unmerged at head
`76b7e1ea4f9cd034c91c4418891962e1cd430f3f`; it is not a dependency. Public read-only
APIs/docs are prepared. MCP service discovery stays inactive pending specific
operator acceptance of external terms; IMCP2 is not a paid-action wallet route.

The historical A0/A2 pair remains FAIL, interrupted attempts remain BLOCKED,
and prior paid-upgrade/recovery, low-funding, cold-reconnect, source/treasury and
larger/fragmented-world evidence retains its original scope. None is relabelled
by this Normal sample. This report is preparation evidence, not a GO attestation
or a claim that v6 shipped.

`RAW_SHA256SUMS` identifies the complete local raw evidence, binaries, logs,
captures, screenshots and pinned simulator/Ledger/Index inputs. Run its checks
from the rules worktree. Raw `.work/` artifacts remain preserved on this VM;
they are not silently represented as uploaded GitHub artifacts.

Historical production screenshots before this candidate are retained in
[desktop](../release1-mainnet/after-1440x900.png) and
[mobile](../release1-mainnet/after-390x844-view.png). Their original browser verdict
is unchanged. Candidate [desktop](after-desktop.png) and [mobile](after-mobile.png)
screenshots are from the authenticated disposable v6 case, not a production
deployment or a test of the later capacity-only quote guard.
