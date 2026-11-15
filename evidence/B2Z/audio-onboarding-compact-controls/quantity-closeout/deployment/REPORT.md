# Corrected frontend deployed — prelaunch mainnet playtest

**The approved corrected frontend is installed and retained. No rollback was required.**
[European game](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/). The exact formerly failing
320×640/cell 0/347.15° pose passed first, immediately after independent asset
verification. The paid backend remains Rules7; no backend, financial, funding,
settings/controller, Rules9 or delegated-payment operation was performed.
This is **prelaunch mainnet playtest — not general-release qualified**.

## Release and scope

Approved source: `76225150a08c2556e12dcf261e66b8f9489f2ed3`.
Local/remote branch head at preflight and before this evidence continuation:
`5516b35c154aeb2fcf3443a2fdbfcd65af0c09f3`.
Frozen runtime/build: `0f55cbb0356b0bb90979bb515f907383efe940a9`.
All six substantive jobs passed for the approved SHA in
[run43713498060](https://github.com/aodl/balls-2-the-wallz/actions/runs/43713498060):
Source, Native, Packaged DTR/clean consumers, Runtime-lab Wasm, Browser HTTP/Web
Crypto, and S14/million-cell installed-IC. The inventory guard is excluded.
[Rechecked job conclusions](results/ci-preflight.json).
No application change, builder, dependency update or audio re-encoding occurred.
[All 220 consumed inputs and candidate/rollback/staging parity](results/final-file-parity.json).

| Frozen artifact | SHA-256 |
| --- | --- |
| JavaScript | `3ee92eee3dda006c57f2dd17779e0e4babb947dc54942c6bd4998b975ebedbb2` |
| Complete78-file inventory | `4606757478a113e7a682f0077b69155e9455b2bf60624066c608b7b8168526be` |
| Audio manifest | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |

The 77 public files plus consumed upload policy match the
[approved inventory](../frontend-inventory.json). Frozen source directory:
`.work/quantity-closeout/frozen/frontend`. The rejected `1363ae…` bundle was not
staged or installed. Music cores, approved effects, sample counts, timing and
manifest remain byte-identical to the approved replacement. No new SFX were made.
The earlier Suno Pro owner provenance declaration remains in the maintained audio
release evidence; this operation changes no licensing assessment.

## Preflight, deployment and independent verification

Initially all 74 served public files matched the restored75-file territory/control
rollback. The frontend asset module, backend module, controllers and subnet were
verified using pinned-mainnet authenticated reads. The active `codex_local` public
principal matched the certified frontend controller; no permissions changed.
The deployment mapping selected only observer assets in `.work/s14/assets`; no
observer builder/dependencies existed. The approved deployment configuration binds
backend `s5ir5-gqaaa-aaaas-amyna-cai`, network `ic`.

Previous staging was preserved at
`.work/quantity-deployment-20261115/previous-staging`; the rollback directory was
not overwritten. The entire new freeze was copied into a separate clean staging
set and every file checked before deployment. [Staging record](results/staging.json).
The actual authorised command was:

```sh
DFX_IDENTITY=codex_local \
DFX_WARNING=-mainnet_plaintext_identity \
NPM_CONFIG_IF_PRESENT=true \
dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

[Actual command output](results/deploy.log). Dfx's generic “Upgraded code” line is
accompanied by “Module hash … is already installed”; certified before/after/final
module hashes are identical. Only approved asset contents changed.

All77 independently retrieved public bodies match SHA-256 and length. Signed
asset inventory matches every path, content type and identity encoding. Every
FLAC is `audio/flac` with identity-only encoding. CSP, security, MIME and caching
headers match the approved upload policy. No unexpected public file/script/CDN
was introduced. [Bodies/headers](results/served-after.json),
[signed inventory](results/inventory-final.json),
[all 77 HTTP certificate proofs](results/http-certificates-after.json).
Certificates validate pinned root, BLS/delegation, freshness, frontend canister,
witness, exact path/expression, response body and covered headers. Changed-response
negative checks remain effective. No check was relaxed. Preflight had one
transport-only RemoteDisconnected; original logs are retained. Bounded retry
(max 3 attempts,1/2s backoff,max 2 concurrent) succeeded; integrity assertions were
never retried as success. Explicit `Accept-Encoding: identity` avoids confusing
gzip and identity certificate/body hashes.

## Priority live mobile acceptance

[Actual native-input results](results/critical-mobile.json),
[settled347.15° capture](captures/critical-mobile-347.15.png).
Ordinary fresh production-browser Join → existing account → My cannon → explicit
Focus → Fire → keyboard aiming reproduced the **exact** live geometry:

- Actual canonical cell 0, cannon 1; owned territory crosses the toroidal seam.
- Camera `[3.6575453715563526,3.6575453715563526,64]`.
- Screen heading347.15° after full one-second settling; the canonical world-heading
  memo `FIRE 1 217.5 1` is the correct projection/quantisation, not screen degrees.
- Workspace8/221/304/296; payment scrollport 242px. The historical295px height is
  recorded, not imposed on changed natural content.
- Quantity editor10/526/130/46;44×44 buttons, fully in the visual viewport,
  unobstructed full hit targets/corners. Optional cycles telemetry yields the rail.
- The source/guide/handle remain visible and usable; no payment/minimap/camera/
  sound-control overlap. No camera, world, status or CSS override was used.

The original 8-heading sequence, 72 native5° sweep states and 52 adjacent1° states
in both directions all pass. The same stable dock remains available. Native
mouse, keyboard and emulated-touch +/- alter count/memo/amount without camera or
heading changes. Held quantity press while aiming, arrow-shaft drag, aim→pinch,
viewport contraction during press and close/reopen pass. Resizing fences the late
release; a fresh press works.320×350 retains usable scrolling. Zero runtime errors
and zero forbidden POSTs were observed by the critical runner.

A **genuine same-window 5s tab switch during a held quantity press** also passes:
no unintended release edit; draft/camera unchanged; fresh +/- usable on return.
[Native tab journey](results/live-journey-corrected.json),
[capture](captures/live-journey-corrected-quantity-real-tab-return.png).
Native payment scrolling and full recipient disclosure at320/390 retain a usable
editor: [actual accessibility results](results/live-accessibility.json).

## Payment, entry and control acceptance

| Viewport | Host-observed cold world-ready time | Exact quotes/copy |
| --- | --- | --- |
| 1440×900 | 7.33s | Fire, Move, Build: PASS |
| 390×844 | 4.02s | Fire, Move, Build: PASS |
| 320×640 | 8.46s | Fire, Move, Build: PASS |

[Complete live controls](results/live-controls-permitted.json) and
[independent9-quote verification](results/quote-verification.json).
Recipient is the authenticated full `s5ir5-gqaaa-aaaas-amyna-cai`; amount copy is the
exact decimal with no ICP suffix; memo text bytes round-trip the canonical codec.
All 9 quotes reproduce from the captured latest authenticated Rules7 world/config,
including destination legality, payer and amount_e8s. No payment was sent.
The compact To-left/amount-right row, payer, fee, prompts and legal default Move/
Build proposals remain. Move/additional Build retain exactly:

> If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.

Native Clipboard API writes and Control+C/Control+V into an isolated empty local
paste surface pass. This test grants the browser's normal clipboard permissions;
it does not bypass OS/browser security. The first unpermissioned Chromium attempt
correctly showed the full manual surface, causing a harness expectation timeout;
that original failure/capture remains [recorded](results/live-controls.json).
The permitted run additionally forces API denial and proves full manual native
copy/paste. Full-address inline inspection never substitutes an ellipsis value.
Quantity-after-copy Keep restores matching count/memo; Update adopts the coherent
new quote. No hidden numeric quantity authority exists.

All 3 fresh account journeys recognised the existing exact canonical account,
framed territory without selection or unsolicited NEW, and ordinary cannon click
selected without camera movement. Explicit Focus worked. A separate fresh-context
new account reached `NEW 225 1` without any payment. Actual current world supplies
one active cannon: multiple/dormant/nondefault-subaccount production cases are
**NOT VERIFIED**, not replaced by fixture passes. The initial supplemental runner
incorrectly tried hidden Join after already declaring an account; its failure is
preserved, and the corrected new-player test uses genuinely fresh storage.

Zoom min/max/intended-target disabled states pass all widths. Native arrow aiming,
outside-arrow panning, Move arrow, Build ghost and persistent selected highlight
remain. Native ball click starts following at unchanged zoom; click elsewhere stops
at the current camera. No persistent Follow dialogue exists.
[Ball/minimap native input](results/live-following-native.json).
Actual overview/minimap captures retain ownership/viewport markers and no canonical
edge outline; no new seamless-ownership scenario was fabricated on production.

## Verified startup and delivery recovery

[Cold-start trace](results/startup-summary.json): exact catch-up wording/spinner
appeared at1.337s on the browser performance clock. First verified
world at5.620s had headH=9099, latest authoritative logical
endpoint9096, displayed time9095. Real displayed ball
positions first advanced at6.931s while the authoritative head
remainedH. H+1 was first observed at89.813s. Thus this actual cold
browser demonstrated historical motion **before another publication**, not merely
CSS animation. Optional history used2 requests,
16105 bytes and629.4ms acquisition.
The trace contains truthful waiting and Slow/delayed states; playback stays within
verified coverage. Host-side timings above include automation/scheduling overhead
and are separate from navigation performance timestamps.

A24s browser-only query503 interruption produced13 intercepted reads across53
samples. The real subnet was not interrupted. Copying disabled once freshness
expired, trusted scene/camera/action/memo remained, playhead never exceeded coverage,
and panel maximum x/y/width/height drift was **0px**. Recovery needed no reload and
retained the same session/clock/queue objects. No status/world override or trust
failure downgrade was used. This live fault is desktop; mobile status-only exhaustive
matrix remains separate qualified-source evidence. Genuine invalid-certificate
attacks were not attempted against production; unchanged verifier/CI negative tests
and HTTP changed-response rejection retain that security scope.

## Native sound and remaining effect acceptance

[Actual deployed audio results](results/live-audio.json),
[native music stream](recordings/live-audio-production-music-return-0.webm).
Ordinary sandboxed Chromium153.0.8010.12 was launched without autoplay/throttling
security overrides. The recorder taps native decoded Web Audio output; this is
software output evidence, **not physical speakers/headphones or subjective listening**.
Fresh enabled intent, single icon, no old dialogue/sliders, first-icon unlock,
prompt mute, saved mute after reload/unrelated gesture, and re-enable all pass.

Same-window genuine visibility cycles passed: 5s away → 3.79s, 35s away → 3.29s, 8s away → 3.99s. These are measured times
to active scheduler plus current nonzero native output, not claimed instantaneous
return. Music phase is retained, queued nodes ≤ 2, no duplicate scheduler/context;
verified session/clock/queue objects remain identical. Two actual B2Z tabs yield and
reclaim ownership. Browser-only optional music download failure leaves game/effects
healthy; restoring transport plus an ordinary trusted game gesture restarts music
without off/on or reload. Native peak 0.4254 and maximum sampled RMS 0.1433 were
observed; no clipping in this music-only observed scene. All audio resource hashes
match the approved manifest. Loader max concurrent fetch/decode 1/1; encoded high
water 7,079,920 bytes in the lifecycle run; cache was unavailable in that browser.

No eligible displayed impact occurred in that audio capture (inspected/started0).
Therefore live friendly/threat differentiation, matched-event medium-zoom amplitude
and dense music+effects peak are **NOT OBSERVED/NOT VERIFIED** here. The approved
assets/policy and historical native67% measurement remain source evidence, not a
substitute for live listening. Music does not change with camera zoom by policy;
owner perception and actual impact output remain a playtest checklist item.

## Bounded performance and limitations

P09 remains **FAIL/unqualified**, accepted only for this controlled trial. The
initial loaded-host ON/OFF/OFF/ON frame timings are preserved in
[loaded observation](results/live-cost.json). They overlapped browser qualification
and cannot isolate audio cost. A subsequent bounded single-browser comparison,
identical camera, same one-cannon world,5s per cell, is
[recorded separately](results/live-cost-quiet.json):

| Sound intent | Frame p50 ms | p95 ms | p99 ms |
| --- | --- | --- | --- |
| Enabled | 66.70 | 100.00 | 116.70 |
| Muted | 66.60 | 116.60 | 166.60 |
| Muted | 66.60 | 100.00 | 133.30 |
| Enabled | 66.60 | 99.90 | 100.10 |

This shared VM uses software rendering. Muted baseline variance and slow frame
delivery prohibit a hardware-performance or P09 pass, and do not establish an
incremental audio regression. The quiet run rendered one cannon/one ball, acquired7,074,810 optional audio bytes
over the observation, and showed at most3 decoded music buffers (9,331,200 bytes),
2 scheduled nodes and no underrun in its first enabled window. The software
frame medians were about 66.6ms in both enabled and muted cells. Measured audio
flush p95 was 0.10ms in this sparse scene; this cannot clear dense-scene P09.
Resource rows record optional audio bytes/decodes;
world acquisition is independent and does not await the whole soundtrack.
The layout availability/hit/gesture checks pass under these conditions; isolated
production quantity-layout CPU cost was not instrumented. No maximum-population
production load test was run.

Physical phones/iOS/Android/headphones/Bluetooth, Safari/WebKit/Firefox audible
output and BFCache remain **NOT VERIFIED**. The native Ctrl+Equal text-zoom shortcut
had no effect in the automated context; actual browser text zoom is **NOT VERIFIED**
by this operation.320/390 widths, touch emulation and keyboard-contracted viewports
are browser tests, not physical-mobile qualification. No confirmed live damage/
capture, payment or financial acceptance is claimed from local previews.

## Paid backend preservation

[Before/after/final certified metadata](results/metadata-final.json) retains:

- Backend module `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend asset module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Rules7 `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`.
- Config `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`.
- Source `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125`.

Controllers/subnet match; source cursor remains40180669 in accepted observations.
World heads legitimately advance autonomously. Read-only status recorded running
Trickle 10/1000, admission open, source bound/no source error/pending0. No protection
was bypassed. The final read-only runtime query recorded total 2,679,669,133,894cycles and
liquid 2,623,336,372,804cycles. Runtime/funding JSON records these values and autonomous
Idle treasury status; retained historical balance-call deadline text is not erased
or treated as a frontend trust error. No funding amount/runway is invented.
The website continues applying authenticated Rules7 policy; Rules9 remains inactive.
Only asset-canister uploads and approved browser/local-preview operations occurred.

## Retained rollback and stop procedure

Rollback remains **75 files**,74 public plus upload policy, retained separately at
`.work/audio-onboarding-compact-controls/rollback/frontend`:

- JS `97d8ee0bf61e8b76816511772ab348962d56bbf78b597acc365f48a38725cdc9`.
- Inventory `e9b5c4be2216420f6f70d7c3f33f3ef4596b7d56e05c06eae43171fd629cb8c1`.

It was independently verified served before this deployment, and local hashes
remain unchanged afterward. Prior successful rollback and isolated rehearsal
remain historical evidence; **no new production rollback was executed** because
acceptance found no significant regression. This trial does not promise a backend
rollback: there is no backend operation in scope.

If a material defect appears: preserve recording/geometry; verify every rollback
file against the retained inventory; rename current `.work/s14/assets` into a new,
nonexistent evidence staging-backup path; copy the complete rollback directory to
`.work/s14/assets` without merging; verify exactly75 staged file hashes; run the
same observer-only command above. Re-run signed inventory and all 74 HTTP/body/
header/certificate checks against the rollback manifest using a fresh output
directory. Confirm Rules7/backend module/config/source still match. Stop if any
identity/hash differs. Never rebuild, reinstall backend, fund, change settings or
improvise a new application fix during rollback.

## Owner playtest and publication

Use the live URL above on desktop and a real phone. At347.15° and nearby headings,
try quantity +/- and aim/pinch; scroll to fee/risk; copy full recipient/amount/memo
without paying. Listen to music, mute/re-enable, return after35s, then compare own
contacts and threatening enemy contacts at working/medium/overview zoom when such
verified events exist. Report audio/routes, long-session responsiveness and any
layout problem. Do not send a payment for this acceptance checklist.

Evidence-only publication records the installed result; no runtime rebuild or
new source qualification is required for this report. Publication outcome and
its commit are recorded in the final handoff. Original failed deployment, rejected
runtime, permission/harness failures and historical P09 evidence remain intact.
