# Rules13 frontend correction

## Automatic Fire

The installed frontend converted stored cannon heading 6827 directly to the decimal string `37.5018310546875`. The canonical Ledger parser allows two fractional digits. The rejected draft blocked the quote and the aiming controls before the owner edited the heading.

The selection path now rounds the unsigned 16-bit heading to the nearest centidegree with integer arithmetic, wraps the result at 360 degrees, and emits the shortest exact decimal. The aim and preview use the heading decoded from the same memo bytes. The live cannon now produces `FIRE 1 37.5 1` in the corrected preview. The Rules13 parser and authoritative stored heading remain unchanged. All 65,536 possible headings passed canonical parsing, nearest-direction, rounding-boundary and finite projection checks in all four views. The focused camera, quantity and payment checks passed 44 tests and the HTTP suite passed 21.

The before capture comes from the installed frontend. The after capture uses a local frontend with the actual certified production Rules13 backend. Read-only Chromium tests at 1440×900, 390×844 and 320×640 observed automatic Fire, the aim target, quantity, Shout, Copy, Keep and all four compass choices. [Live baseline](https://github.com/aodl/balls-2-the-wallz/blob/97e98bc61f06747168fc77ab6813e2df79c10cf9/evidence/B2Z/rules13-context-structures/production/live-auto-fire-defect.png) · [After](browser/320-authenticated-fire-preview.png) · [Trajectory guide](browser/320-authenticated-heading-guide.png) · [Browser results](browser/authenticated-preview.json)

## Contracted touch and stable panel

At 320×640 after contraction, the retained candidate left the keyboard accommodation pan in place. The first touch landed on the payment panel while the board was still covered at that coordinate. The trace contains no admitted board pointer or capture. The corrected layout restores the earlier pose when the action and camera intent remain unchanged. A deliberate pan, rotation or context change releases that restoration. The existing resize fence releases captures. The narrow toolbar now holds the same anchor between inspect and Fire, and the payment body uses the existing scroll area. An empty navigation container no longer intercepts touches over the preview after its button is hidden.

The retained 347.15° journey passed with two distinct captured pointer IDs, complete release, a zoom change, fixed quantity geometry and no pinch-induced edit of the drafted heading. It also passed with East at the top. The live Rules13 world added an edge case where a quarter turn placed the aim handle under the payment card. The card now clears the aiming orbit after the turn while preserving the camera centre. In the authenticated preview, native touch capture moved from a single aim pointer to a two-finger pinch, zoom changed from 64 to 42.48, and the canonical memo stayed fixed. [Rotated failure](browser/320-rotated-aim-before.png) · [Rotated correction](browser/320-rotated-aim-after.png) · [Trace](browser/320-rotated-rules13-preview.json) The populated 320px construction capture was accepted under the unchanged preview hit-testing assertions. Desktop and 390px player refinement runs also retained the toolbar geometry. From and To remain plain text. The regression uses native clicks on their visible text containers and checks both card geometry and scroll after the panel settles. [Retained failure](browser/320-retained-pinch-failure.png) · [Pointer trace](browser/touch-trace.json) · [347.15° panel](browser/320-347-15-panel.png) · [Construction preview](browser/320-build-hit-testing.png)

## Authority and recovery

The corrected preview authenticated the existing Rules13 history throughout. Browser-only query failures disabled payment Copy and preserved the same session, camera, draft, playback queue and payment panel geometry. Copy recovered after successful authentication. The probe issued no write request. Production Rules13 continuation and its activation evidence are independent of this frontend correction. [Reconnect trace](browser/reconnect-preview.json) · [Production Rules13 activation evidence](https://github.com/aodl/balls-2-the-wallz/tree/97e98bc61f06747168fc77ab6813e2df79c10cf9/evidence/B2Z/rules13-context-structures/production)

The prior production frontend is retained as the exact immutable `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7` Wasm. Rehearsal on a disposable frontend verified its restoration from a snapshot and certified all 84 restored GET and HEAD responses plus the alternate routes. The original failed `11d9a93d53da527dac1a707e08b8599f7018826aee22b8ef1952f4021f801570` artifact is independently retained. The production Rules12-era legacy snapshot remains outside the Rules13 correction recovery path. Physical-device mobile testing and P09 dense-audio qualification remain outstanding.

## Exact candidate

The runtime source is `ccbcad4313c49a006a89f76740b4f7476fa75079`. The first hosted source for these bytes was `ea7e052fe604f5df4433a8f701c8f982019b47b1`. The immutable frontend inventory has 84 public entries and six gzip representations. All 61 audio files are unchanged. The full build inventory digest is `e9978831dd050ae1d995410f8ae616515f2ac587da4e144bf796d2d0f029a88a`. [First hosted run for these bytes](https://github.com/aodl/balls-2-the-wallz/actions/runs/44749599872) · [Build inventory](artifacts/frontend-inventory.json) · [Provenance](artifacts/provenance.json)

The independent immutable frontend job built raw module `05b9223a1004a1d85fe4d0f2e0e135c04bee0034746ce3d0eab2b9734d9b3c2c` twice with identical bytes and SHA-256. Its embedded inventory SHA-256 is `31a0812164e102cdee038d0ecc2fa98f57848b63753029a44439f513513e60e9`. The raw module is 77,072,295 bytes. A same-ID disposable upgrade from the exact installed predecessor verified all 84 GET/HEAD bodies, six gzip representations, alternates, 404 and certificate negatives on that exact module.

## Release decision as of 14:12 UTC

Deployment is held while the exact hosted browser and installed-game gates run. Source conformance, native conformance, packaged consumers, runtime-lab Wasm and independent immutable frontend identity have passed. The verified European frontend still serves `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7`. The latest read-only preflight independently certified its 84 public assets and observed the exact paid Rules13 backend at publication 13187 with source cursor 40180669 and all-time received value 100,000,000 e8s. These observations predate installation and must be refreshed. [Frontend procedure](RELEASE_PROCEDURE.md) · [Cycle and recovery estimate](preflight-estimate.json)

The final raw candidate was installed on a disposable frontend and served the browser probes directly. Its deployment descriptor bound the actual Rules13 source for read-only observation. Browser input, ordinary authentication, the 320px rotated two-touch route, clipboard and the guide passed. The production frontend remained on its previous module during the probe. [Exact-module browser results](browser/disposable-embedded-browser.json) · [HTTP-v2 checks](artifacts/disposable-http.json)

## Updated qualification and production read

The first hosted run for these bytes exposed a harness race in the 390px forced-colour inspection. The Focus button became disabled when the latest layout found the cannon already framed. The revised harness waits for the same settled-layout conditions used after other controls, then follows the existing optional Focus route. The 390px cases passed locally without changing the frozen runtime. The complete hosted rerun uses source `284fa25bf252dd5a66c9ff45c6a5578204cddbdf`. [Full rerun](https://github.com/aodl/balls-2-the-wallz/actions/runs/44751985953)

The exact disposable immutable module served the branded 404 with JavaScript disabled. Chromium decoded all 60 shipped FLAC files and observed nonzero music output. [JavaScript-disabled 404](browser/real-404-320.png) · [Audio results](browser/disposable-audio.json)

The 14:17 UTC certified production read advanced to publication 13223 on unchanged Rules13 with one cannon and one ball, 100,000,000 e8s received, the same source cursor and zero pending source records. The frontend controller status still reported the predecessor module, 318,648,373 bytes of memory, zero reserved cycles and 1,037,142,436,078 total cycles. [Timestamped backend observation](production-readonly-1417.json)

The complete hosted browser job passed on the rerun. Its remaining release gate is the installed-IC job. The disposable embedded site separately pasted all three exact Copy outputs into a browser test wallet at desktop, 390px and 320px. Native paste used the real OS clipboard, with clipboard reading unavailable from the game origin as intended. From and To clicks preserved card and scroll position. The 14:29 UTC read also replayed six ordinary European Rules13 publications bit-for-bit since the prior read. [Native wallet results](browser/disposable-native-wallet.json) · [Production replay](production-observed-replay.json)

## Installed-game gate and exact rerun

Hosted run 44751985953 passed the other five substantive gates and independent
immutable frontend identity. Its installed-IC job passed 66 of 67 cases. The
remaining Rules11-to-Rules12 case passed Ledger processing, redirect
presentation and authenticated independent replay. Its legacy War Cry test
checked the first observer at about 58.2 seconds after that observer's bubble
started. The observer checked earlier had started the same event 3.6 seconds
earlier and had already expired after 60 seconds. The failure therefore
establishes a harness clock mismatch and does not establish premature or late
speech expiry in the first browser.

The test-only correction waits until each observer's independently observed
60-second lifetime has elapsed and asserts detachment and no replay after
foreground return. The complete hosted rerun uses the same frozen Wasm and
asset inventory. Production stays on the previous frontend until this exact
rerun finishes successfully. [Failed installed case data](hosted-hidden-speech-failure.json) · [Current full hosted rerun](https://github.com/aodl/balls-2-the-wallz/actions/runs/44764887931)
