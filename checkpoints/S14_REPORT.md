# S14 — lean ICP-index / filtered-poke checkpoint

The user has published both staging branches. **The published DTR dependency is now pinned and locally verified without development overrides.** User action is now a BTZ push of the dependency-completion commits and review of their CI. Codex performed no remote Git or mainnet operation.

## Published dependency completion

Current tested BTZ source: `96aeac76a7c2b3c90ef6ab5840ffc80aa31a25f5`; DTR remains `1f47c1a0a104875bd13475d561b8d5aa10770d99`. All five Cargo locks and the real npm lock bind the published dependency; `npm ci` installs 0.12.0 normally. Native/Wasm checks passed at dependency commit `de74fef`, before the package-container normalization; no application/Rust implementation changed in this continuation.

An isolated Rust consumer downloaded the published dependency through ordinary Cargo resolution in an initially empty Cargo home with Git URL rewrites disabled and CLI Git fetching disabled. The checker verified commit/tree, archived the resulting **local** Git object, reproduced the npm package and passed an isolated installed JavaScript consumer. No remote Git clone/check-out step remains in the wrapper. API checks include sparse admission and SDK-root client exports.

The current normalized package SHA-256 is `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`. Its twenty payloads exactly match the initial development package below. Eleven tar members had 0600 permissions; deliberate 0644 normalization changes only container metadata. The normalized artifact now reproduces byte-for-byte with npm 11.12.1; the npm lock integrity was actually regenerated and verified. Failed metadata/download parsing and package-reproduction wrapper runs remain recorded; two new parser regressions raise tooling coverage to **137 Python tests**.

Published-pin verification passes: **1,177 JavaScript / 137 Python**, **18 workspace / seven portable Rust**, nine host tests, 12 installed integration tests (eight repeated adapter units), independent native/public conformance, format/Clippy, normal/test exports, Candid and **12 fresh certified-browser checks**. The installed normal Wasm again assigned source positions 7/8 exactly once, including fallback before upgrade, and replayed all **49 publications** exactly. The live SDK read-only client authenticated a subsequent autonomous head. No old global-scanner campaign was rerun.

Measured normal Wasm SHA-256 is `383b9c7185037840dad92d7090b023a03735691d9f93361c15224995fdd305b3`; test-hooks is `38881e5e32c890a49c7895ba02539150d0476500862b68a8d890b7925478269e`. These differ from the earlier path-override builds below; no byte-reproducibility claim is made across source-resolution modes. Generated Candid is identical. Current machine-readable results: [published dependencies](../evidence/S14/published-dependencies.json) and [captured history](../evidence/S14/published-index-trace.json). Raw logs: `.work/s14/published/`.

The original prepublication measurements below remain explicitly scoped historical evidence. Their pending-publication statements were resolved by this continuation; they do not describe current dependency state.

## DTR CHANGES

Branch `checkpoint/s14-sparse-input-mainnet-client`, tested/final shared commit `1f47c1a0a104875bd13475d561b8d5aa10770d99`:

- `5e2af85`: `IngestOrdered { start, end, inputs, anchor }` and JavaScript `ingestOrdered` share existing admission validation. Explicit sparse global positions remain ordered; cursor, capacity and payload failures commit neither progress nor inputs. An empty advancing source range is allowed; a zero-width range requires the existing anchor. Dense admission, seals and public encodings remain compatible.
- `7df2a45`: one network-configured SDK certificate verifier/transport accepts explicit disposable local trust or the SDK mainnet root. Local wrappers remain. Mainnet rejects replacement roots and non-HTTPS transport; BTZ additionally pins its build-time endpoint/backend. Signature/delegation, freshness, certified-data path, artifact hashes, predecessor rules, anti-rollback and resynchronization remain enforced.
- `1f47c1a`: a reproduced JavaScript recovery defect accepted numeric sparse positions but reserved noncanonical values. Admission now owns canonical input records before persistence; numeric/string/BigInt positions yield equal durable/public results. This corrects the sparse API rather than adding another shared abstraction. `f42a22a` records verification/publication status.

Standalone result: **191 JavaScript / 31 Rust tests PASS**, including dense admission and Life. Rust formatting/Clippy passed; the final follow-up changes only JavaScript normalization and documentation. No ICP, Event Horizon, prices, wallet or deployment types enter DTR. The pre-edit notice and deletion map are in [S14_WORK](S14_WORK.md).

Inspected npm pack: `@dtr/timeline-runtime@0.12.0`, SHA-256 `3e04294abee75b7b8a42d72000fb09068ce8700567729af98b9f7aa53470cdcb`. All 20 packaged files match the installed local consumer. Rust crate version remains 0.11.0; the exact shared revision identifies its new API. Temporary command-scoped Cargo patches and regenerated development locks were restored after execution. No permanent sibling dependency or Git rewrite was committed. At the initial prepublication handoff, remote-pinned clean-consumer validation was **NOT_RUN**. At that handoff, `npm ci --ignore-scripts --offline` restores the checked-in old published package; reapply the explicit development-package command to reproduce S14 before the immutable pin update. Verification results above refer to the inspected 0.12.0 package, not that restored 0.11.0 installation.

## BTZ CHANGES

Branch `checkpoint/s14-lean-index-poke`; substantive operator-profile test source **`dad4b64577e892aa15b6bf18601ad8b6f5c8c13a`**, tree `677ac3798f31365a9349b855c8d106c19a4ad7c8`. Subsequent closeout changes record evidence/status and do not replace that measurement identity.

There is one receiving account, default numeric subaccount 0, derived by the supported ICP AccountIdentifier library. The official index's `ledger_id` must match before account history is admitted. The single exact account-history method pages newest-first with exclusive continuation, freezes the high ID, establishes the complete unseen range, then atomically admits oldest-first sparse positions. Downloaded rows, source progress and published input retirement remain distinct. Durable pending records and nonces survive upgrades. Bounds are 64 records/page and 256 staged records/pass; overflow visibly preserves progress and requires reviewed recovery. No silent newest-only initialization, cursor skipping or infrastructure-as-donation behavior exists.

The exact `poke(vec PokeMatch)->()` authenticates one configured Event Horizon sender before decoding, caps encoded arguments at 32 KiB and accepts at most 256 matches. Only the exact receiving subaccount with a positive Candid Nat wakes work; there is no unchecked narrowing. Unauthorized, disabled, empty/global, neuron, wrong-target and zero-amount pokes cause no persistent writes, game reads or reconciliation. Mixed/duplicate matches coalesce. One fenced worker, a fixed 60-second fallback and a bounded 2/10-second post-poke retry burst handle missed notifications and index lag. Known pending pages continue promptly. Simulation pacing is independent.

The old global scanner, archive traversal, `ledger_hint`, production synthetic admission and manual Seal/Step/Publish controls are gone. The unused arena/interface laboratories are deleted. Old scanner tests remain historical rather than active release gates. Authorized pause/resume, independent game oracles, replay, Life, source idempotency, bounded publication and certificate tests remain. Normal Wasm has no `test_apply`, scanner or benchmark exports; the sole synthetic control is feature-gated and controller-authorized in test Wasm.

Game mechanics, prices, memo meanings, exact arithmetic, scoring and pure-kernel goldens are unchanged. Source identity is versioned `BTZ-ICP-INDEX-01`; its anchor binds admitted index records, not a ledger hash chain. **BTZ trusts the configured official index for account-history contents and completeness.** Its application certificate does not independently prove index completeness.

The existing observer uses explicit deployment configuration and standard SDK mainnet trust. Receiving-account and price configuration bytes must match certified source/config identities before display. No login, signing, wallet connection or transaction submission exists. The mainnet bundle/asset configuration and offline constructor/subscription tools publish nothing. The [application contract](../docs/specs/BTZ_APPLICATION.md) and [operator runbook](../docs/operations/S14_OPERATOR.md) are current; superseded specifications are labelled historical.

## Local acceptance evidence

The installed **normal Wasm** uses the upstream ICP ledger and index from IC revision `d3b3351fa343a893aea2cfa8d39ac6b0d507b477`. The index, not BTZ, handles ledger/archive synchronization. The test creates an actual ledger archive and real-format local transfers. Initial world is the operator generator's empty **16×8** world, with two logical ticks/segment, Step(512), one-second game pacing, 60-second fallback and three-publication/8 MiB retention.

During the bounded 150-virtual-second functional run:

| Observation | Result |
|---|---|
| Valid payment with real-format authenticated poke | Global position 7 admitted once |
| Second valid payment at virtual second 30, no poke | Position 8 discovered at second 60 and published before upgrade |
| Source completion | Exclusive cursor 9; no pending rows or source errors |
| Recorded index-history calls | 8; this counter excludes `ledger_id` readiness |
| Autonomous game | 49 publications captured; no per-segment controller steps |
| Replay | All 49 canonical publications and state/events/scores hashes equal independent JavaScript replay at work budget 23 |
| Upgrade / pause-resume | Upgrade interrupts staged game work; source/input progress and scores survive; authorized pause/resume checked |

A read-only SDK client authenticates state/events/scores and then a new autonomous head through an explicit disposable root. Certificate capture refreshes PocketIC's real-time clock **after** the virtual-time observation; that certificate/live phase is separate from the functional time-series. Publication observation is not a hidden seal timestamp. No throughput, production cost or full-update headroom claim follows from this functional test.

Controlled fixtures separately test sparse multi-page histories, arrivals while downloading, duplicate/nonadvancing/inconsistent pages, full nat64 durable positions/subaccounts, index lag and unavailability, binding mismatch, capacity atomicity and interrupted download/admission. A held inter-canister reply exercises repeated timer/poke callbacks, timeout/upgrade and stale-response fencing without concurrent source operations. Its manual PocketIC HTTP response is mocked locally; it never accesses a real external service. Poke tests include ignored-poke persistent-write/call assertions, mixed/duplicate targets, large Nat, bounds and disabled sender.

The fresh certified browser run passed **12 checks**, including native Web Crypto, correct snapshot playback, reduced-motion readiness, layout and deliberate certificate-corruption rejection; the separate offline HTTP browser passed **11 checks**. The browser readiness follow-up is commit `8f299a7`; it changes no canister or verifier behavior. Detailed current browser, native, Wasm and source outcomes are in [verification.json](../evidence/S14/verification.json). BTZ counts: **1,177 JavaScript / 135 Python**, **18 workspace / seven portable Rust**, **nine host tests**, **12 integration tests** (eight repeat source units), **445 independent native vectors**, public host conformance and **11 formatting/Clippy checks**. Genuine certificate, browser-native Web Crypto and read-only SDK checks remain distinct from offline replay. Full historical interactive live-GUI disconnect/reconnect orchestration was not rerun with this host; existing client anti-rollback/resynchronization unit coverage remains. Historical scanner/cross-schema upgrade campaigns are retired for the fresh index application, not falsely reported as rerun.

Normal local-override Wasm SHA-256: `be60c452872fc15e32878b99a44af7bf408e2100575385ee51f7f59f309c0c4e`; test-hooks Wasm: `49205183f0ea99a30f6b4d0c9c6cb5834fee31ff267603c89fa8b2e824c52df7`. Generated Candid was compared semantically with the checked-in interface. These are practical module identities, not a claim that a later remote-pinned build is byte-identical. Full inputs, artifact hashes and commands are in [provenance.json](../evidence/S14/provenance.json); captured history is [index-trace.json](../evidence/S14/index-trace.json).

Raw logs remain under `.work/s14/` and DTR `.work/s14/`. Failed intermediate experiments are preserved: the timer-only slow-reply fixture, private unsafe-number persistence, JavaScript sparse reservation recovery, initial stale-certificate capture and browser snapshot/start/navigation assumptions. The final gates use the corrected paths; certificate freshness was never relaxed. The browser also correctly rejected an operator snapshot aged over five minutes, prompting a fresh capture immediately followed by browser verification.

## USER ACTIONS

DTR publication is complete and no further DTR source change is needed. Review the local BTZ continuation and push it:

```sh
cd /home/codexdev/src/btz
git status --short
git branch --show-current
git log -6 --oneline
git diff a33f22df8dd55762a89ebdedb3f4a6170b73fd5d..HEAD --stat
# User only:
git push origin checkpoint/s14-lean-index-poke
```

Never force-push; inspect/reconcile any remote divergence. CI for these new local commits is **NOT_RUN**; the earlier staging push does not validate them. Exact local reproduction and user-operated deployment/account/subscription/pause/upgrade commands are in the runbook. Official ICP ledger/index IDs were confirmed against official documentation on 2026-10-15; Event Horizon's pinned subscriber guide and instance interface are referenced there. No principal or subscription-funding destination was invented.

## REMAINING PRODUCT GATES

1. **Implemented and locally verified:** bounded account-index admission, filtered real-format pokes, lag/fallback recovery, autonomous authoritative game, durable upgrade recovery, certified read-only observer and deployment preparation.
2. **Ready for user-operated mainnet verification after CI:** published immutable dependency completion and isolated-consumer verification are done; new BTZ push/CI, confirmation of fresh deployment scope, reviewed controllers/cycles/Event Horizon identity, real index binding, intended account/certificate verification, subscription admission and controlled wallet memo exercise. No live funded deployment was found in checked-in configuration; this is not permission to reset one. Mainnet actions remain **NOT_RUN**.
3. **Before public paid/prize launch:** automatic settlement/payout implementation and review, retained-payment/no-refund disclosures, operational funding/availability, real-wallet identity/memo compatibility and explicit user launch decision. Area-time scores remain; automatic payouts/refunds are unavailable. Do not advertise guaranteed distributions or whole prize-product completion.
4. **Explicitly removed/deferred:** global-ledger throughput campaigns, competing source/notification services, wallet/login features, adaptive scheduling, telemetry infrastructure and payout framework in this milestone. Full-update instructions, heap high-water, production capacity/latency and actual cycles burned are **NOT_MEASURED**. No new cost estimate borrows obsolete global-scanner rates.

Stop here for the user BTZ push/CI and later user-operated deployment decisions. No subsequent milestone is started.
