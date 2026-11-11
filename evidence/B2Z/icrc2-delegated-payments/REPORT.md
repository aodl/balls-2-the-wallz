# Optional delegated payments — isolated implementation and local qualification

**The delegated Ledger → Index → installed-game path works on disposable
infrastructure, including actual A/S SDK signatures and an upgrade from the exact
European predecessor.**
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

The additional `delegated-payments.yml` workflow runs only on the isolated feature
branch push or explicit dispatch, binds a full source SHA, and uses a separate
concurrency group. It does not replace/cancel the
six ordinary gates, deploy anything, or request financial credentials. It has not
been triggered or dispatched while the owner is away.

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

The broader source check ran all **1,850 JavaScript tests successfully**. Its
Python portion initially failed exactly one immutable delivery-builder assertion
(198/199), because the feature flag had edited the pinned historical builder.
The original builder is restored byte-for-byte; a separate small optional builder
adds the explicit compile-time switch and excludes the signing graph by default.
The maintained wrapper records both identities. All **199 Python tool tests now
pass**, including the unchanged historical contract. No frozen assertion, 900-second
measurement call or safety budget was weakened. Feature host **54/54 PASS** after
the wire correction; malformed/truncated/oversized replies and 65-row pages fail.

A replacement normal experimental module, built from clean backend source
`ea7ba4a840039cbdd5de0d61836e67830fb69b61`, is frozen as
`6d95d0bac4d571792c93f312c991c20e03f0d271a026d87eb96817194eb10378`
(3,677,538 bytes). Only unrelated builder/harness files changed while it built;
all backend input paths remained identical. Its exports pass the normal-module
check and contain no synthetic mutation methods. Existing `cd5c1264…` installed/
cost results remain evidence for that earlier exact module, not a substitute for
the replacement module's pending installed reruns. The harness aliases its own
already-pinned Candid 0.10.37 parser trait; the canister keeps Candid 0.10.28 and
its existing binread version. No dependency version is upgraded.

## Final module and integrated qualification

The explicit-endian parser API shared by pinned Candid versions produces a final
normal module `d5cbcdd37fd3d8bcf30b490eb50ad0f1354dd1490631806edfc6f1f0bcab5aec`
(3,677,527 bytes), from clean runtime source
`56829547ed4099b7aadf7a7eb6338fe8656e4afe`. The earlier `6d95d0ba…` differs by
11 bytes and is retained, not substituted. The [final backend manifest](backend-final.json)
records exact exports and has no synthetic mutation methods.

- [Corrected full source window](source-window-final02.json): PASS, **93.207 s**,
  256 actual records pending across upgrade and exactly 256 ordered receipts.
- [Exact European predecessor upgrade](installed-exact-final02.json): PASS,
  **334.587 s**, using `612ad0d0…` → final `d5cbcdd3…`; the complete old/new
  pending-input, grant/revoke/replacement/expiry and retained-payment assertions
  remain intact. [Final certificate/source proof](installed-final-authentication.json)
  and all [17 independent replay stages](independent-replay-final.json) pass.
- [Local source gate](source-recovery-final.json): PASS, including **1,850 JS**
  and **199 Python** tests, unchanged historical delivery contract, structure and
  documentation links. It starts at source `c2e41cc…`; its JS/application inputs
  are unchanged in the later parser/API and integration-tooling commits. This is
  local execution evidence, not a hosted exact-source conclusion for a later SHA.
- Default/experimental host suites each pass **54/54** after strict wire recovery;
  the shared modern-Candid harness also passes all four wire regressions.

The [final same-module empty-cost measurement](empty-maintenance-cost-final.json)
also passes, **99.167 s** wall time: three 600-second virtual windows each execute
10 actual source fallbacks and no simulation. Net debits are 873,949,730 cycles
(rules 7 empty), 845,209,884 (rules 8 empty registry), and 914,055,257 (one grant).
Grant discovery plus execution is 294,548,720 cycles, including existing source
work. State sizes remain 2,532 / 2,708 / 2,987 bytes. No added allowance/expiry loop,
credit or transfer occurs in these windows. These remain net disposable costs,
not gross production billing, a pure lookup comparison or lifetime estimates.

The first combined signed-SDK/installed test preserves a FAIL (77.440 s): Ledger
signatures and exact Duplicate recovery passed, but a game receipt assertion
failed. The fixture had used the first Fire price again for its second manual
Fire, even though the pool had grown from one to two. The shared pricing helper
requires 0.4 ICP for that second request. The corrected fixture computes Join and
both Fire amounts with the maintained canonical helpers; it also saves receipts
before assertions for precise future diagnosis. No backend/economic rule or
assertion was weakened, and the original failure remains available.

The optional UI now marks an allowance **Last checked** immediately after a
submission may have consumed it. Every new explicit Pay still re-queries the
allowance and fee; this adds no polling. The independent frontend release remains
on `release/btz-prelaunch-playability` with its own 16-file freeze; the isolated
feature's 17-file asset sets include its additional configuration.

### Signed installed path and final UI

[Combined signed SDK → game proof](signed-installed-game02.json): **PASS,
95.150 s** (outer harness timing is retained in the linked record). Distinct A and
S keys and S's leaf delegation live only in the Node process. A signs a normal
Join, zero-value game grant and finite approval; S signs the exact delegated Fire.
After an injected post-execution response loss, retry of the original timestamp
returns Duplicate and consumes amount plus fee once. A then signs a separate
manual Fire. The child signer exits **before** game processing. The existing
Index/source pipeline subsequently applies all three gameplay payments to A's
cannon, and the [actual receipts](signed-installed-game-receipts.json) and
[certificate/source verification](signed-installed-authentication.json) pass.
This is an actual installed, signed, valueless payment path, not an II ceremony or
browser-UI signing claim. The UI/component proof remains separately scoped.

[Final browser result](ui-release08.json): PASS at desktop, 390×844 and 320×640,
including Last checked allowance after spending, copy replacement, permissions,
storage/lock errors, exact receipt and native two-tab exclusion. [Final populated
captures/recordings](media-release08/) use actual application components with
simulated auth/Ledger replies in Chromium/SwiftShader. Earlier media and failed
attempts remain. All **38** focused payment tests pass after the last UI change.
No hardware GPU, physical phone, native wallet or real Internet Identity pass is
claimed. No signing identity material is retained in any artifact.

### Hosted gates and source continuation

The actual ordinary workflow still requires **Source conformance; Native
conformance; Packaged DTR and clean consumers; Runtime-lab Wasm; Browser HTTP and
Web Crypto; S14 and million-cell installed-IC qualification**. Every hosted
conclusion is **NOT_RUN for this isolated source**, while the owner is away.
Informational production inventory is excluded. The additional financial workflow
runs only on the isolated feature branch or explicit exact-SHA dispatch, with no
production credentials, deployment step or relation to frontend-branch concurrency.
No push, force push, deployment, controller/setting update, real allowance or
financial transfer occurred.

After local review, the ordinary non-force feature publication is:

```sh
git -C /home/codexdev/src/b2z-icrc2 push origin HEAD:refs/heads/feature/b2z-icrc2-delegated-payments
```

Recheck the remote before publication and reconcile any new commits; do not force.
The frontend-only candidate remains independently publishable from its existing
release branch. Production activation of this experimental feature additionally
requires exact-source ordinary and financial CI, a real II ceremony/origin review,
and separate approval for the exact backend upgrade plus drained authenticated
cutover and feature-enabled assets. Keep the preserved paid-state recovery path;
never reset or reinterpret old inputs. Signing out and the two on-chain revocations
remain distinct. This report authorizes no production operation.
