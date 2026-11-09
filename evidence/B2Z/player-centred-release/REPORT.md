# B2Z player-centred release candidate

**Source qualification complete; candidate available for production approval.**
Published source `984a1aacdf807072f867963eef776b1db6c7ffe0` passes all six substantive jobs in
[run 42668858702](https://github.com/aodl/balls-2-the-wallz/actions/runs/42668858702). No production deployment or live setting change was
authorised or performed. The previous failures below remain historical evidence.

## Final exact-source CI

[Reviewed job conclusions and input equality](ci-correction/hosted-42668858702.json):

| Required substantive gate | Conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | PASS |
| S14 and million-cell installed-IC qualification | PASS |

The informational production-inventory job is not qualification. The complete
hosted gate, including sustained assertions, passed; no focused subset, skipped
job or renamed job substitutes for it. This is a hosted job conclusion from the
actual GitHub API, not an independent reinspection of inaccessible job artifacts.

Frozen runtime source remains `d9cf54235623cbaa8432311561cfd0e5b9275e8c`.
All frozen runtime inputs are byte-identical in the qualified source (verified
against Git objects); all 15 frozen files and manifest hashes verify unchanged.
No rebuild, replacement artifact, production update or extra source push follows
this evidence-only record. Its later local documentation commit is distinct from
the published qualified source and changes no executable/test/build/dependency
input. No additional push is needed to qualify `984a1aacdf807072f867963eef776b1db6c7ffe0`.

The hosted pass does not erase the local startup/stall failures or establish
their precise cause. Those remain valid observations under their recorded
conditions. Software-renderer measurements are not a hardware smoothness pass;
physical-phone, native-keyboard, actual-wallet, receipt-association and population
limits remain as documented. This candidate still requires separate production
approval and actual served-asset verification after any authorised publication.

## Installed seam setup follow-up

[Run 42617695852 and all six conclusions](ci-correction/hosted-42617695852.json).
The owner supplied the exact three failing case names. [Local diagnosis and
preserved failures](ci-correction/seam-followup.json) confirm torus fails at card
visibility and million at visible memo text after panning to the seam. UX-03/12
intentionally hide an offscreen cannon's anchored card behind Locate. The test
now uses that actual control and verifies clock, queue and cannon identity before
retaining the exact `MOVE 0` wallet assertions. Both million variants share this
setup function. This supersedes docked-card assumptions, not financial/security
assertions. No application, backend or dependency changed.

The corrected torus installed case passes completely in 419.6 s, including
independent replay and the unchanged 90-second measurement: ~1.00 displayed
ticks/s, zero stalls/resyncs. Million setup/memo checks pass. Its first local run
then fails 60-second startup with fetches up to 10.6 s and three resyncs while
torus replay overlapped. An isolated run passes startup but fails the unchanged
Normal window: seven stalled samples, three resyncs, .309 displayed ticks/s versus
1.023 backend ticks/s, fetch/artifact maxima ~16–17 s. Neither failure is relabelled.

One baseline comparison uses the existing detached `2491d55` checkout, identical
lock and backend artifacts, actual pinned-root prebuilt-assets route, same fixture
and assertions. Its first run observes background recovery between browser RPCs,
so the newly added identity guard cannot attribute that change to navigation.
The guard now compares real clock/queue/cannon references within the same JS turn
as the actual Locate handler. It still rejects handler-induced changes. The
baseline comparison then fails the existing 60-second startup condition too.
This supports keeping environment/delivery uncertainty separate from the repaired
seam assertions, but proves neither an exact cause nor a candidate performance
pass. No runtime, startup or safety budget changed. Each repetition follows a
recorded harness correction or the single stated contention comparison; no failed
run is discarded or relabelled. These failed measurements remain a qualification
limitation. No further timing reruns or tuning are performed.

No local repeat of the unchanged 900-second sustained window is claimed. Both
million variants share the corrected setup before their unchanged measurement
branches. The full new hosted gate remains mandatory, including all sustained
assertions; no focused pass or old evidence waives it.

All **199 Python tool tests** pass (47.8 s, zero failures/skips). The actual
maintained Locate helper is also checked against the unchanged real component
fixture/pinned clock: it reaches the offscreen card and preserves actual clock/
queue identity; independently injected clock and queue replacements are rejected.
That controlled fixture is not IC authenticity evidence. The genuine torus case
above supplies its installed/certificate/replay evidence. Existing 1,759 JS and
five hosted passing jobs remain prior evidence for unchanged inputs, not a waiver
of the new exact-source six-gate requirement.

CI diagnostics now include bounded tails from actual failed `browser.log` files,
so the Python assertion is visible with its Rust wrapper. A regression excludes
successful-browser noise; classification and test inventories are unchanged.

The following clean runtime/artifacts/captures remain byte-identical. This test
follow-up does not rebuild or replace them. Current UI regressions and their
UX-03/04 evidence map now include the installed seam→Locate path.

## Current corrective candidate

| Identity | Value |
| --- | --- |
| Clean runtime source | `d9cf54235623cbaa8432311561cfd0e5b9275e8c` |
| JavaScript SHA-256 | `51c7f92aeb0d648c0231fed979218005cbc553b264cf85877c603b549b96f370` |
| Complete 15-file manifest SHA-256 | `be6214af8ba24c09dcdc5c5706044b37a00eb8c986d2bc3f47d7c9028a8d4ea9` |
| Builder manifest SHA-256 | `fa165fac7512d4724e88b8356619297304eae88af2c9dc7c7e4df08f6caa1fa2` |
| Provenance | `source_dirty: false` |

[Complete files](ci-correction/frontend-files.json),
[builder provenance](ci-correction/frontend-build-manifest.json),
[freeze/difference record](ci-correction/freeze.json),
[local-check input linkage](ci-correction/local-inputs.json).
All 15 files verify. Only `app.mjs` and `build-manifest.json` differ from the previous
clean freeze; the other 13 files, dependencies, HTML/CSS and CSP are identical.
The assets are `.work/review-closeout/correction-frozen/frontend/`. The later
report/media/manifest commit changes no runtime/test/build/dependency inputs and
does not rebuild this artifact. Old manifests and assets remain preserved.

[All-file local HTTP verification](ci-correction/served-local.json) checks every
frozen byte and generated security header. [Genuine IC-root local preview](ci-correction/frozen-live.json)
checks desktop/390×844/320×640, new backend/default-account binding, exact native
clipboard values (`0.1`, backend principal, `FIRE 1 255 1`, hex
`464952452031203235352031`) and continued authenticated observation during forced
optional-telemetry failure. Clock/queue stay identical, 35 certificates verify and
admission remains available. The verified playhead is correctly waiting at the end
of coverage; no motion is invented. These are local candidate files reading IC
data, not newly deployed production files or an actual-wallet transfer test.

Refreshed actual-application populated recordings: [desktop](ci-correction/desktop.webm)
(96 s), [390×844](ci-correction/390x844.webm) (53 s),
[320×640](ci-correction/320x640.webm) (33 s).
[Desktop](ci-correction/1440x900-populated.png),
[390×844](ci-correction/390x844-populated.png),
[320×640](ci-correction/320x640-populated.png) populated screenshots and each size's
wallet/waiting images are bound by [the capture manifest](ci-correction/media.json).
They cover actual controls, aim dragging, Move/Build, coherent copy/replacement,
continuing playback through card use, minimap/seams and waiting/resumption.
Waiting uses 20× disposable time, not production timing. Existing software-frame
measurements below remain limitations, not a hardware or smoothness pass. The
renderer/per-frame paths are unchanged; only an explicit Locate adds one layout
update, so no new general benchmark campaign is substituted for review.

[Fresh read-only identities](ci-correction/production-readonly.json) confirm the
backend `612ad0d0…` and frontend `04e565b3…` modules, both controller sets and
certified European 13-node placement are preserved. [Public status](ci-correction/public-status.json)
works anonymously with SDK signature/root checks; `status_visibility = public`
already exists. No setting change is needed or made. Paid state/financial records
continue autonomously; no reset, upgrade, financial transaction or manual game
operation occurred.

[Publication/required CI](ci-correction/publication.json): owner publication of
`984a1aacdf807072f867963eef776b1db6c7ffe0` is confirmed, and its exact-source run 42668858702 passes all six
substantive gates. Earlier failed heads and local failures are retained below.
The ordinary HTTPS route in this session has lacked credentials; no credential
inspection or workaround was used. No further runtime/evidence push or production
operation is performed for this CI close-out.

## Executed correction commands

Browser commands used the existing Python 3.11 browser virtualenv and
`LD_LIBRARY_PATH=/home/codexdev/.cache/browser-libs/root/usr/lib/x86_64-linux-gnu`.
No test framework, dependency pin or normal build process changed.

```sh
.work/browser-venv/bin/python -B tools/check.py source --output .work/review-closeout/correction-source
.work/browser-venv/bin/python -B tools/verify_playability_actions.py --output .work/review-closeout/locate-browser
.work/browser-venv/bin/python -B tools/verify_playability_actions.py --visual-review --output .work/review-closeout/correction-visual
node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/review-closeout/correction-frozen/frontend
```

The installed focused case reused the already checked disposable Wasms and binary
through existing runner helpers, with `DFX_IDENTITY=codex_local`:

```sh
.work/browser-venv/bin/python -B .work/review-closeout/reproduce-installed-browser.py deployed_bundle_live_index_payments_reconnect_and_upgrade .work/review-closeout/installed-browser-qualified
```

Its exact binary command, unchanged deadline, artifact hashes and result are in
[the installed-case record](ci-correction/installed-case.json). A new independent
reproduction can use the maintained `tools/verify_s14_local.py --test-filter`
entry point; it rebuilds disposable artifacts and is not a production procedure.

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
candidate. The clean corrective source/complete asset freeze is recorded above
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
