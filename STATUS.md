# Current status — S08

**Linux source, native, Wasm-build and local-HTTP observer validation complete. Production promotion: BLOCKED.**

The supplied S07 archive matched SHA-256 `469bcda15e3d763879b05ce2197b9b0fb23351b68d352010c952072eeea2837a`, and its untouched checkpoint verifier passed before Git initialization or testing. The imported baseline is commit `8adbdab4fd375e27ebf4e540a2e44ba68426c6c8`, tagged `s07-source-baseline`; historical S07 evidence is unchanged.

This host executes the source suite with Python 3.11.14 and Node 24.15.0, and the repository-pinned Rust 1.94.1 toolchain with rustfmt, Clippy and `wasm32-unknown-unknown`. Real lockfiles now cover the root workspace, `native/`, and `canisters/runtime-lab/`. The current runtime-lab builds to Wasm, but that build alone is not Candid, certificate, upgrade or production evidence.

Public-output and recovery gates pass without changing BTZ v3 goldens: 1,315 Node tests, 67 Python tooling tests, 38 root Rust tests, 16 native-workspace Rust tests, 445 independent native vectors, 151 portable public comparisons and eight host public/recovery checks. Life remains the second-kernel boundary test. Formatting and Clippy pass for all three active Rust workspaces.

The observer now passes nine real loopback-HTTP Chromium checks with the production static-page CSP and browser-native Web Crypto. Playwright 1.63.0 and Chromium 153.0.8010.12 are recorded. The previous `ERR_BLOCKED_BY_ADMINISTRATOR` result remains valid historical S07 evidence, not a restriction of this host.

`tools/check.py all` reports **32 PASS, 6 BLOCKED, zero FAIL; overall BLOCKED (exit 2)**. The remaining named gates are generated Candid/probe comparison, PocketIC trap/upgrade/ledger integration, runtime-lab authorization and upgrade evidence, dependency audit plus byte-reproducible Wasm, live ledger/wallet behavior, and real certificate/cost/capacity evidence. No mainnet call, deployment, wallet access, token transfer or controller change was performed.

See the [S08 report](checkpoints/S08_REPORT.md), [reviewed verification summary](evidence/S08/verification-summary.json), [environment record](evidence/S08/environment.json), and [HTTP browser result](evidence/S08/browser/http/results.json). Raw command output remains under `.work/s08/` and is intentionally outside Git.

Next bounded task: Task 2's local-only authoritative IC slice, beginning with generated Candid and PocketIC behavior against pinned synthetic ledger/index/archive canisters. Repository extraction and financial operation remain out of scope.
