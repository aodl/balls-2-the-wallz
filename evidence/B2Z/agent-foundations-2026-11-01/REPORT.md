# B2Z agent foundations — 1 November 2026

**Local foundations PASS; browser branding/entry guard deployed; paid pilot BLOCKED.**
Four ordinary funding accounts are ready. No real ICP was transferred or spent;
all four public Ledger balances were zero at 17:02 UTC. Funding alone does not
approve a campaign. The verified arena has **zero neutral cells**: a new account
cannot find the required neutral 3×3 first-spawn patch. A direct join payment would
be retained and rejected. Reopening entry requires a separate rules decision.

## Delivered source and production identities

Branch `feature/b2z-agent-playtesting` contains these coherent local commits:

- `559b3a5`: current B2Z branding; impossible-first-join quote precondition.
- `c2b006f7a2194a0dc9eb398e6870485b12387ac8`: mirror, inspection/forecast tools,
  policies, executor, public accounts and disposable Ledger/Index tests.
- `b3e0fa7`: one operation handler and shared observer for the player/executor broker.
- `d95902b`: trusted browser-bootstrap witness accepted only at broker launch.
- `29663d6`: forecast cache binds the complete publication reference.

Production frontend assets were built from **clean `c2b006f`** and published to the
existing observer. Subsequent broker/document changes do not enter that bundle.
No production backend module or authenticated epoch was changed.

| Item | Verified identity |
|---|---|
| Backend | `s34gv-3qaaa-aaaar-qcifa-cai` |
| Backend Wasm, unchanged | `b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e` |
| Frontend | `s45ab-wiaaa-aaaar-qcifq-cai` |
| New frontend app | `576aa794b615f5af7e0851a8c225f066c794cba9d502fed0a462dac200b643cf` |
| New HTML | `28db163c0d206c9c3b52424d76d5a142e7f361295acfab1158f0aa7f11fba8ce` |
| Observer Wasm, unchanged | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |
| Rust DTR, unchanged | `282d709143dacb4bca769a4d6e72b97fc93ef518` |
| v6 epoch, unchanged (index 3) | `e7905ce5167be6f4a416ca59a73430fbece44b273e3324aa289e8e3699997d07` |

SDK certificate checks reconfirmed the existing controllers and 34-node fiduciary
placement before and after the asset publication. Receiving account, source binding,
Ledger/Index, cursor and paid history were preserved. The observed source cursor
remained 39,711,127. [Installed identities](installed-identities.json) and
[public asset hashes](public-assets.json) record the actual checks. Event Horizon
remains disabled with the independent 60-second Index fallback. MCP discovery and
external-terms opt-in remain inactive; IMCP2 is not a payment execution route.

The matching Rust convenience-quote guard and `get_api_doc` branding are committed
**source-only**, pending separately authorized backend deployment. The currently
installed typed quote can still offer an impossible join. This frontend and the
agent prepare path refuse it. No rule/economic migration was hidden in this fix.

## Working agent interface

```sh
node tools/b2z_agent.mjs observe_game
node tools/b2z_agent.mjs inspect_player --account <64-hex-account>
node tools/b2z_agent.mjs stdio --store .work/agents/mirror
node tools/b2z_local_matches.mjs .work/agents/matches
node tools/b2z_executor.mjs --help
```

The [guide](../../../docs/operations/B2Z_AGENTS.md) describes `inspect_region`,
`inspect_island`, `changes_since`, `evaluate_actions`, `decide` and JSON requests.
The restricted executor broker also serves these read-only operations, allowing
all four policies and transaction checks to share **one** authenticated mirror.
A live read-only broker check served four player views at head **80279** with one
refresh/four application query operations/36,437 verified artifact bytes in 4.39s;
unapproved submission and an invented approval operation were rejected without
provisioning or accessing any signing key. These are application operation counts,
not a complete HTTP-wire or query billing meter. [Broker result](shared-broker.json).

Ownership stays compact. Views identify certificate/root/head/epoch and separate
verified facts, derived islands/frontiers, incomplete history and predictions.
Region inspection supports exact wrapped regions through 128×128 from the mirror.
A production view took 20.44ms after its 3.35s authenticated refresh (36,325 artifact
bytes). Retention loss creates an explicit gap and certified snapshot handoff;
authentic stale responses cannot lower the accepted floor. Own payment receipts
have bounded durable proof archives and are reverified after restart.

Bounded forecasts use the actual pure v6 cursor, purchases and elapsed expiry,
with explicit hypothetical inputs and ordering. The production three-candidate,
one-tick screen completed nine scenario results in **1.535s** (584ms worker,
2,188 work units). Frugal Expander chose **Wait**: buying a ball cost 0.9 ICP and
added no territory or score in this fully owned world over the tested horizon.
All candidates accrued the same canonical 1,024 score units for that tick.
This is a short deterministic scenario result, not a prediction of unknown payments
or a claim of optimal strategy. [Structured examples](examples.json).

Eight frozen policies are implemented: Frugal Expander, Anchor Defender, Attrition
Raider, Island Engineer, Opportunist, Adaptive Allocator, bounded random and passive.
Contexts receive public state and their own strategy history, not other private
plans. The local runner produced **24 player outcomes** in 85.7s / 19,421 JS work
units, using two policy/account rotations and three logical ticks. The mixed-four
case starts with one established fixture player and three entrants; unequal initial
endowments and different selected matchups preclude a policy league-table claim.
No LLM inference was invoked by this scripted screen; Codex/tool charges were not
available. [Reviewed match metrics](local-matches.json).

## Economics, defects and tests

- **D entry/balance concern; B quote defect:** full ownership makes new-player
  admission impossible. Exact-kernel reproduction records `NO_ELIGIBLE_SPAWN`,
  zero amount used and the entire 1 ICP payment retained. Browser/agent guards fix
  preparation; authoritative entry rules were not changed.
- **D capacity concern:** a valid endowed 63-ball player buys the 64th; a different
  dormant player's recovery and a fresh entrant then receive `BALL_CAPACITY`.
  The actual purchase costs 396.9 ICP in that single 63-ball island. This confirms
  admission exclusion, not the cheapest way to establish such a position. No live
  saturation was attempted.
- **D economic hypothesis:** exact prices reproduce 15 ICP for one initial account
  reaching eight balls, versus 4.4 ICP for four fresh two-ball accounts, fees extra.
  Different spawn locations, ownership and hostile interactions prevent treating
  those as equivalent strategic positions. No KYC or balance rule was added.
- **B integration defects corrected:** persisted certificates now verify at their
  explicit recorded time without admitting an aged world as current. Receipt
  reconciliation uses the existing five-minute certificate policy; preparing and
  submitting a new payment still require 30-second freshness. The 100-second local
  receipt wait was unchanged; no missing receipt was inferred from entity counts.

PASS: 61 selected JS checks, followed by 33 current executor/observer checks after
three additional dispatch regressions, 11 current analysis checks after the cache
regression, plus the shared-interface check and targeted
Rust impossible-join quote test. Relevant existing purchase/lifecycle tests include
Rust/JS fixture agreement, retained remainders, revival, exact elapsed expiry,
reflection, corner/seam handling, stale ownership and capacity partial fills.
Naming audit and current documentation links pass.

The explicitly ignored installed case
`agent_playtesting::restricted_executor_ledger_index_rehearsal` **actually executed**
against exact normal `b618…`, upstream valueless ICP Ledger/Index and a disposable
34-node fiduciary setup. All four identities signed independently; each purchased
one cannon/two balls for **1.1001 valueless ICP including fee**. It passed lost-response
ambiguity plus SQLite restart reconciliation, genuine identical-transfer duplicate
handling without a second debit, authoritative receipt/world checks, and reverified
all four archived receipt proofs after mirror restart. Final executor sources were
frozen throughout that execution. [Exact test/source results](results.json).
The later shared-operation/launcher wiring and forecast reference-cache correction
received focused checks; no financial core changed. A genuine live payment-to-browser witness remains Stage 3's bootstrap
requirement, before other players can start.

Net backend balance decline was **150,879,465,042 cycles over 244.591s** during the
local signed-payment window. It mixes simulation, source, publication and action
work; it is neither isolated per-action cost nor gross/mainnet burn. The public
browser reported approximately 0.38T cycles/hour net decline and 3.94T liquid at the
late screenshot, with natural Survival pacing (0.10 ticks/s) and no performance
limit. Liquid observations vary with IC execution reservations. No runway promise
or Normal-mode funding requirement is made. Marginal continuing bot cost remains
unisolated; stopping the runner will not stop already-created entities.

FAIL evidence is preserved unchanged under `.work/b2z-agents/`, with hashes and
precise diagnoses in [results](results.json): missing sealed v5 setup head;
30-second freshness incorrectly applied to existing-transfer reconciliation;
archived-test SDK clock left at wall time; state-only forecast cache returned an
older publication reference (reproduced FAIL, corrected and regression PASS). Narrow browser harness selector/global/
humanized-label mistakes were corrected separately. Authentication, missing-receipt
assertions and deterministic history were retained. No failed case is relabelled
as an environmental PASS. CI for this new branch is **NOT RUN**: remote Git
operations remain user-owned under the supplied `AGENTS.md`. No old v6 CI result
is presented as qualification of these tools.

## Live browser and naming audit

The public title is exactly **Balls 2 the wallZ - B2Z**. Desktop/mobile loaded the
new assets, authenticated the unchanged v6 world, progressed heads **80290→80292**
on one page with no payment call/reload, and rendered 1 cannon/3 balls. Cold startup
reached PLAYING in **18.56 seconds** at the actual 0.10 tick/s funding tier. The new
account's join instructions remained unavailable and copying disabled.
[Browser measurements](browser.json).

[Before desktop](before-desktop.png) · [Before mobile](before-mobile.png) ·
[After desktop](after-desktop.png) · [After mobile](after-mobile.png) ·
[Impossible join guard](after-entry-guard.png).

The case-insensitive audit corrected current UI, metadata, help/docs/specification
wording, README baseline and assertions. It intentionally preserves memo/domain
bytes, stable colour and preference keys, historical identities and immutable
fixture/evidence/branch paths. [Audit summary](naming-counts.json) and
[compatibility identifiers](../../../docs/architecture/LEGACY_IDENTIFIERS.md).

## Funding and campaign boundary

The [public manifest](../../../config/agents/players.public.json) lists all four
principals, default numeric subaccount zero and independently checked funding
accounts. User-authorized unencrypted player identities are stored outside Git
with owner-only permissions. No key material or private identity directory is
included here. Same-user arbitrary code remains outside that file-permission
boundary; these tools are not a hardened general wallet service.

[Provisional policy](../../../config/agents/pilot.proposed.json): 30 minutes,
5 ICP total including fees, 1.25 ICP/player, one cannon/two live balls each,
one unresolved action/player, quantity ≤2, action spacing ≥30s, no automatic
funding and no controller access. The campaign binds the actual rules and epoch.
The journal reserves full amounts/fees and ambiguous liabilities across restarts;
missing game history never authorizes a replacement transfer. A changed quote or
fee blocks signing; rejected game payments still count as spent.

**Not started:** funded autonomous play, attacks on unknown players, live capacity
experiments or backend rule changes. Entry space, explicit campaign approval and
the operator's aftermath choice are still required. The useful next experiment is
a matched local choke-point defence/attrition comparison with admission delays;
the live pilot cannot establish a first cannon under the present entry rule.
