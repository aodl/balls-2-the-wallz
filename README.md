# Balls 2 The Wallz — lean account-index application

B2Z is an authoritative deterministic game on the Internet Computer. Players use existing wallets to transfer ICP with a readable ICRC-1 memo. The backend reconciles **one receiving account through the official ICP index**, runs the existing Rust game autonomously and publishes certified state/events/scores. Event Horizon's authenticated, target-filtered `poke` accelerates checking; an independent 60-second fallback handles missed notifications. The browser only observes.

**No sign-in, wallet connection or transaction-sending frontend. Automatic payouts and refunds are unavailable.** Area-time scores preserve the intended revenue-sharing direction. A controlled operator mainnet exercise is separate from opening public paid/prize participation; no guaranteed distributions are advertised.

The normative [application contract](docs/specs/B2Z_APPLICATION.md) specifies payment interpretation, pagination, sparse IDs, bounded staging, retries, retention and observer trust. The [operator runbook](docs/operations/S14_OPERATOR.md) contains phased deployment/funding commands, launch configuration, exact wallet play card, subscription and pause/upgrade procedures. All remote Git, funding and real-money operations belong to the user. Deploying reviewed code into the two existing mainnet canisters requires explicit user authorization; a destructive reset requires separate approval.

## B2Z naming and prefix-free memos

The current release prepares `ANGLE 37.5`, `ANGLE 225` and `MOVE 83` with full-circle pointer/touch/keyboard aiming and one authenticated action card. The additive adapter retains S15 prefixed text, binary and numeric compatibility. See the [grammar](docs/specs/B2Z_TEXT_MEMOS.md) and [immutable identifier policy](docs/architecture/LEGACY_IDENTIFIERS.md). The release is undergoing local verification; deployed S15 module `c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4` remains the predecessor until the tested upgrade is recorded. Prices, receiving account, physics and DTR are unchanged.

## Live arcade / prelaunch release

The [mainnet observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) now serves the arena-first arcade release and authenticates the **1 ICP** join profile. Ball base remains 0.1 ICP and relocation 0.0001 ICP. The user-approved empty-game transition was performed only after fresh no-payment/score/pending-input checks. Certified browser viewing and autonomous progression pass; [activation evidence](evidence/S14/ux-pricing/mainnet-activation.json) records the deployed source/artifacts. No wallet/login or payout feature was added. Never repeat the one-time reset as routine upgrade recovery.

The sole editable price source is [prelaunch.json](config/economics/prelaunch.json); [generation and profile rules](config/economics/README.md) describe freshness checks and future adjustments. The client reads either supported profile only when its bytes match the certified configuration hash, so it never substitutes the proposed 1 ICP price for a live 10 ICP configuration. Review the [screenshots, verification and exact artifact report](checkpoints/S14_MVP_UX_PRICING.md). Detailed transition precautions remain in the single operator runbook.

## Local verification

Use Node >=22.16, Python >=3.11 and Rust 1.94.1. Dependencies are immutable: DTR revision `1f47c1a0a104875bd13475d561b8d5aa10770d99` and inspected client package 0.12.0 are now pinned in real locks. Use normal `npm ci` and locked Cargo checks; no sibling-source or development override is required.

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

B2Z owns payment classification, ICP-index reconciliation, Event Horizon routing, canister assembly, game rules and renderer. DTR owns the generic coordinator, ordered input admission, canonical publication, certificate verification and playout; B2Z consumes DTR without copying its source. Game v3, publication v6 and animation v1 are unchanged. Life and independent game oracles remain regression boundaries.

1. **Implemented and locally verified:** bounded account-history draining, expired-lease recovery, exact filtered pokes, independent fallback, autonomous game, read-only certified observer, actual dfx asset-canister hosting, frozen normal release and public price/cell/outcome reference.
2. **Mainnet activated and verified:** arcade UI, canonical 1 ICP profile, official index binding, certified observer and autonomous progression. First user wallet gameplay transfer remains user-operated; Event Horizon subscription is optional.
3. **Before public paid/prize launch:** payout/settlement implementation and review, retained-payment disclosures, real-wallet memo/account compatibility, operational funding/availability and explicit user launch decision.
4. **Removed/deferred:** global-ledger scanner/archive path, alternative laboratory hosts, manual production game controls, scanner throughput campaigns, wallet/login features, dynamic scheduler and general notification/source frameworks.

Historical baseline: [S13 report](checkpoints/S13_REPORT.md). Historical deployment preparation: [MVP evidence](evidence/S14/mvp-preparation.json) and the [operator play/deployment runbook](docs/operations/S14_OPERATOR.md). The live join is **1 ICP**; the solo join/first extra ball/relocation exercise is **1.1001 ICP plus wallet fees**, conditional on the current ball price. Source/index recovery baseline: [S14 closeout](checkpoints/S14_CLOSEOUT.md). The [earlier S14 report](checkpoints/S14_REPORT.md) remains historical; prior CI did not execute new local code.
