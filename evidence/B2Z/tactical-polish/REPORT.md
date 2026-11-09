# B2Z tactical frontend candidate

Implementation is frontend-only. This candidate is **not deployed or approved for
production**. Exact-source hosted qualification and its concrete remaining actions
are recorded in the close-out below. No backend, setting, controller or financial
operation is authorised or performed by this release.

## Changes and confirmed causes

- Shared displayed-copy picking now resolves hover and activation together, with
  practical base/barrel hit areas, captured aim ownership and overlay exclusion.
  Legal hover never changes the draft. Chosen Move/Build retains a distinct contour
  and ghost; invalid hover has a cross and cannot retarget a chosen packet.
- The diamond overview uses the arena's exact projection/inverse for atlas,
  footprint, markers and keyboard navigation. Transparent corners pass through;
  captured edge drags keep the last valid location. Main camera limits are unchanged.
- Grid filtering now differentiates continuous coordinates before wrapping; the
  torus uses top planes without false outer side walls. Bounded historical worlds
  retain depth. GPU testing also exposed an inherited atlas upload defect:
  multi-row ranges were interpreted by pinned Three as single rows. Large ownership
  changes could leave stale GPU colour despite correct CPU data. Valid single-row
  partial uploads (≤32) or one bounded full persistent-atlas upload now replace
  invalid oversized ranges. No ownership/physics data is modified.
- Gunmetal bodies retain stable owner accents and readable muzzles. A local
  selected-cannon barrel override uses the final canonical encoded aim only at the
  matching displayed location. Latest-state differences use a ghost. A light 2px
  guide with dark 4px underlay extends past the handle, with a short direction tip.
- White cores and batched camera-facing halos remain depth-tested. Short bounded
  displacement histories drive inner/outer tails and 20% transient cell darkening,
  fading over 350ms. Stationary/camera/resync motion creates no travel effect;
  the atlas and minimap are never darkened.
- Graphite cards, consistent tokens, deliberate hover/press/focus/disabled states,
  a local 28px reticle with 14×14 hotspot/native fallback and readable dominant
  amounts preserve the single nonmodal composer and exact wallet instructions.
- Hidden scheduling no longer wakes at 250ms just to skip work. Due-time checks
  use 15s observation/60s operational refresh when hidden but executing. One
  verification pipeline compacts only retained verified coverage before capacity
  checks. Return preserves useful clocks/queues and at most two seconds of recent
  supported-rate lag; an unchanged root no longer forces an endpoint reset.
  Frozen/BFCache pages disarm work; discard uses normal authenticated boot.
  Scoped finite SDK fetch deadlines reach underlying reads without changing
  optional telemetry or global fetch. No certificate/anti-rollback rule changed.

## Maintained contracts and qualification

The normative [UX specification](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
retains UX-01..13 and maps tactical changes under UX-02/03/04/05/11/12. Financial
UX-07..10/13 remain intact. Only square-map orientation, bright passing-cell effects,
the old tail cap and unconditional hidden observation suspension are superseded.
Primary references and adopted hierarchy/contrast/lifecycle principles are linked
in that specification; no borrowed assets, new framework or dependency update.

Raw local evidence is under `.work/tactical-polish/`. Failed/incomplete development
attempts are retained, including unavailable Python/browser-library setup, an old
square-map click assertion, a debug-inspection scope error, a CSP string-evaluation
harness error, an offscreen hover probe, browser crashes/timeouts and the GPU
comparison that diagnosed stale atlas uploads. They are not relabelled passes.

Executed focused regressions: **266 PASS**, including canonical quote/memo bytes,
identity/subaccounts, frozen-copy replacement, optional telemetry isolation,
pacing/status, torus/projection, lifecycle scheduling, underlying SDK cancellation,
bounded warm return and reflected/seam effect expiry. Command:

```sh
node --test --test-concurrency=1 tests/js/tactical-polish.test.mjs tests/js/player-*.test.mjs tests/js/ux-*.test.mjs tests/js/mainnet-policy.test.mjs tests/js/public-cycle*.test.mjs tests/js/action-quote-v6.test.mjs tests/js/arcade-pricing.test.mjs tests/js/memo*.test.mjs tests/js/text-memo.test.mjs
```

The broad `python3.11 -B tools/check.py source --output .work/tactical-polish/source`
is **FAIL/incomplete**: node-tests reached its outer 300s limit (313.722s observed),
and source-structure its 180s limit (187.955s). Neither produced an assertion
failure; the exact cause of all broad-run delay is not established. Vector/reference,
docs and Python tool checks passed. This is not a complete source pass. Safety
budgets/assertions were not weakened. Hosted exact-source CI must resolve it.

All six jobs in `.github/workflows/verification.yml` remain required: Source
conformance; Native conformance; Packaged DTR and clean consumers; Runtime-lab Wasm;
Browser HTTP and Web Crypto; S14 and million-cell installed-IC qualification.
The informational BLOCKED production inventory is not qualification. Prior green
984a1aa CI does not qualify these changed inputs.

## Visual/performance coverage and limits

Actual populated fixtures use maintained canonical outputs and the real composer,
camera, shell and renderer. They are not IC certificate or payment evidence.
`verify_tactical_browser.py` passes desktop/390×844/320×640 interaction checks;
`verify_tactical_grid.py` compares actual shader seam/interior pixel crops at
DPR 1/1.25/1.5/2, fractional/play/max zoom and all seams/corners (96 comparisons, PASS). A deliberately defective test-only variant changing only `fwidth(ground)` back to `fwidth(cell)` fails at scale 9.37 with 3.125% of channel samples differing by >8, versus the fixed variant passing the unchanged 2.5% tolerance. That isolates the derivative discontinuity from top-plane geometry and atlas data; it is not a release artifact. Final reviewed
media and exact artifacts are recorded below, separately from development captures.

The matched six-entity seam sample is software ANGLE/SwiftShader, 5 seconds per
viewport, without video. Baseline frame p95 ~16.8ms; candidate ~16.7–16.8ms.
Candidate draw CPU p95 2.30/2.10/1.50ms (desktop/390/320), versus baseline
2.30/2.00/2.10ms. Static cached scenes are not a populated moving-game smoothness
pass. Geometry/atlas/effect limits stay bounded; detailed raw metrics include
CPU-task duration, heap, draw calls and buffers. The first empty-view sample is
retained and excluded from the populated comparison. Video-encoded samples are
visual evidence only. Physical phones, native keyboards, actual wallets and
hardware-backed performance are unavailable; no aesthetic acceptance is invented.

Headless Chromium reports both tabs visible. Controlled hidden-clock tests are
not real OS-hidden execution evidence. The original CDP freeze/resume attempt did not emit the required real lifecycle
events and timed out; it is FAIL, not suspension evidence. The corrected probe
requires actual tab hiding, keeps ordinary throttling enabled and reports BLOCKED
when the browser reports both tabs visible; no background freshness guarantee or anti-suspension workaround exists.
Residual independent read cost in two tabs is documented, not concealed by new
coordination infrastructure. Receipt association remains unsupported; copied
instructions are not payment proof. No real transfer or paid test scene is used.

## Production preservation and continuation

Read-only certified metadata refresh verifies backend module
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`, unchanged
controllers and the expected 13-node European subnet. Aliases remain backend
`s5ir5-gqaaa-aaaas-amyna-cai`, frontend `s2jxj-liaaa-aaaas-amynq-cai`; default
AccountIdentifier `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
The prior deployed asset manifest and actual files are retained for rollback;
this task performs neither deployment nor rollback. Preserve all paid state,
source cursor, pending payments/treasury plans and ordinary autonomous processing.

After all six exact-source gates and visual review pass, request one explicit
release decision. Only then follow the [installed-game asset-only procedure](../../../docs/operations/S14_OPERATOR.md),
refresh actual modules/state/controllers and verify every served asset/header.
The same asset-only route can restore the retained previous set under bounded
rollback authority. Never invoke backend install/reset/activation. No production
change is implied by a local build or source publication.

## Frozen candidate and remaining release gates

**Final frozen runtime source:** `031a8dfa0bbd797176fe52557ef8676dfc26451a`.
The later commit containing this completed record changes qualification tests and reviewed evidence/documentation
only; it does not change runtime/dependency/build inputs. Its Git identity is the source candidate to publish/qualify; runtime inputs
remain those of the clean frozen source. No existing CI run was superseded.

| Frozen identity | SHA-256 |
| --- | --- |
| JavaScript | `f993f930255435766eeeb65b960d06a189372f6fcd057768458fc33446272fde` |
| Complete file manifest | `a7eb5d4a57df813a669d0dcdb46978f7984d937678a83935a719f23425c95cc2` |

[Complete manifest](frontend-files.json), [builder provenance](frontend-build-manifest.json).
All **16 actual files** were independently hashed/size-checked. Fifteen are public
HTTP assets; `.ic-assets.json5` is consumed upload configuration. Its bytes,
including CSP/security headers, equal the prior deployed policy. New cursor bytes
are included. Frozen files remain at `.work/tactical-polish/frozen-final/frontend/`.
Older intermediate frozen directories are superseded development artifacts, not
alternatives to install. Replacement builds were necessary for the muzzle-axis,
bounded long-return, hidden-resize, shared-token/contour and delayed-reply fixes;
dirty intermediate builds were rejected, and the final isolated source is clean; no rebuild occurred merely for evidence.

The established build command was:

```sh
node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/tactical-polish/frozen-final/frontend
```

That directory already exists and must not be overwritten. Its manifest records
`source_dirty: false`. Dependency locks, backend/kernel/protocol code and deployment
mappings are unchanged. The previous deployed 15-file set was independently fetched
and verified: [rollback check](rollback-verification.json), actual retained files
`.work/tactical-polish/rollback/`. Live JavaScript remains `51c7f92a…`, not this candidate.

[CI status](ci-status.json): all six substantive hosted jobs are **NOT_RUN** for
this candidate. The ordinary permitted push failed because Git cannot obtain an
HTTPS username with terminal prompts disabled. No credential was inspected,
requested in logs or bypassed. The last observed remote is `4f902870…`.
The completion response provides the exact ordinary non-force continuation for
the resulting evidence/source head. Publishing that head must trigger all six
jobs; this commit deliberately has no skip-CI marker. The old 984a1aa pass does
not qualify it. [Development source failures](development-source-result.json)
remain FAIL/incomplete; no full repository pass is claimed.

## Actual browser and visual evidence

[Functional matrix](functional-browser.json): desktop, 390×844 and 320×640 pass,
plus reduced motion, text scaling/viewport contraction, touch/pinch/cancel,
account-caret preservation and three verified disposable slow intervals.
It exercises actual maintained components with synthetic canonical state, not
mainnet financial admission. These checks were executed before the final
presentation/return freshness guards; unchanged composer, memo, identity,
pricing, storage and observation trust inputs justify financial evidence reuse.
The final canonical warm-return tests pass separately. Exact-source CI must still
execute the final tree. No local subset is promoted to that qualification.

[Fixture provenance](fixture-provenance.json) independently rebuilds the test fixture
in memory and proves byte equality with current maintained renderer/composer
inputs. Final captures below use those same inputs; no generated mock-ups or fake
cursor were inserted. [Visual result](visual-review.json), [timing provenance](visual-timing-provenance.json):

| View | Populated arena | Wallet instructions | Waiting | Actual recording |
| --- | --- | --- | --- | --- |
| Desktop | [capture](1440-populated.png) | [capture](1440-wallet.png) | [capture](1440-waiting.png) | [journey](1440-journey.webm) |
| 390×844 | [capture](390-populated.png) | [capture](390-wallet.png) | [capture](390-waiting.png) | [journey](390-journey.webm) |
| 320×640 | [capture](320-populated.png) | [capture](320-wallet.png) | [capture](320-waiting.png) | [journey](320-journey.webm) |

Recordings cover hover, handle drag/barrel/guide, exact copies and explicit
replacement, close/reopen during verified motion, Move selection, Build ghost,
diamond navigation, seam travel and genuine waiting/resumption within fixture
coverage. They use **100× disposable wall time**, not production cadence.
The recorded 20× desktop attempt hit its existing 15s drain deadline under
software-renderer/encoding load and remains [failed](release-visual.log).
The functional no-video 20× checks pass; their assertion/deadline was unchanged.
Video may omit the OS pointer; computed local SVG/native fallback was checked,
but no native-pointer/physical-phone capture is claimed. Real OS-hidden return
is absent from these clips and remains a qualification gap.

The grid result is [96 actual pixel comparisons](shader-comparisons.json): maximum
mean channel difference 0.0525 and no channel difference >8, against fixed limits
1.5 mean / 2.5% channels >8. The [negative derivative variant](shader-negative.json)
fails the same limits, isolating the wrapped-derivative cause from atlas and top-plane
geometry. The old side-wall contribution to the owner's precise incident was not
independently measured; its removal follows the torus having no physical outer wall.
Existing canonical atlas/corner/ownership tests remain; the flat-colour pixel matrix
does not pretend to be an exhaustive cross-owner GPU boundary measurement.

## Performance and lifecycle limits

[Complete matched measurements](performance.json) retain five-second unencoded
windows on ANGLE/SwiftShader. Six-entity seam scene:
[desktop before](1440-before.png) / [after](1440-after.png),
[390 before](390-before.png) / [after](390-after.png),
[320 before](320-before.png) / [after](320-after.png).
The moving sample uses the same canonical active-cannon/ball fixture and pace in
both versions, with actual effects and UI/layout work. No hardware is inferred.

| View | Moving baseline frame p50/p95 | Moving candidate frame p50/p95 | Candidate draw CPU p95 | Moving draw calls, baseline→candidate |
| --- | --- | --- | --- | --- |
| Desktop | 266.7 / 1083.3 ms | 283.4 / 450.0 ms | 27.0 ms | 9→12 |
| 390×844 | 116.6 / 150.0 ms | 83.4 / 166.6 ms | 18.7 ms | 9→12 |
| 320×640 | 66.7 / 100.1 ms | 100.0 / 133.4 ms | 28.6 ms | 9→12 |

These small, contended software samples are **not a smoothness pass**; narrow p95
is worse in this sample. CPU task use is roughly the full five-second moving
window in both versions. The static cached six-entity scene does not establish
moving-game FPS. Atlas remains 4 MB, instances/effects/history remain capped and
no per-frame atlas reconstruction was introduced. No specific additional bottleneck
was isolated sufficiently to justify removing requested visual features or tuning
backend/authentication. Hardware-backed motion review remains needed.

[Actual visibility probe](visibility.json) is **BLOCKED**: the headless browser
reports both tabs visible. The built normal frontend genuinely booted and verified
the live backend/default source with the IC certificate verifier before this check.
The earlier 35-second CDP attempt did not emit freeze/resume and timed out; it is
not proof that the browser executed hidden work. No latency/hidden-byte/CPU/memory
numbers are fabricated for that unsupported state. Controlled tests prove due-time
single flight, stop/resume, pending-read cancellation, old-interval retention and
bounded long-return points; they do not replace real lifecycle evidence.

For an environment with an actual display, the bounded read-only continuation is:

```sh
.work/browser-venv/bin/python -B tools/verify_warm_browser.py --headed --assets .work/tactical-polish/frozen-final/frontend --output .work/tactical-polish/actual-hidden-review
```

Keep throttling enabled. It must actually observe `document.hidden`, record the
>30-second interval and two-tab behaviour, then measure verified return. Frozen,
BFCache/discard and offline/epoch races beyond controlled tests are not falsely
claimed as real-browser passes. This gap and all six hosted jobs remain open.

No production write occurred: paid entities/history, Ledger-only command authority,
backend module, controllers, settings, economics, pacing and independent source/
treasury processing remain untouched. [Certified production identity refresh](production-identities.json)
and the unchanged served rollback set document that boundary. The candidate is
prepared for review and source publication, **not yet fully release-qualified**.


## Final current-artifact checks

The final ordinary bundle itself passes [read-only authenticated browser smoke](frozen-bundle-browser.json):
IC-root verification of the real backend/source, principal/default destination,
exact canonical `FIRE 1 255 1` UTF-8 copy, explicit Keep previous, no-refund warning,
and unchanged clock/queue through account/action panels. [Actual frozen-bundle wallet](frozen-bundle-wallet.png).
All browser POSTs are query/read_state. No real transfer, signing, login or payment
report was used. This is distinct from the synthetic populated media.

The final [freshness/race checks](return-fencing.log) pass (18 checks, a subset of
266): pre-hide health generations and over-age replies are rejected; actual
certificate age cannot be made fresh by a late receive or paused monotonic clock;
fresh slow-tier information rebases retained coverage without another publication.
The five-minute certificate verifier and financial rules are unchanged. Health
freshness remains advisory, distinct from authenticated gameplay. Normal operation
and copy/observation independence pass in the final bundle; real hidden/frozen
browser transitions remain unqualified here.

[Real seam-drag regression](cursor-seam.json) / [recording](seam-pan.webm) verifies
that press alone does not show grabbing, actual drag does, and camera y wraps
999.5→0.4234 without a map cut. Its one automation-observed response was 388.9ms,
including CDP/renderer scheduling, **not** native device latency or a responsiveness
pass. This exact maintained helper is now invoked by the existing browser matrix.
The normal SVG/fallback remains system cursor rendering; recordings can omit it.

[Current signed production asset inventory](production-inventory.json) still has
exactly the old fourteen public keys. All old served bytes were retained and
matched before work; production is still the preceding player-centred release.
No asset publication, backend mutation or canister setting change occurred.

Only the reviewed final frozen directory is a release candidate. The remaining
source continuation must publish the final qualification/evidence head without
force and obtain six substantive passing conclusions. A real display must also
complete the >30-second hidden return/metrics review, and the software performance
limits above must remain visible at the release decision. No production permission
is requested or assumed in this report.
