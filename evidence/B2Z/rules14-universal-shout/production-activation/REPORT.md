# European Rules14 production activation

The exact Rules14 frontend was installed at 21:48:54 UTC on 2026-11-20. The existing backend was upgraded while paused at 21:53:53 UTC. The Rules14 epoch was separately committed at 21:55:34 UTC and autonomous play resumed at 21:56:38 UTC. All changes used the existing European canisters and the authorised controller procedure. [Preflight and acceptance contract](../production-preflight/REPORT.md) · [Hosted source and all 70 installed cases](https://github.com/aodl/balls-2-the-wallz/actions/runs/44767961549)

| Identity | Value |
| --- | --- |
| Frontend `s2jxj-liaaa-aaaas-amynq-cai` | `b2791b620394b77e2b84f9e9d32af1440b368d25d878c65b25d9b6d5d9feb112` |
| Embedded public inventory | `95fba309ac222bc795862822045c373b1ce3a9b67275acbd45e15c7573094989` |
| Backend `s5ir5-gqaaa-aaaas-amyna-cai` | `6efe198e3874a603de02f9b3d344bf692c3f8777930b792febd911561d891da6` |
| Exact qualified source | `231aa3df95e6550c47bb19da643936ce9699a4a3` |
| Certified rules | `6c3aaaddf76cd4b167143a78b7c9d78900b6398d651bf2dfe191881f999ac38c` |
| Certified configuration | `907d00e310f4f4128a53bc0adb964e4f05dbbb9a7c60d745703aeb3c9ec48eab` |
| Existing schema7 | `b1d72af43945fba68412e388626bd4f19050d5586c174e13d12d4b34ff048cc2` |
| Existing source | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |
| Source adapter | 9, `BTZPAY06` |

## Frontend recovery and qualification

Fresh controller reads confirmed the previously reported elevated frontend balance. It held at 2,315,112,037,302 cycles before the snapshot, roughly 28 minutes after the second preflight read above 2.315T. Reserved cycles were zero and the state was stable. Those controller readings establish spendable headroom. The provenance of the earlier external increase remains unverified. This release made no funding call.

The frontend was briefly stopped, snapshotted and restarted. New snapshot `0000000000000002000000000240661b0101` contains exact corrected Rules13 module `05b9223a1004a1d85fe4d0f2e0e135c04bee0034746ce3d0eab2b9734d9b3c2c` and is 219.94 MiB. The complete download matched IC metadata file sizes and the exact module hash. Heap, stable memory and metadata hashes are recorded. The originals `0000000000000000000000000240661b0101` and `0000000000000001000000000240661b0101` remain listed. The chunk store was empty before and after the upgrade. [New snapshot verification](snapshot-verified.json) · [Retained snapshot list](snapshots-installed.txt)

With the new snapshot retained, measured canister memory was 779,895,171 bytes and the current 30-day freezing floor was 623,663,811,000 cycles. After allocating two 190B full installs, the estimated steady storage growth, one peak chunk store and an unallocated 20B cushion, the installation preflight still had **1,228,562,846,435 cycles** of margin. The frontend upgrade window measured a net debit of 185,076,748,340 cycles. Immediate post-install memory was 779,972,547 bytes and the idle estimate was 20,790,770,505 cycles/day including all three retained snapshots. [Budget recalculation](budget-after-snapshot.json)

All 85 public assets passed independent IC-v2 GET and HEAD, six gzip representations and 28 alternate routes, including security headers, branding, favicon and genuine HTTP 404. Chromium confirmed a 404 without JavaScript, decoded all 60 FLAC files and produced nonzero audio PCM. While the backend still ran Rules13, the new frontend passed automatic Fire, exact native Copy/paste, Update/Keep, all camera orientations, guides and the contracted East-up 320px pinch at the three requested viewport widths. The live owned-tile tests preserved bare Diverter directives and hid nonlaunch Shout under Rules13. [IC-v2 asset proof](front-installed-http.json) · [Rules13 browser run](browser/rules13-fire-touch.json) · [Rules13 construction and gating](browser/rules13-construction.json)

## Backend state-preserving transition

Owner tabs were confirmed closed for the backend upgrade. Fresh browser operational observations on both sides of the module change confirmed Rules13 remained paused, native Copy was disabled, manual Copy stayed closed, and local quantities could be edited. The independently verified paused publication 13496 and state, event and score bytes were identical after the normal Wasm upgrade. Accounting totals, last successful conversion, funding flags, source binding and run configuration matched. [Module preservation](module-preservation.json) · [Financial and source comparison](module-finance-preservation.json) · [Fresh paused check](browser/paused-postmodule.json)

An ordinary source poll observed in flight after installation was allowed to settle. The controller then confirmed no pending source records, admitted inputs or staged journal work, and the bound official Ledger and Index were healthy. The first version-10 preparation persisted at 21:54:57 UTC. Ready status recorded official **Ledger exclusive cutoff 40591858** and **Index coverage 40591860**. A further official Ledger and Index read covered that cutoff. The cursor remained **40180669**. The authenticated predecessor manifest and sealed source anchor matched before commitment.

| Transition witness | Exact value |
| --- | --- |
| Sealed Rules13 publication | 13496 |
| Predecessor manifest | `3e576e3463019a893b8739a3bb6daea5622fb717fad366c47121403c9fd2f2e9` |
| Rules14 checkpoint | 13497 |
| Successor manifest and transition hash | `323f73fa5a06a700deacf4005aa60b00503da0d4857bcc86bce640577739bd89` |
| Shared exact Schema7 state hash at commitment | `5c0681e8b05df0ec4fc71198b1fbdc30d62c3ebcec022b6cc3adf417ef8a1b92` |
| Metadata SHA-256 | `01e0c9d85109106ebbec545324bab99ae6f0815549790bc20fee1df2f7b6c1a5` |
| Source anchor | `bfa329cf678c4265a56d670773c4173e3e0f662601f7251c5a5c18d51c279bae` |

The verified checkpoint bound the exact predecessor publication and manifest, reused its canonical world bytes and changed only the required epoch and source adapter. Independent reconstruction matched the checkpoint event and score bytes. The single credit entry and **100,000,000 e8s** received total were preserved. The official Index account response was byte-identical before and after, with positions 40180627 and 40180668, and the Ledger receiving balance stayed at **0 e8s**. The historical receipt query returned `UnknownOrNotRetained` before and after because the queried older payment lies outside the online retained publication window. This comparison checks preserved current history and disposition without claiming an old receipt was newly served. The funding controller remained idle with its existing balance-probe timeout diagnostic. Direct source and account queries succeeded. [Epoch and world reconstruction](epoch-verification.json) · [Official Ledger/Index and metadata proof](ledger-epoch-preservation.json) · [Postcommit finance comparison](commit-finance-preservation.json)

After authenticated Rules14 Copy-disabled acceptance while paused, the controller resumed the existing settings with generation 12. Trickle is 10 milliticks/second with one logical tick, pacing seconds 1, work budget 512 and resource protection active. No setting values, payment prices, controllers or funding arrangements were changed.

## Live acceptance and recovery

| Acceptance area | Result and scope |
| --- | --- |
| Running epoch and deterministic replay | Independently replayed new certified Rules14 publications **13498 and 13499** against the committed checkpoint. Canonical state, events and scores matched. Both intervals had zero new paid inputs. Source cursor 40180669 and paid totals remained the same, with no pending inputs. |
| Desktop, portrait and narrow | Actual European Chromium passed at 1440×900, 390×844 and 320×640. Automatic Fire generated the exact initial memo. Native clipboard Copy and paste matched all three fields. Keep and Update preserved or replaced the whole packet explicitly. |
| Rotation, picking and input | All four camera orientations, selected-ball guide and native emulated East-up 320px aim-to-pinch passed. The pinch preserved the draft and released both distinct touch captures. The hosted browser gate also covered the retained 320×640 / 347.15° pose. |
| Shout and UTF-8 | Live read-only Fire, Cannon Build and Diverter Build generated exact Shout memos. Overlength UTF-8 was fit to the 32-byte allowance without splitting the complete grapheme. A forbidden delimiter disabled Copy. The same construction test on Rules13 kept Diverter Shout hidden. |
| Other Shout actions and payment effects | The live world had one active cannon, one ball and no Diverter. The installed disposable Ledger/Index run separately exercised Join, Fire, Cannon Build, Cannon Move, Diverter Build, Reorient and Diverter Move with Shout. It verified target/structure association, exact-once receipts, unchanged 10,000 e8s modification prices, rejection without speech and agreement by two authenticated browsers. |
| Degraded delivery | A browser-only query outage disabled payment Copy and preserved the verified session, clock, queue, camera, draft and panel geometry. Recovery restored current authority. Actual hidden and foreground transitions in an ordinary same-window Chromium context preserved the authenticated session and verified playback. |
| Delivery, audio and rendering | The existing IC-v2, branding and true 404 proofs were supplemented by postcommit Chromium audio decode, nonzero music PCM, unchanged FLAC bytes, camera guides and real app captures. |
| Unchanged limits | Mobile touch evidence is Chromium emulation. Physical-device behaviour and P09 dense-audio performance remain unqualified. No new paid production gameplay was tested. |

The actual live browser checks made only reads and local edits. No transfer, funding operation or mutation request came from the observers. [Rules14 browser checks](browser/rules14-fire-touch.json) · [Construction and Shout](browser/rules14-construction.json) · [Audio and 404](browser/rules14-audio.json) · [Degraded delivery](browser/rules14-reconnect.json) · [Native visibility](browser/rules14-hidden.json) · [Independent running replay](running-replay.json) · [Proof for all seven paid actions](../INSTALLED_REHEARSAL.md)

The final frontend status showed **2,127,627,171,441 cycles** and a 30-day floor of **623,723,115,150**. Its remaining margin after reserving one 190B compatible full reinstall, 60.524B peak chunk storage and 20B contingency was **1,233,380,249,571 cycles**. The final backend controller read showed **2,278,069,615,938 liquid cycles**. The observed backend upgrade window net debit was 20,981,241,736 cycles and includes ordinary observation overhead. [Complete operations and resource observations](operations-and-resources.json)

The deployed frontend recovery artifact is the same qualified Rules14 raw Wasm. All historical snapshots remain retained. The corrected Rules13 snapshot is a historical recovery artifact after commitment. Backend recovery from the version-10 preparation boundary uses the same qualified Rules14 normal module and durable source/journal state. Neither canister was rolled back during this release. No production ICP payment or funding transfer was issued.
