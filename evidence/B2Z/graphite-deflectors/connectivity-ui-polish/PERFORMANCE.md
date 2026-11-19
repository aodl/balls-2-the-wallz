# Connectivity and responsiveness measurements

The production baseline loaded the installed graphite frontend on its live
origin. The matched candidate used the exact frozen assets on loopback with
the same pinned European IC API and verified paid world. Both runs used the
same Linux host and Chromium software rendering. The samples are from the
settled Fire session and exclude initial account entry.

| Metric | Previous production | Exact candidate |
|---|---:|---:|
| Active observation window | 314.9 s | 324.0 s |
| Accepted distinct publication heads | 4 | 5 |
| Lean observation responses per minute | 39.06 | 10.00 |
| Lean observation encoded bytes | 1,330,519 | 350,665 |
| Signed operational responses per minute | 23.63 | 22.22 |
| Signed operational median and p95 HTTP latency | 272 / 423 ms | 315 / 490 ms |
| Lean observation median and p95 HTTP latency | 268 / 394 ms | 334.5 / 499 ms |
| Non-200 or cancelled steady observation responses | 0 | 0 |
| Sampled reconnecting frames | 19 | 0 |
| Sampled central spinner frames after the board was verified | 15 | 0 |
| Sampled Copy-disabled frames | 27 | 3 |
| Sampled global status changes per minute | 2.29 | 1.11 |
| Sampled Copy state changes per minute | 2.67 | 1.11 |

The exact candidate reduced steady observation requests by about 74% in these
runs. HTTP response latency differed between the two time windows. The fix
does not claim a faster gateway. The candidate's transition observer recorded
brief 1.2–2.0 s Copy holds as newly detected heads were admitted, followed by
immediate recovery. The rendered world and contextual controls remained
usable. The independent 30-second witness and 15-second signed readiness
limits still govern genuine staleness.

Trickle advances one logical tick per roughly 100 seconds. The new cadence
caps the unchanged-head delay at 4 seconds and reduces it toward the old
500 ms cadence for fast publications. Producer progress and visibility
return can request a sooner observation. Near witness expiry the observer
also reads faster. Raw schedules are subject to actual host load.

Three baseline and four candidate head changes occurred during sampling.
From the observation response immediately preceding the artifact read to the
first sample of the admitted head, the baseline measured 1.03–1.71 s
(median 1.54 s) and the candidate 1.63–2.97 s (median 2.47 s). This interval
includes artifact verification and browser-sampling latency. It starts after
detection and cannot establish the producer-to-browser delay. The actual
producer commit timestamp was not available in these sampled replies. No
publication gap in either trace required releasing or rewinding the verified
world.

## Matched load and interaction runs

Both exact releases were also served from loopback, with the same authenticated
European source. Runs followed a previous/candidate/candidate/previous order
at DPR 1, on Chromium 153 with Vulkan SwiftShader on a shared two-CPU host.
Each row has two cold and two warm runs per release. The numbers below are
medians in milliseconds. Load cells include the observed range. For frame
percentiles, 268–317 animation intervals were captured per interaction run.

| Viewport | Cold first useful world before → after | Warm first useful world before → after | Trusted input to next frame callback before → after | Frame p50 / p95 before → after |
|---|---:|---:|---:|---:|
| 1440×900 | 6,147 (2,027–10,267) → 2,268 (2,018–2,519) | 3,484 (1,343–5,626) → 1,466 (1,347–1,584) | 182 → 163 | 408 / 1,392 → 100 / 283 |
| 390×844 | 2,613 (1,763–3,462) → 2,034 (1,796–2,272) | 1,721 (1,389–2,054) → 1,308 (1,307–1,309) | 98 → 89 | 92 / 400 → 67 / 208 |
| 320×640 | 2,849 (1,866–3,832) → 2,268 (1,755–2,782) | 1,342 (1,328–1,356) → 1,650 (1,339–1,961) | 65 → 62 | 58 / 200 → 50 / 100 |

The click timings use 14 trusted input events per viewport per release and
end at the next animation callback. They are a presentation proxy. Candidate
desktop still exceeded the 100 ms working target on this host. The earlier
desktop wave experienced severe co-tenant stalls. The longest baseline frame
interval reached 4.73 s and the longest candidate interval 1.57 s. Sample
ranges overlap, including the warm 320px result. These runs do not establish
a hardware-specific improvement or a statistically meaningful small change
in startup latency. Layout and style processing medians decreased in all
three matched comparisons. There were zero measured browser exceptions.
The shell paint, verified-ready timings, layout work and per-run p99 values
are recorded in the measurement files.

[Matched summary](results/matched-performance.json) ·
[Individual observations](results/matched-run-observations.json) ·
[Read-only timeline comparison](results/baseline-candidate-timeline-summary.json)

## Deployed frontend observation

The production-origin retest covered 324.8 seconds and four accepted heads.
Lean queries averaged 13.67/minute, down from 39.06/minute on the previous
production release. That is 65% fewer queries per minute. Lean response
bytes were 480,307 versus 1,330,519 over the respective measured windows.
The new run had zero steady non-200 responses or cancellations. Sampled
status and Copy transitions both decreased to 0.74/minute. The 0.6-second
sampler saw two Copy holds. The DOM observer caught all three distinct
new-head holds at 295–319 ms while the next signed head's artifacts arrived.
None caused a central spinner or reconnect warning.

[Production timing and request data](results/live-observation-summary.json)
