# B2Z player-centred frontend — deployed and verified

**Live controlled prelaunch playtest:** https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
The owner explicitly authorised this frontend-assets-only publication and bounded
asset rollback. No backend mutation, setting/controller change or manual
financial action was performed. Rollback was not needed.

## Exact approved and served identities

| Identity | Value |
| --- | --- |
| Qualified source | `984a1aacdf807072f867963eef776b1db6c7ffe0` |
| Passing six-gate CI | [42668858702](https://github.com/aodl/balls-2-the-wallz/actions/runs/42668858702) |
| Frozen frontend source | `d9cf54235623cbaa8432311561cfd0e5b9275e8c` |
| Earlier evidence-only commit | `22ea3f295a8ae694acb5313930e79bcdf51fbeaf` |
| Served JavaScript SHA-256 | `51c7f92aeb0d648c0231fed979218005cbc553b264cf85877c603b549b96f370` |
| Complete 15-file manifest SHA-256 | `be6214af8ba24c09dcdc5c5706044b37a00eb8c986d2bc3f47d7c9028a8d4ea9` |
| Preserved backend module | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Preserved frontend asset module | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |

[Complete approved files](frontend-files.json), [builder provenance](frontend-build-manifest.json),
[served bytes and headers](served-files.json), [signed public inventory](asset-inventory.json),
[machine-readable deployment](deployment.json). All 15 actual deployment files
were checked before staging; no runtime rebuild occurred. Runtime inputs are
unchanged from the qualified source. Evidence-only changes do not requalify or
replace the runtime artifact.

**Count distinction:** fourteen files are public HTTP assets. The fifteenth,
`.ic-assets.json5`, is DFX upload configuration, consumed to set headers rather
than served as a public asset. Its staged bytes match the complete manifest and
its configured CSP/Referrer/Content-Type/Permissions policies match all fourteen
public responses. The signed asset inventory contains exactly those fourteen
keys, with no leftover assets. This report does not claim fifteen HTTP files.

The retained [publication log](frontend-publication.log) records exactly:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

The log's generic “Upgraded code” wording is not a backend or asset-Wasm upgrade:
the same frontend module was already installed, `--no-asset-upgrade` was used,
and certified before/after module hashes match for both canisters. Only the
observer's assets changed. No `b2z` build/install/upgrade/stop/start/transition ran.

## Preflight, rollback and preservation

[Preflight actual files/old served set](preflight-files.json), [prior full manifest](rollback-files.json),
[before certified metadata](metadata-before.json), [after certified metadata](metadata-after.json),
[before certified game](certified-before.json), [after certified game](certified-after.json),
[preservation assertions](backend-preservation.json), [operational observations](operational.json).

Both controller sets remain:
`amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae` and
`zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`.
Both canisters remain on certified subnet
`bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`, with 13 nodes.
Rules 7/schema 6, epoch 4, 1000×1000, configuration/rules/source identity and
backend default receiving account remain unchanged. The source is bound to the
official Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` and Index `qhbym-qaaaa-aaaaa-aaafq-cai`;
Event Horizon remains off, independent fallback 60 seconds. Treasury beneficiary,
last completed conversion and conversion totals are preserved. One paid cannon/
ball and received total 100,000,000 e8s remain present; source cursor is 40,180,669,
pending records zero. Simulation segments naturally advanced 4,336 → 4,348.
Territory/scores and other live state are not required to be byte-identical.

The previous actually served fourteen files plus matching upload configuration
remain at `.work/player-centred-live/rollback/frontend/`, with prior full manifest
SHA-256 `444d0fda939dd715ac98010f958da470cca0ed163dd82bd215ecabd7f30dcc8c`.
Prior staging is separately retained at `.work/player-centred-live/prior-staged-assets/`.
For a genuine frontend regression: preserve evidence, reconcile current publication,
verify those saved bytes against `rollback-files.json`, preserve current staging,
copy that prior set into `.work/s14/assets/`, then run the identical observer-only
command above and verify served bytes/headers/inventory. This rolls back assets
only. It cannot reset or roll back paid backend state. No rollback was executed.

## Production browser result

[Complete functional result](browser.json): **PASS** at desktop 1440×900,
390×844 and 320×640, against the actual served bundle and standard IC root:

- Certified observation before Identify; remembered public account declaration
  restores after reload, with no wallet connection or ownership-authentication claim.
- Owned-cannon Fire, legal Move and eligible adjacent Build prepare canonical
  quotes from actual verified state. Screen 45° produces `FIRE 1 255 1`; screen
  90° produces `FIRE 1 315 1`. Move and Build exact bytes/prices are independently
  checked with the unchanged canonical quote helper, not hard-coded example prices.
- Principal-first recipient `s5ir5-gqaaa-aaaas-amyna-cai`, collapsed legacy address
  `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`, payer,
  amount and UTF-8 memo copies match exactly. Fee and retained-payment/no-refund
  warning remain visible in the ordinary scrollable card.
- Copy freezes coherent instructions; edit/Keep previous/Update replacement is
  exercised. A deliberately rejected clipboard API call reaches the correct
  manual-copy fallback. No transaction-index/payment-reporting input or callback.
- Isometric pan/zoom, non-repeating maximum zoom-out and minimap navigation;
  card/panel use preserves the actual clock and queue in all three viewports.
- Genuine verified desktop playhead advances 4,346 → 4,346.020999. This is verified
  presentation progress, not a claim of conspicuous pixel displacement at overview
  scale. Narrow windows truthfully wait at Trickle with “Rendering on-chain activity ...”.
  No motion is invented beyond coverage. Qualified disposable slow/cold/reconnect
  evidence remains the timing qualification where immediate visible motion is absent.
- Optional management-status requests are deliberately failed only in the 320px
  browser context. Its meter says Unavailable while certified observation and
  payment preparation continue. All observed browser POSTs are query/read_state.

[Deliberate browser-local verification negative](browser-negative.json) changes
one config response only inside that test page: the served app correctly shows
“Unable to verify game”, disables payment controls and hides the waiting spinner.
No production bytes/root policy were modified. Operator pause/protection/refuelling
were not induced on the paid backend; their qualified fixture/status regressions
are retained. The production state was actively running Trickle.

Actual production screenshots: [desktop arena](1440-arena.png),
[desktop wallet](1440-wallet.png), [390px wallet](390-wallet.png),
[320px wallet](320-wallet.png). The final functional matrix ran without video;
qualified populated journey recordings remain linked in the source release report.
These are emulated viewports, not physical phones/native keyboards or actual wallets.
They are functional evidence, not a hardware FPS or final-polish claim.

[Preserved evidence-script errors](attempts.json): an initial recording path used
mixed relative/absolute paths; a later clipboard-denial setup returned its function
to Playwright and threw before the Copy handler. Neither was an app/served-byte
failure. Both remain retained, not counted as full passes. The corrected complete
three-viewport result above passes all assertions. No product changes were made
to accommodate either harness correction.

## Resource observation and remaining limits

Backend query observations after smoke: **2,077,460,296,808 total** /
**2,021,177,765,198 liquid cycles**, directly reported by the SDK; platform reserves
are not subtracted a second time. Selected and supported pace is **Trickle,
0.01 ticks/s**, admission open. Before observations were 2,082,109,011,671 total /
2,025,826,480,061 liquid. These timestamps/query contexts are not a settled gross-burn
or populated-world lifetime measurement. No new polling/capacity experiment ran.
Frontend [post-publication status](frontend-after.txt) reports
**1,479,985,212,768 cycles**, reserved 0.

Source/run errors are clear, pending source records zero. Treasury is Idle,
unpaused and unhalted with no in-flight transfer/notification plan, but retains
an existing `icrc1_balance_of` deadline warning observed before publication and
afterwards. It was not hidden or “fixed” with a manual conversion, top-up or policy
change. This existing operational warning is reported for the owner; restoring
frontend assets would not remedy it. All source/treasury/transition floors,
Trickle entry/exit, ICP economics and Ledger-only player authority remain intact.

Receipt association remains deliberately unsupported; saved instructions are not
payment evidence. Actual wallet-entry/transfer, physical-device performance,
human-research and maximum-population limitations remain those of the qualified
release. No new infrastructure or implementation round was introduced.

## Evidence publication

This is an evidence/documentation-only close-out, distinct from qualified source
`984a1aa` and frozen source `d9cf542`. It changes no runtime/test/build/dependency
inputs, and does not rebuild assets or require another six-gate run. To honour the
owner's no-restart instruction, its commit uses GitHub's documented
[`[skip ci]` marker](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).
No skipped run is represented as qualification: the actual six passing conclusions
remain those of run 42668858702. Ordinary non-force evidence publication failed: Git cannot obtain an HTTPS
username with terminal prompting disabled. The remote still points to qualified
`984a1aa`. The completion response supplies the exact continuation command for
the local evidence-only head. No credential inspection or workaround was used.

The authorised frontend release is complete. Further frontend implementation stops
pending actual human playtest feedback.
