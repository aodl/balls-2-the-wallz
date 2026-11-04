# B2Z first hourly review — 2 November 2026

## Live results

All paid outcomes remained reconciled and no player was paused at the review.
The first v2 phase completed 228 bounded decision evaluations without a forecast
failure: 217 Wait, nine Move and two Fire choices. All test accounts retained one
cannon and two balls at 01:48 UTC. Their territories were 289, 405, 1,222 and 242
cells respectively; these different starting histories do not establish a winner.
The original outside-test player was dormant, retaining its anchor and accrued
credits. No cause is inferred for combat whose event history was already lost.

Overnight spend at that check was 3.6032 ICP, leaving 3.2967 ICP under the original
frozen allowance. All 19 overnight transfers were applied. The earlier Expander
smoke was a separate 1.1001 ICP, also within the funded balances. The original
07:14:09.902 UTC spending expiry and leave-running aftermath remain unchanged.
[Time-stamped current results](results.json).

Measured Ledger-acceptance-response to authenticated receipt: 18 observations,
6.136–69.303 seconds, median 34.697 seconds. This includes Index discovery,
publication and observer polling; it is not an isolated Ledger or admission meter.
Receipt visible to played state: 16 successful browser witnesses, 14.231–16.855
seconds, median 16.111 seconds. Historical harness failures remain preserved.

At 01:48, separate operational telemetry reported 8.630053303166T liquid and
Conserve (0.2 logical ticks/s), without performance throttling or source errors.
Short net-rate samples reset on positive discontinuities. They do not isolate
per-action, gross or marginal bot cost; no confident runway claim follows.
The main runner RSS was 282,020 KiB; the Python witness process was 36,828 KiB.
Browser subprocesses and transient native forecast children are excluded from
those process measurements. Scripted policies made no external LLM API calls;
Codex/inference billing is not available in these observations.

## Implemented after inspection

`56eb9f1` fixes the public opponent model. It previously always selected the first
other cannon, often inventing a paid revival by the dormant original player.
It now selects the nearest active opposing cannon, using toroidal geometry and
stable ID ties, and exposes the exact assumed account/action/amount. Future intent,
funds and payment order remain unknown. Dormant-only opposition stays dormant
unless explicitly supplied future inputs revive it.

Payment receipt proofs already survived retention, but ordinary in-memory combat
history expired before an hourly investigation. The pilot now records significant
combat/lifecycle/entity events, original certificate/predecessor/artifact evidence,
and the compact final state bound to that publication. Proof construction is shared
with receipt archiving. The recorder is bounded to 1,024 publications/64 MiB,
fsyncs significant records and explicitly logs introduction and missing intervals.
Ordinary motion/cell captures are not a permanent archive. Earlier missing events
are not fabricated. Phase changes also preserve prior strategy history before
starting a fresh comparison phase. These are local tooling changes; backend,
frontend, payment rules and DTR epochs are unchanged.

PASS: 63 focused observer/analysis/executor/interface checks, including genuine IC
certificate/chain/artifact evidence. PASS: 18 native equality comparisons and
artifact/work-bound checks. PASS: all 20 existing real payment receipt archives
(including the earlier smoke) reverified after restart; a fresh authenticated head
was accepted with no pending source record. The updated local match runner passed
24 player outcomes with valueless existing-kernel inputs; this is a smoke test,
not evidence of strategic dominance or billed-cycle cost.

## Bounded longer forecast: FAIL preserved, small correction shipped

Observed receipt delays can exceed the eight-tick/40-second immediate planning
horizon. One 16-tick screen with 0/35/70-second scenario delays hit the unchanged
5.3-second hard bound after only two baseline rows completed. The full candidate
screen did not qualify; the live runner retains its proven eight-tick bound.
[Actual failed/partial result](bounded-16-tick-fail.json). No timeout extension,
receipt inference or authentication bypass was used.

The screen exposed a reporting defect: missing rows produced empty "unassessed"
lists. `aa2d442` now explicitly marks each missing scenario MISSING_FORECAST;
26 focused follow-up tests pass. The live phase is labelled separately as
`policy-v2-active-opponents-explicit-coverage`, preserving all financial limits.
Long-delay strategic evaluation remains a narrow limitation; current decisions
explicitly expose what was and was not assessed.

Remote CI NOT RUN for unpublished local commits. No production artifact deployment,
financial top-up, controller change or new game epoch occurred. At the next hourly
check, inspect newly archived combat, payment outcomes and whether consent/model
assumptions changed decisions. The operator requested this continuing hourly cadence.
