# Balls 2 The Wallz — lean account-index application

BTZ is an authoritative deterministic game on the Internet Computer. Players use existing wallets to transfer ICP with a BTZ memo. The backend reconciles **one receiving account through the official ICP index**, runs the existing Rust game autonomously and publishes certified state/events/scores. Event Horizon's authenticated, target-filtered `poke` accelerates checking; an independent 60-second fallback handles missed notifications. The browser only observes.

**No sign-in, wallet connection or transaction-sending frontend. Automatic payouts and refunds are unavailable.** Area-time scores preserve the intended revenue-sharing direction. A controlled operator mainnet exercise is separate from opening public paid/prize participation; no guaranteed distributions are advertised.

The normative [application contract](docs/specs/BTZ_APPLICATION.md) specifies payment interpretation, pagination, sparse IDs, bounded staging, retries, retention and observer trust. The [operator runbook](docs/operations/S14_OPERATOR.md) contains build, DTR-first publication, deployment, subscription, pause/upgrade and verification commands. All remote Git, deployment, funding and real-money operations belong to the user.

## Local verification

Use Node >=22.16, Python >=3.11 and Rust 1.94.1. Dependencies remain immutable; S14's two local DTR changes must be published before the final BTZ pin/lock update. Until then, use the explicit temporary development override in the runbook. A normal `npm ci` restores the old published package; it does not validate the new mainnet client.

```sh
# After the published dependency update:
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

The existing offline observer remains available with `python3.11 -B tools/serve_observer.py --port 8080`, at `http://127.0.0.1:8080/apps/btz-observer/`. Its pinned replay is labelled separately from certified local/mainnet observation. `tools/build_observer_mainnet.mjs` bundles explicit trusted deployment policy for the existing static observer; it publishes nothing.

## Ownership and remaining gates

BTZ owns payment classification, ICP-index reconciliation, Event Horizon routing, canister assembly, game rules and renderer. DTR owns the generic coordinator, ordered input admission, canonical publication, certificate verification and playout; BTZ consumes DTR without copying its source. Game v3, publication v6 and animation v1 are unchanged. Life and independent game oracles remain regression boundaries.

1. **Implemented and locally verified with an explicit DTR development override:** bounded account-history reconciliation, exact filtered pokes, independent fallback, autonomous game, read-only mainnet-capable observer and deployment tooling.
2. **Ready for user-operated verification after dependency publication:** immutable DTR consumer update, new remote CI, fresh canister/controller/cycles setup, official index binding, certified observer and exact Event Horizon account subscription.
3. **Before public paid/prize launch:** payout/settlement implementation and review, retained-payment disclosures, real-wallet memo/account compatibility, operational funding/availability and explicit user launch decision.
4. **Removed/deferred:** global-ledger scanner/archive path, alternative laboratory hosts, manual production game controls, scanner throughput campaigns, wallet/login features, dynamic scheduler and general notification/source frameworks.

Historical baseline: [S13 report](checkpoints/S13_REPORT.md). Current implementation results and remaining gates: [S14 report](checkpoints/S14_REPORT.md). Prior CI did not execute new local code.
