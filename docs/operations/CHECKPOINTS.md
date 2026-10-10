# Checkpoint and recovery discipline

A stage is a substantial delivery boundary, not a requirement to stop after every small change. S01 includes workspace/source contracts plus an executable Life/runtime slice. Subsequent stages should similarly group coherent deliverables while retaining bounded local test commands.

During work, save source and the journal after each meaningful cluster; run focused tests and retain logs. Build an internal recovery ZIP before a larger transition. The public checkpoint remains one complete archive. Do not defer saving everything until a final tool call.

Every public ZIP includes source, generated available lockfiles, specifications, decision records, synthetic fixtures, evidence, explicit blocked gates, a predecessor identity and full file hashes. No private keys, hidden Git dependency, registry cache, placeholder Wasm, or fabricated Cargo lockfile belongs in it.

`tools/package_checkpoint.py OUTPUT.zip` stages the source with build/cache exclusions, rejects symlinks, generates a complete manifest, verifies it, makes a fixed-metadata ZIP, extracts it freshly and verifies again. SHA-256 sidecar identifies the produced bytes. Repeated packaging reproducibility is archive-level evidence, not compiled-Wasm reproducibility.

`python3 -B tools/verify_checkpoint.py` verifies a **pristine extracted** archive. Building/testing can legitimately add files or generated lockfiles; verify the original archive before those modifications, or use a fresh extraction. The strict verifier intentionally reports unexpected files.

## Next substantive checkpoint

S02 should complete the reusable pure runtime contract and its native/Wasm gates where tooling permits, then include a first small-board BTZ geometry/connectivity slice if it remains a bounded coherent delivery. Carry the source/Candid/PocketIC blockers forward; do not split each missing tool into a cosmetic checkpoint. Before full BTZ implementation, fix command application, logical duration/units, exact corner/annihilation causality, and the seal assignment policy. The previous S03–S08 risk gates remain applicable; scope can be bundled, evidence cannot be waived.


## S02 delivery and next boundary

S02 delivered a larger bundle: journal/inbox reference, Life input application, substantial headless BTZ mechanics, portable Rust primitives, independent fixtures and a real subprocess restart demo. S03 should combine headless game completion, full Rust port/native conformance and performance-oriented changes. Do not fragment each small mechanic into a public checkpoint; retain bounded local checks and recovery archives internally. Live-source/certification/money gates remain separate even when source tasks are bundled.
