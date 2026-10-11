# S09 corrective pass — scan recovery and fresh CI

11 October 2026. **The bounded S09 recovery correction and fresh-CI reproduction pass. Production promotion remains BLOCKED.** This report supplements, and does not rewrite, the original S09 report or its developer-run evidence.

## Provenance and scope

- Reviewed head: `cafb3201068c5e5a37d9b80097767a82b45b7f69` on `checkpoint/s09-local-ic-slice`.
- Corrected implementation: `68e714979eaf72c3d301b1cc43c1ec2caccd1a27`.
- Corrective commits: `cb232c4ae599d9c145ed550df09e4d89364b3876`, `fb135f9e31bd5529afe909ff76098701e9ecd29d`, and `68e714979eaf72c3d301b1cc43c1ec2caccd1a27`.
- Fresh successful workflow: GitHub Actions run `38132545307`, attempt 1, triggered by the push of the corrected implementation.
- The accidentally attached S08 archive was not imported or used.

No game mechanics, public canister method, canonical input, BTZ v3 state/score/event/seal, publication-v6 artifact, animation-v1 format, financial operation, production controller, network deployment, generic scheduler, or repository boundary changed.

## Durable scan recovery

The installed-Wasm regression was written and executed before the correction. With 4,096 pending inputs, a valid ledger page reached `Action::Ingest`, returned `inbox backpressure`, and left the already-persisted lease set:

```text
POST_AWAIT_ERROR=inbox backpressure; SCAN_IN_FLIGHT=true; CURSOR=Some(4096); PENDING=4096
test result: FAILED. 0 passed; 1 failed
```

The raw reproduction is retained at `.work/s09/corrective-reproduction/backpressure-before-fix.log`.

The correction uses one result fence around post-response block processing. Classification, host reconstruction, ingestion, and persistence-preparation errors all finish through the matching error finalizer. It clears only a lease whose source ledger, generation, nonce, and starting cursor still match; a stale completion cannot advance the source or clear a replacement operation.

The one-shot fallback is armed before the external await. A durable start time supports one narrow recovery rule: a matching scan lease older than 45 seconds may be replaced. The ledger call remains bounded at 30 seconds. Late responses retain all fences and therefore cannot mutate after replacement. This covers callback cancellation or a post-response trap without adding a general lease or scheduling framework.

Eight installed-Wasm PocketIC tests now pass, including:

- inbox saturation retaining cursor, anchor, and accepted inputs, followed by ordinary publication and exactly-once retry without upgrade or manual reset;
- invalid post-decode account/record data and injected persistence-preparation capacity failure retaining the original source position with an explicit error;
- a test-only post-response trap recovering through the fallback without resetting committed publication;
- stale completion fencing against a replacement scan;
- direct upstream-ledger and real archive traversal;
- dropped-hint recovery through the independent fallback, with no authority assigned to hint contents; and
- the existing authorization, upgrade, rollback, corruption, and public-output equivalence coverage.

The normal Wasm does not export the test fault endpoints. Backpressure is retryable resource state: the valid source record is neither skipped nor reclassified.

## Cold PocketIC lifecycle and runner status policy

`tools/verify_s09_local.py` now builds the exact `pocketic_host` test with `cargo test ... --no-run` in an output-specific target directory before starting the owned PocketIC process. Only after compilation does it start the server, validate its port and process health, and run the prepared tests. Premature exit, selected binary identity, server output tail, and cleanup are recorded. Timeouts terminate only process groups owned by this runner.

A deliberately empty local harness target demonstrated the ordering: its resource-constrained compile exceeded the earlier 900-second build limit, returned FAIL, and never started PocketIC. That run is retained as `.work/s09/corrective-local-cold-fail/results.json`; it is not presented as a passing cold run. The compile bound is now 1,800 seconds while the server's 60-second idle TTL remains unchanged. Fresh hosted CI then completed the whole job successfully in 3 minutes 37 seconds.

The nested command runner now reuses the top-level classification policy. Arbitrary external exit code 2 is FAIL. Only the documented repository browser wrapper is allowed to report a missing-prerequisite BLOCKED result; focused tests cover both cases.

## Explicit sandboxed browser

The browser helper selects Playwright's installed Chromium path unless an explicit CLI path is supplied. It records that path, executable version, Playwright version, and the separate selection and sandbox checks. Launch continues to request `chromium_sandbox=True`; no `--no-sandbox`, host-policy weakening, mocked signature, isolated-document substitute, or authenticity relaxation was added.

Run `38132048338` confirmed that explicit selection alone did not supply a usable sandbox on the Ubuntu 24.04 hosted runner: source, native, and Wasm passed while both browser-bearing jobs returned the documented BLOCKED result. With approval, only those two jobs moved to the sandbox-capable `ubuntu-22.04` image. Run `38132545307` then passed both the offline-recording HTTP/native-WebCrypto job and the genuine-certificate local mode. Other executable jobs remain on Ubuntu 24.04.

## Executed evidence

### Local corrective evidence

| Check | Result |
|---|---|
| Pre-fix installed-Wasm backpressure reproduction | **FAIL as expected**, durable lease remained set |
| Corrected installed-Wasm PocketIC suite | **8 passed; 0 failed/ignored** |
| Genuine-certificate browser | **12 assertions PASS** |
| HTTP/native-WebCrypto browser | **PASS** |
| Source suite | **1,315 Node + 78 Python tests PASS** |
| Root/native Rust suites | **38 + 16 tests PASS** |
| Wasm, generated Candid, format, and Clippy | **PASS** |
| Game goldens, public vectors, Life regression | **PASS** through source/native suites |

The full corrective local integration result is retained under `.work/s09/corrective-local-final/`. It tested the same runtime and runner sources later carried by `68e7149`; the intervening commits changed only source-inventory expectations and the workflow runner labels. The final source/native/Wasm/browser reruns are retained in their adjacent `.work/s09/corrective-*` directories.

### Fresh GitHub Actions evidence

Run `38132545307` tested `68e714979eaf72c3d301b1cc43c1ec2caccd1a27` on fresh hosted runners and completed successfully in 3 minutes 41 seconds:

| Job | Runner | Result |
|---|---|---|
| Source conformance | `ubuntu-24.04` | **PASS** |
| Native conformance | `ubuntu-24.04` | **PASS** |
| Runtime-lab Wasm/interface | `ubuntu-24.04` | **PASS** |
| Browser HTTP and Web Crypto | `ubuntu-22.04` | **PASS** |
| Local IC authoritative slice | `ubuntu-22.04` | **PASS** |
| BLOCKED production inventory (informational) | `ubuntu-24.04` | inventory retained; not execution evidence |

The existing `if: always()` uploads retained five sanitized artifact packages for 14 days. Their GitHub-recorded SHA-256 digests are:

| Package | SHA-256 |
|---|---|
| `source-evidence` | `1d112c5af1f107e828c787ad5309f91b7ff89e7cc95f6765ca42aa43b9af3df8` |
| `native-evidence` | `572d020daa4f32a04b60070ee71d72bfa1ec4c5ea9ba49d077626e75e70f84d4` |
| `wasm-evidence` | `48c079ea8cbee2fe3a9aebac685410b67da08af55131b1a8e3c23fb2acf05fae` |
| `browser-evidence` | `109e3702e4eb7cabdcdb14b48b7c53eade9b85cab1e57d630147a4908b19fd9c` |
| `local-ic-evidence` | `a565d4cc4f85db33cf1b7d1c44014bc2b86d7e3cdd63734ecc880e295bd67e91` |

The API metadata used for review is retained at `.work/s09/ci-38132545307/`. GitHub requires an authenticated session to download artifact contents; job conclusions, runner labels, step conclusions, sizes, retention timestamps, and package digests were independently read from the public run/API metadata. Detailed local results provide the assertion names and artifact identities below rather than claiming uninspected CI archive contents.

## Artifact and interface identities

| Artifact | SHA-256 |
|---|---|
| Corrected normal runtime-lab Wasm | `bcbbcd258112c77b15e86cca039bed382f64ae35046a5517c42615c7071f06e7` |
| Corrected test-hook runtime-lab Wasm | `87bc9ea48b1d188635ca653eb18bb16f4a7946753cbbe51951dd789db9d6b6a0` |
| Generated runtime-lab Candid | `c7e2cf9e6e2c959f58fa2a919d2f632f7003c81b99cfad3decd99ee70f24a86d` |
| ICP ledger Wasm | `7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc` |
| ICP archive Wasm gzip/install payload | `3a8ec8620661a234aff5d77286fbffd7959ca5f8bdbb6b7bbfc706130bf76a42` |

Generated Candid remains semantically equal to the declared public interface. The local toolchain was Python 3.11.14, Node 24.15.0, npm 11.12.1, Rust/Cargo 1.94.1, Playwright 1.63.0, Chromium 153.0.8010.12, PocketIC 16.1.0, `ic-agent` 0.49.2, and `@icp-sdk/core` 6.1.0. The browser selected `/home/codexdev/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome` locally and recorded `chromium_sandbox=True`.

## Decision and remaining gates

The specific S09 recovery and fresh-CI gaps are closed. This supports a recommendation to accept the bounded S09 local authoritative slice, with its existing qualification: the browser verifies a genuine certificate captured from PocketIC and plays a finite authenticated snapshot after the owned server stops. It is authenticated replay, not a continuously running observer or service.

Production promotion remains BLOCKED on ledger scale/cost and catch-up policy, production network root/delegation policy, independently reproducible Wasm and release provenance, financial/settlement behavior, and measured subnet capacity/finality/availability. None was weakened or relabeled.

One bounded follow-on milestone is recommended, but not implemented here: after an explicit local start, automatically advance and publish multiple small segments from valueless local-ledger inputs; keep PocketIC running while the existing observer obtains fresh certificates across publication and reconnect boundaries; and enforce a small explicit retention/resynchronization limit. Repository extraction can follow that executable-boundary validation as a separate behavior-preserving change. Jupiter Faucet and Event Horizon remain separate.
