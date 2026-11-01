# Frozen v6 complete installed/browser gate — PASS

The complete paid-v5→v6 rehearsal finished **PASS** on 1 November 2026, with
the exact requested deployment artifacts. This closes the local v6 technical
gate; it is **not a mainnet deployment or final CI attestation**.

| Input | Identity |
|---|---|
| Exact release-1 predecessor | `c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526` |
| Frozen normal candidate | `b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e` |
| Prepared production app | `ba2c84787743bddd331466a885fe223a7b0a201efecc71bb3132d243b1bcdd67` |
| DTR revision | `282d709143dacb4bca769a4d6e72b97fc93ef518` |
| Native installed harness | `7b2d6efdd9dce0a67171a9ad7694044008306f04b6f4c3a9435556e6a408d009` |
| Tested harness-source correction | `29b4bd3` |

The explicit ignored `playability_installed::paid_island_upgrade_rehearsal`
ran with **`B2Z_PLAYABILITY_BROWSER=1`**, actions-only mode unset, the genuine
disposable 34-node fiduciary configuration and valueless upstream Ledger/Index.
It ran 10:09:24→10:15:02 UTC, **337.44 seconds**, with a successful Rust test,
browser result, capture, independent replay and final whole-process exit 0.

## What actually passed

* Exact frozen predecessor→candidate upgrade preserves paid world, source/cursor,
  receiving account, retained catalogs and unfinished operation. A stopped local
  CMC creates genuine NotifyPending; recovery credits the same plan/block once.
* The already-open browser authenticates the v5→v6 handoff and dormant state,
  then observes paid join, partially filled batch and dormant revival, with
  authoritative receipts. It subsequently checks targeted additional cannon,
  legal move, move-limit and wrong-owner rejections, shared-island prices,
  account summaries, selection/camera preservation and responsive controls.
* A complete **45.087-second** representative Normal sample passes every existing
  rate, no-stall/rebuffer, no-resync, performance, buffer and queue assertion.
  Production bounds are 0.99807–1.02025 ticks/s; admission is 0.99807 and display
  0.99847 ticks/s. Buffer-conservation error is approximately `8.7e-13` ticks.
  This is not a new 900-second or maximum-population performance claim.
* The measured receipt-check→visible join interval is **16.268 seconds**, with
  **zero primary-page navigations**. This is buffered presentation latency, not
  Ledger-transfer-to-render latency. Index admission retains its separate
  60-second fallback. Confirmed receipt feedback precedes delayed presentation.
* A genuine query reply is delayed 2.5 seconds with its original request/body
  bytes unchanged. Authentication remains enabled. Account persistence, desktop,
  portrait/landscape resize and mobile DPR2 checks pass.
* Explicit disposable consensus time advances 24 hours only after draining
  requests. Authenticated expiry removes the two overdue dormant cannons while
  preserving the revived cannon, surviving balls, credits and logical time.
  This is a clock experiment, not 24 wall hours of observation.
* Complete fenced capture contains **445 packets / 16,313,496 bytes**, no capture
  errors and all **146 consecutive publications through 145**. Independent JS
  replay exactly matches 142 gameplay publications and four checkpoints, with
  all nine actual local inputs assigned once at positions 3, 4 and 6–12. The
  original required replay/capture assertions remain intact.
* After the capture boundary, a deliberately induced 20-publication retention
  gap causes exactly one authenticated same-page snapshot resynchronisation.
  Correct entity counts return without navigation. This fault phase is separate
  from the uninterrupted Normal sample and its complete capture.
* The anonymous agent example independently matches configuration, player,
  cannon, nearby region, quote and receipt replies against authenticated
  artifacts. Typed convenience replies remain explicitly uncertified; no query
  executes a payment or grants wallet authority.

## Slow-query diagnosis and preserved failures

The old [head-34→64 receipt-loss attempt](../restart-20261031/REPORT.md) remains
**FAIL**, with its expired receipts, HTTP timeouts and incomplete capture.
Neither its history nor its verdict was repaired.

All builds and asset generation finished before these installed executions.
The existing prebuilt-assets path checks the actual fresh disposable policy/root/
canister against its explicit pin; it never substitutes offline trust. Four
companion tasks acknowledged a compute hold, the separate Jupiter workload had
ended, and no competing compiler/simulator was running at start. No new host
thresholds or screening programme was introduced. The hold was explicitly
released after owned browser/PocketIC cleanup.

The final run's 677 proxy requests all returned HTTP 200: median about 14.9 ms,
p95 about 205.8 ms, whole-run maximum 5.05 s, including deliberate fault/clock
phases. Normal-sample fetch median/max were 39 ms/1.882 s. The prior receipt loss
did not recur, and receipts were actually verified, not inferred from entities.
These observations support the narrow build-free/prebuilt execution correction;
they are not an exclusive attribution of every earlier delay to the host.

The first new quiet execution completed all eight substantive checks and an
exact 112-publication independent replay, then **FAILed** its terminal Python
verdict: `result` had been overwritten by `subprocess.CompletedProcess`. That
original process remains FAIL. Commit `29b4bd3` renames the replay subprocess
variable and checks the recorded playback verdict explicitly. Six helper tests
pass, including refusal to let successful replay mask failed playback and refusal
to accept NOT_RUN without explicit actions-only scope. The separately recorded
full rerun above proves successful whole-process closeout. No application bytes,
receipt assertion, authentication policy, capture rule, timeout or playback
threshold changed; no unrelated capacity/history experiment was repeated.

## CI and deployment boundary

[CI 41205667919](https://github.com/aodl/balls-2-the-wallz/actions/runs/41205667919)
remains FAIL: 49 installed checks passed, two stale test expectations failed.
Its uploaded inventory explicitly ignores the full v6 paid/browser case.
[The precise corrections](../v6-gate-closeout/CI_CORRECTION.md) are published as
`58a53a3`; CI 41295699153 is running at the last observation. It does not yet
contain the subsequent terminal-verdict fix `29b4bd3`, which requires publication
and applicable CI. Green ordinary jobs alone are not substituted for this local
full case; conversely this local PASS does not invent a final CI PASS.

Existing measured cost/capacity and historical compatibility evidence is reused
unchanged. Proposed authenticated limits remain 128 cannons, 64 total balls,
64 per purchase island and 16 retained cannons per player; 512 balls did not
qualify. The operator's island clarification and versioned prices retain their
[existing reviewed scope](../v6-release-candidate/REPORT.md).

**Production remains release 1/v5; v6 has not been installed.** No mainnet query,
pause, upgrade, transition, asset upload, funding action or financial transfer
occurred in this continuation. Once applicable final CI passes, obtain a fresh
controller balance and quote release-guard coverage with practical operating
headroom. Do not reuse an old deficit or request Normal-mode funding. The existing
deployment mandate applies after the user's top-up is confirmed; no new blanket
deployment approval is required. Event Horizon remains disabled/60-second fallback
and MCP terms/discovery opt-in remains inactive.

These are **disposable IC screenshots**, not production deployment evidence:
[desktop](qualified-desktop.png), [mobile](qualified-mobile.png),
[mobile DPR2](qualified-mobile-dpr2.png), [dormancy](qualified-dormancy.png),
[expiry without refresh](qualified-expiry.png).
[Reviewed results](summary.json), [independent replay](independent-replay.json),
[upgrade preservation](normal-upgrade.json) and [agent example](agent-example.json)
link exact outcomes to `RAW_SHA256SUMS`. All failed/raw executions remain under
`.work/`; no failed result is relabelled by this PASS.
