# Audio integration — local corrective candidate in progress

Production deployment, mainnet calls, funding and remote publication are outside
this task. No production operation has been performed. The deployed ca8b1f8/7d6c8f6
frontend and all paid backend state remain unchanged. This record does not qualify
new audio bytes by the old six-gate CI run.

## A — baseline and approved material

The owner supplied `B2Z-Codex-Audio-Integration-Handoff.zip`. All package checksums
were verified before use. Its brief, source review, QA matrix and storage rules
were read and reconciled with AGENTS, STATUS and the maintained UX/operator
contracts. The review predates the deployed panel correction; that correction is
preserved. Source/hash reconciliation is in the raw baseline JSON under
`.work/audio-integration`.

The exact 74,087,775-byte approved subtree (51 music, six effects, manifest) is
maintained at `apps/b2z-observer/audio/b2z-v1`. The ZIP remains locally preserved
and is deliberately excluded from Git/uploads. No creative content or transitions
were changed. Manifest SHA256 `d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7`.
The offline decode verification reproduces PCM SHA256
`c96b250746bd0097623afb55d86dc9f1677162cdd777758bb63885fdeeae50fd`.
Raw verification: `.work/audio-integration/pcm-verification.json`.

The baseline and first post-change startup/elastic/player-refinement slice each
passed 52 tests. The maintained audio tests now include actual prepared segments,
audio on/off endpoint/index equality, throw containment, rational reflections,
source provenance, 100,000-event bounds, visibility, native-scheduler arithmetic
and cancellation. Latest focused run: 47 PASS. Synthetic contexts in unit tests
are explicitly separate from native browser and listening qualification.

## B — controls and lossless scheduler

Real sandboxed Chromium has started the actual game and native FLAC music through
its controls under the existing CSP and `autoplay=()` policy. First visit issued
zero audio requests and created no context. A preliminary real-time three-loop
run achieved 1,230 seconds, 156 musical starts, zero underruns, max three decoded
chunks/two sources, 9,331,200 managed PCM bytes. This early run precedes later
recovery/cleanup corrections; it is not final-source qualification.

Native browser qualification found an incorrect offline-pump ticket variable
and a native `fetch` receiver error. Both were corrected; validation was never
weakened. The native fetch error (`Illegal invocation`) occurred before any audio
network request and left the game usable. Pure cancellation testing also found
that a late first decode could enqueue the next core after stopping; generation
checks now precede any fill work. These failures remain under their raw run names.

A crowded normal-RAF effect journey timed out without sound. Frame-gap suppression
and visibility are being diagnosed with actual rendered scenes and counters;
this is not silently marked PASS. A simpler existing-kernel wall-bounce recording
is a disposable test fixture, not a new production simulation or authority path.

## C/D/E — in progress

The full JS suite, panel matrix, native decoder/output, disposable installed-IC,
asset upload/policy rehearsal, lifecycle, performance and final source freeze are
in progress. PASS/FAIL/BLOCKED/NOT_RUN will be consolidated after execution.
No physical headphones/speaker listening, iOS/Android device or real Safari result
is claimed. Hosted six-gate qualification is NOT_RUN because publication is not
authorized. The previous deployment/rollback asset directory is untouched.
