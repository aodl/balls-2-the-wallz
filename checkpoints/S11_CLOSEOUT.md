# S11 closeout — standalone DTR extraction and BTZ consumer

11 October 2026. **The remote DTR extraction, exact consumers and behavior-preserving BTZ regressions pass. The BTZ branch is ready to push; fresh current-revision BTZ CI remains BLOCKED pending authorization to push.**

## Result

The reusable DTR implementation is in `/home/codexdev/src/dtr` at commit `71e59e93cf49a3656689679b538b4c3f138787f8`, tree `c7b4e138a1c5cc43744e984e6e4081fa483d9383`. The public repository is `https://github.com/aodl/dtr.git`; its verified remote head is documentation commit `869404401216624c3145bbbfcaebf725bb618785`, directly above the implementation. The local DTR branch additionally contains documentation-only closeout commits and is at `ef80f1912e3a8472ae706996b6cd8ae02955d8ae`; those commits have not been pushed. A fresh detached checkout of `71e59e9…` matched the local implementation commit/tree and passed 186 JavaScript tests, 29 Rust tests, formatting and Clippy. Remote workflow runs `38173294124` on `checkpoint/s11-dtr-extraction` and `38173327599` on `main`, both at `8694044…`, completed successfully.

BTZ is in `/home/codexdev/src/btz` on `checkpoint/s11-dtr-extraction` and was substantively tested at `4a0e1aef904e99a41948d70ff885f3ad839e2b03`, tree `83b2802e86711e59a34de9b2059fc10d12db54fc`. DTR owns generic seals/timeline interfaces, source fencing models, wire/coordinator crates, bounded publication/storage/client code, certificate-verification integration, sequencing/playout and competitive Life. BTZ owns mechanics, commands/payment interpretation, economics, scores, projection/rendering, the observer application and concrete canister. `runtime-lab` remains in BTZ because it assembles the BTZ kernel and payment classifier.

Every normal BTZ Rust manifest names `https://github.com/aodl/dtr.git` with exact revision `71e59e93cf49a3656689679b538b4c3f138787f8`; all four Cargo locks resolve the same source. The clean Rust consumer started with an empty Cargo home and disabled system/global Git URL rewrites, then fetched and compiled the four DTR packages from GitHub. No normal build depends on an implicit `../dtr` checkout.

JavaScript consumes the committed `@dtr/timeline-runtime@0.11.0` distribution. It records:

- SHA-256 `dc460b1a5349f022d0ba789fd7e647271f41402de2e57a9c8c4ba860834a4bf8`
- npm integrity `sha512-lql0NVgK93P26YRvjhfiCXBIK4ZKJ68F0CZBPCrxZAR0+OqMkxROoheOnLtVy8VcTgbiwGz5S1dVxG5vgLIp6w==`
- npm shasum `c0cb67ca94560575be20a9c14aabf92ddf58b553`
- 20-file package inventory, source revision and source tree

An independent fresh clone normalized directories to `0755` and regular files to `0644`, ran `npm ci --ignore-scripts`, and reproduced the tarball byte-for-byte with Node 24.15.0/npm 11.12.1. A disposable JavaScript consumer then generated a lock, installed the generated package, and passed its public-API test outside both source trees. `package-lock.json` was the only lock genuinely changed by the final package correction; all Cargo locks already named the intended exact remote revision.

## Executed evidence

| Tier | Result |
|---|---|
| DTR remote commit/tree versus local extraction | **PASS — exact match at `71e59e9…` / `c7b4e13…`** |
| DTR JavaScript / Rust / Life | **PASS — 186 JS and 29 Rust tests** |
| DTR format, Clippy, package inventory | **PASS — 20 packaged files** |
| DTR remote CI | **PASS — runs `38173294124` and `38173327599` at `8694044…`** |
| External clean consumers | **PASS — generated-package JS API and four remote Rust packages** |
| BTZ source and tooling | **PASS — 1,166 JS and 85 Python tests** |
| BTZ root/native Rust | **PASS — 18 root and 7 portable tests** |
| Runtime Wasm, format, Clippy, generated Candid | **PASS** |
| Sandboxed HTTP browser/native Web Crypto | **PASS — 11 assertions** |
| Installed-Wasm PocketIC regressions | **PASS — 10 tests, one live test orchestrated separately** |
| Concurrent live PocketIC/browser | **PASS — segments 0–10 and 11 browser assertions** |
| S09 genuine-certificate snapshot regression | **PASS — 12 assertions** |
| Explicit same-version recovery | **PASS — current `6327056…` normal Wasm over the identical current module** |
| Historical S10-to-S11 upgrade | **PASS locally — source-built `e4405bb…` baseline upgraded to `4a0e1ae…`** |
| Published BTZ CI at old `3c24edb…` | **FAIL — browser job only; source/native/Wasm/live jobs passed** |
| Fresh BTZ CI at current branch | **BLOCKED — requires an authorized push** |

The explicitly labelled same-version run used BTZ source commit `632705688b726563be76b279642f2fa687b48886`, tree `74ef98d55cdf8f3309969c33e92630decd27fafa`, and installed the current normal module over the same current normal module. Both source-bound artifacts had SHA-256 `f7732368fa5ddfc980a0874a9d8a974a2bebc46f9634f71b91e03af86f2fbaef`. It passed 10 installed-Wasm tests, the separately orchestrated live test with 11 browser assertions and the certified snapshot with 12 assertions. This is same-version recovery evidence only.

The distinct provenance-bound cross-version run used the source-built S10 module from commit `e4405bbdcfccb11533d8a2a98ce709e2d8d02ed0`, tree `42c9f5c7b01b94bd1fe6da40cc55bc34513f7220`. Its recorded Wasm hash was `0dc9d72b080dea976e3a66490f28f84e19ab4a87215b374ac84c1975af7b9b8c`. The run checked that the BTZ source revision, tree, remote and clean-worktree state remained unchanged before starting PocketIC. The replacement was source commit `4a0e1aef904e99a41948d70ff885f3ad839e2b03`, tree `83b2802e86711e59a34de9b2059fc10d12db54fc`; its normal Wasm was `f7732368fa5ddfc980a0874a9d8a974a2bebc46f9634f71b91e03af86f2fbaef` and its test-hook Wasm was `1a285b339c4bcb6c6872ab6cb206aac3b8bb92b7c140f734d10953ad4c997cfd`. Wasm builds are not claimed to be byte-reproducible.

The installed-Wasm suite took 143.103 seconds. The live concurrent slice took 97.741 seconds and the genuine-certificate snapshot browser regression took 17.695 seconds. The owned PocketIC process was healthy and cleaned up.

The live run used two local funding accounts, a payment after first publication, empty-input progress, archive traversal, dropped-hint fallback, short retained catch-up, long authenticated resynchronization and native replay of captured seals. It recorded 30 ledger calls, 2 archive calls, 3 retained publications/14,672 bytes, 15,126 event bytes, 51,998 publication/artifact bytes, input high-water 3, final 3 balls/2 cannons and 3,398 work units (732 maximum in one segment). These are local observations, not cycle or mainnet capacity claims.

The S10 module installed first and upgraded to S11 during unfinished work and at idle/ready boundaries; S11 also upgraded immediately after publication. Stable state, scores, sealed inputs, source cursor, autonomous run state, publication bytes and certificate verification survived. The generated Candid remains byte-identical with SHA-256 `587bddc30097bbbcbe732818b084c98c721292fe38f994898a8ecc145675352c`. Wrong trust roots and corrupted live responses failed closed, and the retained-predecessor verifier continued rejecting unauthenticated optional renders.

## Remote state and remaining gate

DTR is fully available at the real remote and its current workflow passes. BTZ workflow run `38173694389` at the older remote commit `3c24edb8979c5e1ab523f9e1d35beb1062718efe` is correctly recorded as **FAIL**: only `Browser HTTP and Web Crypto` failed, because that workflow lacked `npm ci`; the source, native, Wasm and live-local jobs passed. The current branch contains the dependency-install fix and the corresponding local browser check passes.

Fresh CI for the current BTZ branch, including a fresh-runner source-built historical gate, is **BLOCKED** until the user authorizes pushing it. No push, force-push, registry publication, public-network deployment, GitHub setting change, real wallet/funds action, payout or production-controller change occurred. Production scalability, settlement, trust-root policy, capacity and reproducible-Wasm gates remain separate.
