# Current European deployment — fresh targets only

Backend **`s5ir5-gqaaa-aaaas-amyna-cai`**, frontend
**`s2jxj-liaaa-aaaas-amynq-cai`**. Expected subnet:
`bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`.
Read [STATUS.md](../../STATUS.md) for executed release status.

The owner authorises installation and verification of the scoped release on these
already created targets, using `codex_local`. Verify aliases, controllers, module
absence, balances and certified subnet membership before installation. Stop on
unexplained installed state. Never create/reinstall targets, touch the former
pair, change controllers, buy cycles, send ICP or endow a subscription.
The existing scoped `DFX_WARNING=-mainnet_plaintext_identity` acknowledgement is
permitted for these authorised commands; never inspect/export identity material.

Build/freeze clean committed source using `tools/prepare_mvp_release.py
--fresh-current-rules --output ...`. Install its exact normal Wasm with `--wasm`,
mode **install** only after reconfirming the backend is empty. No test features.
Normal init remains supported empty v3 genesis, zero source cursor and
`FromBeginning`, with official Ledger/Index/default subaccount and assistance
disabled. Query the new receiving account before init and reconcile any genuine
history; never assign a global Ledger tip as an account cursor.

Rehearse/execute `prepare_torus_transition` → `commit_torus_transition`, then
million, playability and entry transitions in order. Each prepare uses the normal
source worker's actual Ledger/Index cutover; wait for its ready phase and commit
with the actual current sealed predecessor manifest. The existing bounded driver
performs only the required transition drain/seal work while stopped, subject to
the independent 0.5T transition floor even in Reserve; ordinary idle remains asleep.
Reconcile an ambiguous response from
status/publication before retrying. No arbitrary state argument or cursor override
exists. Keep gameplay stopped and the frontend uninstalled until authenticated
rules 7, source identity, clean state and destination are verified. Start the
existing autonomous driver only after activation; empty worlds sleep.

The payment destination is backend/default subaccount, AccountIdentifier
`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
The principal/subaccount and AccountIdentifier forms are different wallet fields.
The UI derives this address from the verified descriptor, never this document.
Old Activity stays scoped to its original backend. Use verified quotes and exact
memo bytes; payments/unused amounts are retained with no automatic refunds/payouts.

Freeze assets with `tools/build_observer_playability.mjs --canister
s5ir5-gqaaa-aaaas-amyna-cai --output ...`. Stage those exact verified assets into
`.work/s14/assets` only for the release; preserve any prior local artifact rather
than substituting it. For the initially empty frontend, use the established DFX
asset install/deploy route against **observer only**, with `NPM_CONFIG_IF_PRESENT=true`
and `--no-wallet`. Check installed DFX help/mode against actual state. Never deploy
`--all`, rebuild the backend through a frontend command, or use the former alias.
Verify every served file and header against the frozen manifest and perform
read-only desktop/mobile certificate/source, Identify, right-rail and pace checks.
Applicable exact-source hosted CI must pass before installation. Publication uses
an authorised ordinary non-force Git route; absent credentials require exact
operator commands, never logged secrets or a parent-CI substitution.

The new pacing entries/exits are liquid balances; the platform has already removed
its reserves. Do not subtract them twice. Trickle enters at 1.25T, exits below 1T
qualified by the bounded 13-node starting-budget and recovery probes. Existing source/treasury/transition
call floors remain. Below the entry balance the freshly initialized clock selects
Reserve naturally; report its actual entry shortfall without spending funds.

Assistance is **disabled**: live Event Horizon lacks the documented subscription
preview query, certified ABI and usable subscription/cadence health evidence.
Ordinary fallback remains 60 seconds. Ten-minute/hourly intervals are disposable
measurement settings, not a silently activated production policy. Pokes remain
non-authoritative, caller/target filtered and share the existing worker. Backlog,
barriers and treasury recovery retain their own prompt work. Runtime health uses
the already scheduled five-minute treasury maintenance, including while paused;
no extra fast timer exists solely for a cosmetic metric.


Earlier procedures are preserved separately in [the historical archive](S14_OPERATOR_HISTORICAL.md); they are not current deployment instructions.
