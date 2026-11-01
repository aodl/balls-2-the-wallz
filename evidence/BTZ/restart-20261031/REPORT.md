# Restart recovery — v6 remains unshipped

The restart recovery found the completed release-1 deployment and the separate
`release/btz-prelaunch-rules` worktree. Its executable candidate was already
committed at `49a35d2`; the remaining candidate evidence was recovered and
committed as `9b3bdfb`. No application, dependency, test assertion or frozen
artifact was changed during this continuation.

## Current production

Fresh SDK IC-root certificate checks verified the release-1 backend
`c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526`,
unchanged observer module/controllers and the existing 34-node fiduciary subnet.
A separate genuine certificate/artifact observation verified the v5 world,
publication 75,752 and the original receiving account and Ledger/Index binding.

At **2026-10-31 11:49:28 UTC**, controller queries reported
**3,423,502,782,887 liquid cycles**, **3,571,680,005,657 total**, running
**Lifeline, 0.05 ticks/s**, without performance limiting. This is the actual
reported hysteresis choice; no tier was forced. Source cursor was 39,711,127,
with no pending input, unfinished work, source/runtime error or treasury error.
Treasury was Idle. Across approximately 21 minutes, 125 segments completed;
the net decline was about 0.36T/h, including observation/maintenance traffic.
Reported treasury credits and the reservation gap were unchanged. This is not
gross billing or a runway estimate.

The saved release/recovery guard remains **3,357,988,370,090 liquid cycles**.
The last observation exceeded it by only **65,514,412,797 cycles**. Recheck it
before any release; this observation is neither a future funding guarantee nor
a funding request. No production pause, installation, transition, asset upload,
financial action or controller change occurred. One mistaken `controller_status`
probe was sent as an update to a nonexistent method and rejected without
executing canister code. Subsequent status calls explicitly used `--query`.

## Executed installed gate

Both attempts used the same frozen normal backend
`b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e`
and exact release-1 predecessor. The prepared production frontend hash is
`ba2c84787743bddd331466a885fe223a7b0a201efecc71bb3132d243b1bcdd67`.
DTR remains pinned to `282d709143dacb4bca769a4d6e72b97fc93ef518`.

1. **FAIL, 290.15 seconds.** Paid-world/catalog/source preservation through
   upgrade and exactly-once pending treasury recovery passed. Chromium then
   failed to launch because `libatk-1.0.so.0` was missing from its library path.
   No browser/playback verdict was reached. The documented existing user-local
   library path was restored; sandboxed Chromium launch then passed. No package,
   OS or browser-security change was made.
2. **FAIL, 683.59 seconds.** The affected gate was rerun with that environment
   correction and unchanged assertions. Paid-state upgrade, pending treasury
   recovery, and the same-page certificate-authenticated v5→v6/dormancy check
   passed. The browser subsequently timed out waiting for the join receipt row.
   It already displayed the correct **five cannons/four balls**, with no current
   delivery error, but had performed three snapshot resynchronisations.

The captured source cursor was still 6 at head 34. The three paid actions were
authoritatively completed by the declared phase head 43, with cursor 9. The
browser next accepted head 64: its 16-publication retention window starts at 49,
past every possible payment-bearing publication in **(34, 43]**. Consequently,
the snapshot restored entities but could not reconstruct the missed receipt
events. The existing UI explicitly describes absent old receipts as unresolved,
not rejected, and does not claim a permanent receipt archive.

Proxy evidence includes 9–10-second successful queries and approximately
15-second HTTP 502 timeouts, including one captured observation reply. The
shared host had sustained compiler/simulator/Java contention. These are recorded
facts, not proof attributing the delays exclusively to any one component. No
exclusive-host rejection rule was introduced and the failure remains **FAIL**.

Normal sampling, subsequent actions, elapsed expiry, independent complete replay
and final reconnect **did not run** in the second attempt. Capture finalisation
correctly failed because the publication fence was never established; pending
body callbacks drained. The failed capture was not repaired or relabelled.
Both owned simulator runs were cleaned up. No further attempt was made to obtain
a passing result. Earlier qualified replay/capacity results retain their original
scope in the [candidate report](../v6-release-candidate/REPORT.md).

## Remaining release boundaries

The ordinary non-forced push failed with exit 128: this session has no GitHub
write credential (`could not read Username for 'https://github.com'`). The rules
branch remains unpublished and its six-job exact-head CI is **NOT_RUN**. Current
default-branch commit `c84b888…` is an ancestor of the candidate; no stale default
was rebuilt or substituted. Publication requires an authenticated Git session:

```sh
git -C /home/codexdev/src/b2z-prelaunch-rules push -u origin release/btz-prelaunch-rules
```

The final installed/browser/capture/replay/reconnect gate and exact-head CI must
pass before the already-authorised second deployment. This is a technical
NO-GO, not a request for another deployment approval. The receipt-retention
failure must remain part of the record; do not weaken it into a screenshot-only
or entity-count-only PASS. No complete second release is claimed.

Event Horizon remains disabled with the 60-second independent Index fallback;
MCP discovery/terms opt-in remains inactive. Proposed limits remain 128 cannons,
64 total balls, 64 per purchase island and 16 retained cannons per account; v6
and these new limits are not active in production.

[Reviewed machine-readable results](summary.json) and `RAW_SHA256SUMS` identify
the new commands, frozen identities, preservation checks, failed captures and
production observations. Raw files remain under `.work/` on this host. The
repository documentation-link check passes; no backend rebuild was needed
for this evidence-only continuation.
