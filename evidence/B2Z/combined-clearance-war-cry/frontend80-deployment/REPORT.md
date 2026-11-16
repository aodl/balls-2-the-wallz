# Rules11-compatible frontend80 — European deployment and live acceptance

**Prelaunch mainnet playtest — not general-release qualified.** On 16 November
2026, the owner-authorised exact80-file frontend was installed on
[s2jxj-liaaa-aaaas-amynq-cai](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/).
All79 public identity bodies, signed inventory membership, IC HTTP-v2 proofs and
reviewed headers match the approved freeze. The previously failing320×640,
347.15° quantity pose passes on the actual deployed application. No rollback was
required. The paid backend remains Rules7; War Cry and the new clearance policy
are inactive. No backend, financial, funding, settings or transition operation
was performed.

The positive live results below are separate from hosted qualification and from
physical-device acceptance. Failed diagnostic attempts remain in this package;
none is relabelled as a successful test. P09 remains **FAIL/unqualified**.
[Actual captures and native audio](GALLERY.md) accompany this report.

## Exact source, approval and qualification

The feature branch is `feature/b2z-combined-clearance-war-cry`; starting local and
remote evidence head was `0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20`. The release
branch was not merged or changed. Qualified source is
`c0e3dd28879199c48aae328d712d6543ffcc5455`; frozen frontend runtime/build source is
`fc317d188ba6b503c81f9767da0358b89c60868f`. All420 consumed frontend inputs matched
[the retained provenance](../artifacts/provenance.json). No runtime, dependency,
configuration, audio or generated asset was changed or rebuilt for deployment.

[Hosted run43884464465](https://github.com/aodl/balls-2-the-wallz/actions/runs/43884464465)
was independently checked: Source conformance, Native conformance, Packaged DTR
and clean consumers, Runtime-lab Wasm, Browser HTTP and Web Crypto, and S14 and
million-cell installed-IC qualification all completed **success** for the exact
qualified source. The separately labelled BLOCKED production-inventory guard is
excluded. [Job IDs and conclusions](results/approved-ci.json) retain this check.
This evidence-only continuation does not qualify new runtime bytes or require a
new runtime build.

| Frozen item | SHA-256 |
| --- | --- |
| JavaScript | `bc2872444e4574ae818983e2d7ede46f7ff0c4c2d71b198b9b821c344636321c` |
| Complete80-file inventory | `e8a9303538dbb2cc5028b21cf5ae97caacdb9c438497a35a567e30a9071a0c67` |
| Audio manifest | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |

The inventory is79 public assets plus consumed `.ic-assets.json5`. All61 audio
files are byte-identical to frontend79, including the51 approved music cores and
nine effects. Only `app.mjs`, `backend.did`, `build-manifest.json` and added
`configuration-combined.bin` differ from79. HTML, CSS, panel layout, camera,
quantity dock, audio and upload policy are unchanged. Every frozen and staged
hash was checked; see [preflight](results/preflight.json),
[candidate inventory](results/candidate-inventory.json) and [staging](results/staged.json).

## Before deployment, staging and rollback preservation

The actual served predecessor was independently retrieved: all78 public bodies
matched the previous79-file release, with signed inventory and fresh IC-v2
signature/delegation/canister/path/body/header proof verification.

| Previous frontend | SHA-256 |
| --- | --- |
| JavaScript | `c37ed0c363902e29443ba9eb1501c6b653873945bb63e7d92b341f8400f1085d` |
| Complete79-file inventory | `63cffcc2793a1855269c8b5cbcb8d01507d9cac5f056b7b8989939e83c13d45f` |

There was an important local directory discrepancy: the requested rollback path
still held the older78-file release, not79. Its complete hashes were first
verified against retained historical evidence. That directory was preserved by
atomic rename to
`.work/approved-panel-war-cry/rollback/frontend78-retained-before-frontend80-20261116`.
The actual current79 was then preserved at the requested
`.work/approved-panel-war-cry/rollback/frontend`, using all78 independently fetched
public files and the exact consumed policy from the approved79 freeze. All79
files match the63cffc… inventory. Its manifest is retained beside it as
`frontend79-inventory.json`. Neither candidate nor historical rollback was mixed
or overwritten. Previous staging is separately retained at
`.work/frontend80-deployment-20261116/previous-staging`.

The approved80 freeze remains `.work/combined-clearance-war-cry/frozen/frontend`.
The staging directory `.work/s14/assets` was replaced as a complete set, then all
80 hashes were verified before and after DFX. `dfx.json` maps observer to assets,
with no observer build/dependency hook. `canister_ids.json` maps observer to
`s2jxj-liaaa-aaaas-amynq-cai` and b2z to the existing paid backend. DFX0.31.0,
identity name `codex_local`, existing certified controller access and the scoped
operation were checked without inspecting private identity material.

## Installation and independent served verification

The only production mutation was the following observer asset operation, at
approximately20:35UTC; [the complete deployment log](logs/deploy.log) records exit0:

```sh
DFX_IDENTITY=codex_local \
DFX_WARNING=-mainnet_plaintext_identity \
NPM_CONFIG_IF_PRESENT=true \
dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

No unrestricted deploy, builder, backend installation, constructor, restart or
settings operation was invoked. DFX's generic “Upgraded code” message is not used
as module-change evidence: certified frontend module identity was unchanged
before, after and at final check:
`04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.

[All79 served bodies and headers](results/served-after.json) match exact approved
paths, lengths and SHA-256 values. [All79 IC-v2 proofs](results/http-certificates-after.json)
pass pinned-mainnet-root BLS/delegation, freshness and canister binding, certified
data/witness-root equality, exact-path expression membership, response status,
body and listed-header hashes. The verifier deliberately changes a response to
ensure rejection. This is the restricted exact-path default-CEL/no-request
profile actually used here, not a claim of a general-purpose CEL interpreter.
The signed asset inventory contains exactly79 expected public keys, lengths and
identity hashes, with no unexpected script, CDN or alternative audio source.

CSP, Permissions-Policy, Referrer-Policy, nosniff, MIME and reviewed cache policy
pass. All60 FLAC files are `audio/flac`, identity encoding only, with approved
immutable cache policy; the manifest remains identity/no-cache. Four registered
gzip variants (`agent-api.md`, `app.mjs`, `index.html`, `style.css`) were separately
fetched, checked against signed compressed lengths/hashes, decompressed to the
approved identity bodies and independently certified. See [gzip evidence](results/gzip-check).
At21:55 a fresh three-body HTML/JavaScript/manifest sample also passed all proof
checks; this supplements, and does not replace, the initial complete79-file check.
See [final sample](results/final-sample/http-certificates-after.json) and
[MIME/module checks](results/installed-mime-module.json).

Public identity bytes increased from76,331,925 to76,337,160 (+5,235); all registered
encoding bytes increased by5,612. These are asset-content sizes, not allocated
storage, cycle price or download-cost estimates.

## Backend preservation and observed operating condition

Certified module/controller/subnet records match before, after and final.
The backend `s5ir5-gqaaa-aaaas-amyna-cai` retains:

| Identity | SHA-256 |
| --- | --- |
| Normal module | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Rules7 | `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f` |
| Configuration | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` |
| Source binding | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |
| Schema6 | `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790` |

At20:33:38UTC the authenticated head was10066/logical10063; at21:55:26UTC it was
10115/logical10112. This is autonomous forward progress, not a deployment-time
state reset or frozen-head requirement. The source cursor remained40180669,
pending records0, source binding checked, no source/run error. Operation was
running/Trickle, admission open, nominal/supported10 milliticks/s, no world
transition or performance-limited flag. Latest public total cycles were
2,266,308,332,966, reserved0; cycle rate was unavailable/collecting. No liquid
balance, runway, treasury value or required funding is inferred. The earlier
protection history is not treated as current protection or a frontend defect.
[Before](results/observation-before.json), [final observation](results/observation-final.json)
and [final certified metadata](results/metadata-final.json) retain exact records.
No payment was sent and no paid account, receipt, source cursor, controller,
operating mode, funding or rules state was changed by this operation.

## Mandatory first acceptance: actual mobile failure pose

This test ran first after complete asset verification, against the actual served
frontend and real verified world. Native browser input followed returning-player/
My cannon, explicit Focus and Fire. There was no private camera/world/status
mutation, synthetic operational readiness or payment.

**PASS:** cannon cell0, camera exactly
`[3.6575453715563526,3.6575453715563526,64]`, displayed heading347.15° at320×640.
The dock is130×46 at(10,526), with44×44 button targets; the panel is
(8,221,304,296), scroll area242px. The cycles meter yields its reserved space.
Cannon and guide remain visible, the editor is reachable, its full footprint
passes hit testing and it does not cover essential payment/toolbar/minimap areas.
The original eight-heading sequence,72-step full sweep and52 adjacent-heading
samples keep the editor visible and stationary. The original exact pose is
reproduced, not merely an equivalent fixture.

Quantity increase/decrease, rapid repeats, keyboard and emulated touch, held
quantity while aiming, shaft drag, aim-to-pinch interruption, contracted350px
viewport held-release cancellation and close/reopen pass. Quantity changes affect
count/amount/memo without changing payer, heading, source cannon or camera.
See [settled347.15°](results/critical-mobile-instrumented/347.15.png),
[full result](results/critical-mobile-instrumented/results.json) and native video.
Emulated touch is not physical-phone qualification.

## Shared panel, exact copying and Rules7 capability gating

All nine actual Fire/Move/additional Build cases across1440×900,390×844 and320×640
pass. Divider mismatch is0px, Copy alignment mismatch0px, targets at least44px,
text at least14px. The From person icon is distinct, values are read-only text,
full memo remains readable, and the approved calm information treatment and
reachable exact Move/Build retained-payment warning remain. No routine fee form
or legacy inputs reappear. [Nine panels and geometry](results/live-panels-recovery/results.json)
and [actual quote verification](results/live-panels-recovery/quote-verification.json)
show exact certified Rules7 amount/memo/recipient/payer and legal defaults.

War Cry is hidden under certified Rules7, `warCrySupported=false` and
`clearanceActive=false`; no local speech bubble or unsupported suffix is created.
Actual bare examples were `FIRE 1 37.5 1`, `MOVE 1 1`, `NEW 37.5 1 1`, with
respective observed prices0.1/0.0001/4 ICP. These are captured quotes, not new
hard-coded economic policy. The authenticated identity, not the presence of the
combined configuration file, selects the policy.

[Focused clipboard evidence](results/live-clipboard-fields/results.json) passes
nine completed Clipboard API writes plus nine native Ctrl+C/external native-paste
comparisons: all three fields for Fire desktop, Move390 and Build320. Recipient
is the complete verified principal; amount is exact decimal without `ICP`; memo
is complete canonical text. Inline disclosure/native selection and controlled
Clipboard API denial/manual fallback pass. These tests wait for an actual fresh
ready state, conservatively also requiring a real certificate age below10s; they
do not override protection or change product freshness policy. Protected attempts
remain blocked. The completion token records actual new writes rather than stale
“Copied” text. Prior Fire editing tests demonstrate coherent Update/Keep and
quantity restoration; payer changes clear incompatible action packets.

## Entry, controls, startup and recovery

Fresh-storage returning account discovery passes at all three widths: existing
territory is framed without unsolicited NEW or selected styling. Same-account
From reassociation preserves camera; changed payer clears incompatible intent.
A genuinely new verified anonymous account reaches explicit Join with bare
`NEW 2251`, automatic first placement and unchanged financial semantics. The real
world supplied one cannon; dormant/multiple-owned-cannon and owned nondefault
subaccount cases were not available and are not claimed as production passes.
See [entry results](results/live-entry-bounded-ready/results.json).

Native warning scrolling, full recipient inspection and quantity accessibility
pass at320/390. Reduced-motion and320×350 contraction pass. A browser text-zoom
shortcut did not change measured geometry: **actual text-zoom acceptance is NOT
VERIFIED**, rather than inferred from emulation. There is no physical keyboard or
phone acceptance claim.

Selected cannon highlighting and selection without camera focus, explicit Focus,
actual intended min/max zoom disabled states, arrow/near-cannon aiming and
ordinary outside-board panning pass. Move previews to4004 and996996 demonstrate
shortest wrapped relocation direction, stable camera and unchanged real cannon0;
Build retains its provisional silhouette. Native moving-ball click and public B
following, click-away cancellation and minimap navigation pass in the final
tracked-input probe, with no persistent Follow dialog. Screens/videos retain the
existing minimap, trail and territory presentation; no new physics was exercised.

Startup acquisition from authenticated history passes at all widths. First
observed motion occurs under the initial head, before a next publication:

| Width | Harness world-ready s | Native first eligible frame s | First motion s | Initial / next head |
| --- | ---: | ---: | ---: | --- |
|1440|10.4333|6.8064|9.3652|10087 /10088|
|390|8.1756|6.0362|7.8553|10089 /10090|
|320|7.8634|6.0347|7.5046|10090 /10091|

These timings have different explicit measurement origins. Actual authenticated
entity/time samples advance monotonically within available coverage, with
truthful spinner/catch-up states; two history requests total16,869 bytes. They
are not a representative hardware latency claim. See
[startup evidence](results/live-panels-recovery/startup-verification.json).

A24-second browser-only503 interruption of read requests disables unsafe Copy,
retains the trusted scene/camera/draft/session/clock/queue, then automatically
recovers without reload. Panel drift is0px. No backend outage was induced and no
certificate/integrity failure was waived. Earlier controlled invalid-proof
negatives remain separate hosted/disposable evidence; no untrusted production
response was manufactured or accepted.

## Native audio and bounded resource observations

[Ordinary Chromium native audio results](results/live-audio/results.json) pass
fresh enabled intent, sole icon, no old dialog/sliders/maintenance controls,
first-icon handling, mute/unmute and saved mute across reload/unrelated input.
Real native decoded/output streams were recorded. Genuine same-window hidden
intervals5/35/8s return without off/on repair; first resumed output was
4283.86/3672.28/4333.91ms respectively, with coherent phase, queued nodes at most2,
no duplicate stream and unchanged verified session. Two actual tabs yield and
reclaim ownership. A separately controlled optional-media failure recovers on
an ordinary eligible gesture without poisoning gameplay or the other lane.
No autoplay or throttling bypass flags were used. Native output capture does not
prove physical speaker/headphone output or subjective quality.

No matched naturally occurring own/enemy boundary-impact sequence or close/mid/
wide effect comparison was available in the quiet production window. These live
listening checks remain **NOT VERIFIED**; approved assets and their manifest
are exact, and prior source/native evidence is not relabelled as new live output.

The bounded quiet performance probe observed the same head10109/camera and one
cannon/one ball, ON/OFF/OFF/ON for5s each:

| Audio | Frame p50 ms | p95 ms | p99 ms |
| --- | ---: | ---: | ---: |
| ON |149.9|299.9|299.9|
| OFF |133.4|216.7|216.7|
| OFF |183.4|316.6|333.4|
| ON |183.3|316.8|349.9|

The shared software-rendered host was slow and variable; the OFF/OFF change alone
is50ms p50/99.9ms p95. This is not causal incremental audio measurement, dense
qualification, an improvement claim or grounds to relax thresholds. Active
contact voices were0. The complete probe acquired10,873,811 audio bytes over its
whole duration, not all74MB upfront; do not label this number initial acquisition.
Detailed loader/buffer/memory observations are in raw results. The runner wrote
complete results then exited143 during cleanup; this is retained as an
observation, not labelled a successful performance qualification. **P09 remains
FAIL/unqualified**, accepted solely for this prelaunch trial. No new sustained
causal audio regression was established by these noisy observations.

## Failed attempts and instrumentation corrections retained

These records explain why a green final script is not substituted for the history:

- Initial rollback-manifest lookup referenced an unavailable path; the actual
  retained manifest was found and checked before any production mutation.
- The first post-install certificate process started before its fetch JSON was
  complete and failed ENOENT. Correct dependency ordering then verified all79
  proofs; the premature log remains. This was not a rejected IC certificate.
- `live-controls-ready-event` failed to find a ready native-copy window; actual
  protected attempts remained empty. `copy-diagnostic` passed ten earlier ready
  full-recipient copies but failed its final expectation while Copy was disabled.
- `live-controls-observed-readiness` assumed full-address disclosure remained
  open; it was closed. `live-controls-observed-ui` compared stale feedback/audit
  from a previous action while Build was reconnecting. Their origin details are
  retained, not asserted to prove a specific browser defect.
- `live-controls-write-completion` observed no new API write within its deadline;
  later ready state cannot establish readiness at the earlier click.
  `copy-click-events` also had a test-scope ReferenceError. The corrected focused
  probe captured three actual successful API start/completions (130/269/123ms).
  The final nine-field API/native test independently completes coverage. No
  confirmed completed write returned an incorrect value in any attempt.
- Two initial following probes missed a moving rendered ball. Height/projection
  and stale-coordinate timing were investigated without claiming either as the
  sole proven cause. Final fresh sphere-centre projection plus immediate real
  native input succeeded on its first bounded attempt. No camera/clock override
  was used. Both earlier failed captures remain.

All these are actual attempted live tests, not rewritten PASS entries. No runtime
patch was introduced to make them pass. Browser readiness/certificate freshness
is variable and correctly fails closed; slow automation and stale success text
are not a safe Copy synchronisation contract. Scripts, errors, states, screenshots
and recordings are preserved with their original results.

## Rollback and future decisions

No rollback was required. [The exact restoration procedure](results/ROLLBACK.md)
uses only the complete preserved79-file set: archive current staging, replace it
with a clean copy of `.work/approved-panel-war-cry/rollback/frontend`, verify
all79 hashes against63cffc…, execute the same observer-only command, then
independently verify all78 public bodies, signed inventory, fresh IC-v2 proofs,
headers and unchanged Rules7 binding/module. Do not merge asset sets or invoke a
builder. No live rollback or fresh isolated rehearsal was needed/performed in
this operation, and none is claimed.

**This79-file rollback is valid only while Rules7 remains active.** After a future
Rules11 epoch, retain the exact80-file Rules11-compatible freeze as recovery;
79 is not an approved post-cutover frontend rollback. Backend upgrade, pause,
preparation, exact-manifest epoch commit and resume each remain outside this
completed frontend authority; see [separate release decisions](../RELEASE_DECISIONS.md).
The normal combined Wasm was neither used nor installed.

Physical phones, representative dense hardware performance, Firefox/Safari
audible output, BFCache, Bluetooth/headphones and subjective owner listening
remain unverified. Mixed backend-module/browser interruption failures remain
historical unresolved backend-maintenance evidence, not a frontend upload gate;
they were not rerun or relabelled here. This is a controlled prelaunch interface
acceptance, not a public launch or general-release performance qualification.

## Evidence publication and owner checklist

Reviewed results, all attempted harnesses/logs, native audio and browser captures
are published with an evidence-only non-force continuation on the feature branch.
The package inventory records path/length/SHA-256. Full independently fetched
media bodies remain locally in the separate freezes/rollback rather than being
duplicated into this report. Browser profiles, cookies, caches, keys and secrets
are excluded. Consumed-input/freeze/rollback/staging parity is rechecked after the
documentation update: all420 consumed inputs,80 frozen/staged files and79 rollback
files pass again. Documentation link checks (413 links) and source-structure checks
(261 JavaScript syntax checks) pass; these are not new installed qualification.
Raw log/generated served-bundle whitespace is preserved byte-for-byte; a full
`git diff --check` reports those historical whitespace findings. Authored
documentation/instrumentation passes the scoped whitespace check.
The final continuation identity is the commit containing
this report, without a self-referential commit hash.

For owner acceptance: open the live URL on an actual phone, return to an existing
account, inspect Fire quantity at347.15° and through a full turn, inspect/copy
recipient/amount/memo without paying, listen through5s/35s tab returns, try saved
mute and ordinary medium-zoom play. Review naturally occurring friendly/threat
contacts and long-session responsiveness. Do not expect War Cry or clearance
activation while the certified backend is Rules7. Any backend maintenance needs
its next separate explicit owner decision.
