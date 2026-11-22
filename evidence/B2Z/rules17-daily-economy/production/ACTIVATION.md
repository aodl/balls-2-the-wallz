# European Rules17 activation

Rules17 became active at 20:03:53 UTC on 22 November 2026. The existing
European frontend and backend stayed on their original canister identities.
The owner’s top-up restored Trickle and payment admission before installation.
The first healthy observation showed 2.527T liquid backend cycles against the
1.350T operating and recovery requirement.

| Item | Verified identity |
| --- | --- |
| Frozen source | `d27f754f52c075b7cb35af22b096f240be0437b0` |
| Frontend `s2jxj-liaaa-aaaas-amynq-cai` | `2f5444bdf85aa9df57ecae32cce998454a5b254693c919881b5ffafd4f05789d` |
| Backend `s5ir5-gqaaa-aaaas-amyna-cai` | `c066140f4ef3174b3f440694c19ec4116a03298fcc63b80636b0b5389bc210ca` |
| Rules17 | `ba259c26e31b8868a3bc28c7e76cbbb486f448c760a1f0d48c9a3ec75c1b5156` |
| Configuration | `0cff926a5d2ee0342547a045dbb85aa25f2d83991c54edab6b14f73ede21262f` |
| Schema9 | `56622629b4c0821c9f5384ecd8d3501fd7cac93bf274cafbf017b599e2503233` |
| Adapter and transition | Adapter11 `BTZPAY08`, metadata version 13 |

All seven substantive jobs passed for the frozen source. The official
disposable integration executed all seven paid action types. The focused
fallback recovered the block timestamp from the official Ledger directly and
through its archive. An amount mismatch left the source cursor in place, then
the corrected response advanced it and independently replayed the 15
publications and 17 receipts. The five focused economy tests also passed.
The balance check and upgrade used the exact hosted Wasms. [Hosted run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45051304132) · [Qualification closeout](../CLOSEOUT.md)

## State and source preservation

The frontend first passed three-size browser acceptance with Rules16.
A fresh browser verified that pausing disabled financial Copy and left
local drafting available. Installing the backend preserved the original
certified Rules16 publication, including byte-identical state, events and
scores. Queries during scheduled reconciliation were refreshed after the
in-flight read cleared.

The official Ledger exclusive cutoff was **40,646,984**, with Index coverage
through the same exclusive bound. The source cursor remained **40,640,535**
and the certified source anchor and recipient were unchanged. The observed
official account history and balance matched before and after the transition.
Cumulative received payments remained **104,000,000 e8s**. All four
Reservoirs at cells **998000, 998001, 999000 and 999001**, the existing Cannon
and Ball, ownership and score credits were preserved at cutover. The older
receipts outside live retention are represented by the preserved certified
lineage and official source history.

The independent observer reproduced the exact Schema9 migration from sealed
Rules16 publication 15073 to checkpoint 15074 and reproduced state, events
and scores byte-for-byte for publications 15075 and 15076. Score credits
continued accruing through normal play. Trickle resumed at one logical tick
per segment, 10 milliticks/second, one-second pacing and work budget 512.
[Cutover proof](cutover.json) · [Independent replay](replay.json)

## Live acceptance and resource observations

The final 88-file inventory retains all 87 previous public paths and adds
`/configuration-economy.bin`. Live verification covered their GET and HEAD proofs, six
gzip variants, 28 alternate routes, security headers and a genuine HTTP 404.
Chromium decoded all 60 FLAC files and checked the unchanged audio manifest
and hashes.

At 1440px, 390px and 320px, the browser used native Copy for the exact
`FIRE 1 37.5 1` instruction at 40,000 e8s, consecutive Reservoir instructions
at 10,000,000 e8s, and Cannon Move. The authenticated pricing panel showed the
bootstrap multiplier ×1, a countdown to UTC midnight, and the pending first
announcement. The midnight transition, grace and late-recorded payment
handling were exercised in the disposable qualification. No production
payment was submitted.
[Browser results](browser.json) · [Desktop](daily-pricing-1440.png) · [390px](daily-pricing-390.png) · [320px](daily-pricing-320.png)

| Resource | Frontend | Backend |
| --- | ---: | ---: |
| Balance before installation | 1,160.834B | 2,578.355B |
| Post-release balance sampled by the operator | 976.638B | 2,542.768B |
| Post-release freezing floor | 202.908B | 64.020B |
| Post-release memory | 230,922,241 bytes | 49,708,171 bytes |
| Post-release recovery margin | 469.730B | 1,128.750B |

The frontend installation window drew 184.172B cycles. The frontend
recovery margin includes allowances of 190B for a compatible reinstall,
64B for temporary chunks and 50B for contingency. The backend's final
liquid reading was 2.479T against the 1.350T operating and recovery floor.
The backend balance fell by 24.190B between the pre-install and drained
observations, and the immediate commitment window showed a further 86.736B
debit. The later post-release balance was 35.587B below pre-install. Those
are balance observations during active execution and reservation settlement,
with no isolated tariff claim for backend installation or commitment.

Both snapshot inventories and chunk stores were empty after activation.
There were no controller changes, additional funding operations, treasury
transfers or gameplay payments initiated as part of the release. Retain the
exact qualified Rules17 normal backend for compatible recovery after the
version-13 boundary. The qualified frontend release and predecessor frontend
are retained as software artifacts. A frontend recovery artifact must support
the active Rules17 epoch.
