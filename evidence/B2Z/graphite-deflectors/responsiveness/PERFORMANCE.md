# Responsiveness measurements

The initial read-only production sample verified the deployed JavaScript `c5b688ae…971db`, the exact Rules12 normal module and a genuine world with one cannon and one ball. Chromium 153.0.8010.12 used ANGLE Vulkan SwiftShader on Linux x64, Intel Xeon Platinum 8272CL, DPR 1 and an unthrottled network. The direct live desktop baseline reached the authenticated world in 2.57 s median, range 2.53–3.02 s, across three new contexts. The warm navigation still fetched the script on the live origin in those samples. [Initial browser measurements](results/production-baseline.json) · [Baseline canisters](results/predeploy-backend.json)

For measurement parity, public asset bytes for both sets were served on loopback with identical gzip and cache policy. The viewer authenticated the live European backend directly, with the same small paid scene, Trickle cadence and input sequence. Desktop used three cold and three warm loads per set. The 320×640 viewport used one each. Sequential network jitter remains visible in the ranges. Loopback shell timings do not predict owner internet delivery time. [Baseline](results/matched-baseline.json) · [Adaptive freeze](results/matched-adaptive.json)

| Startup measure | Baseline median (range) | Adaptive median (range) |
|---|---:|---:|
| Desktop cold first contentful paint | 116 ms (112–180) | 104 ms (104–156) |
| Desktop warm first contentful paint | 256 ms (232–336) | 208 ms (188–232) |
| Desktop cold authenticated world | 1,863 ms (1,505–1,915) | 1,568 ms (1,392–1,783) |
| Desktop warm authenticated world | 1,226 ms (1,194–1,367) | 1,172 ms (1,078–1,243) |
| 320×640 cold / warm authenticated world | 1,586 / 1,105 ms | 1,442 / 868 ms |
| Cold gzip app transfer with headers | 454,873 B | 317,254 B |
| Warm loopback app transfer | 0 B | 0 B |
| Each unchanged-head query response | about 25.6 KB | about 6.5 KB |

The baseline acquired an atomic observation bundle before discovering that the head was unchanged. The freeze retains that one-call bootstrap, then requests observation-only polls. Each reply is still certificate-verified. A genuinely changed head separately fetches and verifies its exact bound artifact bundle, with the same retained-history and chunk checks. The freshness policy and the read-only operational authority boundary are unchanged. Small-scene unchanged poll response bytes fell about 75%.

Startup now overlaps source descriptor, configuration and the opening history fetch. The optional history request's deadline reaches the underlying SDK requests. The first world still selects one initial presentation, either a verified retained interval or the current snapshot, so late work cannot rewind presentation. In a separate one-load-per-version CDP trace, world-to-first-instanced-draw submission was about 60 ms on both versions. Synchronous compile/link calls were below the host clock's resolution, and GL compile-status queries took under 1 ms total. This does not isolate asynchronous GPU compilation. The trace found no reason to insert extra shader work before the first view. Audio was inactive during gesture-free startup. [Startup CDP and GL diagnostic](results/startup-trace-summary.json)

## Interaction

The paired journeys use native pointer input and measure from an actual event to the next animation callback, a visual-response proxy that does not claim compositor-to-display timing. One journey per viewport and version includes aiming, changing quantity, switching actions, orientation, panning and wheel zoom. The frame distributions use 267–285 measured foreground intervals per journey. The separate match used no video capture during measurement.

| Viewport | Frame p50 before → after | p95 before → after | Longest interval before → after |
|---|---:|---:|---:|
| 1440×900 | 83.4 → 83.2 ms | 183.2 → 150.0 ms | 266.8 → 266.6 ms |
| 320×640 | 33.3 → 33.3 ms | 83.3 → 66.6 ms | 183.4 → 150.0 ms |

| Native control input | Desktop before → after | 320×640 before → after |
|---|---:|---:|
| Quantity plus | 77 → 64 ms | 32 → 34 ms |
| Move | 121 → 114 ms | 66 → 51 ms |
| Build cannon | 145 → 103 ms | 54 → 12 ms |
| Build Deflector | 93 → 76 ms | 45 → 33 ms |

Desktop CDP script time across the sequence was 1.72 → 1.52 s, layout 41 → 34 ms, style 149 → 116 ms and instrumented task time 27.6 → 23.1 s. These totals include browser scheduling and vary with sequence duration. They do not identify every long frame with a particular handler. The installed SwiftShader host did not expose the GPU timer-query extension. The actual frame intervals capture the effects of rendering and scheduling together.

Status updates now change Copy readiness without recomputing placement and quotes. Full refresh remains on changes to verified world, selection and action state. Aiming keeps only the latest pointer move per frame, with a release flush. Idle speech no longer asks for layout obstacles each frame. Panel backdrop filters were removed. The fixed sharper 1.296 MP candidate had a worse 300 ms desktop p95 in the longer qualification journey, so it was discarded. The final viewer starts at 1 MP, lowers to 786,432 pixels during sustained low frame capacity, and raises to up to 2,073,600 pixels at sustained fast cadence. DPR remains capped at 1.5 and MSAA stays off. The measured software desktop selected the lower tier (1121×701 backing); the 320×640 view retained full CSS-pixel backing. A native GPU and physical mobile device were unavailable. The desktop Move/Build samples remained near or above 100 ms, and long software-renderer stalls remained. Physical-device responsiveness and the owner's original lag report remain open. [Rejected fixed backing](results/rejected-fixed-backing.json) · [Renderer capacity and instancing smoke](results/renderer-fixture.json)

A reverse-order repeat ran the adaptive build first, then the baseline. Desktop p95 was 166.7 → 133.4 ms and the desktop Move, Build and Deflector samples were 138 → 101 ms, 130 → 97 ms and 102 → 72 ms respectively. The 320×640 p95 was essentially unchanged at 66.8 → 66.6 ms in that repeat. This narrows the software-browser observation. User-device results remain outstanding. [Reverse-order baseline](results/reverse-order-baseline.json) · [Reverse-order adaptive](results/reverse-order-adaptive.json)
