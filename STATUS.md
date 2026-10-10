# Current status — S09

**One local authoritative IC slice is executable and passes. Production promotion remains BLOCKED.**

S09 continues from reviewed S08 commit `7e55ceed322dcb9268382522c696a74e86e8f5f3` on `checkpoint/s09-local-ic-slice`. Historical S07/S08 evidence is unchanged. No mainnet call, deployment, wallet access, token transfer, payout, controller change, remote push or release publication occurred.

The current `canisters/runtime-lab` now has one bounded, trusted-configuration ICP-compatible ledger path. It reads the pinned upstream ledger and ledger-established archive through typed calls, accepts only validated contiguous records, advances a durable source cursor, coalesces unauthoritative hints, and uses a timer fallback. Ledger-fed mode cannot be bypassed through the generic `apply(Ingest)` path. BTZ v3 public state, scores, seals and goldens remain unchanged.

Pinned PocketIC tests cover current generated/declared Candid, valid and invalid installation, controller/caller permissions, revision fencing, duplicates, trap rollback, ignored client replies, atomic publication, malformed durable-state rejection, recertification, and upgrades at idle, sealed, partially simulated and ready-to-publish boundaries. A real upstream-ledger archive boundary, dropped hint/fallback recovery and typed fault-ledger cases also execute. The recovered canister result is byte-identical to uninterrupted native public state, events and scores.

The observer now verifies a genuine certificate from the exact disposable PocketIC instance using `@icp-sdk/core` in Chromium, with the local root deliberately supplied by the harness and fingerprinted. It binds the certified-data catalog commitment, intended canister, certificate time and artifact hashes. Wrong root/canister, missing or stale/future certificate, and tampered certificate/catalog/chunks fail closed. The UI distinguishes **Local IC / test-network certified** from **Offline pinned replay** and never silently falls back after authentication failure.

The final S09 aggregate at tested revision `a4f43a8fc3249deed77b9ea013bb00460c6b1119` reports **34 PASS, zero FAIL, 5 BLOCKED; overall BLOCKED (exit 2)**. Its nested integration passed all five stages: pinned artifacts, normal Wasm, test-hook Wasm, five PocketIC tests and ten real-browser assertions. The runner terminates its explicitly owned server before browser verification; zero owned S09 server processes remained afterward. The normal runtime Wasm SHA-256 is `55f038d2505fd8190678263d0f32c8b8c0beaf2e0ccb62a56d2fbaef18d975de`. Source/native regressions pass: 1,315 Node tests, 76 Python tooling tests, 38 root Rust tests, 16 native Rust tests, 445 independent vectors, 151 portable public comparisons and eight host public/recovery checks. Life remains the second-kernel boundary.

Dependency audit found no npm or Rust vulnerability advisories. Cargo audit retains two informational unmaintained-dependency warnings (`paste`, `serde_cbor`); replacing transitive dependencies was not forced through a bounded integration checkpoint.

The complete orchestrator intentionally remains BLOCKED on production-only evidence: independently reproducible Wasm, production ledger scale/cost, production network root policy and delegation coverage, financial settlement, and measured cycle/capacity behavior. PocketIC is correctness evidence, not production finality, latency, cost or capacity evidence.

See the [S09 report](checkpoints/S09_REPORT.md), [reviewed verification summary](evidence/S09/verification-summary.json), and [generated current Candid](evidence/S09/runtime-lab.generated.did). Raw logs remain under `.work/s09/` and are intentionally outside Git.

Next bounded task: review and harden the production boundary choices (ledger scan scalability, network trust policy and independently reproducible Wasm) without adding mechanics, payments, another host or a repository split.
