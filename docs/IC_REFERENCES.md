# Pinned interfaces and reviewed references

Reviewed 2026-09-20. The selected dfinity/ic revision comes from Jupiter's actual dependency pin, not an invented current release. Public source review is **not** evidence of the version deployed on the live ICP ledger.

| ID | Primary reference | Decision supported |
|---|---|---|
| R1 | [ICP ledger Candid at d3b3351](https://raw.githubusercontent.com/dfinity/ic/d3b3351fa343a893aea2cfa8d39ac6b0d507b477/rs/ledger_suite/icp/ledger.did) | Numeric `memo`, optional `icrc1_memo`, account identifiers, block ranges/archive callbacks; no assumed ICRC-3 source endpoint. |
| R2 | [ICP index Candid at the same revision](https://raw.githubusercontent.com/dfinity/ic/d3b3351fa343a893aea2cfa8d39ac6b0d507b477/rs/ledger_suite/icp/index/index.did) | Descending/exclusive-start history, index ledger identity, `num_blocks_synced`. |
| R3 | [ICP ledger implementation at the same revision](https://raw.githubusercontent.com/dfinity/ic/d3b3351fa343a893aea2cfa8d39ac6b0d507b477/rs/ledger_suite/icp/ledger/src/main.rs) | ICRC path sets legacy memo to zero and retains blob; transfer-from can carry a spender and memo. |
| R4 | [ICP ledger data model](https://raw.githubusercontent.com/dfinity/ic/master/rs/ledger_suite/icp/src/lib.rs) | Encoded ICP blocks use a protocol-specific representation; do not hash normalized JSON as if it were an ICP block. This supplemental `master` reference is not a reproducible source pin. |
| R5 | [ICRC ledger skill](https://skills.internetcomputer.org/skills/icrc-ledger/) | Fee discovery, account/subaccount distinction, ICRC-2 allowance semantics. |
| R6 | [Stable-memory skill](https://skills.internetcomputer.org/skills/stable-memory/) | Heap-only Rust state is not arena upgrade persistence; reserve durable schema layout. |
| R7 | [Canister security skill](https://skills.internetcomputer.org/skills/canister-security/) | Method-body authorization, bounded calls, explicit asynchronous state. |
| R8 | [Inter-canister calls](https://docs.internetcomputer.org/guides/canister-calls/inter-canister-calls/) | Call-builder syntax and non-atomic `await` boundaries. |
| R9 | [System API](https://docs.internetcomputer.org/references/ic-interface-spec/canister-interface/) | Certification/performance interfaces for later host work, not implemented telemetry. |
| R10 | [Source licensing notice](https://raw.githubusercontent.com/dfinity/ic/d3b3351fa343a893aea2cfa8d39ac6b0d507b477/LICENSE) | Upstream notices for the exercised interface subsets. |

## Capture quality

`interfaces/*.exercised.did` are deliberately **manually transcribed exercised subsets**, not full byte-for-byte upstream downloads. The web reader exposed the primary source; direct container DNS/network access failed. Their local hashes identify this checkpoint's declarations, not upstream raw-file identity. Generated Candid equivalence, full raw-source pinning, ledger/archive Wasm identity, and live interface probes remain required gates.

The fixture records are synthetic normalized decoded examples. They are not raw Candid or protobuf, captured ledger transactions, certified responses, or proofs of completeness. Fixtures state this in their provenance fields.

## Skills are reviewed, not blindly executed

No remote installer, skill-recommended deployment, mainnet call, or fund transfer was performed. The ledger skill includes a blanket recommendation against frontend-originated transfers. That recommendation is not adopted here: BTZ intentionally accepts direct wallet-to-ledger payments and verifies the ledger independently. Its business rules do not rely on a browser intermediary. Likewise, caller identity is captured before an `await`; no behavior depends on interpreting a later `msg_caller()` value.

The Jupiter toolchain/dependency versions are candidate pins, not a claim to be the newest available versions. The root workspace has no registry dependencies. The isolated probe selects `ic-cdk 0.20.1`, `candid 0.10.29` and `serde 1.0.228` from Jupiter's lockfile; its own resolution is blocked and no lockfile is fabricated.


## S02 additional re-review (2026-09-20)

- [Data persistence](https://docs.internetcomputer.org/guides/backends/data-persistence/): stable storage and upgrade boundaries for the eventual host.
- [Stable-memory skill](https://skills.internetcomputer.org/skills/stable-memory/): stable structures and allocation discipline; no sample dependencies installed or claimed compiled.
- [Inter-canister calls](https://docs.internetcomputer.org/guides/canister-calls/inter-canister-calls/): explicit asynchronous/non-atomic boundaries motivate fenced durable operations.
- [Canister-security skill](https://skills.internetcomputer.org/skills/canister-security/): internal model APIs are not public method authorization.
- [PocketIC](https://docs.internetcomputer.org/guides/testing/pocket-ic/): future canister integration evidence, not a production-network benchmark.

No public source has been used to replace private Jupiter/project files. No new live-IC, compiler, pricing, cycle tariff or randomness-interface verification is claimed by S02.

## S03 review (2026-09-20)

Resource limits, stable-memory guidance and PocketIC were re-reviewed. Their specific application and evidence boundaries are recorded in [S03 porting/performance](architecture/S03_PORTING_AND_PERFORMANCE.md). No remote skill installer, package publication or deployment was run.

## S04 source review — 2026-09-20

These primary references informed authored source; reading them is not compiler/API execution evidence. No remote installer or repository action was run.

- [Exact BigRational 0.4.2](https://docs.rs/num-rational/0.4.2/num_rational/type.BigRational.html) and [num-bigint 0.4.6](https://docs.rs/num-bigint/0.4.6/num_bigint/): exact arithmetic dependencies rather than narrowing area-time.
- [serde 1.0.228](https://docs.rs/serde/1.0.228/serde/), [serde_json 1.0.145](https://docs.rs/serde_json/1.0.145/serde_json/), [num-traits 0.2.19](https://docs.rs/num-traits/0.2.19/num_traits/), [sha2 0.10.9](https://docs.rs/sha2/0.10.9/sha2/): candidate direct pins. Canonical object keys are explicitly recursively sorted even if host dependency feature unification later enables insertion-ordered JSON maps.
- [IC stable-memory skill](https://skills.internetcomputer.org/skills/stable-memory/): separate memory-manager regions, direct stable structures, upgrade posture.
- [StableCell 0.7.2](https://docs.rs/ic-stable-structures/0.7.2/ic_stable_structures/cell/struct.Cell.html): `init` returns the cell, `set` returns the previous value. Keep root small; do not serialize the entire game into one growing root cell.
- [StableBTreeMap 0.7.2](https://docs.rs/ic-stable-structures/0.7.2/ic_stable_structures/btreemap/struct.BTreeMap.html): chunk map API for the source-only laboratory.
- [IC CDK](https://docs.rs/ic-cdk/) resolved to 0.20.3 during review, and [is_controller](https://docs.rs/ic-cdk/latest/ic_cdk/api/fn.is_controller.html); [Candid 0.10.20](https://docs.rs/candid/0.10.20/candid/): candidate laboratory dependencies. Several explicit-version source-page fetches failed; compatibility remains a build gate, not inferred success.
- [IC execution errors](https://docs.internetcomputer.org/references/execution-errors/): traps roll back message changes. A normal error reply is not the same as a trap. No laboratory update awaits after entering its stable-write phase.

Unverified: full dependency resolution, transitive feature/MSRV compatibility, generated Candid, PocketIC behavior, instruction tariffs and cost measurements. Existing S01 probe pins are not silently rewritten to these laboratory candidates.

## S05 review — 2026-09-20

Reviewed official [stable-memory skill](https://skills.internetcomputer.org/skills/stable-memory/), [certified-variables skill](https://skills.internetcomputer.org/skills/certified-variables/) and [IC system API](https://docs.internetcomputer.org/references/ic-interface-spec/canister-interface/).

Applied narrowly: durable regions rather than heap-only upgrade state; setting a small certified-data digest during replicated mutation; retrieving the certificate on query; re-establishing certification after upgrade; and checking identity/delegation/freshness through a real client certificate library. The new laboratory uses inherited candidate pins and source calls, not executed API compatibility evidence.

Explicit-version documentation fetches for `ic-cdk 0.20.3` certification functions failed during this session. Official skill/API pages supplied the reviewed interface names; compilation, generated Candid and actual certificate behavior remain blocked. No unrelated web result was used as a technical source. No remote bootstrap script was run, no compiler was downloaded and no root key was fetched from a replica.
