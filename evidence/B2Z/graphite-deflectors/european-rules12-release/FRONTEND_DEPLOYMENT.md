# Stage A asset installation and verification

The approved 81-file graphite release was uploaded to `s2jxj-liaaa-aaaas-amynq-cai` on 18 November 2026. Stage A used the isolated project `.work/release-readiness/graphite-recovery` after resolving its sole live canister alias to that exact ID. The scoped deployment completed with the pre-existing asset module. [Upload log](results/frontend-upload.log)

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity \
  dfx canister id observer --network ic
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true \
  dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

| Check | Before | After |
|---|---:|---:|
| Independently retrieved public bodies and headers | 79 passed | 80 passed |
| Signed live inventory and canister binding | 79 passed | 80 passed |
| IC-v2 certified public responses | 79 passed | 80 passed |
| Registered gzip representations, decoded hashes and proofs | 4 passed | 4 passed |
| Audio assets with unchanged bytes | 61 | 61 |
| Certified asset module | `04e565b3…debd62` | `04e565b3…debd62` |
| Certified backend module | `612ad0d0…a8e948` | `612ad0d0…a8e948` |

Identity-encoded bodies, artifact lengths, CSP and security/cache/MIME policies were verified individually. Both public inventories excluded the consumed upload policy; each corresponding exact local inventory included it. [Before bodies and headers](results/pre-served.json) · [After bodies and headers](results/post-served.json) · [Signed inventories before](results/pre-signed-inventory.json) and [after](results/post-signed-inventory.json) · [IC-v2 proofs before](results/pre-http-certificates.json) and [after](results/post-http-certificates.json) · [Gzip proofs before](results/pre-gzip-http-certificates.json) and [after](results/post-gzip-http-certificates.json)

The rehashed 80-file predeployment frontend remains in the separate rollback project `.work/release-readiness/rollback80`. It can be restored under the authorised recovery criteria while Rules7 remains active. It cannot verify schema7. The 81-file original freeze and separate recovery project are both retained. A deterministic defect in the 81-file runtime would require a separately qualified compatible fix. [Exact hashes](ARTIFACTS.md) · [Recovery runbook](../boundary-deflector/release-readiness/FRONTEND_DEPLOYMENT_PREFLIGHT.md)
