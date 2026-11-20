# Rules14 final production preflight

**Ready for separately owner-authorised rollout at the balance independently verified at 21:17 UTC on 2026-11-20.** Keep both existing frontend snapshots. After separate approval, take and verify a new snapshot of the exact corrected Rules13 frontend before installing Rules14. The present slot count and cycle budget support this. This preflight made no production changes.

## Certified predecessor and exact release artifacts

| Surface | Verified identity |
| --- | --- |
| European frontend `s2jxj-liaaa-aaaas-amynq-cai` | `05b9223a1004a1d85fe4d0f2e0e135c04bee0034746ce3d0eab2b9734d9b3c2c` |
| European backend `s5ir5-gqaaa-aaaas-amyna-cai` | `d17fb92e83a01a3f09a4e969ef4b9d3e045053fec818a53dfe91ba139cd1f4fd` |
| Certified Rules13 and configuration | `9879184552562df4a523bc22b3a34c04c6ddea1dbb17c6d9a039937188a3bb15` and `1e1f889bd11beb2c3f494bc53961fddbe09e069589b76287ce1a74b0de952ba0` |
| Current schema7 and source ID | `b1d72af43945fba68412e388626bd4f19050d5586c174e13d12d4b34ff048cc2` and `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |
| Qualified Rules14 source | `231aa3df95e6550c47bb19da643936ce9699a4a3` |
| Rules14 normal backend Wasm | `6efe198e3874a603de02f9b3d344bf692c3f8777930b792febd911561d891da6` |
| Rules14 raw embedded frontend, 77,083,943 bytes | `b2791b620394b77e2b84f9e9d32af1440b368d25d878c65b25d9b6d5d9feb112` |
| Rules14 embedded inventory | `95fba309ac222bc795862822045c373b1ce3a9b67275acbd45e15c7573094989` |
| Rules14 rules and configuration | `6c3aaaddf76cd4b167143a78b7c9d78900b6398d651bf2dfe191881f999ac38c` and `907d00e310f4f4128a53bc0adb964e4f05dbbb9a7c60d745703aeb3c9ec48eab` |

The live frontend read-state and HTTP-v2 check verified all 84 public resources, six gzip variants and 28 alternate GET/HEAD routes. The exact Rules14 source passed six substantive hosted gates plus independent embedded reproducibility, with 70 of 70 installed cases. Fresh hashes match both hosted normal-backend archives and both clean frontend builds. The official disposable Ledger/Index rehearsal covered ten retained payments, seven successful Shouts, rejected actions without speech, independent five-publication replay, two browser observers, and prepared-state and post-admission recovery. [Hosted run](https://github.com/aodl/balls-2-the-wallz/actions/runs/44767961549) · [Installed rehearsal](../INSTALLED_REHEARSAL.md)

The fresh certified backend progressed from 13472 to 13474. Independent replay matched canonical state, events and scores for both new publications. The 21:16:01 UTC head had manifest `3cd05f01ca7288acc64685036c5e921fab17cebceefa306ceb2f24168bb91d23` and world hash `c8e3063b17b0ca80459c967a8e7a169d94aef1c38350a863278524998909fe9d`. Total paid input was 100,000,000 e8s, with cursor 40180669 and zero pending inputs, no staged work and no active transition. The prior Rules13 transition was complete and its metadata confirms adapter8. The official Ledger exclusive height was 40591086 and the Index reported 40591087 blocks synced. Both returned zero e8s for the receiving account. These samples are independent reads and provide no cutover authorisation or future cutoff. The fresh replay covers the two observed intervals. Older activation and receipt history remain supported by the retained release evidence. [Measured and authenticated observations](observations-and-budget.json)

The backend showed 2.368T total and 2.311T liquid cycles, above the 500B cutover minimum. It was running one-tick Trickle at 10 milliticks/second with admission open, pacing seconds 1 and work budget 512. Source binding was healthy. The separate idle funding controller still reported a balance-probe deadline error. Direct Ledger and Index reads succeeded and the receiving balance was zero. Recheck funding phase, live source health and operating status before any cutover. [Measured and authenticated observations](observations-and-budget.json)

## Frontend snapshots and cycle budget

| On-canister snapshot | Size | Actual contents and recovery use |
| --- | ---: | --- |
| `0000000000000000000000000240661b0101`, 10:43:46 UTC | 83.94 MiB | Original mutable legacy frontend `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`. Historic Rules12-era recovery. The asset store is in the snapshot and the Wasm file alone cannot restore it. |
| `0000000000000001000000000240661b0101`, 18:30:57 UTC | 219.93 MiB | Earlier immutable frontend `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7`. Usable before a Rules14 epoch subject to its known old Fire/UX limitations. |
| Corrected Rules13 `05b9223a…` | — | Running canister and independently retained raw Wasm. No on-canister snapshot exists. A dedicated corrected Rules13 snapshot is part of the authorised future deployment. |

Both complete, controller-read downloads independently matched the existing off-canister archives, including metadata, Wasm, heap and stable memory where present. SHA-256 and sizes are published. The archive contents remain private in the workspace. A retained binary, archived snapshot files and a loaded on-canister snapshot supply different recovery paths. The reproduced disposable upgrade and snapshot restore covered the exact corrected Rules13 and Rules14 pair. If the owner later chooses to retire historic snapshots, first preserve their complete archives and the legacy asset inventory in owner-controlled storage separate from this workspace, then rehearse upload, load and full certification on a disposable canister with an appropriate backend identity. The fresh copy comparison is byte-preservation evidence. It does not qualify cold off-canister restore of these actual historical snapshots. [Snapshot hashes and inventory](observations-and-budget.json) · [Disposable upgrade and restore](../embedded-upgrade-recovery.json) · [IC snapshot documentation](https://docs.internetcomputer.org/guides/canister-management/snapshots/)

The initial frontend controller reads showed about 846B cycles and 399B above the freezing floor. The final controller read returned **2,315,397,670,508 cycles**, following a second reading above 2.315T. The increase between the two raw reads was **1,469,118,784,786 cycles**. Its source was not established by these reads. This preflight made no funding call. The module, snapshot list and memory remained unchanged.

The current memory is 549,271,868 bytes, of which 318,635,259 are snapshots. Active Wasm memory is 77,660,160 bytes. Both snapshots occupy 2 of the 10 slots, reserved cycles are zero, and the chunk store is empty. The 30-day threshold and measured idle rate of 14,896,820,130 cycles/day imply a **446.905B** freezing floor and **1,868.493B** cycles above it at the final read. [Controller observations](observations-and-budget.json) · [IC cycle management](https://docs.internetcomputer.org/guides/canister-management/cycles-management/)

| Budget, both historical snapshots kept | Billion cycles |
| --- | ---: |
| New corrected Rules13 snapshot and rounded steady growth, additional 30-day floor | 180.282 |
| Projected 30-day floor | 627.187 |
| Snapshot operation debit allowance | 5.000 |
| Initial full-Wasm upgrade allowance | 190.000 |
| Post-install headroom above projected steady floor | 1,493.211 |
| One compatible forward reinstall allowance | 190.000 |
| One full staged chunk store at peak | 60.524 |
| Additional unallocated contingency | 20.000 |
| **Remaining margin after all allowances** | **1,222.687** |

The observed European upgrade window was 185.047B and the exact Rules14 disposable upgrade window was 184.258B. The last European snapshot increased charged memory by 230,613,831 bytes and idle storage by 5.892B/day. This budget rounds the next snapshot to 231 MB, steady growth to 128 KiB and marginal storage to 26 cycles/byte/day, above the observed 25.55. The model reserves temporary storage for 74 one-MiB chunks once at the worst stage. The disposable stop/load/start, recertification and intervening observation window consumed about 6.59B net. This is context for snapshot rollback. The plan reserves the larger full reinstall because after Rules14 commit the corrected Rules13 snapshot is no longer an epoch-compatible recovery. The budget is an operational margin, not a protocol fee quote. [Budget arithmetic and inputs](observations-and-budget.json) · [IC management interface](https://docs.internetcomputer.org/references/management-canister/)

At the earlier 846B balance the same plan was short by 246.432B. Retiring only the legacy snapshot would have left a 177.775B shortfall. Retiring only the earlier embedded snapshot would have left 66.553B. Retiring both would have cleared the defined contingency by just 2.104B at that sample, so the continued balance and validated recovery would matter. At the verified later balance, retirement and additional funding are unnecessary. Recompute the peak budget with the actual new snapshot, current balance and fresh chunk-store state before uploading.

The exact stage order and post-activation checks are recorded in the [transition and acceptance matrix](TRANSITION_AND_ACCEPTANCE.md).
