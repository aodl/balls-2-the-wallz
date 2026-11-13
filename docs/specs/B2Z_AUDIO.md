# Optional presentation audio v1 — local candidate

This contract adds optional sound to UX-04/05/06/12 without changing UXR-01..25,
financial authority, replay bytes, physics or paid state. Audio is not consensus,
a command, an acknowledgement of payment or a readiness signal. This task grants
no production deployment, mainnet action, funding or remote publication.

The user-supplied `B2Z-Codex-Audio-Integration-Handoff.zip` contains the normative
implementation brief, source review, asset/storage rules and QA matrix. Its
checksummed contents were extracted under `.work/audio-handoff`; the current
checkout supersedes the review's older source positions. The deployed rollback
remains the previously qualified 9d45b940 JS/f85e3ddf inventory, untouched.

## Source fidelity and transport

Approved Suno Keyboard+Synth music is 407.36 seconds, 48 kHz stereo PCM24.
Its 51 FLAC cores contain exactly 19,553,280 frames, with baked-in transitions.
Manifest SHA-256: `d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7`.
Concatenated int32 PCM SHA-256:
`c96b250746bd0097623afb55d86dc9f1677162cdd777758bb63885fdeeae50fd`.
No music, tempo, pitch, normalisation or transitions may change. Play only core
frames (2400-frame offset); guards are decoder context, never audible overlap.
Audio-clock epoch + integer source frames schedule cores; rate=1, detune=0.

Only the approved 74,087,775-byte `audio/b2z-v1` subtree is built. Same-origin
hashed FLACs have identity encoding, audio/flac MIME and immutable one-year cache
policy; the manifest revalidates and is pinned in code/build metadata. No CDN,
lossy fallback, duplicate master, decoder download or service worker. Cache hits
and streaming responses are bounded and SHA-checked before decode. CacheStorage
is optional, bounded to 90 MiB; failure cannot block game observation. One stalled
optional lookup disables subsequent cache work for that loader. Clear uses a 1.5s
deadline and reports unavailable storage honestly, touching only audio cache names.

## Event truth, continuity and view

Only optional `SegmentPlayer.advance` collection may propose cues. Preparation
and `B2zView.apply` remain silent. Capture old trajectory before real application;
retain only after successful application. Collector exceptions never swallow real
model failures. Every queue player carries immutable admitted source/identity,
publication root and segment metadata, including cold history and offline paths.

A nonzero exact velocity sign reversal is a wall reflection; both-axis reflection
is one sound. Intercept-only rebasing/wrap is silent. Collision coordinates use
BigInt rational arithmetic and actual world dimensions. Launches use the cannon
ID (v6 player/ball owner is not the cannon), with same-cannon volleys coalesced.
Capture, movement, lifecycle, receipts, previews and wallet actions are silent.
Territory swell and the stronger cannon asset are retained but unused in v1.

Flush only after successful drawing, shell advance and layout, with the same
rendered camera pose, actually emitted real-entity membership and cached opaque
UI masks. No minimap, ghost, offscreen, clipped, omitted or unrendered cues.
At most 16 rectangles; malformed masks fail silent. Geometric eligibility is not
per-pixel occlusion or a whole-scene raycast. The selected/followed flag never
bypasses audibility. One wrapped physical event sounds once.

Zoom gain is smoothstep(12,40,scale*sqrt(2/3)) in CSS pixels; <=12 is exactly zero.
Safe edge inset is clamp(6% of smaller viewport,16,48), plus entity radius and a
32px smooth fade. Expand UI bounds by 8px. Pan is clamped to ±0.65. Recheck only
active voices as view changes; disappear/occlude/overview fades tails in 60ms.

Consumed player cursors are authoritative once-only watermarks. Arming drops all
older/current events; mute, lifecycle, seeking, checkpoint/epoch/bridge/skip and
render failures fence collection. Resize-only redraw does not flush. A >250ms
frame gap drops catch-up sound; inferred event lateness >100ms is discarded.
No deferred sound queue exists. Continuous new boundary events still sound once.

## Fixed budgets

| Resource | Limit |
| --- | --- |
| Inspections / retained / starts per frame | 128 / 32 / 2 |
| Global / wall / cannon rate and burst | 5/s,3 / 4/s,2 / 1/s,1 |
| Active voices / wall / cannon | 8 / 6 / 2 |
| Ball / cannon / 6×4 same-kind bin cooldown | 350 / 800 / 150 ms |
| Seen keys / cooldown keys | 4096 (60s guard) / 512 |
| Decoded music / effects | 32 MiB / 4 MiB |
| Encoded target / concurrent fetch / decode | 8 MiB / ≤2 / 1 |
| Usual music buffers / musical sources | 3 / ≤4 |

Sampling is stratified in the existing mandatory event loop before geometry or
key allocation. Launch inspections reserve capacity. Launches rank first, with
centrality/recency and deterministic ties; spatial arbitration limits clusters.
Token consumption is atomic across relevant buckets. Overflow drops audio only.
No authoritative event, rendering cap or world scan changes for scalability.

## Music level, controls and lifecycle

Music has an independent clock. A rolling displayed-ticks/wall-second rate maps
0.01/0.1/1 ticks/s to -3/-1.5/0 dB presence, with ~9s rise/~17s fall and 0.5dB
deadband. Hold short no-progress gaps for 8s, then approach -5 dB. Integrity/render
failure can approach -9 dB. Original music level removes this adaptation entirely;
it never changes tempo. No beat alignment, filtering, reverb or hit ducking.

New pages are silent even with saved-enabled preferences, until a sound-control
gesture resumes the context synchronously. Music/effects enable and levels are
independent; master mute stops both. Defaults: music .72, effects .58, ceiling .8.
Sum-of-effect peak bounds are ≤.20 before master with conservative stereo-panner
headroom; no compressor is claimed as a true limiter.

The speaker popover is independent of the action panel and its fixed slots. On
narrow screens its closed control sits below the header, outside payment content.
Use one separate versioned preferences key. Audio errors and retry/clear controls
are separate from verification status; no collision announcements or analytics.

Hide/freeze/pagehide invalidates pending generations, stops sources/fetches and
preserves phase. Return respects mute and browser resume permission; denial asks
for a gesture. Same-origin BroadcastChannel claims give the last deliberate sound
activation ownership; displaced tabs require another gesture, and hidden tabs do
not compete. No canister coordination. Device interruption cannot start retries.

## Qualification boundary

The maintained implementation and acceptance tools must qualify actual game
playback, native decoder/output, dense bounds, lossless cores, asset policy,
disposable installed-IC and existing camera/payment/startup regressions. Pure
reference policy tests alone are insufficient. Source-specific reviewed evidence
belongs under `evidence/B2Z/audio-integration`; raw work remains under `.work/`.
Manual headphone/speaker listening and physical iOS/Android/Safari/Firefox coverage
must be marked BLOCKED/NOT_RUN when unavailable. Software/OfflineAudioContext and
emulated touch are not hardware or listening evidence. New audio bytes require
fresh exact-source six-gate qualification and a separate deployment decision.
