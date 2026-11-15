# Quantity availability — corrective candidate, not deployed

Qualification is in progress. Production remains the independently verified restored
75-file frontend. This report does not authorise installation or Rules9 activation.

## Reproduction and diagnosis

Starting published source: `fc2d9e1d9f2f3e0553a0eb114bfd212af64a0ddc`.
The original production failure remains in [the deployment report](../deployment/REPORT.md).
A retained canonical world and actual renderer/composer reproduced the normal public
Join → My cannon → Focus → Fire → keyboard-aim route offline. After a full second,
320×640, cell0, camera `[3.6575453715563526,3.6575453715563526,64]`, heading347.15°,
workspace8/221/304/295 and focused `aim-handle` reproduce `hidden:true` on the
rejected source. [Negative browser result](results/rejected-browser.json),
[before capture](captures/rejected-exact-pose.png).

[All13 rejected candidates](results/rejected-slot-diagnostics.json) explain the failure:
0/4 fail viewport;1–3 intersect payment;5/6 fail viewport/header/arrow;7 fails
viewport/header/sound;8/9/11/12 intersect the actual arrow;10 intersects sound.
[Native frame history](results/previous-slot.json) establishes previous slot12 at
136/67/128/44, last visible312.15°, unlocked, focus on the aim handle. The unchanged
original planner returns null, so the old shell hides a still-active editor. This
is a stable exhausted-layout failure, not a short CSS transition.

## Correction and development failures

One existing editor/model is retained. Local opposite-arrow placements remain
preferred when space permits. Fire reserves a measured rectangle above the camera
controls, replacing optional cycles telemetry while active. Essential sound, camera
and minimap controls remain. Geometrically constrained views use this dock from
opening; once docked, heading changes cannot flip it back. Contracted viewports use
a free interval computed around measured fixed controls. Exceptionally short
viewports share the toolbar with Close and temporarily yield secondary chrome;
Escape/Close restores it. There is no numeric payment input or duplicate editor.

An initial second-toolbar-row design fixed disappearance but **failed** the existing
320px refinement requirement: payment scrolling fell from241px to187px. It was
rejected. The control-rail reservation preserves the normal240px-or-natural-content
requirement and the contracted96px minimum. No assertion or tolerance was weakened.
Intermediate development failures remain recorded, including a fractional-height
settling mismatch and an out-of-scope local-variable reference caught immediately
by browser error capture; neither is a final qualified candidate.

Measured visual-viewport offsets, safe insets and full130×46 editor dimensions
control placement. Buttons remain44×44. Transparent rounded corners remain DOM-owned.
Pointer/focus/canvas capture fixes the editor's physical target; genuine viewport
change cancels/fences a pending release before relocation. A fresh press is usable.
Guide clipping uses the actual rectangle on the same ray, without heading changes.
Audio masks include only the actual editor; empty reservation and hidden telemetry
are excluded. No audio engine, account routing, memo, backend or dependency change.

## Evidence scopes and remaining qualification

The retained fixture proves application geometry and native input, not IC authenticity.
The maintained regression is `tools/verify_quantity_browser.py`; the full heading
sweep is `tests/js/quantity-dock.test.mjs`. Native checks cover availability, full
bounds/hit testing, both dock transitions, mouse/touch/keyboard, cancelled releases,
pinch, exact-copy Update/Keep, status-only zero drift and unchanged payment identity.
Final executed results, frozen identities and six hosted conclusions will be added
below; historical green CI does not qualify these changed bytes.

## Read-only operating picture

[Timestamped authenticated observation and policy](results/operating-picture.json)
showed that the historical protection condition had changed by collection: Rules7,
Trickle, admission open, source bound/healthy, zero pending records. Total cycles
2,785,487,015,639; liquid2,729,154,254,549 at the recorded read. The backend module
remains `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
No cause for the balance change is inferred and no funding operation was performed.
The deployed policy requires1.25T liquid to leave ReserveProtection, forces protection
below1T, and retains it in between. No runway or top-up requirement is invented.
Protection is tested separately in fixtures: local quantity edits remain available
while copying stays disabled. Current live readiness must be rechecked, never overridden.

## Production boundary and release proposal

Production/frontend rollback remains75 files,74 public:
JS `97d8ee0bf61e8b76816511772ab348962d56bbf78b597acc365f48a38725cdc9`;
inventory `e9b5c4be2216420f6f70d7c3f33f3ef4596b7d56e05c06eae43171fd629cb8c1`.
The retained rollback directory and existing `.work/s14/assets` have not been replaced.
After new qualification and a separate owner decision, stage the complete new freeze,
verify every file, use only the maintained observer asset-only procedure, independently
verify all served bytes/certificates/headers, then repeat exact320px native aiming
and full editor hit testing before accepting deployment. A serious regression means
restore only the retained75-file frontend and verify all74 public assets. Do not
roll back, fund, resume or otherwise modify the paid backend.

P09 remains FAIL/unqualified. Physical devices, headphones/Bluetooth, Firefox audible
output and unsupported BFCache remain NOT VERIFIED. Software-rendered/emulated
viewports and native browser input do not prove physical-mobile performance or
subjective listening quality. The completed music, effects and source-core hashes
must remain unchanged; this placement correction does not resolve audio limitations.

## Frozen replacement

| Artifact | Identity |
|---|---|
| Clean runtime/build source | `0f55cbb0356b0bb90979bb515f907383efe940a9` |
| JavaScript SHA-256 | `3ee92eee3dda006c57f2dd17779e0e4babb947dc54942c6bd4998b975ebedbb2` |
| Complete78-file inventory SHA-256 | `4606757478a113e7a682f0077b69155e9455b2bf60624066c608b7b8168526be` |
| Audio manifest SHA-256 | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |

[Complete inventory](frontend-inventory.json), [freeze assertions](results/freeze.json)
and [220 consumed input hashes](results/source-input-parity.json) prove the replacement.
Only `quantity-placement.mjs`, `shell.mjs`, `style.css` differ among consumed inputs;
only app/style/build-manifest differ among upload files. All audio files,51 approved
music cores, configuration, upload policy, backend/interface and dependencies match
the failed78-file freeze. The separate restored75-file rollback is untouched.

A browser test initially sampled immediately after a desktop→320px viewport command,
before the normal resize event reached the game (camera still1440px wide). Its
editor was correctly offscreen under that stale camera. The test now waits for the
real camera viewport to match before assessing settled geometry; it does not call
internal positioning routines or permit an invisible editor for a visible cannon.
The original capture and assertions remain. Resize-during-press still exercises the
unsettled interval and requires its release fence to reject a late edit.

The related compact regression completed all three viewport payment/quantity/copy
journeys, then exposed a pre-existing entry-matrix bootstrap race: `!!fixture`
throws ReferenceError before its module defines that global. It now polls
`Boolean(globalThis.fixture)`, preserving every returning-account assertion. This
is a test-only correction, not a runtime change or acceptance of partial startup.
The failure log remains retained. A superseded hosted attempt, if cancelled by the
normal branch concurrency policy, must not be reported as a six-gate pass.
