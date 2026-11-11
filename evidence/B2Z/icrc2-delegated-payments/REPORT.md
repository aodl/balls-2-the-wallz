# Optional delegated payments — isolated implementation and local qualification

**The delegated Ledger → Index → installed-game path works on disposable
infrastructure, including an upgrade from the exact European predecessor.**
Optional signing/UI is implemented and remains disabled in ordinary production
builds. Real Internet Identity ceremony, physical-device/real-wallet coverage and
hosted exact-source qualification remain unexecuted; this is not production
activation approval.

Work remains isolated on `feature/b2z-icrc2-delegated-payments`. The fluid/elastic
frontend is independently frozen on `release/btz-prelaunch-playability`; signing
code is absent from that candidate. No production canister, controller, setting,
financial account or paid state changed. Every transfer/approval below uses
valueless disposable ICP.

The maintained [DP-01..13 contract](../../../docs/specs/B2Z_DELEGATED_PAYMENTS.md)
and [UX contracts](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md) define the trust
boundary. A funding account retains ownership; S is the authenticated user spender;
G is the certified default game account. An allowance alone never grants cannon
control. Manual payments and observation remain independent of sign-in.

## Implemented authorization and source boundary

A direct owner-originated Ledger transfer carries the versioned binary grant or
revoke. The setup amount is zero ICP plus the queried fee. A grant is exactly
32 bytes; its self-authenticating principal is not truncated. The actual pinned
Ledger accepts this and rejects a 33-byte memo; its Index preserves owner,
spender, recipient, amount, memo, fee and immutable block time.

One grant per funding account expires seven days after immutable Ledger block
time. Grants, replacements, revocations and commands are applied in source order.
An existing delegate cannot grant itself access. The registry is durable and
bounded to 1,024 entries; authorization never queries current Ledger allowances.
Expiry/revocation does not invalidate earlier accepted commands.

Adapter 5 preserves explicit spender absence/presence and transfer provenance in
`B2ZPAY05` (186–218 bytes). An untyped Candid guard rejects missing `spender`
before optional-field compatibility could silently turn it into a direct payment.
Old adapters and rejected historical delegated inputs retain their old meaning.
The separate rules/config/schema identity requires the existing controller-only,
drained, source-fenced transition from sealed rules 7. It adds only an empty
registry and atomically changes normalization. No caller-supplied world/cursor.
The three activation methods exist only in a `delegated-payments` feature build;
the normal public Candid file remains unchanged.

## Optional signing and spending boundary

Pinned `@icp-sdk/auth` **11.2.0**, existing core SDK **6.1.0**, and SHA-224 crate
**0.10.9** are locked. Internet Identity credential/session stores are in memory;
principal derivation is pinned to the existing European frontend origin. The
Ledger caller must be the delegated user's principal, not its leaf session key.
The isolated Ledger agent has request-scoped cancellation and a 45-second deadline;
query signatures/mainnet root policy remain enabled. It never reconfigures the
observer agent or invokes a game action update.

Default frontend builds exclude the auth SDK and never mount signing controls.
The explicit experimental build additionally refuses spending unless the backend
has the exact authenticated rules-8 identity, configuration, official source,
receiving account and current owner grant. Every Pay action re-derives the existing
canonical quote, queries fee/allowance again and persists its immutable intent
before signing. The UI keeps the same principal/text wallet route and warnings.
Owner setup/revocation is documented CLI text, not a fake signed-as-owner button.
The Ledger allowance is not destination restricted; sign-out revokes neither
permission. Small finite allowances and a low-funded gameplay account are advised.

The bounded nonsecret journal uses native Web Locks, with no unsafe lease fallback.
It binds A/S/G, network/Ledger, exact amount/fee/memo, creation timestamp and quote/
verified-head reference. Response loss stays unknown. Only explicit retry of the
original request within the conservative deduplication window is supported by the
executor; there is no automatic UI retry. Ok/Duplicate records the index. An exact
verified receipt may settle uncertainty; amount/time/payer heuristics cannot.
Ledger success is displayed separately from game success. Storage or lock failure
disables optional spending while manual instructions remain usable.

## Executed evidence and boundaries

Raw results are under `.work/icrc2-delegated-payments/` in the isolated worktree.

| Check | Actual result |
| --- | --- |
| Focused JS protocol, registry, kernel, auth, context, intent, transport and setup tests | 38 PASS (`focused-final02.log`), including complete intent-body rebinding |
| Existing manual payments, memo codecs, canonical quotes, rules-7 replay, pricing, accounts and warning tests | 280 PASS (`manual-history-security01.log`) |
| Default host and feature-enabled host suites, including exact Candid | 52 PASS each (`host-default-final01.log`, `host-feature-final02.log`) |
| Sealed predecessor + minimal schema addition + coordinator restore | PASS (actual full-name native host test; earlier zero-test filter is not evidence) |
| Actual pinned Ledger/Index owner grant, 32/33-byte boundary, A/S/G/memo provenance, exact duplicate | PASS, 24.46 s (`actual-ledger-wire03`), with explicit nondefault funding subaccount, immutable copied harness and exact Index fields |
| Actual signed SDK user/leaf delegation, zero grant, approval, post-execution lost response and exact Duplicate retry | PASS, 20.313 s (`actual-signed-ledger01`) |
| Actual optional UI/composer, populated desktop/390/320, pending/remount, exact receipt, unknown result and native two-tab exclusion | PASS (`ui-browser06`); all three viewports, storage/lock failures, changed fee, copied replacement and revocation gating; simulated auth/transport, no certificate/payment claim |
| Actual Ledger missing/fee-short/expired allowance, wrong A/S subaccount, stale fee, expired approval and insufficient funds | PASS, 19.74 s (`ledger-negatives01`) |
| Existing harness inventory/result regressions | 8 PASS (`harness-unit01.log`) |
| Complete native suite | 50 PASS, zero failures/ignored in 16 groups (`native-complete03.log`); original setup failures retained |
| Exact `612ad0d0…` predecessor → clean feature module, pending old/new inputs, grants/replacement/revocation/expiry, retained invalid targets, manual continuation | PASS, 286.206 s (`installed-exact-production-prior01`); final certificate, source/destination and independent JS normalization/replay/presentation PASS |
| Fixed empty maintenance cost windows, actual fallback work and no synthetic simulation | PASS (`empty-cost01`), three 600-second virtual windows |
| Source publication/hosted qualification | NOT_RUN for this isolated candidate; owner away; no assumed green result |

The signing proof generated disposable A/S/leaf identities only in memory. It
exports only public principals and nonsecret intent/result records. It exercises
the real pinned Ledger through the HTTP SDK, not an Internet Identity ceremony.
The UI test separately uses actual components, browser Web Locks and simulated
sign-in/Ledger replies. Those scopes must not be conflated.

Three populated screenshots and recordings are in `ui-browser06/`; they are real
application captures in sandboxed Chromium/SwiftShader. They do not establish
physical-phone, hardware-GPU, native-wallet or Internet Identity ceremony coverage.

## Preserved failed and incomplete attempts

The first installed attempt used the wrong default genesis fixture and failed the
reviewed-v3 predecessor check. The second used an old transition-status decoder
against the new wrapped status and failed before activation. The third accepted
an authorized delegated Fire and rejected an unrelated approved spender, then
exhausted its 300-second outer allowance after revocation. None is relabelled PASS.
The next bounded allowance preserves all runtime, source and assertion limits.

The first UI bundle attempted a Node-only world import; its browser-safe generated
configuration replacement fixes that setup failure. The second UI attempt passed
three viewports and later held a test Web Lock by accidentally awaiting its
unresolved promise. It was terminated; the harness now returns immediately after
acquiring the lock. `ui-browser03` completes the full assertion set.

The first complete native build exposed one old test literal requiring explicit
`authorization: None`; the next hit `ENOSPC` and a linker bus error. Only this
worktree's incremental caches were removed. Source, evidence, frozen runtime
artifacts, prior frontend rollback assets and unrelated repositories were retained.
The earlier failed/zero-test records remain under `.work/`.

## Installed preservation and artifact identities

The exact prior production normal Wasm is
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
It was copied from the retained European freeze, hash-checked, and is now retained
as deterministic compressed **test evidence** in `vendor/b2z/europe-612ad0d0.wasm.gz`.
No production operation was performed. The clean experimental normal Wasm is
`cd5c1264a7142872ee363ade46c8296111426bc971888afb9e4934989281d768`
(3,707,080 bytes), frozen from backend runtime source `6e44a186…` with
`delegated-payments` only. It has the three controller activation exports and no
synthetic/manual-step exports. The earlier development `3e7f315c…` differs and is
not substituted for the clean artifact. Both the development-predecessor and exact
production-predecessor complete rehearsals qualify the clean `cd5c1264…` module.

The paid predecessor starts from the supported disposable empty genesis and gets
its cannon through a real direct Ledger payment. Upgrade preserves the world,
retained publications/artifacts, source cursor and a pending old rejected delegate.
That input remains `MALFORMED_MEMO`. A sealed drained transition adds exactly an
empty registry while preserving all other canonical state, source identity and
account history. A pending adapter-5 input survives a subsequent upgrade and is
processed once for A. The final same-module upgrade preserves the resulting state
and authenticated history. Existing treasury/physics/pricing components are
unchanged and retain their previous evidence plus host/default-suite checks;
this rehearsal deliberately pauses treasury to isolate valueless gameplay.

Executed actual transfers prove allowance-only rejection, zero-value owner grant,
accepted delegated Fire, unrelated-spender rejection, owner revoke, continued
manual play, delegated self-grant rejection, replacement, an authorized payment
rejected for non-owned Move territory, game-grant-only spending failure, and
seven-day game-grant expiry using immutable Ledger time. A transfer to another
receiver succeeds at the Ledger but does not enter this game's history/accounting,
showing why an allowance must not be called destination restricted. The expiry
case advances **disposable virtual time**; it does not measure production timing.
Deliberate valueless overpayments expose unchanged retained remainders and prices.

Captured raw Index Candid rows are independently decoded/re-normalized in JS.
Every paid/configuration segment independently reproduces exact canonical
state/events/scores, with cursor recovery and verified-segment presentation.
The actual activation checkpoint also passes application transition validation.
Final DTR verification uses the explicit disposable root and controlled IC time,
checks the source descriptor/default recipient/configuration, and retains wrong-
canister and stale-certificate negatives. It is not a mainnet authentication claim.

## Cost and operational limits

The bounded local Node measurement records canonical registry sizes of 159 bytes
empty, 416 bytes for one grant, 8,066 for 32 and 254,042 for 1,024. Validation p95
was approximately 0.09/7.69/16.04/171.67 ms on this contended host. These are Node
serialization/validation measurements, not canister execution cycles or device
performance. There are zero recurring backend allowance queries and zero new
expiry timers. Registry projection is emitted on input segments only.

The actual same-module empty maintenance comparison measures 600 virtual seconds
per condition, with **10 real source fallback calls and zero gameplay segments**:
rules 7 debits 870,238,675 cycles; rules 8 with no grant 845,176,393; rules 8 with one
grant 910,407,488. State sizes are 2,532 / 2,708 / 2,987 bytes. Grant discovery plus
one input segment debits 294,237,385 cycles. These are net PocketIC balance changes
with treasury paused, not isolated authorization instruction costs or gross billing.
The one-grant window also includes an additional history record; do not attribute
its whole difference to a lookup. No top-up/credit was added during the windows.
Module size adds 358,715 uncompressed bytes over the exact prior artifact.

No gross cost/lifetime claim follows from these measurements. Real II ceremony,
exact-source hosted financial and ordinary gates must be recorded before activation. The ordinary frontend release must not
wait for or expose an unfinished financial feature.

## Continuation and production boundary

The additional `delegated-payments.yml` workflow is manual-only, binds a full
source SHA, and uses a separate concurrency group. It does not replace/cancel the
six ordinary gates, deploy anything, or request financial credentials. It has not
been dispatched while the owner is away.

Use `tools/verify_s14_local.py --delegated-payments` with explicit
`--test-filter delegated_payments::...`, predecessor path and independently checked
`--delegation-prior-sha256`. This selects the dedicated ignored experimental tests
rather than silently adding financial activation to the ordinary frontend suite.
The default installed inventory records these omissions explicitly. A default
six-gate result alone does not qualify the experimental feature.

Before any production decision: freeze clean exact feature source/Wasm/frontend,
retain the executed old/new pending-input and historical-rejection preservation,
authenticated DTR and independent replay evidence, qualify exact source,
and review the explicit backend upgrade plus drained source cutover. Separate
owner approval must cover the exact upgrade and feature-enable assets. No reset,
reinstall, financial setup, transfer or activation is authorised by this report.

### Remaining coverage and provenance limits

The optional UI uses the supported pinned II SDK and verifies its actual user
principal/returned signing scope, but a real II ceremony on the stable signing
origin was not exercised. The actual SDK proof uses an in-memory delegated user
identity and the real local Ledger; browser UI journeys use simulated auth/Ledger
replies. These are separate, composed proofs, not a claimed single browser/II
end-to-end success or real-wallet compatibility. No origin metadata/security policy
was weakened to obtain a pass.

Earlier development harness hashes were sampled at process completion while a
parallel Cargo build could replace that path. They are not clean executable-identity
claims. The final exact-predecessor, explicit-subaccount and cost cases freeze the
executable before launch and record its immutable hash. The maintained installed
runner now freezes it too and records dirty-source status. The clean Wasm identity
is independently recorded by the installed case and the final certificate capture.
The original failed/incomplete records remain available.

## Overnight closeout — bounded wire recovery

Controller-only activation was exercised against the actual feature module:
prepare, commit and status all reject an unrelated principal before any state
change (`controller-access01`, PASS, 31.096 s). The final UI/component journeys
pass at desktop, 390×844 and 320×640 (`ui-final07`), with actual native Web Locks,
coherent copied replacement, storage denial, fee change, revoked game access and
unknown-payment recovery. Auth/transport in that UI fixture remain simulated.
Reviewed [results](executed-results.json), [independent replay](independent-replay.json)
and [populated media](media/) are retained with their exact scope.

The additional full source-window test **failed** (`source-window01`, 115.627 s):
a valid 64-record Index page exhausted the generic untyped Candid decoder's
1,000,000-work quota. A 13,574-byte native fixture reproduces the same quota failure.
This is a demonstrated adapter-5 defect; it is not an outer timeout or a reason to
raise safety budgets. The correction checks the bounded wire type table first,
including actual `Transfer.spender : opt text` presence, then decodes the page once
with the unchanged typed decoding/skipping quotas. Reply, row and pending bounds
remain unchanged; missing spender still fails closed. Pinned `binread` 2.2.0 was
already a Candid dependency; only a direct dependency edge is added, without a
version update. Native full-page acceptance and missing-spender rejection pass;
the corrected installed window and exact-module upgrade must be recorded before
claiming the replacement module qualified. The original failure is preserved.

The independent frontend release branch remains separate. Neither this feature
nor its backend correction is merged into it. No production mutation or financial
operation was performed, and no hosted CI pass is assumed while the owner is away.
