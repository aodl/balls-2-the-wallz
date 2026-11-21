# Rules15 corrective candidate

Rules15 is implemented in the isolated `feature/b2z-rules15-spacing-orbit` worktree. The live European canisters still authenticate Rules14. No production module, setting, snapshot, funding arrangement or payment was changed.

## Placement and history

Rules13/14 purchase admission called a positive friendly-structure predicate. The observer reused that predicate in its quotes and searched the three-tile neighbourhood of the same structures for default destinations. Both behaviours matched the old protocol, so changing only the visual rejection text or negating a local predicate would have left incompatible policies.

The exact Rules15 configuration uses a new bounded exclusion against both structure types and all owners, plus the existing independent exclusion against enemy territory. A destination three tiles away is rejected on a side, diagonal, or across the seam. A destination four tiles away meets the spacing rule. The typed identity of the moving structure is excluded. Occupancy at the same cell and the remaining topology, active-island, enemy and price checks are still enforced. Historical sites remain legal world state. First Join keeps the deterministic maximin search and unchanged footprint, with a clearance check at the spawn centre.

Rust admission and quote paths, independent JavaScript execution, authenticated configuration selection, observer quotes and placement highlighting use the corresponding per-epoch policy. Rules15 default movement looks outward from the source over cooperative toroidal rings in canonical distance and cell order. It rejects cells outside owned active territory and can find destinations beyond the old radius. It can examine the whole board over multiple bounded slices in the worst-case no-site search.

The controller-only schema7 transition adds a version-11 preparation and epoch commitment through the existing cutover machinery. Adapter9 / `BTZPAY06`, memo and Shout grammar, prices and schema7 stay the same. The first durable preparation is the strict old-decoder boundary. [Normative policy and protocol](../../../docs/specs/B2Z_STRUCTURE_SPACING_15.md)

## Immutable developer candidate

| Item | Exact identity |
|---|---|
| Clean runtime and asset source | `3e6596cf85f7f5c2f44d3853327479139b0acca4` |
| Rules15 | `2c6bee6d7156855ad7565ab62da5b681f2baf70601097580487ff4df4e855899` |
| Configuration | `bd5c34521af5ff9bee15013549af3b265e5293589b0ef833278e580d5d760b4e` |
| Schema7 | `b1d72af43945fba68412e388626bd4f19050d5586c174e13d12d4b34ff048cc2` |
| Normal developer backend Wasm | `251d03b9d204792b2287538318d013a232590c9c1e883183c896e2e7383e6ea7` |
| Bundled frontend JavaScript | `dae7c10d471338c076bf50c94ea6f856aad0bd875e7c23d4259fa82be78f82cf` |
| Raw embedded frontend Wasm | `b4c779a813a92e89fc57cbf83050b81d8d8fc3be0255ea660504e88f52cd35ec` |

The frontend Wasm is 77,095,335 bytes and embeds 86 public files plus six gzip representations. The 89-file staging manifest also identifies three private build inputs. All 61 audio inventory entries, including the canonical manifest and 60 FLACs, are unchanged. See [Wasm metadata](artifacts/embedded-module.json), [embedded inventory](artifacts/embedded-inventory.json), and [frozen input provenance](artifacts/provenance.json). Local binaries are retained in `.work/candidate-embedded-a/frontend.wasm` and `.work/release-backend/normal.wasm`.

## Local verification

- Source conformance, generated configuration, 59 native workspace tests, native Clippy and exact generated canister Candid passed.
- The final JavaScript run passed all 2,042 tests with two test workers. An earlier concurrent run timed out on the existing two-second forecast budget. The same unchanged test passed in isolation and in the complete rerun.
- Chromium passed the 320px quantity/editor matrix at 640, 350, 300, 240 and 180px heights, including DPR 3 at 640px, the exact 347.15° pose, native aim-to-pinch, Update/Keep and copy readiness. The orbit fixture also passed the rotated Chromium aim-to-pinch check with the old heading preserved during the pinch.
- The exact embedded frontend passed a disposable same-ID upgrade, every asset and gzip HTTP-v2 proof, HEAD, route and negative certificate checks. Chromium loaded it against the real Rules14 backend using read-only requests, decoded all 60 FLACs and displayed a genuine, keyboard-operable 404 with JavaScript disabled. Two clean embedded builds matched byte-for-byte. Separate single-byte changes in HTML, JavaScript, CSS, SVG and FLAC each changed the module hash. Restoring the staged bytes reproduced the original module.

[Reproducibility and mutation proof](artifacts/embedded-reproducibility.json) · [HTTP-v2 results](artifacts/installed-frontend-http.json) · [Browser audio and Rules14 results](browser/embedded-rules14-and-audio.json) · [Rotated native touch results](browser/rotated-pinch-results.json)

## Disposable backend rehearsal

The exact registered developer normal Wasm passed an installed Rules14-to-Rules15 transition with the pinned official disposable Ledger and Index. The version-11 boundary left the canonical world at `7c45f521e1dff748facbe9098342192b83141f16884adc5f83a32b44a7f36b4d` on both sides. The source cursor, exclusive Ledger cutoff and Index completeness were all **3**, with Adapter9 on both sides. The rehearsal preserved credits, finance and the Rules14-built Diverter at cell 4007.

The first persisted preparation was rejected by the old strict Rules14 decoder in a disposable downgrade attempt. Reinstalling the exact normal successor at the ready boundary successfully restored the same transition, world and financial evidence. The normal successor then committed and produced a new segment. Ten genuine disposable Ledger payments gave ten receipts with no duplicates. Four spacing failures retained their full paid amount and emitted no Shout. The accepted cases covered moving both structure types, building both, and automatic Join into a clear neutral neighbourhood. Independent JavaScript replay matched all seven authenticated publications, including exact state, events and score hashes.

[Installed-case checks, cutover metadata, receipts and independent replay](installed-qualification.json)

## Visual and production evidence

[Matched Chromium screenshots, paid-panel test and geometry explanation](VISUAL_COMPARISON.md)

[Read-only authenticated production identity](live-rules14.json)

[Resource estimate, snapshot retention and future deployment instructions](RELEASE_PLAN.md)

## Release decision

The branch has no completed Rules15 hosted workflow. Repository instructions reserve the remote Git operation for the owner. The workflow retains the substantive gates and the embedded frontend gate. Its runtime and installed jobs must produce byte-identical hosted normal Wasm, and the installed case must pass on those bytes. The developer Wasm identity above is not a substitute for that hosted identity. Keep production on Rules14 until the exact-source gates pass and a separate rollout is authorised.

Physical-device input and audio testing and the documented P09 dense-scene limitation remain outside the scope of the software-rendered browser captures.
