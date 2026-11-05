# B2Z late payoff under delayed admission and public counterplay

## Source and qualification

Published baseline: `10975ea49acf142c369fc9d528e2e351b308f9ab`, with
[exact-commit CI 42084066590](https://github.com/aodl/balls-2-the-wallz/actions/runs/42084066590).
The timestamped baseline observation is preserved separately. This frozen report
records local evidence; remote CI must be checked on the exact published candidate.
Local checks do not stand in for CI, and the production-inventory informational
wrapper remains substantively **BLOCKED**.

Implementation source `6bffc2ceaf11d041ae5e084b567174d2a60eff02` adds one structured
`known_unassessed_schedules` warning: own admission at relative tick 0 plus opponent
response at tick 1 is not evaluated by the current coupled three-scenario family.
The regression retains exactly three scenarios and the existing deterministic
forecast rows. No model, ranking, candidate default, time/work limit, game rule,
DTR, payment executor, signer or live permission changes. Usage documentation makes
this coverage limitation explicit. It is a model-coverage limitation, not a claim
that the prior declared predictions were arithmetically incorrect.

## Bounded experiment

Reuse the already inspected reversed-velocity combined bridge/long-approach state,
seed 41, seat 1. This is a diagnostic, not a new blind holdout or population study.
The exact initial state is
`a3bc85aec61dd3e3a9a50ee6591e5d8e7aba3afa27838b7fe6d8dc88d338ec75`.
The threatened cannon is 2; cannon 3 belongs to the attacker. The two defender
anchors share an account. Ownership and support use the existing island helpers.

Fourteen 32-tick branches use the existing matched runner and exact kernel:
two headings (nat16 57344/40960) × admissions at head 4/5/6 × two response modes,
plus one conservation control per mode. Attacker quotes are frozen at public head 4,
including amount/memo; quantity is a maximum of one. They are not price reservations.
The public-response mode uses the existing `opponentResponse` rule at head 5:
nearest active opposing cannon, toroidal distance then ID, its current public
heading. Quotes and budget checks use that exact observed state. In this fixture
it fires from cannon 1. No private future action is visible to that rule.

The response is one bounded policy, not a best-response oracle or autonomous LLM
adaptation. The attacker budget is 0.75 ICP including fees; the defender budget is
0.25 ICP including fees. Source positions remain strictly ordered: opening 1010,
attacker 1045/1055/1065, response 1050. The response precedes the simultaneous delayed
attack in the canonical order. All payments are synthetic/valueless. No Ledger
update, real signature, controller or mainnet operation occurs.

The scratch input-stream changes retain the existing two-million-work/300-second
batch bounds. Actor costs are derived from every receipt plus fee: this is necessary
because the extra defender payment arrives through the stream rather than the
runner's original `choice` field. No accepted historical evidence is rewritten.
Both accounts' births/deaths reuse the existing canonical-event accounting.
The forecast implementation is not used to choose these retrospective branches;
its 5,000 ms and work limits are unchanged.

## Measured outcomes

Incremental attacker score is versus the same response rule's conservation branch,
with the identical opening and fixed logical horizon. Natural score is therefore
not credited to the follow-up purchase. No score-to-ICP conversion is assumed.

| Own admission delay | No response: 57344 | No response: 40960 | Public response: either angle |
|---|---:|---:|---:|
| 0 ticks | +6.089852 | +6.157572 | +2.655801 |
| 1 tick | +5.781628 | +5.819154 | +5.764548 |
| 2 ticks | +5.473404 | +5.484017 | +5.429822 |

These are exact-kernel 32-tick outcomes, not API predictions of that length.
At assumed Conserve the delays correspond to 0/5/10 seconds; no 60/120-second
admission case, actual mainnet latency or billed cycle cost is measured.

Every follow-up costs **0.4001 synthetic ICP** including fee; each paid branch's
attacker total including the opening is **0.5002 ICP**, versus **0.1001 ICP** for
conservation. The defender response costs **0.1001 ICP**. All 33 local receipts
apply in full, quantity one, with zero remainder/rejection. Across independent
branches the attacker spends 6.2026 and defender 0.7007 synthetic ICP, total 6.9033.
This is not campaign spending. Receipts reconcile complete amounts and fees,
including the source history order, rather than inferring purchases from entities.

The changed angle's small lead without a response shrinks from 0.067720 to 0.037525
to 0.010613 as admission is delayed. The bounded response removes that lead at all
three admissions. Immediate admission performs much worse for attacker score than
admission a tick later in this response mode. This is timing sensitivity in a fixed
fixture, not advice that delaying a wallet transfer guarantees a better outcome.

## Canonical casualty and island explanation

For immediate attack plus response, the newly purchased attacker ball and the
new defender response ball annihilate in slot 8. With delayed admission, the response
instead annihilates the *opening* attacker ball in slot 17, while the later purchased
ball survives. Source/payment keys attribute these births and deaths correctly:
allocated ball IDs swap roles across branches and must not be treated as equivalent.
The initial purchase price of a destroyed ball is not automatically its current
replacement cost. Per-cannon island-pool prices are retained in the summary.

In response mode, immediate admission leaves the threatened island inactive and
five defender cells, despite a surviving friendly ball elsewhere. Delayed admission
leaves that island active and ten defender cells. Attacker islands stay active;
all three cannons remain retained. Thus higher own score and destruction of the
specific defended island are different objectives. A score-focused policy and an
attrition policy need not prefer the same admission outcome. No weighted utility
or policy rewrite is fitted to this one case.

Without the response, angle 57344 removes the last defender ball and leaves two
cells; angle 40960 leaves one defender ball elsewhere and three cells. The threatened
island is inactive in both. The existing island-specific metric correctly avoids
calling a surviving player ball proof that the threatened island survived.

## Coverage consequence and minimal correction

The existing family couples own delay and opposing activity: immediate/no response,
delayed/public response, later/public response. It never combines immediate own
admission with a subsequent response. Extending those timing patterns to this
common diagnostic horizon yields +6.089852/+5.764548/+5.429822 for angle 57344;
the omitted combination yields only +2.655801. This does **not** compare a 32-tick
outcome to a four-tick prediction or falsify a declared prediction. It demonstrates
that three sampled schedules do not bound all plausible counterplay.

Running forecast replies now expose the missing combination as structured
`UNASSESSED` metadata. No fourth simulation is added, no unfinished future is marked
safe, and the new warning does not grant or broaden spending authority. Other
headings, opponent inputs, delays and futures remain unknown. The next useful
local comparison is allocating the same fixed compute budget between candidate
breadth and independent immediate-counterplay coverage, with explicit omissions;
adding every cross-product case or increasing limits is not justified here.

## Verification and reproduction

- **PASS:** all fourteen branches, 112,474 kernel work, 17.728 seconds combined.
- **PASS:** independent native/reference replay of **448 segments**, exact state,
  event and score equality; recorded public-state/quote checks, monotonic input
  positions, final-state and receipt equality. 224,948 combined JS/native work,
  20.976 seconds. Same two-million-work/300-second bound; frozen native binary
  SHA-256 `baf2578c1388ade63abb722be761aa8860b549c7331d33bf40f389e23982c795`.
- **PASS:** original three immediate/no-response outcomes reproduce the archived
  final-state hashes, scores and receipts exactly.
- **PASS:** 52 focused JS tests, including the explicit omitted-schedule flag and
  unchanged three-scenario count; source inventory/168 JS syntax checks.
- **UNASSESSED:** broader positions, response policies, long admissions, actual
  public-network source/presentation delays, billed cycles and live performance.

DTR remains `282d709143dacb4bca769a4d6e72b97fc93ef518`. No production backend/frontend
change, real ICP payment, funding, cycle transfer, campaign restart, controller or
identity operation occurred. No authoritative gameplay bug was demonstrated.

`reproduction.py.txt` regenerates the scratch input driver from the existing runner;
`native-replay.mjs.txt` performs independent replay. Restore their `.work/` filenames
before execution. Exact inputs, receipts, loss attribution and fractions are in
compressed per-mode records and `summary.json`; artifact/source hashes are in
`artifacts.json`. The scripts are archival text, not another maintained framework.
