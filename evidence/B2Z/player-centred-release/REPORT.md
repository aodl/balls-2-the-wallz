# B2Z player-centred release candidate

**Not ready for production approval:** the published parent
`9b15cf0714bc85cca245fc918664767ed18553fb` failed two substantive hosted gates.
The focused follow-up fixes immediate Locate card recovery and corrects stale
installed-browser expectations. New exact-source CI is required; production
operations remain outside this task's authority.

## Focused CI correction

[Locate regression](locate-regression.json) records the owner-supplied 390×844
traceback and controlled before/after results. Previously the camera changed but
the card stayed offscreen/inert until the next animation frame. Calling the existing
`position()` in the Locate handler makes the card immediately reachable. The new
single-turn regression prevents a frame from hiding the defect and preserves the
original actual-pointer assertions. [Full recorded browser result](locate-browser.json)
passes seven groups, including all three viewports, exact coherent copies,
clock/queue identity/progress, reduced motion and waiting/resume.

The installed browser case reproduced an obsolete `ANGLE 37.5` assertion after
Account/inspection closed the draft. UX-12 deliberately uses the current cannon
heading or screen-up where the legacy v3 schema has no heading. The test now
requires screen 0 / exact `ANGLE 225` in that legacy fresh action, and explicitly
enters screen 167.15 / `ANGLE 37.5` for the retained resize/authenticated-restart
persistence checks. The initial exact `ANGLE 37.5`/UTF-8 copy assertions and all
payment, receipt, replay and security assertions remain. The legacy case now
asserts Build is hidden, rather than clicking an unsupported v6 action; populated
current-rules Build/site/ghost/memo checks remain in the full three-viewport journey. An intermediate added
assertion incorrectly assumed v3 stored headings; that failed local attempt is
preserved and corrected, not presented as a game defect.

The full local integration reproduction is preserved as incomplete: on the shared
two-core host it spent over six minutes in the unchanged first pacing benchmark,
which took about 90 seconds in retained hosted evidence. It was stopped cleanly
and diagnosis narrowed to the existing affected installed case using the exact
already-built normal/test Wasms and unchanged 900-second deadline. This does not
establish the cause of the inaccessible hosted integration failure or qualify the
full suite. Build/setup and 50 host tests passed before that interruption.

`tools/check.py` now exposes existing nested S14 failure names, reasons, durations
and bounded log tails in the hosted console. Two regressions prove diagnostics do
not change evidence/classification and explicitly report unavailable nested output.
No workflow, deadline, assertion budget, certificate policy or backend code changed.

[Corrected installed case](ci-correction/installed-case.json) passes in 374.5 s:
115 exact replayed publications, Ledger inputs 1/2/3 once, real native clipboard
bytes, three accepted outcomes, 35-second controlled suspension recovery,
retention-gap reconnect after disposable upgrade, negative configuration/root
checks and reduced motion. [Browser details](ci-correction/installed-browser.json),
[all failed/incomplete attempts](ci-correction/diagnosis.json). This is one focused
installed case, not the full S14/million-cell suite. Its measured Normal window is
34.7 s, displayed .983 ticks/s, produced .981, zero stalled samples; synthetic
setup and local recovery are not production/hardware performance claims.

[Consolidated local source check](ci-correction/source.json) passes all planned
checks: 1,759 JS and 198 Python tests, zero skips/failures. Node completes in
290.8 s within the unchanged 300 s allowance. Focused workspace/heading/cycle
checks pass 33/33; CI diagnostic checks pass 21/21 (overlapping subsets, not extra
unique totals). Each installed rerun follows a recorded harness correction; no
runtime safety budget changed. These local checks ran before the corrective
commit; their executable input hashes are bound to that clean source below, and
do not substitute for its still-required hosted CI.

The earlier source/artifact record below remains identifiable as the previous
candidate. A clean corrective source/complete asset freeze is recorded separately
after local verification; the old manifests and captures are not overwritten.

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

- Complete frozen-source wrapper: PASS, 1,759 JavaScript tests, 196 Python tests and all
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
  pass (40.5/44.5 s), and the complete frozen candidate source suite passes. The earlier 1,758-test development pass is retained separately; the final 1,759-test pass includes queued-callback fencing. The
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

## Previous clean freeze and failed hosted CI — preserved

The owner published `9b15cf0714bc85cca245fc918664767ed18553fb`; the remote head
was checked directly and agrees. Runtime source remains
`3ec1cb5d40b3cde5a1014e79a590649f835b9df1`; the published descendant changes only
documentation/evidence. No frozen artifact was rebuilt for this publication.

| Frozen identity | Value |
| --- | --- |
| Normal runtime source | `3ec1cb5d40b3cde5a1014e79a590649f835b9df1` |
| JavaScript SHA-256 | `8ecd824ff2bc37bafcbfdbe524fd7393634d7a6d293ba255f3df076bedda4532` |
| Builder manifest SHA-256 | `36b6d2e2b91084c0360a2f6da9081a1b4cfb4ba19b5092286a21ba2d1b8e7b4b` |
| Complete 15-file manifest SHA-256 | `179c06783d3915ea917f9376ad6bda86c51038028d3c9b82ed98f27f7495d050` |
| Provenance | `source_dirty: false` |

[Complete files](frontend-files.json), [builder provenance](frontend-build-manifest.json)
and [frozen input identities](frozen-runtime-inputs.json) make this independently
checkable. The assets remain at `.work/review-closeout/frozen/frontend/`; none
were uploaded. Only `app.mjs` and `build-manifest.json` differ from the dirty review
bundle. The other 13 files, including HTML/CSS, configuration, backend binding and
CSP/security policy, are byte-identical. The dirty manifest remains historical.
The runtime was frozen once from the clean source commit. This later evidence/docs
commit changes no runtime, dependency, build or test input and does not rebuild it.

The exact-head [verification run 42584741125](https://github.com/aodl/balls-2-the-wallz/actions/runs/42584741125)
was refreshed through the public API. [Current job evidence](hosted-ci.json):

| Required substantive gate | Conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | FAIL |
| S14 and million-cell installed-IC qualification | FAIL |

The browser job's HTTP/Web Crypto step passed; the later human-interface journey
failed at immediate Locate card visibility on 390×844, as supplied by the owner.
Public logs return HTTP 403 and artifact download HTTP 401. The supplied integration
wrapper and Node20 Actions deprecation warning do not identify the nested test.
The focused local installed diagnosis is recorded above; it is not claimed to be
the inaccessible hosted traceback.

The faithful pre-correction local browser invocation passed all seven groups,
[retained here](hosted-browser-local-reproduction.json). A lucky local pass did not
waive the hosted failure; the same-turn Locate regression then reproduced it.
All six gates remain mandatory. The inventory job supplies no qualification.
No production deployment or settings change is permitted by this task.

## Exact frozen-bundle read-only verification and preservation

[Read-only preview result](frozen-live.json) served the exact frozen JavaScript and
security headers locally, with genuine mainnet-root DTR/certificate/source checks.
At desktop, 390×844 and 320×640, native amount/recipient/memo/hex copies matched:
`0.1`, `s5ir5-gqaaa-aaaas-amyna-cai`, `FIRE 1 255 1` and
`464952452031203235352031`. These are observations of that verified quote, not
hard-coded prices. Wallet fee and retention risk remain separate.

Only optional `canister_status` fetches were deliberately failed in that preview.
The compact meter stayed Unavailable; authenticated observation refreshed 35
certificates, clock/queue identity survived and safe preparation remained enabled.
Presentation correctly waited when no verified coverage existed; it did not invent
motion. All IC POSTs were queries/read_state. No transfer was sent. An initial
preview assertion used an immediate clipboard/hidden-text read; the corrected
harness awaits native clipboard completion and reads full hex content. The initial
failure remains under `.work/review-closeout/frozen-live/`; product/security code
was not changed to accommodate that harness error.

The separate [anonymous real SDK status read](public-status-final.json) succeeds
with normal root/query signatures, confirming `status_visibility = public`. No
setting change is necessary or was made. [Fresh certified identities](production-readonly.json)
match the prior backend/frontend modules, controllers, European subnet and 13 nodes:

- Backend `s5ir5-gqaaa-aaaas-amyna-cai`, module
  `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend `s2jxj-liaaa-aaaas-amynq-cai`, module
  `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Default receiving AccountIdentifier remains
  `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.

No production module, paid state, financial journal, source cursor, setting,
controller or Ledger authority was modified by this work. Legitimate autonomous
processing continued; byte equality of a running world is not claimed. Backend
code, locks, DTR and build inputs are unchanged. No install/upgrade/reset/stop/start,
former-canister operation, canister creation, payment, cycle action, subscription
or paid agent activity was performed. Receipt association, real-wallet/human-research
and actual-device limitations remain as documented. The public site still serves
the preceding release; this candidate is not deployed.
