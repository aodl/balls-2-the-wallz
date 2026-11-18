# Functional acceptance

The candidate browser connects to the actual European backend from a local static host with the established upload headers. Native input and exact financial handoff checks are separate from backend execution. No game transaction is created. A browser fault test drops only reads from its own page.

| Check | Evidence |
|---|---|
| Exact 320×640 / 347.15° pose | The same cell-zero camera at scale 64 produced identical workspace coordinates and a 240px scrollport before and after. The measured 130×46px dock remained visible, pointer-active and outside other UI surfaces. Both 44px controls and all dock corners hit the correct element. |
| Returning payer and stable selection | Fresh storage recognised the existing cannon. Explicit Focus and selecting the cannon used the expected camera; selection alone left the view unchanged. |
| Rules12 orientation and amount | The four-direction acceptance drives the actual action. The exact price is 0.1 ICP. The paid backend was queried read-only. |
| Stale output | The browser-only outage disabled Copy while preserving memo, panel rectangle, camera, session, clock and queue, and then recovered. |
| Risk and clearance | The existing Rules12-certified quote drove Move and Build with the retained risk disclosure and clearance explanation. |
| Unit regressions | 80 targeted JS tests passed for structure geometry, paid mechanics, quantity, warnings, memo and War Cry. |

[Actual live baseline journey](results/baseline-live-journey.json) · [Candidate journey against the live backend](results/candidate-live-backed-journey.json) · [Reconnect](results/candidate-reconnect.json) · [Targeted regressions](results/targeted-js.log)

Candidate acceptance is distinct from production-browser verification after the exact assets upload. Physical phones, physical audio and P09 dense-audio qualification are outside the evidence from this browser environment.

The native clipboard matrix at 1440×900, 390×844 and 320×640 passed full recipient, exact decimal amount and complete canonical memo paste into a separate browser page. Browser Clipboard read remains restricted on the game origin by the existing production policy. A separate controlled write denial and legacy-copy refusal exercised the real manual fallback. A 32-byte UTF-8 memo with multibyte text survived Copy, and Update/Keep kept or replaced the exact whole packet as selected. The From control opened account reassociation. No code or policy was changed to facilitate the tests. [Native clipboard and geometry](results/candidate-surface-checks.json)

The split and all three Copy centre lines aligned to 0px error at all three CSS widths. Copy hit targets measured 44×44px and financial text measured at least 14px. At 320px, the normal configured price font measured 14.4px. The host lacks a glyph for the tested rocket emoji. Both builds show a missing-glyph box for that character while preserving the exact UTF-8 bytes.

Chromium native decoded/output-stream tests passed actual tab departures of 5, 35 and 8 seconds, automatic output recovery, second-tab yield/reclaim, optional music-load failure recovery and saved mute after reload. [Audio output and tab-return](results/candidate-native-audio.json)

Forced colours, reduced transparency, reduced motion, and a controlled 200% text-only scale at 320×640 passed. A keyboard Tab selected the next native control and retained a focus outline. The 2× probe is document root text scaling with the viewport held fixed. It provides reflow coverage rather than physical pinch-zoom or browser accessibility certification. The scroll region retained the full memo and control widths without horizontal scroll. [Mode checks](results/accessibility-modes.json) · [Computed state and geometry](results/accessibility-visual-states.json) · [Browser captures](captures/forced-reduced-200-text.jpg)

The combined build repeats the exact 320×640 / 347.15° pose and the desktop and 390px gameplay journeys. An initial narrow attempt stopped on a trust assertion. A separate local clipboard run later displayed “Unable to verify game data” and kept Copy disabled. A subsequent fresh A/B/B/A authenticated the same head in every run and restored normal readiness on both builds. The failure causes were not reconstructed from the initial probes. [Initial diagnostic](results/combined-narrow-initial-attempt.log) · [Exact combined 320px journey](results/combined-320-journey.json) · [Authenticated A/B](results/combined-narrow-trust-paired.json)

## Live browser acceptance

The 1440×900 and 320×640 tests loaded the actual production origin after upload. They authenticated Rules12, tested returning-player entry, Fire, Move, Build and all four Deflector directions, real browser Copy and external native paste, the exact 32-byte memo, manual fallback, Change sending account, and frozen Update/Keep. The 320px test retained the exact 347.15° dock, hit targets and panel geometry. The first manual-fallback assertion sampled too early. The rerun waited for the fallback field to appear and compared its complete value against the captured memo. [Live desktop and mobile results](results/live-browser-surfaces.json) · [Initial harness result](results/live-browser-initial-attempt.log) · [Live desktop](captures/live-desktop.png) · [Live mobile](captures/live-320.png) · [Live manual fallback](captures/live-320-manual-copy.png)

The production-origin reconnect test blocked five browser reads. Copy disabled, the panel/memo stayed fixed, and the original session, clock and queue recovered. Native audio capture passed real 5, 35 and 8 second tab departures, ownership handoff, optional music-load recovery and remembered mute after reload. Physical listening and P09 dense-audio performance remain unqualified. [Live reconnect](results/live-reconnect.json) · [Live native audio](results/live-native-audio.json) · [Native output recording](captures/live-native-music-recovery.webm)
