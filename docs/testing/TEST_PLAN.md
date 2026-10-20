# Executable checks and honest gates

Run `python3 -B tools/check.py source` for local JS/Python/source checks. Run `python3 -B tools/check.py all` for the full gate register. Exit 0 means all requested checks passed; exit 1 is a failure; exit 2 means at least one required gate is blocked. Reports are written after each check, so interruption retains evidence.

| Requirement | Current test location |
|---|---|
| B2Z memo roundtrip/rejection/numeric safety | `tests/js/memo.test.mjs`, `crates/b2z-protocol/src/lib.rs` |
| Account checksum and source-authority classification | `tests/js/payment.test.mjs` |
| Contiguous/short/empty/archive/index pages | `tests/js/source.test.mjs`, `crates/dtr-source-model/src/lib.rs` |
| Dirty hints, fallback, lease expiry/stale callbacks | `tests/js/wakeup.test.mjs`, native source-model tests |
| Canonical seals, input ranges, chain binding | `tests/js/seal.test.mjs`, `crates/dtr-core/src/lib.rs` |
| Life independent reference, snapshots and budgets | `tests/js/life.test.mjs`, `kernels/life-conformance/src/lib.rs` |
| Generic runtime/no partial publication | `tests/js/runtime.test.mjs` |
| Zero-test/skipped-test cannot report pass | `tools/test_check.py` |
| Archive manifest/path/symlink protection | `tools/test_verify_checkpoint.py`, `tools/test_package.py` |

Independent fixture generators are `tools/reference_fixtures.py` and `tools/life_reference.py`. Normal validation uses `--check`, never silently regenerates expectations. To change a rule, review the spec, change the version if required, explicitly regenerate fixtures, and inspect all differences.

`tools/verify_native.py` compares the actual Cargo emitter to 21 independent fixture lines (12 memo, one seal, eight Life). The test must run rather than merely being present in the repository. No native result exists in this checkpoint environment.

The source check parses manifests and runs JavaScript syntax validation. It does NOT parse Rust/Candid as a substitute for compiling them, establish access-control correctness, or perform a security audit.

## Tool-equipped continuation

First review and run formatting with the pinned Rust toolchain; compiler/rustfmt/clippy results were unavailable here. Generate the pure workspace lockfile with Cargo (`cargo generate-lockfile --offline`); there are no external dependencies. Then run the full local Rust test/conformance suite. The isolated probe needs its own generated lockfile and fetched dependencies. Retain all resulting reports in the next checkpoint.

PocketIC, generated-Candid equivalence, ledger/archive fixtures, certificate rejection tests, real wallets, subnet cost/tail latency, and money safety remain distinct gates. Merely installing PocketIC is not completion: its harness and artifacts must be wired and executed.

No production ball/cannon limits or instruction/cycles benchmarks are established by a sub-second Node test run.


## S02 executable matrix

| Requirement | Current test/evidence |
|---|---|
| Atomic staged publication, lost acknowledgements, stale work | `tests/js/journal.test.mjs` |
| Contiguous cursor + inbox effects, backpressure, reserve/ack recovery | `tests/js/inbox.test.mjs` |
| Canonical bytes, bigint distinction, BOM/sparse-array rejection | `tests/js/canonical.test.mjs` |
| Life input ordering and receipts through shared host | journal tests + retained Life reference tests |
| Exact grid crossings, reflection, connectivity | `tests/js/b2z.test.mjs`, independent Python-generated JSON/TSV |
| Corner rules, annihilation, elimination, nonlinear price and score persistence | analytical B2Z tests |
| Host budgets/restart do not affect results | B2Z mixed seeds, Life journal tests |
| Actual process exit and resume inside severance | `tools/test_demo.py` |
| Portable Rust primitives | `kernels/b2z-mechanics` tests + extended native vector emitter; BLOCKED here |
| No misleading zero/skipped Python suite pass | `tools/test_check.py` |
| Abstract work/data-size baselines only | `tools/b2z_bench.mjs`; no cycle/instruction conversion |

Independent fixtures include 160 Fraction geometry cases and 192 union-find territory cases. The heading test iterates all 65,536 inputs; its floating-point oracle is confined to tests and is not used in simulation. Complete-game reproducibility is not the same as complete independent-game correctness. PocketIC, native/Wasm parity, certified responses and mainnet-tail behavior remain separate unmet gates.
