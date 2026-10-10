# S07 observer contract

20 September 2026. Current observer specification; it supplements, not replaces, the S06 simplification contract. No BTZ v3 state, event, score, price, memo, input-seal or publication-v6 rule changes.

## Purpose and trust

Demonstrate the architectural result in a browser: autonomous, committed simulation can look continuously dynamic while observers have no authority over gameplay. This stage is deliberately finite and local. There are no browser command controls, wallet calls, ledger queries, payouts or simulated certificates.

The recording index supplies local publication-root pins. The browser verifies catalog integrity, canonical manifest/seal relationships, artifact chunk hashes, whole-artifact hashes and consecutive predecessor links using the existing client library. The index and pins are distributed with the same application. Consequently this verifies internal content consistency relative to that package, **not independent authenticity**. Replacing the complete site and its pins could produce a different consistent demonstration.

IC certificate authentication is still required for a future live observer. A hash, BLS-shaped stub, backend assertion or successful local replay is not a substitute. The existing certificate-verifier dependency boundary remains fail-closed and is not used by this application.

## Recordings and bounded delivery

`tools/build_observer_recordings.mjs` calls the existing TimelineCoordinator and BTZ kernel. It does not synthesize ball positions or hand-author ownership changes. Each simulation interval is sealed and completed before being published. The tool generates four finite synthetic workloads:

| Recording | Completed segments | Logical end | What it illustrates |
|---|---:|---:|---|
| dense | 12 | 48 ticks | Many trajectories and changing frontiers. |
| admission | 12 | 24 ticks | Two synthetic payments create cannons and initial balls. |
| severance | 4 | 4 ticks | Region transfer, lost balls and cannon elimination. |
| near-impact | 4 | 4 ticks | Causal near-time annihilation and extinction. |

Four genesis catalogs plus 32 completed segments produce 36 catalogs. Stored payloads include authoritative state, original audit events and score bytes, plus the existing compact render projection. Files are generated deterministically; `--check` rebuilds and compares the complete file inventory and contents without rewriting them. These are reference-generated recordings, not independent game-correctness oracles.

Genesis has an empty render projection with the same format identity as subsequent catalogs. Its source-events hash binds the empty genesis event artifact. Genesis itself is a starting snapshot, not an animated simulation interval.

The index is at most 64 KiB, at most 16 recordings, at most 32 segments each, with strict IDs and bounded display text. The client constructs relative paths itself instead of following arbitrary URLs from input metadata. The transport rejects redirects, omits credentials and streams with explicit byte ceilings. Missing or oversized bodies fail without advancing the verified head. Fetches have a ten-second timeout; no retry storm or external mirror search is implemented.

The browser downloads state and compact render artifacts. Audit and score artifacts remain available for audit, but the viewer does not download them merely to draw balls. Their committed hashes are present in the verified catalog. No claim is made that an undownloaded artifact's bytes were checked locally.

## Playback admission

Before a segment enters the buffer:

1. Its catalog and downloaded artifacts pass the existing integrity checks.
2. The projection binds the previous verified snapshot and the catalog's audit-event hash.
3. The start/end snapshots agree with the seal's logical interval.
4. Projection events have increasing source sequence IDs and nondecreasing exact rational times within the half-open interval. Sequence gaps are permitted because unchanged traversal events were intentionally omitted.
5. Supported semantic events reconstruct the final visible cells, cannon locations and ball trajectory equations exactly. Unknown events fail closed.
6. The publication sequence and buffer adjacency checks succeed.

Only then does the application append verified time to PlayoutClock and replace the preceding verified state. Failed downloads or projections leave the earlier accepted state and head unchanged.

Final visual equality is not a proof of every intermediate game rule, hidden bookkeeping field or score. It is a useful conformance check. Independent kernel references and full replay remain distinct evidence. Pending impacts and glow effects are presentation details, not another authoritative physics implementation.

## Presentation model

`BtzView` updates cell ownership, cannon locations and live trajectory maps from semantic events. `SegmentPlayer` applies them monotonically as the playhead advances. It does not compute collisions, decide captures, allocate territory or award prizes.

The renderer converts bounded integer intercepts/velocities and rational timestamps to floating-point coordinates for Canvas. The authoritative calculation remains unchanged. Extremely large or non-finite visual values are rejected, not coerced to an arbitrary position. Visual rounding is not game scoring precision.

One recorded tick is displayed in 0.25 wall seconds at nominal 1×. Replay-speed controls multiply presentation speed; they do not change the simulation. The shared PlayoutClock provides a nominal eight-tick target and two-tick low-water point, reduced for short recordings, with a narrow 0.97–1.03 rate adjustment. Frame deltas are bounded and reset across visibility changes. The final finite tail stops at its exact end rather than looping implicitly.

The queue admits at most four segments and 8 MiB of accounted source/projection bytes. This is **not a peak JavaScript heap bound**: parsed objects, Canvas and browser allocations add overhead. Played segments are discarded, while the final snapshot is retained to validate the next predecessor. Paused playback therefore cannot accumulate an unlimited recording. Delivery is deliberately staged at a 600 ms interval to make buffering observable; that is not measured IC latency.

Pausing downloads prevents new requests; a request already in flight may complete. Playback can consume its verified buffer, slow and then stall. Unpausing resumes from the next not-yet-accepted segment. An integrity error explicitly freezes playback until a user retries. Restart resets the local replay and aborts obsolete requests. Session identity is rechecked after awaits so stale completions cannot change a newly selected recording.

## UI and unsupported convenience cases

The prominent trust banner always says offline replay and not IC-certified. Cannon/ball/cell statistics reflect the playhead. They are not an end-of-day payout leaderboard. Contribution metrics show unavailable values; no cycles or ETH denominator is fabricated.

Reduced-motion preferences start playback paused; keyboard controls, visible focus, an alert region, text territory summary and responsive desktop/mobile layouts are included. This is not a comprehensive accessibility certification, nor evidence across all browser engines.

The observer does not support uploaded arbitrary recordings, seeking into undownloaded history, live reconnect/archive discovery, a general game-renderer plugin registry or wallet-command construction. A completed recording stops. A missing recording produces a visible retryable error. No speculative motion is added to hide failure.

## Static hosting and browser verification

`serve_observer.py` binds loopback only and serves a narrow allowlist of public application/modules/recordings. It disables directory listings, blocks traversal/out-of-scope files, permits no write API, and supplies no-store, nosniff and restrictive CSP headers. It is a development server, not an IC asset deployment. Production hosting/certification remains a separate task.

The HTTP browser mode loads the actual page and expects browser-native Web Crypto and CSP. In this environment navigation is blocked by the managed browser policy. That attempt returns BLOCKED. The policy is not altered.

The **offline browser mode** uses an isolated Chromium document. It injects the original HTML/CSS (with loading links and CSP removed for the fixture document), maps the unchanged ES-module source to in-memory data URLs, supplies fetch responses from local fixtures and bridges SHA-256 to Python hashlib. The fixture transport is also where corruption/delay injections live; the production app has no hidden corruption control or mocked crypto fallback.

Offline mode tests real browser JavaScript, layout, Canvas, controls, buffering, session fencing, stale work, corruption rejection and restart/finite completion. It does **not** establish HTTP loading, production CSP enforcement, browser-native cryptography, certificate authentication, mobile device performance or mainnet frame rates. Node tests separately use actual Node Web Crypto for the unmodified verifier.

## Primary references checked

These support platform choices, not claims of successful deployment:

- MDN, requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame — frame timestamps and background-tab behavior.
- MDN, Content-Security-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy — source restrictions and policy delivery.
- Playwright Python, browsers: https://playwright.dev/python/docs/browsers — separate browser tooling and executable compatibility considerations.
- IC certified data: https://docs.internetcomputer.org/concepts/certified-data/ — cryptographic linkage to consensus-backed state, not just content hashing.

All checked on 20 September 2026. No remote installer, policy modification, deployment or monetary operation was performed.
