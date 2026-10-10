# S09 — one local authoritative IC slice

10 October 2026. **The bounded local integration milestone passes; production promotion remains BLOCKED.** No deployment, wallet, controller or real-funds authorization.

## Provenance and scope

S09 started from the reviewed S08 head `7e55ceed322dcb9268382522c696a74e86e8f5f3` with a clean tree and continued on `checkpoint/s09-local-ic-slice`. The final aggregate tested `a4f43a8fc3249deed77b9ea013bb00460c6b1119`; subsequent changes are checkpoint documentation and reviewed evidence only. Historical checkpoint reports and evidence were not rewritten.

The delivered path is deliberately one concrete local slice:

`upstream ICP ledger + archive -> typed bounded runtime-lab scan -> sealed input -> existing Rust BTZ coordinator -> durable publication-v6 catalog -> genuine PocketIC certificate -> existing browser observer`

It adds no game mechanics, payment/settlement path, generic storage framework, second host or repository split.

## Verification repairs

- External command exit code 2 now fails by default. Only explicitly designated project wrappers may use the documented exit-2 BLOCKED contract. Tests distinguish argparse usage failure from a genuine prerequisite block.
- CI has bounded source, native, browser, Wasm and local-integration jobs. It uploads selected sanitized `.work` results and logs with an immutable action revision even on failure; caches, secrets, identities and unrelated logs are excluded.
- The obsolete frozen-interface probe remains archived. The current runtime-lab exports generated Candid and compares it semantically with the declared interface.
- Certificate correctness, ledger correctness, reproducible Wasm, settlement and capacity/cost are separate gates. A local pass cannot imply a production pass.

## Current host contract

The normal runtime has no arbitrary test trap/mutation endpoint. A separately built `test-hooks` feature supplies focused trap injection only to the local harness; the tests confirm the normal module does not export it.

PocketIC exercises:

- valid genesis installation and atomic rejection of invalid initialization;
- controller progress versus anonymous and unrelated-principal mutation attempts;
- private queue/cursor data absent from public status;
- revision fencing, duplicate submission, atomic input retirement/publication and stable public artifacts while private work advances;
- upgrade at idle, sealed, partially simulated and ready-to-publish states;
- restoration of inputs, scores, pending effects, publication artifacts, certified data and scheduling state;
- fail-closed incompatible/malformed stable data with no silent genesis reset;
- real message trap rollback preserving earlier successful effects; and
- acknowledgement loss modeled by ignoring a successful client reply and then observing the committed publication.

## Authoritative ledger path

The trusted installation configuration fixes the PocketIC network label, ledger canister, recipient account, funding source, amount/memo rules and bounded scan budget. A caller cannot supply those facts. The runtime invokes the ICP ledger's typed `query_blocks`, and follows only ledger-established archive callback canister/method/range metadata with bounded calls and response validation.

Direct transfers must match the configured source and destination account identifiers, amount and the existing numeric/blob memo rules. Delegated spender operations stay excluded. Irrelevant, underfunded and malformed records are consumed according to existing receipt rules without becoming valid game operations. The durable cursor advances only over a validated contiguous prefix; gaps, overlaps, incomplete archive ranges, malformed responses and rejects cannot skip input or jump to the reported tip.

Generation/nonce fencing prevents a stale await from writing after configuration or operation changes. Hints carry no source authority and coalesce; the timer fallback finds records when a hint is dropped. The explicit local assignment policy seals the accepted prefix with the verified source watermark. The recorded source anchor commits decoded ledger content and continuity; it is not mislabeled as an upstream-native block hash.

The pinned upstream ledger creates a real archive during the end-to-end run. Test-only WAT doubles separately exercise short, gap, malformed, rejected and incomplete-archive replies; those cases are fault-injection/protocol-shape evidence, not upstream compatibility evidence. An index is neither needed nor claimed for this full-ledger baseline.

## Recovery and public equivalence

The demonstration creates one accepted transfer plus underfunded, malformed-memo and unrelated records. Exactly one intended cannon is produced. It drops the final hint and observes fallback discovery, seals the verified input, advances one small segment, upgrades during unfinished work, resumes and publishes.

The recovered canister publication has byte-identical state, events and scores to uninterrupted execution by the existing native coordinator. Duplicate publish is idempotent, and the publication remains stable while private work advances. BTZ v3 goldens, public state, scores and seals are unchanged; Life remains the generic second-kernel regression.

## Certificate and observer

The harness starts one explicitly owned pinned PocketIC server, creates isolated instances and an HTTP gateway, and deliberately obtains the root key from that exact disposable instance. It terminates only its owned server process group before browser verification; the final run observed zero owned S09 server processes both before and after. The local root SHA-256 fingerprint is `968c6c2122d3577878be624c1dc37609286f2f9ad7ee2cdae5d6bd45f0a05e8c`; it is not auto-fetched by the observer and is never a production trust rule.

Rust `ic-agent` and browser `@icp-sdk/core` perform standard-library BLS/delegation and certified-state verification. Verification binds the intended canister, local root, freshness window, certified-data path, flat publication-catalog hash and each artifact hash. Tests reject wrong root/network, wrong canister, missing certificate, stale/future certificate, rollback, and tampered certificate/catalog/chunks. Canister-range/delegation checks execute where the local topology supplies the delegation.

The existing observer consumes authenticated artifacts in an explicit **Local IC / test-network certified** mode. **Offline pinned replay** remains distinct. Authentication failure stops playback rather than silently falling back. Native output has no compact rendering artifact, so the existing tested animation-v1 projection is derived from authenticated predecessor state and audit events; state/event/score roots and final visible state are still checked.

## Pinned artifacts

| Artifact | Version/revision | Verified SHA-256 |
|---|---|---|
| PocketIC server | 16.1.0 | compressed `131219d90dcf9bf6f3ed8ee02d8f55504ea24a6db382f5680675b7bd6b7ed3bf`; payload `b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db` |
| ICP ledger source | `d3b3351fa343a893aea2cfa8d39ac6b0d507b477` | compressed `e66fa97ca52e40a43549bb5c37503568e64ec5ba3579c0ad6c3c7e3cc06013ae`; payload `7fbe869c855f9b8bec902a533811e17e122894b3fe07ca15f946d786f1e06acc` |
| ICP archive Wasm | same revision | gzip/install payload `3a8ec8620661a234aff5d77286fbffd7959ca5f8bdbb6b7bbfc706130bf76a42` |
| runtime-lab normal | implementation revision above | `55f038d2505fd8190678263d0f32c8b8c0beaf2e0ccb62a56d2fbaef18d975de` |
| runtime-lab test hooks | implementation revision above | `75bb8703570f99dd9acfac017453ab3f9be688d75c2c6e024c8f97c6d5bfc497` |

Project locks pin `pocket-ic` 16.1.0, `ic-agent` 0.49.2, `@icp-sdk/core` 6.1.0, Playwright 1.63.0 and esbuild 0.28.2. Chromium is 153.0.8010.12. The local canister identifier `dllsh-pd777-77776-qaaaa-cai` is ephemeral test evidence, not a deployment address.

## Executed results

The reproducible entry point is:

```sh
DFX_IDENTITY=codex_local \
LD_LIBRARY_PATH=/home/codexdev/playwright-libs-s08/usr/lib/x86_64-linux-gnu \
  /home/codexdev/dtr-s08-playwright/bin/python -B \
  tools/check.py all --output .work/s09/all-final-correct
```

The retained regression runs use `tools/check.py source`, `native`, `wasm` and `browser` with their respective `.work/s09/` output directories. The machine-readable summary records the exact commands and tool versions.

Raw logs are retained under `.work/s09/`; the reviewed summary and generated Candid are committed under `evidence/S09/`.

| Check | Result |
|---|---|
| Complete orchestrator | **34 PASS, zero FAIL, 5 BLOCKED; overall BLOCKED (exit 2)** |
| S09 integration wrapper | **5 stages PASS** |
| PocketIC current-host/upstream-ledger suite | **5 tests PASS** |
| Real HTTP certified observer | **10 assertions PASS** |
| Runtime-lab unit/Candid tests | **7 PASS** |
| Generated versus declared current Candid | **PASS** |
| Node source suite | **1,315 passed; zero failures, skips or cancellations** |
| Python tooling suite | **76 passed** |
| Root Rust workspace | **38 passed** |
| Native Rust workspace | **16 passed** |
| Independent native vectors | **445 passed** |
| Portable public comparisons | **151 passed** |
| Native host public/recovery checks | **8 passed** |
| Formatting and Clippy | **PASS** for active Rust workspaces |
| npm audit | **zero vulnerabilities** |
| cargo audit | **zero vulnerabilities; two informational unmaintained warnings** |

## Remaining gates

- A contiguous full-ledger scan establishes correctness only. Production scan volume, archive topology, rate/cycle budgets and latency need measurement and an explicit design decision.
- Independent byte-reproducible Wasm comparison and release provenance remain open.
- Production network-root/delegation policy and broader subnet/topology cases remain open; local-root bootstrapping is confined to the explicit disposable harness.
- Settlement, payout, real wallet behavior and financial operations remain out of scope and unauthorized.
- Production cycle telemetry, capacity, finality and availability evidence do not follow from PocketIC.
- `paste` and `serde_cbor` are transitively unmaintained according to the recorded RustSec database; no bulk dependency migration was attempted.

## Next bounded task

Review the production boundary choices with executable evidence: bound and measure the selected ledger scan strategy, define network-root/delegation policy, and add an independent Wasm reproduction check. Do not add mechanics, payments, a new host, a framework or repository extraction as part of that work.
