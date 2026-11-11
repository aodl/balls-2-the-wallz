# Optional delegated payments — isolated implementation and local qualification

The optional feature is implemented in the separate `feature/b2z-icrc2-delegated-payments`
worktree. **Production activation is not authorised. Complete feature qualification
is still in progress.** The fluid/elastic frontend remains independently frozen on
`release/btz-prelaunch-playability`; no signing code is added to that candidate.
No production canister, controller, setting, financial account or paid state was
changed. All transfers/approvals described below use disposable valueless ICP.

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
| Focused JS protocol, registry, kernel, auth, context, intent, transport and setup tests | 36 PASS (`focused-final01.log`) |
| Existing manual payments, memo codecs, canonical quotes, rules-7 replay, pricing, accounts and warning tests | 280 PASS (`manual-history-security01.log`) |
| Default host and feature-enabled host suites, including exact Candid | 52 PASS each (`host-default-final01.log`, `host-feature-final02.log`) |
| Sealed predecessor + minimal schema addition + coordinator restore | PASS (actual full-name native host test; earlier zero-test filter is not evidence) |
| Actual pinned Ledger/Index owner grant, 32/33-byte boundary, A/S/G/memo provenance, exact duplicate | PASS, 25.608 s (`actual-ledger-wire01`) |
| Actual signed SDK user/leaf delegation, zero grant, approval, post-execution lost response and exact Duplicate retry | PASS, 20.313 s (`actual-signed-ledger01`) |
| Actual optional UI/composer, populated desktop/390/320, pending/remount, exact receipt, unknown result and native two-tab exclusion | PASS (`ui-browser03`); simulated auth/transport, no certificate/payment claim |
| Actual Ledger missing/fee-short/expired allowance, wrong A/S subaccount, stale fee, expired approval and insufficient funds | PASS, 19.74 s (`ledger-negatives01`) |
| Existing harness inventory/result regressions | 8 PASS (`harness-unit01.log`) |
| Complete native suite | 50 PASS, zero failures/ignored in 16 groups (`native-complete03.log`); original setup failures retained |
| Installed paid upgrade, authorization/revocation and manual continuation | In progress; actual authorized Fire attributed to A already observed, full completion not yet claimed |
| Source publication/hosted qualification | NOT_RUN for this isolated candidate; owner away; no assumed green result |

The signing proof generated disposable A/S/leaf identities only in memory. It
exports only public principals and nonsecret intent/result records. It exercises
the real pinned Ledger through the HTTP SDK, not an Internet Identity ceremony.
The UI test separately uses actual components, browser Web Locks and simulated
sign-in/Ledger replies. Those scopes must not be conflated.

Three populated screenshots and recordings are in `ui-browser03/`; they are real
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

## Cost and operational limits

The bounded local Node measurement records canonical registry sizes of 159 bytes
empty, 416 bytes for one grant, 8,066 for 32 and 254,042 for 1,024. Validation p95
was approximately 0.09/7.69/16.04/171.67 ms on this contended host. These are Node
serialization/validation measurements, not canister execution cycles or device
performance. There are zero recurring backend allowance queries and zero new
expiry timers. Registry projection is emitted on input segments only.

No gross cost/lifetime claim follows from these measurements. Complete installed
recovery, replay, browser signing/Internet Identity and backend-upgrade gates must
be recorded before feature activation. The ordinary frontend release must not
wait for or expose an unfinished financial feature.

## Continuation and production boundary

Use `tools/verify_s14_local.py --delegated-payments` with explicit
`--test-filter delegated_payments::...`, predecessor path and independently checked
`--delegation-prior-sha256`. This selects the dedicated ignored experimental tests
rather than silently adding financial activation to the ordinary frontend suite.
The default installed inventory records these omissions explicitly. A default
six-gate result alone does not qualify the experimental feature.

Before any production decision: freeze clean exact feature source/Wasm/frontend,
complete old/new pending-input and historical-rejection preservation, authenticate
DTR outcomes and independently replay the captured history, qualify exact source,
and review the explicit backend upgrade plus drained source cutover. Separate
owner approval must cover the exact upgrade and feature-enable assets. No reset,
reinstall, financial setup, transfer or activation is authorised by this report.
