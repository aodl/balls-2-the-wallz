# Working rules — current Linux validation

Use `STATUS.md` for current status and the relevant specification for the code being changed. `checkpoints/S07_REPORT.md` is immutable historical evidence: its unavailable-Rust and browser-policy statements describe the previous environment, not this Linux host.

## Product boundaries

Preserve BTZ v3 state, scoring, original audit events and seal bytes. Publication remains v6; compact presentation remains `btz-animation-1`. Required conformance is public-output equality and each implementation's recovery, not identical private JS/Rust cursor bytes. Keep Life as the second-kernel boundary test and never rewrite historical goldens merely to match a port.

The observer never submits commands or makes gameplay decisions. Offline recording pins prove content consistency, not IC authenticity. The explicit S09 local mode verifies a pinned disposable-PocketIC root, canister identity, certificate freshness/delegation, the flat publication catalog and artifacts; it must never fall back to offline trust after an authentication error. HTTP browser mode must use the actual server, CSP and browser-native Web Crypto; fixture mode remains separately qualified.

Keep one current IC host: `canisters/runtime-lab`. Its ledger-fed mode is confined to disposable `pocketic-local` configuration and valueless records. Do not revive frozen laboratories as product paths or add another coordinator, persistence framework or host. A successful Wasm build is not Candid, certificate, upgrade, ledger or production-readiness evidence; only the named S09 integration test supplies the local evidence it executes.

## Local setup and checks

The project pins Rust 1.94.1 in `rust-toolchain.toml`; do not change the user's global default. Use Node >=22.16 and Python >=3.11. The repeatable user-scoped setup and locked dependency fetch are documented in `docs/operations/LINUX_SETUP.md`.

Run relevant local tests, fix in-scope failures, and rerun them without asking at each step. Write raw results under `.work/` and only reviewed summaries under `evidence/`. Normal verification must use committed lockfiles and `--locked`; lock generation is a deliberate one-time dependency-resolution action.

Run the bounded local authoritative slice with Python 3.11 using `tools/verify_s09_local.py`. It downloads only checksum-pinned test artifacts outside the checkout, creates disposable PocketIC instances, and never uses a dfx identity or public network.

Keep PASS, FAIL and BLOCKED distinct. Browser or tool absence must not hide native results. Do not claim PocketIC, Candid, certificate, ledger, upgrade, cost or deployment evidence from compilation alone.

## Security and repository hygiene

Use `DFX_IDENTITY=codex_local` for local IC tests. Never inspect or export identity material, private keys, seed phrases or `.env` secrets. Keep identities, environment files, virtualenvs, dependency trees and build caches out of Git and checkpoint archives.

No mainnet deployment, production-controller change, wallet access, token transfer, remote push or package publication is authorized. Do not disable browser, OS or agent security policy. User-scoped reviewed development dependencies are permitted; system-wide changes require explicit approval.

Save coherent progress commits on the active branch. Preserve historical checkpoint reports and evidence. Do not create a release ZIP until the checkpoint is actually ready and explicitly requested.

## S14 active application (supersedes historical scanner/laboratory descriptions)

Use `docs/specs/BTZ_APPLICATION.md` as the normative application contract. One official ICP account index, one receiving numeric subaccount, one configured Event Horizon sender, exact payload-bearing target-filtered `poke`, and fixed 60-second fallback. Trust the configured official index for account-history contents/completeness. Never recreate global `query_blocks` scanning, archive traversal, dense gap padding, a zero-argument poke, parallel notification services or generic source frameworks.

The observer has no login, wallet, signing, allowance, session or transaction-sending feature. Keep keys and payment execution in users' existing wallets. Preserve scores and disclose that automatic payouts remain unavailable. Mainnet/real-money actions and all remote Git operations remain user-owned. Never reinstall/reset an existing funded canister. Normal Wasm must exclude synthetic input/state mutation and manual game-step controls.

DTR S14 changes are limited to sparse ordered admission and network-configured SDK certificate/observation handling. Before remote publication, use only the explicit `tools/s14_development.py` temporary override; never commit sibling-path dependencies, a Git URL rewrite or a revision falsely presented as remotely available. User publishes DTR first; immutable BTZ pins/locks and remote consumer validation follow in a separate authorized local continuation.

S14 dependency completion: the published DTR commit is now `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client 0.12.0. Use the actual pinned locks and normal package install for current validation; no development override is required. `tools/verify_dtr_consumers.py` uses ordinary Cargo resolution and local immutable archiving rather than remote Git checkout commands.

Controlled MVP deployment uses the existing `dfx.json`, `tools/prepare_mvp_release.py` and definitive `docs/operations/S14_OPERATOR.md`. Freeze/install the normal artifact explicitly; do not substitute a later test build. Keep actual prices unless the user approves precise changes. Event Horizon may be explicitly disabled for first play; independent fallback still works. Source configuration is immutable in this version. Mainnet IDs/funding/transfers remain user-owned; never reinstall to change configuration. Do not reopen scanner/polling benchmarks or create another deployment framework.

Prelaunch UX/pricing work uses `config/economics/prelaunch.json` and `tools/generate_economics.mjs`; never hand-edit generated prices or historical goldens. Keep original S14 configuration identifiable. A normal upgrade preserves its journal profile and cannot be assumed to reprice it. Stage exact source/artifacts for user approval; no reset/reinstall without separate explicit approval and a fresh payment/history check. The observer derives actionable prices/destination from certified configuration/source, uses the existing memo codec, and disables payment preparation before verification or during unhealthy operation.
