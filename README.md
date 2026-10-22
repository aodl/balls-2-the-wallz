# Balls 2 The Wallz — lean account-index application

**Local preparation only:** the [prelaunch self-funding worker](docs/operations/PRELAUNCH_SELF_FUNDING.md)
can convert retained gameplay ICP into B2Z's own operating cycles using the
official Ledger/CMC. It is not deployed; this task performs no real transfer.
Live gameplay, prices and receiving account remain unchanged. The combined
candidate includes the authenticated v3→v4 transition and pins published DTR
`c12af747190f7e24d5e68cdf57dbb1494095a46b`, client 0.13.0.

B2Z is an authoritative deterministic game on the Internet Computer. Players use existing wallets to transfer ICP with a readable ICRC-1 memo. The backend reconciles **one receiving account through the official ICP index**, runs the existing Rust game autonomously and publishes certified state/events/scores. Event Horizon's authenticated, target-filtered `poke` accelerates checking; an independent 60-second fallback handles missed notifications. The browser only observes.

**No sign-in, wallet connection or transaction-sending frontend. Automatic payouts and refunds are unavailable.** Area-time scores preserve the intended revenue-sharing direction. A controlled operator mainnet exercise is separate from opening public paid/prize participation; no guaranteed distributions are advertised.

The normative [application contract](docs/specs/B2Z_APPLICATION.md) specifies payment interpretation, pagination, sparse IDs, bounded staging, retries, retention and observer trust. The [operator runbook](docs/operations/S14_OPERATOR.md) contains phased deployment/funding commands, launch configuration, exact wallet play card, subscription and pause/upgrade procedures. All remote Git, funding and real-money operations belong to the user. Deploying reviewed code into the two existing mainnet canisters requires explicit user authorization; a destructive reset requires separate approval.

## Arena and shared pacing

The [live observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) fills the viewport, with Play, Players, Rules, View and Settings in local dialogs. Pan, zoom and the minimap change only the view. The bounded producer combines coordinator phases and advertises one shared cycle-aware pace; empty arenas still sleep. The current paid world remains **16×8, bounded v3**. Its legacy cannon has no authenticated last-heading field and therefore uses a neutral symbol.

A **32×32 torus with persistent firing direction is implemented and locally tested, but not activated**. The combined candidate uses the published DTR epoch operation to preserve the paid world and authenticate its fixed Ledger/Index cutover. See the [release evidence](checkpoints/B2Z_ARENA_CAMERA_AND_PACING.md), [pacing contract](docs/specs/B2Z_ARENA_AND_PACE.md) and [staged world/migration contract](docs/specs/B2Z_TORUS_V4.md). B2Z makes no DTR source changes. Never reset the funded backend to bypass this transition boundary. New branch CI is NOT_RUN until the user pushes.

## B2Z naming and prefix-free memos

The [public observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) prepares `ANGLE 37.5`, `ANGLE 225` and `MOVE 83`, with full-circle aiming and an authenticated action card. Adapter v3 accepts prefix-free text and published S15/binary/numeric compatibility. Backend `187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1` was upgraded in place before the frontend upload; state, scores, retained publications, source progress and identities were preserved. Prices remain 1 ICP to join, 0.1 ICP ball base and 0.0001 ICP MOVE, fees separate. DTR is unchanged.

The checkout is now `/home/codexdev/src/b2z`. See the [grammar](docs/specs/B2Z_TEXT_MEMOS.md), [immutable identifier policy](docs/architecture/LEGACY_IDENTIFIERS.md), [release report/screenshots](checkpoints/B2Z_IDENTITY_AND_MEMOS.md) and [reviewed evidence](evidence/B2Z/release.json). Local real ledger/index transfers, exact S15 recovery, DFX asset hosting and actual public certificate/copy/aim/reconnect checks pass. New CI is **NOT_RUN** pending user push. No real prefix-free mainnet gameplay payment has been verified. That historical release retained intermittent buffering; the arena/pacing release above corrects its sustained producer/playback mismatch without changing v3 physics.

## Live arcade / prelaunch release

The [mainnet observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) now serves the arena-first arcade release and authenticates the **1 ICP** join profile. Ball base remains 0.1 ICP and relocation 0.0001 ICP. The user-approved empty-game transition was performed only after fresh no-payment/score/pending-input checks. Certified browser viewing and autonomous progression pass; [activation evidence](evidence/S14/ux-pricing/mainnet-activation.json) records the deployed source/artifacts. No wallet/login or payout feature was added. Never repeat the one-time reset as routine upgrade recovery.

The sole editable price source is [prelaunch.json](config/economics/prelaunch.json); [generation and profile rules](config/economics/README.md) describe freshness checks and future adjustments. The client reads either supported profile only when its bytes match the certified configuration hash, so it never substitutes the proposed 1 ICP price for a live 10 ICP configuration. Review the [screenshots, verification and exact artifact report](checkpoints/S14_MVP_UX_PRICING.md). Detailed transition precautions remain in the single operator runbook.

## Local verification

Use Node >=22.16, Python >=3.11 and Rust 1.94.1. Dependencies are immutable: DTR revision `c12af747190f7e24d5e68cdf57dbb1494095a46b` and inspected client package 0.13.0 are pinned in real locks. Use normal `npm ci` and locked Cargo checks; no sibling-source or development override is required.

```sh
npm ci --ignore-scripts
python3.11 -B tools/check.py source --output .work/source
python3.11 -B tools/check.py native --output .work/native
python3.11 -B tools/check.py wasm --output .work/wasm
python3.11 -B tools/fetch_s09_artifacts.py --destination /home/codexdev/dtr-s09-artifacts --record .work/artifacts.json
DFX_IDENTITY=codex_local python3.11 -B tools/verify_s14_local.py --output .work/s14/local
# With the sandbox-enabled Playwright environment:
python3.11 -B tools/check.py browser --output .work/browser
```

The S14 integration uses disposable PocketIC, the pinned upstream ICP ledger and index, real-format local caller pokes, no-poke fallback, pagination faults, upgrades, native replay and genuine IC certificates. Small controlled doubles are labelled separately. Historical S09–S13 scanner/benchmark evidence remains in Git; those obsolete scanner experiments are no longer application release gates. No script may silently retrieve historical source using remote Git.

The existing offline observer remains available with `python3.11 -B tools/serve_observer.py --port 8080`, at `http://127.0.0.1:8080/apps/b2z-observer/`. Its pinned replay is labelled separately from certified local/mainnet observation. `tools/build_observer_mainnet.mjs` bundles explicit trusted deployment policy for the existing static observer; it publishes nothing.

## Ownership and remaining gates

B2Z owns payment classification, ICP-index reconciliation, Event Horizon routing, canister assembly, game rules and renderer. DTR owns the generic coordinator, ordered input admission, canonical publication, certificate verification and playout; B2Z consumes DTR without copying its source. Historical game v3 and publication v6 remain unchanged; only an explicit authenticated epoch commit introduces v4/v7. Animation v1, Life and independent game oracles remain regression boundaries.

1. **Implemented and locally verified:** bounded account-history draining, expired-lease recovery, exact filtered pokes, independent fallback, autonomous game, read-only certified observer, actual dfx asset-canister hosting, frozen normal release and public price/cell/outcome reference.
2. **Mainnet activated and verified:** arcade UI, canonical 1 ICP profile, official index binding, certified observer and autonomous progression. First user wallet gameplay transfer remains user-operated; Event Horizon subscription is optional.
3. **Before public paid/prize launch:** payout/settlement implementation and review, retained-payment disclosures, real-wallet memo/account compatibility, operational funding/availability and explicit user launch decision.
4. **Removed/deferred:** global-ledger scanner/archive path, alternative laboratory hosts, manual production game controls, scanner throughput campaigns, wallet/login features, dynamic scheduler and general notification/source frameworks.

Historical baseline: [S13 report](checkpoints/S13_REPORT.md). Historical deployment preparation: [MVP evidence](evidence/S14/mvp-preparation.json) and the [operator play/deployment runbook](docs/operations/S14_OPERATOR.md). The live join is **1 ICP**; the solo join/first extra ball/relocation exercise is **1.1001 ICP plus wallet fees**, conditional on the current ball price. Source/index recovery baseline: [S14 closeout](checkpoints/S14_CLOSEOUT.md). The [earlier S14 report](checkpoints/S14_REPORT.md) remains historical; prior CI did not execute new local code.
