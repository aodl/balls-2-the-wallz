# S06 — Simplification and stable publication

20 September 2026. Source-and-conformance checkpoint; native/IC promotion remains **BLOCKED**. No deployment, real-funds, controller or wallet action is authorized.

Predecessor: `DTR_BTZ_S05_Atomic_Orchestration_and_Observation.zip`, SHA-256 `d00dad2b850653af761e3831f0e767d890a22e92a50b5bb74d7046ff9404746f`. Extracted and fully manifest-verified before editing. The original source suite passed again before the simplification. S00–S05 evidence and historical codecs remain available.

## Delivered

1. One direct, typed reference coordinator path replaces nested hot-path stores and repeated validation. Trusted cursor forks avoid repeated imports. Imports remain comprehensively validated, commits bounded, proposals revision-fenced, source retirement/publication atomic, and failure semantics unchanged.
2. Publication v6 removes operational revision and ingestion from immutable artifact identity. Private progress no longer invalidates committed downloads. A small count/byte-bounded cache serves retained prior publications until explicit resynchronization after eviction.
3. A separate `btz-animation-1` projection removes unchanged motion equations while preserving trajectory changes, receipts and every non-motion effect. Canonical BTZ state, audit events, scores and game manifests remain unchanged.
4. Public native conformance and native-own recovery become the default target. Old cross-language private-cursor comparisons are optional diagnostics, not permanent API constraints. Corresponding native publication/lab source targets v6, but remains uncompiled.
5. The offline environment no longer mandates a dependency-free product. Reviewed pinned dependencies with real matching locks and integrity checks are permitted. No external dependency was actually added. One current IC lab is identified; older storage/arena experiments are frozen diagnostics.
6. Repeatable workload instrumentation, an offline stable-download/compact-stream demo, regression tests, current specification and continuation instructions.

## Measurements

Identical dense scenario, budget 127 and 7,138 game work units before/after:

| Cumulative work during coordinator advances | S05 | S06 |
|---|---:|---:|
| Canonical encoding calls | 4,143 | 121 |
| Bytes encoded | 103,477,264 | 4,964,806 |
| Canonical decoding calls | 1,983 | 2 |
| Bytes decoded | 50,347,678 | 450 |

Encoded-byte transformation falls by about 95.2%. This is not measured cycles, Wasm instructions, peak memory or production speed. Both versions produce the same state, event and score bytes. The result includes the trusted event-copy optimization as well as the coordinator consolidation; it is not attribution to a single change.

The dense observer payload is 4,502 bytes versus 39,928 audit-event bytes (about 88.7% smaller). It carries 20 events rather than 166, dropping 146 unchanged motion equations. The original audit trace remains intact. The kernel still generates it; this is an observer-bandwidth improvement, not proof of a smaller simulation event allocation.

See [before](../evidence/S06/measurements/before.json), [after](../evidence/S06/measurements/after.json), and [demo](../evidence/S06/demo.json).

## Verification

The definitive executed results and logs are in [verification](../evidence/S06/verification/verification.json). Source checks, native gates and archived diagnostics are distinguished. No source check is evidence of Rust compilation, an IC certificate, live ledger reads or a production capacity benchmark.

Executed complete gate: **15 checks PASS, 20 BLOCKED, zero FAIL**. Overall: **BLOCKED**.

- **1,280 Node tests passed**, none failed, skipped or cancelled.
- **52 Python tests passed**.
- Seven complete BTZ animation reconstructions; five independent v6 publication fixtures.
- All previous canonical game outcomes, source/host images and interruption tests still pass.
- Six before/after workload/budget measurements; outputs verified byte-for-byte against direct simulation.
- Native-public-game/host, Rust/Wasm, real IC certificates/ledger/upgrade and deployment evidence remain blocked or unavailable.

Archive-specific fresh extraction/source rerun and repeated packaging are recorded in the separate release verification JSON. The source suite includes exact old v3 outcomes and v5 host-export fixtures, new v6 independent Python catalogs, all seven compact-playback reconstructions, retention/corruption/resync tests, cached-cursor isolation, process recovery and the reviewed-dependency policy tests.

## Explicitly not completed

The JS host still copies bounded records and serializes a cursor for each durable advance. Typed per-record IC persistence and the optimized native hot-path have not been implemented. The lab remains uncompiled, synthetic-input-only, latest-artifact-only, and has no tested v5-to-v6 stable-root migration. The JS retention cache is not durable across restart.

No genuine certificate-verification dependency, production ledger/archive ingester, finished cutoff fairness policy, browser renderer, monetary settlement, actual cycle/ETH metric, or target-subnet capacity test was added. This checkpoint intentionally consolidates existing architecture instead of adding another implementation layer around those missing gates.

## Next gate

Execute and repair the existing native public-output tests in a real Rust environment, then exercise the single current IC host's source/certificate/recovery boundary. Keep public conformance; permit private representation changes. Do not expand the uncompiled architecture to compensate for unavailable tools. Real funds remain gated.
