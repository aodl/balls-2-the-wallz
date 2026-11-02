# B2Z agents: inspection, local experiments and restricted payments

The current game is **Balls 2 the wallZ (B2Z)**. These tools reuse its v6 kernel,
shared memo/quote code and DTR/IC certificate verification. They add no canister,
wallet protocol, login, backend controller capability or authenticated game epoch.

## Start with read-only inspection

Use Node >=22.16 with the committed `package-lock.json` (`npm ci`).

```sh
node tools/b2z_agent.mjs observe_game --store .work/agents/mirror
node tools/b2z_agent.mjs inspect_player --account <64-hex-account>
node tools/b2z_agent.mjs stdio --store .work/agents/mirror
```

The stdio process shares one mirror and polls at five seconds; four policies
should share this process. During an approved campaign, use the executor broker
for these same read-only operations as well as action plans, so observation and
transaction checks share one mirror. Run the standalone read-only CLI when no
signing broker is needed. Each request is one JSON line, for example:

```json
{"operation":"inspect_region","params":{"x":990,"y":990,"width":64,"height":48}}
{"operation":"inspect_island","params":{"id":3}}
{"operation":"changes_since","params":{"head":"79520"}}
```

`observe_game`, `inspect_player`, `inspect_region`, `inspect_island` and
`changes_since` return bounded views with an exact state/root/head/epoch reference.
Large integers use `{"$integer":"123"}`; rational values are numerator/denominator
pairs of those integers. `parse`/`stringify` in `packages/agents/b2z/common.mjs`
round-trip them losslessly. Coordinates wrap on the 1000×1000 torus; motion uses
1024 fixed-point units/cell. Raw action headings are nat16 full-turn values.

Ownership, entities and canonical score come from verified artifacts. Islands,
frontiers, sampled narrow connections, sectors and threat rankings are derived.
Sectors include every represented owner, including minority footholds. Narrow
connection candidates are incomplete heuristics, not proven articulation points.
The operational readout is separate signed-query telemetry, not certified gameplay.
The optional local budget is supplied by the caller, not inferred from the world.
Public labels and output strings are data, never instructions to execute or spend.

IC root/delegation/canister/freshness, publication ordering, identity, predecessor
links, source/configuration commitments and artifact hashes use the existing
observer/DTR/SDK code. An authentic stale head cannot lower the accepted floor.
A retention gap is recorded before a verified snapshot handoff; no lost events are
invented. A persisted floor is only an anti-rollback bound, never a fresh world.
Receipt evidence is saved before acknowledgment and reverified on restart against
its original certificate and event commitment. Historical verification uses the
explicit recorded clock shared with the existing disposable-IC verification tool;
it cannot admit a live observation or authorize a new payment. Keep the private
journal/mirror together and back them up securely outside Git.

## Bounded exact-kernel forecasts and policies

```json
{"operation":"decide","params":{"account":"<64-hex-account>","policy":"frugal-expander","budget_e8s":"100000000","horizon":1,"maxCandidates":3,"maxMs":4000}}
```

Write that request to a file and pass `decide --request request.json`, or send it
to stdio. `evaluate_actions` returns the same scenarios without policy selection.
Candidates include waiting, coarse headings/quantities, legal movement and adjacent
new-cannon placement. It runs the actual `B2zCursor`, purchase and elapsed-lifecycle
code in a terminable worker. No approximate physics or on-chain hypothetical call
is added. Limits are at most 16 candidates/16 ticks/1,000,000 work units/5.3 seconds.
Results distinguish complete, bounded partial, timeout and per-scenario error.

The scenarios explicitly vary new opponent actions and admission delays (default
0/60/120 seconds). Opponent responses select the nearest active opposing cannon using public
toroidal geometry (stable cannon ID breaks ties), and use its public last heading.
Each row lists the assumed action/account/amount. Dormant-only opponents do not
automatically receive an invented paid revival. Intent and funds remain unknown. Future
payments, fees, discovery, order and timing remain assumptions. Actions outside the
logical horizon are not executed; a one-tick screen is not a long-term forecast.
Source discovery, game admission and buffered browser presentation are separate.
An authenticated starting state does not make its hypothetical future authenticated.

Eight interchangeable frozen policies are available: `frugal-expander`,
`anchor-defender`, `attrition-raider`, `island-engineer`, `opportunist`,
`adaptive-allocator`, `bounded-random` and `passive`. Adaptive history is the player's
own observed rewards. The runner supplies no other player's private plan. Policies
have no signer/controller imports. No LLM inference is needed for the scripted
baselines; an LLM can consume the same observations/forecasts at decision points.

```sh
node tools/b2z_local_matches.mjs .work/agents/matches
node --test tests/js/b2z-agent-*.test.mjs
```

Local matches use fixed synthetic fixture endowments, two account/role rotations,
three logical ticks and a fee-inclusive incremental 0.25 ICP budget per player.
The runner now defaults to current rules 7; prior rules-6 result archives remain
unchanged. The four-player setup uses the real pure purchase kernel. Metrics use the canonical
area-time score delta, never thirty wall minutes at differing funding tiers.
Zero-spend efficiency is undefined, not infinite. JS work units are not billed
cycles. This bounded sample tests hypotheses; it does not establish a winning
strategy or full balance qualification. Installed Ledger/source acceptance is a
separate explicitly ignored Rust integration case, run with valueless fixtures.

## Four ordinary accounts and campaign approval

See [public funding manifest](../../config/agents/players.public.json) and
[proposed pilot limits](../../config/agents/pilot.proposed.json).
Each alias has a distinct public principal and default numeric subaccount zero.
Official dfx account derivation independently matches SHA-224 plus CRC32. An
AccountIdentifier is ownership authority; a declared principal is not proof of
control and an arbitrary historical account cannot be inverted into a principal.

The four new player keys were created by supported dfx identity tooling with secure
entropy. They are unencrypted at the user's explicit request, stored outside the
checkout with owner-only directories and read-only owner key files. The tools never
read/export keys. No player is a controller. Key paths/material are absent from
public manifests, Git and evidence. File permissions separate ordinary users, not
arbitrary programs running as the same Unix user. A stronger OS signing boundary
would be needed before exposing execution to untrusted code or larger funds.

Funding about 1.25 ICP per player (5 ICP total) is a suggestion, not approval to
spend. Rules 7 is now deployed in epoch index 4. First joins use the furthest safe
3×3 patch from retained cannons regardless of territory colour. Cannons, live
balls and island connectivity remain protected. Historical rules 6 retain their
neutral-only policy. The proposed campaign binds the exact deployed rules,
configuration and epoch; any new epoch requires a newly approved campaign.
The public 1.1 ICP quote for a new cannon/two balls was independently verified
against authenticated state. Final placement, legality and fill are decided when
the payment is processed; rejected payments and excess remain retained.
[Deployed entry rule and preservation evidence](../../evidence/B2Z/entry-rules-7-mainnet-release/REPORT.md).

## Restricted executor

`tools/b2z_executor.mjs --help` documents the separate process. Its payment JSON interface
accepts only `prepare_action`, `submit_action`, `action_status`, `reconcile` and
`emergency_stop`. Policy inputs select typed v6 actions, never arbitrary calls.
`Fire {cannon,angle,quantity}`, `New {angle,quantity,cell}` and `Move {cannon,cell}`
reuse the exact memo codec; quantity is a maximum. No decimal rounding replaces an
unrepresentable nat16 heading.

A proposal binds the payer, current certified rules/configuration/schema/root,
recipient, official Ledger, exact memo, integer amount/fee, immutable creation time,
reservation and 30-second expiry. There is no price reservation or refund. The
executor signs only an immutable plan ID under a separately supplied approved
campaign hash. It cannot change destination/amount/memo at submission. Mainnet
signing is disabled by default; no approval operation exists in the policy protocol.
A narrow smoke test can set `approved_player_aliases` to the single authorized
player while retaining the public four-player catalog. Other aliases are rejected
before preparation. For the explicitly authorized owner-only plaintext player
identities, the trusted launcher may pass `--ack-player-plaintext-mainnet` together
with mainnet enablement. It acknowledges only dfx's documented warning in each
player command; inherited warnings/passphrases are discarded. It does not secure
the plaintext key or expose it to policy code.

SQLite WAL/FULL journals reserve full transfer value plus fees before dispatch.
One unresolved action per player persists across restarts. An ambiguous submission
keeps the original transaction identity and liability; bounded official Index
reconciliation matches payer, recipient, amount, fee, memo and creation timestamp.
No automatic fresh-timestamp retry exists. Missing game receipts are unavailable
outcomes, never proof a transfer failed. Rejected game commands and retained
remainders count as spent. A real Ledger duplicate is recognized without a second
debit. Do not use IMCP2 to bypass its prohibition on Ledger updates/payments.

The provisional pilot is four identities, 30 minutes, 5 ICP aggregate including
fees, 1.25 ICP per player, 1.1001 ICP maximum per action including fee, one cannon
and two live balls per player, quantity at most two, one unresolved action per
player, at least 30 seconds between actions and no automated top-ups. Expiry,
emergency stop and all caps are executable and persistent. The first expander
payment must reach Ledger acceptance, source reconciliation, certified receipt,
world change and observed browser presentation before other accounts may start.
The trusted host confirmation hook is deliberately absent from policy JSON. After
actually observing the first browser presentation, the trusted launcher can restart
the broker with `--bootstrap-evidence` pointing to its recorded witness (plan ID,
current root/head, rendered logical time, visible cannon IDs and zero extra
navigations). The journal and witness must survive the restart. A missing or
unverifiable witness keeps the other players blocked; never infer it from counts.

The pilot must stop deliberately adversarial activity if an unknown player enters
the interaction area. The entity proximity guard is conservative convenience,
not a proof that future public ball trajectories cannot interact elsewhere.
Stopping the agents does not remove their entities or stop simulation costs.
Before live play the operator must explicitly approve the budget/campaign and
choose either leaving entities running under ordinary conservation, or separately
authorizing a gameplay-only pause at campaign end. A paused game still has source,
treasury and storage maintenance costs. No admin-delete-player mechanism is added.

## Action options and bounded pilot

`action_options` is a local agent operation, not a new on-chain method. It gives
a bounded candidate list, exact memo/cost/fee data, selected-cannon information
and rejection reasons for budget, population limits and proximity to players
outside a supplied consent list. All game facts come from its one authenticated
provenance reference; campaign budgets/consent remain separately sourced local
constraints. `cannon_id` can select any owned cannon; the default is explicit.

```json
{"operation":"action_options","params":{"account":"<64-hex-account>","budget_e8s":"10000000","cannon_id":5,"limits":{"max_cannons_per_player":1,"max_balls_per_player":2,"max_quantity":2}}}
```

`tools/b2z_pilot.mjs --help` describes the small common runner. It requires an
operator approval file matching the frozen campaign hash, shares one verified
mirror across four public-state policies, and uses the existing restricted
executor/signing process boundary. Per-player fixed ceilings can be recorded in
`per_player_max_e8s_by_alias`; incoming funds never increase those limits. Fees,
ambiguous transfers and retained remainders count against the limits.

Startup admits new accounts sequentially. The configured bootstrap player's
receipt, certified state and actual browser presentation must agree before the
next payer starts. Each subsequent paid action is journaled, reconciled and
observed; a failed or ambiguous outcome never causes a fresh-timestamp retry.
The runner logs exact canonical score intervals, bounded scenario forecasts,
policy/version and measured outcomes. Each policy sees only public state and
its own history. Waiting is an ordinary choice.

A local `HOLD` file in the output directory pauses new policy activity for
engineering work; `STOP` requests persistent termination. A trusted `RESTART` marker
ends only the runner so the same journal, frozen limits and original expiry can
be reopened; it never clears an emergency stop or grants more funds/time. The immutable approval expiry and
existing emergency-stop journal survive restarts. Stopping this process does not
stop the game entities. Authoritative game/economic changes are separate from
these local planning and signer tools.


### Existing Rust kernel for local forecasts

At larger live populations the independent JS interpreter may exhaust the wall
bound before completing useful alternatives. Build the existing conformance
executable, then optionally select its bounded `segment-json` route:

```sh
cargo build --manifest-path native/Cargo.toml --locked --release -p native-conformance-v4
node tools/test_b2z_native_forecast.mjs native/target/release/native-conformance-v4
B2Z_AGENT_NATIVE="$PWD/native/target/release/native-conformance-v4" node tools/b2z_agent.mjs --help
```

A trusted campaign launcher freezes that executable and sets
`B2Z_AGENT_NATIVE_SHA256` to its SHA-256. A mismatch fails closed; the forecast
cache also binds that identity. Neither variable is accepted from a player policy.
The native route runs the same authoritative `Cursor`, explicit canonical inputs,
seal context and elapsed-time facts. It returns no state on an incomplete segment;
the worker still enforces the total wall/work/candidate bounds. There is no new
simulation engine, hosted service or backend change. Exact state/event/score
comparisons cover existing fixtures and independent JS forecasts.

Record a distinct `B2Z_PILOT_PHASE` when changing the planning engine or bounds.
Prior episodes and financial accounting remain intact; adaptive rewards are
computed from exact canonical score deltas per logical tick. Shortlists preserve
action-type diversity before adding further variants. JSON amounts must be exact
integer strings/tagged integers or safe integer numbers; fractional/unsafe numbers
are rejected.

### Adjacent friendly cannon regression

`node --test tests/js/adjacent-cannons.test.mjs` and
`cargo test --manifest-path native/Cargo.toml --locked -p b2z-native --test adjacent`
exercise two touching friendly cannon cells, firing in both directions and
simultaneously, including toroidal seams. Commands use valueless canonical
payments and sequential shared-island prices. Existing launch exemptions allow a
reflected ball to leave its original cell; they do not allow passage through the
other cannon. These are local kernel/recovery comparisons, not claims of an
installed Ledger or paid mainnet test.


### Exact custom quotes without a payment plan

`quote_action` derives the price/memo of any typed action from the same mirror;
it creates no signer plan or budget reservation. Supply `expected_root` from a
prior inspection to fail explicitly if observation has advanced. The destination
is the authenticated source descriptor, never a caller override. An optional fee
is explicitly caller-supplied; without one the full fee-inclusive cost is unknown.
The restricted executor independently fetches/rechecks the actual Ledger fee.

```json
{"operation":"quote_action","params":{"account":"<64-hex-account>","action":{"Fire":{"cannon":5,"angle":65535,"quantity":1}},"expected_root":"<root-from-inspection>","fee_e8s":"10000"}}
```


### Public browser witness

`tools/b2z_pilot_browser.py --directory <private-pilot-directory>/browser` observes
one public page and records actual receipt rows, played logical time and selected
cannon presentation. It never signs or sends a transfer. The runner must see its
ready marker before submitting. Successful Move receipts display **Accepted**;
purchase rows display applied/partial quantities. Both must match the exact block,
account, reason and receipt kind. Move checks also centre the displayed cannon
through the product control and compare its presentation cell with the canonical
receipt's destination. No reload/resync is used to make a witness pass.

A browser restart starts a new evidence window. It cannot retroactively establish
no-refresh presentation for earlier actions. Preserve any missing witness as FAIL
or unavailable even if the authenticated financial receipt is applied. A trusted
`--skip-existing-request` excludes that prior request after such a restart;
subsequent actions still require a new ready marker and full assertions. `HOLD`
is checked before each proposal and again immediately before submission; a
transfer already submitted must still be reconciled with its original identity.


During the approved test-only campaign, forecasts name opposing lost balls and
their public owners. `consentEvaluation` excludes a candidate that predicts an
additional outside-player loss relative to Wait in the same scenario; incomplete
comparisons also exclude the candidate. This is a bounded prediction safeguard,
not assurance about all unknown future payments. The existing proximity check
still runs at preparation and submission. Ordinary public trajectories can
interact beyond this forecast horizon.

The browser selects an owned cannon through the visible Fire control before
publishing its ready marker for Fire/Move. The legacy selector is hidden in New
mode; trying to select it there is a harness error, not a failed game move. A
failed witness remains FAIL even when its payment is authentically applied.


### Policy version 2: marginal decisions and heading coverage

`b2z-policies-2` compares each action's additional score, territory and survival
with Wait under the identical complete scenario and logical horizon. An action
whose admission lies beyond the horizon is **unassessed**, not a completed
purchase with zero benefit. Decisions expose `forecast_coverage`; a result based
only on immediate admission does not establish robustness to long Index delays.
Fee-inclusive cost is used when supplied. Ranks remain heuristic, not money.

The unchanged v1 ranking remains selectable through `policy_version:
"b2z-policies-1"` in `decide`, for holdout comparisons on the same candidate set.
A policy phase change is recorded before restarting the live runner; financial
limits/expiry/journal never reset. Past v1 episodes remain unchanged.

`action_options`, `evaluate_actions` and `decide` accept `heading_offset`; their
bounded shortlist can rotate through all eight exact cardinal/diagonal headings
(and retain an existing non-cardinal heading). `cannon_id` selects a specific
owned cannon. A declaration owning no cannons cannot turn a selected enemy cannon
into a new-cannon purchase silently: explicit selection fails `NOT_OWNER`.

The pilot uses at most five candidates, eight logical ticks, 60,000 work units and
the same five-second native planning bound. This allows a second firing alternative
without removing movement from the shortlist. Each player's heading cursor and
adaptive reward history remain separate. A timeout or incomplete consent comparison
keeps the affected alternative unavailable; it never grants more processing time
or spending authority.


### Bounded combat evidence

The pilot archives significant combat/lifecycle/entity events with their original
certificate, authenticated predecessor links and complete committed events artifact.
It also saves the compact canonical final state and verifies its committed hash.
Proof construction is shared with the existing durable payment-receipt archive;
there is no second certificate verifier or new on-chain query method.

Recording is bounded to 1,024 significant publications and 64 MiB per pilot.
Exhausting that limit stops the runner safely; it cannot spend beyond the existing
campaign limits. Ordinary motion and cell-by-cell captures are not a permanent
archive. Introduction of recording, missed heads and retention gaps are explicitly
logged. Earlier expired combat cannot be reconstructed from entity counts.
Phase changes preserve prior adaptive histories/baselines in the private episode
journal before resetting the comparison phase. Player policies still receive only
their own history and public observations.


A verified publication can outlive its separately fetched retained artifact. The
shared agent observer retries only the host's exact retired-publication response
from the artifact transport, at most three attempts. Each retry obtains a fresh
certificate and uses the existing authenticated snapshot handoff. The accepted
head never moves backwards; unavailable intervening history remains explicit.
Bad certificates, same-height conflicts, wrong context, broken predecessor links
and artifact hash failures are not classified as this availability condition.
Persistent retirement still fails safely after the bounded attempts. Diagnostics
retain the warning after recovery; it clears from current status only after the
verified handoff succeeds. No reload, payment retry or made-up receipt is involved.


### Idle and paused forecast semantics

A complete forecast reports both `logical_ticks_completed` and the assumed
`elapsed_window_ns`, plus idle slots. When both candidates progress normally, v2
compares matching logical horizons. When an otherwise idle world is revived, the
comparison is explicitly `elapsed-window-with-idle`: Wait earns no logical ticks,
while paid revival restarts physics within the same assumed elapsed window.
The different logical tick counts remain visible. Do not use this planning
comparison as an equal-logical-tick strategy league result.

A zero funding pace, disabled gameplay or closed admission yields `status:
"paused"`, zero simulated work and no invented progressing/admitted outcome.
The default policies choose Wait. A future resume is not silently assumed; expiry
maintenance and its authenticated deadlines remain separate from physics pacing.


### Passive observation cadence

Passive shared-observer refreshes use five seconds normally, ten seconds at
Survival pace and fifteen seconds at Lifeline/zero pace. The operational cache
continues its separate fifteen-second refresh. This reduces duplicate observation
queries when publications are slow; it is not a billed-cycle savings claim.

`refresh()` remains the urgent path used before payment preparation/submission and
during receipt reconciliation. Passive calls explicitly use `refresh({idle:true})`;
an outstanding submitted payment also keeps the pilot loop urgent. Certificate
freshness limits, artifact verification and the accepted floor do not change.
A controlled genuine-certificate test made four passive observation calls instead
of twelve over sixty seconds at Lifeline pace; an urgent request still bypassed
the passive interval. Cached replies never invent a newer certificate timestamp.


Operational sample time/age is now explicit in every operation's provenance,
separate from certificate age. A funding mode may change while the gameplay head
stays fixed. The pilot records operational transitions with their observed time,
public mode/admission/idle/performance values and separately sourced liquid balance.
Those records are not certified gameplay and do not reconstruct earlier missing
mode transitions. No additional on-chain query is made for this logging.


Pilot startup monitoring uses the same five-minute certificate window as ordinary
verified observation/reconciliation. A paused game may present a certificate older
than thirty seconds without requiring a paid action. Payment preparation and
submission still enforce their unchanged thirty-second freshness limit. A genuine
certificate regression verifies that a sixty-second-old snapshot can be monitored
but cannot pass the default financial check. Monitoring cannot extend an approval
or bypass closed gameplay admission.

### Focused post-pilot corrections (2 November 2026)

The overnight campaign is expired and stopped. These tools do not extend its
approval, spend remaining wallet funds, or authorise another campaign.

Forecast metrics version `b2z-forecast-metrics-2` audits canonical cannon/ball
births, purchase completion receipts and destruction pairs, including a ball
purchased and destroyed in the same horizon. Each birth retains its funding
account, exact synthetic payment payload/position, item ordinal and event
slot/time/sequence. Deaths retain the canonical pair, positions and time. The
final live population must reconcile exactly with births and deaths; otherwise
the forecast fails. Kernel rules, DTR and payment formats are unchanged.

A global hypothetical ball ID is not a counterfactual identity. Comparable births
require identical input bytes, admission slot, ordinal and birth state (excluding
the separately allocated ID). Natural-loss exceptions also require identical
canonical death time, positions and paired entity origins. The campaign consent
screen excludes a paid candidate if lifecycle attribution or any declared scenario
is incomplete, the action was not admitted inside the horizon, the matched Wait
horizon differs, or a new outside-player casualty cannot be excluded. Wait remains
available. This bounded screen and the existing proximity guard cannot prove safety
against all unknown future opponent inputs.

Policies version `b2z-policies-3` retains all eight policy types. Versions 1 and 2
remain selectable holdouts. Ranking is marginal against the matching Wait; the
`robustness` field explicitly reports unassessed delays. Eight ticks at Conserve
cover forty assumed seconds: 60/120-second admission is unassessed, not a robust
success. Increasing the wait timeout does not evaluate those actions.

Adaptive allocation accepts only complete matched-Wait reward records with equal
initial state, fixed opponent input stream, logical horizon and spending ceiling.
Its reward is incremental canonical score per logical tick. Unmatched live score
changes remain descriptive observations and receive no policy credit. This removes
passive territory accrual/opponent-action confounding; it is not reinforcement
learning or a claim of causal learning from the completed live campaign.

Run the bounded paired experiment with the existing native forecasting wrapper:

```sh
B2Z_AGENT_NATIVE=native/target/release/native-conformance-v4 node tools/b2z_matched_strategies.mjs
node --test --test-concurrency=1 tests/js/forecast-losses.test.mjs tests/js/b2z-agent-analysis.test.mjs tests/js/b2z-agent-executor.test.mjs
node tools/test_b2z_native_forecast.mjs native/target/release/native-conformance-v4
```

The paired experiment rotates policies between two existing player positions in
two fixtures. Each candidate and its Wait control start from identical bytes,
receive the same sealed opponent inputs, use eight logical ticks and the same
fee-inclusive 0.25 ICP ceiling. Natural Wait score and incremental candidate score
are separate. Forced-Fire rows are explicitly candidate diagnostics, not a ninth
policy. Small selected trials do not establish a statistical winner.

### Player proposals and the trusted signing boundary

`tools/b2z_executor.mjs` without `--player` is a **trusted orchestrator interface**.
Never connect an independent untrusted LLM session to its multi-player stdio.
The trusted launcher may supply `--player b2z-agent-expander` (or another approved
alias), exposing only that player's `prepare_action` and own `action_status`.
It rejects submission, reconciliation, stop, arbitrary fields and cross-player
requests; scoped mode cannot enable mainnet signing. The exported
`playerProposalInterface(executor, alias)` supplies the same proposal-only
capability to a trusted broker.

The broker binds the caller to its channel outside request JSON. Only trusted
code can invoke `submit_player_proposal(caller, planId, campaignId)`, which checks
the plan's player before using the existing immutable-plan executor. The caller
argument must never come from an untrusted `player` field. Destination, memo,
fee, budget reservations, approval/expiry checks and ambiguous-transfer journal
remain enforced by the existing executor. Proposal access is not spending consent.

These are application capability boundaries, not an OS sandbox. Independent LLM
processes must not have access to the trusted endpoint, signing environment or
private journal. A prompt alone cannot restrict a process with unrestricted wallet
or shell access. No keys are exported or identities changed by this interface.

### Conditional controlled-population planning and bridge defence

`consentEvaluation(evaluation, accounts, {snapshot, campaignApproved})` supports a
planning-only conditional shortlist when a trusted caller supplies an existing
valid campaign approval and the identical authenticated head/root. Every player,
cannon and ball in that snapshot must belong to the approved population. Default
behaviour remains strict; the expired pilot runner is unchanged. Independent LLM
sessions cannot confer approval by setting a JSON field on the trusted signer.

Under these prerequisites an evaluated immediate-admission benefit may be ranked
without treating the unadmitted 60/120-second rows as evaluated successes. Every
row must still finish, reconcile casualties and match Wait, and at least one
candidate admission must actually be evaluated. The result explicitly labels
conditional eligibility and unevaluated delays; it does not assert long-latency
safety. Outside-player presence, unknown ownership, wrong head/root, uncertified
state or absent approval retain the strict exclusion. Before any future live use,
the trusted orchestrator must recheck population, freshness, consent and admission
at dispatch and stop on outside entry. This optional planner is not connected to
paid dispatch in the expired runner and adds no spending authority.

Current production does not meet the prerequisites: the campaign is expired and
an outside player's retained cannon exists. Wait remains appropriate. The eight
Conserve ticks cover forty assumed seconds, while 60/120-second inputs would
arrive at ticks 12/24; no larger runtime bound or shorter claimed source delay was
introduced.

The existing matched runner supports a bounded tactical mode:

```sh
node tools/b2z_matched_strategies.mjs .work/bridge-defence --bridge-defence
```

It compares Move-to-bridge versus Wait from both endpoint cannons, swapping the
public player accounts between seats. One fixed central northbound attack is
admitted at tick 1; the move arrives at tick 0, 2 or 4. Every paired run shares
initial bytes, opponent inputs, eight logical ticks and a fee-inclusive 0.25 ICP
ceiling. Results preserve exact score/territory differences, ball and island
survival, receipts, state hashes and work/time measurements. This is one selected
bridge geometry, not a general movement-balance claim. All payments are valueless
pure-kernel inputs; no signer, Ledger update or production mutation is involved.

### Proactive versus reactive defence follow-up

The optional controlled-population shortlist remains planning-only. Before any
future live integration, campaign validity/expiry and approved accounts must come
from the trusted orchestrator's durable policy, approval and stop state; snapshot
authenticity must come from its verified observer. Caller-supplied booleans,
model-generated data and a claimed trust label are not authority. Recheck the
current population immediately before dispatch. Unassessed 60/120-second inputs
remain unassessed. The expired runner and signer are unchanged.

```
node tools/b2z_matched_strategies.mjs .work/reactive-defence --reactive-defence
```

This bounded local mode uses two synthetic geometries: a bent bridge crossing the
world seam with a nearby attack, and a straight bridge with an explicitly friendly
long approach corridor. The latter is necessary because neutral-cell encounters
capture and reflect; distance alone is not a free-flight arrival estimate.
Cardinal and cardinal-plus-diagonal attacks are tested on the bent bridge; the
long corridor uses a cardinal attack. Both endpoint cannons/account seats are
rotated. Move admission occurs at ticks 0, 2 and 12, against an attack admitted
at tick 1, over sixteen logical ticks. Explicit elapsed inputs assume Conserve's
five seconds per tick, covering sixty-second admission without enlarging the
existing 2,000,000-work/60-second local runner limits. Forecast limits are unchanged.

The reused historical bridge fixture already contains a pending strike due at
1/16 tick. The new mode explicitly clears that inherited strike in its valueless
initial setup to isolate the stated opposing purchases; the old mode, fixture and
archived results remain intact. Earlier comparisons are conditioned on that
pre-existing threat, not clean evidence that the newly inserted Fire caused every
bridge loss. A no-payment replay preserves this confound as evidence. No production
state, source history, rule, payment or event is reset by this local setup.

Each Move/Wait pair shares initial state, opposing inputs, logical/elapsed horizon
and spending ceilings. Canonical receipts assert that all intended attacks really
launch and every Move has one terminal receipt with full costs retained. Results
record exact score, territory, survival, receipts, work and time; no future is
presented as authenticated gameplay. A multiple-direction attack costs more than
the single attack and cannot establish equal-budget dominance.

### Economic defence screen

```
node tools/b2z_matched_strategies.mjs .work/economic-defence --economic-defence
```

One bounded follow-up compares Wait, proactive Move, Move admitted after 10/60
assumed Conserve seconds, one proactive supporting ball and a supporting/recovery
ball after 60 seconds. Two equal-cost single-ball attacks use the cardinal versus
diagonal connection of the same bent bridge; both endpoint/account seats are used.
Every group shares one immutable Wait control, initial state, fixed opposing input,
sixteen logical ticks and a fee-inclusive 0.25 ICP defender ceiling. Historical
pending strikes are removed only in this explicit synthetic setup, as in the
reviewed reactive mode. Existing 2,000,000-work/60-second limits are unchanged.

The runner reuses the existing canonical birth/death accounting, preserving payer,
input and event attribution for balls purchased and destroyed in the same horizon.
It records full transfer/fee costs, terminal receipts, original and spawned losses,
surviving support and incremental canonical score/territory against Wait. Score
per full ICP is an exact rational; zero-spend efficiency is undefined, not infinite.
It is an experimental score-efficiency measure, not a token profit or payout.

No strategy weights, game rules, movement price, signer, campaign or production
state are changed. A caller-supplied planning flag remains insufficient for live
consent: future integration must derive validity/expiry/approved accounts from
trusted durable state, verify the snapshot and recheck population at dispatch.
