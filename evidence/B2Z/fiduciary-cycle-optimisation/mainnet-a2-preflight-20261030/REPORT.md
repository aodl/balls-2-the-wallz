# Authorised A2 deployment stopped at the required balance gate

On 2026-10-30 the user explicitly authorised agent-executed pause, exact frozen A0→A2 mainnet upgrade, preservation verification and resume, with per-command plaintext-identity acknowledgement. The mandatory fresh liquid-cycle minimum was 5T. No financial operation was authorised.

The controller balance query completed at **2026-10-30 12:21:38.029732 UTC** and returned **2,846,689,665,080 liquid cycles**, **2,993,548,017,650 total cycles**. The public authenticated observation at 12:21:44 UTC and controller status both report ReserveProtection, nominal/supported zero, no limiter or run error. The autonomous running flag remains true; this is funding-based suspension, not an operator pause.

**BLOCKED_UNSAFE_BALANCE.** The 5T liquid precondition failed. No pause, installation, resume, transfer, withdrawal, purchase or request for additional cycles was performed. Exact A0 remains installed. Post-upgrade verification/balances and post-resume progression are NOT_EXECUTED, not PASS.

The user's reported approximately 10T top-up is inconsistent with the observed balance. Its transaction, destination and timing were not inspected or inferred. Reconcile that discrepancy and take a fresh preflight before any later execution; no transfer or installation is retried automatically.

Other completed preflight checks: codex_local public principal matches existing controller amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae; exact A0 module, both unchanged controllers and 34-node fiduciary subnet verify through mainnet-root-backed metadata. Frozen actual A2 file and decompressed gzip hashes match the approved binary. Paid-v8 publication 65819, world v5 and 16 retained catalogs/artifact chunks verify. Source binding is healthy, no source error or pending records; controller work has no unfinished phase, ready manifest or pending inputs. Treasury is Idle, unpaused, not halted and has no error. Run configuration remains segment_ticks=1, pacing_seconds=1, work_budget=512. Frontend was not changed. Historical qualification and failed/interrupted attempts remain untouched.

Raw read-only responses, commands, stderr, certificates and public artifacts are retained with SHA-256 manifests. Private identity material was not inspected or exported. Warning acknowledgement was limited to individual permitted query subprocesses; no update subprocess ran.
