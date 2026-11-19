# Owner-controlled immutable frontend release

The current European frontend is `s2jxj-liaaa-aaaas-amynq-cai`. Deployment authority has not been granted for an immutable-frontend production upgrade. All writes in this qualification are confined to a disposable observer asset canister. The European paid backend remains on Rules12 independently of this rollout.

Before an owner-authorised change, verify the real controller, routing module, signed existing inventory, stored cycle balance, liquid margin, subnet support for the measured raw Wasm, and coverage of recovery storage. Retain the exact raw candidate Wasm, per-file inventory, and current legacy version and inventory independently. Take and verify a snapshot of the stopped frontend alone through the qualified snapshot procedure, then restart it before the upgrade unless the approved rehearsal requires otherwise.

Install the explicit raw `frontend.wasm` onto the existing frontend principal in ordinary upgrade mode with empty arguments and no post-install asset sync, using the chunked code procedure qualified in this rehearsal. Immediately compare the certified installed module hash with the exact raw artifact SHA-256. Check every body and representation, real HTTP 404, normal Rules12 startup and browser audio. Gate future Rules13 activation separately on its own approved backend executable, economics, authenticated source and upgrade results.

The legacy module's Wasm does not contain its stored website. Recovery to legacy requires the exact compatible snapshot and asset/certificate checks. After the architecture is embedded, rollback to an earlier compatible saved Wasm is a whole-code operation. A bad module, unexplained hash, missing recovery snapshot, failed certification or resource shortfall blocks production. Exceeding the platform limit requires a new design decision and never authorises silent loss of an audio file.

## Exact deployment inputs and procedure

- Use the raw `frontend.wasm` identified in [qualification](QUALIFICATION.md) and independently rehash the download. Export the full [embedded inventory](embedded-inventory.json) to the release record.
- Create an isolated operator directory with no asset sources or build hooks. Address the exact frontend principal explicitly. The disposable command was `dfx canister install <frontend-principal> --network <verified-network> --mode upgrade --wasm <absolute-raw-frontend-wasm> --argument '()'`. The normal 2 MiB ingress limit makes direct code installation in one message unavailable for this module. The tested DFX 0.31.0 procedure handles chunking. The module hash must be the hash of the raw bytes.
- Keep the independently confirmed legacy snapshot ID at the same canister for the first transition. The disposable restore sequence was canister stop, snapshot load with that exact ID, then canister start. Check the returned module hash, actual asset bytes and certificates. Never substitute a frontend snapshot for backend recovery.
- Preserve a previously verified embedded module for later releases. Do not rebuild for rollback. Check the intended saved module remains compatible with the backend's already active certified identity.
