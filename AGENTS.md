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
