# S10 — live-local autonomous game and certified observer

11 October 2026. **The substantial S10 milestone passes locally. Fresh S10 CI remains NOT_RUN pending an authorized push. Production promotion remains BLOCKED.**

## Provenance and scope

- Branch: `checkpoint/s10-live-local-observer`.
- Corrected S09 base: `68e714979eaf72c3d301b1cc43c1ec2caccd1a27`; S09 documentation head: `d06c3c787b253939cb5844ab2940792273d24614`.
- S10 implementation and tests: `af029ac`, `9d3406b` and `e4405bb`.
- The accidentally attached S08 archive was not imported or used.
- [S09 Wasm provenance](../evidence/S09/WASM_PROVENANCE_NOTE.md) records the distinct developer and fresh-CI hashes without asserting a cause. Independent byte-reproducible Wasm remains a release gate.

This checkpoint changes no BTZ v3 gameplay, payment envelope, authoritative state/event/score encoding, seal, publication-v6 artifact semantics, animation-v1 projection or golden result. Life remains the generic coordinator's second-kernel regression. No public network, real wallet, real funds, payout, production controller, package publication, release or repository extraction was used.

## Autonomous service

`runtime-lab` persists one bounded run-control record and owns one generation-fenced one-shot timer. One explicit `start_autonomous` operation begins progression. Each callback rearms relative to its actual execution time, then performs at most one existing coordinator action: seal an idle checkpoint, execute one bounded step, or publish a ready segment. A late callback therefore delays wall-clock delivery without stretching the fixed two-tick logical segment, skipping kernel work or spawning one callback per missed interval.

Duplicate starts with the same configuration are idempotent. A conflicting start is rejected. Pause increments the generation and leaves committed and staged state intact. Post-upgrade recovery installs one new timer generation and continues unfinished work. Controller `Seal`, `Step` and `Publish` calls are rejected while autonomy is active; the browser has no update surface.

The explicit local input policy seals the verified contiguous source prefix visible at the next idle callback. Later ledger records enter a later eligible seal. Empty prefixes remain valid, so existing balls continue moving without payments. The final clean live run assigned a pre-start valid record to segment 0, a valid record submitted after the first publication to segment 2, and an unhinted valid record to segment 5. Every source receipt appeared exactly once in the captured events. These assignment numbers are observed local timing, while deterministic replay holds the resulting seals fixed.

S09's source recovery remains in place. S10 refreshes only the matching generation/nonce/ledger/cursor lease after a verified ledger reply that requires an archive call. An installed-Wasm test delayed both legs, crossed the old 45-second total age, and still advanced exactly once through the official ledger/archive interface. Late replacements remain fenced.

## Retention and live trust

The canister retains three completed publications in total and no more than 8 MiB. Exact publication-v6 catalogs and the three authoritative artifacts are stored in bounded stable chunks. An in-progress download remained byte-identical while private work and a newer publication completed. Evicted requests deterministically return `snapshot resync required`.

The current publication remains the certified-data value. A retained catalog is authenticated only by walking backward from that genuinely certified current head: the successor seal binds the predecessor manifest, state, logical time and source watermark; the predecessor manifest binds its seal and artifact hashes. The directory is a locator, not an independent authority. No custom certificate or BLS verifier was introduced.

The browser's explicit **Live local IC — test-network certified** mode uses the pinned `@icp-sdk/core` dependency, the harness-supplied disposable root and intended canister ID. It never fetches a replacement root. A loopback-only allowlisted proxy relays actual PocketIC `query` and `read_state` bytes without computing or signing outcomes. Certificate time, canister path, certified data, catalog commitment, artifacts, segment order and predecessor links are checked before admission.

Short disconnect recovery retrieved retained segments 2 and 3 in order. A long disconnect beyond retention authenticated a newer snapshot, retained the in-session anti-rollback floor and visibly reported that unavailable animation was skipped. Wrong roots and corrupted live responses failed closed. Offline replay remains separately labeled and was never used as a fallback.

## Executed evidence

The local matrix passed:

| Tier | Result |
|---|---|
| Source fixtures, BTZ/Life/public vectors and JS tests | **PASS — 1,317 tests** |
| Python tooling tests | **PASS — 78 tests** |
| Root/native Rust | **PASS — 38 tests** |
| Portable Rust | **PASS — 16 tests** |
| Runtime Wasm, generated Candid, format and Clippy | **PASS** |
| Standalone HTTP/native-WebCrypto browser | **PASS** |
| Installed-Wasm PocketIC regressions | **PASS — 10 tests; live test separately orchestrated** |
| Concurrent autonomous PocketIC/browser slice | **PASS — 1 test and 11 browser assertions** |
| S09 finite genuine-certificate snapshot regression | **PASS** |

The concurrent test authenticated genesis before the single start, then observed fresh segments 0–10 while PocketIC remained live. It used two local funding accounts, submitted a valid valueless transfer after publication began, allowed empty-input segments, crossed a real ledger archive boundary, dropped a final hint, upgraded during unfinished simulation, exercised duplicate start/pause/resume and replayed every captured seal and input assignment through the native coordinator. Native state, events, scores and commitments matched.

The complete cold local run started with an empty harness target. Compilation took 624.465 seconds and completed before the owned PocketIC server was started with its unchanged 60-second idle and 900-second hard limit. The server stayed healthy, recorded its selected identity/output and was cleaned up through only the owned process group.

The final full wrapper rerun recorded exact clean revision `e4405bbdcfccb11533d8a2a98ce709e2d8d02ed0`. Its prepared-harness step used the already established local target and took 0.834 seconds; the 10 installed-Wasm regressions took 120.939 seconds, the concurrent live slice took 74.711 seconds, and the retained S09 snapshot regression took 12.630 seconds. The live test advances the gateway instance on host elapsed time rather than accelerating its clock ahead of Chromium, so certificate age and future-skew checks stay enabled and meaningful.

The pinned Playwright executable reported `Google Chrome for Testing 153.0.8010.12`; Playwright was 1.63.0. The local host used the documented user-local shared-library bundle via `LD_LIBRARY_PATH`, without sudo or system modification. `chromium_sandbox=True` remained enabled and passed.

Local artifact identities are:

| Artifact | SHA-256 |
|---|---|
| Normal runtime-lab Wasm | `3ee3b6e11a94850114e74e64fe96ee420c1ab14f2008360ae0c2570959a10450` |
| Test-hook runtime-lab Wasm | `4ab4fe1e64864e992799562d589d371e95eeaa652a110d9d6ebacbafec7905e6` |
| Generated Candid | `587bddc30097bbbcbe732818b084c98c721292fe38f994898a8ecc145675352c` |
| ICP ledger Wasm | `7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc` |
| ICP archive payload | `3a8ec8620661a234aff5d77286fbffd7959ca5f8bdbb6b7bbfc706130bf76a42` |
| PocketIC server | `b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db` |
| Disposable root key | `968c6c2122d3577878be624c1dc37609286f2f9ad7ee2cdae5d6bd45f0a05e8c` |

The test-only scan state/fault exports are absent from the normal Wasm. The declared interface is semantically equal to [generated Candid](../evidence/S10/runtime-lab.generated.did).

## Local measurements

The final clean run retained 3 publications using 14,840 bytes at stop. Across 11 segments, event artifacts ranged from 681 to 2,207 bytes (15,755 total); publication catalogs plus all authoritative artifacts ranged from 3,652 to 5,731 bytes (53,068 total). The observed input-queue high-water mark was 3. The final world had 3 active balls and 2 cannons. Coordinator work totaled 3,612 units with a per-segment maximum of 731. The run made 26 ledger and 2 archive calls. Across the recorded local runs, the browser's maximum observed buffer was 4 segments / about 6.68 logical ticks and it performed one explicit resynchronization.

These values are disposable-local observations, not cycle, mainnet capacity, finality, availability or economic evidence.

## CI and decision

Fresh S10 GitHub Actions is **NOT_RUN**. The workflow is prepared to run source, native, Wasm/interface, standalone sandboxed browser and the full live-local job, with sanitized artifacts uploaded even on failure. This task does not independently authorize a remote push or workflow dispatch, so no remote action was taken. S10 cannot yet be called fully closed under its fresh-CI acceptance criterion.

The local functional milestone is achieved: one local start drives an autonomous multi-segment game, ongoing valueless ledger inputs are verified and applied exactly once, and a concurrently connected browser authenticates fresh publications across short and long disconnects and an upgrade. Production promotion remains BLOCKED on global-ledger scale/catch-up/cost, production root/delegation policy, independently reproducible release Wasm, financial settlement/real wallets, and measured target-subnet capacity/finality/availability.

After an authorized fresh CI pass and review, the recommended next milestone is a separate behavior-preserving extraction of the generic DTR runtime. BTZ should remain a separate consumer; gameplay and public contracts should not be redesigned. Jupiter Faucet and Event Horizon remain independent products.
