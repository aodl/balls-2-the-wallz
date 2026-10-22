# Current preparation — prelaunch self-funding, not deployed

**2026-10-22:** B2Z's small autonomous Ledger/CMC worker is implemented and
verified locally, with durable transfer/notification recovery and controller-only
observed balance/status. **Mainnet actions: NONE; real ICP transfers: NONE.**
The current backend/frontend and paid game are unchanged. Activating the frozen
normal module requires separate authorization because its scheduled sweep moves
real value. No reset, controller change, DTR runtime change or dependency update.

Source (1,349 JS / 138 Python), native, 22 host/Candid tests, strict normal export
inventory and Clippy PASS. Final installed-IC gate: **25 existing + seven funding
cases PASS**, with eight explicitly ignored historical predecessor probes;
exact captured JavaScript replay: 77 publications PASS. Those full regressions
ran on the one-borrow precursor; the final Clippy correction changes only
transfer argument ownership during encoding. The final frozen module separately
passed all seven funding cases, 22 host/Candid tests and strict Clippy. Initial browser receipt
and staged-scene failures plus the 900-second aggregate timeout are retained;
the unchanged full rerun passed. Maintenance adds ~14M cycles per five-minute
zero-balance check over a paused-worker baseline in PocketIC, with zero game
segments. These are local measurements, not mainnet burn forecasts.

Clean implementation `642d45e8fc461450fb877e20ed2cf61be36d7ac5`, frozen normal
Wasm `55ccda3d024ea5ba9cfd7cc7b5e61eb5d55c7864ce7843ef6bf462fc018aeea3`.
[Report](checkpoints/B2Z_PRELAUNCH_SELF_FUNDING.md) /
[reviewed evidence](evidence/B2Z/treasury/verification.json) /
[policy and proposed activation](docs/operations/PRELAUNCH_SELF_FUNDING.md).
DTR stays pinned to published S14 `1f47c1a`, client 0.12.0; its independent local
master audit changes documentation/refs only. The authenticated transition is
not implemented; 32×32 torus and accepted cannon heading remain staged.

The preceding verification correction was user-published and CI run
[39735811814](https://github.com/aodl/balls-2-the-wallz/actions/runs/39735811814)
passed at `d491c204e04bc45491ed6146ab274f678cf78757`. **New treasury CI:
NOT_RUN** until the user publishes this branch. No remote Git operation occurs
in this preparation.

---

# Verification closeout — arena tooling correction, 2026-10-22

Published `af212f2` CI failed source conformance and standalone browser navigation; its installed-IC/native/Wasm/packaged-consumer jobs passed. The focused correction updates the explicit endpoint inventory and navigates Settings through the actual modal UI. Final standard source/browser/installed-IC gates PASS locally: 1,349 JS, 137 Python, 14 browser checks, 25 installed-IC tests with eight unchanged ignored predecessor probes. The first integration receipt timeout is retained alongside the unmodified passing rerun. [Correction and standard gates](checkpoints/B2Z_ARENA_VERIFICATION_FIX.md) / [reviewed results](evidence/B2Z/arena-verification-fix/verification.json). Production deployment evidence below remains historical and unchanged. No live canister operation or DTR change is part of this patch. The 32×32 torus and persistent heading remain staged, pending a separately scoped authenticated history/schema transition. Fresh patch CI is NOT_RUN until user push.

---

# Current status — arena and shared pacing live; torus staged

**2026-10-21:** viewport arena, native control dialogs, camera/minimap and bounded cycle-aware pacing are live on the existing two canisters. Backend module `53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec`; frontend clean source `c0cfc29eccffcc849c21a75fb3d3fa3ccc851c3c`. In-place upgrade preserved certified world/scores/retained bytes/source and unfinished work. Prices, memos, receiving account and controllers are unchanged.

Final mainnet trace: 89.55s, 0.246 produced / 0.248 displayed ticks/s, **zero stalls**, Conserve 0.25 target; public certificates/assets/copy/reconnect pass. Matched local same-state cost is **42.9% lower per segment**; Economy/Conserve spend **48.0%/73.0% less per virtual second**. Latest active management balance 1,390,887,289,912 cycles (2026-10-21T22:42:53.845649+00:00; reservations can affect active readings). Official Index healthy, cursor 39,526,412, one paid cannon/ball, received 1 ICP. No mainnet transfer/reset or remote Git action occurred.

**DTR CHANGE REQUIRED before world activation.** The 32×32 torus, persistent accepted cannon heading and placement helper pass local replay, actual ledger/index and browser/upgrade tests. They remain staged because the pinned DTR cannot authenticate a rules/schema epoch transition. Live world remains 16×8 bounded v3; historical direction stays neutral. No DTR changes or hidden overrides. [Report/screenshots/videos](checkpoints/B2Z_ARENA_CAMERA_AND_PACING.md), [reviewed evidence](evidence/B2Z/arena/verification.json), [staged contract](docs/specs/B2Z_TORUS_V4.md). Local regressions: 1,349 JS / 137 Python plus workspace/native/host Rust PASS. New remote CI: NOT_RUN until user push.

---

# Current status — empty-arena idle mode deployed

**PASS, 2026-10-21.** The existing backend now runs `1510d8677464944d0d2ddad53370f339b75ab627ff0e3c8180467a3e63fa84f3`, followed by verified frontend assets. Empty enabled arenas stop simulation timers while preserving certified publications; the independent 60-second ICP Index poll wakes gameplay for every admitted payment. Active physics, cadence, economics, memos, source/history and DTR remain unchanged. Stable maintenance touches allocated chunk keys.

Measured mainnet empty-arena consumption fell **97.27%**, from **85.34M to 2.33M cycles/second**. During 208.04 seconds with our browser closed: zero simulation callbacks/segments, three Index calls, clear errors. Final balance **2,349,043,894,555 cycles**. Same-state local active cost fell **184.07M → 181.14M cycles/segment**. The user resolved the initial cycle-liquidity blocker; Codex transferred no funds and changed no threshold/controllers.

Upgrade preserved current/retained publication and artifact bytes, world, scores, configuration/source identity and queued/staged work. The already-ready segment completed once after resume, then head **10888 / 10,889 completed segments** stayed fixed. The live observer clearly shows healthy idle and permits authenticated transfer preparation. Mainnet certificates, text/hex copying, all aim quadrants, responsive layouts and reconnect pass without browser errors or gameplay submissions. Join remains **1 ICP** and the receiving account is unchanged.

[Report and screenshots](checkpoints/B2Z_EMPTY_ARENA_CYCLES.md) / [reviewed evidence](evidence/B2Z/cycles/verification.json). Local source, game, recovery, upstream ledger/index, exact predecessor upgrade, replay and corrected browser checks pass; the earlier aggregate browser assertion failure is retained honestly. DTR CHANGES: **NONE**. New remote CI and real mainnet gameplay transfers are **NOT_RUN**. Local checkout remains `/home/codexdev/src/b2z`, branch `checkpoint/b2z-identity-and-memos`; only the user pushes. No next milestone is started.

---

# Current status — B2Z naming and prefix-free memos

**Deployed and verified, 2026-10-20.** B2Z is the sole current product name. Canonical wallet memos are `ANGLE 37.5`, `ANGLE 225` and `MOVE 83`; adapter v3 retains published old forms and preserves queued canonical rows. Eight-byte ASCII commands are distinguished from legacy binary by actual magic/layout. Active paths, packages, symbols, tools, specifications and deployment aliases use B2Z/b2z. Historical protocol bytes and archived evidence remain unchanged.

The existing backend now runs `187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1`. Backend-first upgrade and subsequent asset-only frontend upload preserved both principals, controllers, source progress, configuration identity and all three retained publications/artifact bytes. Join remains authenticated 1 ICP and the receiving account is unchanged. Public certificates, native copying, full-circle input, responsive layouts and reconnect pass. Autonomous segments advanced 7167 → 7172 with our browser closed; final certified snapshot reached 7205, with source/run errors clear.

The checkout is `/home/codexdev/src/b2z`, branch `checkpoint/b2z-identity-and-memos`. Source/native/Wasm/browser/real local ICP ledger/index and exact installed-S15 recovery gates pass. [Report/screenshots](checkpoints/B2Z_IDENTITY_AND_MEMOS.md) / [evidence](evidence/B2Z/release.json) record exact scope and artifacts. DTR CHANGES: NONE, pinned revision unchanged. New CI is NOT_RUN pending user push; no real mainnet prefix-free memo payment was sent or verified. Existing intermittent buffering remains; no physics or cadence change was made. No next milestone starts automatically.

<!-- ARCHIVED_STATUS -->

The following S15/S14 records are immutable historical context; current paths and naming are specified above and in the current README.

# Current status — S15 text memos and circular aiming deployed

**PASS, 2026-10-20.** The existing backend was upgraded in place to normal Wasm `c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4`, then the existing observer received the frozen readable-memo/aiming assets. No reset, reinstall, new mainnet canister, controller/price/Event Horizon change, DTR modification, fund transfer by Codex or remote Git action occurred. The user resolved a pre-existing backend liquid-cycles shortage before deployment.

The [public observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) authenticates the unchanged **1 ICP** profile and receiving account, and prepares `BTZ ANGLE 37.5` / `BTZ MOVE 83` through one action card. Full-circle pointer/touch/keyboard aiming works while disconnected; copying remains gated on current verification/health. Existing binary/numeric commands remain compatible. Card refresh is explicit when certified price/eligibility changes. No wallet connection, signing or transaction sending was added.

Mainnet upgrade preserved byte-identical publication/state/events/scores at segment **5392**, the source/configuration identity, controllers, source cursor, pending-input count and an already running kernel stage. Same cadence resumed. Standard-root public browser verification/copy/aim/reconnect checks pass; after browser close, certified heads advanced **5426 → 5429** with clear source/run errors. **A real mainnet text-memo gameplay payment remains NOT_RUN; the user sends all real gameplay transfers.**

Local checks pass: **1,268 JS / 137 Python**, 20 workspace / eight portable Rust tests, independent game/host/Life conformance, normal Wasm/Candid and 11 host tests. Actual upstream local `icrc1_transfer` bytes pass through the actual index into canonical admission, certified game outcomes and exact Rust/JS replay. The exact deployed predecessor upgrade probe passes with two players and two normalized pending payments; old invalid text remains invalid. Corrected built/asset-canister browser variants pass **15 / 19 groups**. Initial aggregate/browser races and the obsolete S09 wrapper's missing target are retained honestly in evidence; the original aggregate is not relabelled green. New CI is **NOT_RUN** until user push.

A small impact-effect reset at segment boundaries is fixed. Existing production cadence can still undersupply the observer and cause stalls; no physics, scheduling/cadence or speed multiplier was changed. The X video returned 403 and was not viewed/matched. DTR remains unchanged at `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client 0.12.0. [Report and screenshots](checkpoints/S15_TEXT_MEMO_AIMING.md), [reviewed evidence](evidence/S15/release.json), [text contract](docs/specs/BTZ_TEXT_MEMOS.md).

Source/artifacts were frozen from clean commit `8765320b15b563c2e1ade9b561fec480579768fd` under `.work/s15/release-frozen/`. The final report commit changes documentation/evidence only. User publication: `git push -u origin checkpoint/s15-text-memo-aiming`. No next milestone is started.

---

The S14 status below is preserved historical context. Its staging/approval instructions are superseded by the S15 deployment and the current task's explicit authorization.

# Current status — S14 arcade UI and 1 ICP mainnet activation

**Mainnet activation PASS, 2026-10-19.** The user confirmed CI 39306785701 passed at `717069497c7e9beb90c37e70320a8b946524531f` and explicitly approved the exact release and one-time empty-game reset. After the user resolved a liquid-cycles shortage, fresh certified state/index/inbox checks again proved no transactions, players, scores or payment obligations. The existing observer received an asset-only upgrade; the existing backend received the authorized frozen module `2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c`. Controllers, principals, receiving account and official index remained unchanged. No funds were transferred by Codex.

The real [mainnet observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) authenticates the standard SDK mainnet root, source/configuration/artifacts and shows **1 ICP**, correct recipient and verified segments **8 → 9 → 10**, with no browser errors. After closing the browser, completed segment counts advanced **18 → 23**. Source/run errors are clear; 60-second fallback is active, Event Horizon disabled, and retention remains three/8 MiB. [Activation evidence](evidence/S14/ux-pricing/mainnet-activation.json) records exact artifacts, authorization, controllers, balances and raw logs/screenshots. This is a no-prize controlled MVP; retained payments/refunds/payout disclosures remain unchanged. No S15 or DTR changes.

The preparation notes below describe the earlier staging/approval state and are superseded by this activation record. Do not repeat the one-time reset.

CI browser follow-up: user-reported run 39288849453 failed the default hosted browser on the missing loopback `Permissions-Policy` header. This was reproduced from `browser.log` before editing. The narrow test fix validates generated hardened production policy in both modes, requires its HTTP header only for actual asset hosting, and retains native exact clipboard writes and all certificate/payment checks. CI now uploads the nested browser log/results. Local full default integration passes **16 tests, zero failures, one intentionally ignored historical probe**; its 12 browser groups and replay of **43 publications**, transactions 1/2/3 once, pass. Source passes **1,187 JS / 137 Python**. Backend/observer/economic/DTR implementation and normal module hash are unchanged. [Corrective evidence](evidence/S14/ux-pricing/ci-closeout.json) preserves the red/green runs. Fresh GitHub CI is **NOT_RUN** pending user push; no mainnet operation or reset approval occurred. Original frozen provenance remains intact; clean-commit manifests must accompany subsequent deployment approval.

The [release report](checkpoints/S14_MVP_UX_PRICING.md) contains screenshots, verification scopes, immutable artifact identities and the transition finding. [Machine-readable evidence](evidence/S14/ux-pricing/release.json) records the tested source **`4a9345349a13b80f5900700f4a01066cec6beebc`**, dependencies, hashes, mainnet read-only observations and preserved failures. The final report/status commit changes metadata only. Frozen artifacts remain in `.work/ux-pricing/release-final/`.

The new observer leads with the real 16×8 arena, authenticated player/ball/territory summaries, understandable direction/address/memo preparation, exact ICP amounts, current occupancy-based ball prices and legal owned-cell MOVE references. Technical details are collapsed. Native clipboard writes are explicitly permitted for this origin; all other hardened Permissions Policy denials, CSP, SDK certificate validation, source/configuration binding, anti-rollback and resynchronization remain. No wallet, login, signing or transaction submission exists. Actual built assets were inspected at 1440×900, 768×1024 and 390×844. A read-only preview against the real mainnet backend correctly displayed its **10 ICP** price, rather than the proposed 1 ICP.

[Canonical economics](config/economics/prelaunch.json) defines the fresh profile: **1 ICP join**, unchanged **0.1 ICP × active-ball-count²** additional ball and **0.0001 ICP** move. A small checked generator supplies identical exact Rust/JS integers and canonical configuration bytes, with drift checks. Historical 10 ICP configuration, goldens and recordings remain unchanged. New configuration hash: `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42`.

Local gates pass **1,187 JavaScript, 137 Python, 18 workspace and eight portable Rust test functions**, including six new pricing vectors. Public game/host and Life conformance, formatting/Clippy, normal Wasm/Candid and ten host tests pass. The full installed run is honestly retained as **15 PASS / 1 browser FAIL / 1 explicit historical probe ignored**; its corrected hosted-browser case passes separately using identical normal/test module hashes. That rerun passes 16 browser assertion groups and native/JS replay of **37 publications**, transactions 1/2/3 exactly once. The separate old-module transition probe passes; bundled replay passes 14 HTTP/Web Crypto/CSP checks. New remote CI is **NOT_RUN**. Details and raw paths are in the report; no failed run is reclassified as green.

**Ordinary upgrade preserves the old pricing identity.** The installed old-to-new probe preserved exact historical publication bytes and advanced five to nine segments while retaining 10 ICP. Activating 1 ICP therefore requires the explicitly proposed one-time fresh-game reset, not an ordinary upgrade. No DTR journal rewrite or generic repricing mechanism was added. The [single operator runbook](docs/operations/S14_OPERATOR.md) gates that destructive action on separate approval and immediate fresh empty-account/no-outstanding-transfer checks. Frontend-only approval could deploy the UI while retaining the authenticated 10 ICP price.

Read-only mainnet observations on 2026-10-19 found official-index balance/history empty, certified segment 1263 with no cannons, balls, scores or received-payment tally, and later status at 08:33 UTC with admitted cursor/pending inputs zero and healthy autonomous progression (1,528 completed segments). This finite observation cannot exclude later or index-lagged payments. Backend module remains `15b016b9d156a1b90feeeb9be610fc7ba51d9413509c3c7161ab8e13faacb703`; both existing controllers and receiving account are unchanged. No mainnet write, deployment, pause, reset, payment, controller change, remote Git operation or CI trigger occurred during this release.

Frozen normal Wasm: **`2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c`**. Candid remains `87ace6e282f328df49e3a343e4108ab62991a0ea94df60c1be395162d02ef8cd`. DTR is unchanged at `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client 0.12.0, package SHA-256 `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`, through real immutable locks and normal installation.

**Payments and excess are retained; refunds and automatic payouts remain unavailable.** Accrued area-time scores and the intended revenue-sharing product remain. Operator cycles, gameplay ICP and Event Horizon funding are separate. Pokes are disabled on the current deployment; independent 60-second index fallback remains healthy. No capacity, finality, actual cycle-burn or lifetime promise is made.

Next: user reviews screenshots/artifacts, pushes `checkpoint/s14-mvp-ux-pricing`, checks CI, and approves the exact release and any conditional reset. Stop until approval; never reset a participating account. Earlier reports and evidence remain historical and unchanged.
