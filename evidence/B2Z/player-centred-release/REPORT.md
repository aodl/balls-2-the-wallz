# B2Z player-centred release candidate

Source qualification is in progress. Production approval has not occurred. This
continuation permits source commit/non-force publication and CI, but no production
operation or live setting change. Backend and frontend targets remain the existing
paid European game; no financial action is part of this work.

The initial checkout was HEAD `2491d55f30125b421bedb7155db0fcac9bf0711f` on the
existing release branch, with the previous 55-file candidate staged and no
unstaged/untracked changes. The remote head agreed. Those staged changes were
preserved; the prior [dirty review evidence](../player-centred/REPORT.md), including
failed/incomplete source attempts and dirty artifact identities, remains historical.

UX-04/06/10/13 corrections bound only optional telemetry. The public status reader
uses a separate pinned SDK agent per request, request-scoped AbortSignal for query
and certificate-key fetches/body reads, zero SDK retries, and a bounded one-target
five-minute key cache through the SDK's existing store interface. It never mutates
or cancels the authenticated game agent. Timeout aborts the operation; retry awaits
settlement and uses bounded backoff. A transport ignoring abort remains explicitly
Unavailable rather than claiming Collecting or spawning overlapping replacements.
Visibility/stop fence stale results and stopped timers. Compact labels are fixed;
reset diagnostics and net-versus-gross limitations remain in expanded details.

The maintained [UX contract](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md) retains
UX-01..13 and separates development assertions, source qualification through all
six substantive hosted gates, required short visual review and separate production
approval/served-asset verification. No runtime economics, physics, backend code,
DTR, dependencies, protection floors, source reconciliation or Ledger authority changed.

## Local checks and review evidence

- Complete source wrapper: PASS, 1,758 JavaScript tests, 196 Python tests and all
  reference/structure/document checks; no skips and the existing 300-second outer
  Node allowance is unchanged. [Executed source result](local-source.json).
- Focused telemetry: 19 tests PASS, including obsolete queued-timer/deadline fencing. A recorded pre-fix never-settling regression
  failed exactly because hide/return published Collecting. Real pinned-SDK/native
  fetch tests prove timeout cancellation closes both query and certificate-key
  requests, including stalled response bodies. Retry, late success, visibility,
  stop and duplicate-loop cases are deterministic/bounded.
- Populated full browser matrix: PASS at desktop, 390×844 and 320×640, including
  reset/error caption bounds and payment-preparation independence. [Result](local-browser.json).
- [Matched baseline/candidate rules and broad-run diagnosis](broad-suite-diagnosis.json)
  preserves historical uncertainty. Both complete unchanged 22-test rules files
  pass (40.5/44.5 s), and the complete candidate source suite passes once. The
  historical cache-bypass assertion's exact cause is not established; neither its
  2-second application work budget nor any assertion/runtime rule was changed.

## Visual review package and performance

Actual populated [desktop](desktop.webm), [390×844](390x844.webm) and
[320×640](320x640.webm) recordings cover selection, aim dragging, Move/Build,
copy/replacement, close/reopen with a progressing unchanged clock, minimap/seams,
and canonical waiting/resumption. They are approximately 89/39/27 seconds.
[Capture identities/scope](media.json) binds source-module and fixture bytes.
[Byte-equivalence proof](visual-equivalence.json) shows the later optional-monitor
queued-callback fix leaves the compiled visual fixture exactly unchanged; the
mainnet bundle is frozen and checked separately.
The waiting scene uses declared accelerated disposable time; it is not IC timing
or certificate proof. No actual transfer was sent.

Populated screenshots: [desktop](1440x900-populated.png),
[390×844](390x844-populated.png), [320×640](320x640-populated.png).
Wallet and waiting screenshots for each size are in the same capture manifest.
These expose actual renderer/UI quality; they do not constitute human approval.

The bounded [ABBA seam comparison](seam-comparison.json) uses identical canonical
fixture data and the same 1440×900 browser/SDK/Three/host, three cannons/balls,
seven-second windows, no video. Baseline frame median is 150 ms; candidate median
83.3/83.4 ms. Candidate p95 varies 133.3–299.9 ms, baseline 183.4–366.7 ms.
Candidate render CPU p95 is 11.5–14.1 ms, shell/layout .8–.9 ms, status 4.3–6.2 ms;
JS heap 18.7–19.6 MB versus baseline 13.4–14.0 MB, excluding GPU/process memory.
Reduced-motion/card-closed diagnostics retain ~83 ms frame medians. The fixture
refreshes status per frame, more often than the production app's 100 ms cadence.
These probes do not establish a single causal product bottleneck or justify
removing the requested effects/UI. No rendering implementation was changed to
improve a benchmark. Prior software measurements remain preserved.

GPU is ANGLE/Vulkan SwiftShader (software), Chromium 153. Hardware smoothness,
physical-phone, native-keyboard, actual-wallet and maximum-population qualification
remain unavailable. Frame targets are not met. All six measurement rows and JSON
were written; the command session later reported teardown exit 143, retained as a
measurement limitation rather than a passing qualification gate.

## Source freeze, publication and CI

The ordinary HTTPS non-mutating push check failed: Git could not obtain a username
with terminal prompting disabled. No credentials were read/exported or alternate
credential route attempted. A clean intended source commit and normal frontend
freeze follow the local checks; exact identities and the operator's non-force
continuation will be recorded after that commit. There is no production operation
in this task. All six new-candidate hosted jobs are still required; the baseline
six-job success is [historical reference only](baseline-hosted-jobs.json).
