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
0/60/120 seconds). Opponent responses use only public last cannon headings. Future
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
The four-player setup uses the real pure purchase kernel. Metrics use the canonical
area-time score delta, never thirty wall minutes at differing funding tiers.
Zero-spend efficiency is undefined, not infinite. JS work units are not billed
cycles. This bounded sample tests hypotheses; it does not establish a winning
strategy or full balance qualification. Installed Ledger/source acceptance is a
separate explicitly ignored Rust integration case, run with valueless fixtures.

## Four ordinary accounts, no spending approval

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
