# Browser qualification diagnostics

## Supplementary live-read timeout

The supplementary `.work/read-live-rules14.py` launch timed out at line 18 waiting for `()=>globalThis.__b2zExperience?.session?.ready` after 85,000 ms. It loaded the production-built site from the development server at `127.0.0.1:18187`. The existing populated Chromium orbit, payment and mobile-gesture acceptance used separate harnesses.

A second run captured the full traceback, Chromium console, failed network events, screenshot and Playwright trace. The server delivered `connect-src 'self'`. Chromium blocked both the IC API `query` and `read_state` at `icp-api.io` before reaching the network. The screenshot showed “Connection delayed · retrying”. There was no certificate response to verify.

The control used the same sandboxed browser, read-only request filter and unchanged readiness condition. It loaded the exact frozen embedded frontend Wasm on a disposable local canister. The embedded router's production policy allowed the configured IC API. HTTP reads and the authenticated Rules14 observation succeeded. The observer reported live mode, Rules14, and readiness to prepare payment instructions from verified data. The demo-server failure was a deterministic policy mismatch in the supplementary harness. The production policy and readiness assertion were preserved. Raw diagnostics are retained locally under `.work/final-diagnostic/`.

## Hosted browser regression

The first hosted run reached `tools/player_playability_browser.py` inside the minimal human-interface journey. The Fire test explicitly required the cycle indicator to be hidden while quantity was visible. The corrected contract keeps the cycle indicator available during aiming. The updated test checks that Chromium can hit both the indicator and the aim handle while the quantity editor is visible. The Move meter, exact memo, transfer readiness and remaining interaction assertions continue to run. The change touches browser coverage only. [First hosted browser job](https://github.com/aodl/balls-2-the-wallz/actions/runs/44898244310/job/136828404651)
