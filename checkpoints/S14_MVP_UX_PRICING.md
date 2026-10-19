# S14 arcade UI and prelaunch pricing — staged release

**Local preparation PASS. Mainnet activation NOT_RUN: exact-release review, user CI and separate empty-game reset approval are pending. The live game still costs 10 ICP. Do not send 1 ICP before activation is verified.** No S15 or DTR change was started.

## Review the game

The arena now leads the page, with navy/teal styling, legible territory fills, verified player/ball/territory totals, meaningful buffering/error states and an explanatory empty arena. Joining uses an authenticated ICP price, direction presets and exact address/numeric/hex copy controls backed by the existing memo codec. Cannon tables show certified ownership and occupancy-based next-ball prices; a local cannon/cell selector prepares a legal MOVE reference without claiming wallet ownership. Recent certified receipts have plain-language action labels. Network identity, prices in e8s, hashes, source health, replay controls and diagnostics are collapsed by default. Financial risk remains visible **before** transfer controls. No login, wallet, signing, transaction submission, fonts, UI framework or new runtime dependency was added.

Review screenshots at the requested **viewport** sizes: [1440×900](../evidence/S14/ux-pricing/arcade-1440x900.png), [768×1024](../evidence/S14/ux-pricing/arcade-768x1024.png), [390×844](../evidence/S14/ux-pricing/arcade-390x844.png), and the [paid local cannon/receipts](../evidence/S14/ux-pricing/arcade-paid.png). These are actual sandboxed Chromium captures of the built deployment bundle, served by a disposable asset canister with the upstream local ICP ledger/index. They were inspected visually. **Addresses in these screenshots are valueless local test accounts, not mainnet payment instructions.** The [competing-cannons image](../evidence/S14/ux-pricing/competing-replay.png) comes from an explicitly labelled, hash-verified offline replay of unchanged historical fixtures; it is not IC authenticity or mainnet participation evidence.

The observer’s cryptographic/transport code still uses the configured canister, source binding, configuration/artifact hashes, fresh SDK certificates, predecessor chaining, anti-rollback and explicit resynchronization. Unverified/unavailable configuration and a deliberately wrong local certificate root disable actual copy buttons and show an error. Same-origin clipboard **writes** are explicitly allowed by the asset Permissions Policy; clipboard reads and all other hardened denials remain. Tests exercise native writes with the browser’s ordinary write permission, without reading clipboard contents. Denied/unavailable copy APIs retain the manual exact-value fallback. No CSP or sandbox check was disabled.

## Prices and deterministic history

The editable source is [config/economics/prelaunch.json](../config/economics/prelaunch.json):

| Parameter | Exact e8s | ICP |
|---|---:|---:|
| Join, including first ball | 100000000 | 1 |
| Additional-ball base | 10000000 | 0.1 × active-ball-count² |
| Relocation | 10000 | 0.0001 |

The solo base-tier exercise is **1.1001 ICP plus three wallet fees**. Eligibility/price is evaluated when applied. Payments and excess are retained; refunds and automatic payouts remain unavailable. Area-time scores and the intended future revenue-sharing product are unchanged.

`node tools/generate_economics.mjs` deterministically produces Rust/JS amounts, canonical configuration bytes and a browser-safe supported-hash/file map; `--check` fails on drift in source tests and release preparation. No mutable website JSON determines acceptance. Read [generation/profile instructions](../config/economics/README.md) before future price edits: a new compiled economic profile still needs a reviewed live transition. The integer-only formatter handles all eight fractional digits and u64-sized amounts; memo values never pass through a JavaScript Number.

The historical 10 ICP configuration is immutable at `3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622`. New initialization binds `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42`. Each kernel uses the supported seal/profile’s actual price. Legacy cursors retain their original serialization and interpretation; new private cursors carry the profile marker. Public v3 world/audit/scores/seal formats, publication v6, animation v1, mechanics and source authority are unchanged. Seven historical game vectors and all four recordings (194 files) remain byte-identical. The staged production UI also authenticated the **real, unchanged mainnet backend** in a read-only local preview and correctly showed **10 ICP**, including the hero link; it never substituted the proposed price.

**DTR CHANGES: NONE.** Revision `1f47c1a0a104875bd13475d561b8d5aa10770d99`, packaged client 0.12.0, SHA-256 `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`; no overrides, dependency changes or new DTR push.

## Mainnet transition: Case B, approval required

Read-only preflight on 2026-10-19 authenticated the current mainnet world and queried the official receiving-account index explicitly. At 08:13:17 UTC, segment **1263** had zero cannons, balls, score entries and retained-payment tally; index balance was zero, transactions empty and oldest ID absent. Fresh status/controller-work queries also showed admitted cursor **0**, pending inputs **0**, healthy binding and no source/run error. Both controllers and installed modules remain unchanged. This relies on the configured official index’s contents/completeness and does not rule out a later or not-yet-visible transfer. The machine-readable evidence includes observation timestamps and hashes; raw certificates/artifacts remain under `.work/ux-pricing/`.

An **installed old-to-new local upgrade** preserved the exact old publication bytes and source progress and advanced from five to nine segments, but correctly retained the **10 ICP** configuration. A fresh instance used the new identity. An ordinary upgrade is therefore compatibility support, **not repricing**. This release provides no action to rebind a durable DTR journal identity, and does not rewrite old seals or prices under an old hash. No shared-framework migration is proposed.

To activate 1 ICP, the proposed limited prelaunch option is a **one-time fresh-game reset**, only after explicit approval. It discards the current empty durable timeline/logical time, private continuation and three retained publications; earlier publications are already evicted. IDs, controllers, receiving account and external ledger history remain. Public preflight is not a private-state backup and cannot restore that timeline. No old-module rollback is promised. Open observers must reload into a new authenticated session; anti-rollback remains strict. Downtime spans pause/reset/binding/start/verification; allow several minutes, with no guaranteed bound.

**Do not execute a reset now.** Immediately before any approved action, recheck every account transaction/balance, scores/tally, pending input/source progress, module/controller identity, and confirm no wallet transfer is outstanding or awaiting index visibility. If any participation exists, stop: this empty-game proposal no longer applies. Gameplay pause does not stop reconciliation or prevent public transfers. The [single operator runbook](../docs/operations/S14_OPERATOR.md) contains the explicit gated procedure. Frontend-only approval can deploy the reviewed UI while honestly retaining the live 10 ICP price.

## Verification and frozen artifacts

| Gate | Actual local result |
|---|---|
| Source | 1,187 JavaScript + 137 Python tests; all source/fixture/docs checks PASS |
| Rust | 18 workspace + 8 portable test functions PASS; six new pricing vectors compared byte-for-byte against JS, with interruption/recovery |
| Historical conformance | Public game/host, Life, independent goldens/recordings, formatting and Clippy PASS |
| Normal module | Locked/offline Wasm, exact generated Candid, normal/test export separation, ten host tests PASS |
| Installed IC | Full run retained as **15 PASS / 1 browser FAIL / 1 explicit historical probe ignored**. Corrected browser case rerun PASS using the **identical normal/test module hashes**; no claim that the failed run was green |
| Price transition | Separate reviewed-old-module probe PASS; ordinary upgrade preserves old profile and progression |
| Hosted bundle | 16 browser assertion groups PASS: authentic source/config, exact native copying, three layouts, paid join/ball/move, index lag/fallback, reconnect, upgrade, three fail-closed cases, reduced motion and query/read_state-only transport |
| Replay | Native and JS matched all **37** captured publications; local transactions **1/2/3** assigned exactly once; JS replay work budget 23 differs from installed 512 |
| Bundled replay | 14 HTTP/Web Crypto/CSP checks PASS: competing cannons, annihilation, territory change/elimination, pause, buffering/stall/recovery, reduced motion and no runtime errors |
| New remote CI / mainnet activation | **NOT_RUN**, user review/push and exact-release/reset approval pending |

Source/artifact binding is explicit: frozen release source **`4a9345349a13b80f5900700f4a01066cec6beebc`**. The final evidence/status commit is metadata only. Its 110 documentation links, source inventory, generated-price freshness, six-vector freshness and frozen artifact hashes were checked again; `git diff --check` passed. Files are frozen in `.work/ux-pricing/release-final/`; `.work/s14/assets/` and the deployed backend have not been substituted or updated.

| Artifact | SHA-256 |
|---|---|
| Normal backend Wasm | `2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c` |
| Generated Candid, unchanged | `87ace6e282f328df49e3a343e4108ab62991a0ea94df60c1be395162d02ef8cd` |
| Constructor, unchanged (prices are compiled) | `b97570e0408e3cf50fc2a5099d65012b831e8492c922eddd443430703998a912` |
| Observer app.mjs | `8167a7e596d635aeff38270a3e1f5fd70e17f426ae052a48aec28ec430d41c24` |
| Frozen release manifest | `9d8a546efb66e4988436681639444a8be581f50eaa73911996a1c0043c4228e9` |

The production asset manifest is clean, mainnet-only, targets `s34gv-3qaaa-aaaar-qcifa-cai`, uses `https://icp-api.io` and excludes the local adapter/root. Normal Wasm is 2,151,555 bytes with no fault/synthetic/manual-step exports. Test modules are never deployment artifacts. [Compact evidence](../evidence/S14/ux-pricing/release.json) records file/tool/dependency hashes, scope-qualified gates and raw paths. Earlier build/resize/harness/permission/timeout failures remain under `.work/ux-pricing/`; they were corrected without changing game outcomes or disabling verification. The expanded functional browser case has an explicit 360-second cap; the final pass completed in 163.15 host seconds, not a service-capacity measurement.

Reproduce with existing tools (no remote Git checkout):

```bash
npm ci --ignore-scripts
node tools/generate_economics.mjs --check
node tools/prelaunch_vectors.mjs --check
python3.11 -B tools/check.py source --output .work/ux-pricing/repro-source
python3.11 -B tools/check.py native --output .work/ux-pricing/repro-native
python3.11 -B tools/check.py wasm --output .work/ux-pricing/repro-wasm
TMPDIR=/home/codexdev/tmp LD_LIBRARY_PATH=/home/codexdev/playwright-libs-s08/usr/lib/x86_64-linux-gnu \
  /home/codexdev/dtr-s08-playwright/bin/python -B tools/verify_observer_http.py --output .work/ux-pricing/repro-browser
DFX_IDENTITY=codex_local NPM_CONFIG_IF_PRESENT=true TMPDIR=/home/codexdev/tmp \
  LD_LIBRARY_PATH=/home/codexdev/playwright-libs-s08/usr/lib/x86_64-linux-gnu \
  python3.11 -B tools/verify_s14_local.py --asset-canister \
  --index-wasm .work/s14/upstream/ic-icp-index-canister.wasm \
  --browser-python /home/codexdev/dtr-s08-playwright/bin/python --output .work/ux-pricing/repro-installed
# Explicit old-module probe requires the retained, hash-checked original normal module:
DFX_IDENTITY=codex_local python3.11 -B tools/verify_s14_local.py \
  --test-filter pricing_profile_upgrade \
  --prior-wasm .work/s14/mainnet-acceptance-release-20261019/normal.wasm \
  --index-wasm .work/s14/upstream/ic-icp-index-canister.wasm --output .work/ux-pricing/repro-transition
```

Only mainnet reads were performed during this release. **No deployment, pause, reset, transfer, controller/settings change, subscription funding, remote Git operation or CI trigger occurred.** The live backend remains `15b016…`, join **10 ICP**. User next steps: review screenshots/artifacts, push `checkpoint/s14-mvp-ux-pricing`, inspect CI, then approve the exact release and, separately, the conditional empty-game reset. Do not begin another milestone.
