# Listening, device and release prerequisites

This is a frontend-only candidate. Do not install it on production to perform this
check until a separate deployment decision and exact-source six-gate PASS. No
payment, allowance, funding, backend change or Ledger mutation is needed.

Record candidate Git ref, served JS/inventory SHA, browser/OS/device, output
sample rate, headphones/speakers/Bluetooth, DPR, viewport, and actual results.
Use a local HTTP build or the separately authorized installed candidate. Offline
recordings prove pinned content, not IC authenticity. Emulated touch and headless
Web Audio are not physical listening or GPU evidence.

1. Confirm a fresh page and saved-enabled reload are silent until a sound gesture.
   Enable music alone. Listen to all 407.36 seconds, the internal transition and
   loop boundary, then three continuous loops. Compare to the approved lossless
   master at unchanged volume. No tempo/pitch/rate changes, gaps, clicks, truncated
   transitions or progressive phase drift. Repeat at native 48k and 44.1k outputs.
2. Enable effects alone. Use populated 16/32/64-entity scenes. Listen to an actual
   visible wall reflection, a corner impact, torus wrap (silent), and cannon volley
   (grouped). No historical sounds after seek, verification delay or coverage gap.
   Compare the same scene muted and enabled; record real frame times and profiler
   stages, not just the difference of independently noisy percentiles.
3. Pan, zoom through close/intermediate/overview, follow a ball, use Focus, cross
   both torus seams, and move the source under header/minimap/action/audio UI.
   Sound must follow displayed visibility, edge attenuation and zoom. Omitted
   renderer instances stay silent. No storm in slow, fast or dense scenes.
4. Enable both lanes during a slow download/decode. Toggle only one lane, then
   mute both. Music and FX remain independent; no permanently busy decoder or
   competing decode. Confirm bounded fetch/decode and no audio network work while
   locked/muted. Clear cache and recover from an audio-only failed download.
5. Hide/return, OS lock/unlock, real BFCache back/forward, suspend/resume, phone
   call interruption, headphone unplug and Bluetooth route switch. Retain mute;
   require a gesture if browser permission requires it. No historical effect
   burst. Open two tabs and deliberately claim audio in the second; the first
   stops and must not reclaim automatically.
6. On physical iOS/Safari, Android/Chrome and desktop Firefox/Chromium, repeat at
   1440x900, 390x844, 320x640 equivalents and with software keyboard contracted.
   Check keyboard sound sliders, Escape/close, screen-reader names, selected source
   hit-testing, Fire/Move/Build payment scroll, and status-only panel geometry.
   No transaction is sent. Preserve exact memo, recipient, payer, amount and warning.

Release checklist (cannot be proven by unit tests):

- Obtain documented rights/provenance for public commercial use of the supplied
  Suno tracks, including applicable subscription/license at creation and use.
- Qualify p95 <=0.5ms / p99 <=2ms incremental audio work on representative hardware
  using matched A/B and A/A controls; retain original P09 FAIL until qualified.
- Confirm frontend storage/cycles/download costs and available budget. Previous
  disposable rehearsal measured 1,718,676 -> 81,279,380 stored bytes; that is not
  production billing. Audio FLAC content is 74,057,243 bytes plus 30,532 manifest.
  A full cold music cycle downloads the approved segments lazily, not at boot;
  browser quota/eviction/private mode may cause downloads again. Encoded cache is
  capped at 90 MiB. Measure actual asset-canister charging before authorization.
- Obtain all six substantive hosted CI PASS for the exact corrected candidate.
  The informational BLOCKED production inventory job is not a release gate PASS.
- Preserve deployed pre-audio rollback assets. Never alter paid backend state.
