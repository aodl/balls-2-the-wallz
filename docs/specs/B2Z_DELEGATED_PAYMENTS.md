# B2Z optional delegated payments — version 1

This is the maintained financial authorization contract for the isolated optional
ICRC-2 implementation. The European game and ordinary frontend remain the direct
Ledger-payment product. This feature is disabled by default; a browser declaration
or feature flag cannot activate a new backend input/rules identity.

## Identities and authority

**DP-01:** A is the explicit ICP funding ICRC account `{owner, subaccount}`. Its
CRC-checked AccountIdentifier remains the economic/gameplay owner. S is a distinct
authenticated Internet Identity user principal, with default spender subaccount.
G is the certified game receiving account, derived from its bound backend
principal and default receiving subaccount. A legacy AccountIdentifier is never
reversed into a principal. Entering A in a form proves no ownership.

**DP-02:** Both A's Ledger allowance to S and A's separate B2Z gameplay grant to S
are required for optional in-game spending. An unrelated approved spender cannot
control A's cannons. The Ledger allowance is **not destination restricted**:
a compromised S can spend it elsewhere. Recommend small amounts, finite expiry
and a separately low-funded gameplay account. Allowance is not a deposit or game
balance. Approval sets, rather than increments, an allowance, and costs a fee.
Query the actual Ledger fee and remaining allowance; amount plus transfer fee
must fit. Allowance displays are last queried values, explicitly labelled after
one minute; no recurring allowance poll is added. Pay refreshes both allowance
and fee before submitting, and a changed fee requires review and a new click.
Never consult today's remaining allowance to validate historic actions.

**DP-03:** Gameplay commands remain Ledger transfers. The browser signs only an
explicit individual `icrc2_transfer_from` to G as S. It never calls a B2Z Fire,
Move or Build update. Observation and direct manual transfers need no login,
allowance, grant, page session, quote, clipboard or post-payment callback.
A successful transfer is not a successful game action.

## Owner grant and revocation

**DP-04:** An owner-originated **direct** transfer from A to G carries the setup
memo. Its Index `spender` must explicitly be `None`. A delegated setup transfer
cannot grant/revoke access, even if S already has a Ledger allowance. Setup is
ordered alongside gameplay by immutable Ledger transaction position.

Memo bytes are domain/version separated:

| Operation | Exact bytes |
| --- | --- |
| Grant | `b2 d1 1d` followed by 29 raw self-authenticating principal bytes |
| Revoke | `b2 d1 80`, exactly three bytes |

`b2` is the B2Z authorization domain, `d1` the version-1 delegation discriminator,
and `1d` the canonical 29-byte principal length. The initial version accepts only
self-authenticating user principals (last principal byte `02`), including the
stable principal returned by Internet Identity; anonymous, management and canister
spenders are rejected. No string encoding or principal truncation is used.
A grant is 32 bytes. The pinned actual disposable ICP Ledger accepts it and
rejects a 33-byte memo. Its Index preserves the exact bytes. The setup amount is
**0 e8s plus the queried transfer fee**: an executed zero-transfer proof establishes
this path without purchasing game credit. Unsupported/malformed setup memos never
fall through into gameplay. These disposable results do not authorize production
setup or establish real-wallet compatibility.

**DP-05:** One grant per A, max 1,024 accounts. A new owner grant replaces the old
S. Expiry is exactly seven days after the authenticated immutable **Ledger block
timestamp**, not client `created_at_time`, browser time or ingestion time.
Grant activation is its Ledger position; only later transactions qualify.
Expiry is exclusive: block timestamp equal to expiry is unauthorized. Revocation
removes future access and never changes earlier accepted history. Registry cleanup
is bounded and lazy on grants; no recurring allowance/expiry polling is added.
The registry stores the canonical raw principal once, without a second redundant
spender-account field. A matching delegated command derives its default spender
AccountIdentifier and compares it with the actual Index spender. The input-segment
animation context carries the resulting registry; idle/simulation-only segments
do not duplicate it in their event stream.

**DP-06:** Sign out only clears the browser signing session. It revokes neither
A's Ledger allowance nor B2Z game access. A alone performs owner setup and
allowance approval/revocation. The S session must not offer a fake one-click
owner revocation. Owner CLI instructions must be checked against the installed CLI
and show both fees and all exact account/memo bytes before execution.

## Source and deterministic history

**DP-07:** Adapter 5 preserves a versioned `B2ZPAY05` input: flags, A, optional S
AccountIdentifier, G, amount, fee, source position, immutable block timestamp,
optional creation timestamp, legacy memo, exact optional ICRC memo and raw-row
digest. All integers are unsigned big-endian 64-bit; flags explicitly distinguish
absent fields from zero/empty. Size is 186–218 bytes. CRCs, lengths, reserved flags,
absent-field zeroes, recipient and input-position agreement are checked.
The official Index wire must actually contain `Transfer.spender`; Candid's
compatibility rule that fills missing optional fields with `None` is insufficient.
Check the untyped wire representation before typed decoding on adapter 5.

**DP-08:** Existing adapter 3/4 and `BTZPAY02` bytes retain their interpretation,
including already rejected delegated payments. A drained authenticated source
fence/checkpoint introduces a new rules/config/schema identity. Never reinterpret
old committed inputs, replace a paid world, import state or override cursors.
The registry belongs to durable deterministic state and is replayed from ordered
inputs; replay does not query current allowances. Pending normalization, receipts,
source anchor, journals and financial attribution must survive recovery/upgrades.
Unauthorized delegated payments remain retained/rejected according to existing
policy; the new browser must refuse enabled Pay without verified game authority.

## Signing and immutable payment intent

**DP-09:** Optional Internet Identity uses the pinned locally bundled SDK. Stable
derivation origin is `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`. The principal
shown and supplied to the Ledger must be the SDK's authenticated user S, never
the leaf session key, frontend canister or backend. Check signing delegation scope
allows the official ICP Ledger. Do not add a privileged payment relay if it does
not. No keys, seeds or auth secrets belong in logs, public evidence or the payment
journal. Domain/alternative-origin changes require review of principal stability.
The pinned auth SDK uses in-memory credential and state stores, a one-hour session
and 15-minute idle policy. Reload requires sign-in again; the nonsecret payment
journal survives. No production origin metadata is changed for local tests.

**DP-10:** Persist one immutable nonsecret intent **before submission**, binding
network/Ledger, A with subaccount, S/default subaccount, verified G, amount, queried
fee, exact memo bytes, creation timestamp, action and quote/grant reference.
States: Ready → Submitting → Ledger confirmed / Ledger rejected / Outcome unknown
→ Game outcome verified. Unknown is not failed. Retry only the original complete
request/timestamp within the Ledger deduplication window; never automatically send
a fresh payment because no receipt appeared. A duplicate returns the known index.
After the deduplication window an unresolved payment stays uncertain unless
independently reconciled. Storage failure disables optional spending, not manual
wallet instructions. Pending intents survive sign-out/reload. The local retry bound is conservatively
23 hours 55 minutes within the ICP Ledger's 24-hour transaction window; a Ledger
`TooOld` response never proves an earlier unknown request was not executed.
There is no automatic UI retry. Uncertain intents remain visible and may settle
only from the original request result or an exact authenticated source receipt.

**DP-11:** Coordinate same-intent submissions across tabs with a bounded native
exclusive lock. No automatic unsafe lease fallback. Rapid clicks cannot create
new timestamps. The submission boundary rebinds every payer/spender/recipient,
network, amount, memo and grant field to the fresh verified authority; a matching
quote-hash reference alone does not authorize an altered intent body. An ambiguous prior attempt remains unknown even if a subsequent
retry is rejected, unless Ok/Duplicate or independently authenticated evidence
settles it. Store returned indexes automatically. No manual transaction reporting
and no amount/time/payer heuristics for gameplay-success claims.

## Product and release separation

**DP-12:** Account exposes optional setup; ordinary cannon icons only prepare.
Pay is a separate deliberate spending action showing exact amount, payer,
destination and fee, enabled only after both permissions are verified. Manual
copy remains available independently. Keep coherent frozen instruction safeguards.
Move/additional Build retain exactly: “If another player claims your chosen tile
before your action is processed, the action fails and your ICP remains spent.”
Keep separate fee information. Fire/Revive/Join retain the ordinary retention
warning. No reservations, automatic refunds, internal balances, recurring spending
or transaction-management wizard.

**DP-13:** Separate feature source/qualification from the frontend-only release.
Production activation requires independent state-preserving backend-upgrade,
source-cutover and recovery evidence plus explicit upgrade/financial authority.
No production feature flag may bypass this. Local Ledger/Index tests are valueless
and do not claim Internet Identity/browser signing or real-wallet compatibility.

## Regression map

| Contracts | Maintained evidence |
| --- | --- |
| DP-01/04/07 | `delegated-payment-protocol.test.mjs`, Rust protocol tests |
| DP-02/04/05/08 | `delegation-registry.test.mjs`, generated authorization vectors, native `delegation` tests |
| DP-04/07 | `delegated_payments::icrc2_actual_ledger_index_preserves_funder_spender_memo_and_zero_grant` (actual disposable; execution status in report) |
| DP-09..11 | `delegated-payment-auth`, `context`, `intents`, `transport`, `setup` JS tests; actual signed disposable SDK test; `verify_delegated_payment_ui.py` native Web Locks and simulated UI transport (executed status in report) |
| DP-08/13 | `icrc2_installed_paid_upgrade_authorization_and_manual_payment`, actual kernel vectors and cursor recovery; complete pending-input/old-rejection/installed replay scope remains a separately recorded qualification gate |

Contributors must name affected DP and UX contracts, preserve historical fixtures,
and distinguish unit, actual disposable, authenticated browser and production
results. An unfinished financial feature must not delay or appear in the ordinary
frontend release.

Protocol references: [ICRC-2](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-2/README.md),
[official Ledger guidance](https://docs.internetcomputer.org/guides/digital-assets/ledgers/),
[ICP Ledger interface](https://github.com/dfinity/ic/blob/master/rs/ledger_suite/icp/ledger.did),
[ICP Index interface](https://github.com/dfinity/ic/blob/master/rs/ledger_suite/icp/index/index.did),
[pinned auth API family](https://js.icp.build/auth/latest/).
