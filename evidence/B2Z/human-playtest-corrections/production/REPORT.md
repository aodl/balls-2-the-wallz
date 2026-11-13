# European frontend publication — 13 November 2026

The owner authorized **frontend assets only** for qualified source
`7d6c8f690ca371c14e347c9dd454502a92f7fc2d`, runtime
`ca8b1f821932cd3b2bd164c84b07935453d8fb6a`. The established assets-only command
completed, and all fifteen public HTTP assets and their security headers match
the approved frozen set. Live browser acceptance is recorded below separately
from historical source qualification. **Live read-only acceptance PASS within
the explicit device/network/scenario limits below; no rollback required.**

## Source and immutable bytes

| Item | Identity |
| --- | --- |
| Remote release branch, checked before and after | `7d6c8f690ca371c14e347c9dd454502a92f7fc2d` |
| Local starting HEAD | `9b7d5bbd1426f23aedde6cb1a8babc65cc140a75` |
| Last runtime change | `ca8b1f821932cd3b2bd164c84b07935453d8fb6a` |
| JavaScript, 2,010,198 bytes | `9d45b94008d6f417c4d685c76d52b8a869af34c4b950aea395596ef13104014c` |
| Complete sixteen-file inventory | `f85e3ddf9b1ed38dd7b441162f7579707b5e7ef1c10c0612d0990795cb46e99c` |
| Build manifest | `0200b6b608e54fff7845fee671b0d1e786af1a5083af341a276e987e5cdd1be7` |
| Consumed upload policy | `096943a71e2351b550877318df3aa3a483ba9beeb57fe965a3249e4aa965ba9c` |

The working tree was clean. The ten-file `9b7d5bb` diff was inspected and changes
only STATUS/documentation/evidence. Runtime, builders, dependencies and frozen
bytes are unchanged. The owner-approved freeze already existed at
`.work/panel-closeout/frozen/frontend`; every file was checked before staging at
`.work/s14/assets`. **No application rebuild occurred.**

All six substantive gates were independently rechecked in
[run 43384453868](https://github.com/aodl/balls-2-the-wallz/actions/runs/43384453868):
Source, Native, Packaged DTR/clean consumers, Runtime-lab Wasm, Browser HTTP/Web
Crypto, and S14/million-cell installed-IC all concluded success. The informational
production-inventory job is excluded. See [rechecked conclusions](ci-rechecked.json)
and the [exact qualification record](../panel-closeout/ci-7d6c8f6.json).

An ordinary non-force push of the existing report commit was attempted. This host
has no usable HTTPS Git username credential (`could not read Username` with
terminal prompting disabled). The commit remains intact locally. This is a
publication housekeeping limitation, not a missing qualification or deployment
prerequisite; no history rewrite or credential/security workaround was attempted.

## Preflight, publication and served verification

Target frontend: `s2jxj-liaaa-aaaas-amynq-cai` at
https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
Backend: `s5ir5-gqaaa-aaaas-amyna-cai`.

Certified mainnet reads confirmed both IDs, controller sets, module hashes and
European subnet `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`
(13 members). Existing `codex_local` principal was listed as an authorized asset
uploader. No permission grant or settings mutation was needed. The installed
asset service exposes its pure authorization-list read as an update-interface
method; its initial query-mode rejection was an interface mismatch, not a network
or game verification failure. No backend update call was made.

Backend status and a browser using the exact candidate authenticated the existing
world, source, rules and receiving account before publication. The browser
preflight used loopback for assets and mainnet for reads; it is **not** counted as
deployed-site acceptance. Its first frame was 14.9s; optional history used two
requests/16,253 bytes/1,010.6ms. Its short sample did not establish visible motion.

Current served rollback bytes were downloaded and checked against the prior
approved inventory **before publication**, including the consumed upload policy:

- Previous runtime: `b0f6c7a0cb9f3b9f9159d28d8708588fc8bc5af0`.
- Previous JS: `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`.
- Previous complete inventory: `216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`.
- All sixteen actual rollback files remain at
  `.work/human-frontend-deploy/rollback/frontend`.

With DFX 0.31.0, the only deployment command was:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

The observer asset target has no backend dependency. The command skipped asset
canister code upgrade (its existing module hash matches), staged only the exact
reviewed assets and consumed `.ic-assets.json5`. The DFX generic output says
“Upgraded code”; the [certified before/after module identities](metadata-after.json)
establish that **neither Wasm module changed**. See [command output](deploy.log).

Independent cache-bypassed, identity-encoding HTTP retrieval verified every
public file: JS, HTML, CSS, six configurations, backend Candid, deployment
identity, build manifest, API documentation and both SVGs. A signed asset-list
query independently confirmed all fifteen keys, hashes and lengths; no extra
public signing/delegated-payment assets exist. The consumed policy is the
sixteenth inventory member, not a served asset.

[Before HTTP identities](served-before.json), [after HTTP identities/headers](served-after.json),
[signed previous inventory](inventory-before.json), [signed installed inventory](inventory-after.json),
[staging proof](staged.json).

Actual MIME types are HTML, CSS, JavaScript, JSON, SVG, Markdown and octet-stream
for binary configuration/Candid. CSP permits scripts/styles only from self and
connections only to self and `https://icp-api.io`; frame ancestors and form action
are none. Referrer policy, permissions policy, no-sniff, HSTS and DENY framing
match the reviewed upload policy. The served HTML loads only its bundled self
script; this operation introduced no external scripts or signing functionality.

The first HTTP checker compared header names case-sensitively after converting
Python's case-insensitive HTTP object to a dict. IC returned lowercase names.
The checker was corrected to lowercase keys; bytes had already matched. This was
a verification-script issue, not a missing production CSP.

## Backend and financial boundary

[Certified metadata before](metadata-before.json) and
[after](metadata-after.json) show identical controllers and modules:

- Backend `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend asset service `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.

[Read-only preservation checks](backend-preservation.json) confirm unchanged
Ledger/index bindings, receiving numeric subaccount 0, receiving account
`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`,
admitted cursor `40180669` and running generation 1. Ordinary autonomous callbacks
advanced from 7417 to 7431; this is expected live gameplay, not a deployment
mutation. Status remained healthy, pending records zero, with no source/run error.
Trickle remains 0.01 ticks/s, admission open, Event Horizon disabled.

Browser authentication binds source
`54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125`,
ENTRY configuration
`8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`,
rules v7 `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`
and schema `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
The world has one actual cannon and active ball, on the 1,000×1,000 torus.

No backend upgrade/reinstall/reset/stop/start, configuration/rules/cursor change,
controller/settings change, ICP/cycles transfer, funding, Ledger transaction,
allowance, delegated payment activation or gameplay command was performed.
External-wallet instructions remain the payment route.

## Live browser acceptance

The live tests use fresh Chromium contexts at the **actual installed origin**,
without local fixture worlds, replaced certificates, altered playback clocks or
private layout calls. Only local sending-account declarations/drafts are created.
Request tracing in the three-viewport journey admits only `/query` and
`/read_state` POSTs; no gameplay/payment submission or signing flow is invoked.
Software WebGL and emulated viewports/touch do not establish physical-device
performance. All runtime/build/dependency inputs remain the approved freeze.

### Cold acquisition and available historical movement

The central ring and exact **“Catching up with on-chain activity ...”** wording
were photographed during acquisition. Latest-head financial authority was
observed before delayed presentation. The normal retained-interval outcome used
two bounded read requests; it did not wait for H+1.

| Fresh viewport | Initial → later observed head | Latest verified reference available | First sampled verified scene | First sampled motion / head | Initial financial time / displayed time | Optional history: requests / bytes / elapsed |
| --- | --- | --- | --- | --- | --- | --- |
| 1440x900 | 7440 → 7445 | 11.88s | 24.49s | 26.14s / H=7440 | 7437 / 7436.005167 | 2 / 16296 / 1026.2ms |
| 390x844 | 7445 → 7449 | 6.15s | 8.37s | 8.61s / H=7445 | 7442 / 7441.000000 | 2 / 16374 / 678.7ms |
| 320x640 | 7449 → 7453 | 7.49s | 11.00s | 11.26s / H=7449 | 7446 / 7445.000000 | 2 / 16370 / 692.8ms |

The first independent cold production attempt also recorded H=7434, financial
acquisition at 10.25s, first verified scene at 14.34s and movement at 14.77s with
H still 7434. Another desktop session recorded H=7435, first motion at 10.81s
while H remained 7435, and later admitted H=7437. These observations are distinct
from the earlier loopback/mainnet preflight and the certified fixed-H CI fixture.

The timings are in-page samples relative to navigation, not hardware first-paint
benchmarks. Settled operating-state information was present by each first sampled
verified scene. The occupied host/software renderer produced substantial latency
variation (including the slower desktop sample above); report these measurements,
not a device-performance promise. The position/time sampler demonstrates actual
verified presentation advancement and no H+1 requirement. The only current ball
can be outside the initial cannon-centred view; subsequent native ball-selection
recordings show it moving visibly. No initial backward jump was observed.

A separate fresh reduced-motion context held **only** `retained_publication`.
Latest certificate/head acquisition remained intact. The two-second optional
history budget expired, the latest verified endpoint appeared, and the active-ball
spinner said **“Waiting for next on-chain update”**. Releasing the late response
caused no rewind. This is controlled browser delivery injection, not evidence that
production retention is missing or that a subnet upgrade occurred. A natural
running-interval exhaustion was not forced against the paid game; the controlled
endpoint case demonstrates its truthful waiting presentation.

### Status-only readiness and panel geometry

Each full-delivery interruption returns browser-local HTTP503 for read-only query
requests for approximately 35 seconds, then restores normal delivery. Existing
certification remains enabled throughout. The last trusted scene/draft persists,
copies become disabled when freshness expires, concise top-level retry messaging
appears, and authenticated observation/copying recover **without reload**. Session
and clock objects remain the same, and the playhead never exceeds verified
coverage. No reconnect paragraph is added to the action body.

Every sampled financial value, composer target/heading/quantity, camera pose and
scroll position remains unchanged during these status-only transitions. Values
are read from the actual DOM, including amount, recipient, memo, payer, fee and
warning. The natural-content target, panel bounds and scroll height are measured
after normal expansion settles and during the transition, not just in a final
screenshot. Legitimate action changes and viewport changes settle before baselines.

| Viewport | Action | Healthy (x,y,w,h) | Unavailable | Recovered | Sampled frames | Maximum drift |
| --- | --- | --- | --- | --- | --- | --- |
| 1440x900 | Fire | (661, 334, 360, 435) | (661, 334, 360, 435) | (661, 334, 360, 435) | 90 | 0px |
| 1440x900 | Move | (661, 334, 360, 411) | (661, 334, 360, 411) | (661, 334, 360, 411) | 48 | 0px |
| 1440x900 | Build | (661, 334, 360, 411) | (661, 334, 360, 411) | (661, 334, 360, 411) | 66 | 0px |
| 390x844 | Fire | (8, 221, 360, 435) | (8, 221, 360, 435) | (8, 221, 360, 435) | 230 | 0px |
| 390x844 | Move | (8, 221, 360, 411) | (8, 221, 360, 411) | (8, 221, 360, 411) | 60 | 0px |
| 390x844 | Build | (8, 221, 360, 411) | (8, 221, 360, 411) | (8, 221, 360, 411) | 299 | 0px |
| 320x640 | Fire | (8, 221, 304, 295) | (8, 221, 304, 295) | (8, 221, 304, 295) | 430 | 0px |
| 320x640 | Move | (8, 221, 304, 295) | (8, 221, 304, 295) | (8, 221, 304, 295) | 115 | 0px |
| 320x640 | Build | (8, 221, 304, 295) | (8, 221, 304, 295) | (8, 221, 304, 295) | 139 | 0px |

**1477 full-delivery samples, all 0px drift**, plus 80 operational-only
samples at 0px. In the separate 20-second `lab_status`-only interruption,
authenticated observation stayed healthy: the top-level label remained
**“Slow · delayed”**, copying disabled, and copying restored without geometry or
financial changes. The hosted 3,552-state result remains separate historical
exact-source qualification; these are new deployed-site measurements.

The controlled faults do not represent an actual subnet outage. No production
signature/hash-conflict attack was attempted. Genuine integrity-failure rejection
remains covered by the unchanged qualified verifier and installed-IC negative
cases, not by a claimed live attack.

### Direct controls and payment handoff

- Clicking the current cannon selected/highlighted its whole shaded body while
  camera centre and zoom stayed exactly unchanged. Explicit Focus moved/zoomed
  the camera. Native touch selection independently preserved the camera.
- Canvas clicks/drags near the source changed Fire heading and canonical memo;
  dragging outside the aim vicinity panned without changing the memo. Native
  touch aim passed. Adding a second touch changed camera zoom from 64 to
  86.65332507794164 while keeping the aim memo unchanged.
- Move chose legal owned tile **998998**, including toroidal inverse placement
  across the canonical cut. Build chose an eligible adjacent site. Native board
  input and the supported Alt-arrow/Enter alternative were used where the panel
  covered the requested tile. No delayed click was reinterpreted from a later
  camera. Source cannon remained at authenticated cell 0 throughout local drafts.
- Actual Move/Build screenshots show base, turret, barrel and muzzle in the
  shared translucent yellow preview family, dark separation and square/diamond
  footprint. Move retains verified heading; Build responds to local aim. The
  exact installed renderer/model bytes remain the geometry qualification basis;
  screenshots are actual output, not a substitute for matrix/silhouette CI.
- Fire, Move and Build retain exact amount, backend recipient
  `s5ir5-gqaaa-aaaas-amyna-cai`, canonical text memo, public paying account, Copy
  controls, separate fee and warning. Fire showed `0.1 ICP`; Move `0.0001 ICP`; additional Build `4 ICP`.
  Native memo copying successfully called the real browser clipboard API.
  Its write was observed after success; clipboard-read policy was not relaxed.
  No payment was sent. Ordinary numeric angle/cell inputs are absent.
- Move and additional Build show exactly: **“If another player claims your chosen
  tile before your action is processed, the action fails and your ICP remains
  spent.”** The quoted text is one actual string; line wrapping adds no bytes.
- A native click selected the **moving authenticated ball** in normal delivery,
  began following and retained zoom 48. Away-click stopped following and left
  the camera fixed. Escape also stopped following. There is no persistent stop/
  Following-ball control. The real-speed white tail and dark tile wake are
  visible in the production recording/screenshots. A separate endpoint test also
  proved native ball selection while verified coverage was stationary.
- The diamond minimap, actual camera footprint and markers remain navigable.
  Live navigation crossed both sides of the centred view. No artificial canonical
  cut line is visible. The current cannon at cell 0 supplies a real wrap-seam
  scene; broader multi-owner/colour permutations remain CI evidence.
- Close, intermediate and overview screenshots preserve the qualified grid
  hierarchy. Upward native aim uses memo `FIRE 1 225 1` at screen heading 0;
  390px and 320px screenshots show a straight guide ending below fixed status UI.
  Guide shortening changes neither direction nor memo.

### Narrow layouts, evidence and remaining limits

At 390×844 and 320×640 the payment panel remains a usable scrollport. Direct field
reachability checks passed at **320×640, 320×390 and 640×320** for amount, recipient,
memo, payer, fee and risk warning. Viewport contraction is simulated; it is not a
physical software-keyboard/device test. Reduced-motion contexts preserve the
static waiting ring and working controls.

[Measured startup/interaction summary](live-summary.json), per-action frame JSONs
in this directory and [recording offsets](recordings.json) preserve measured
results. Representative actual production views:

- [Cold acquisition](media/live-1440x900-01-cold-load.png),
  [selected cannon](media/live-1440x900-03-selection.png).
- [Desktop Fire](media/live-desktop-fire-first-1440x900-04-fire.png),
  [Move](media/live-1440x900-04-move.png),
  [Build](media/live-1440x900-04-build.png).
- [390px Fire](media/live-390x844-04-fire.png),
  [Move](media/live-390x844-04-move.png),
  [Build](media/live-390x844-04-build.png).
- [320px Fire](media/live-320x640-04-fire.png),
  [Move](media/live-320x640-04-move.png),
  [Build](media/live-320x640-04-build.png).
- [Moving ball selected](media/live-moving-ball-native-ball-follow.png),
  [away-click stopped](media/live-moving-ball-native-away-stop.png),
  [minimap overview](media/live-supplement-first-toroidal-overview.png).
- [Native touch aim](media/live-touch-touch-aim.png),
  [pinch transition](media/live-touch-pinch-camera.png),
  [390px upward guide](media/live-guide-390-upward.png),
  [320px upward guide](media/live-guide-320-upward.png).
- [Desktop Fire outage/recovery recording](media/desktop-fire-outage-recovery.webm),
  [Move](media/desktop-move-outage-recovery.webm),
  [Build](media/desktop-build-outage-recovery.webm),
  [390px Build](media/390x844-build-recovery.webm),
  [320px Build](media/320x640-build-recovery.webm),
  [native moving-ball interaction](media/native-moving-ball.webm).

Earlier incomplete automation attempts remain associated with this exact runtime
in the raw `.work/human-frontend-deploy` directories and summary. One asserted
owned-action icons before declaring the public funding account; normal opponent
inspection correctly offers only inspection/Focus. Other attempts expired their
5/8-second HUD/camera waits on the occupied software-rendering host. The final
waits retain every readiness, natural-size, financial and 1px geometry assertion,
with a 45-second acquisition bound. An initial moving-ball click used a 4-second
wait and missed the observed follow announcement; a later normal 390px native
moving-ball test passed with a 15-second observation bound. The upward-guide
check initially tried to click a point covered by the generous aim handle after
resize; the existing upward aim was already correct. No internal layout call or
production fix was used to obtain passing evidence.

One ball/cannon and current ownership do not demonstrate live opponent selection,
all territory colour combinations, idle/protected gameplay or every historical
outage duration. Those remain exact-source controlled qualification, not claimed
production observations. No genuine subnet-upgrade incident or integrity attack
was staged. Startup latency varies on this host; no physical mobile/GPU, sustained
hardware frame-rate or physical keyboard qualification is claimed. No significant
new regression requiring asset rollback was found.

Final [certified metadata](metadata-final.json) and [read-only backend status](backend-final.json)
were refreshed after all browser checks. The running generation, exact source
cursor/bindings, module hashes and controller sets remain unchanged; normal
autonomous callbacks continue. Both sixteen-file candidate staging and retained
rollback bytes were rehashed again after acceptance.

Source-only repository verification passed: 209 JavaScript syntax checks, three
workspace manifests, two native manifests and application source inventories.
This evidence-only update changes no runtime/build/dependency input and triggers
no rebuild of unaffected backend/application artifacts.

## Reproducible rollback

No rollback has been performed. The previous complete verified asset set and
policy are retained locally, rather than only their hashes. If a significant new
regression requires rollback under the owner's current authorization:

1. Preserve the candidate/raw failure evidence and current `.work/s14/assets`.
2. Copy all sixteen files from `.work/human-frontend-deploy/rollback/frontend`
   into the observer staging directory `.work/s14/assets`, excluding no policy.
3. Verify every staged path/length/SHA against
   `evidence/B2Z/player-experience-refinement/visual-closeout/frontend-files.json`
   (inventory SHA `216fac29…`); reject extras or missing files.
4. Run the identical observer-only `--no-asset-upgrade` command above.
5. Independently fetch all fifteen public bytes and security headers, query the
   signed asset inventory and recheck certified modules/controllers and backend
   health. Only then claim restoration.

Never restore, reinstall or modify the paid backend to resolve a frontend issue.
The approval authorizes this exact release and its asset rollback, not additional
production fixes or future publication. No release ZIP was created.
