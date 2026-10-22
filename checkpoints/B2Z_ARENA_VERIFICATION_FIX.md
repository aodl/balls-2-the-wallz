# B2Z arena verification correction — 2026-10-22

This is a tooling-only continuation of published `af212f2e79fb6902d5f4d7c752f29676154c15e7` on `checkpoint/b2z-arena-camera-and-pacing`. Successful deployment/preservation evidence in [the arena report](B2Z_ARENA_CAMERA_AND_PACING.md) remains unchanged. The [published CI run](https://github.com/aodl/balls-2-the-wallz/actions/runs/39728245506) failed source conformance and standalone browser verification; installed-IC, native, Wasm and packaged-consumer jobs passed. Those historical failures are not retroactively relabelled as passes.

## Corrections

`tools/check_source.py` retains an explicit endpoint allowlist and now includes `controller_runtime` and `test_liquid_budget`. Source inspection confirms the former is a normal query calling `authorized()`, while the latter is feature-gated by `test-hooks`, calls `authorized()` and requires `pocketic-local`. The unchanged independent compiled-Wasm gate rejects every `test_`/fault/benchmark export from the normal module. Both normal and test-hooks artifacts are checked in disposable installed-IC integration; these locally built modules are not deployed.

`tools/browser_observer.py` now opens Settings through `#toolbar-settings`, expands diagnostics by clicking its visible summary, and uses visible playback controls. It closes Settings through its close button before arena screenshots or Retry and reopens it for playback, recording selection, disconnection/reconnect and reduced-motion checks. The actual modal UI is unchanged. A subsequent run exposed an old expected label, `Verified replay · not live`; the harness now asserts the current exact `Verified replay` label while retaining its uncertified-trust and disabled-payment checks.

No force-clicks, direct handler calls, removed assertions, CSP changes, sandbox changes, Web Crypto substitution or certificate-verification changes were introduced. Existing fixture-only fault injection remains qualified separately from native HTTP/Web Crypto and installed-IC verification.

## Standard local gates

**PASS on the final local runs:**

| Standard gate | Actual result |
|---|---|
| `tools/check.py source` | 17 checks PASS; all 1,349 JS and 137 Python tests, no SDK exclusions |
| `tools/check.py browser` | PASS; all 14 browser checks, sandbox enabled, native Web Crypto, no uncaught page errors |
| `tools/check.py integration` | PASS; 25 installed-IC tests passed, zero failures, eight unchanged ignored exact-predecessor probes; captured-history JS replay PASS |

The final integration run completed its installed test suite in 586.70 seconds. Its normal Wasm exports `canister_query controller_runtime` and excludes all three `test_` endpoints; the test-hooks build exposes `test_apply`, `test_liquid_budget` and `test_trap_next_index_reply`. The existing compiled export checker is unchanged. Eight optional predecessor-module probes were already ignored by the standard command; this patch adds no test filters, skips or exclusions.

Final results are recorded in [the reviewed verification summary](../evidence/B2Z/arena-verification-fix/verification.json). The full source gate includes all SDK-dependent tests, rather than the reviewer's partial 1,347-test rerun. Browser verification uses the existing Python 3.11 Playwright environment and reviewed user-local browser libraries, with Chromium sandbox enabled. Installed-IC tests use checksum-pinned disposable PocketIC, the upstream ICP ledger/index, locked/offline builds and `DFX_IDENTITY=codex_local`.

```sh
DFX_IDENTITY=codex_local python3.11 -B tools/check.py source \
  --output .work/arena-verification-fix/source-final

LD_LIBRARY_PATH=/home/codexdev/playwright-libs-s08/usr/lib/x86_64-linux-gnu \
DFX_IDENTITY=codex_local /home/codexdev/dtr-s08-playwright/bin/python -B \
  tools/check.py browser --output .work/arena-verification-fix/browser-final

LD_LIBRARY_PATH=/home/codexdev/playwright-libs-s08/usr/lib/x86_64-linux-gnu \
DFX_IDENTITY=codex_local /home/codexdev/dtr-s08-playwright/bin/python -B \
  tools/check.py integration --output .work/arena-verification-fix/integration-final
```

Raw results are in distinct `.work/arena-verification-fix/` directories. The original reproduced source-inventory failure and the intermediate browser run's stale-label assertion failure remain there. The first full integration run also retained one existing deployment-browser receipt-observation timeout (24 passed / 1 failed / 8 existing ignored predecessor probes); the unmodified standard integration gate passed when rerun separately, without loosening that assertion. The timeout is retained as an intermittent observation failure, without asserting an unproven cause. Existing arena release evidence is preserved; new reviewed gate summaries are separate. No new remote CI has run for this patch; the user must publish it first.

## Preserved scope

Only B2Z verification tooling and its closeout/evidence change. No production assets, canister code, dependencies, prices, parser, receiving account or history are changed. No live canister was queried, paused, reset, reinstalled or redeployed for this patch. No mainnet transfers or remote Git operations were performed. **DTR CHANGES: NONE.**

The paid live world remains bounded 16×8 v3. The staged 32×32 torus and persistent accepted cannon heading remain unactivated. Their next substantive dependency is the separately scoped authenticated DTR history/schema transition described in [the staged contract](../docs/specs/B2Z_TORUS_V4.md); it is not implemented in this correction.

The user owns the push:

```sh
git push origin checkpoint/b2z-arena-camera-and-pacing
```
