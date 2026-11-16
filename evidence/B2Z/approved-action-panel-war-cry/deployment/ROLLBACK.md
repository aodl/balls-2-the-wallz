# Authorised frontend-only rollback

Target observer: s2jxj-liaaa-aaaas-amynq-cai; backend s5ir5-gqaaa-aaaas-amyna-cai is never an operation target.
Preserved prior78 files: .work/approved-panel-war-cry/rollback/frontend
Inventory SHA256:4606757478a113e7a682f0077b69155e9455b2bf60624066c608b7b8168526be.
JS:3ee92eee3dda006c57f2dd17779e0e4babb947dc54942c6bd4998b975ebedbb2.

On significant regression, preserve diagnostics, separately preserve current staging, copy the complete prior78-file tree into a clean .work/s14/assets (no merging), verify every file against rollback-inventory.json, then run:

DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade

Retrieve all77 public bodies and verify SHA256/length/headers and fresh ICv2 witnesses against prior inventory; verify signed asset list/module/controller/subnet and read-only backend Rules7/config/source. Do not rebuild, upgrade the asset module, modify the backend, reverse epochs, fund, or send gameplay payments.
