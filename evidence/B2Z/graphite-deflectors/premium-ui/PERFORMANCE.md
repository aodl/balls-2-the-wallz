# Matched frontend performance

## HUD-only isolation before the cannon addendum

Chromium 153.0.8010.12 on Linux x86_64, Intel Xeon Platinum 8272CL, ANGLE Vulkan SwiftShader. DPR 1. Desktop and mobile viewport emulation use the same software renderer. A/B/B/A uses two local servers with the same production policy, gzip settings, cache handling and authenticated European data source. Browser contexts start clean and repeat navigation for a warm sample. This controls asset delivery without replacing or bypassing production certificate or state verification.

| Viewport | Cold verified world, baseline → candidate (ms) | Warm verified world, baseline → candidate (ms) | Native click to next rAF, median (ms) | Continuous frames, median run p95 (ms) |
|---|---|---|---|---|
| 1440×900 | 1467.6 → 1398.5 | 1183.9 → 1129.0 | 102.0 → 103.3 | 141.8 → 150.0 |
| 390×844 | 1301.5 → 1570.0 | 934.9 → 1178.2 | 49.9 → 49.6 | 83.4 → 83.4 |
| 320×640 | 1438.7 → 1259.7 | 962.5 → 892.7 | 34.9 → 39.1 | 66.7 → 66.7 |

Startup has four desktop samples and two samples per portrait viewport for each cache condition and release. The linked data gives sample ranges and timestamps. Frame p95 is computed per driven interaction run from sampled animation frames and reported across two runs per release and viewport. Click-to-rAF includes browser event queue/render scheduling and is a response proxy. It does not measure display scanout. The runs drove aim, quantity, action changes, Deflector direction, panning and zoom with the panel open. They were never used to judge physical-device frame rate.

A 390px startup follow-up alternated the builds over eight cold samples each. Median verified-world timing was 2026.4 ms baseline and 2095.9 ms candidate, about 3.4%. Median certificate-to-world timing was 509.1 and 531.6 ms, about 4.4%. Shell first paint medians were 164 and 160 ms. The initial low-sample divergence did not reproduce at its original size. Both paths use the same bundle and its unchanged authentication work. Live-network delay remains variable in both scopes. [Raw follow-up](results/paired390.json)

The 320px click proxy increased about 4 ms (12% from a sub-40 ms baseline), with unchanged frame cadence. Desktop frame p95 increased about 6%, with about 1 ms difference in the click proxy. Cumulative style recalc rose from 130 to 184 ms across the desktop interaction window, 80 to 96 ms at 390px and 73 to 96 ms at 320px. The interaction layout times stayed near 38, 31 and 28 ms respectively. The absolute click/sustained frame observations do not show a material UI hitch in this environment. The style-recalculation and 320px click differences remain useful follow-up signals on physical hardware.

The CSS change adds about 2.9 KB uncompressed along with unchanged layout and renderer code. The JS transfer, hash and recent observation optimizations are unchanged. The retained 1.57 s cold and 150 ms frame p95 reference are consistent with this software desktop baseline. No throughput, cycle, dense audio or phone performance claim follows. P09 stays FAIL/unqualified.

[ABBA breakdown with ranges](results/abba-summary.json) · [A1](results/abba-a1.json) · [B1](results/abba-b1.json) · [B2](results/abba-b2.json) · [A2](results/abba-a2.json)

A mobile-only repeat alternated two A/B/B/A waves through the 347.15° workflow with 80 native touch responses per release. The combined median was 99.3 ms baseline and 92.8 ms candidate, so the initial overall increase did not repeat. The quantity-plus sub-sample differed (87.0 to 100.4 ms). The other four controls were faster in that repeat. [Mobile control breakdown](results/paired320.json)

The isolated quantity comparison used four A/B/B/A waves, with 160 touch responses in each build at 320×640 and the same 347.15° Fire pose. Baseline median was 88.6 ms and candidate median was 82.9 ms. The earlier quantity-plus signal did not repeat in isolation (88.2 to 84.6 ms with 80 presses per build). The release clears the measured material-degradation gate on this reference host. Physical device behavior remains unmeasured. [Isolated quantity runs](results/paired-quantity-only.json)

## Combined HUD and cannon freeze

The final cannon geometry changes add 24 triangles per instance, or 9.2% of the cannon mesh. The shared synthetic fixture reported 4 draw calls before and after for both one cannon and 128 cannons. Candidate mixed scenes with 128 cannons and up to 256 visible Deflectors used 6 calls. The probe reported no repeated uploads for stable structure transforms. The JavaScript gains 549 decoded bytes (234 gzip bytes using the matched loopback server). The stylesheet gains 2,885 decoded bytes (535 gzip bytes). [Baseline renderer counters](results/cannon-renderer-a.json) · [Combined renderer counters](results/cannon-renderer-b.json)

The second full-game A/B/B/A was run on the same two-CPU reference host under substantial co-tenant contention. It records the narrower load and frame signals without attributing all of the observed changes to the geometry.

| Viewport | Warm usable-frame proxy, baseline → combined (ms) | Click-to-rAF median (ms) | Median run frame p95 (ms) |
|---|---|---|---|
| 1440×900 | 2517 → 2727 | 255 → 266 | 1392 → 1300 |
| 390×844 | 2174 → 2366 | 180 → 193 | 842 → 892 |
| 320×640 | 3519 → 2451 | 194 → 147 | 725 → 950 |

Individual desktop p95 crossed 683 to 2100 ms in the *same baseline build*. 320px cold runs were initially slower in the candidate while its corresponding warm median improved. At 320px the pre-world interval after certificate verification was 632–757 ms before and 662–762 ms after in cold runs. Most of the cold total difference occurred by the certificate mark. These samples cannot establish a physical-device performance change. [Combined data and sample ranges](results/combined-abba-summary.json) · [A1](results/combined-a1.json) · [B1](results/combined-b1.json) · [B2](results/combined-b2.json) · [A2](results/combined-a2.json)

The tightly interleaved foreground retest used warmed authenticated tabs, the same 320×640 pose, the same 786,432-pixel backing-budget setting, and the same native aim-drag sequence. It collected 74 frame intervals per build. Pooled median frame time was 166.7 ms before and 158.3 ms after. Pooled p95 was 466.6 ms before and 399.9 ms after. The broad 320px frame regression did not reproduce. These are software-window timing measurements on this shared host, with no physical display-latency claim. [Foreground pairs](results/combined-mobile-foreground-paired.json)

The repeat cold-navigation sweep completed its first A/B/B/A without a sustained candidate startup difference. That wave's authenticated-world medians were 3241.7 ms before and 3211.0 ms after. A later candidate iteration timed out before world admission and the longer sweep stopped. A separate fresh 320px A/B/B/A then authenticated the same head and enabled exact Copy in all four trials. The cold limitation remains in the record. [Partial cold series](results/combined-mobile-cold-partial.json) · [Timeout](results/combined-mobile-cold-attempt.log) · [Authenticated retest](results/combined-narrow-trust-paired.json)
