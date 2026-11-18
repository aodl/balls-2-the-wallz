# European premium graphite frontend

**The qualified frontend assets are live on the European asset canister.**

| Identity | SHA or commit |
|---|---|
| Clean frontend build source | `4525ff81ac4b019abfde0eb501fa24d25fcc2fdb` |
| Exact qualification source | `942470edfd8f0f51fa3f30bc3add135a1ca43010` |
| Full 81-file inventory | `3ea59d7c6d8df7a2f1aa7bb2ce27e7e48243e021dca4abcadaea1dd85cd3c909` |
| Public stylesheet | `a01d0135b505288de3e490c9f3d311ff436e49d1821aa50d344e229c0b529b88` |
| Public JavaScript | `f82a845e7b7d33e883e659bc68d390f1944e0b925e6d541264785af511dff12c` |
| Audio manifest | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |
| Previously installed 81-file inventory | `137f32c93728602eafa269b031fa3325c675767211ab9e4388a079370e857cf3` |

The frozen comparison changes `style.css`, `app.mjs` and the public build manifest. The bundle delta comes from the cannon geometry. The audio manifest and all 61 audio assets compare byte for byte. Operation is authorized only on frontend `s2jxj-liaaa-aaaas-amynq-cai`. The existing backend is `s5ir5-gqaaa-aaaas-amyna-cai`. [Inventory](artifacts/frontend-inventory.json) · [Build inputs](artifacts/provenance.json) · [Exact-source qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/44407806408)

The isolated candidate project `.work/premium-graphite/combined/stage` contains only the existing observer alias and frozen file source. Rehash all 81 files before operation. The recoverable baseline is the prior compatible responsive project at `.work/graphite-response/adaptive-stage`, with old production bytes independently collected for comparison. Both use the established two-command DFX procedure. [Prior release and procedure](../responsiveness/FRONTEND_RELEASE.md)

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity \
  dfx canister id observer --network ic
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true \
  dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

Verify every identity body, registered gzip variant and exact-path IC HTTP v2 proof. Verify both module identities and the authenticated Rules12 paid state before and after. A material trust, financial, accessibility or interaction failure requires the exact responsive release restored from its isolated project and reverified with the same scope.

The UI-only upload was held when the cannon addendum arrived. Its qualification run was superseded. An initial combined build picked up a dirty-worktree marker from untracked evidence drafts; the clean freeze was reproduced and pinned before the current qualification run. Both superseded candidates stayed off production.

## Verified European installation

The frontend-only operation ran on 18 November 2026 between the 23:21 UTC pre-upload snapshot and the 23:23 UTC post-upload proofs. All six substantive jobs passed on the exact listed qualification source. The separate production-inventory placeholder was informational. The scoped asset upload retained asset module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`, irrespective of DFX's generic “Upgraded code” message. All 80 public identities and four registered gzip representations matched, including the exact HTTP response status, body, listed headers and canister-bound BLS witnesses. The proof verifier rejected a deliberately changed response hash. [Hosted gate details](results/combined-hosted-ci.json) · [Scoped upload](results/assets-upload.log) · [Signed inventory](results/signed-inventory.json) · [Identity proofs](results/http-certificates.json) · [gzip proofs](results/gzip-http-certificates.json)

The backend remained on normal module `2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13` and Rules12. The verified chain links publication 11895 before upload to 11897 after. The Ledger cursor stayed `40180669` and received ICP stayed `100000000` e8s. No intervening publication carried a new receipt. Cannon state, Deflectors and the next structure IDs were unchanged. World motion and non-financial territory-time scores advanced normally. Signed operating status still showed Trickle, one tick and no pending source records. There was no backend, payment, funding, or operating-setting operation. [Backend invariants and chain](results/live-paid-invariants.json) · [Certified module and operating observation](results/live-after-authenticated.json)

Live desktop and 320px browser checks passed, including exact Copy, the mobile 347.15° pose, reconnect and actual native tab-return audio. No rollback was required. The independent 81-file responsive recovery set remains intact. [Live functional acceptance](FUNCTIONAL_ACCEPTANCE.md) · [Matched visual evidence](VISUAL_DIFFERENCES.md) · [Surface inventory](UI_SURFACE_INVENTORY.md) · [Performance and limitations](PERFORMANCE.md)
