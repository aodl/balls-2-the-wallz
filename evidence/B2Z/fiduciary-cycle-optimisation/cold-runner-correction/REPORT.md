# Cold-runner provisioning correction — Normal-only A0/A2

Release recommendation: **NO-GO**. The demonstrated provisioning defect is corrected and locally verified with an empty Cargo cache. Hosted quiet-resource qualification and both sustained windows remain unexecuted; user-owned publication is required before the corrected dedicated workflow can supply those results. No repeat of a failed measurement was attempted.

## Correction and preserved contract

After pinned Rust 1.94.1 installation, the workflow now runs ordinary remote `cargo +1.94.1 fetch --manifest-path … --locked` for the root, native, runtime-lab, S09 integration and independent Rust-consumer graphs. All five precede the unchanged fail-closed provenance checker, which still uses `cargo metadata --locked --offline`. DTR revisions, manifests, locks, source rules and production Wasm are unchanged.

The hosted prerequisite allowance changes from **75 to 180 seconds** for environmental cooldown after provisioning. The execution predeclaration explicitly records the previous and selected allowance and its reason. The complete 60-second qualifying resource window, CPU/memory/pressure/swap/throttling/competing-work limits, five-second sampling and in-window interruption policy remain unchanged.

The comparison remains sequential **A0 then A2**, one attempt per candidate, with a **90-second Normal prelude and full untrimmed 900-second strict Normal measurement each**. This is Normal-only qualification. It does not execute Economy, Lifeline, low-funding or cold reconnect. Separate previously qualified low-funding/reconnect evidence remains in the [historical report](../REPORT.md) and [paid-v8 browser/reconnect receipts](../qualification-20261028/tests.json); neither substitutes for sustained Normal delivery.

| Binary | Decompressed SHA-256 | Compressed SHA-256 |
| --- | --- | --- |
| A0 normal | `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51` | `4e7aec89e97329101492b77eb9cff102282d280df43096c12a6e9b64b858923b` |
| A2 normal | `2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb` | `2fde8cf962498a8267757ccd4ca505196261f33263ae32c0a04bdcdc6c42b17b` |

Both checksum checks remain enforced. The frozen browser inventory, original frontend assets, sandbox, certificate authentication, 34-node fiduciary disposable subnet, original four-ball world and all rate/stall/rebuffer/resynchronisation/buffer-accounting predicates are unchanged. The normal-only runner adds scope/cooldown metadata to its predeclaration; execution and acceptance logic are unchanged.

## Preserved failure and current CI

[Dedicated run 40843327791](https://github.com/aodl/balls-2-the-wallz/actions/runs/40843327791), exact `737b264050f0599004da5a33709e534d2592e094`, failed in provisioning. The decoded complete job log records the missing DTR77 checkout and offline-mode rejection. The comparison step was skipped. There are **no hosted quiet-host samples and no A0/A2 window results** from that run; its failure is a provisioning defect, not candidate performance evidence.

The original uploaded artifact `12883807054` is independently retained byte-for-byte, SHA-256 `2a7e45d4a455eb15eb84c152aa48bd83b8d0567aae4b62104b59663143d610a5`, matching the job's upload receipt. Its original manifest, downloads and BLOCKED provenance record are retained without replacement. Full logs/API records and the ZIP remain under `.work/a2-cold-runner/github/` and in the independent archive identified by [verification.json](verification.json).

[Original candidate CI 40771390122](https://github.com/aodl/balls-2-the-wallz/actions/runs/40771390122), exact `eae3eb97c448588a428da0147dc331ae915b8b60`, was rechecked: **all six substantive jobs PASS**. The production-inventory informational job is excluded. Ordinary branch CI [40843327593](https://github.com/aodl/balls-2-the-wallz/actions/runs/40843327593) is separately recorded in verification.json with its exact head and latest observed status. These earlier runs cannot establish CI success for the unpublished correction commit.

## Local validation

All five normal remote locked fetches succeeded with a newly created empty `CARGO_HOME` under `.work/a2-cold-runner/cargo-home`. The unchanged provenance checker then passed all five resolved offline graphs at DTR77. This is local cold-cache provisioning evidence; corrected GitHub provisioning remains pending publication.

Focused tests: **16 PASS**, covering workflow ordering, compressed/decompressed binary identity, unchanged measurement contract, strict failure handling, resource predicates, playback accounting and provenance rules. The new regression rejects the original workflow with its missing fetch. All workflow shell blocks parse. The first focused-test invocation exposed a test-parser error on an unrelated multiline shell continuation; it is corrected and both logs are retained. No runtime or delivery requirement changed to resolve it.

`python3.11 -B tools/check.py source --output .work/a2-cold-runner/source`: **OVERALL PASS**, including **1,389 JavaScript / 166 Python tests**, source structure, reference vectors and documentation links. A scoped Git diff confirms frozen production inputs, checker, frontend, backend, manifests, locks, acceptance predicates and resource sampler remain unchanged.

## Publication and remaining verdict

The correction is committed locally on `ci/b2z-pinned-a2-delivery`. The exact commit is returned in the handoff; remote publication remains user-owned:

```sh
git push origin HEAD:refs/heads/ci/b2z-pinned-a2-delivery
```

Use only the reviewed correction head. Its push starts ordinary CI and the dedicated sequential workflow. Do not dispatch another comparison or automatically rerun a failed window. Preserve the complete uploaded evidence and manifests independently before the 90-day expiry.

After publication, distinguish provisioning PASS/FAIL, quiet-host PASS/BLOCKED, and each candidate's full delivery result. If both fail, investigate the shared delivery path; if A0 passes and A2 fails, investigate the candidate difference. Host-capacity attribution requires actual environmental/workload evidence; consider a more capable isolated VM without changing any acceptance predicate. No attribution is established by the skipped run.

Only sustained delivery PASS permits preparation of a fresh production preflight and cycle top-up calculation for separate approval. No calculation, mainnet mutation, funding, reinstall, deployment, DTR edit or performance optimisation was performed. The future production path remains the existing state-preserving v5→v5 upgrade on the 34-node fiduciary subnet.
