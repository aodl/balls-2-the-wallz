# Pinned A2 quiet-host delivery preparation

Status: **BLOCKED pending exact-commit CI completion and user-owned workflow publication. No sustained window has run in this preparation.**

The release remains B2Z `eae3eb97c448588a428da0147dc331ae915b8b60` with immutable Rust DTR `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`. This branch changes only test preparation, integration harness, public frozen test inputs and evidence. It changes no production application, dependency, frontend or backend artifact.

## Current decisions

| Gate | Result |
| --- | --- |
| CI 40771390122, exact eae3eb97 | Five substantive jobs PASS; installed-IC qualification still IN PROGRESS at last observation. Inventory is informational. |
| Frozen normal A0 | SHA-256 `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`, verified after decompression |
| Frozen pinned normal A2 | SHA-256 `2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb`, verified after decompression |
| Portable provisioning | PASS locally: all 594 pinned browser files, sandbox launch/version, complete original production asset list, native harness compilation and public disposable fixture bindings |
| Focused regressions | PASS: 12 Python cases; integration-test clippy with warnings denied; disposable binding test; complete source-conformance group |
| Hosted resource qualification | NOT EXECUTED; selecting ubuntu-22.04 is a host proposal, not evidence of quiet resources |
| Matched A0/A2 900-second delivery | NOT EXECUTED; no admissible window established by this work |
| Historical delivery cause | UNRESOLVED; preparation establishes no causal explanation |
| Release | NO-GO until the remaining gates pass |

## Execution contract

`.github/workflows/pinned-a2-delivery.yml` proposes one fresh GitHub-hosted `ubuntu-22.04` job. It checks the exact source CI run has six substantive successes before provisioning. Downloads, compilation, browser installation and both frontend builds finish before the resource screen. Public frozen compressed normal modules are carried under `vendor/b2z/delivery/`; the job verifies compressed and uncompressed hashes. No identity material or captured private financial/world snapshot is included. The game uses the existing synthetic four-ball fixture and official checksum-pinned Ledger/Index modules.

The original 60-second resource screen and CPU-idle, memory, CPU/I/O pressure, swap, throttling and competing-process limits remain unchanged. The runner allows 75 seconds to obtain that screen, rather than waiting through another 20-minute rejection cycle. If it fails, the job exits nonzero, archives the failure and starts no window. During each case resource sampling continues every five seconds and foreign heavy work causes an explicit environment rejection. An alternative host must be a genuinely isolated Linux VM meeting these same measured prerequisites; no such alternative has yet been provisioned.

Execution is strictly sequential A0 then pinned A2, both using the same 34-node fiduciary disposable configuration, browser binaries, viewport, fixed proxy endpoint and byte-identical frontend. Each retains the original 90-second prelude and independent untrimmed 900-second Normal window. This fixture has a v5 world and v6 genesis catalog: it is not the separate authentic paid-v8 qualification. Genuine certificate verification, artifact requests, buffer accounting, rate bounds, zero stalls and zero resynchronisations remain required. The normal-only mode ends after these assertions and avoids later diagnostic-module fault/funding phases. No diagnostic module is provisioned or substituted.

The stored assertion contract checks the original measurement function's AST and the unchanged playback analysis, frontend builder, browser requirements and fixture manifest. The production frontend's complete ten-entry manifest is compared before execution; local test bundles are also compared between cases. Local-root configuration is explicitly bound to the actual disposable root, canister, source and fixed endpoint before the windows. There is no certificate bypass.

All resource samples, per-hop proxy/browser traces, progress, errors, retention and assertions produced by the existing harness remain in `.work/delivery-pair`. The workflow always uploads `.work`, with a complete SHA-256 manifest, including prerequisite failures. There is no automatic retry. A failure must be diagnosed before a separately justified repeat. Public hosted artifact retention is 90 days; download and independently archive it before expiration.

## Local validation and retained negative evidence

Commands executed:

```sh
PYTHONPATH=tools python3.11 -B -m unittest tools/test_delivery_ci.py tools/test_host_resources.py tools/test_playback_qualification.py
cargo clippy --manifest-path tools/s09-integration/Cargo.toml --test s14_index --locked --offline -- -D warnings
```

Both passed. The actual preparation script also passed using the installed pinned browser and official PocketIC inputs, including `delivery_public_binding --exact --ignored --nocapture`. Its first binding regression failed because the test incorrectly identified the fixture payer as the Index; the test was corrected to read the configured Index from source status. Both raw attempts remain under `.work/a2-delivery-ci/` and `.work/delivery-inputs-binding*/`. This was a preparation-test defect, not a candidate runtime failure. No delivery window began.

`python3.11 -B tools/check.py source --output .work/a2-delivery-ci/source` also completed with OVERALL PASS, including all Python tool tests, JavaScript tests, reference vectors, source inventory and documentation links. Workflow shell blocks and embedded Python passed syntax checks. The independent preparation snapshot is `/home/codexdev/b2z-release-evidence/a2-delivery-ci-preparation-20261028`; its `SHA256SUMS` covers local raw logs, both fixture-binding outcomes and prepared input identities.

Independent snapshot manifest SHA-256: `333572ee85524497897714121ded6b543d0d40f1cae45c1f6e5cc3cac36d0388`. Checksums were verified after copying. Its inputs contain only public normal binaries and synthetic/public fixture configuration. No mainnet query or mutation was performed in this preparation.

## User-owned publication boundary

After CI 40771390122 has all six substantive successes, publish the new local workflow commit once:

```sh
git push origin HEAD:refs/heads/ci/b2z-pinned-a2-delivery
```

Run this only while checked out on `ci/b2z-pinned-a2-delivery` at the reviewed workflow commit. The push event starts the dedicated job. Do not repush the unchanged release commit, dispatch parallel comparisons or automatically rerun a failed comparison. No remote write was performed by this preparation.

If both cases pass, preserve their full evidence and only then obtain fresh read-only production balances and quantify upgrade, recovery, maintenance, useful operating time and the protected 3T reserve. The historical 8T target remains provisional; no new balance or funding amount is asserted here. A state-preserving v5-to-v5 upgrade remains the selected future release path, requiring separate explicit mainnet approval. The observer remains unchanged.
