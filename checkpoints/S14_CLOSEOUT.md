# S14 final closeout — published dependency, source recovery and deployed observer

The current application uses published DTR `1f47c1a0a104875bd13475d561b8d5aa10770d99`, real Cargo locks and the inspected 0.12.0 distribution, without an override. This closeout supersedes the initial S14 handoff's documented 256-record hard stop. Earlier reports and evidence remain historical. No DTR source change, remote Git operation, mainnet action or financial operation was performed in this continuation. No S15 work was started.

## Dependency and source scope

Tested application source: `2573516471afb35f09e643186667a58f7fa772ea`; final documentation/evidence commit is separate. DTR tree: `467bd2e25b1cf356ecdced7d69e26514a764c045`. Package SHA-256: `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`. All twenty payloads match that exact source; normalized tar permissions reproduce byte-for-byte with npm 11.12.1. The isolated consumer resolves the published Git revision in an initially empty Cargo home, verifies commit/tree, packs it and consumes it outside both repositories. No explicit remote clone/fetch/checkout is run by the wrapper.

The actual local baseline was `8ae4f31`, already newer than reviewed `a33f22d`; its completed dependency handoff was preserved. User-provided workflow evidence: [DTR 38778487685](https://github.com/aodl/dtr/actions/runs/38778487685) passed, while [BTZ 38778318985](https://github.com/aodl/balls-2-the-wallz/actions/runs/38778318985) failed against the old committed dependency (`IngestOrdered` missing). Neither workflow validates these later local fixes. The independent review's 189/1,175 JavaScript and 135 Python results excluded SDK checks and did not execute native, PocketIC or browser gates; they are not counted as this closeout's consumer/deployment pass.

## Callback-trap recovery

An installed test-hooks Wasm reproduces a trap **inside BTZ after a genuine index await**, using the existing authorized test feature. The one-shot flag is consumed before the await, so callback rollback does not repeatedly arm it. Before the correction, the persisted in-flight lease survived and ordinary fallback left the source cursor at zero. The expected failing run is preserved under `.work/s14/recovery-red/`.

`request_reconciliation()` now permits scheduling an expired operation. `begin_reconciliation()` still excludes an unexpired lease and increments its nonce on replacement; pending rows/admitted progress are preserved. There is no second scheduler or cleanup framework. The installed regression observes zero extra calls while unexpired, recovery through ordinary fallback without upgrade/reset, cursor 101 and one queued payment. It then starts autonomous simulation, independently replays the publication and crosses another fallback: position 100 appears exactly once. A separate held-reply test releases the old response **after** a replacement has admitted positions 100/201; cursor 202 and two inputs remain unchanged, with and without upgrade.

Fault methods are controller-authorized and absent from normal Wasm/Candid. The production poke signature and caller/target/Nat/bounds filters are unchanged. Ignored targets still cause neither reconciliation nor persistent source changes.

## Bounded history draining

The previous 257-row stop was documented, not silent loss. The replacement keeps a rolling **oldest window of at most 256 rows** while traversing backwards under a frozen high ID. It admits that window only after reaching the old watermark/oldest history. Each atomic admission advances to that window's highest original transaction ID + 1. If unadmitted rows remain, it restarts exclusive backwards pagination at frozen high + 1 and downloads the newer portion again. New arrivals above that frozen range belong to a later pass. No gap padding, renumbering, newest-first execution, cursor skipping or larger unbounded buffer is introduced.

Installed normal-Wasm cases drain 256, 257 and 513 sparse records, each with an additional arrival and an upgrade during downloading. Their eventual published counts are 257, 258 and 514; native replay requires every original position in oldest-first order exactly once. Sampled pending high-water values are 64, 64 and 256, respectively; these are observations, while the structural bound is 256. A separate adapter regression drains 1,025 records with restore/validation between pages and admissions. Existing full-inbox atomicity coverage remains.

This strategy trades bounded memory for extra reads: amplification can be quadratic in backlog/window count. It removes the finite 257-record availability stop; it does not establish production throughput, cost, permanent stability or arbitrary-traffic resilience. Inbox/image/storage backpressure still preserves unadmitted rows and requires retirement or reviewed recovery. Infrastructure failure is never classified as a donation.

## Actual deployment bundle

`tools/build_observer_mainnet.mjs` builds the real static observer, configuration asset, CSP/asset manifest and explicit deployment identity. The acceptance test builds both production and an explicitly selected local-test variant. The production build's module inventory excludes the local adapter; its mainnet-root/endpoint policy is unchanged. The local variant uses the same renderer, SDK verifier and certified publication client with a trusted, compile-time disposable root and loopback endpoint. No root or canister substitution is accepted from URL parameters/server policy.

The built assets are served through the existing allowlisted loopback server against installed normal BTZ Wasm and the upstream ICP ledger/index. This proves the deployment-shaped client path, **not asset-canister hosting certification or mainnet availability**. The browser authenticates backend/receiving-account and price/config identities, receives fresh publications, observes a poke-assisted transfer and a no-poke transfer, and reconnects through authenticated snapshot resynchronization after a retention gap and supported upgrade. Unrelated target pokes add no index calls. All admitted histories are independently replayed through Rust and JavaScript. The observer has no login, wallet, allowance, signing or transaction-sending flow; the proxy accepts query/read_state only.

The live test exposed a startup race: genesis can retire after its certified catalog is read but before its non-retained state is fetched. A forced-ordering installed/browser regression reproduces `stale observation publication` before the fix. BTZ's observer now retries initial acquisition at most twice, only for the host's two explicit moving-snapshot errors. Every attempt verifies a fresh certificate, intended source/config and artifacts again. Authentication, freshness, configuration and hash errors are not included in this retry policy. The deployed-bundle regression forces this race and requires a successful fresh certified restart.

## Verification and evidence

Current machine-readable results, exact build hashes, commands, trace identities and failure history: [closeout.json](../evidence/S14/closeout.json). Raw logs/builds are under `.work/s14/`; previous evidence is unchanged. Current captured histories are stored separately from the original S14 runs.

Actual counts: **1,177 JavaScript / 137 Python**, **18 workspace / seven portable Rust**, **10 host tests** and **16 integration-harness tests**, including six installed-Wasm scenarios, nine repeated adapter units and one pure backpressure test. The live deployment bundle passes six browser assertions; independent replay matches **49** simulation publications and **12** deployment-stream publications. Published isolated Rust/JavaScript consumers, byte-for-byte package reproduction, normal/test export checks, Candid and all relevant formatting/Clippy gates pass. Native components were unchanged after their recorded `1f32022` gate; current source/Wasm and installed/bundle gates ran at `2573516`.

Normal Wasm SHA-256: `15b016b9d156a1b90feeeb9be610fc7ba51d9413509c3c7161ab8e13faacb703`; test-hooks: `c1be98ae2d6c839853ab818f4bf613d4e0533a6e86342ab3e50e567d647a4e19`. The default build target matches the normal module and generated Candid is unchanged.

The gates include the full SDK-dependent JavaScript suite, Python tooling, native Rust/public conformance, normal/test Wasm exports, generated Candid, formatting/Clippy, installed source/recovery tests, actual live bundle and independent replay. Sixteen integration-harness tests comprise nine repeated adapter units, one pure backpressure test and six installed-Wasm scenarios with bounded subcases. Fixture timing, source-export inventory and edition-specific Clippy failures were corrected explicitly; initial failures remain in raw evidence. No golden fixture was changed and no compiler/lint/security check was disabled.

Full-update instructions, production latency/capacity and actual cycles burned remain NOT_MEASURED. No obsolete global-ledger benchmark or historical laboratory migration was rerun or claimed as current evidence. Game mechanics, prices, scores, public formats, publication v6, animation v1 and bounded retention remain unchanged. Accrued area-time scores and the intended prize/revenue-sharing direction remain; automatic payouts/refunds are unavailable.

## User-operated completion

Review the [short mainnet checklist and runbook](../docs/operations/S14_OPERATOR.md). New BTZ CI is NOT_RUN until the user pushes and reviews it. DTR is unchanged and requires no additional push.

```sh
cd /home/codexdev/src/btz
git status --short
git branch --show-current
git log -6 --oneline
git diff 8ae4f31d0a9e5188b8bfe5e947bb4f3d2c3e3e4e..HEAD --stat
# User only:
git push origin checkpoint/s14-lean-index-poke
```

Never force-push; inspect/reconcile any remote divergence. User-operated gates remain: exact intended account/index/Event Horizon configuration, cycles/controllers, fresh-deployment scope, asset-canister/mainnet verification, real-wallet memo compatibility and subscription admission. No funded canister reset is authorized. Public paid/prize participation remains gated on settlement/payout work, disclosures and an explicit user decision. Stop after this closeout.
