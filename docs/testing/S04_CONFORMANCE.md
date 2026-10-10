# S04 verification map

Run `python3 -B tools/check.py source` for executed Node/Python gates. `all` additionally attempts native/IC builds and reports unresolved integration gates as BLOCKED. Per-check logs and the JSON result are written incrementally, and each subprocess is bounded. Missing tools, skipped tests and zero-match native filters are not passes.

| Requirement | Executable evidence | Qualification |
|---|---|---|
| Preserve >128-bit exact arithmetic | 144 independent Python Fraction cases in portable-v4 tests | Node executed; native runner wired, not executed. |
| Portable saved work | 70 frozen phase/subphase cursors resumed to complete S03 byte outputs | JS-derived snapshots, not independent physics oracles. |
| Full native gameplay | Seven native unit replay cases and native CLI comparison of all output bytes | Source authored; Cargo unavailable. |
| Cross-language recovery | Native runner consumes 70 JS snapshots; Python gate exports four Rust snapshots to JS | Entire native/bridge gate unexecuted. |
| Hidden storage work | 54 Node storage cases, including 36 game/operation/failure combinations | Generic trusted-host model, not replica behavior. |
| Process loss | Four Python subprocess tests, partial write, pre-root failure, lost acknowledgement, corrupt file and held lock | Actual local file/process tests, not canister upgrades. |
| Existing gameplay and source ordering | All S03 tests, goldens and independent geometry/topology/spawn/impact fixtures retained | No game-rule changes in S04. |
| Safe IC persistence | Source-only arena laboratory, static endpoint inventory and controller guard count | Compiler, access-control execution, Candid and PocketIC tests remain blocked. |
| Artifact reproducibility | File manifest, fresh extraction, source rerun, repeated ZIP equality | Reproducible source ZIP, not reproducible Wasm. |

Do not add executed native comparison counts to the source total: those checks have not run. The independent arithmetic oracle uses standard-library Python fractions, not the game implementation. Frozen complete traces and saved cursors must retain their implementation-derived provenance.

The largest remaining risks are compile/type/API mismatches in the new Rust source; cross-language semantic differences outside fixture coverage; whole-artifact serialization cost; IC memory high-water behavior; source ingestion completeness and economics; and unfinished certification/financial authority. No benchmark here establishes mainnet capacity, real cycle burn or ETH-equivalent compute.
