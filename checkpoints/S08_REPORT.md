# S08 — Linux tooling and native validation

10 October 2026. **Verification milestone complete; production promotion remains BLOCKED.** No deployment, wallet, controller or real-funds authorization.

## Import and provenance

The supplied S07 archive matched SHA-256 `469bcda15e3d763879b05ce2197b9b0fb23351b68d352010c952072eeea2837a`. Python 3.11.14 ran `tools/verify_checkpoint.py` successfully against the untouched staging extraction before Git initialization, tests or edits. The imported source is commit `8adbdab4fd375e27ebf4e540a2e44ba68426c6c8`, tagged `s07-source-baseline`; work continued on `checkpoint/s08-native-validation`. The original ZIP and checksum remain outside the repository under `/home/codexdev/checkpoint-downloads`.

Historical checkpoint reports and evidence were not rewritten. Current instructions now distinguish S07's unavailable-Rust/browser-policy observations from this Linux host.

## Delivered

1. A small repeatable user-scoped Linux bootstrap for Python 3.11+, Node 22.16+, the repository-pinned Rust 1.94.1 toolchain, rustfmt, Clippy, `wasm32-unknown-unknown`, and one-time locked dependency fetches.
2. Generated and reviewed Cargo lockfiles for the root, native and current runtime-lab workspaces. The only manifest compatibility repair changes runtime-lab Candid from the inherited incompatible `0.10.20` candidate to exact `0.10.28`, satisfying `ic-cdk 0.20.3` without a bulk upgrade.
3. Minimal compiler/lint repairs and mechanical rustfmt output. No BTZ v3 state, scores, events, seals, publication-v6 data, compact-animation-v1 data or golden fixtures changed.
4. Executed root/native public-output and each-implementation recovery gates, including Life as the second-kernel boundary. Private JS/Rust cursor-byte identity remains optional diagnostic coverage.
5. A locked runtime-lab Wasm build plus rustfmt and Clippy. This is explicitly not generated-Candid, certificate, upgrade or production evidence.
6. Pinned Playwright 1.63.0 and matching Chromium 153.0.8010.12; actual loopback HTTP/CSP/browser-native-Web-Crypto verification with the browser sandbox enabled. CSP-incompatible test polling was repaired without weakening product policy.
7. Bounded locked orchestration and small separate source/native/browser/Wasm CI jobs. Missing IC/financial requirements remain named BLOCKED entries rather than placeholders reported as success. The workflow is committed but has not run remotely because no push was authorized.

## Defects repaired

- Node 24 emits TAP totals with an `ℹ` prefix; the prior parser recognized only `#` and misreported a successful 1,315-test process as FAIL. Both forms now have regression coverage.
- Root Rust compilation stopped on an inner documentation comment placed after a module item. The comment was moved without changing code behavior.
- Clippy findings were repaired with equivalent control flow and `Option::is_none_or`; the deliberately fallible exact-fraction `add` method is documented and narrowly allowed rather than renamed across the protocol implementation.
- Runtime-lab's inherited exact Candid candidate conflicted with the selected IC CDK constraint. The minimal compatible exact pin is committed with the generated lockfile.
- Playwright's JavaScript-expression waits violated the product CSP during real HTTP execution. Test polling now uses locator reads from Python; CSP remains unchanged.

## Executed results

See the [reviewed summary](../evidence/S08/verification-summary.json), [environment](../evidence/S08/environment.json) and [browser results](../evidence/S08/browser/http/results.json). Raw logs are retained under `.work/s08/`.

| Check | Result |
|---|---|
| Untouched S07 checkpoint verification | **PASS**, before Git initialization/tests/edits |
| Recording regeneration | **PASS**, existing four workloads and 194 files unchanged |
| Node suite | **1,315 passed; zero failures, skips or cancellations** |
| Python tooling suite | **67 passed** |
| Root Rust workspace | **38 passed; zero failed or ignored** |
| Independent native vectors | **445 passed** |
| Native Rust workspace | **16 passed; zero failed or ignored** |
| Portable native public comparisons | **151 passed** |
| Native host public/recovery checks | **8 passed** |
| Rust formatting and Clippy | **PASS** for root, native and runtime-lab |
| Runtime-lab locked Wasm build | **PASS**; no release hash claimed |
| Local HTTP observer | **9 passed**, including CSP and native Web Crypto |
| Complete orchestrator | **32 PASS, 6 BLOCKED, zero FAIL; overall BLOCKED (exit 2)** |

## Remaining gates

- Generated Candid/probe comparison and runtime-lab caller authorization have not executed.
- PocketIC duplicate/stale callback, traps, lost acknowledgements and upgrade recovery have not executed.
- Real typed ledger/index/archive reads, completeness/cursor assignment and Event Horizon hint behavior have not executed against pinned local canisters.
- Standard-library certificate identity, freshness/root and tamper/failure verification has not executed.
- Dependency vulnerability/license audit and independent byte-reproducible Wasm comparison remain open.
- Live ledger/wallet behavior, settlement, mainnet deployment, real cycle telemetry and measured capacity remain unauthorized or unimplemented.

## Next bounded task

Task 2 is the local-only authoritative IC slice: generate/compare Candid, execute current-host recovery and caller rules in PocketIC, wire synthetic typed ledger/index/archive reads, and authenticate observer artifacts with a local-only pinned test root. No-money operation remains mandatory. Repository extraction starts only after those interfaces have executable evidence.
