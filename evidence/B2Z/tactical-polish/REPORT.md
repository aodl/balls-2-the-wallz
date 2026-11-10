# B2Z tactical polish — deployed controlled prelaunch playtest

**Live and verified:** https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
The owner authorised this exact frontend-assets-only publication and bounded
frontend rollback. All six substantive jobs pass on `b23ed313`. All fifteen
public files match the frozen bytes and policy; the sixteenth file is consumed
upload configuration. Backend and asset-canister Wasm, controllers, settings,
paid-state authority and financial configuration remain unchanged. No rollback,
manual payment or cycle transfer occurred.

## Exact deployed identities and qualification

| Identity | Value |
| --- | --- |
| Frozen runtime source | `031a8dfa0bbd797176fe52557ef8676dfc26451a` |
| Preceding runtime qualification source | `515f3f73afc87cfc2929e56ff0c331aea23cc41a` |
| Latest fully qualified evidence/test source | `b23ed313c2ae57d681235575d1284763875d0f8b` |
| Latest passing CI | [42780040722](https://github.com/aodl/balls-2-the-wallz/actions/runs/42780040722) |
| Served JavaScript SHA-256 | `f993f930255435766eeeb65b960d06a189372f6fcd057768458fc33446272fde` |
| Complete sixteen-file manifest SHA-256 | `a7eb5d4a57df813a669d0dcdb46978f7984d937678a83935a719f23425c95cc2` |
| Preserved backend module | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Preserved frontend asset module | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |

[Actual hosted conclusions](production/exact-ci.json), refreshed 09:00:19 UTC on
10 November: Source conformance **PASS**; Native conformance **PASS**; Packaged
DTR and clean consumers **PASS**; Runtime-lab Wasm **PASS**; Browser HTTP and Web
Crypto **PASS**; S14 and million-cell installed-IC qualification **PASS**.
The informational production-inventory job is excluded. The earlier six passes
on `515f3f73` remain valid historical qualification, not a substitute for this run.
No push was repeated and no qualified artifact was rebuilt.

[Complete frozen manifest](frontend-files.json), [builder provenance](frontend-build-manifest.json),
[actual staged files](production/staged.json), [served bytes and headers](production/served-files.json),
[signed complete inventory](production/inventory-after.json) and
[machine-readable deployment](production/deployment.json) make the identities
independently checkable. Served verification completed **09:03:18 UTC**.
The inventory contains exactly fifteen public keys, with identity-encoding hashes
and lengths matching the frozen manifest and no leftover files.

### Every served public file

| Public path | Verified SHA-256 |
| --- | --- |
| `agent-api.md` | `ffbeb51fa266bdf5dc6309a14f6c3666125bd39aea969fd08af4ce1f83924b9a` |
| `app.mjs` | `f993f930255435766eeeb65b960d06a189372f6fcd057768458fc33446272fde` |
| `backend.did` | `8ad63054b7c84a5a3c99e56eb54721995fcaedce99c324d87437620516c330be` |
| `build-manifest.json` | `7d1bd090c72109dc96afa2a36c96a4ace485594f36859e90b60cdcf6a80c2aac` |
| `configuration-entry.bin` | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` |
| `configuration-legacy.bin` | `3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622` |
| `configuration-million.bin` | `cfd4fa714ee1c835b56e7f5939d9f1f56312bbbfc0c09775681e581dc3250c03` |
| `configuration-playability.bin` | `e7a8db840b355bec688d553aef1a9891bc5c1a030bc24f89d8d546f1dd916e68` |
| `configuration-torus.bin` | `6f06db2b7485f8c0bc116682e7a7f43317a3214f0d4d62bbc4d9b028ad11c9d4` |
| `configuration.bin` | `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42` |
| `cursors/reticle.svg` | `9c30f3fbd6be4a26691854d086584da0f4231b9a0a51e737d0a7c1f8edb8e892` |
| `deployment.json` | `b68c8dfab2c537720b224ab5d4f403a6c8b026adb672ba82b1822de1206c7066` |
| `icon.svg` | `2741efd82b7b00d4b2f1482e04140d7245e6afb08f1cf9905a93bb045e706888` |
| `index.html` | `c0165df9986d2b7fa1e59ccc9c2932a1f822ca06cfe6a01ae1414d20dd29d644` |
| `style.css` | `7666880f878d313668dc1667b49d1ea7f8d670d76e38230892d16c3d9e84ef0e` |

`.ic-assets.json5` is **consumed upload configuration**, not a sixteenth public
HTTP asset. Its staged SHA-256 remains
`096943a71e2351b550877318df3aa3a483ba9beeb57fe965a3249e4aa965ba9c`. Its required CSP,
Referrer-Policy, X-Content-Type-Options and Permissions-Policy match **all fifteen
public responses**. Existing hardened HSTS/frame policy is preserved. No runtime
CDN, remote font or policy relaxation was introduced. Cursor SVG and all config/
provenance files were verified, not only JavaScript.

## Publication, preflight and rollback preservation

The [publication log](production/frontend-publication.log) records the existing
observer-only route:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

Only observer assets were staged/published. DFX's generic “Upgraded code” line
also appears when the same asset module is already installed; `--no-asset-upgrade`
was used and certified before/after module hashes agree. No backend build,
install, upgrade, reinstall, reset, stop/start, transition, source migration,
controller/setting change or financial operation was invoked. No identity material
was inspected/exported. The existing operator principal was verified as a
controller of the two exact targets.

[Immediate certified metadata](production/metadata-immediate.json) and
[final certified metadata](production/metadata-final.json) preserve both controller
sets and subnet `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`,
with **13 certified member nodes**. [Preservation assertions](production/preservation.json)
and [certified game before](production/certified-immediate.json) / [after](production/certified-after.json)
preserve rules 7/schema 6, epoch 4, 1000×1000 dimensions, authenticated identity
and source/destination. One paid cannon and ball and received total 100,000,000
e8s remain. Normal autonomous simulation advanced; byte-identical territory/
scores are neither required nor claimed. Source cursor remains 40,180,669 with
zero pending records and no source error. Treasury conversion identity/totals
remain unchanged. Ledger-only player authority and normal backend timers remain.

The receiving principal remains **`s5ir5-gqaaa-aaaas-amyna-cai`**, default subaccount;
[independent derivation](production/account-derivation.json) agrees with the
certified AccountIdentifier
`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
Official Ledger/Index bindings remain unchanged. Event Horizon stays disabled;
the independent fallback stays 60 seconds. No browser callback is required for
an independent valid Ledger payment.

[Freshly retained prior set](production/preflight-files.json) contains the previous
fourteen public assets plus matching consumed configuration, at
`.work/tactical-live/rollback/frontend/`; its manifest is
`.work/tactical-live/rollback/manifest.json`. A second complete no-cache check
[reconciles the immediate prior set](production/preflight-files-reconciled.json).
Prior staging is preserved at `.work/tactical-live/prior-staged-assets/`.

An immediate pre-upload HTTP attempt failed on one `app.mjs` body: 382,425 bytes,
SHA `7f280d1bc5347dc9dfa23ef7ae1208bc4d289d3c02bac98615e68f951e0f3323`.
No publication had occurred. Its [failure log](production/preflight-immediate.log)
is retained. A [no-cache complete response](production/preflight-app-reconciliation.json)
matched the prior 1,875,173-byte `51c7f92a…` file. The independent
[signed prior inventory](production/inventory-before.json) confirmed all fourteen
prior identity hashes/lengths, and a fresh complete HTTP set passed before
publication. The original response's cause is not established; compression or
an application change is not invented as its explanation. This was reconciled
before any write. Final served candidate checks all pass.

For an authorised bounded rollback: preserve failure evidence, reconcile current
publication, verify every retained prior file against the saved manifest, preserve
current staging, stage only the retained prior set into `.work/s14/assets/` and run
the identical observer-only command. Verify every old served file/header/inventory
and backend preservation afterward. This cannot roll back paid backend state.
**No rollback was needed or executed.**

## Production application checks

[Actual served production matrix](production/browser.json) passes at **1440×900,
390×844 and 320×640**:

- Certified observation works before any account declaration. Existing public
  account declarations restore locally on reload; no wallet login/authority claim.
  The game/source use the genuine IC certificate verifier and correct backend.
- Cannon hover resolves to a pointer. Legal Move hover changes cursor/contour
  without changing the draft/memo; clicking commits a different legal tile and
  canonical Move instructions. All three production rows exercise that distinction.
  Nearby invalid cells were unavailable in this owned patch, so illegal-hover
  cases retain the qualified populated fixtures rather than fabricated live state.
- Fire screen 45° agrees with canonical `FIRE 1 255 1`; guide/handle screen bearing
  is 44.9868° at protocol quantisation. Screen 90° prepares `FIRE 1 315 1`.
  Local barrel/guide and dark cannon appearance were inspected in actual captures;
  unchanged canonical barrel/pivot regression evidence remains in the source record.
- Build requires an explicit eligible neighbouring site and matches the canonical
  price/memo helper. It does not promise first-entry placement or authoritatively
  create an entity. Move/Build prices and exact command bytes use current verified
  state. No paid action was submitted.
- Amount, primary recipient, UTF-8 memo and actual selected payer agree. Legacy
  destination is initially collapsed. All required copy values are checked exactly;
  editing invokes Keep previous/Update instructions, and clipboard denial exposes
  the coherent manual fallback. Fee/retention/no-refund wording remains in the
  ordinary scrollable card. No transaction-index/reporting workflow exists.
- The non-repeating zoom limit, pan/zoom and diamond-map navigation work without
  replacing the session/clock/queue. All three rows retain the same clock/queue
  and zero authenticated resynchronisations through account/action/card work.
  SVG bytes/CSS cursor path and normal pointer states are verified; native OS
  cursor capture is not claimed.
- Desktop verified playhead advances **4808→4808.018332**, with Slow displayed.
  The renderer also records actual transient effects/tails from displayed travel.
  Narrow views can honestly wait for the next Trickle publication. No motion is
  extrapolated; stationary ball close-up retains glow without tails/dark passes.
- Optional telemetry is deliberately failed only in the 320px browser context:
  Unavailable does not block verified observation or valid preparation.
  All observed browser POSTs are query/read_state, never payment/gameplay updates.

The initial 390px journey ended in **Reconnecting** with new preparation disabled,
not a false Live claim. The focused [twenty-second fresh-delivery observation](production/delivery-followup.json)
then remained verified Waiting with preparation available, zero failed requests/
page errors and the same clock/queue. It also verifies a real local camera seam
crossing **999.95→0.2446278**, with no playback reset. The transient's exact cause
is not established; it is not hidden by calling every sampled state Live.
The first follow-up [failed camera assertion](production/followup.log) is retained:
its starting x=999.5 at scale 96 moves only to 999.7946 for one key step, so it did
not cross a seam. An isolated execution of the actual Camera confirmed that test
setup error. The corrected starting x=999.95 crosses as intended; no application
code, threshold or assertion meaning was weakened. No broad matrix was rerun.

[Deliberate browser-local config corruption](production/negative.json) fails closed:
“Unable to verify game”, preparation disabled, waiting spinner hidden. This changes
one intercepted browser response only, not production assets. Actual operator
stop/protection/refuelling and malicious history are not induced on the paid game;
those cases retain the qualified fixture/security coverage. No security regression
was found that required rollback.

Actual captures: [desktop arena](production/1440-arena.png),
[desktop aim/card](production/1440-aim.png), [desktop Move](production/1440-move.png),
[390px aim](production/390-aim.png), [320px aim](production/320-aim.png),
[desktop wallet](production/1440-wallet.png), [390px wallet](production/390-wallet.png),
[320px wallet](production/320-wallet.png), [live ball](production/390-live-ball.png),
[live seam](production/390-live-seam.png). Narrow cards use one natural scroll;
a single screenshot does not pretend to display every field simultaneously.
Existing populated recordings, GPU seam comparisons and effect/pivot regressions
below remain evidence of their unchanged exact runtime inputs. This release adds
no visual redesign, performance campaign or synthetic production entities.

## Operating snapshot and remaining boundaries

Post-smoke backend: **1,897,853,578,095 total / 1,841,571,046,485 liquid cycles**,
selected and supported **Trickle 0.01 ticks/s**, admission open. SDK liquid is used
directly without subtracting platform reserves again. Margins are
**591,571,046,485 above 1.25T entry** and **841,571,046,485 above 1T exit**.
Frontend [post-publication balance](production/frontend-after.txt) is
**1,474,342,325,089 cycles**, reserved zero. These are observed query snapshots,
not gross execution cost, exact burn, populated lifetime or a funding guarantee.

[Source/runtime](production/after-lab_status.json) has no source/run error or
pending record; [treasury](production/after-controller_funding.json) is Idle,
unpaused/unhalted with no pending plan, but retains its pre-existing
`icrc1_balance_of` **Call deadline has expired** warning. No manual financial
recovery or policy/floor change was attempted. Normal autonomous processing continues.

Genuine hidden observation was measured earlier, but **real rendered hidden-tab
return remains unqualified**: this host's native headed WebGL could not initialise.
No browser security/throttling restriction was disabled to manufacture a pass.
Software-rendered production checks are not hardware smoothness, physical-phone,
native-keyboard or actual-wallet qualification. Existing frame-spike limitations,
receipt-association limitations, human-research and maximum-population limits
remain. No real wallet transfer occurred. This is a controlled prelaunch playtest,
not a claim of final polish or universal compatibility.

## Evidence publication and stop boundary

This follow-up changes evidence, STATUS and the current operator-report pointer,
not runtime/test/build/dependency inputs. It stays distinct from frozen runtime
`031a8dfa`, preceding qualification `515f3f73` and latest qualified `b23ed313`.
Its evidence-only commit uses `[skip ci]` to avoid an unnecessary replacement
campaign; no skipped workflow is counted as qualification. The actual six passing
conclusions remain those of run 42780040722. Publication uses the authorised
ordinary non-force repository route where available; the completion response
records its resulting commit or precise continuation.

The deployment itself is complete. **Only remote evidence publication is blocked**:
the connected GitHub Git-blob write returned `403 Resource not accessible by
integration`, and the ordinary non-force Git HTTPS push could not obtain a username
with terminal prompts disabled. [Publication result](production/evidence-publication.json)
and [ordinary push log](production/evidence-push.log) retain both outcomes. The
remote was independently rechecked and still points to `b23ed313`; the failed
push did not publish the evidence commit. No credentials were inspected, requested
in logs or bypassed. The final local evidence commit remains on the active branch.
The owner can publish it with `git push origin HEAD:refs/heads/release/btz-prelaunch-playability`.
This is an evidence-only continuation, not another deployment or runtime qualification.

**Frontend implementation stops pending actual human playtest feedback.**
The production frontend publication is complete; paid backend and financial
authority remain unchanged.

---

## Retained pre-deployment qualification and implementation record

# B2Z tactical polish — release decision record

## Qualification refresh — 10 November 2026

**Hosted qualification: all six substantive jobs PASSED on published source
`515f3f73afc87cfc2929e56ff0c331aea23cc41a`. All 16 frozen files are preserved and verified. Genuine hidden
observation is verified, but rendered warm return is only partially qualified
because native headed Chromium cannot initialise WebGL on this host. No
hardware-backed performance was available. No new application defect was
demonstrated. No production change or remote push was performed.**
[Backend/configuration and artifact-preservation summary](qualification-refresh/preservation.json).

[Hosted conclusions](qualification-refresh/hosted-ci.json), observed 07:39:43 UTC:
Source conformance **PASS**; Native conformance **PASS**; Packaged DTR and clean
consumers **PASS**; Runtime-lab Wasm **PASS**; Browser HTTP and Web Crypto **PASS**;
S14 and million-cell installed-IC qualification **PASS** (completed 07:37:15 UTC).
The informational production-inventory job is not included in these six.

The current published source is `515f3f73afc87cfc2929e56ff0c331aea23cc41a`,
not an unpublished candidate. [Exact-source run 42770541444](https://github.com/aodl/balls-2-the-wallz/actions/runs/42770541444)
and [current job record](ci-status.json) supersede the pre-publication status
preserved in [the original status file](ci-status-before-publication.json).
The detailed implementation/development record below remains historical evidence;
its NOT_RUN, unavailable-display and failed-push statements are not current facts.

### Unchanged frozen release inputs

| Identity | Exact value |
| --- | --- |
| Frozen runtime source | `031a8dfa0bbd797176fe52557ef8676dfc26451a` |
| Published qualification source | `515f3f73afc87cfc2929e56ff0c331aea23cc41a` |
| JavaScript SHA-256 | `f993f930255435766eeeb65b960d06a189372f6fcd057768458fc33446272fde` |
| Complete manifest SHA-256 | `a7eb5d4a57df813a669d0dcdb46978f7984d937678a83935a719f23425c95cc2` |

[Actual-file recheck](qualification-refresh/frozen-recheck.json) hashes and sizes
all 16 deployment files, recursively including `cursors/reticle.svg`, and rejects
missing or extra files. Fifteen files are public; `.ic-assets.json5` is consumed
upload configuration. No rebuild or dependency change occurred. The runtime-to-
qualification Git comparison changes evidence, documentation and test tooling,
not application/build/dependency inputs. The complete [manifest](frontend-files.json)
and [builder provenance](frontend-build-manifest.json) remain byte-identical.
The [15-file prior rollback set](qualification-refresh/rollback-recheck.json)
still matches the prior deployed manifest at `.work/tactical-polish/rollback/`.
Existing populated captures/recordings remain linked below with their original
fixture, acceleration and software-renderer limitations; no replacement media
was needed for unchanged runtime inputs.

### Genuine hidden operation: measured result and boundary

[Measured native-headed probe](qualification-refresh/hidden-observation.json),
[browser/GPU environment](qualification-refresh/browser-environment.json) and
[short/suspended returns](qualification-refresh/repeated-returns.json):

- A user-local Xvfb display ran real headed Chromium 153.0.8010.12. Native tabs
  changed `document.hidden` through actual tab activation. No timer-throttling,
  freezing or browser-sandbox bypass was used. The original Playwright launcher
  remained unsuitable: its pinned driver enables focus emulation. Connecting to
  a disposable native browser with `connect_over_cdp(..., no_defaults=True)`
  avoids that automation override. Disabling focus emulation from a separate
  CDP session did not clear the driver's own override; those earlier probes are
  retained as setup limitations, not application failures.
- During **35.006 seconds hidden**, two application requests ran and **57,523
  encoded response bytes** completed. The accepted gameplay-head count stayed
  one: no new gameplay head was admitted during that window. Authentication
  remained the IC certificate verifier; an unchanged root is not a stale-
  certificate failure. A newly available head was verified after return.
- Return to observed visible state was **137 ms**; the probe's fresh certificate/
  current operational-state predicate completed after **660 ms**. These include
  automation/scheduling overhead and are **not first rendered-frame timings**.
  CPU TaskDuration increased **1.222 seconds across away plus initial return**;
  pure hidden CPU was not isolated. JS heap was 9,622,698→7,704,318 bytes, latest
  verified state 10,554 bytes, queue bytes zero at the sampled boundaries. This
  does not measure native/GPU memory or establish a long-run memory bound.
- The same session, clock, queue and camera survived. A subsequent **3.012-second
  real hidden return** and **8.028-second deliberately CDP-frozen return** preserved
  them and stayed within authenticated coverage. The latter emitted actual
  freeze/resume events but is explicitly simulated suspension, not proof of an
  OS-driven freeze or a day-long absence. Controlled-clock tests cover long gaps,
  full queues, deadlines and freshness races separately. A second authenticated
  B2Z tab booted independently; no cross-tab queue sharing was added.
- Native Chromium's graphics process exited three times (exit 133), then reported
  WebGL disabled and the application correctly showed **Arena unavailable** with
  new payment preparation disabled. Consequently this run cannot qualify visible
  motion, first rendered frame, or selected-cannon/draft/copied-packet retention
  in a rendered hidden-return journey. It did not enable unsafe graphics fallback
  or weaken browser security to obtain a pass. The overall probe is **PARTIAL**,
  exit 2. Separate exact-frozen rendered account/copy/clock tests below remain
  valid, but do not fill this real-hidden rendering gap.

No GPU-backed browser/device was available. The earlier moving SwiftShader p95
450/167/133 ms measurements remain limitations, not hardware qualification.
This pass found no measured rendering regression or bounded-work defect requiring
another implementation round. It ran no new broad benchmark or backend suite.
The [13 focused controlled regressions](qualification-refresh/controlled-regressions.log)
pass; `python3.11 -m py_compile tools/verify_warm_browser.py` and its maintained CLI
help pass. Verification tooling now supports a dedicated loopback native-browser
connection, preserves normal lifecycle settings, records partial graphics results
honestly, and exercises repeated returns. Product UX contracts are unchanged.

### Refreshed read-only production facts

[Certified metadata](qualification-refresh/production-identities.json) at
07:16:39 UTC confirms both expected canisters/controllers on the expected
13-node European subnet. Backend module is unchanged:
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
Frontend asset-canister module is unchanged:
`04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
A [fresh HTTP check](qualification-refresh/live-frontend-check.json) also confirms
the prior JavaScript `51c7f92a…` remains served; it is a one-file preservation
check, not a new complete served-assets qualification.

The [controller runtime query](qualification-refresh/runtime.json) reports total
**1,923,984,940,571** and SDK liquid **1,867,702,408,961** cycles, **Trickle
0.01 ticks/s**, admission open and normal autonomous processing. Liquid margin
above the 1.25T entry is **617,702,408,961**; above the 1T exit it is
**867,702,408,961**. These are snapshots, not runway guarantees; no reservations
were subtracted a second time. The separate [public status sample](qualification-refresh/public-status.json)
is timestamped by the associated metadata collection and is a different request,
so its slightly lower total is not a discrepancy or a gross-burn measurement.

[Source state](qualification-refresh/lab.json) retains the official Ledger/Index,
default receiving account, checked binding, zero pending records and no source
error. [Treasury](qualification-refresh/treasury.json) is idle, not paused/halted,
with no pending conversion plan. Its pre-existing balance-query deadline warning
remains disclosed; the last successful CMC result targets the actual backend.
No manual payment, cycle transfer, treasury action, controller/setting change,
backend operation or frontend deployment occurred. Legitimate autonomous state
continued advancing. Event Horizon remains disabled and the 60-second fallback
and all pacing/financial rules remain unchanged.

### Final read-only snapshot after CI

At **07:39 UTC**, [certified metadata](qualification-refresh/production-identities-final.json)
again verifies the same backend/frontend modules, controller sets and 13-node
European placement. [Final controller runtime](qualification-refresh/runtime-final.json)
reports **1,918,533,707,563 total / 1,862,251,175,953 liquid cycles**. The
[actual pace/source query](qualification-refresh/lab-final.json) still reports
Trickle **0.01 ticks/s**, admission open, running, source bound with no error or
pending records, and no transition. Liquid margin is **612,251,175,953 above entry**
and **862,251,175,953 above protection exit**. No additional reserve subtraction or
lifetime estimate is applied. [Final treasury query](qualification-refresh/treasury-final.json)
remains idle with no pending plan and the same disclosed balance-query deadline
warning. These observations were not a new consumption experiment; their net
change is not reported as gross execution burn.

### Release decision and narrow continuation

**Recommendation: approve these exact frozen assets for a controlled-prelaunch
frontend-only release, with explicit acceptance of the remaining rendered warm-
return and hardware coverage limitations and bounded frontend rollback.** The real-
hidden verifier work now has direct browser evidence. A rendered warm-return
review remains a coverage limitation requiring an ordinary WebGL-capable browser;
it is not a demonstrated application failure. Hardware performance, physical
phones, native mobile keyboards, real-wallet entry and receipt association remain
unqualified/limited as previously documented. No production publication is
permitted by this task.

All six source gates are closed; no implementation blocker was demonstrated.
No push or replacement CI run is required for the already published runtime.
This local follow-up changes only evidence/documentation and verification tooling;
its later commit must remain distinct from the qualified source and frozen runtime.
The owner will perform any final ordinary non-force evidence push.

The narrow outstanding visual check is to run the maintained probe in a dedicated
headed WebGL-capable browser with ordinary throttling, select a cannon, retain a
local draft/copied packet without sending, background >30 seconds and return.
Record first rendered verified frame and UI retention separately from certificate/
operational freshness. [Continuation notes](qualification-refresh/README.md)
explain the native-CDP option and the exact remaining evidence boundary.

A later single deployment approval must name the unchanged manifest/hash above
and explicitly cover frontend-assets-only publication plus bounded rollback via
[the installed-game procedure](../../../docs/operations/S14_OPERATOR.md).
Refresh operational facts immediately before any authorised publication. Never
run fresh-genesis, backend deploy/activation, settings or financial commands.

---

## Historical implementation and pre-publication record at 515f3f73


Implementation is frontend-only. This candidate is **not deployed or approved for
production**. Exact-source hosted qualification and its concrete remaining actions
are recorded in the close-out below. No backend, setting, controller or financial
operation is authorised or performed by this release.

## Changes and confirmed causes

- Shared displayed-copy picking now resolves hover and activation together, with
  practical base/barrel hit areas, captured aim ownership and overlay exclusion.
  Legal hover never changes the draft. Chosen Move/Build retains a distinct contour
  and ghost; invalid hover has a cross and cannot retarget a chosen packet.
- The diamond overview uses the arena's exact projection/inverse for atlas,
  footprint, markers and keyboard navigation. Transparent corners pass through;
  captured edge drags keep the last valid location. Main camera limits are unchanged.
- Grid filtering now differentiates continuous coordinates before wrapping; the
  torus uses top planes without false outer side walls. Bounded historical worlds
  retain depth. GPU testing also exposed an inherited atlas upload defect:
  multi-row ranges were interpreted by pinned Three as single rows. Large ownership
  changes could leave stale GPU colour despite correct CPU data. Valid single-row
  partial uploads (≤32) or one bounded full persistent-atlas upload now replace
  invalid oversized ranges. No ownership/physics data is modified.
- Gunmetal bodies retain stable owner accents and readable muzzles. A local
  selected-cannon barrel override uses the final canonical encoded aim only at the
  matching displayed location. Latest-state differences use a ghost. A light 2px
  guide with dark 4px underlay extends past the handle, with a short direction tip.
- White cores and batched camera-facing halos remain depth-tested. Short bounded
  displacement histories drive inner/outer tails and 20% transient cell darkening,
  fading over 350ms. Stationary/camera/resync motion creates no travel effect;
  the atlas and minimap are never darkened.
- Graphite cards, consistent tokens, deliberate hover/press/focus/disabled states,
  a local 28px reticle with 14×14 hotspot/native fallback and readable dominant
  amounts preserve the single nonmodal composer and exact wallet instructions.
- Hidden scheduling no longer wakes at 250ms just to skip work. Due-time checks
  use 15s observation/60s operational refresh when hidden but executing. One
  verification pipeline compacts only retained verified coverage before capacity
  checks. Return preserves useful clocks/queues and at most two seconds of recent
  supported-rate lag; an unchanged root no longer forces an endpoint reset.
  Frozen/BFCache pages disarm work; discard uses normal authenticated boot.
  Scoped finite SDK fetch deadlines reach underlying reads without changing
  optional telemetry or global fetch. No certificate/anti-rollback rule changed.

## Maintained contracts and qualification

The normative [UX specification](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
retains UX-01..13 and maps tactical changes under UX-02/03/04/05/11/12. Financial
UX-07..10/13 remain intact. Only square-map orientation, bright passing-cell effects,
the old tail cap and unconditional hidden observation suspension are superseded.
Primary references and adopted hierarchy/contrast/lifecycle principles are linked
in that specification; no borrowed assets, new framework or dependency update.

Raw local evidence is under `.work/tactical-polish/`. Failed/incomplete development
attempts are retained, including unavailable Python/browser-library setup, an old
square-map click assertion, a debug-inspection scope error, a CSP string-evaluation
harness error, an offscreen hover probe, browser crashes/timeouts and the GPU
comparison that diagnosed stale atlas uploads. They are not relabelled passes.

Executed focused regressions: **266 PASS**, including canonical quote/memo bytes,
identity/subaccounts, frozen-copy replacement, optional telemetry isolation,
pacing/status, torus/projection, lifecycle scheduling, underlying SDK cancellation,
bounded warm return and reflected/seam effect expiry. Command:

```sh
node --test --test-concurrency=1 tests/js/tactical-polish.test.mjs tests/js/player-*.test.mjs tests/js/ux-*.test.mjs tests/js/mainnet-policy.test.mjs tests/js/public-cycle*.test.mjs tests/js/action-quote-v6.test.mjs tests/js/arcade-pricing.test.mjs tests/js/memo*.test.mjs tests/js/text-memo.test.mjs
```

The broad `python3.11 -B tools/check.py source --output .work/tactical-polish/source`
is **FAIL/incomplete**: node-tests reached its outer 300s limit (313.722s observed),
and source-structure its 180s limit (187.955s). Neither produced an assertion
failure; the exact cause of all broad-run delay is not established. Vector/reference,
docs and Python tool checks passed. This is not a complete source pass. Safety
budgets/assertions were not weakened. Hosted exact-source CI must resolve it.

All six jobs in `.github/workflows/verification.yml` remain required: Source
conformance; Native conformance; Packaged DTR and clean consumers; Runtime-lab Wasm;
Browser HTTP and Web Crypto; S14 and million-cell installed-IC qualification.
The informational BLOCKED production inventory is not qualification. Prior green
984a1aa CI does not qualify these changed inputs.

## Visual/performance coverage and limits

Actual populated fixtures use maintained canonical outputs and the real composer,
camera, shell and renderer. They are not IC certificate or payment evidence.
`verify_tactical_browser.py` passes desktop/390×844/320×640 interaction checks;
`verify_tactical_grid.py` compares actual shader seam/interior pixel crops at
DPR 1/1.25/1.5/2, fractional/play/max zoom and all seams/corners (96 comparisons, PASS). A deliberately defective test-only variant changing only `fwidth(ground)` back to `fwidth(cell)` fails at scale 9.37 with 3.125% of channel samples differing by >8, versus the fixed variant passing the unchanged 2.5% tolerance. That isolates the derivative discontinuity from top-plane geometry and atlas data; it is not a release artifact. Final reviewed
media and exact artifacts are recorded below, separately from development captures.

The matched six-entity seam sample is software ANGLE/SwiftShader, 5 seconds per
viewport, without video. Baseline frame p95 ~16.8ms; candidate ~16.7–16.8ms.
Candidate draw CPU p95 2.30/2.10/1.50ms (desktop/390/320), versus baseline
2.30/2.00/2.10ms. Static cached scenes are not a populated moving-game smoothness
pass. Geometry/atlas/effect limits stay bounded; detailed raw metrics include
CPU-task duration, heap, draw calls and buffers. The first empty-view sample is
retained and excluded from the populated comparison. Video-encoded samples are
visual evidence only. Physical phones, native keyboards, actual wallets and
hardware-backed performance are unavailable; no aesthetic acceptance is invented.

Headless Chromium reports both tabs visible. Controlled hidden-clock tests are
not real OS-hidden execution evidence. The original CDP freeze/resume attempt did not emit the required real lifecycle
events and timed out; it is FAIL, not suspension evidence. The corrected probe
requires actual tab hiding, keeps ordinary throttling enabled and reports BLOCKED
when the browser reports both tabs visible; no background freshness guarantee or anti-suspension workaround exists.
Residual independent read cost in two tabs is documented, not concealed by new
coordination infrastructure. Receipt association remains unsupported; copied
instructions are not payment proof. No real transfer or paid test scene is used.

## Production preservation and continuation

Read-only certified metadata refresh verifies backend module
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`, unchanged
controllers and the expected 13-node European subnet. Aliases remain backend
`s5ir5-gqaaa-aaaas-amyna-cai`, frontend `s2jxj-liaaa-aaaas-amynq-cai`; default
AccountIdentifier `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
The prior deployed asset manifest and actual files are retained for rollback;
this task performs neither deployment nor rollback. Preserve all paid state,
source cursor, pending payments/treasury plans and ordinary autonomous processing.

After all six exact-source gates and visual review pass, request one explicit
release decision. Only then follow the [installed-game asset-only procedure](../../../docs/operations/S14_OPERATOR.md),
refresh actual modules/state/controllers and verify every served asset/header.
The same asset-only route can restore the retained previous set under bounded
rollback authority. Never invoke backend install/reset/activation. No production
change is implied by a local build or source publication.

## Frozen candidate and remaining release gates

**Final frozen runtime source:** `031a8dfa0bbd797176fe52557ef8676dfc26451a`.
The later commit containing this completed record changes qualification tests and reviewed evidence/documentation
only; it does not change runtime/dependency/build inputs. Its Git identity is the source candidate to publish/qualify; runtime inputs
remain those of the clean frozen source. No existing CI run was superseded.

| Frozen identity | SHA-256 |
| --- | --- |
| JavaScript | `f993f930255435766eeeb65b960d06a189372f6fcd057768458fc33446272fde` |
| Complete file manifest | `a7eb5d4a57df813a669d0dcdb46978f7984d937678a83935a719f23425c95cc2` |

[Complete manifest](frontend-files.json), [builder provenance](frontend-build-manifest.json).
All **16 actual files** were independently hashed/size-checked. Fifteen are public
HTTP assets; `.ic-assets.json5` is consumed upload configuration. Its bytes,
including CSP/security headers, equal the prior deployed policy. New cursor bytes
are included. Frozen files remain at `.work/tactical-polish/frozen-final/frontend/`.
Older intermediate frozen directories are superseded development artifacts, not
alternatives to install. Replacement builds were necessary for the muzzle-axis,
bounded long-return, hidden-resize, shared-token/contour and delayed-reply fixes;
dirty intermediate builds were rejected, and the final isolated source is clean; no rebuild occurred merely for evidence.

The established build command was:

```sh
node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/tactical-polish/frozen-final/frontend
```

That directory already exists and must not be overwritten. Its manifest records
`source_dirty: false`. Dependency locks, backend/kernel/protocol code and deployment
mappings are unchanged. The previous deployed 15-file set was independently fetched
and verified: [rollback check](rollback-verification.json), actual retained files
`.work/tactical-polish/rollback/`. Live JavaScript remains `51c7f92a…`, not this candidate.

[CI status](ci-status.json): all six substantive hosted jobs are **NOT_RUN** for
this candidate. The ordinary permitted push failed because Git cannot obtain an
HTTPS username with terminal prompts disabled. No credential was inspected,
requested in logs or bypassed. The last observed remote is `4f902870…`.
The completion response provides the exact ordinary non-force continuation for
the resulting evidence/source head. Publishing that head must trigger all six
jobs; this commit deliberately has no skip-CI marker. The old 984a1aa pass does
not qualify it. [Development source failures](development-source-result.json)
remain FAIL/incomplete; no full repository pass is claimed.

## Actual browser and visual evidence

[Functional matrix](functional-browser.json): desktop, 390×844 and 320×640 pass,
plus reduced motion, text scaling/viewport contraction, touch/pinch/cancel,
account-caret preservation and three verified disposable slow intervals.
It exercises actual maintained components with synthetic canonical state, not
mainnet financial admission. These checks were executed before the final
presentation/return freshness guards; unchanged composer, memo, identity,
pricing, storage and observation trust inputs justify financial evidence reuse.
The final canonical warm-return tests pass separately. Exact-source CI must still
execute the final tree. No local subset is promoted to that qualification.

[Fixture provenance](fixture-provenance.json) independently rebuilds the test fixture
in memory and proves byte equality with current maintained renderer/composer
inputs. Final captures below use those same inputs; no generated mock-ups or fake
cursor were inserted. [Visual result](visual-review.json), [timing provenance](visual-timing-provenance.json):

| View | Populated arena | Wallet instructions | Waiting | Actual recording |
| --- | --- | --- | --- | --- |
| Desktop | [capture](1440-populated.png) | [capture](1440-wallet.png) | [capture](1440-waiting.png) | [journey](1440-journey.webm) |
| 390×844 | [capture](390-populated.png) | [capture](390-wallet.png) | [capture](390-waiting.png) | [journey](390-journey.webm) |
| 320×640 | [capture](320-populated.png) | [capture](320-wallet.png) | [capture](320-waiting.png) | [journey](320-journey.webm) |

Recordings cover hover, handle drag/barrel/guide, exact copies and explicit
replacement, close/reopen during verified motion, Move selection, Build ghost,
diamond navigation, seam travel and genuine waiting/resumption within fixture
coverage. They use **100× disposable wall time**, not production cadence.
The recorded 20× desktop attempt hit its existing 15s drain deadline under
software-renderer/encoding load and remains [failed](release-visual.log).
The functional no-video 20× checks pass; their assertion/deadline was unchanged.
Video may omit the OS pointer; computed local SVG/native fallback was checked,
but no native-pointer/physical-phone capture is claimed. Real OS-hidden return
is absent from these clips and remains a qualification gap.

The grid result is [96 actual pixel comparisons](shader-comparisons.json): maximum
mean channel difference 0.0525 and no channel difference >8, against fixed limits
1.5 mean / 2.5% channels >8. The [negative derivative variant](shader-negative.json)
fails the same limits, isolating the wrapped-derivative cause from atlas and top-plane
geometry. The old side-wall contribution to the owner's precise incident was not
independently measured; its removal follows the torus having no physical outer wall.
Existing canonical atlas/corner/ownership tests remain; the flat-colour pixel matrix
does not pretend to be an exhaustive cross-owner GPU boundary measurement.

## Performance and lifecycle limits

[Complete matched measurements](performance.json) retain five-second unencoded
windows on ANGLE/SwiftShader. Six-entity seam scene:
[desktop before](1440-before.png) / [after](1440-after.png),
[390 before](390-before.png) / [after](390-after.png),
[320 before](320-before.png) / [after](320-after.png).
The moving sample uses the same canonical active-cannon/ball fixture and pace in
both versions, with actual effects and UI/layout work. No hardware is inferred.

| View | Moving baseline frame p50/p95 | Moving candidate frame p50/p95 | Candidate draw CPU p95 | Moving draw calls, baseline→candidate |
| --- | --- | --- | --- | --- |
| Desktop | 266.7 / 1083.3 ms | 283.4 / 450.0 ms | 27.0 ms | 9→12 |
| 390×844 | 116.6 / 150.0 ms | 83.4 / 166.6 ms | 18.7 ms | 9→12 |
| 320×640 | 66.7 / 100.1 ms | 100.0 / 133.4 ms | 28.6 ms | 9→12 |

These small, contended software samples are **not a smoothness pass**; narrow p95
is worse in this sample. CPU task use is roughly the full five-second moving
window in both versions. The static cached six-entity scene does not establish
moving-game FPS. Atlas remains 4 MB, instances/effects/history remain capped and
no per-frame atlas reconstruction was introduced. No specific additional bottleneck
was isolated sufficiently to justify removing requested visual features or tuning
backend/authentication. Hardware-backed motion review remains needed.

[Actual visibility probe](visibility.json) is **BLOCKED**: the headless browser
reports both tabs visible. The built normal frontend genuinely booted and verified
the live backend/default source with the IC certificate verifier before this check.
The earlier 35-second CDP attempt did not emit freeze/resume and timed out; it is
not proof that the browser executed hidden work. No latency/hidden-byte/CPU/memory
numbers are fabricated for that unsupported state. Controlled tests prove due-time
single flight, stop/resume, pending-read cancellation, old-interval retention and
bounded long-return points; they do not replace real lifecycle evidence.

For an environment with an actual display, the bounded read-only continuation is:

```sh
.work/browser-venv/bin/python -B tools/verify_warm_browser.py --headed --assets .work/tactical-polish/frozen-final/frontend --output .work/tactical-polish/actual-hidden-review
```

Keep throttling enabled. It must actually observe `document.hidden`, record the
>30-second interval and two-tab behaviour, then measure verified return. Frozen,
BFCache/discard and offline/epoch races beyond controlled tests are not falsely
claimed as real-browser passes. This gap and all six hosted jobs remain open.

No production write occurred: paid entities/history, Ledger-only command authority,
backend module, controllers, settings, economics, pacing and independent source/
treasury processing remain untouched. [Certified production identity refresh](production-identities.json)
and the unchanged served rollback set document that boundary. The candidate is
prepared for review and source publication, **not yet fully release-qualified**.


## Final current-artifact checks

The final ordinary bundle itself passes [read-only authenticated browser smoke](frozen-bundle-browser.json):
IC-root verification of the real backend/source, principal/default destination,
exact canonical `FIRE 1 255 1` UTF-8 copy, explicit Keep previous, no-refund warning,
and unchanged clock/queue through account/action panels. [Actual frozen-bundle wallet](frozen-bundle-wallet.png).
All browser POSTs are query/read_state. No real transfer, signing, login or payment
report was used. This is distinct from the synthetic populated media.

The final [freshness/race checks](return-fencing.log) pass (18 checks, a subset of
266): pre-hide health generations and over-age replies are rejected; actual
certificate age cannot be made fresh by a late receive or paused monotonic clock;
fresh slow-tier information rebases retained coverage without another publication.
The five-minute certificate verifier and financial rules are unchanged. Health
freshness remains advisory, distinct from authenticated gameplay. Normal operation
and copy/observation independence pass in the final bundle; real hidden/frozen
browser transitions remain unqualified here.

[Real seam-drag regression](cursor-seam.json) / [recording](seam-pan.webm) verifies
that press alone does not show grabbing, actual drag does, and camera y wraps
999.5→0.4234 without a map cut. Its one automation-observed response was 388.9ms,
including CDP/renderer scheduling, **not** native device latency or a responsiveness
pass. This exact maintained helper is now invoked by the existing browser matrix.
The normal SVG/fallback remains system cursor rendering; recordings can omit it.

[Current signed production asset inventory](production-inventory.json) still has
exactly the old fourteen public keys. All old served bytes were retained and
matched before work; production is still the preceding player-centred release.
No asset publication, backend mutation or canister setting change occurred.

Only the reviewed final frozen directory is a release candidate. The remaining
source continuation must publish the final qualification/evidence head without
force and obtain six substantive passing conclusions. A real display must also
complete the >30-second hidden return/metrics review, and the software performance
limits above must remain visible at the release decision. No production permission
is requested or assumed in this report.
