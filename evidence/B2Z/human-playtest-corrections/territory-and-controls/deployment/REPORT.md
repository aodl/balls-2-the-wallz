# European frontend deployed — Rules7 retained

**Prelaunch mainnet controls acceptance; existing audio trial retained, not a general-release performance qualification.**

Installed URL: https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/

The owner explicitly approved this frontend-only deployment and live playtest.
The exact frozen frontend was installed and independently verified. It is retained;
no production rollback was needed. Rules9 was neither installed nor activated.
There were no application changes, rebuilds, backend updates, settings/controller
changes, Ledger payments, allowance grants, funding or cycles transfers.
Autonomous game execution continued normally; the world was not frozen/reset.

## Source, installed bytes and targets

| Identity | Exact value |
| --- | --- |
| Qualified source | `7f5eeed7d2b5eacc55bf1eab2abe4ccd579a8ab9` |
| Six substantive hosted gates | [43587243414 — all PASS](https://github.com/aodl/balls-2-the-wallz/actions/runs/43587243414); informational inventory guard excluded |
| Repository/remote head at deployment | `b74710aa7abd1ec9fe51c70961363aa1163bc9a2`; evidence-only continuation, production inputs identical |
| Clean frontend freeze source | `8fdc2a273a93d711bb18ef4bf390f18ff61acf98` |
| Last frontend runtime change | `fbd0cdf30d8577b38bd2e102bd7198b269690a30` |
| Installed JavaScript SHA-256 | `97d8ee0bf61e8b76816511772ab348962d56bbf78b597acc365f48a38725cdc9` |
| Complete75-file inventory SHA-256 | `e9b5c4be2216420f6f70d7c3f33f3ef4596b7d56e05c06eae43171fd629cb8c1` |
| Audio manifest SHA-256 | `d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7` |
| Frontend canister | `s2jxj-liaaa-aaaas-amynq-cai` |
| Unchanged frontend module SHA-256 | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |
| Backend canister | `s5ir5-gqaaa-aaaas-amyna-cai` |
| Unchanged backend module SHA-256 | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Active Rules7 | `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f` |
| Active configuration | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` |
| Unchanged schema | `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790` |
| Unchanged source | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |

The complete inventory includes74 public files and the consumed `.ic-assets.json5`
policy. All75 candidate and74 rollback files were rehashed before installation.
The original build manifest retains its truthful clean freeze source. Only app.mjs,
backend.did, build-manifest.json and configuration-clearance.bin differ from the
previous frontend: +14,326 bytes, total76,248,428. All58 audio assets, HTML, CSS,
icons and security/upload policy are unchanged. No audio encoding, mix or tempo changed.

## Preflight, installation and independent verification

Fresh read-only production checks confirmed Rules7 and the expected Ledger/index,
receiving account, source binding and paid cannon. The complete preceding73 public
assets were downloaded, hashed and compared with the retained74-file rollback.
Mainnet-root certificate-verified module/controller/subnet reads and signed asset
inventory matched expected identities. Both canisters remain on the13-node European
subnet `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`.

The previous staging directory was preserved separately. The approved frozen
`.work/territory-controls/frozen-8fd/frontend` was copied into `.work/s14/assets`
and its exact membership/hashes rechecked. Existing DFX0.31.0 and codex_local were
used without inspecting identity material. The sole production write procedure was:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

[Actual command output](deploy.log) / [exact staging](staging.json).
Installation was complete by the first independent post-install metadata read at
2026-11-14T13:54:51.624Z. DFX's generic observer success wording is not evidence of a
backend upgrade: the command names only observer, and independently verified frontend
and backend module hashes remain unchanged.

[Served-byte verification](served-assets.json) confirms all74 public file hashes,
lengths, MIME types and reviewed security/cache headers. MIME types match the signed
canister inventory, including application/javascript, text/html, text/css,
application/octet-stream and audio/flac. [Final signed inventory](inventory-final.json)
confirms exact keys and identity encodings; all57 FLACs retain identity-only encoding.
All files carry IC certificate headers. [Fresh critical-asset certificate checks](http-certificates.json)
independently verify mainnet-root BLS signatures/delegations, freshness, frontend
canister binding and witness-root equality for HTML, JS, CSS, deployment and both
configuration assets. No root-key fetch/freshness relaxation was used. This checks
certificate/witness roots plus separately pinned exact bytes; a separate full v2
HTTP-expression-path evaluator was not run or claimed.

[Before metadata](metadata-before.json) / [immediate after](metadata-after.json) /
[final metadata](metadata-final.json) confirm unchanged modules/controllers/subnet.
[Authenticated backend preservation](backend-preservation.json) confirms exact
Rules7/config/schema/source, recipient and original funding account/cannon/cell.
The admitted source cursor remained40180669 while autonomous publications advanced.
No balance freeze or equal-world-hash claim is made across normal game advancement.

## Actual live acceptance

These are actual installed-origin sandboxed Chromium checks, not fixture gameplay.
The tested account was declared from the public authenticated cannon record; this
is a local sending-account declaration, not wallet authentication or spending access.
All observed browser POSTs were query/read_state; forbidden POSTs and page errors
were zero in the completed desktop/mobile cases. Native clipboard writes sent no
payment. [Reviewed live results](live-smoke.json).

| Case | Actual result |
| --- | --- |
| 1440×900,390×844,320×640 fresh startup | PASS authenticated Rules7; silent audio startup |
| First verified world with video/interception instrumentation | 8.88s desktop,7.80s390,10.69s320; not a matched hardware benchmark |
| Separate focused startup | 5.71s to verified world; visible exact catch-up wording |
| Historical motion without H+1 | PASS head8441 stayed current through all four samples while presented positions advanced |
| Latest financial authority vs delayed presentation | PASS latest head8441/logical8438 while presentation advanced8437→8437.058 within verified coverage |
| Historical startup acquisition |2 requests,15,796 bytes,494ms, authenticated interval outcome |
| Cannon click | PASS selection/highlight, no camera movement; explicit Focus remains available |
| Fire near-cannon aiming | PASS cursor/heading changes with unchanged camera |
| Direct visible Build-arrow shaft drag | PASS85px along actual visible direction, outside the38px handle; destination unchanged, heading/memo changed |
| Remembered account reload | PASS remembered account/My cannon access retained, no active selection/panel |
| Move default | PASS explicit legal cell1, memo `MOVE 1 1`, real cannon stays at cell0 |
| Additional Build default | PASS explicit legal cell1, visible provisional cannon, exact NEW memo |
| Zoom limits | PASS actual disabled minimum/maximum/overview controls in all three widths |
| Payment scrollability | PASS amount/recipient/memo/payer/fee/warning reachable, including320×350 contracted viewport |
| Native Copy | PASS exact memo arguments and resolved native write promises; clipboard reading remains policy-blocked |
| Read interruption/recovery | PASS22-second browser-only HTTP503 injection, automatic recovery without reload |
| Live action geometry during interruption |0px drift across43 sampled states; camera, wallet fields, proposal and scroll preserved |
| Stale-copy safety during interruption | PASS copying disabled; scene retained and clock stayed within verified coverage |
| Music opt-in/mute | PASS desktop; native music active, muted/inactive at300ms check |

[Startup evidence](startup.json), [catch-up screenshot](catch-up.png),
[verified scene](verified-motion.png), [arrow/reload evidence](arrow.json),
[direct shaft drag](build-arrow-drag.png), [remembered cold reload](remembered-cold.png)
and [actual-speed focused recording](arrow-and-reload.webm).
The first arrow probe sampled the small handle area rather than the extended shaft;
its NOT_OBSERVED result remains in the raw evidence. The final85px stroke probe
exercises the intended board hit region without bypassing foreground UI.

[Quote reproduction](quotes.json) uses nine captured authenticated live world/config
cases and maintained pure quote/memo code. Exact amounts and canonical memo binary
round trips pass. The320 Build payload is the contracted-view repeat; the original
normal-height Build case independently passed its native UI checks. Live amounts:
Fire0.1 ICP, Move0.0001 ICP, additional Build4 ICP. Recipient principal remains
`s5ir5-gqaaa-aaaas-amyna-cai`; the verified receiving account remains
`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
Both Move and additional Build show exactly:

> If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.

Fee information is separate. Rules7 is active; no clearance tooltip/enforcement
claim is shown. Update/Keep preserves copied intent when changing actions. No
quote constitutes a reservation, payment or accepted gameplay command.

Screenshots: [desktop Fire](1440-fire.png), [Move](1440-move.png),
[Build](1440-build.png), [reconnecting](desktop-reconnecting.png),
[recovered](desktop-recovered.png), [390 Fire](390-fire.png),
[Move](390-move.png), [Build](390-build.png), [320 Fire](320-fire.png),
[Move](320-move.png), [contracted Build](320-contracted.png).

### Earlier acceptance attempts retained

[Attempt ledger](acceptance-attempts.json) and the four original logs/failure frames
remain associated with these exact installed bytes. They are not rewritten as PASS:

1. A copy-confirmation wait expired during temporary reconnect; copying was safely
   disabled. The retained verified scene/payment values remained visible.
2. The test tried reading back the OS clipboard, forbidden by the unchanged security
   policy. Native writes were tested without disabling that policy instead.
3. The test waited for a payment card before accepting the real Update/Keep safeguard
   after switching a copied Move to Build. The corrected journey deliberately updates
   the whole instruction set through the normal UI.
4. The desktop case completed, then a390 Move copy-feedback wait timed out. The exact
   original cause was not captured and is **not proven** to be environmental or a
   specific application defect. Explicit foreground/camera/panel settlement and direct
   native click/write audit subsequently pass all mobile actions. No application fix
   was made. Physical-mobile copy confirmation remains an owner acceptance item.

The final completed desktop case is retained from attempt4; the separate complete
mobile-focused run passes both widths and contraction. The composite result names
those scopes explicitly rather than relabelling attempt4's overall FAIL.

## Rollback retained and immediately available on Rules7

Exact previous74-file assets: `.work/territory-controls/rollback/frontend`.
Inventory SHA-256 `b4abc541bf7277dbae865f4269d1abd12cc4d6e0bcba39bcf2b21a875c1ae72f`;
previous JS `cba3eb98c63bb513494500de7f1b79550a1ba4332ee50181529839c6252eed0e`.
[Complete previous inventory](../../../audio-corrective-qualification/frozen-inventory.json).
These bytes were rehashed against the actual pre-install serving and signed inventory.
The old staging and freshly retrieved previous public bytes are additionally retained
under `.work/territory-controls/frontend-deployment-20261114/`.

If a serious regression requires rollback within this controlled operation, preserve
current staging and write new rollback evidence in a separate directory. Replace it with
that complete exact74-file set and consumed policy, rehash every file, then run the
same observer-only/no-asset-upgrade command above. Verify all73 public old assets,
security headers, signed key set (including removal of configuration-clearance.bin),
certificate/source startup and unchanged backend metadata. Never touch the backend
to roll back frontend assets. Stop on ambiguity; do not reinstall/reset or improvise.

No rollback was necessary: installed bytes/certification, verified startup, financial
fields and the completed direct-control cases passed, with no persistent serious
runtime/renderer regression observed. This trial does not claim perfect hardware
performance or explain the uninstrumented earlier mobile timing failure.

## Separate Rules9 decision and remaining limits

Rules9 remains inactive. Any backend upgrade **and activation** needs a new tightly
scoped approval naming one exact Wasm, predecessor, cutover and stop/recovery conditions.
[Existing decision package](../RELEASE_DECISIONS.md) and
[owner cutover procedure](../../../../../docs/specs/B2Z_TERRITORY_CLEARANCE_9.md)
remain proposals, not authority. They distinguish the retained8b853bc7… candidate
and its exact-European local proof from the different hosted8f3288fa… build. An
approval must name the actual artifact, not conflate those identities. Preparation
crosses the old-module blind-rollback boundary; never restore an old paid world,
reverse an epoch or reindex payments to recover.

Audio/music/FX are unchanged. Historical P09 remains **FAIL**, accepted only for the
existing bounded prelaunch trial. No sound storms, hardware FPS, physical phone,
Safari/Bluetooth or subjective listening qualification is inferred from this smoke.
No eligible live collision/launch effects, no-legal-destination scene or multi-enemy
clearance cases were manufactured; source/disposable qualification remains distinct
from live observation.
No real wallet transfer, production integrity attack or Rules9 execution was tested.

Owner playtest: verify zoom disabled states; select then explicitly Focus; aim near
both real and proposed cannons and drag the visible shaft; inspect Move/Build defaults,
arrow, memo and warning; check Copy on actual desktop/phone; test background/return;
listen to unchanged music/transitions/FX and note long-session responsiveness.
External-wallet payment execution remains a separate deliberate owner action.
