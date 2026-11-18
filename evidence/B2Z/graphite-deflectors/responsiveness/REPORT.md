# Graphite responsiveness release

The exact adaptive graphite frontend was installed on the European asset canister in a scoped frontend-only upload. Rules12 remains on its certified normal backend module, with the existing source binding and Trickle policy. No payments or funding were sent. [Live B2Z](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/) · [Release procedure and retained rollback](FRONTEND_RELEASE.md)

## What changed

The populated one-cannon, one-ball baseline reproduced multi-second startup and stalls during local aiming and action switching. The atomic observation query transferred redundant artifacts before discovering that its head was unchanged. The new viewer keeps bundled startup, overlaps source and configuration with required artifacts and bounded history, and polls certificate-bearing observations without re-fetching immutable artifacts. New head artifacts still undergo exact binding checks before authorization. Production JavaScript is minified. Local pointer aim is coalesced, status updates no longer recompute placement, and the renderer chooses a sustainable backing while removing panel backdrop filters.

Matched desktop median cold startup fell from **1.86 s to 1.57 s** across three cold loads each. Compressed JavaScript fell **455 KB to 317 KB**, and unchanged-head replies fell **25.6 KB to 6.5 KB**. Desktop frame p95 fell **183 ms to 150 ms**, and a reverse-order repeat fell **167 ms to 133 ms**. The first 320×640 run improved **83 ms to 67 ms**; its repeat was essentially unchanged. These are software-browser results. Some desktop actions still exceeded the 100 ms response target, and the longest software stalls persisted. Physical-device responsiveness and the owner's lag report remain open. [Measurements and methodology](PERFORMANCE.md)

## Visual acceptance

The longer cannon barrel, distinct collar and cap planes, dark bore and owner-coloured muzzle strip remain inside the established footprint. The Deflector's shared graphite wedge keeps all four orientations. Canonical owner colours remain local to precise accents. Selected structures retain neutral armour with a restrained material lift and contour. The opaque bevelled panel keeps the approved payment axes, restrained information blue and compact editors. The staged actual browser journey confirms the original 320×640, 347.15° pose, with readable controls and a stable toolbar. The multi-colour plate uses the actual renderer with controlled colours. [Desktop before](captures/before-1440-fire.png) · [Desktop after](captures/after-1440-fire.png) · [Mobile before](captures/before-320-fire.png) · [Mobile after](captures/after-320-fire.png) · [Idle](captures/staged-1440-idle.png) · [Selected](captures/staged-1440-selected.png) · [Aiming](captures/staged-1440-aiming.png) · [Deflector](captures/staged-1440-deflector.png) · [Colour comparison](captures/owner-colours-renderer-fixture.png) · [Recording](captures/staged-journey.webm)

## Exact release

| Item | Identity |
|---|---|
| Clean build source | `fedb50ed1c8a5e39ac0a29d247657301df58afe6` |
| Hosted qualification source | `c27197ab98be470baceab01d344302eeb1f044c6` |
| Frontend JavaScript SHA-256 | `50c8556bcdb7a24de318fba5ebb496f6b2ec5031dfaa6de10ac97974387f7df7` |
| Complete 81-file inventory SHA-256 | `137f32c93728602eafa269b031fa3325c675767211ab9e4388a079370e857cf3` |
| Previously deployed frontend recovery JavaScript | `c5b688ae74527cb30e7b50f06141d429f237eef0297ed7eba0192d268e0d8c9b` |
| Production Rules12 module SHA-256 | `2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13` |

All six substantive hosted qualification jobs passed. The informational production inventory job is separate. Only `app.mjs`, `style.css` and `build-manifest.json` changed in the public inventory. [Qualification run](https://github.com/aodl/balls-2-the-wallz/actions/runs/44371681090) · [Job record](results/hosted-ci.json) · [Frozen frontend inventory](artifacts/frontend-inventory.json)

## Live acceptance and preservation

The upload completed at 19:56 UTC on 18 November 2026. Independent checks verified all 80 public asset bodies, headers and signed inventory entries, all four gzip representations, and exact-path IC HTTP v2 proofs. The frontend asset module remained `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`. Certified Rules12 advanced normally with the same source cursor `40180669`, one cannon, one ball, and **100,000,000 e8s** previously received. Both before/after module and identity samples matched. Trickle remained at 10 milliticks/s with one tick stored and effective. No rollback was needed. [Upload](results/frontend-upload.log) · [Certified public bodies](results/live-http-certificates.json) · [Compressed proofs](results/live-gzip-http-certificates.json) · [Backend after upload](results/postdeploy-backend.json) · [Certified paid-state sample](results/paid-world-after.json)

The live origin passed authenticated startup, returning-player entry, mobile 347.15° quantity, Fire and War Cry preview, Move and Build, all four Deflector orientations, and exact clipboard and Update/Keep. A browser-local read fault disabled Copy and recovered with the same verified session, clock, queue and panel geometry. Native Chromium music recovered after 5-, 35- and 8-second tab switches in approximately 3.0–3.9 s, and explicit mute survived reload. Audio asset bytes were unchanged. No physical device or headphone check was available. [Live journey](results/live-journey.json) · [Native Copy](results/live-copy-320.json) · [Reconnect](results/live-reconnect.json) · [Native audio](captures/live-tab-return-audio.webm) · [Accessibility checks](results/accessibility.json)

On the actual deployed origin, desktop cold authenticated startup measured 1.93 s median (1.73–2.14 s, n=3) and warm startup measured 1.34 s median (1.32–1.98 s, n=3). The actual app transfer was about 317 KB versus 454 KB before. The live-sample network windows differ. The matched comparison and reverse-order interaction repeat are documented separately. [Live load checks](results/live-loads.json) · [Live desktop capture](captures/live-1440-aiming.png) · [Live mobile capture](captures/live-320-aiming.png)
