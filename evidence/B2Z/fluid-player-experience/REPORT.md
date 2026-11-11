# Fluid player experience — deployed and verified

**The ordinary fluid-player game is live as a controlled prelaunch playtest:**
https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
The exact frozen assets were published once on 11 November 2026, without rebuilding
or substituting the experimental signing build. All fifteen public files and the
consumed upload policy match the approved sixteen-file manifest. Production
browser checks pass at desktop, 390×844 and 320×640. Backend code, paid state,
controllers, settings and financial authority are preserved. Delegated payments
remain absent/disabled. No rollback was required.

## Qualified and served identities

- Runtime/build source: **`662f9052bbb4235b2739df12646de66eca10dfbd`**.
- Qualified published source: **`38e9cfbca9099fab246daf566c4a1f35cc011c95`**.
- [CI run 43010680568](https://github.com/aodl/balls-2-the-wallz/actions/runs/43010680568):
  all six substantive gates PASS; [exact conclusions](production/exact-ci.json).
- Served JavaScript SHA-256:
  **`79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a`**.
- [Complete sixteen-file manifest](frontend-files-arrival-jitter.json) SHA-256:
  **`68116ceeb93935b9be851bbe894fdd208cde71c4f4cc2a508d4fb9b524f0cb03`**.
- The clean existing freeze is
  `.work/fluid-player-experience/frozen-arrival-jitter/frontend`.
  All actual frozen and staged bytes were checked before publication. Later
  evidence-only commits do not replace this runtime identity.

| Substantive release gate | Result |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | PASS |
| S14 and million-cell installed-IC qualification | PASS |

The production-inventory job is informational, excluded from qualification.
No new runtime source, build, push or CI campaign was needed for this deployment.

## Publication, served bytes and security

Verified local aliases are `b2z = s5ir5-gqaaa-aaaas-amyna-cai` and
`observer = s2jxj-liaaa-aaaas-amynq-cai`. Exact frozen files were copied into
`.work/s14/assets` after preserving its prior contents. The established asset-only
route was executed with dfx 0.31.0:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity \
NPM_CONFIG_IF_PRESENT=true \
dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

[Publication log](production/frontend-publication.log),
[staged-file identity](production/staged.json),
[all returned file hashes/headers](production/served-files.json) and
[signed post-publication asset inventory](production/inventory-after.json)
record the result. The generic dfx log includes “Upgraded code”; certified module
hashes prove the asset-canister Wasm stayed unchanged with `--no-asset-upgrade`.
Only the observer target was prepared; no backend build/install/update ran.

Every public asset below matches its approved bytes and required headers, checked
at **2026-11-11 17:59:04 UTC**. Signed inventory contains exactly these fifteen
keys, with no experimental authentication/metadata route.

| Public path | Actual served SHA-256 | Result |
| --- | --- | --- |
| `/agent-api.md` | `ffbeb51fa266bdf5dc6309a14f6c3666125bd39aea969fd08af4ce1f83924b9a` | PASS |
| `/app.mjs` | `79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a` | PASS |
| `/backend.did` | `8ad63054b7c84a5a3c99e56eb54721995fcaedce99c324d87437620516c330be` | PASS |
| `/build-manifest.json` | `c7d4268d5b2df67d134fc6c7870e701d045d45999ed8accd1e5b93f1d32651e1` | PASS |
| `/configuration-entry.bin` | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` | PASS |
| `/configuration-legacy.bin` | `3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622` | PASS |
| `/configuration-million.bin` | `cfd4fa714ee1c835b56e7f5939d9f1f56312bbbfc0c09775681e581dc3250c03` | PASS |
| `/configuration-playability.bin` | `e7a8db840b355bec688d553aef1a9891bc5c1a030bc24f89d8d546f1dd916e68` | PASS |
| `/configuration-torus.bin` | `6f06db2b7485f8c0bc116682e7a7f43317a3214f0d4d62bbc4d9b028ad11c9d4` | PASS |
| `/configuration.bin` | `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42` | PASS |
| `/cursors/reticle.svg` | `9c30f3fbd6be4a26691854d086584da0f4231b9a0a51e737d0a7c1f8edb8e892` | PASS |
| `/deployment.json` | `b68c8dfab2c537720b224ab5d4f403a6c8b026adb672ba82b1822de1206c7066` | PASS |
| `/icon.svg` | `2741efd82b7b00d4b2f1482e04140d7245e6afb08f1cf9905a93bb045e706888` | PASS |
| `/index.html` | `0036b81e790ee99176c2768cbf014bbabcdf7926e95c91b0344c2a7592b60a41` | PASS |
| `/style.css` | `25d0a61f06d0534991d852a43d0e9dec62b1aee361d5d630d552eb0ae857e6d1` | PASS |

The sixteenth file, `.ic-assets.json5`, is consumed by upload, not served as a
public file. Its SHA-256 is
`096943a71e2351b550877318df3aa3a483ba9beeb57fe965a3249e4aa965ba9c`.
Its required CSP matched on every public response:

```text
default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://icp-api.io; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

Permissions-Policy, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`,
HSTS and frame denial are preserved. No remote script/font, weakened verifier,
Internet Identity origin metadata or auth-capable route was published.

## Read-only production preflight and preservation

[Certified before](production/metadata-before.json), [certified final](production/metadata-final.json)
and [preservation comparisons](production/preservation.json) establish:

- Backend module unchanged:
  `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend asset-canister module unchanged:
  `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Both controller sets unchanged:
  `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae` and
  `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`.
- Both are certified on subnet
  `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`, **13 nodes**.
  Allocations, freezing threshold, reservations/settings and visibility remain
  unchanged; status was read, never configured.
- Authenticated rules **7**, schema/world version **6**, epoch **4**, 1000×1000
  torus, one paid cannon/one ball and **100,000,000 e8s** received are preserved.
  Autonomous segments advance normally (5992 → 5997 in the compared snapshots);
  identity/configuration/source hashes remain identical. Live motion was not
  required to be byte-identical to an earlier snapshot.
- Official Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` and Index
  `qhbym-qaaaa-aaaaa-aaafq-cai` remain bound to the backend's default receiving
  account. [Independent derivation](production/account-derivation.json) agrees
  with `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
  Ledger/Index queries both return **0 e8s** balance, with prior treasury transfer
  40180668 the newest history entry. No unexplained account activity was found.
- Source binding checked, cursor **40180669**, pending **0**, no source error or
  reconciliation request. Treasury is **Idle**, neither paused nor halted; prior
  converted totals and last success remain unchanged.

**Existing operational warning:** treasury retains
`icrc1_balance_of: CallRejected(... Call deadline has expired.)`.
This predates publication. It is not relabelled healthy conversion or a new
frontend defect; no financial recovery, transfer or settings change was attempted.

Final status reads around **18:04:58 UTC** report backend total
**1,423,841,960,348 cycles**, SDK liquid **1,367,509,199,258 cycles**; frontend
**1,467,615,981,453 cycles**. Selected/supported pace is **Trickle, 0.01 ticks/s**,
admission open, running, not performance-limited. Liquid headroom is
**117,509,199,258** above 1.25T entry and **367,509,199,258** above the 1T exit
floor. Reservations were not subtracted from liquid again. Event Horizon remains
disabled and the independent 60-second source fallback is unchanged.

Preflight totals were backend 1,425,954,699,194 / liquid 1,369,621,938,104 and
frontend 1,472,786,350,933. These balance differences include publication,
verification and autonomous processing; they are **not** steady/gross execution
cost, gameplay burn or a lifetime forecast. No additional consumption campaign ran.

## Actual production browser verification

[Executed results](production/browser-results.json) pass at **1440×900**, **390×844**
and **320×640**, against the served bytes and genuine certified paid world:

- Anonymous observation, restored local account after reload, persistent selected
  cannon, one-row five-button toolbar and one expandable action section.
- Smooth Focus/Overview, focused disabled state, pan/zoom and non-repeating camera,
  shifted diamond minimap navigation; ball-follow selection/stop preserves zoom.
- Canonical Fire/Move/Build instructions from latest verified state, primary
  backend principal, exact amount/text memo/payer clipboard values. Screen 45°
  yields `FIRE 1 255 1`; editing to 90° yields `FIRE 1 315 1` only after explicit
  Update. Keep restores the prior coherent packet. No payment was sent.
- Same-cell Move rejected; legal Move and adjacent Build prepared and revalidated.
  Both selected-destination actions show exactly:
  **“If another player claims your chosen tile before your action is processed,
  the action fails and your ICP remains spent.”** Separate wallet-fee wording
  remains. Fire retains ordinary retention risk. Small panels use one natural
  scroll; there is no second generic warning, legacy/hex control, manual index,
  payment-reporting path, sign-in or delegated Pay control.
- Action collapse/reopen, camera, account and copy interactions retain the **same
  clock and queue**, never advancing beyond coverage. Clock identity is measured
  after the explicit account-restoration reload, not across page reconstruction.
  Certificates continue arriving without refresh, with zero resyncs during each
  bounded interaction journey. Browser POSTs are query/read_state only.
- Verified motion was observed at 390×844; desktop/320 correctly showed
  **Waiting for next update** when no interval remained. At 390 the arriving
  interval becomes **Slow · delayed**. Ball-follow activation was checked on the
  actual ball; waiting did not fabricate a moving ball/camera. Existing qualified
  disposable seam-follow and extended pacing evidence remains applicable to the
  identical runtime; these short production checks do not replace it.
- A browser-local optional status-query failure at 320 shows Unavailable while
  observation and valid preparation continue. A separate
  [browser-local configuration tamper](production/negative.json) produces
  **Unable to verify game**, disabled new payment preparation and no misleading
  waiting spinner. No served configuration or backend was changed for either test.

Raw commands used the existing Python 3.11 browser environment and task scripts
`.work/fluid-live/smoke.py`, `negative.py`, `observe-before.py`, `observe-after.py`,
`verify-served.py` plus SDK metadata/inventory and public/controller status reads.
[Media inventory](production/media.json) preserves actual populated screenshots
and three recordings, with hashes and retained paths in `.work/fluid-live/browser`.
Existing qualified media/timing/depth/regression records below remain under their
original identities, including failed/incomplete historical attempts.

Coverage is **Chromium 153.0.8010.12 / ANGLE SwiftShader**, emulated viewports.
No hardware-backed performance, physical-phone/native-keyboard or real-wallet
claim is made. This host has no working rendered headed display/Xvfb path, so
**genuine hidden-tab execution remains unestablished**. Controlled lifecycle tests
are retained separately; no visibility spoofing/throttling bypass was used to
manufacture coverage. No new benchmark or real payment was needed for release.

## Tactical rollback retained

Freshly downloaded pre-publication tactical files matched all fifteen public
hashes and required headers before upload. Their complete policy-inclusive
[rollback manifest](production/rollback-manifest.json) is
`a7eb5d4a57df813a669d0dcdb46978f7984d937678a83935a719f23425c95cc2`;
JS is `f993f930255435766eeeb65b960d06a189372f6fcd057768458fc33446272fde`.
Retained set: `.work/fluid-live/rollback/frontend`; original qualified tactical
freeze also remains intact. Prior staging is `.work/fluid-live/prior-staged-assets`.

If the approved bounded rollback becomes necessary, first check the rollback
manifest against every actual file and recheck aliases. Replace only
`.work/s14/assets` with that complete sixteen-file rollback set, preserving the
fluid staging. Run the exact observer-only `--no-asset-upgrade` command above,
then verify every public tactical byte/header and both unchanged module hashes.
No backend deploy, reset, setting update, broad deploy command or runtime rebuild
belongs in that procedure. Rollback was **not executed** because verification passes.

## Separate delegated-payment closeout and II acceptance

The local evidence-only commit **`bc06b159090fc6bd13871bc98e52d2cf91c39e30`** is
consolidated byte-for-byte as ten reviewed JSON snapshots with
[provenance and hashes](production/financial-qualification/provenance.json).
No experimental code was merged into the ordinary release. The feature worktree
and original records remain unchanged.

Qualified financial source **`38987fe84813ddb6b8cceef293dd42a98fd64985`** passes
[all six substantive gates](https://github.com/aodl/balls-2-the-wallz/actions/runs/43049100060)
and [all nine disposable financial cases plus UI](https://github.com/aodl/balls-2-the-wallz/actions/runs/43049099998).
[Preserved exact conclusions](production/financial-qualification/hosted-qualification-38987fe.json)
retain runtime `15586071fb38033398cd5378398b23616747a811`, unchanged financial
backend SHA `19c66e8c17201c98be7849880380088b5c4208b1ebcc9097dccf19e8a626c443`
(3,677,783 bytes), replay, owner revocation and artifact identities. The actual
valueless Ledger rejects stale expected allowance and expired creation time;
fresh-query revocation succeeds, partial/concurrent spending is accounted for and
final allowance is zero. This is disposable qualification, not mainnet execution.
Neither the experimental frontend nor backend was installed here.

**Remaining acceptance:** actual Internet Identity ceremony and stable spender on
the intended signing origin are **NOT_RUN**. The
[prepared no-spending acceptance procedure](../../../docs/operations/B2Z_II_ACCEPTANCE.md)
sets out identity comparison, expiry/targets, sign-out/re-sign-in stability,
cancellation and zero-transfer evidence. An auth-only route, any required origin
metadata/security-policy change and its publication require separate explicit
scope. None was created/published by this task. No grant, allowance, ICP/cycles
operation or payment activation is authorized by that procedure. A future paid-
backend state-preserving upgrade/cutover/activation still needs separate review
and authority. Signing out is not either on-chain revocation.

## Completion and evidence publication

There is no remaining ordinary-frontend deployment blocker. The existing treasury
warning and coverage limitations above remain explicit. Modules, controllers,
settings, source bindings and financial authority were not changed; paid autonomous
state continues normally. This is a working controlled playtest, not final device,
wallet, aesthetic or maximum-population qualification.

[Closeout integrity/documentation checks](production/closeout-checks.json) pass.
This deployment record, status/operator guidance and II acceptance procedure are
local evidence/documentation changes only. Repository remote operations remain
user-owned under AGENTS.md; no push or extra runtime CI was performed. To publish
the resulting evidence commits (after review), the ordinary non-force continuation is:

```sh
git -C /home/codexdev/src/b2z push origin release/btz-prelaunch-playability feature/b2z-icrc2-delegated-payments
```

The feature ref remains local `bc06b15`; this command publishes evidence on the
independent branches, without merging feature code or rebuilding qualified assets.

---

## Pre-deployment qualification records (historical, retained unchanged)

# Fluid player experience — qualified frontend candidate, not deployed

**Ready for a separate frontend-only controlled-playtest release decision.**
Published source **`454ec0380d5d76a01c809078b8fe625db98eaeda`** completes
[CI run 42996637314](https://github.com/aodl/balls-2-the-wallz/actions/runs/42996637314)
with all six substantive jobs PASS. [Exact job conclusions](hosted-ci-454ec03.json).
The informational production-inventory job is excluded. No source push, runtime
rebuild, production deployment, canister setting/controller change, real allowance
or ICP/cycles transfer occurred during this qualification refresh.

| Required gate | Final conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | PASS |
| S14 and million-cell installed-IC qualification | PASS |

## Exact frozen frontend

Runtime/build source remains **`662f9052bbb4235b2739df12646de66eca10dfbd`**.
All maintained runtime/build/dependency inputs equal the qualified source; later
commits reconcile evidence only. The existing directory
`.work/fluid-player-experience/frozen-arrival-jitter/frontend` is preserved.
Every actual deployment byte was rechecked, without rebuilding:

- JavaScript SHA-256: **`79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a`**.
- [Complete 16-file manifest](frontend-files-arrival-jitter.json) SHA-256:
  **`68116ceeb93935b9be851bbe894fdd208cde71c4f4cc2a508d4fb9b524f0cb03`**.
- Fifteen public assets, including the local cursor, plus consumed
  `.ic-assets.json5`; [clean provenance](build-manifest-arrival-jitter.json).
- European binding remains backend `s5ir5-gqaaa-aaaas-amyna-cai`, frontend
  `s2jxj-liaaa-aaaas-amynq-cai`. The live URL remains the prior deployed tactical
  release: https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/. This candidate is not served
  there yet. Prior qualified and deployed rollback assets remain intact.

## Final executed evidence

[Installed results](hosted-installed-454ec03.json) and [complete million-cell
browser result](hosted-million-454ec03.json) pass, including actual source/payment,
certificate, reconnect, upgrade and camera/selection paths. The
[continuous Normal analysis](hosted-sustained-454ec03.json) spans **900.2473 seconds**,
with **0.99970 displayed / 0.99973 admitted ticks/s**, bounded queue, no stall or
rebuffer, no resynchronisation and no sustained buffer deficit. The cold Lifeline
reconnect spans **119.8785 seconds**, with **zero stalled samples / zero resyncs**,
0.05005 admitted and 0.04378 displayed ticks/s at 0.05 nominal. This is intentionally
elastic presentation, not a producer-rate change or on-chain timing guarantee.
The earlier failed one-stall capture remains in its original record. No assertion,
900-second window, protection floor or authentication check was weakened.

The [source-bound browser artifact](hosted-browser-artifact-454ec03.json) retains
24 populated screenshots/recordings plus [fluid journeys](hosted-fluid-454ec03.json),
[actual pixel/depth checks](hosted-depth-454ec03.json) and
[controlled rendered returns](hosted-elastic-454ec03.json), all PASS. The prior
exact frozen read-only European checks at desktop/390/320 and 1,814 JS / 199 Python
local source tests remain under their actual inputs. Hosted S14 artifact
13846199298 is cached at `.work/fluid-player-experience/ci-454ec03/local-ic-evidence.zip`,
verified SHA-256 `c976414019213e9e2b32b32cc80e4a5a1315bc250ea404d841cb0468d971e627`.

These results qualify their actual disposable/software-rendered environments.
Native rendered hidden-tab execution, hardware/physical-phone/native-keyboard
performance, real-wallet entry, human research, receipt-association limits and
maximum-population qualification remain accurately limited. Existing slow
SwiftShader measurements are retained; a logical-throughput CI pass is not a
hardware 60/30-fps claim. No additional benchmark or paid game action was run.

## Release boundary

There is no remaining demonstrated source/CI blocker for this frontend candidate.
Recommend a separately authorised asset-only controlled playtest of the exact
freeze above, using the [installed paid-game operator procedure](../../../docs/operations/S14_OPERATOR.md).
Refresh modules/controllers/placement, source/treasury/pending health and cycles
immediately before any later publication; do not reuse historical balances as
current preflight. Preserve the served tactical asset set for the approved bounded
asset-only rollback. Do not install/upgrade/reset the backend or change its
Ledger authority, settings, pacing, treasury or paid history.

The isolated optional-payment source `58027f4…` separately passes all six ordinary
gates and its eight-case financial workflow. It stays disabled by default and
is absent from this independent frontend. Real II origin/ceremony review and
separate backend-upgrade/activation authority remain necessary for its production
use. Neither this qualification nor controller access grants that authority.

This closeout is evidence-only. Qualified source and frozen runtime identities
above remain distinct from later report commits; do not rebuild assets or demand
a new runtime campaign merely to publish unchanged evidence. All earlier failed,
incomplete and superseded records follow unchanged.

## Earlier qualification records (historical)

# Published frontend qualification and local jitter follow-up

**Published frontend `a0a59f9a8c48d0e9b459669588076f17587d0ea9` passes all six
substantive jobs** in [run 42984828168](https://github.com/aodl/balls-2-the-wallz/actions/runs/42984828168).
[Exact job conclusions](hosted-ci-a0a59f9.json), [installed results](hosted-installed-a0a59f9.json),
and [900-second sustained analysis](hosted-sustained-a0a59f9.json) are retained.
Inventory remains informational. Runtime source `50f7eda…`, JS `03be9e0f…` and
complete manifest `c7c8e77d…` below are unchanged and preserved as the qualified
freeze. No production deployment occurred.

The isolated feature `af01692…` passes all eight disposable financial tests and
its UI suite, plus five ordinary gates, but its sustained case fails one Lifeline
reconnect sample after **passing the full 15-minute Normal window**. This is a real
failed continuity assertion, not a setup or harness-budget failure. Both branches
share that timing policy. Its observed distinct arrivals (5804.8, 25312.3, 45339.1,
65278.4, 85656.5 ms) include a 20.3781-second gap, while the median period is 20s
and measured delivery work peaks at .1985s. The missing margin is arrival jitter,
not a change to production rate or certificate checks.

The focused actual-clock/verified-player reproduction fails before correction
and passes after. The first draft fixture incorrectly advanced a player beyond
its segment; that setup failure is retained separately. The corrected red result
is explicitly STALLED. The policy now takes the largest of the existing fast-tier
reserve, observed request duration and the peak-to-peak spread of eight distinct
head timings, converted at nominal pace. No sum/double subtraction, extra startup
publication, guessed fixed delay, backend threshold or event-order change. Old
variability expires from the window. All **65** focused playback cases pass,
including exact events, packet/latest-authority preservation and endpoint checks.
The local follow-up changes runtime bytes and therefore needs a new clean freeze
and exact-source CI; the preceding six-pass result is not relabelled as its pass.
Recommendation: finish qualification of the narrow correction before a separate
frontend-only release decision. Optional payments remain isolated/disabled.

[Hosted populated browser evidence](hosted-browser-artifact-a0a59f9.json) preserves
24 actual PNG/recording files and the [fluid](hosted-fluid-a0a59f9.json),
[depth](hosted-depth-a0a59f9.json) and [controlled elastic](hosted-elastic-a0a59f9.json)
results. All preceding failed/incomplete records and physical-device, real-wallet,
II, software-performance and genuine rendered-hidden-tab limitations remain.

## New local arrival-jitter candidate

Clean runtime source **`662f9052bbb4235b2739df12646de66eca10dfbd`** is frozen at
`.work/fluid-player-experience/frozen-arrival-jitter/frontend`.
JavaScript SHA-256: **`79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a`**.
[Complete sixteen-file manifest](frontend-files-arrival-jitter.json) SHA-256:
**`68116ceeb93935b9be851bbe894fdd208cde71c4f4cc2a508d4fb9b524f0cb03`**.
[Clean build provenance](build-manifest-arrival-jitter.json) records 15 public
HTTP files plus consumed upload policy. Every actual file matches; only app JS
and build provenance differ from the six-pass freeze. That prior source/artifact
remains preserved, not overwritten or claimed equivalent to the new bytes.

The [complete local source run](source-arrival-jitter-verification.json) passes
**1,814 JS / 199 Python tests**, references, structure and docs, with no skips or
cancellations. [Actual pinned-clock/player red-green evidence](reconnect-jitter-regression.json)
retains the corrected-fixture failing STALLED assertion and 65 passing cases.
[Input provenance](arrival-jitter-input-provenance.json) shows only the elastic
policy changed among maintained runtime/build/dependency inputs.

[Exact frozen browser](frozen-arrival-jitter-browser.json) passes desktop,
390×844 and 320×640 with real read-only European certificate verification, source/
destination binding, every public loopback file/header, exact canonical memo/
principal copies, Update/Keep and clock/queue preservation. All POSTs are
query/read_state, never Ledger or gameplay updates. These are software browser
checks; real II, wallet, phone/hardware and genuine rendered-hidden-tab limits
remain. Earlier populated media applies to unchanged visual/copy/renderer inputs,
not as a new installed continuity or performance claim.

The fresh [controlled actual-component return](controlled-arrival-jitter-browser.json)
passes all three viewports with [source-bound screenshots/recordings](controlled-arrival-jitter-media.json):
same-head remainder retained, three hidden injected intervals compact to one full
latest interval, clock/queue/follow/zoom survive, immediate verified progression
and no return-triggered network requests. This is an explicit fixture suspension,
not genuine browser hiding, IC authentication or hardware timing. The compiled
fixture contains the new policy; no performance pass is inferred from recording.

**Whole-source hosted qualification of this follow-up remains NOT_RUN.** Publish
the reviewed local branches through the ordinary owner route below; obtain all
six substantive conclusions and the isolated financial workflow. Do not relabel
the preceding green `a0a59f9` or the old failed `af01692` as this source's pass.
No runtime rebuild is needed for a later evidence-only update. No deployment is
authorized by this task. Production paid state, modules/settings/controllers and
financial authority remain untouched; no automatic recovery/top-up was attempted.

## Earlier qualification records (preserved, superseded where identified)

# Fluid player experience — published CI follow-up

**Not ready for production approval.** Published `07516cd03cebde92de1bc519b0045a64e8f74997`
passes five substantive jobs in [run 42974709451](https://github.com/aodl/balls-2-the-wallz/actions/runs/42974709451).
S14/million-cell installed-browser qualification fails. [Exact hosted record](hosted-ci-07516cd.json).
The informational inventory is excluded. The corrections below are local; their
resulting source still needs ordinary owner publication and exact-source CI.
The preceding frozen recovery files are retained unchanged, not substituted for
the corrected elastic module. No production publication or financial operation.

## Corrected clean freeze and local verification

Runtime source is **`50f7eda4ea19206ad37829ce087b415f75e40b98`**.
[Complete actual sixteen-file manifest](frontend-files-delivery-confidence.json):
**`c7c8e77d199ff665685fa0d14d67ee413a5321d65720529b905cb11396aa195d`**.
JavaScript: **`03be9e0fb77a268746bdc3f96b05795d9405d6a792bc8219a5b6ce8ae41435df`**.
[Clean builder provenance](build-manifest-delivery-confidence.json) binds
`.work/fluid-player-experience/frozen-delivery-confidence/frontend`, the existing
European backend, immutable dependencies and all 15 public files plus consumed
policy. Every actual byte matches. Only `app.mjs` and `build-manifest.json` differ
from the preserved recovery freeze. This rebuild is required by the demonstrated
elastic runtime correction, not by a documentation update.

The [complete local source gate](source-confidence-verification.json) passes
**1,813 JavaScript / 199 Python tests**, all reference/structure/doc checks, with
no skipped/cancelled cases. JavaScript takes 324.59 seconds within the unchanged
600-second outer allowance. [Controlled regression evidence](elastic-delivery-confidence.json)
and [unchanged visual/payment-input provenance](confidence-input-provenance.json)
separate timing tests from reuse of existing populated media.

[Exact frozen browser result](frozen-confidence-browser.json) passes at 1440×900,
390×844 and 320×640 on loopback with the real read-only European source: native
certificate verification, every public served byte/header, current rules/source/
destination binding, exact `FIRE 1 255 1` UTF-8 copies, Update/Keep and clock/queue
identity. No Identify is required to observe; the local declared account is used
only for composition. All network POSTs are query/read_state, never gameplay or
Ledger updates. No production assets were published. The software browser does
not establish hardware/physical-phone performance, a real II ceremony, real wallet
compatibility, genuine rendered hidden-tab timing or a continuous-delivery pass.

Source/evidence publication remains owner-owned. From this repository, recheck
remote heads, then publish the two reviewed local branches without force:

```sh
git push origin release/btz-prelaunch-playability feature/b2z-icrc2-delegated-payments
```

All six substantive corrected-source hosted gates remain required; the existing
installed failures above are not reclassified. **Recommendation: obtain corrected-
source CI, resolve any remaining installed-delivery failure, then request a separate
exact-artifact frontend-only release decision. Do not deploy this candidate now.**
The independent feature additionally needs financial CI, real II origin/ceremony
review and separately authorized state-preserving backend activation.

## Current correction and executed findings

Hosted failures occur before continuity measurement. `action_field()` may press
Locate; using it inside the placement wait cancels the pending 400 ms single-click
commit. The read-only wait now checks the committed field before Locate. The
verifier also waits for approved Focus/Home animations before arranging the seam
view or testing a wheel anchor. The torus preloads cell 1, then requires the real
seam click to produce exact `MOVE 0`; both seam fixtures assert that the cannon
is elsewhere. Cell zero remains a valid destination. No assertion was removed.
Native disposable torus, million and payment journeys get past their original
setup failures, but their subsequent continuity assertions still fail.

A distinct, demonstrated elastic-policy issue is corrected: cadence expired after
three short publication periods even while a measured long delivery was pending.
Confidence now lasts three periods plus twice the largest complete delivery in
the last eight advancing heads. This is advisory timing evidence, never root or
certificate freshness. Actual pinned-clock/verified-player test fails before and
passes after; all 24 elastic cases and 40 related buffer/live/playback cases pass.
Same-head refreshes cannot extend confidence, source/pace changes reset it, and
0.5–1.5 nominal bounds, finite endpoint, current-head quotes and packets remain.

The original local failures remain [torus setup](torus-setup-corrected01.json),
[payment camera](payment-camera-corrected01.json), [corrected-policy torus](torus-elastic-corrected02.json)
and [million setup](million-setup-corrected01.json). The last reports backend
1.0015 ticks/s, admitted 0.1002 and displayed 0.0668 over 89.86 seconds, 75 stalled
samples and five resynchronisations. Artifact latency peaks at 31.13 seconds.
The torus policy attempt also fails (six stalled samples, one resync). These are
failed application assertions on this shared software-rendered environment;
contention is possible, not a proven complete explanation. No timing pass is
inferred from the positive controlled policy regression. The 900-second sustained
assertions and all safety/authentication thresholds remain unchanged.

The verifier retains camera/interaction diagnostics and uploads torus evidence.
An explicit `S14_BROWSER_NO_VIDEO=1` development override isolates recording cost
without changing the default capture policy, complete assertion set or hosted
qualification. Populated visual-review recordings remain required and preserved.

The [single no-video diagnostic](million-no-video-diagnostic01.json) still fails:
89.75 seconds, backend 1.014 / admitted 0.379 / displayed 0.275 ticks/s, 31 stalled
samples, three resynchronisations. The recorded predecessor had 75 stalled
samples; artifact maxima fall from 31.13 to 6.14 seconds and derive maxima from
117.1 to 54.1 ms. Catch-up still reaches 17.88 seconds. These sequential shared-host
observations do not isolate video as the sole cause or establish a performance
pass. No further lucky reruns or widened throughput/safety allowances are used.

## Previously frozen recovery candidate (superseded by the local correction)

**Implemented and frozen locally; not deployed or fully release-qualified.** The
current runtime source is `4dd90b394b2dd32f2218d3887ef14938f91514b7`.
[Complete sixteen-file replacement manifest](frontend-files-recovery.json):
`03be346cdae416cfb77b071b16fa14355d07644642953c79e319c800afb2cd1d`.
JavaScript: `90f34c3d76b3ceb837d8361c259b14018f1d3c6e591f5fee2d49231c9ad6af46`.
[Clean provenance](build-manifest-recovery.json). The initial `5c2bb277` warning
candidate and its [original manifest](frontend-files.json)/[provenance](build-manifest.json)
remain preserved, with JS `4c0d3893…`; the two artifacts are not interchangeable.
Only the replacement bundle and build provenance differ in the complete file set.

[The full local source gate](source-recovery-verification.json) passes **1,812 JS /
199 Python tests**, reference outputs, source structure and documentation checks.
The exact replacement assets pass desktop/390/320 [read-only European browser checks](frozen-recovery-browser.json),
including real certificate verification, full served loopback file equality,
principal/text wallet copies, Update/Keep and unchanged clock/queue identity.
No production frontend publication occurred.

**Not ready for production approval:** published source `67ae8e05e252dc0030183254fb978453a6e3b45a`
has four substantive passes and two failures in
[CI run 42920726039](https://github.com/aodl/balls-2-the-wallz/actions/runs/42920726039).
[Exact job record](ci-67ae8e0.json). Hosted qualification of this replacement remains
NOT_RUN; no CI pass is assumed while the owner is away. Verification corrections
pass their focused installed/payment/browser paths. The measured cold recovery
now gets past startup, but the [90-second Normal continuity assertion still fails](million-recovery-failure.json):
about 0.846 backend ticks/s versus 0.111 admitted and 0.100 displayed ticks/s,
47 stalled samples and four resyncs. Fetch peaked at 10.98 seconds and catch-up at
17.62 seconds. This is a real failed assertion under the captured software/shared
host conditions, not a hardware pass or proof of a new backend defect. No assertion,
producer rate, reserve threshold or authentication check was weakened to hide it.
Rendered native hidden-return and hardware/phone performance remain separate
coverage limitations.

The [read-only production status](production-readonly-recovery.json), at
2026-11-11 01:19:28 UTC, confirms backend module
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`, total cycles
**1,666,517,331,689**, reserved cycles zero. Public status does not provide the SDK's
in-callback liquid balance; it is not inferred by subtracting reservations again.
The live source is healthy with no pending record, Trickle **0.01 ticks/s** and
admission open. Exact rules-7 configuration/source/receiving account remain bound.
The paid European backend, controllers/settings, financial authority and deployed
tactical assets remain untouched. The optional delegated-payment implementation
lives in a separate branch and is absent from this frontend candidate.

## Implemented contract

[UX-01..13](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md) remain normative. One
camera controller coordinates timestamp-based pan/logarithmic zoom, interruption,
Focus/Locate, My cannon, widest view and minimap navigation. Direct manipulation
remains immediate. A stable circular territory centroid re-centres the widest view
and exact diamond cut, reusing the existing atlas with at most four rectangles.
Ball picking and following use shared displayed verified positions, preserve zoom,
stop at unavailable coverage and end on manual navigation, destruction or identity
changes. No camera operation owns the observer, queue, clock or a payment draft.

Cannon selection has a persistent dual-tone ground footprint and one five-icon,
44px-target toolbar. Fire/Revive, Move and Build expand one instrument section;
collapse preserves the action draft. Wallet amount, principal, exact text memo,
payer and fee/retention warning remain visible. Legacy-address/hex-memo DOM and
handlers are removed; internal AccountIdentifier/memo bytes and historic records
remain supported. Update/Keep, clipboard fallback and scoped history remain.

The guide is depth-tested at ground height .028, starting .42 cells beyond the
source, with the canonical preview barrel/heading unchanged. White inner/outer
tails are brighter; the bounded tile wake fades independently over 1,250ms while
tail history expires at 350ms. Neither changes ownership/minimap or creates motion
when the verified playhead stops. Waiting for production is labelled “Waiting for
next update”; actual backlog/recovery uses “Catching up with on-chain activity ...”.

The UI-only Move guard excludes the source cell. Valid cell zero remains usable
from elsewhere. The backend interpreter is unchanged: an independent Ledger
client can still send a same-cell command accepted by the existing backend.

## Additional elastic-return correction

The owner extended this candidate before artifact freeze. The deployed warm policy
advanced to endpoint minus two supported wall seconds on each hidden poll. Its
same-head 5/35/300-second regression cases failed before replacement. The new
policy retains an unconsumed remainder or the latest complete useful interval,
keeps the queue/clock identities, and independently advances the authenticated
source/account/receipt head. Same-context resync can retain verified motion across
an explicit future presentation fence; no motion crosses the absent span.

Arrival estimates use distinct advancing heads and a bounded eight-sample cadence
history. Two differences are required; stale/insufficient/changed-context evidence
falls back to nominal. External pacing is 0.5–1.5× nominal with 0.12/s factor slew;
the unchanged pinned clock remains the endpoint ceiling. Delayed playback is
labelled while financial preparation uses current verified facts. Cosmetic history
resets on skips, with valid ball-follow reacquisition at unchanged zoom.

Controlled ten-minute jittered comparisons are in `.work/fluid-player-experience/elastic-measure03/results.json`:
old policy 517.1s of verified advancement / three exhaustion episodes; new policy
570.03s / two. Mean visual delay increases from 50.63s to 58.31s, maximum 119.97s to
127.44s. New effective rate ranges .005–.0128015 ticks/s at .01 nominal. Both still
exhaust coverage. Same-head .8-tick remainders last about 80s instead of 2s; a recent
whole interval lasts 100s. These are injected canonical intervals and controlled
clocks, **not** real background delivery, hardware or production timing claims.

An installed Normal run caught a real adaptive-pacing regression: discarding the
established delivery reserve yielded one stalled sample and 1.1693 displayed
versus 0.9829 admitted ticks/s over 89.53s, with a 4.35s maximum fetch. The unchanged
zero-stall assertion remains. The policy now retains the existing fast-tier reserve
and the larger measured delivery-work margin. A focused regression first failed
and now passes. Slow tiers still admit one complete interval without an additional
startup publication. These failed/incomplete records remain under `installed-observer02`.
The earlier `installed-torus01` failure was an obsolete synchronous Locate-visibility
assertion; the screenshot showed the action correctly visible after animation.
Its visibility, inertness and clock/queue assertions are retained after waiting for
the approved transition. Neither fix changes authentication, production pace or
backend code.

The corrected authenticated torus run passes the original steady assertions:
89.36s, zero stalled samples, 1.0071 admitted / 1.0167 displayed / 0.9847 backend
ticks/s, no resync, 12.86–19.65 buffered ticks, maximum fetch 4.13s. A subsequent
35.06s **controlled** document-hidden interval admitted fifteen newer authenticated
heads from two head queries, retaining one complete two-tick interval (8,590 encoded
bytes versus 74,699 before). The same session/clock/queue/camera survived; first
verified render submission was 31.6ms. Received encoded bytes were 131,979. This is
actual installed PocketIC/SDK/certificate execution, **not** native hidden-tab,
physical-display latency or hardware/phone qualification.

The million-cell run then exposed a cold-start distinction: a foreground snapshot
recovery could invoke warm retention before Normal's startup target was met. The
new eligibility guard preserves the cold foreground buffer while retaining data
for actual hidden/return and established playback. A subsequent startup attempt
reported a transport timeout, backend performance limitation and repeated retention
gaps on a shared host with unrelated compilation active. Those failed records
remain `installed-million04`; no assertion, source deadline or backend budget was
relaxed. The single unchanged-deployed-source comparison also failed the same 60-second
foreground startup predicate (214.34s including setup), using identical prepared
backend/harness inputs and a fresh pinned PocketIC. This supports an environmental
contribution but does not turn either failure into a pass. The million-cell gate
remains unresolved pending exact-source hosted qualification; neither deadlines
nor backend/application safety budgets were relaxed.

## Qualification and identities

Pre-addendum runtime source: `f792ca028452366a5199cd761b1d4e7d71e402ae`.
JavaScript: `3faaf030d13940b3154f47935b41a71f3b610bf511f4b9ca5ce93ffb1d65909b`.
[Preserved pre-warning sixteen-file manifest](pre-warning-freeze/frontend-files.json):
`ee8601863e31766f5e77035cbe3dfa2413d8544985f5931ba74705ac4ce44197`.
[Pre-warning builder provenance](pre-warning-freeze/build-manifest.json) records `source_dirty: false`, unchanged
locked dependencies and normal European backend binding. Fifteen files are public;
`.ic-assets.json5` is consumed upload policy. Actual files and all 41 maintained
bundled inputs were checked. Only HTML, CSS, JavaScript and builder provenance
differ from the preserved deployed tactical asset set. The owner subsequently
authorised the specific Move/Build warning below; that changes HTML/JavaScript
and requires a new final freeze. These preceding identities remain historical,
not interchangeable with the final candidate.
The original fluid-camera checkpoint is `a37fd351f8e3ac7a35046bc0122069bdd334ddce`.
Before the added elastic requirement, all 1,783 JavaScript tests passed in a bounded
isolated run (333.86s); the earlier 300s contended wrapper failed/incompleted. The
outer source JavaScript allowance is now 600s based on that measurement, with all
application work budgets/assertions unchanged. 199 Python tooling tests, source
structure, references and docs passed. Two unchanged forecast assertions passed
on baseline and candidate in isolation; that alone does not explain every earlier
contended result. Their failed/incomplete record is retained, not relabelled.
The added delayed label exposed a 150%-text header overflow (327px at a 320px
viewport). Preserving the account chip's intrinsic width and allowing the status
to wrap restores a 320px document; the failed integrated06 record is retained.
A focused slow-travel regression also proved that repeated collinear merges could
refresh an old tail for seconds. Merges now stay within 50ms buckets without
refreshing their 350ms creation expiry. Canonical state/ownership is unaffected.
The additional policy passes focused pinned-clock/player regressions; it still requires final
integrated/authenticated/browser and exact-source release qualification.
Initial failing/diagnostic records remain under `.work/fluid-player-experience/`:
`initial-failures.log` (four focused failures before implementation), `browser01`
(exact-scale floating point drift), `integrated01..04` (superseded effect-lifetime,
stale Build anchor and fractional scroll-edge checks), `depth01` (test-script syntax).
They are development records, not passes. A replacement command at the current
camera pose now cancels the prior animation; ball acquisition retains exact zoom.

## Release boundary and limitations

No production deployment under this task. All six substantive exact-source hosted
jobs remain necessary: Source conformance; Native conformance; Packaged DTR and
clean consumers; Runtime-lab Wasm; Browser HTTP and Web Crypto; S14 and million-cell
installed-IC qualification. Inventory is informational. A local subset or dirty
build is not hosted/source release qualification.

Actual application fixtures are disposable canonical kernel outputs, not claims of
IC authentication. Separate installed-IC/HTTP evidence identifies its actual trust
boundary. Software WebGL, emulated touch/keyboard viewport contraction and desktop
mobile viewports do not establish hardware/physical-phone/native-keyboard or
real-wallet qualification. No real transfer is sent. Receipt association is still
not inferred from local instructions, amounts, times or user reports. No new human
research or maximum-population qualification is claimed.

After source qualification and a separate exact-artifact approval, follow the
[installed-game asset-only procedure](../../../docs/operations/S14_OPERATOR.md).
Stage the complete frozen candidate in `.work/s14/assets` and use observer-only
`dfx deploy observer --network ic --no-wallet --no-asset-upgrade`, with the existing
scoped identity handling. Verify every served asset/header and backend module
preservation. On an approved rollback stage the preserved tactical set from
`.work/tactical-polish/frozen-final/frontend` and use that same asset-only route.
Never rebuild, upgrade or reset the backend as part of either operation.

## Read-only preservation inventory (10 November 2026)

A signed anonymous public management status query at 21:07 UTC observed backend
module `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`,
1,643,237,572,290 total cycles, zero reserved cycles and canister version 54553.
This is a total/reserved management observation, not a separately measured SDK
liquid balance, gross burn or lifetime forecast. No top-up or financial recovery
was attempted. Production's fifteen public files still match deployed tactical
identities; the retained sixteen-file rollback directory was checked byte for byte.
Reviewed inventory and original raw paths are in the [evidence index](qualification/index.json).

Local installed tests used normal Wasm
`b14049c0407bbfa5084cc7282b88e7c69631f0deed701142e773788b47479488`
and explicitly disposable test-hook Wasm
`d1f08a35a83be563f275023f732040c039bcf11001c64ead75e8054a71ba6513`.
These prepared local inputs differ from the installed production module and are
not claimed as a byte-reproduction of it. Backend sources, interfaces, locks,
prices and DTR pins were not changed by this task. Exact-frozen frontend checks
against the real read-only European backend are recorded separately.

## Source-publication boundary

The authorised ordinary non-force push was attempted with interactive credential
prompting disabled and failed because no GitHub username/credential was available.
The connected GitHub repository write route independently returned HTTP 403
“Resource not accessible by integration”. No credentials were inspected or
requested, no remote branch was rewritten, and no replacement CI run is claimed.
The final operator command and actual local head will be recorded after freezing.

## Final local source and browser checks

The complete final JavaScript run passed **1,807/1,807**, zero skips, in 270.99s;
199 Python tooling tests, all reference/vector checks, source structure and links
also passed. The source wrapper's original overall FAIL is preserved: its one
failing check was a new branch-name occurrence in STATUS.md's branding audit.
That paragraph was corrected in the committed candidate and the separate audit
passes. [Reviewed source record](qualification/source-reviewed.json) distinguishes
this correction from the [original wrapper](qualification/source-original.json).
This development run began before the clean source commit; matching maintained
input hashes are recorded separately. It is not substituted for hosted exact-source
qualification. No application budget/assertion was relaxed.

The final [integrated journeys](qualification/integrated-journeys.json) pass all
seven groups, including desktop/390/320, precise principal/memo/amount copies,
clipboard denial/manual copying, Keep/Update, history/account scoping, dormant
Revive, changed eligibility, keyboard/layout/reduced-motion checks, and unchanged
clock/queue through repeated panels. Final rendered controlled returns pass all
three sizes, with 7.9–20.5ms CPU render-submission timing for existing remainders
and 11.0–15.2ms after three newer intervals. One retained interval is 6,535 encoded
bytes; no request is needed for those controlled returns. These are synthetic
canonical fixture timings, not photon latency, native hidden-tab or production
certificate/latency evidence.

A video journey's accelerated touch acquisition missed a moving ball on the
390px software-rendered view. The original trace/image is retained. The verifier
now acquires through a real pointer/touch event at nominal fixture rate and only
accelerates after selection, retaining the same follow/zoom/coverage/clock tests.
This changes test scheduling, not application code or frozen assets. The corrected journey passes at all three sizes; the original failure remains
recorded alongside the final [fluid journeys](qualification/fluid-journeys-final.json).

## Pre-addendum rendered/verified evidence (unchanged components)

- [Tactical interactions](qualification/tactical-journeys.json), [HTTP/Web Crypto](qualification/http-webcrypto.json),
  [elastic rendered returns](qualification/elastic-rendered-returns.json) and
  [exact-frozen real-backend checks](qualification/frozen-real-backend.json) pass.
  The latter serves unchanged frozen bytes on loopback, authenticates the existing
  European paid game and verifies all fifteen public files and upload-policy
  headers. **It does not publish to the production frontend.**
- The real backend supplies schema 6 / 1000×1000 state, rules hash
  `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`,
  configuration `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`,
  source `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125`.
  Board time legitimately advances from 5284 to 5285 during the checks.
  Principal/default account agree with the verified source. Screen 45° copies
  `FIRE 1 255 1` exactly (UTF-8 `46 49 52 45 20 31 20 32 35 35 20 31`),
  with 0.1 ICP and separate fee/retention wording. Keep preserves that packet.
  All POSTs are queries/read_state; no paid command or update is sent.
- [Guide depth](qualification/guide-depth.json) retains sixteen heading/zoom
  comparisons with zero fixed solid-body overdraw versus a deliberately
  depth-disabled negative control. [Grid comparisons](qualification/seam-grid.json)
  retain 96 seam/DPR cases. Their renderer/shader input is unchanged by the final
  elastic/lifecycle corrections; reuse covers those static renderer paths, not
  exact-source hosted qualification or hardware performance.

### Genuine hidden lifecycle — PARTIAL, not a rendered return pass

[Native visibility](qualification/native-visibility-partial.json),
[environment](qualification/native-browser-environment.json), and
[repeated returns](qualification/native-repeated-returns.json) use one ordinary
headed Chromium 153.0.8010.12 on the existing user-local Xvfb. CDP attachment
avoids driver focus emulation; no throttling, freezing, sandbox or graphics
security bypass is used. Actual tab activation produces `document.hidden`.

Across 35.007s hidden, two requests and 60,409 encoded response bytes completed;
the accepted gameplay head count remained 1. An unchanged head is not a new
interval. Session, clock, queue and camera survive, followed by a genuine short
return and explicitly CDP-simulated suspension. Visibility observation takes
150ms and the fresh-certificate/current-operational predicate 887ms. CPU task
time is 0.796s across away plus initial return, not isolated hidden CPU.

Headed Chromium cannot initialise WebGL and honestly displays Arena unavailable,
so rendered return, first physical frame, selected-cannon/draft/packet retention
with graphics and real hidden motion remain **unqualified**. No rendered latency
is fabricated from network/CPU timestamps. Controlled-clock and installed
controlled-hidden evidence stays separately labelled. No further unsupported
headless/native attempts are used to manufacture a pass. A single normal
WebGL-capable browser check after any separately authorised controlled release
should cover the remaining rendered hidden-return boundary.

### Bounded software performance — measured limitation

[Matched samples](qualification/matched-performance.json) use identical canonical
fixture JSON (`a36aac9d…`), deployed runtime 031a8dfa versus this candidate, five
seconds per scene/viewport, without video. Chromium reports SwiftShader; this
is not hardware, native touch or physical-phone performance. Static six-entity
seam p95 is 16.7–16.8ms. Moving verified scene plus Fire panel:

| Viewport | Deployed p50 / p95 ms | Candidate p50 / p95 ms |
| --- | --- | --- |
| 1440×900 | 83.3 / 316.6 | 283.4 / 383.3 |
| 390×844 | 33.4 / 50.1 | 133.3 / 216.7 |
| 320×640 | 33.3 / 33.4 | 100.0 / 333.4 |

One [reverse-order diagnostic](qualification/reverse-performance.json) at 390px
finds candidate p95 33.4ms, baseline 66.7ms, candidate 233.4ms. The same candidate
is highly variable within that bounded session. All windows have zero measured
layout time and comparable script/task totals; no million-cell scan, atlas rebuild
or effect-buffer explosion was found. The earlier reverse attempt failed before
measurement because its bare fixture name was evaluated before async setup; the
verifier now waits safely for `globalThis.fixture`. That failed setup record is
retained. No speculative renderer/visual reduction follows from these noisy
software samples. They **do not establish smoothness** or erase the slow samples.

The moving samples use 14–16 draws, 418–894 triangles, one 4,000,000-byte ownership
atlas, 1–3 transient cells and 1–9 short tail segments at the sampled boundaries.
JS heap is 18.2–20.5MB (not native/GPU memory). Synthetic pointer-to-next-frame
samples are 3.3–23ms and include automation/renderer scheduling, not native input
latency. There is no GPU-backed device result or maximum-population claim.

## Current production preservation

At 22:07 UTC a fresh signed management query still reports backend module
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`,
1,712,733,713,339 total cycles, zero reserved cycles and version 55181. The
balance rose from the earlier sample: this discontinuity is not a gross-burn
measurement or a manual transfer by this task. SDK liquid balance is not inferred.
At 22:11 UTC the signed advisory run/source query reports Trickle 0.01 ticks/s,
admission open, no performance limitation, checked source binding, no source/run
error and zero pending records. No treasury operation was initiated.

Backend/game/finance/DTR/pin paths have no diff from the initial 079e542 checkout.
Production assets remain tactical; its exact retained sixteen-file rollback set
is preserved. No backend, frontend canister, setting, controller, source cursor,
financial journal or account was deliberately mutated. Ordinary autonomous paid
gameplay remains active; live world equality is neither required nor claimed.

## Exact-source CI and release continuation

| Substantive hosted gate | Final candidate status |
| --- | --- |
| Source conformance | NOT_RUN — publication access blocked |
| Native conformance | NOT_RUN — publication access blocked |
| Packaged DTR and clean consumers | NOT_RUN — publication access blocked |
| Runtime-lab Wasm | NOT_RUN — publication access blocked |
| Browser HTTP and Web Crypto | NOT_RUN — publication access blocked |
| S14 and million-cell installed-IC qualification | NOT_RUN — publication access blocked; local startup failures retained |

The six actual jobs in `.github/workflows/verification.yml` remain required.
No job is skipped/reclassified and the separate inventory is informational. The
old deployed b23ed313 CI does not qualify this changed runtime. Later reviewed
evidence/tool changes do not alter the frozen f792ca0 application inputs.

After refreshing the remote head, the operator's ordinary non-force publication is:

```sh
git push origin HEAD:refs/heads/release/btz-prelaunch-playability
```

Publish the local runtime plus evidence/tool commits once, then obtain all six
substantive conclusions for the resulting exact source. Do not deploy before
that gate closes. If a hosted assertion fails, inspect that operation and its
artifact rather than rerunning/weakening it. A separate frontend-only approval
must identify the exact frozen sixteen files and include bounded tactical-asset
rollback. Follow the installed-game operator route, never backend installation.

Physical phones/native software keyboards, real-wallet entry/transfers, hardware
frame rate, broad human research and maximum population remain unqualified. Local
instructions are not payment evidence; no speculative receipt association or
automatic refund claim is introduced.

## Owner addendum — selected-tile payment warning (UX-08/10)

Move and explicitly placed additional Build now show exactly, beneath the wallet
fields: “If another player claims your chosen tile before your action is processed,
the action fails and your ICP remains spent.” This replaces the generic warning;
they are never displayed together. “Wallet fee extra.” stays a separate line.
Fire, Revive and automatic first-cannon Join retain the ordinary retention warning.
An unchosen Build/Move cannot expose a new copyable packet. The warning derives
from the displayed packet, including Keep previous, not from an unrelated draft.
No command bytes, prices, eligibility, payment processing or refund policy change.

Four focused tests failed before implementation. The corrected focused
financial/UX set passes 39 tests; the HTTP/accessible-description suite passes
18 tests. Actual action-card browser assertions cover all five actions at
desktop/390/320 and check warning/fee separation and natural-scroll readability.
All five action cases pass in the final desktop/390/320 browser run, including
readability and fee separation. One initial Join probe used an account that already
owned a dormant cannon, correctly hiding Join; the test now uses the established
additional-cannon fixture where that account has no cannon. The original setup
failure is retained. The new final freeze is recorded separately. Earlier camera,
renderer, depth, elastic, lifecycle and performance records use f792ca0 inputs;
those input paths are unchanged by this copy addendum. They are reused only for
those unchanged components, not represented as final-artifact screenshots or
measurements. No second broad qualification programme is started.

## Reviewed media and capture qualification

[Populated screenshots and short actual-application recordings](media/README.md)
include the final warning-inclusive desktop/390/320 journeys, with exact input
hashes in the [media index](media/index.json). The unchanged elastic footage and
pre-warning direct-aim footage have their older source and limited reuse labelled;
older warning placement is superseded. No concept art, fake cursor or payment is
used. Before-state captures use the actual preceding tactical modules and the same
canonical fixture.

The [wire capture regression](qualification/wire-registration-corrected.json)
passes all eight scenarios, including independent replay of all 81 segments,
malformed/missing content rejection, cancellation, timeout and shutdown fencing.
The unchanged initial harness had registered only 36 responses before its 15s
outer fixture-readiness allowance expired. The outer allowance is now bounded to
60s with measured registration timing; capture/finalization deadlines, the
sub-1.5s timeout assertion and all replay assertions are unchanged. In the later
standalone run registration takes 0.012–1.036s, so that pass alone does **not**
establish why the original contended attempt missed 15s. Both records remain.
This is setup headroom, not a relaxed observation/certificate/runtime safety budget.

## Final warning-inclusive freeze and release decision

The final clean build is preserved at
`.work/fluid-player-experience/frozen-with-warning/frontend`, source
`5c2bb2772dbaad95b50fc77cdabb50ba26e36cee`. Its complete manifest above covers
fifteen public assets plus consumed `.ic-assets.json5`; the local cursor is
included. [Final maintained inputs](qualification/final-frozen-inputs.json) match
the committed source. The preceding f792ca0 freeze remains preserved and is not
substituted for these new bytes. Only HTML, JavaScript and build provenance change
between those freezes, for the explicit warning, separate fee and field ordering.

[Final exact-frozen verification](qualification/final-frozen-real-backend.json)
passes desktop, 390×844 and 320×640 against the actual read-only European backend.
All fifteen HTTP files match their actual frozen bytes, CSP/security headers
match upload policy, and observation uses genuine certificate verification.
First-cannon/account selection, exact text copy, Keep, principal/default address
binding and clock/queue preservation pass; all POSTs are query/read_state.
The backend's authenticated board advances naturally through ticks 5300–5301.
Signed advisory observations show Trickle 0.01 ticks/s, admission open, no
performance limitation, source binding checked, no source/run error and no
pending records. This is a local serving check, **not production publication**.

At 22:45 UTC a further [signed management query](qualification/backend-after-warning.json)
still reports module `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`,
1,703,857,252,391 total cycles, zero reserved cycles and version 55563. No SDK
liquid balance or gross-burn/lifetime is inferred. No financial or backend
operation was performed. The production frontend still serves the tactical set.

The ordinary non-force push of final runtime source 5c2bb27 was attempted after
refreshing the remote head, which remains 079e542. It failed with exit 128:
“could not read Username for https://github.com: terminal prompts disabled”.
The connector write route also denies access. [Actual push output](qualification/source-push-final.log)
is preserved; no credentials were inspected/requested. Thus there is no new
hosted run or six-gate pass to report. A subsequent evidence-only local commit
records these identities/results without rebuilding runtime artifacts.

**Recommendation:** publish the prepared local HEAD using the non-force command
above, obtain all six substantive exact-source conclusions, then make the separate
asset-only controlled-playtest decision with the documented coverage limits.
The installed startup failure cannot be labelled PASS from compilation or the
unchanged baseline failure. No additional redesign, backend work or benchmark
programme is proposed.

Representative executed commands (all raw paths indexed in qualification):

```sh
python3.11 -B tools/check.py source --output .work/fluid-player-experience/source-final
node --test --test-concurrency=1 tests/js/payment-warning.test.mjs tests/js/human-workspace.test.mjs tests/js/fluid-experience.test.mjs tests/js/ux-playback.test.mjs tests/js/arcade-pricing.test.mjs
python3.11 -B -m unittest discover -s tools -p test_observer_server.py -v
node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/fluid-player-experience/frozen-with-warning/frontend
```

Browser commands use `.work/browser-venv/bin/python -B` and the existing local
Chromium libraries (`LD_LIBRARY_PATH=/home/codexdev/.cache/browser-libs/root/usr/lib/x86_64-linux-gnu`):

```sh
tools/verify_fluid_browser.py --output .work/fluid-player-experience/browser-warning-accounts-corrected --video
tools/verify_fluid_frozen.py --assets .work/fluid-player-experience/frozen-with-warning/frontend --output .work/fluid-player-experience/frozen-warning-browser
```

These latter lines are script arguments to that Python executable. Earlier
1,807-test source execution and final focused 39-test/18-test warning runs are
reported separately; the updated whole suite is not falsely described as one
1,811-test hosted or clean-source run. [Reviewed conclusions](qualification/release-checks-reviewed.json)
retain original failures, partial native graphics coverage and nonqualifying
software performance measurements.

## Published CI follow-up — 2026-11-11

Run **42920726039** is final: Source, Native, Packaged DTR/clean consumers and
Runtime-lab Wasm PASS; Browser HTTP/Web Crypto and installed-IC qualification FAIL.
Inventory is informational. [Exact job record and diagnosis](ci-67ae8e0.json).
No runtime code, frozen file or production canister changed in the correction.

`verify_playability_actions.py` now tests 350 ms tail expiry independently of the
approved 1,250 ms wake, replacing the obsolete 950 ms shared-effect assumption.
The full populated UI journey passes at desktop/390/320. The installed verifier
uses principal/text copy controls and exact UTF-8 bytes, toolbar action state,
intentional same-cannon draft persistence and the 400 ms placement/double-click
window. Its complete real disposable payment/reconnect/upgrade path passes,
including certificate negatives and exact wallet bytes. Eight S14-harness and six
playability-harness unit tests pass; the integration harness compiles with locks.

The original epoch attempt exhausted the 180-second **outer test** allowance after
measuring verified new-epoch playback. The corrective allowance is 300 seconds,
with explicit stage timestamps; all browser waits, authentication, retained-gap,
continuity and gameplay assertions remain. That local attempt instead times out
performing the native Update instructions click. It is retained as FAIL. This
host is also running unrelated work; contention is possible, not a proven cause.
The corrected million-cell selection passes, but startup remains BUFFERING at
the 60-second limit: four verified ticks, 17-tick Normal target, authenticated
heads, no verification error. The earlier unchanged-baseline failure remains
relevant; neither test is relabelled PASS and no runtime/pacing floor is relaxed.

Raw records are `.work/fluid-player-experience/ci-67ae8e0/`. The downloaded hosted
installed evidence ZIP hash is verified against the upload digest. The frozen
sixteen files and complete manifest still match exactly. A later ordinary owner
push can qualify the corrective verification source; local work continues while
the owner is away. No CI pass is assumed as an evidentiary fact.

### Verified startup coverage under retention pressure

Further inspection of the failed million-cell capture demonstrates a narrower
mechanism than an unexplained timeout: accepted Normal heads advanced, three
snapshot resynchronisations occurred, and each cold recovery discarded its
unconsumed intervals before the 17-tick startup target could be met. The final
capture retained only four verified ticks and had never started playback. This
policy was present in the unchanged baseline too; that fact does not make it a
usable recovery policy under retention pressure.

A focused failing regression uses the actual pinned clock and verified segment
players to reproduce cold Normal recovery. The correction retains useful
same-identity verified coverage after an authenticated newer snapshot, using the
existing explicit source fence and warm presentation path. Uninterrupted cold
startup still uses its established jitter buffer. Missing spans are skipped,
never interpolated; clock/queue, latest financial authority and copied packets
retain identity. Exhausted intervals remain stopped. No backend pace, protection,
certificate or admission check changes. UX-04/05/06 explicitly supersede only the
old cold-resync discard rule. Twenty-eight focused playback/live tests pass; the
new installed browser result and new frozen artifact identity must be recorded
before this replacement is considered qualified. Original frozen `5c2bb277`
assets and all red/incomplete evidence remain retained.

### Recovery qualification closeout

The recovery policy change has a demonstrated red/green pinned-clock regression
and 28 focused live/playback passes. The complete source and exact frozen-browser
checks above pass. Installed startup succeeds where the prior capture stayed
BUFFERING, but continuous Normal delivery remains FAIL with the recorded latency
metrics; neither that result nor the earlier epoch native-click timeout is hidden.
The existing populated captures still apply to unchanged renderer, camera, shell,
composer, CSS and protocol inputs; only authenticated resync retention changed.
No hardware or production-cadence guarantee follows from them.

Remote head was read-only rechecked at `67ae8e05…`. No push was repeated. A future
ordinary owner push must obtain all six substantive gates on the resulting exact
source; the informational inventory job does not qualify it. Production publication
and any bounded frontend rollback still require a separate release approval.
