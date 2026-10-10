# IC reference register

Reviewed on **20 September 2026** using public primary documentation and the official IC skills site. URLs identify the reviewed pages, not pinned source revisions. At implementation time record actual repository commit, artifact digest and tested tool versions where applicable. Web documentation may evolve; do not let it silently change an established protocol.

External skill material is reference material, not project authorization. No skill installer or remote bootstrap script was executed for this checkpoint. Direct container dependency retrieval was blocked by DNS even though web documentation could be read.

| ID | Primary reference | Application |
|---|---|---|
| R1 | [Management canister interface](https://docs.internetcomputer.org/references/ic-interface-spec/management-canister/) | Distinguish status visibility from privileged consumption metrics; match exact deployment/API contracts |
| R2 | [PocketIC guide](https://docs.internetcomputer.org/guides/testing/pocket-ic/) | Deterministic canister integration; distinguish from real subnet/network benchmarks |
| R3 | [Safe retries and idempotency](https://docs.internetcomputer.org/guides/canister-calls/idempotency/) | Preserve attempt identities and reconcile unknown transfer outcomes |
| R4 | [Rust stable structures](https://docs.internetcomputer.org/languages/rust/stable-structures/) | Persistent layout, memory manager and versioned migration design |
| R5 | [Certified variables skill](https://skills.internetcomputer.org/skills/certified-variables/) | Verify state paths, witnesses, canister identity and certificate freshness |
| R6 | [DoS prevention](https://docs.internetcomputer.org/guides/security/dos-prevention/) | Bound work, caller-sensitive operations and publicly triggered processing |
| R7 | [IC skills catalog](https://skills.internetcomputer.org/) | Discover relevant maintained references; review rather than blindly import |
| R8 | [Multi-canister skill](https://skills.internetcomputer.org/skills/multi-canister/) | Cross-canister transaction boundaries and durable operation state machines |
| R9 | [ICP CLI skill](https://skills.internetcomputer.org/skills/icp-cli/) | Pin `icp`/`icp.yaml` workflow and validate commands against installed version |
| R10 | [Canister security skill](https://skills.internetcomputer.org/skills/canister-security/) | Runtime authorization, input validation and execution-path guards |
| R11 | [Stable memory skill](https://skills.internetcomputer.org/skills/stable-memory/) | Upgrade risk review; reconcile examples with exact chosen persistence mode |
| R12 | [ICRC ledger skill](https://skills.internetcomputer.org/skills/icrc-ledger/) | Ledger argument/error model; does not substitute for actual ICP history schema |
| R13 | [Inter-canister security](https://docs.internetcomputer.org/guides/security/inter-canister-calls/) | Await-boundary reasoning and failure-safe external effects |
| R14 | [Ledger documentation](https://docs.internetcomputer.org/guides/digital-assets/ledgers/) | Ledger/index/archive concepts; verify actual target support in S01 |

## How to use these references

Prefer the exact interface specification and the pinned deployed implementation over a tutorial example. A skill's recommended package version is not a toolchain lock, and a sample architecture need not fit wallet-originated memo commands. Jupiter's pinned tools also do not automatically become DTR's pins without testing.

Capture only the references needed for a task in the development notes, including reviewed date, applicable dependency versions and the tests that demonstrate compatibility. A refresh is a reviewed change; do not auto-refresh toolchain or skill files in the middle of a reproducibility check.

The framework deliberately adds no dependence on private Event Horizon internals. Its contract is based solely on the user-provided description: best-effort non-authoritative wakeups plus independent fallback.
