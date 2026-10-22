# B2Z prelaunch self-funding — local preparation

Date: 2026-10-22. Branch: `checkpoint/b2z-prelaunch-self-funding`.

**NOT DEPLOYED. Mainnet actions: NONE. Real ICP transfers: NONE. Remote Git operations: NONE.**
The existing backend/frontend, controllers and live paid world are untouched.
The 32×32 torus and accepted cannon heading remain staged. No DTR runtime change
or dependency override is involved.

## Frozen implementation

Final clean implementation commit: `642d45e8fc461450fb877e20ed2cf61be36d7ac5`.
Normal Wasm SHA-256: `55ccda3d024ea5ba9cfd7cc7b5e61eb5d55c7864ce7843ef6bf462fc018aeea3`
(2,417,843 bytes). Frozen artifacts: `.work/treasury/release-clippy-final/`, with
clean source/tree, pinned dependencies, generated Candid and explicit export
inventory in `manifest.json`. The subsequent integration build has the same
normal module hash in the final funding run. Test/fault exports are absent
from normal Wasm.

Test-hooks Wasm: `a15cced27d68fdb6a0a195444309875a3aab3e05f7353418d30f9f3da74f0c9e`.
Disposable CMC double: `d336165b2f81ca4e587ed5e749dbda69717c941c33c3c1086f667f3d706f7cb5`.
Neither is a production candidate. Generated constructor artifacts are local
examples, **not** an argument to reset or initialize the paid live game.

DTR Rust remains `1f47c1a0a104875bd13475d561b8d5aa10770d99`; packaged JS is
`@dtr/timeline-runtime@0.12.0`, vendor SHA-256
`933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`.
There is no sibling override or pin to an unpublished transition.

The full regression gate passed at `a6f9d4de78c7b29bf13f108ca0b3711b1ef99848`
(normal `c0ab51d7b76046f00bb0bcbbff22fc855ca18004c624c213b654c776be22ddde`).
Final review caught a Clippy needless-borrow error; `642d45e` removes only the
borrow in transfer argument encoding. It changes compiled Wasm, so the corrected
clean module was frozen again and passed all **seven funding tests in 206.40
seconds**, 22 host/Candid tests, strict export inventory and Clippy with warnings
denied. The 25 existing regression tests, JS/Python source and native gates are
qualified at that one-borrow precursor; their source/game/frontend code is
unchanged. The final module hashes above supersede the retained precursor.

## Worker and fixed route

One B2Z module uses existing stable memory infrastructure, separate memory 3,
a five-minute timer, liquid call safety floor, fenced single-flight lease and
`Idle → TransferPending → NotifyPending` states. No DTR/root/history rewrite.
It reads actual Ledger balance/fee, retains the original transfer identity
across ambiguous replies, records accepted block before notifying, and retries
that block only. Successful completion updates operational counters atomically.
Definitive terminal errors/refunds and expired ambiguous transfers halt with
original diagnostic evidence; controller pause does not clear that halt.

Official legacy Ledger transfer memo: **1347768404**. CMC owner:
`rkp4c-7iaaa-aaaaa-aaaca-cai`. Its backend-principal subaccount is
`0a000000000230120a0101000000000000000000000000000000000000000000`;
independently verified AccountIdentifier:
`fa4c0ec911194217d5d4f3ec27f7ac26a7f19e74fbeeba39d469e4f24071b8de`.
`notify_top_up` targets backend `s34gv-3qaaa-aaaar-qcifa-cai` only.
This is separate from player default receiving account
`344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`.

Sweep net amounts at least `max(0.01 ICP, 100 × current fee)`; otherwise
accumulate dust. Defer below 200 billion liquid cycles, without subtracting
reservations twice. Funding cannot guarantee revival of a frozen canister.
Controller-only status labels balances as timestamped observations and cycles
as CMC-reported credits. No frontend or payout/rewards feature is added.
[Full policy/recovery and proposed activation](../docs/operations/PRELAUNCH_SELF_FUNDING.md).

## Local verification

- Source gate PASS: 1,349 JS and 138 Python tests, grammar/naming/fixtures and
  source/export inventory; no new test framework.
- Native gate PASS: workspace/portable tests, exact public game/host vectors,
  formatting and Clippy. Host tests: 22 PASS; normal Candid matches. Host and
  disposable CMC fixture Clippy PASS with warnings denied.
- Focused upstream Ledger/Index/CMC suite: seven PASS, 827.32 wall seconds.
  It uses genuine `icrc1_transfer` bytes, index history and game admission;
  the CMC contract double validates the exact Ledger payment and deposits
  actual disposable cycles. It is not a live CMC exchange-rate test.
- Final standard installed-IC gate PASS: 25 existing tests plus seven funding
  cases, eight unchanged explicitly ignored historical predecessor probes.
  Real browser receipts/reconnect/upgrade and staged torus scene PASS. Exact
  JavaScript replay matches 77 captured publications and actual seals/inputs.
  Precursor funding rerun: seven PASS in 206.02 wall seconds. No assertions/timeouts,
  certificate rules, UI or pace were changed to obtain the passing rerun.

The seven cases cover join/one assignment/real outbound transfer, ignored
outgoing history with cursor advancement, repeated maintenance, all four lost
reply/upgrade boundaries, Ledger duplicate recovery, Processing/Other retry,
funding pause/resume, deposits while pending, changed actual Ledger fees
(10,000 and 20,000 e8s), dust and accumulated small payments, invalid-command
outcomes, low liquid-cycle deferral and local rescue, real valueless refund,
terminal notification errors and an expired uncertain accepted transfer.
Unit tests additionally distinguish definitive fee/balance rejection from
prior ambiguity and retain future/expired identities.

The exact recorded deployed predecessor
`53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec`
is installed locally, accepts a 1 ICP join, and upgrades in place while world,
publication and source cursor remain unchanged. Pending funding phases also
survive upgrades byte-for-byte. Gameplay resumes afterward. Fees, amounts,
accounts and original transaction IDs are read from the actual Ledger/Index.

An ordinary 1 ICP deposit yields a 99,990,000 e8s CMC transfer plus 10,000 e8s
fee; the mock credits 1 trillion disposable cycles once. A 2,000,000 e8s deposit
arriving during recovery remains available for the next sweep. No transaction
is reassigned. Outgoing transfers are ignored by the unchanged source
classifier. Incoming CMC refunds retain its existing invalid-command policy;
gross incoming `received_e8s` is deliberately not a spendable-balance counter.

## Small maintenance measurement

PocketIC virtual time, not mainnet wall time. Three five-minute checks with
four seconds of delivery settlement per check; both paired windows have three
Index calls and zero game segments:

| Funding | Window cycles |
| --- | ---: |
| Paused | 210,320,571 |
| Enabled, zero ICP | 252,225,742 |

Increment: 41,905,171 cycles total, **approximately 13,968,390 per maintenance check**.
Includes the two Ledger observation calls and stable bookkeeping; it is not a
mainnet idle-burn forecast or a benchmark campaign. Separate stable-cell
allocation uses one existing manager bucket (128 pages / 8 MiB). Exact prior
upgrade total memory was 32,008,810 → 40,572,817 bytes (+8,564,007), including
that stable bucket plus module/heap differences. The final windows each lasted 912.0 virtual seconds.

## Preservation and activation boundary

1 ICP join, 0.1 ICP active-count-squared ball base, 0.0001 ICP MOVE and fees
separate remain unchanged. Prefix-free/legacy memos, default receiving account,
source identity/cursor, sealed history, rules/schema/configuration, physics,
scores, shared pace and empty-arena sleep are unchanged. No frontend files or
assets are changed/deployed. Source/canonical replay remains authoritative.

A separately authorized activation would first record then-current module,
controllers, game/history/source/pending state, actual balance/fee and liquid
cycles; rehearse any changed predecessor; verify this frozen normal module;
then upgrade the same backend in place. Its first scheduled maintenance would
move real value. No reinstall/reset or frontend/controller change is needed.
No such activation occurs in this task.

[Reviewed verification](../evidence/B2Z/treasury/verification.json) and
[frozen manifest](../evidence/B2Z/treasury/release-manifest.json) record exact
artifacts, dependencies and local checks. The first full attempt remains
**FAIL**: its browser receipt list timed out, staged scene recorded five stalls
(0.407 verified ticks/s against 0.5 target), then the gate reached its 900-second
limit. Heavy unrelated host compilation was observed during that attempt;
causation is not proven. The unchanged fresh full gate passed all cases. This
retains a load-sensitive browser-test limitation, rather than rewriting the
failed evidence as green.

Raw results remain under `.work/treasury/`. Earlier development compilation
and old-Candid comparison failures are retained there with the passing fixes;
prior project/CI failure evidence is unchanged. New remote CI: **NOT_RUN** until
the user publishes this branch. No CI is triggered by this task.
