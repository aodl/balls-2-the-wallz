# B2Z presentation audio — unified owner contract

Audio is a frontend observer effect, never gameplay authority, financial readiness,
a receipt or proof of capture. This contract supersedes the earlier opt-in lanes,
sliders, adaptive music presence and public maintenance/retry UI. Historical
qualification and P09 failures remain in `evidence/B2Z/audio-integration/` and
`evidence/B2Z/audio-corrective-qualification/`; they do not qualify changed bytes.

## One control and activation

The persistent 44px speaker is the sole public control. Enabled intent is the
fresh/default state. The crossed speaker means deliberately muted; a pending dot
and accessible explanation distinguish browser permission/recovery from mute.
No popover, lane toggle, slider, adaptive switch, retry or cache-clear UI exists.

| State / input | Result |
| --- | --- |
| Fresh profile | Enabled intent; attempt when permitted |
| Ordinary trusted primary pointer/key gesture | Synchronous native resume attempt, original interaction preserved |
| Blocked sound icon | Enable and unlock once, never mute first |
| Usable sound icon | Mute music and effects promptly |
| Muted sound icon | Enable both and unlock directly |
| Muted ordinary gesture / return | Remain muted |
| Enabled interruption / visible return / online | Bounded automatic reconciliation |

Sound-button events are excluded from the global activation handler; repeated
activation keys are suppressed. Synthetic events never establish user activation.
Browser/OS permission and volume remain authoritative. A running context alone
is insufficient: reconciliation repairs missing scheduler coverage exactly once.
Game acquisition never waits for optional audio resources.

`b2z.audio.v2` stores only `{version:2,enabled:boolean}`. A valid v2 value wins.
Otherwise legacy `b2z.audio.v1` explicit `mute:true` remains muted; absent records,
old default false/false lanes, custom lanes/levels without master mute, malformed
JSON and denied storage become enabled. Old lane intent is unavoidably ambiguous.
A failed migration write does not erase an observed legacy master mute. Migration
is idempotent and touches no account, camera, payment or trust storage.

## Mix, source fidelity and assets

Fixed product levels are music=1, effects=1, master=.8. These are engineered mix
coefficients, not three gains all set to one. No pace/zoom-dependent music level,
tempo, pitch, ducking, filtering or alteration of approved musical transitions.
Mute/recovery retains short de-click fades. Effect peak reservations sum to <=.20
before master (including sqrt(2) stereo-panner bound); wall/cannon per-voice caps
are .065/.09. Spatial gain can rise after zoom-in, up to its immutable reservation.

Approved music remains exactly 51 PCM24 stereo FLAC cores at48kHz, 19,553,280
frames /407.36s. Concatenated little-endian left-aligned int32 core SHA-256:
`c96b250746bd0097623afb55d86dc9f1677162cdd777758bb63885fdeeae50fd`.
The2400-frame guards are decoder context, not repeated audible overlap. Source
rate=1/detune=0 and integer frame-addressed audio epochs preserve baked-in joins.

Manifest `audio/b2z-v1/manifest.json` now pins nine effects: six unchanged approved
assets plus three original deterministic additive-synthesis contacts created by
`tools/create_contact_audio.py` (no external samples/services). Two bright contacts
serve friendly bounces; the restrained neutral contact serves ambiguous/spectator
contacts. Existing dark wall-ripples are reserved for attributed threats. Strong
cannon/swell assets remain unused. Exact new hashes/measurements belong in the
candidate report. Music provenance remains the owner's active Suno Pro/text-only
composition declaration; retain the original release rights evidence.

All files are same-origin, hash-and-length checked before native decode. Manifest
format/path/frame bounds remain strict. FLACs use identity encoding, audio/flac
and immutable hashed caching; manifest revalidates. No CDN, service worker or
unverified fallback. Cache name includes the new manifest hash; obsolete optional
audio cache is pruned lazily, never game storage. Cache failures disable optional
cache use without blocking sound/game. Proven-invalid entries are evicted and
bounded retries refetch pinned bytes; invalid media never plays.

## Displayed event meaning and view

Only `SegmentPlayer.advance` prepares cues before real event application; accepts
follow successful application. Preparation/replay verification stays silent.
Immutable admitted publication/root/segment/sequence provenance plus consumed
cursors prevent repeat output. Corner reversal is one cue; intercept-only torus
rebasing is silent. Capture/receipt/preview/copy/seek/skipped history makes no sound.

Listening perspective is the exact declared sending account/subaccount, never
selected/followed rival identity. Canonical player ownership maps islands to accounts.
Exact old rational trajectory at displayed event time identifies reversed faces.
Ownership is read before that event's application; no endpoint ownership, colour,
nearest cannon, next-state simulation or new backend field is used.

* Own ball contact: light friendly contact, unless cannon/ambiguous vertex contact.
* Enemy ball: threat only when every identified contacted face belongs to the
  declared account. Neutral/third-party/mixed-owner corner/cannon/vertex-blocked
  or unavailable attribution: neutral. Spectators are neutral.
* Account change fences pending contextual cues/tails without changing history.
* Cannon launches retain their separate soft bank and same-cannon volley grouping.

Flush follows actual drawing with the same camera pose, emitted real-entity
membership and cached UI masks. Ghosts/minimap/offscreen/omitted entities cannot
sound. Edge inset is clamp(6% smaller viewport,16,48), plus radius;32px fade and8px
UI clearance. Up to16 masks; malformed masks fail silent. Pan clamps to ±.65.
The quantity editor participates in occlusion but stays clear of its own cannon.

Zoom gain is `smoothstep(6,28,scale*sqrt(2/3))` in CSS pixels: scale24 ~.674,
close scale>=35 full, overview scale<=7.35 silent. Continuous tail gain/pan follows
current view, bounded by the reserved peak. Leaving visibility fades tails60ms.
No compensation makes offscreen battles audible.

## Lifecycle and budgets

Desired enablement, browser permission/context, visibility, ownership and actual
scheduler are separate. Hidden/freeze/pagehide fences effects, cancels generations,
pauses phase and suspends economically. Visible/pageshow/resume/context/online and
eligible gestures reconcile; no hidden RAF dependency. Exhausted music attempts
back off2–30s and meaningful recovery permits fresh attempts, not a permanent
error latch. Working lanes remain independent. Closed contexts permit one bounded
recreation on a meaningful trigger after old native decode completes. Late async
completion cannot restart muted/disposed output. No periodic context creation.

BroadcastChannel leases establish one audible owner where available. Hidden tabs
release; visible returns reclaim an expired/released lease. Between visible windows,
latest deliberate activation wins stably. Ownership loss never persists a mute.
Coordination absence is best-effort and honestly reported internally.

| Resource | Bound |
| --- | --- |
| Classified inspections / retained / starts per frame |128 /32 /2|
| Total / wall / cannon rate, burst |5/s,3 /4/s,2 /1/s,1|
| Voices total / wall / cannon |8 /6 /2|
| Ball / cannon / same-kind6×4bin cooldown |350 /800 /150ms|
| Seen / entity keys |4096 /512|
| Decoded music / effects |32MiB /4MiB|
| Encoded / concurrent fetch / native decode |8MiB /<=2 /1|
| Usual music buffers / maximum transient sources |3 /4|
| Fetch/decode deadline / cache operation deadline |15s /1s|

Stratify before BigInt/contact classification in the mandatory event pass; no
second event/world walk. Overflow drops audio only. >250ms discontinuity or>100ms
inferred lateness drops historical cues. No backlog queue. Resync/seek/source/
context failures fence audio without changing accepted game state or payments.

## Qualification

Use integrated actual-game browser, native decoder/music cores, ordinary real-tab
visibility, actual native output-stream energy/recordings, invalid-media negative
controls, resource/mix/geometry and exact financial regressions. A synthetic context
or OfflineAudioContext alone is not actual audible-return proof. Browser media
stream capture is not physical headphones/mobile performance or subjective listening.
Keep unsupported BFCache/non-Chromium/physical devices NOT VERIFIED. P09 historical
FAIL remains separate until matched new measurements establish its disposition.
New bytes require a clean frozen inventory and all six exact-source hosted gates.
No deployment or backend activation is implied by this specification.
