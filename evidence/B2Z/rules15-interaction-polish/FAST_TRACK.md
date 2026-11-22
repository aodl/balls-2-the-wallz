# Rules15 interaction polish qualification correction

The earlier [hosted run](https://github.com/aodl/balls-2-the-wallz/actions/runs/44953233305)
qualified the binary identity but failed the browser and installed-IC jobs.
That candidate is archived at commit `da83b5213c7da696d4f6e125d334f94a58bd0459`.

- The tactical hover test now selects a settled, hit-tested board point,
  asserts its exact canonical cell and checks that pointer input on the Move
  panel reaches the panel and leaves the board and prepared memo alone.
- The quantity rail measures the actual minimap and four moving compass
  buttons. Chromium restored the 240px Fire scrollport at 320×640 from 190px,
  with zero toolbar drift. The existing contracted and rotated pinch tests
  still exercise the original quantity and payment-readiness assertions.
- The installed historical transition was instrumented without relaxing its
  certificate or packet assertions. A local reproduction saw the existing
  payment authority legitimately close after the first enabled observation.
  The authentic memo remained `MOVE 0`, the browser's clipboard permission
  was granted and no clipboard write occurred. The UI reported
  **Verification delayed** while it caught up on a newer certified head.
  The former hosted failure did not retain the per-click transcript.
- The test now uses actual pointer gestures with a settled panel. It can
  retry a gesture only when it proves that certified authority closed and
  the application made zero clipboard attempts. It still requires one
  successful native write of the exact memo and explicit success feedback.
  A test with genuine permission denial checks the exact manual clipboard
  fallback. The pause, stale-packet, epoch and playback checks remain in place.
- The contracted Move panel now ignores camera controls hidden by the compact layout. At 320×300 the complete disclosure fits within its scrollport. The same test waits for the fixture global to exist before reading it.
- The fixture uses distinct board pixels for successive target selections so
  synthetic camera relocation does not create an unrelated native double-click.

The frozen runtime asset change is confined to the embedded observer bundle.
Only the private build manifest also changes in staging. Rules15 backend
inputs, price and memo policy, security policy, audio and all other public
asset identities remain byte-identical.

Clean runtime source `b0dc485707937b71cfdd7ec042b4cd2922db73fa` produced two byte-identical embedded
modules, SHA-256 `a7436dd9a8c7e7c761118a9776d27ecada3d3d5f55fb0090777f062037c31b4e`. All 86 public assets and six gzip
variants passed certified disposable delivery. Browser Rules15 startup,
60 FLAC decodes and the standalone HTTP 404 also passed.

The corrected historical browser reproduced an authority-fenced pointer
gesture on the intended Copy button. It made zero clipboard attempts,
recovered and then successfully wrote the exact old-epoch memo.
The new-epoch native memo also passed. A separate Rules15 Move fixture
denied the native Clipboard API and copied exact UTF-8 with Control+C.

[Clipboard trace](browser/fast-track-clipboard.json) ·
[320px Fire panel](browser/fast-track-320-fire.png) ·
[Contracted Move panel](browser/fast-track-320-contracted-move.png) ·
[Embedded module](artifacts/embedded-module.json)

The [first corrected hosted run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45009062810)
passed the tactical and refinement steps. It exposed an older Move preview test
that compared the cannon's in-progress Aim exit animation with the already
authoritative ghost heading. The test now waits for renderer convergence and
keeps its exact matrix comparison. The 320px case passed locally. This
test-only correction leaves the frozen runtime and embedded Wasm unchanged.
