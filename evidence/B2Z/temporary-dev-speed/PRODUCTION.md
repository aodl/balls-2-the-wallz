# Temporary Full Speed on the European Rules18 game

The subsequent cadence and buffered playback release is recorded in the
[Full Speed smoothness report](SMOOTHNESS.md).

The original development executables were installed on 23 November 2026 from
[`04538efd1796d3d12784a29e4c09506decbeccca`](https://github.com/aodl/balls-2-the-wallz/commit/04538efd1796d3d12784a29e4c09506decbeccca).
The frontend was then corrected from
[`42ca33ceb62c95968004aaec114cc01c4fdfe4c6`](https://github.com/aodl/balls-2-the-wallz/commit/42ca33ceb62c95968004aaec114cc01c4fdfe4c6).
Both jobs passed in the [original workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/45133912176)
and the [correction workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/45141098285).
The correction independently rebuilt the installed backend to the same bytes.
[Certified live module pair](live-modules.json)
The [qualification report](RULES18_RELEASE.md) covers the exact same-epoch
upgrade, disposable official Ledger inputs, restart, manual deactivation,
automatic expiry, reserve protection and the public-launch exclusion gate.

| Canister at the end of this initial rollout | Independently verified Wasm SHA-256 |
| --- | --- |
| Frontend `s2jxj-liaaa-aaaas-amynq-cai` | `27e22016c6db59c6539413363f3a4e088b281e49f3a4f1ec0a80574b1c499399` |
| Backend `s5ir5-gqaaa-aaaas-amyna-cai` | `9fb444b041a7b699f0cf92159a2505d1bdf4cb3dc5e092fc4b85310b1deb0d42` |

## Same-epoch installation

The paused paid-world publication, state, events and scores were byte-identical
before and after the upgrade. Retention, source binding, all eight compared
receipts, the Ledger cursor at 40,647,923 and 108,100,000 received e8s agreed.
The world retained its two Cannons, two live Balls and four Reservoirs. The
authenticated identity remained Rules18, Schema10 and Adapter12. After resume,
independent replay matched the first new publication at Adaptive Trickle.
[Upgrade preservation](live-upgrade-preservation.json) ·
[Resume replay](live-resume-replay.json)

The exact embedded frontend passed production certificate and content checks
for 90 assets, seven gzip representations, 60 audio files and 28 alternate
GET/HEAD responses including real 404s. Real Chromium on desktop, 390px and
320px verified the owner control, disabled unsigned speed changes and native
Rules18 memo Copy. The normal Rules18 app bundle is byte-identical and the
pinned canister origin continues to return a certified 404 for the alternative
origins path. [Certification](live-frontend-certification.json) ·
[Browser](live-browser.json) · [320px screenshot](live-game-status-320.png) ·
[Identity origin](live-identity-origin.json)
The real Chromium sign-in button opened the official Internet Identity
provider. This was an initiation check in a clean browser.
[Internet Identity popup](live-ii-popup.json)

## Owner sign-in correction

The first production owner test returned “Owner sign-in required” and “Speed
could not be verified.” The ordinary Rules18 Account sign-in succeeded with
the expected principal. The developer app's AuthClient used the SDK's
browser-derived default API host, `https://icp0.io`, for Internet Identity's
app-delegation mint. The site's existing connect policy blocked that host.
That failure occurred before the speed canister endpoint was called.

The [frontend correction](https://github.com/aodl/balls-2-the-wallz/commit/42ca33ceb62c95968004aaec114cc01c4fdfe4c6)
uses the same explicit `https://icp-api.io` API host and IC-root policy for
the delegation mint and backend calls. The separate developer session, fixed
derivation origin and CSP remain as designed. A Chromium regression drives the
real SDK through a controlled signer popup. It observes the old request being
blocked by CSP and the fixed request reaching the permitted route. The fixture
aborts at that route and does not complete production authentication.
[Original browser failure](ii-gateway-before.json) ·
[Corrected gateway test](ii-gateway-fixed.json) ·
[Exact-source correction run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45141098285)

Only the temporary developer script changed across the 90 public assets.
The independently built frontend matched the hosted artifact byte-for-byte.
After the frontend-only installation, the live module, all certified assets,
native Rules18 memo Copy, permanent origin and the real II popup were checked
again. Rules18 remained in Adaptive Trickle during the correction.

## Owner-operated mainnet test

The owner signed in through the corrected developer panel and activated Full
Speed. The backend advanced 19 authoritative ticks. The median observed
checkpoint interval was 1.923s, and the last interval took 3.658s. It returned
to Adaptive Trickle after 38.251s. The last signed active report still showed
87 seconds remaining on the 120-second lease. Admission stayed open, and the
settled endpoint had 2.069T liquid cycles against a 1.350T recovery floor.
The observations are consistent with the existing execution/delivery timing
guard. The running module does not report which of those two timing limits it
hit. The live target cadence and full-duration acceptance are blocked.

Independent replay authenticated the full predecessor chain and matched
state, events and scores across all 22 consecutive checkpoints, including the
19 Full Speed ticks and the first new Adaptive tick. Source cursor 40,647,923,
the paid total, authorization and structures agreed across the run. The net
cycle decrease between settled reads around the test was 79.684B. Short-lived
message reservations were excluded from that estimate.
[Owner window](live-owner-window.json) · [Continuous replay](live-owner-replay.json)

## Recovery

The known-good same-epoch recovery artifacts are the normal backend
`43095677376fe4f3c66185b1cf185ef9e161b5c44320609b93e134a771f4bf59` and
frontend `da3fccaaec5d2c1828a9ca53bdf979cd6d8a95be9398b8c4ad17ee8d53d49b55`.
Restore them only through the tested compatible upgrade procedure. Both
canisters have zero snapshots. The operator binding and override lease are
heap-only and clear on module upgrade. The existing controller can rebind the
owner after recovery to a compatible development build. The UI and backend
remain explicitly temporary and subject to the
[public-launch removal checklist](../../../docs/operations/B2Z_DEV_SPEED.md#public-launch-checklist).

The initial frontend installation window used 185.494B cycles and the backend
window used 24.271B. The frontend sign-in correction used a further 185.503B
cycles and left 1.029T cycles above the full 494B recovery allowance. At that
check the backend had 2.179T liquid cycles and 829.265B above the 1.350T
override recovery floor. The resource measurements include ordinary activity
during each observation window. [Resource observations](live-resources.json)
