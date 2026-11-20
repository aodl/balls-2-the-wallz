# European embedded frontend migration preflight

**Decision.** The embedded frontend can be released independently of Rules13. Its frozen JavaScript uses the existing production backend binding and passed authenticated browser checks against active Rules12. This preflight was read-only. A production change requires the owner's release decision and a newly listed recovery snapshot before installation.

## Verified on 20 November 2026

| Check | Result |
| --- | --- |
| Frontend | `s2jxj-liaaa-aaaas-amynq-cai` running legacy Wasm `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`. The controller read succeeded. |
| Existing website | The signed asset list, all 80 exact identity bodies and their IC-v2 proofs match the retained legacy inventory. A cache hit returned a dated certificate and was rejected. Cache-busted reads passed the same freshness and pinned-root checks. |
| Candidate | Raw Wasm `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7`, 77,062,823 bytes. The retained local raw image and the latest hosted qualification download are byte-identical. The code section is 1,181,993 bytes. |
| Backend | `s5ir5-gqaaa-aaaas-amyna-cai`, Rules12 Wasm `2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13`. Certified publications 13017 and 13055 retained the established rules, schema, configuration and source identity. Both signed operational replies reported running Trickle, one tick per publication and zero pending records. |
| Snapshot and recovery | The controller listed the frontend's snapshots successfully. The list was empty, so a slot is available. A snapshot must still be taken and listed during the authorised migration. A disposable same-ID restore recovered the exact legacy module and all 80 public bodies. |
| Chunked installation | DFX 0.31.0 installed the exact raw candidate on the disposable application subnet through the management canister's chunked path. The production frontend's read-only `stored_chunks` call returned an empty store. The module is below the platform's 100 MiB total and 12 MiB code limits. |

[Read-only observations](production-preflight-observations.json) · [Exact module and content qualification](QUALIFICATION.md) · [Disposable legacy restore](exact-candidate-legacy-recovery.json) · [Snapshot API](https://docs.internetcomputer.org/guides/canister-management/snapshots/) · [Chunked installation API](https://docs.internetcomputer.org/references/management-canister/) · [Platform limits](https://docs.internetcomputer.org/references/resource-limits/)

## Cycle headroom

The controller reported 1,225,551,958,554 cycles and zero reserved cycles on the **frontend**. At the reported 3,113,303,884 cycles per idle day and 30-day freezing threshold, the current-state spendable headroom is approximately 1.132T cycles after allowing for 93.4B cycles of freezing floor. The frontend uses 88,042,128 bytes. Its certified subnet identity is corroborated by the Dashboard's 13-node European application subnet record. Reported subnet memory was 35.67 GB, well below the 750 GiB storage reservation threshold.

For planning, scaling the current idle charge by a 400 MiB frontend footprint gives an approximately 445B-cycle freezing allowance. This footprint exceeds the disposable measured 313.1 MB after upgrade with its legacy snapshot. Allowing twice the measured 184.3B-cycle upgrade debit leaves about 412B cycles at the recorded balance for snapshot/restore costs and variation. This confirms headroom on the observed inputs. It is a planning estimate, with actual charging and subnet availability checked again at cutover. [Rehearsal measurements](operating-measurements.json) · [Subnet dashboard](https://dashboard.internetcomputer.org/subnet/bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe) · [Cycle charging and storage reservation](https://docs.internetcomputer.org/references/cycle-costs/)

## Authorised cutover sequence

1. Refresh the frontend's controller, module, listed snapshots, chunk store and available cycles. Rehash the raw artifact and retain an independent copy. Authenticate the Rules12 backend and verify the current legacy site's inventory.
2. Stop the frontend canister alone, take a snapshot and confirm the returned ID is listed for that canister. Restart and verify the legacy module and an authenticated Rules12 session before proceeding. If the snapshot is unavailable, resume the existing frontend and defer the upgrade.
3. Use DFX 0.31.0 and the explicit frontend principal in the [rehearsed upgrade command](RELEASE_PLAN.md). Match the certified installed module hash with the independent raw Wasm SHA-256. The upgrade replaces the complete website without asset syncing.
4. Verify the certified GET/HEAD inventory, branded 404, Rules12 startup and current operational identity, and audio. The paid backend stays live during the migration, so advancing publication heights are expected. Compare its module, rules, configuration, schema and source identity and confirm the later head remains authenticated. A failed check triggers the documented frontend snapshot recovery while Rules12 is active.
