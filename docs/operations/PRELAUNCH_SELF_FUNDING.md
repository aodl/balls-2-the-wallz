# Prelaunch self-funding — local preparation only

**Not deployed. No mainnet operation or real ICP transfer occurs in this task.**
The observer and current live game are unchanged. A future approved activation
of this normal module starts value-moving maintenance on the existing backend.

Prelaunch treasury policy: sweep available gameplay ICP into operating cycles for B2Z. A future separately reviewed treasury policy will support adaptive cycle reserves, player rewards, ICP buybacks and other revenue allocations. Those functions are not implemented or promised by this release.

## Fixed route and scheduling

The B2Z-owned worker is outside the deterministic kernel and DTR coordinator.
Every five minutes it reads `icrc1_balance_of` for its own default account and
`icrc1_fee` from official Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai`. Historical
`received_e8s` is never a spendable balance. Accepted, invalid, underfunded and
excess payments retain their existing gameplay classification.

Mainnet context requires backend `s34gv-3qaaa-aaaar-qcifa-cai`, that Ledger and
receiving subaccount zero. No caller supplies a beneficiary. Legacy `transfer`:

| Field | Value |
| --- | --- |
| Source | Backend default account, `from_subaccount = null` |
| Destination owner | CMC `rkp4c-7iaaa-aaaaa-aaaca-cai` |
| Destination subaccount | `0a000000000230120a0101000000000000000000000000000000000000000000` |
| Destination AccountIdentifier | `fa4c0ec911194217d5d4f3ec27f7ac26a7f19e74fbeeba39d469e4f24071b8de` |
| Memo | `1347768404` (CMC top-up) |
| Amount | Observed balance minus observed fee |
| Fee | Current `icrc1_fee` |
| Creation time | Durable unique nanosecond timestamp |

The CMC subaccount contains principal byte length, backend principal bytes and
zero padding; it is **not** receiving subaccount zero. Production uses
`ic-ledger-types`. `python3.11 tools/verify_cmc_route.py` independently checks
CRC32/SHA224 using only the standard library. Player AccountIdentifier remains
`344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`.

Sweep when net amount is at least `max(1_000_000 e8s, 100 × fee)`: small payments
accumulate and the fee is at most 1% of the qualifying net amount. Sweep the
qualifying balance, otherwise retain dust. Deposits after observation wait for
the next sweep. No reserves allocation, treasury account, prices or payouts
are added.

## Durable recovery and limits

A bounded JSON stable cell uses memory ID **3** through the existing manager.
Root schema 7, memories 0/1/2, inputs, seals and artifacts are unchanged. A cell
allocates one existing manager bucket. Local instances start funding paused;
the reviewed mainnet context starts enabled on future activation. Upgrades
retain existing funding pause and pending state.

1. `Idle`: observe actual balance/fee and commit the complete immutable plan.
2. `TransferPending`: persist uncertainty before awaiting the Ledger. Retries
   use the same amount, fee, address, memo and creation time. `TxDuplicate`
   recovers the original block. Persist the accepted block before notifying.
3. `NotifyPending`: `notify_top_up` names that block and the backend itself.
   Processing, transport/decode failures and retryable CMC errors repeat the
   notification without transferring again. Success atomically records net ICP,
   CMC-reported cycles and completion time, then returns Idle.

Thirty-second bounded calls, fenced single-flight leases and the independent
five-minute timer recover lost replies/traps/upgrades. Late responses cannot
replace newer work. Pending notification always precedes another transfer.
Pause prevents the next operation; it cannot cancel an already submitted call.
Game pause is separate. No browser must be open.

Definite first-attempt BadFee/InsufficientFunds permits re-observation next
interval. With prior ambiguity, retain the original plan and halt for review.
Expired transfers also halt: never assume success or replace an uncertain
identity. Future timestamps retain that identity. Terminal CMC errors retain
the block. Refunds retain transfer/refund block and reason, then halt to avoid
a fee loop. There is no generic API to clear a halt or substitute a destination;
exceptional recovery needs reviewed evidence and a separately tested change.

Below **200 billion liquid cycles**, defer inter-canister work. The pinned SDK
liquid API already accounts for reservations; do not subtract them twice. This
call floor is independent of simulation pace. A frozen canister may still need
external rescue funding.

## Gameplay and controller visibility

The existing Index classifier ignores outgoing/self transfers and advances
the original cursor. No scanner/source changes. Incoming CMC refunds follow
existing invalid-command classification; gross incoming totals are historical,
not spendable balances. Physics, prices, input identities, seals and pace stay
unchanged.

Controller-only `controller_funding` returns timestamped **observed** balance
and fee, phase/plan/block, cumulative net ICP converted, CMC-reported cycles,
last completion/refund and bounded last error. `set_funding_paused(bool)` retains
pending work. These are operational counters, not authenticated game scores
or guaranteed live balances. No frontend integration. Disposable fault hooks
are absent from normal Wasm.

## Verification and proposed activation

The existing `tools/verify_s14_local.py` builds a narrow CMC notification-contract
double alongside actual upstream Ledger/Index. The double validates the exact
known Ledger block and deposits actual disposable cycles; refund tests send
real valueless Ledger refunds. It does not model CMC exchange-rate economics
and is never part of production Wasm.

`--test-filter funding_tests:: --funding-prior-wasm <exact-53b219-module>` tests
the exact deployed predecessor and recovery. Full integration retains existing
source/replay/certificate/upgrade checks. See
`checkpoints/B2Z_PRELAUNCH_SELF_FUNDING.md` for reviewed results/frozen hashes.

Future separate authorization must record the then-current module/controllers,
certified world/history, source/pending progress, actual balance/fee and liquid
cycles; rehearse any changed predecessor locally; verify the frozen normal
module; and upgrade the **same backend in place**. Its first scheduled sweep
moves value. Verify the Ledger block, fixed beneficiary, notification, source
continuity and controller counters afterward. No reset, reinstall, frontend
upgrade or controller change. **No live activation step is executed here.**

Minimal references: [Event Horizon funding](https://github.com/aodl/Event_Horizon/blob/main/canisters/event-horizon/src/funding.rs),
[official CMC contract](https://github.com/dfinity/ic/blob/master/rs/nns/cmc/cmc.did),
[principal subaccount convention](https://github.com/dfinity/ic/blob/master/rs/nns/cmc/src/lib.rs).
No Event Horizon application dependency is introduced.
