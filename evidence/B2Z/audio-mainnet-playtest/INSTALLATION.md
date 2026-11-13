# Conditional frontend-only trial installation

Do not execute the production command until the owner confirms public Suno
hosting permission, all six exact-candidate gates pass and rollback rehearsal
passes. CI source is `74f08183b905d97dbfd821ede0a4c2cdc47538f5` in run43519301054.
P09 is FAIL, accepted for this bounded trial, not general-release qualified.

Use the existing operator procedure, without rebuilding. Rehash every entry of
`evidence/B2Z/audio-corrective-qualification/frozen-inventory.json` against
`.work/audio-corrective/frozen/frontend` and assert exact file-set equality.
Inventory SHA must be `b4abc541bf7277dbae865f4269d1abd12cc4d6e0bcba39bcf2b21a875c1ae72f`.
JS SHA must be `cba3eb98c63bb513494500de7f1b79550a1ba4332ee50181529839c6252eed0e`.
Verify `canister_ids.json`: observer `s2jxj-liaaa-aaaas-amynq-cai`, backend
`s5ir5-gqaaa-aaaas-amyna-cai`. Preserve current staging, and copy the complete
verified candidate to `.work/s14/assets`, including the consumed upload policy.
Rehash the staged directory against the same inventory before upload.

The only installation command is:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

No backend build, installation, settings/controller change, funding or payment is
authorized. No unrestricted deployment, `--all` or backend preparer is permitted.

After installation, run the prepared read-only HTTP verifier from the repository:

```sh
python3.11 .work/audio-mainnet-playtest/verify-installed.py
```

It must verify all73 public assets against the frozen inventory, security/cache
headers and certified HTTP response availability. Independently query the signed
asset list with pinned-mainnet SDK verification, assert exact keys and identities,
57 identity-only FLAC encodings and unchanged certified frontend/backend modules,
controllers and subnet. HTTP hash/header checks alone are not certification proof.

At the actual origin in fresh browser contexts (1440×900,390×844,320×640), record
game certificate/source identity, head/timings, no pre-gesture audio requests or
context, explicit Music and FX activation, loaded manifest identity, no game or
audio errors, genuine displayed-event effects where available, overview silence,
audio-only browser network failure isolation and status-only panel stability.
Do not manufacture live game events. Mark unobserved live scenarios NOT_RUN.
No payment is sent. Software browsers do not qualify physical listening.

On serious regression, stage `.work/audio-mainnet-playtest/rollback/frontend`
after checking the complete16-file inventory SHA
`f85e3ddf9b1ed38dd7b441162f7579707b5e7ef1c10c0612d0990795cb46e99c`,
then use the same observer-only command. Verify all15 restored public files,
headers, signed keys (audio keys removed), certificate identities and normal
gameplay loading. Never reset or roll back the paid backend.
