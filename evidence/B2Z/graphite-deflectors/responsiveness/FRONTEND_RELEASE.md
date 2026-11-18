# European assets release and recovery

The exact candidate is built clean from `fedb50ed1c8a5e39ac0a29d247657301df58afe6` and qualified at the evidence pin `c27197ab98be470baceab01d344302eeb1f044c6`. The 81-file inventory changes three public files, the JavaScript, CSS and build provenance. The audio manifest and 61 audio assets, configuration files, deployed policy, Candid and all backend inputs match the existing Rules12 release. Local and hosted byte reproduction use the exact candidate inventory. [Inventory](artifacts/frontend-inventory.json) · [Source and hashes](artifacts/provenance.json) · [Exact-source run](https://github.com/aodl/balls-2-the-wallz/actions/runs/44371681090)

The production target is `s2jxj-liaaa-aaaas-amynq-cai`, staged at `.work/graphite-response/adaptive-stage` as an isolated project that maps only `observer`. Its backend configuration pins `s5ir5-gqaaa-aaaas-amyna-cai` on the previously certified Rules12 identities. The old 81-file graphite set remains a Rules12-compatible recovery candidate at `.work/release-readiness/graphite-recovery`. Its original production bodies, signed inventory and IC-v2 proofs were independently verified and copied to a separate capture before installing any new assets. [Predeployment public proof](results/predeploy-http-certificates.json) · [Prior isolated project and checks](../boundary-deflector/release-readiness/FRONTEND_DEPLOYMENT_PREFLIGHT.md)

The scoped DFX operation is run from the isolated project after the normal exact-source gates and live identity checks.

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity \
  dfx canister id observer --network ic
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true \
  dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

Verify all 80 public bodies, signed inventory, compressed equivalents, IC-v2 header/body proofs and both module hashes. A trust, playback or payment-handoff failure calls for assets-only rollback from the prior isolated graphite project, followed by the same independent checks. Keep the authenticated source cursor, receipts and Rules12 state intact. No backend installation or operating-setting change is part of this release.
