# B2Z optional lossless audio — local implementation and qualification

This is a **local frontend candidate, not a production release**. No mainnet call,
deployment, payment, allowance, funding operation or remote publication was made.
The paid backend and its sources/interfaces/configuration remain untouched.
The old six-gate run qualifies only its original frontend, not this audio candidate.

## Source and frozen identities

Starting checkout: `b292c0dd88eaae73873babedcc8132bb49651fcc`, branch
`release/btz-prelaunch-playability`. The working tree was clean apart from the
owner's reference ZIP. Its exact name is now ignored; the ZIP remains preserved.
The reviewed handoff source was reconciled against current AGENTS, STATUS,
contracts, locks and builders in `.work/audio-integration/baseline.json`.
No remote Git operation was attempted.

Implementation checkpoints: `1c96a39`, `b876ba7`, then final runtime
**`a2aa9a25c14b711e853857b013bbf0e4855ce8de`**. `72c53e3` corrects only a browser
qualifier's muted-network assertion. Later report/evidence changes must not change
runtime/build/dependency inputs. The final assets were frozen from a clean a2aa9a2
checkout, not rebuilt for report publication.

| Frozen item | Identity |
| --- | --- |
| Directory | `.work/audio-integration/release/frontend` |
| JavaScript, 2,062,404 bytes | `8e008b16162fff2504fa784a1c9a62a0fbae1c8237f02a6fa198dd61e3309e41` |
| Complete 74-file inventory, 76,233,506 bytes | `31ff97abf1c1758590f48c1cb28e55f3d0649f2f067972a29e4b397c976e11ef` |
| Approved audio manifest | `d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7` |
| Reconstructed master int32 PCM | `c96b250746bd0097623afb55d86dc9f1677162cdd777758bb63885fdeeae50fd` |
| Unchanged frozen base builder | `915e0e0ca6ff6c31a6252832e1dbc03fcab21a3f1763689ec1d5f40c9b610d38` |
| Maintained wrapper | `b91cd416d48be7685a8f2ba11a74c71b6160b84a2de9137a6cf04d2252d6add8` |
| Audio build helper | `0bb1df499c184a9f9a617b085d8b07ac6bc434fd4ced0d4e811bc483833943e0` |

There are 73 public files plus the consumed upload policy. The complete inventory
is the SHA256 of the exact UTF-8 JSON bytes in [frozen-inventory.json](frozen-inventory.json).
[Build provenance](frozen-build-manifest.json) independently lists the other 73
files; it excludes itself. The earlier b876 inventory remains separately labelled
[b876-inventory.json](b876-inventory.json), with original raw artifacts preserved.

## A — baseline, approved material and contract

All ZIP checksums passed before use. The implementation brief, source review,
QA plan and asset/storage instructions were read in full. Important input files
are under `.work/audio-handoff/b2z-audio-handoff-v1/docs`; their approved payload is
maintained at `apps/b2z-observer/audio/b2z-v1`. The old review predates the deployed
panel correction; that correction is preserved.

The exact 74,087,775-byte audio subtree contains 51 music FLACs, six effects and
one manifest. Offline PCM verification reproduces the approved master hash above.
No musical content, pitch, tempo, normalisation, baked-in transition or lossless
source file changed. Only guarded cores play: 19,553,280 frames / 407.36 seconds,
48kHz stereo PCM24, with 2,400 source-frame guards excluded at both ends.

The maintained contract is [B2Z_AUDIO.md](../../../docs/specs/B2Z_AUDIO.md).
UX-04/05/06/12 are extended by optional presentation audio; financial authority,
canonical memo bytes, UXR placement rules and backend execution are unchanged.

## B/C — implementation

- Web Audio is unlocked synchronously by deliberate sound controls. A new page
  remains silent with saved-enabled preferences. Music and FX have independent
  enable/volume settings, master mute, original/adaptive music level, retry and
  audio-cache clearing. Storage errors are separate from consensus/payment status.
- Music uses one audio-clock epoch and integer source frames, rate 1/detune 0.
  Its initial/resume gain ramp is per source; file cuts and running loop wraps
  add no crossfade. Usually three chunks/two sources are retained. Decoder,
  in-flight encoded and node-held buffer ownership are bounded and fenced.
- The optional collector runs only during `SegmentPlayer.advance`, never
  preparation or `B2zView.apply`. Immutable source/identity/root/segment provenance
  travels with each admitted player. Old trajectories supply rational collision
  positions; true sign reversals sound once, wraps do not. V6 uses cannon ID,
  not player/ball-owner ID. Same-cannon volleys coalesce; other events stay silent.
- Cues flush after successful actual rendering and shell layout. Bounded emitted
  ID membership, matching pose, CSS zoom, inset/radius, opaque UI bounds and
  toroidal placement gate them. Failed/skipped draws clear membership. Existing
  instanced geometry, ball tails, wakes and grid visuals were not redesigned.
- Fixed ceilings remain 128 inspections, 32 candidates, two starts/frame;
  5/s global, 4/s wall, 1/s launch; eight voices with 6/2 class caps; bounded
  cooldowns/seen keys and 60ms tail ramps. Late/discontinuous/skipped events drop
  permanently. Slow-frame work reduces the inspection ceiling to as low as 16.
- Hide/freeze/pagehide stops and fences work; return respects mute and gesture
  permission. Last deliberate same-origin activation owns sound. Music does not
  restart for game publication changes or stalls. Optional caches have bounded
  operations, hash checks, one stalled lookup disables further cache work, and
  Clear reports failure honestly rather than waiting indefinitely.

Changed production inputs are the seven `audio-*.mjs` modules, app/model/renderer/
shell integration, HTML/CSS controls, approved audio subtree, maintained build
wrapper/helper and source/frozen development routes. No dependency used by the
shipped JavaScript changed. Qualification-only Python packages are hash locked.
The frozen base builder, DTR pin, backend, rules, economics and Ledger contract
remain unchanged. The workflow now invokes native/integrated audio qualification;
this local edit has not been published or executed by hosted CI.

## D — actual evidence

### Determinism, browser and fidelity

- **61 focused audio tests PASS**, including actual prepared v3/v6 segments,
  ordinary/derived preparation, on/off endpoint and player-index equality,
  exception containment, source identity, BigInt reflection, 100,000 candidate
  bursts, rate/voice bounds, private/stalled storage, cancellation and late native
  decoder ownership. The synthetic contexts in unit tests are not device evidence.
- **206 related playback/camera/render/identity regressions PASS** before the final
  cache-only correction. The baseline and first changed startup/elastic/refinement
  slices each passed 52 tests. No assertions or historic goldens were removed.
- **Chromium 153 integrated browser PASS**: actual app, pinned recording, native
  FLAC decode, real presented reflection/native source start, mute, saved-enabled
  reload silence, FX-only mode, warm cache hit, two deliberate tab claims,
  keyboard controls, controlled lifecycle/BFCache events and isolated audio hash
  rejection/retry. No non-loopback request occurred. See
  [integrated-browser.json](integrated-browser.json).
- Real `WEBGL_lose_context` loss/restore passes with no old cue and no game error
  (software renderer). Covering a ripple with the actual audio popover stopped
  its tail in 177.5ms wall time on this loaded host, including RAF scheduling;
  the scheduled audio fade is 60ms. This is not a claim of <=80ms end-to-end delay.
- All 51 **native 48kHz decoded core hashes match** in Chromium 153 and Firefox
  155. Actual `AudioMusic` output across the wrap and both sides of the internal
  transition matches one contiguous native-decoded reference at 48kHz and 44.1kHz,
  tolerance 1e-6. Maximum Chromium error is 2.98e-8; Firefox measured zero.
  Firefox lacks OfflineAudioContext.suspend here, so its maintained probe uses
  two scheduled cores per overlapping window. No scheduler mock replaces it.
  [Native results](native-output.json).
- Native realtime music completed **1,230 seconds / 156 starts / three loops**,
  zero underruns, maximum three buffers/two sources, 9,331,200 managed PCM bytes.
  [Soak](soak.json) is b876 runtime evidence. The subsequent a2aa change affects
  optional cache failure/Clear handling; music scheduler and core/decode paths
  are unchanged. The combined soak runner later FAILED its obsolete 120-second
  batch-codec deadline; the separately bounded corrected native runs PASS.
  Long-video shutdown was bounded after preserving results; no finalized long
  recording is claimed.
- Four-times guarded-file Fourier peak estimate: music 0.86680; enabled effect
  ratio <=1.00187; conservative maximum-slider output bound 0.85374.
  [Measurements](peaks.json). This is not a standards-compliant true-peak meter,
  physical output measurement or listening assessment.

The audio controls were exercised at 1440×900, 390×844 and 320×640. Sliders did not
move the camera; popovers remained inside each viewport. Eight separate
Fire/Move/Build panel cases, including 390×430 / 320×300 contraction and reduced
motion, passed **0px drift**. Exact action/quote/copy-readiness invariants remain
asserted. These panel cases are b876 evidence with identical final HTML/CSS,
renderer/shell/composer. [Panel results](panel-regression.json),
[module reconciliation](runtime-reconciliation.json).

### Installed game and recovery

The focused fixture installs the **unchanged reviewed normal Wasm**
`74ee4d172801e6d89987950376c4cda2015233ed605c967491e773c5b5a3f510` in disposable
PocketIC with pinned test ledger/index and root. It makes no production call.

**Final `installed-release` PASS**, 428.507s. Authenticated H=1/root
`85a118137e4606f02e5fc42960221eda33e820a093aafa4b2968486f65d69fa2` plays retained
movement without H+1 while financial authority remains H. First authority/world
commit is at 4742.5ms, first captured verified frame 5829.9ms, first motion 7523.9ms;
operational state is known by 5829.9ms. These are actual loaded-host fixture times,
not production latency promises. Native Music+FX opt-in at the verified endpoint
creates no old SFX.

Actual 5/30/90/180s 503/429 interruptions recover in the same session with preserved
camera/draft/head and **0px panel drift**. Request counts are 7/13/18/24. Cold outage,
independent slow operational status, bounded history fallback/no rewind and the
wrong-public-root integrity barrier all pass. The complete healthy H wire trace
fences and drains successfully before intentional fault cancellation; subsequent
faults have separate bounded logs. [Installed evidence](installed-game.json).
Ten strict wire-capture unit tests pass unchanged.

Earlier `installed-quiet` passed these behavioural assertions but FAILED wire
finalisation because a deliberate lifecycle cancellation remained inside its
healthy capture window. The fixture now uses the existing WireCapture.finish
boundary before faults; no failure/body-join/trust assertion was relaxed. Other
strict repeats missed the unchanged 2s retained-history budget and correctly fell
back to the verified endpoint, failing their required-interval assertion. The
recorder's old 20s page-age expiry and a venv interpreter-selection defect were
also corrected. Every earlier FAIL remains recorded under its run/source.

The original full `verify_s14_local.py` attempt passed normal compilation in 741s,
then timed out building test hooks at 900s; no installed assertion ran in that
attempt. Its fresh normal Wasm had a different hash and was never substituted for
the reviewed module or installed on mainnet. Focused cases reuse the reviewed
normal Wasm and unchanged Rust test binary. The complete hosted installed-IC gate
still requires future exact-source execution; this single focused case does not
claim all 59 installed checks. Raw evidence remains under `.work/audio-integration`.

### Build, HTTP, storage and regressions

The maintained wrapper checks every copied audio hash/length and emits exactly
three hardened policies. FLAC is identity-only audio/flac, immutable cache;
manifest revalidates. No CSP/autoplay, script source or signing expansion was needed.
Twenty source/frozen HTTP tests PASS, including hashed FLAC MIME/bytes, nosniff,
missing/traversal rejection and read-only proxy behaviour.

The final **`asset-complete` rehearsal PASSes** every one of 73 public HTTP file
hashes, certificate-header/nosniff checks and applicable MIME/cache assertions.
All 57 FLAC encodings are identity-only. An exact inventory comparison before and
after unchanged sync, including encoding hashes/lengths/modification metadata,
passes. The asset-canister module remains
`04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.

Measured disposable local memory is 1,718,676 bytes before the full frontend and
81,279,380 after (increase 79,560,704). Upload takes 113.125s; unchanged repeat sync
47.657s. This includes SDK/execution/update overhead and is not a wire-byte or
production billing measurement. [Asset service](asset-service.json).
The earlier 58-audio-file rehearsal passed; an expanded 300s attempt timed out.
The final full-payload operation has a 600s harness deadline, with unchanged runtime
and assertions. An extra attempt to restart a stopped retained network timed out;
its empty extra-HTTP trace is FAIL, not served-byte evidence. The subsequent fresh
complete run above supersedes that optional attempt.

No production storage/cycles measurement or tariff claim is made. Capacity and
current tariffs still need review before a future mainnet release.

An independent wrapper rebuild reproduced all 73 payload/policy files at b876;
only build-manifest dirty-source metadata differed. Final a2aa assets are separately
frozen above; they must never be replaced by the earlier set.

Full-suite runs were executed rather than replaced by policy tests. Final
`tools/check.py source` at **72c53e3122896aae77a9e725f644c24ac44cc5d6 PASSes**:
all source/reference/vector checks, **1,907/1,907 Node tests**, source structure,
document links and **201 Python tool tests**. See
[source-qualification.json](source-qualification.json). Application assets remain
the a2aa9a2 set; the 72c53e3 delta is qualifier-only.

Earlier completed npm runs recorded 1,905/1,904 PASS with one unchanged planner
worker hard timeout, and other runs had 3–5 timing failures. A detached unmodified
b292 baseline reproduced nine timing failures in those same planner files.
An earlier aggregate source run also hit its 120s rules-vector and 600s npm limits.
These earlier FAIL records remain preserved; the final complete source run passes
without changing their budgets or assertions.

The final cache-controls native browser run also PASSes on a2aa9a2, including
context loss/restore and truthful Clear. [Final controls](final-controls.json).
Hosted six-gate qualification is **NOT_RUN**: remote publication is not authorized,
and earlier CI cannot qualify these new bytes. Focused installed and complete local asset-service checks also pass in their
stated scopes; source PASS alone is not complete release qualification.

The audio candidate has no hosted result for any of the six required gates:

| Hosted gate | Audio candidate |
| --- | --- |
| Source conformance | NOT_RUN (local aggregate PASS above) |
| Native conformance | NOT_RUN |
| Packaged DTR and clean consumers | NOT_RUN |
| Runtime-lab Wasm | NOT_RUN |
| Browser HTTP and Web Crypto | NOT_RUN (local integrated runs above) |
| S14 and million-cell installed-IC qualification | NOT_RUN (focused local case above) |

### Performance and remaining coverage

[Matched actual-player CPU pairs](performance.json) retain equal endpoints at
all tested scenes. Synthetic candidate populations 0/64/4096/100,000 keep inspections
<=128 and retained <=32; this does not claim a 100,000-entity renderer. Engine
stress separately reaches eight quiet voices and verifies two starts/frame and
immediate stop on hide.

The requested added-frame p95<=0.5ms / p99<=2ms targets are **not qualified**.
This shared software-rendered host showed high baseline scheduling gaps; dense
paired p95 was 25.95ms and p99 39.38ms. Actual game RAF comparison sampled 33 frames
per four-second pass: OFF p50/p95/p99=150/200/216.6ms, ON=133.3/216.6/216.7ms.
These small loaded-host samples cannot establish a hardware performance delta.
The adaptive inspection reduction is implemented; no authoritative event is dropped.

Firefox realtime context stayed suspended after both Change and Click in a minimal
independent gesture page. Its native offline decode/output PASS does not qualify
realtime device output. Real Safari, iOS/Android devices, headphones/small-speaker
listening, physical device interruption and actual BFCache restore are
**BLOCKED/NOT_RUN**. Controlled lifecycle events are explicitly labelled.
See [QA matrix](QA.md) for unexecuted subcases and required follow-up.

## Media and review

[Desktop controls](media/1440-audio-controls.png),
[390px controls](media/390-audio-controls.png),
[320px controls](media/320-audio-controls.png),
[actual displayed reflection](media/displayed-effects.png),
[320px Build](media/320-640-motion-Build.png),
[contracted Move](media/390-430-motion-Move.png).

[Native wrap WAV](media/native-wrap-48000.wav) and
[native transition WAV](media/native-transition-48000.wav) are three-second,
48kHz float32 captures of actual native OfflineAudioContext/AudioMusic unity output.
They are listening reference artifacts, not proof anyone listened on hardware.
Raw screenshots/videos/timing traces remain in their named `.work` runs.

Cold game startup creates zero audio contexts and sends zero audio requests/bytes
before deliberate opt-in. JavaScript grows from 2,010,198 to2,062,404 bytes
(+52,206), excluding HTTP compression. An observed initial cold Music-only load
has 4 fetches/3 decodes; its manifest plus first three approved file bodies total
3,875,291 bytes (derived from those file lengths, not a captured wire-byte meter).
First-sound gesture latency and a controlled slow-link comparison were not measured.


## Release boundary and rollback

The last recorded production frontend `s2jxj-liaaa-aaaas-amynq-cai` deployment
is 9d45b940 JavaScript / f85e3ddf complete inventory. Production was not queried
or changed in this task; this is not a fresh served-identity attestation. Its preserved exact assets at `.work/s14/assets` are the immediate
rollback candidate. The still older b0f6c7a rollback remains separately retained.
Backend `s5ir5-gqaaa-aaaas-amyna-cai`, source bindings, paid state, financial
instructions and delegated-payment status were untouched; ICRC-2 stays disabled.

Before any release: resolve qualification failures, run all six substantive gates
on exact published source with separate authorization, complete supported-device
and listening QA, verify capacity/policy/unchanged sync and preserve rollback.
Any later authorized deployment must use observer-only assets with no backend
upgrade and independently verify every served public byte. This report authorizes
nothing on mainnet. The current candidate is **not fully release-qualified**.
