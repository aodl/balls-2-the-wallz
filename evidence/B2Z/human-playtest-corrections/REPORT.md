# Human playtest corrections — qualification in progress

This is a **local frontend candidate**, not a deployment or completed release.
Production and the paid backend have not been modified by this task. No transaction,
allowance, funding, setting/controller action or optional-payment activation occurred.

Starting branch: `release/btz-prelaunch-playability`; clean local head
`ec15ffd` (deployment evidence after `2315404`); remotely observed branch head
`d0d613ecfd4bb6935b2f32e93ea5b690a8b37411`. No newer runtime source was found.
Reviewed/served runtime: `b0f6c7a0cb9f3b9f9159d28d8708588fc8bc5af0`.
Actual served JS: `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`.
Served HTML/CSS/build provenance also match the approved prior freeze. The
previous complete 16-file manifest is `216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`.

Read-only production cold sessions on 12 November reproduce the complaint:
1440×900, 390×844 and 320×640 show one active ball at H=6861, an empty queue,
playhead=available=6858 and “Waiting for next update”. Verified-world acquisition
was 4.363s / 3.579s / 3.739s respectively. This fresh observation is separate from earlier ReserveProtection evidence;
no operating condition was changed. Raw observations/headers/media are retained
under `.work/human-corrections/baseline/`.

Implementation separates latest authenticated authority from one bounded historical
presentation interval; optional status/telemetry do not block world rendering.
Transient delivery retains the session and retries; integrity failures remain
blocking, and explicit verification retry retains an authenticated sequence floor.
The full-body selection, shared real/ghost part transforms, direct aiming, simplified
local composer, away-click follow cancellation and borderless minimap are implemented.
The maintained UX-01..13 contract explicitly supersedes the older interpretations.

Focused startup/lifecycle/status/transport tests pass. Initial populated component
journeys pass desktop/390/320. A new desktop native acceptance journey also passes
selection without focus, near-body aiming, outside-zone panning, model matrix
identity and status-driven panel stability. These development runs do not qualify
later edits or replace final exact-source acceptance.

The installed normal-module fixed-H startup/recovery test now passes, including
real 5/30/90/180-second delivery faults, zero action-panel drift and a wrong-root
negative control. See `certified-acceptance.json` for the reviewed measurements;
this development run predates the immutable final freeze. Complete final browser
regressions, performance comparisons, immutable clean build and exact-source
six-gate CI remain pending. Earlier failed development runs remain under their own paths;
none is counted as PASS. Remote publication and production deployment are owner
operated; this instruction authorizes neither.
