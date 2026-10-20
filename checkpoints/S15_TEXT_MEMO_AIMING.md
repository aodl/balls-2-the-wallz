# S15 — text memos and full-circle aiming

**PASS, deployed 2026-10-20.** The [public observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) now prepares readable ICRC-1 commands with circular aiming and one action panel. The existing backend was upgraded first; the existing observer then received the frozen assets. No reinstall, reset, canister creation, controller change, Event Horizon change, price change, DTR change, fund transfer by Codex or remote Git action occurred.

The backend module is **`c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4`**. The [reviewed evidence](../evidence/S15/release.json) records checks, preserved failures, exact artifacts and deployment observations. Raw output remains under `.work/s15/`. **A real mainnet text-memo gameplay transfer has not been verified.** The user sends all gameplay transfers.

## Direction-control diagnosis

Right was selected by default, not uniquely permitted by the backend. All four old buttons had handlers; all inherited disabling from the transfer fieldset when operational checks failed. The actual browser showed `disabled=false` on each button but `matches(':disabled')=true` on all four, with only Right `aria-pressed=true`.

The live backend reported an official-index call failure: insufficient liquid cycles, 3,386,607,392 available against 110,114,361,537 required at that failed call. Autonomous work had also stopped advancing. An isolated HTTP browser using the original reviewed UI confirmed healthy pointer/keyboard interaction on all four buttons and selection surviving redraw. The user topped up backend cycles; source health and progression recovered. No backend direction restriction was changed.

## Commands and preparation

The [normative text contract](../docs/specs/BTZ_TEXT_MEMOS.md) defines adapter v2:

- `BTZ ANGLE 37.5` and `BTZ ANGLE 225`: create a cannon or buy another ball under existing sender/payment rules.
- `BTZ MOVE 83`: relocate under existing eligibility and ownership rules.
- Original encoded length 1–32 bytes; ASCII encoded as UTF-8. Only ASCII SPACE may surround the command; interior separators are one SPACE. Keywords are ASCII case-insensitive.
- ANGLE is unsigned decimal 0–359.99, at most two fractional digits. MOVE is unsigned decimal u32; the kernel checks board bounds/ownership. Empty/non-ASCII/malformed UTF-8, controls, exponents, NaN, overflow, extra commands and trailing junk reject.

Hundredths of a degree map by `floor((c * 65536 + 18000) / 36000) mod 65536`. Screen-clockwise directions remain 0 right, 90 down, 180 left, 270 up. The UI emits uppercase canonical text, without a degree symbol in the memo, and draws the existing integer heading/velocity. Wire input 360 is invalid; the local input may wrap it to 0.

A present ICRC blob wins over the numeric field. Valid old binary blobs remain supported. Numeric decoding applies only when the blob is absent; malformed/empty blobs never fall back. The adapter produces the existing eight-byte command and `BTZPAY02`. Original transaction IDs, accounts, amounts and raw Candid transaction digests remain intact. Invalid memos produce ordinary retained-payment outcomes and never wedge later history. Explicit v1 helpers retain historical raw-history replay; persisted canonical inputs/pending rows are never reinterpreted.

The same aim pad serves Start a cannon and Add a ball. It supports tap, drag with pointer capture, touch, numeric input, arrow keys/modifiers and cardinal snaps. Default selection is 37.5°. Publications, resize and reconnect preserve local selection. Aiming works while disconnected; actionable copying requires fresh verified source/configuration/state and healthy operation.

The action card freezes its complete action/cannon/amount/destination/memo. Certified price or eligibility changes disable copying until explicit refresh. Additional-ball prices use certified active counts, and MOVE uses both an owned-cell list and a dashed inspection overlay with board clicking. Selection never proves identity or submits a command. The primary action copies text; Advanced copies exactly the same UTF-8 bytes as hex. Some wallets lack the required memo controls. No login, wallet connection, signing, allowances, account linking or transaction submission was added.

## Verification

| Check | Result |
|---|---|
| Normal locked npm installation; generated economics drift | PASS |
| Final source suite | PASS: 1,268 JS and 137 Python tests, independent references and historical goldens |
| Native checks | PASS: 20 workspace and eight portable Rust tests, game/host/Life conformance, format and Clippy |
| Normal host/Candid/Wasm | PASS: 11 host tests; unchanged Candid and normal method set; no synthetic/manual-step exports |
| Real upstream local ICRC-1 → index → adapter → game | PASS: original UTF-8 bytes/IDs through actual ledger and index; seven transactions admitted once; Rust/JS replay uses actual canonical inputs/seals |
| Exact deployed-module upgrade | PASS: two players, completed publications and two queued normalized payments; publication/cursor/inbox/controllers preserved; old rejected text stays rejected; subsequent text buys a ball |
| Existing HTTP/Web Crypto/CSP replay checks | PASS: 14 browser checks |
| Corrected built deployment browser | PASS: 15 groups, real text join/ball/MOVE receipts once, selection, copy, stale prices, disconnect, upgrade/reconnect and certificate failures |
| Corrected actual dfx asset hosting | PASS: 19 groups, native clipboard permissions, certified asset responses/MIME/CSP and the same payment/aim checks |
| Public mainnet observer | PASS: actual deployed asset bytes, standard SDK mainnet root, authenticated 1 ICP/source, pointer/touch/keyboard, copying, layouts, outage/reconnect; 51 POSTs all query/read_state |

Failures are retained, not reclassified: the initial aggregate had **17 PASS / 1 browser FAIL / 2 explicit historical probes ignored**. The failing assertion read a collapsed Advanced address with `inner_text`; it now reads text content. Two later runs exposed test capture losing retained chunks during concurrent PocketIC progression. A fence around the disposable test's catalog/chunk comparison fixed that race; the browser's own recovery remains unfenced. Both corrected browser variants pass. The original aggregate is still recorded as FAIL.

The requested historical `verify_s09_local.py` entrypoint also records FAIL because it names the removed `pocketic_host` target. The current account-index application's `s14_index` tests were executed instead; no old scanner/laboratory was revived. Remote CI is **NOT_RUN** until the user publishes this branch.

## State-preserving mainnet upgrade

The user explicitly authorized this deployment and resolved the initial cycle shortage. Immediately before upgrade, Codex paused autonomous work and captured fresh standard-root certificates, publication/state/events/scores, official-index account history, configuration/source identity, source cursor, pending inputs, controllers and module. The account history and payment tally were empty; the upgrade also preserved an already running private kernel stage.

The exact predecessor was `2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c`. The frozen replacement was installed with **mode upgrade**, without constructor/reset arguments. Before/after segment **5392**, publication, state, events and scores were byte-identical. Configuration/source descriptor, controllers, cursor 0, pending-input count 0 and running kernel stage were preserved. Cadence resumed unchanged: two ticks/segment, one-second callback pacing, work budget 512.

The backend upgrade enabling adapter v2 preceded the observer asset upload through the existing reviewed asset-only procedure with `NPM_CONFIG_IF_PRESENT=true`. Frozen production assets match the actual public responses. Certificates showed heads **5408 → 5412** in the browser. After the browser closed, fresh certified heads advanced **5426 → 5429**, with run/source errors clear and official index binding intact. Event Horizon remains disabled; independent 60-second fallback remains active.

Frozen provenance: `.work/s15/release-frozen/manifest.json` and `observer/build-manifest.json`, clean source **`8765320b15b563c2e1ade9b561fec480579768fd`**. Normal Wasm is 2,155,157 bytes. Candid SHA-256 remains `87ace6e282f328df49e3a343e4108ab62991a0ea94df60c1be395162d02ef8cd`. A prior attempted freeze correctly rejected edits during preparation and is explicitly invalid; only `release-frozen` is the deployed release.

## Prices, destination and screenshots

Prices remain **1 ICP join**, **0.1 ICP × active-ball-count²** additional ball, **0.0001 ICP** relocation, wallet fees separate. Configuration remains `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42`. Payments/excess are retained; refunds and automatic payouts remain unavailable.

- ICRC-1 owner: `s34gv-3qaaa-aaaar-qcifa-cai`.
- Default subaccount: omitted or 32 zero bytes.
- Derived AccountIdentifier: `344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`.
- [Public desktop](../evidence/S15/aim-desktop.png), [public mobile](../evidence/S15/aim-mobile.png), [public disconnected aiming](../evidence/S15/aim-disconnected.png).
- [Certified disposable local MOVE preparation](../evidence/S15/move-desktop.png); [offline kernel motion playback](../evidence/S15/motion-playback.png). These two scenes are separately qualified and contain no mainnet gameplay payment.

## Motion findings and remaining limits

Continuous integer trajectories and exact collision/territory/score rules remain unchanged. A concrete presentation bug discarded impact effects at verified segment boundaries; bounded ephemeral effects and the last-event label now survive the transition, without changing game state.

A 14-second local scene used 32 non-cardinal balls and two competing territories from existing kernel-generated artifacts. Historical artifacts/pins were unchanged; copied timing metadata used one second/tick and playback rate 1. The actual WebM was played normally in Chromium: 345 decoded frames inspected, 217 instrumented rendered frames (15.5 fps on the loaded recording host), no measured discontinuity violations. Exact event/track/state checks remain the stronger deterministic boundary. This is offline content consistency, not IC authenticity or a 60-fps guarantee. Raw video and decoded-frame observations remain in `.work/s15/motion-playback-reviewed/`.

**A production deficit remains a separate cadence finding.** Two logical ticks require at least seal/work/publish callbacks, paced one second each, so production can remain below nominal observer consumption of one tick/second. Before the test capture fence, a 111.3-second local observation retrieved 62 verified ticks and consumed 66, draining its initial four-tick buffer and recording stalls. This is a finite loaded-host observation, not a throughput benchmark. The public post-deployment observer also reached its verified head and stalled. A buffer cannot repair a permanent deficit. No physics, scheduler, cadence or speed multiplier was changed in this UX release.

The X reference returned **403 Forbidden**. The clip was not viewed or matched. Mainnet readable-memo payment verification remains user-operated; no real gameplay funds were sent by Codex. No new milestone begins automatically.

**DTR CHANGES: NONE.** Pin remains `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client 0.12.0, normal immutable locks/install.

Implementation commits: `d85f58f`, `61b1dec`, `8765320`. The final evidence commit is in the branch log. User-owned publication:

```sh
git push -u origin checkpoint/s15-text-memo-aiming
```
