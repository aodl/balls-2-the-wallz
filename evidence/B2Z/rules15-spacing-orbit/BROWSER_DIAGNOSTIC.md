# Browser qualification diagnostics

## Supplementary live-read timeout

The supplementary `.work/read-live-rules14.py` launch timed out at line 18 waiting for `()=>globalThis.__b2zExperience?.session?.ready` after 85,000 ms. It loaded the production-built site from the development server at `127.0.0.1:18187`. The existing populated Chromium orbit, payment and mobile-gesture acceptance used separate harnesses.

A second run captured the full traceback, Chromium console, failed network events, screenshot and Playwright trace. The server delivered `connect-src 'self'`. Chromium blocked both the IC API `query` and `read_state` at `icp-api.io` before reaching the network. The screenshot showed “Connection delayed · retrying”. There was no certificate response to verify.

The control used the same sandboxed browser, read-only request filter and unchanged readiness condition. It loaded the then-frozen embedded frontend Wasm `b4c779a813a92e89fc57cbf83050b81d8d8fc3be0255ea660504e88f52cd35ec` on a disposable local canister. The embedded router's production policy allowed the configured IC API. HTTP reads and the authenticated Rules14 observation succeeded. The observer reported live mode, Rules14, and readiness to prepare payment instructions from verified data. The demo-server failure was a deterministic policy mismatch in the supplementary harness. The production policy and readiness assertion were preserved. Raw diagnostics are retained locally under `.work/final-diagnostic/`.

## Hosted browser regression

The first hosted run reached `tools/player_playability_browser.py` inside the minimal human-interface journey. The Fire test explicitly required the cycle indicator to be hidden while quantity was visible. The corrected contract keeps the cycle indicator available during aiming. The updated test checks that Chromium can hit both the indicator and the aim handle while the quantity editor is visible. The Move meter, exact memo, transfer readiness and remaining interaction assertions continue to run. The change touches browser coverage only. [First hosted browser job](https://github.com/aodl/balls-2-the-wallz/actions/runs/44898244310/job/136828404651)

## Contracted layout and Focus

A later hosted run reached the separate player-refinement journey. At 390×430 the active cannon's projected centre was inside Quantity Plus. The artifact recorded the full hit-test stack, editor strip and panel bounds. A local Chromium reproduction returned the same coordinates and failed the unchanged assertion. At 320×640, the rectangular bounding box of all compass controls together also reserved an empty corner over the editor rail. It reduced the payment scrollport to 186px.

Camera composition now uses the same measured editor strip as the payment layout. Its fit calculation accounts for margins measured in CSS pixels, which stay fixed while zooming. The editor rail uses the actual compass and map rectangles. The cycle control remains clickable just above the camera buttons on narrow screens. The payment scrollport measures 240px at 320×640 with zero toolbar drift. Explicit Focus and its settled predicate share the visible panel obstacle, and the toolbar keeps the same clearance during the move. The original hit-test assertion remains intact. [Hosted failure and browser artifact](https://github.com/aodl/balls-2-the-wallz/actions/runs/44898901281/job/136830438946)

The rotated pinch harness also raced the viewport restore on slower frames. It now waits for the application to leave the contracted layout and reserve its normal editor rail before placing the synthetic camera pose. The original aim-handle hit test, native two-touch transition, zoom and exact draft-heading checks still execute.

The 320px visual closeout separately caught a construction preview under the stationary toolbar after targeting a different tile. The narrow layout now fits the real cannon and the provisional Build preview above the panel, including the full 44px handle at all four aim directions. It reserves that clearance when the target changes. Heading edits leave the camera pose unchanged. Native hit tests passed for all fixture sites, and the original keyboard contractions and financial-field checks passed.

## Orbit fixture initialization

The next hosted browser run passed the refinement, visual closeout, quantity and audio cases. It then sampled a return-to-territory animation during initial orbit setup. The recorded starting pose already differed from the declared scene centre and scale, before the first turn. The fixture now cancels pending entry navigation through the application's entry-cancel event before placing its scripted camera. It requires the exact starting pose, then the same pose after every compass turn. The returning-player tests continue to exercise normal navigation. This correction is confined to the browser harness. [Hosted orbit failure](https://github.com/aodl/balls-2-the-wallz/actions/runs/44902034598/job/136839920198)
