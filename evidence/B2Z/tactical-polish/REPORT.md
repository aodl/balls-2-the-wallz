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

Executed focused regressions: **264 PASS**, including canonical quote/memo bytes,
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
