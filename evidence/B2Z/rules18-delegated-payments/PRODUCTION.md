# Rules18 European production activation

Rules18 was activated on 23 November 2026 using the normal backend qualified
from source `351d96d7059f7f84957af1470c86a7028c588392`. The same backend bytes
passed the standard installed-IC test and the dedicated Ledger/Index suite.
[Standard verification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109997)
· [Delegated qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109925)

| Canister | Exact installed Wasm SHA-256 |
| --- | --- |
| `s2jxj-liaaa-aaaas-amynq-cai` | `da3fccaaec5d2c1828a9ca53bdf979cd6d8a95be9398b8c4ad17ee8d53d49b55` |
| `s5ir5-gqaaa-aaaas-amyna-cai` | `43095677376fe4f3c66185b1cf185ef9e161b5c44320609b93e134a771f4bf59` |

The owner confirmed real Internet Identity sign-in, a signed Ledger query
and the same principal after signing out and back in. The installed frontend
kept its original bytes. Independent IC-certified checks authenticated the
bundle and the 404 for the alternative-origins route. The permanent anchor
is the exact frontend canister origin. [Identity checks](IDENTITY_ORIGIN.md)

## State-preserving boundary

The owner closed all B2Z tabs. A fresh paused browser showed Copy disabled
while local quantity editing remained available. After the exact normal
backend upgrade, the Rules17 certified publication and its state, event and
score artifacts were byte-identical. Source reconciliation finished before
preparation. The official Index initially lagged the cutoff by one block.
The existing reconciliation timer refreshed the watermark and reached the
drained ready state. Commitment used the authenticated sealed predecessor.

| Boundary item | Value |
| --- | --- |
| Rules17 predecessor manifest | `35efeffa4dee7e11c0a11e33c872441054abe742da20af51a196b6691161fbc2` |
| Rules18 successor manifest | `3522a540c0f4237972c6568e1126d072f8c224deb516459fec62ee1d7144c567` |
| Ledger exclusive cutoff | `40,655,726` |
| Index watermark used for commitment | `40,655,733` |
| Preserved account cursor | `40,647,923` |
| Preserved paid total | `108,100,000 e8s` |

Independent epoch replay verified the metadata-version-14 checkpoint and the
Adapter11 to Adapter12 (`BTZPAY09`) change. Removing the new empty recipient-
bound authorization registry and restoring the schema tag reproduced the
entire Schema9 state byte-for-byte. This includes all four Reservoirs, the
daily tariffs, all entity and territory data and accrued credits. The source
descriptor and sampled retained receipt queries matched across the upgrade and
commitment. [Epoch and resource evidence](production-activation.json)

## Live acceptance and recovery

The backend resumed with one tick per publication, Trickle at 10 milliticks
per second, one-second pacing and work budget 512. Payment preparation was
available again. Independent replay matched new state, event and score bytes.
Read-only Chromium checked the sign-in entry and exact native manual Copy
at 1440, 390 and 320 px. The live signing check was a read-only Ledger query.
Approval, transfer and game receipt qualification used the disposable
Ledger/Index environment. [Live browser checks](production-browser.json)

The backend installation window used 24.030B cycles. Final signed backend
liquid cycles were 2.464T, leaving 1.114T above the 1.350T operational and
recovery floor. The frontend retained 97.655B cycles beyond its freezing floor
and the combined 304B recovery, staging and contingency allowance.

Both production canisters report zero snapshots. Keep the exact Rules18
normal backend for upgrade-based recovery and retain the qualified Rules18
frontend for a compatible reinstall. The first persisted metadata-version-14
preparation was the old decoder boundary. The strict Rules17 module belongs
only to recovery before that boundary.
