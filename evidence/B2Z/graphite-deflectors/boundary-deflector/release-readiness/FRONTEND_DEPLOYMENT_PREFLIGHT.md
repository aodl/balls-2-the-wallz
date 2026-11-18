# European graphite frontend preflight

The 81-file candidate is staged for a separate owner decision. The live asset canister is `s2jxj-liaaa-aaaas-amynq-cai` with certified module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`. Its current 79 public assets have been downloaded and verified against the 80-file pre-Rules11 rollback inventory. The live backend address is `s5ir5-gqaaa-aaaas-amyna-cai`. [Transition prerequisites and live identities](BACKEND_TRANSITION_READINESS.md).

| Set | Complete inventory SHA-256 | JavaScript SHA-256 |
|---|---|---|
| Candidate and Rules12 recovery | `0b14bcccf7f1ed76bcfd4039b6aabcfb1965c7e6b94e437e3cc46d7e165d7c3e` | `c5b688ae74527cb30e7b50f06141d429f237eef0297ed7eba0192d268e0d8c9b` |
| Live Rules7 rollback | `e8a9303538dbb2cc5028b21cf5ae97caacdb9c438497a35a567e30a9071a0c67` | `bc2872444e4574ae818983e2d7ede46f7ff0c4c2d71b198b9b821c344636321c` |

The candidate's 80 public bodies and consumed policy were rehashed. The rollback combines independently fetched identity bodies with the consumed upload policy from the exact prior freeze. The signed asset list, MIME and security/cache headers, and all 79 exact-path IC-v2 response proofs passed against the pinned mainnet root, including a changed-response negative. All four registered gzip variants also matched their signed encoding lengths and hashes, decompressed exactly, and passed IC-v2 proofs. All 61 audio files match byte for byte, including manifest SHA-256 `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c`. [Candidate inventory](../artifacts/frontend-inventory.json) · [Rollback inventory](../../../combined-clearance-war-cry/artifacts/frontend-inventory.json) · [Prior served release](../../../combined-clearance-war-cry/frontend80-deployment/REPORT.md).

## Frozen staging and later approved upload

Run from `/home/codexdev/src/b2z-boundary-deflector`. The source freeze remains `.work/boundary-deflector/frozen/frontend`. A separate byte-identical copy is preserved in `.work/release-readiness/graphite-recovery/.work/s14/assets`. The independently verified rollback is `.work/release-readiness/rollback80/.work/s14/assets`. Each local staging project has only `observer`, a single source directory, and the pinned IC mapping. There are no backend aliases, dependencies or custom builders. The configuration blobs, deployment binding and Candid description in the approved inventory are static browser inputs. They cannot modify the backend or activate an epoch. The certified controller list includes the existing `codex_local` principal. DFX 0.31.0 documents `--no-asset-upgrade` as assets-only. Use the exact scope previously executed for the 80-file frontend. Keep the built-in deployment machinery limited to packaging the provided static files. The checked-in [staging configuration](dfx.json) and [canister mapping](canister_ids.json) recreate either project by copying the relevant frozen directory to a new, otherwise empty project’s `.work/s14/assets`. Rehash after the copy and resolve `observer` before using it.

Refresh the production identities immediately before the later upload. A wrong asset module, mismatched rollback, unsupported Rules7 reading, certificate discrepancy or unexpected staging file blocks execution. The following verification is read-only:

```sh
P=evidence/B2Z/graphite-deflectors/boundary-deflector/release-readiness
I=evidence/B2Z/graphite-deflectors/boundary-deflector/artifacts/frontend-inventory.json
R=evidence/B2Z/combined-clearance-war-cry/artifacts/frontend-inventory.json
W=.work/release-readiness
python3.11 "$P/verify-assets.py" graphite "$I" "$W/graphite-recovery/.work/s14/assets"
python3.11 "$P/verify-assets.py" rollback "$R" "$W/rollback80/.work/s14/assets" --served "$W/pre-upload"
node "$P/verify-signed-inventory.mjs" "$W/pre-upload" "$R"
node "$P/verify-http-certificates.mjs" "$W/pre-upload" "$R"
python3.11 "$P/verify-compressed.py" "$W/pre-upload"
node "$P/verify-http-certificates.mjs" "$W/pre-upload/compressed" "$W/pre-upload/compressed/inventory.json"
node tools/boundary_deflector_readonly_mainnet.mjs "$W/pre-upload-backend.json"
```

**Only after explicit owner authorisation**, execute from the isolated graphite staging project. Verify the returned ID before the second command.

```sh
cd /home/codexdev/src/b2z-boundary-deflector/.work/release-readiness/graphite-recovery
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity dfx canister id observer --network ic
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

From the worktree root, repeat the asset checks using `graphite`, `"$I"`, `"$W/graphite-recovery/.work/s14/assets"` and fresh output `"$W/post-upload"`. Recheck both canister modules and the backend's certified Rules7/configuration/source. The signed inventory must contain precisely 80 public keys and identity encodings. Check any registered compressed variant against the signed encoding byte count/hash and its decompressed identity. Header checks require policy consistency, correct MIME and FLAC identity encoding. Keep any failed check and stop live acceptance until the result is reconciled.

## Candidate visual, capability and live acceptance

A sandboxed browser served the untouched candidate bytes on localhost with the release policy and only read-only IC requests. It authenticated actual European Rules7 at 320×640 and 1440×900, used returning-player entry and ordinary input on cannon cell 0, and reached 347.15°. At 320×640 the camera returned to the recorded pose and the dock measured 130×46 with two hit-tested 44px controls. Fire, Move and Build proposed bare canonical memos and the exact backend recipient. War Cry and Deflector were hidden. The first browser attempt crashed during input while multiple disposable tests were running. The completed retry passed with the same frozen bytes. The actual production asset origin still needs its own post-upload acceptance if approved. [Run data](results/frozen-browser-rules7.json) · [Mobile capture](results/fire-320.png) · [Desktop capture](results/fire-1440.png).

The certified configuration mapping was checked against all three frozen configuration blobs with the qualified policy functions. [Capability results](results/capabilities.json).


The hosted wide, portrait and narrow captures show the faceted graphite turret and low wedge on their own tile centres with subdued owner-colour accents. The mobile ghost intentionally has a translucent fill over the tile and a direction guide. At 320×640 the risk note needs scrolling within the existing usable payment scrollport. The shared title/amount row, account person control, To/Copy and Memo/Copy remain present and aligned. The reference artwork is more detailed than the frozen low-poly models. The release preserves the approved silhouettes, placement and accent roles. No material visual discrepancy was found in the sampled hosted views and decoded recording frames. Checking a desktop capture at mobile viewport dimensions does not establish physical-device performance. [Approved designs](../../reference/) · [Hosted screenshots and authenticated recordings](../GALLERY.md).

| Case | Evidence available at preflight | Repeat after a separately approved upload |
|---|---|---|
| Rules7 | Exact identity recognised. The supporting source chooses capabilities from authenticated state. Production uses bare FIRE/NEW/MOVE and the hosted negative gates out DEFLECT. | Authenticate fresh production playback on candidate bytes, select Fire/Move/Build, confirm bare memos and no War Cry/Deflector control. |
| Rules11 | Hosted shared panel, clearance and War Cry checks. Successor supports the prior certified identity and the adapter6 memo format. | After a separate Rules11 activation, confirm both features together, no Deflector, and that a stale Rules7 packet cannot be copied. |
| Rules12 | Two independently authenticated disposable observers display installed-game redirects and removal. Hosted native browser controls exercise the sixth action, four orientations, tile-aligned transforms and 44px targets. | After a separate Rules12 activation verify selected direction, price and canonical `DEFLECT <cell> <orientation>` as a read-only proposal. |
| Exact handoff | Actual browser clipboard and native paste, manual fallback, Update/Keep, protected preview and 434 unchanged status/value geometry samples. | On genuine ready status, check full recipient, numeric amount and exact memo, independent Copy axes and From reassociation. At stale/paused readiness require Copy disabled. |
| 320×640 / 347.15° | Exact hosted quantity dock regression with 187 heading samples visible and non-inert. | Recreate the ordinary cell-zero pose when present, check usable dock and gesture isolation. Report an equivalent pose separately if the live world changed. |
| Playback, returning player and audio | Hosted browser checks and unchanged audio bytes. | Test verified startup, browser-side interruption/recovery, returning-player entry, tab return and mute. P09 remains FAIL/unqualified; physical playback is a separate check. |

If an approved upload later materially breaks trust, payment correctness, startup or controls while Rules7 remains active, repeat the same scoped DFX command from `"$W/rollback80"` under the authorised rollback decision. First rehash all 80 rollback files, then independently verify all 79 restored served bodies/proofs, signed inventory and unchanged modules/backend identity. Keep the graphite recovery staging project and original freeze separately. The old 80-file frontend covers Rules11 but is incompatible with a Rules12 cutover. After the Rules12 epoch, restore the qualified 81-file set for frontend asset loss under separate authority. Use the signed-list verifier with `--rules12-recovery` and confirm the active certified Rules12 identity and source separately. Require qualified compatible bytes if the defect is in that runtime.
