# European Rules15 production activation

Rules15 committed at **14:33:52 UTC on 21 November 2026**. The game resumed at **14:34:41 UTC** and was cleared to reopen after independent replay and live browser acceptance. Both European canisters are running. The backend is at one logical tick per segment, Trickle at 10 milliticks per second, one-second pacing and work budget 512. Resource protections and controller identities were preserved. No ICP payments or funding operations were initiated.

| Identity | Verified value |
|---|---|
| Frontend canister | `s2jxj-liaaa-aaaas-amynq-cai` |
| Installed embedded frontend SHA-256 | `9f60fc9d77afc7667c07bd27ce423221b290ef01a3be389f13fcc7a7b8e70d1c` |
| Backend canister | `s5ir5-gqaaa-aaaas-amyna-cai` |
| Installed normal backend SHA-256 | `8d7f1a670acb9f89646afbf715d05045079de0f6925367058476c88ac1da9d89` |
| Hosted-qualified source | `35b0952b5e7e5b2015643f6cbfcca1d1cc191a83` |
| Active Rules15 hash | `2c6bee6d7156855ad7565ab62da5b681f2baf70601097580487ff4df4e855899` |
| Active configuration hash | `bd5c34521af5ff9bee15013549af3b265e5293589b0ef833278e580d5d760b4e` |
| Unchanged Schema7 hash | `b1d72af43945fba68412e388626bd4f19050d5586c174e13d12d4b34ff048cc2` |
| Unchanged Adapter9 | `BTZPAY06` |
| Unchanged source ID | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |

All seven substantive hosted gates passed, including the 71-case installed-IC suite and independent embedded-frontend reproduction. The separately labelled production-inventory job was outside qualification. The independently checked installed-disposable case used the same exact normal backend executable as production. [Hosted qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/44903677164) · [Exact hosted installed transition and replay](hosted-qualification.json)

## Installation, epoch commitment and replay

- **13:55–13:57 UTC** — The frontend alone was stopped for a snapshot and restarted. After verifying the complete snapshot and recalculating the budget, the embedded frontend was upgraded via the qualified chunked procedure. All 86 public assets, six gzip variants and 28 alternate GET/HEAD routes passed certified response and body verification. Browser acceptance against the original Rules14 placement policy passed before backend maintenance. [Frontend stage and HTTP proofs](FRONTEND_STAGE.md)
- **14:29 UTC** — With owner and operator tabs closed, the backend paused. One ordinary Rules14 publication finished between the first live read and the pause. Independent replay reproduced its credit accrual with zero inputs. A fresh browser confirmed Copy was disabled and local quantity editing still worked. [Paused predecessor](browser/rules15-cutover-paused-predecessor.json)
- **14:31:53–14:32:01 UTC** — Installed the exact normal backend in upgrade mode with empty Candid arguments. The installed module was independently authenticated. The certified Rules14 head and world, scores, credits, events, accounting and source remained unchanged from the paused baseline. The paused browser check passed again.
- **14:32:43 UTC** — Persisted the first v11 preparation record. The drained ready observation had zero pending work, no staged journal or unfinished continuation and an independently verified Ledger/Index cutoff. The commit used the freshly authenticated Rules14 manifest below.
- **14:33:52 UTC** — Committed Rules15 metadata v11 to checkpoint **14094**. An independent verifier reconstructed the canonical metadata, activation event and score bytes from the authenticated predecessor and matched the successor. The paused Rules15 browser kept Copy closed and local editing available. [Epoch verification](epoch-verification.json) · [Paused successor](browser/rules15-cutover-paused-successor.json)
- **14:34:41 UTC** — Resumed with the same operating settings. Independently authenticated and replayed **14095–14097** from checkpoint 14094. State, events and scores matched byte for byte in all three, with zero new paid inputs. At the 14:38 UTC operator sample, admission was open, the source was healthy, and the journal and pending queues were empty. [Independent replay](rules15-independent-replay.json) · [Final run and source observations](post-activation-preservation.json)

| Cutover record | Verified value |
|---|---|
| Sealed Rules14 predecessor (14093) | `fa79ab899c26239312be79c420fff5433fa76ae8e6e78d87ea9267f898398544` |
| Rules15 successor and transition (14094) | `a16d827e5aa09b26c8d8f8a9cd002744a557394d753efed3290514ff46f51935` |
| v11 metadata SHA-256 | `8281f403e1d280ac3d82b12b8fa022bab3790c8013da7f034d56925a028d7203` |
| Equal pre/post canonical world SHA-256 | `8e8dfda03e6e390a293472196abc77d18670033d9ba2a0562afd42d88a420ceb` |
| Official Ledger exclusive cutoff and Index coverage | `40615784` |
| Retained source cursor | `40180669` |
| Sealed source anchor | `bfa329cf678c4265a56d670773c4173e3e0f662601f7251c5a5c18d51c279bae` |

The canonical Schema7 bytes, credit values and 100,000,000 e8s paid total were preserved at commit. The official Ledger receiving balance stayed at 0 e8s and the official Index account response was byte-identical through all five verification stages. Positions 40180627 and 40180668 were visible in official account history. The canister's bounded receipt lookup returned the same `UnknownOrNotRetained` disposition before and after cutover, so no canonical receipt bytes are available for those positions from that endpoint. Funding remained Idle, with the same historical expired-balance diagnostic and unchanged conversion totals. [Financial and source comparisons](post-activation-preservation.json)

## Live acceptance

| Coverage | Result |
|---|---|
| Toroidal cannon clearance | Live query and browser both rejected cell 997, three tiles from cannon 1 at cell 0, and allowed cell 996 at distance four. The read-only Cannon Move quote to 997 proved the moving cannon excludes itself and priced `MOVE 1 997` at 10,000 e8s. |
| Cannon and Diverter construction | Live browser verified both builds at cell 996, exact 4 ICP and 0.1 ICP quotes, the four canonical Diverter orientations, Shout on both and rejection of a forbidden Shout delimiter. |
| Placement with an existing Diverter and first Join | Exact hosted disposable Ledger/Index evidence covers paid Diverter Move, paid Cannon Move, enemy clearance, automatic first Join, existing structures and successful and rejected receipts. The live paid world had one cannon and one ball without a Diverter, and acceptance used live reads and clipboard operations without issuing payment. |
| Desktop 1440×900, 390×844, 320×640 | Authenticated startup, automatic Fire, canonical heading, Shout, amount/recipient/memo through the native clipboard, Keep/Update, guide and all four compass orientations passed. East-up 320px used explicit Locate before the contracted aim-to-pinch sequence. Both pointers captured and released, zoom changed from 64 to 42.48, and the draft survived. |
| Isometric view and interface | The live captures show a front-facing muzzle from North and the opposite side of the upright cannon from South. East and West retain tile and minimap proportions. The circular compass, cycle indicator, compact Shout and payment information are visible while the action pane is open. |
| Reconnect and visibility | A controlled browser-only query interruption disabled Copy and recovery preserved the session, camera, draft, panel and playback queue. A real same-window hidden/visible Chromium tab transition refreshed operational observations and also preserved the session. |
| Audio and certified delivery | The embedded frontend was unchanged during backend activation. All 60 FLACs decoded in the production browser, the music sampler recorded nonzero PCM, and a missing route displayed the branded HTTP 404 with JavaScript disabled. |

[Desktop and mobile interaction data](browser/rules15-context-and-compass.json) · [Live placement and Shout](browser/rules15-spacing.json) · [Reconnect](browser/rules15-reconnect.json) · [Hidden tab](browser/rules15-hidden-tab.json) · [Audio and 404](browser/rules15-audio-404.json)

[North](browser/rules15-north-up.png) · [East](browser/rules15-east-up.png) · [South](browser/rules15-south-up.png) · [West](browser/rules15-west-up.png) · [320px rotated pinch](browser/rules15-320-rotated-pinch.png) · [Distance-four Diverter preview](browser/rules15-distance-4-diverter.png)

Touch results are from Chromium emulation. Physical-device testing and P09 dense-scene audio/performance remain unqualified. No human-paid Rules15 gameplay was tested on production.

## Resources and recovery

| Measurement | Frontend | Backend |
|---|---:|---:|
| Final total cycles | 1,925,958,660,049 | 2,041,910,063,336 |
| Final backend runtime liquid cycles | — | 1,985,133,240,296 |
| Memory including retained frontend snapshots | 1,010,685,514 bytes | 40,262,405 bytes |
| Freezing threshold | 30 days | 30 days |
| Estimated freezing floor from reported idle debit | 800,551,044,450 cycles | 56,778,767,040 cycles |
| Margin after compatible recovery and contingency reserves | 821,407,615,599 cycles | 550,133,240,296 cycles above the conservative Trickle floor |

The frontend snapshot and installation windows had net debits of 2.247B and 184.030B cycles respectively. The backend's first post-install read was 105.164B cycles lower. The later paused-ready read put the net decrease from pre-install through ready at 21.361B. These are observed balance differences over separate windows. The backend recovery reserve uses 115B against the larger observation plus 70B for drain and contingency. No daily gameplay burn rate is inferred from this short run. [Cycle and recovery budget](post-activation-recovery-budget.json)

The frontend chunk store is empty and all four snapshots are retained. The newest snapshot `0000000000000003000000000240661b0101` contains the previously installed Rules14 frontend, and its metadata, Wasm, Wasm memory and stable memory were downloaded and independently hashed. The snapshot is now historical. Production frontend recovery after Rules15 commitment uses a forward installation of the retained exact Rules15 embedded frontend. The first persisted v11 preparation record is the backend decoder boundary, so recovery uses the exact Rules15-compatible normal backend or a separately qualified forward fix. [Snapshot verification](snapshot-verified.json) · [Qualified recovery procedure](../RELEASE_PLAN.md)
