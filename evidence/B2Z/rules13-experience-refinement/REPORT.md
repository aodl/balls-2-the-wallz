# Rules13 frontend experience continuation

The frontend uses one camera projection for rendering, pointer picking, minimap navigation, focus, overlays and the selected-ball guide. The camera compass changes only the view. The guide comes from the currently presented authenticated trajectory and fades within the viewport. Territory lines now brighten within the existing terrain shader and keep the owner's hue. The territory atlas and immutable audio remain unchanged in scope.

The wallet panel uses Pay to Fire, Pay to Move, Pay to Build & Fire, Pay to Build & Divert, and Pay to Reorient. Fire and additional cannon construction show the requested ball count. Principal abbreviations are plain text. The full recipient remains available to assistive technology and the Copy/manual flow. The account control still opens payer reassociation. The requested gameplay message is shown alongside independent Ledger fee and retention information. The UI calls the structure a Diverter and preserves `DEFLECT`, `DROT` and `DMOVE` byte semantics. Rules13 Shout remains restricted to Fire and New.

Production browser checks exposed a precision bug in the original Rules13-compatible frontend. The automatic Fire action fed the raw conversion of stored heading 6827 to the two-decimal Ledger parser. The candidate uses 37.5 for the canonical draft and leaves the authenticated cannon heading untouched. The viewer verified the repaired automatic action in an actual authenticated Rules13 world at 1440×900, 390×844 and 320×640. The same browser sweep covered 347.15° aiming, quantity increase and decrease, all four compass orientations, centre and zoom stability, retained payment draft and the selected-ball guide. [Browser assertions](browser/rules13-rotation.json) · [320px Fire](browser/rules13-320-fire.png) · [Trajectory](browser/rules13-390-trajectory.png) · [Compass recording](browser/compass-390.webm)

The tested installation candidate is exactly 77,071,271 raw bytes, with 84 public assets and all 61 audio files signed into the module. [Module record](artifacts/embedded-module.json) · [Public inventory](artifacts/embedded-inventory.json)

| Input | SHA-256 or commit |
| --- | --- |
| Clean content source | `042201a98957b101bca15b5aa15720fa020b7f34` |
| Raw frontend Wasm | `11d9a93d53da527dac1a707e08b8599f7018826aee22b8ef1952f4021f801570` |
| JavaScript | `e3e09d5ff8e4be6a8e9fb8d08d1c851484825f863a65ae1a81c252449c38d8c4` |
| Embedded inventory | `63d33aaea5ad022613bda659b4f8f19a7ca2c0638923cad588a1f30e6b9ee68b` |
| Recovery and current production frontend | `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7` |

## Performance scope

A matched single-account stationary sample used 60 RAF intervals per condition in headless software-rendered Chromium. Desktop baseline/candidate median was 83.4/50.0 ms and p95 was 133.3/83.3 ms. The 320px median was 16.7 ms for both, with p95 33.3/33.4 ms. These exploratory samples precede the last compass hit-target and Fire precision fixes. The tests ran on a shared host and do not establish a physical-device performance improvement. The later live Rules13 candidate sweep shows local response and working controls at all three viewports. It does not qualify dense scenes, physical devices or P09 dense audio. [Frame samples and ranges](browser/frame-sample.json)

## Release boundary

The production frontend remains on the old embedded artifact. A later installation requires complete hosted and browser qualification on the new exact source, fresh frontend headroom verification and recovery availability. The live Rules13 world has no Diverter instance. The hosted Rules13 release qualified live paid Diverter operations on the disposable official Ledger and Index. This continuation has no new production payment evidence.
