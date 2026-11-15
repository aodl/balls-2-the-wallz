# European frontend deployment — live acceptance failed; rollback verified

**15 November 2026: the approved candidate was installed, independently verified,
and then rolled back after a reproducible 320px quantity-control defect. Do not
redeploy these unchanged bytes.** The previous exact 75-file frontend is restored
at https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/. No backend, Rules9, financial,
funding, settings or controller operation was performed.

This was controlled prelaunch acceptance, not a public launch. Native audio
activation/return succeeded, but successful source CI did not substitute for live
acceptance. The game was already in low-energy protection before installation;
that independently blocked enabled financial-copy and fresh gameplay tests.

## Approved candidate and provenance

| Identity | Exact value |
|---|---|
| Qualified source | `5f078edd48d62170d13b20819a90d6c9948b0258` |
| Remote/checkout at preflight | `46010c9770c78f69955e6df324e1a5587712fef6` — evidence only after qualified source |
| Frozen runtime/build source | `704c7d2468f76c48511dd59b311a45c2a5d65cc5` |
| Candidate JS SHA-256 | `1363ae18e17b4c8a0d81cd8974e7c6bb1654823db7d7cba2a060028a359e8405` |
| Complete 78-file inventory SHA-256 | `d7b37d1333e18788f7f5d3b835c26036c3eaaa3b5eca89b067be2014a84a655f` |
| Audio manifest SHA-256 | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |

[Run 43655854356](https://github.com/aodl/balls-2-the-wallz/actions/runs/43655854356)
was rechecked: Source, Native, Packaged DTR/clean consumers, Runtime-lab Wasm,
Browser HTTP/Web Crypto and S14/million-cell installed-IC all PASS for the approved
SHA. The informational inventory guard is excluded. [Actual conclusions](results/ci-preflight.json).

The working tree was clean. All 220 consumed hashes and all 138 tracked consumed
inputs matched the frozen/qualified source; no runtime, dependency or build input
was modified. Every frozen file and the separate rollback file set was checked.
No application rebuild, audio regeneration, encoding change or new asset freeze
occurred. The [complete approved inventory](../frontend-inventory.json) contains
77 public assets and the consumed upload policy. The approved 51 music cores,
original six effects and three original contact effects were preserved exactly.
Original contact provenance and Suno owner declaration remain in the parent report.

## Preflight, installation and restoration

Production bindings were read from the unchanged `dfx.json` and
`canister_ids.json`: observer assets from `.work/s14/assets`, frontend
`s2jxj-liaaa-aaaas-amynq-cai`, backend `s5ir5-gqaaa-aaaas-amyna-cai`.
DFX 0.31.0 supports `--no-asset-upgrade`; `codex_local` access was available.
There is no npm build script; the maintained scoped command's if-present setting
therefore does not rebuild the application. Only observer was named.

The actual old 74 public assets were retrieved independently, compared byte for
byte with the complete 75-file rollback, and checked for reviewed headers. Its
signed inventory and authenticated canister metadata also matched. Previous
staging was preserved under `.work/audio-compact-deployment-20261115/previous-staging`;
the rollback directory was not overwritten. Candidate staging was a complete clean
copy, not a merge. [Staged identity](results/candidate-staging.json).

The installation and subsequent restoration both used exactly:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

[Installation log](results/deploy.log) and [rollback log](results/rollback.log)
name observer only. Both reported the same already-installed asset-canister module;
DFX's generic “Upgraded code” wording is not evidence of a Wasm change. Authenticated
module hashes before, after and after restoration are identical.

By 09:13:19 UTC the candidate's signed inventory was independently verified.
[All 77 served public files](results/served-installed.json) matched the approved
SHA-256 and lengths, including JS, HTML/CSS, configuration, manifest and every
FLAC. Content types, identity-only FLAC encoding, CSP, Permissions-Policy,
Referrer-Policy, nosniff and applicable cache headers matched the upload policy.
No runtime CDN or additional external script/audio dependency was introduced.

[All 77 HTTP proofs](results/http-certificates-installed.json) independently
verified pinned-mainnet BLS certificates/delegations, freshness, frontend canister
binding and witness roots, plus exact v2 path/expression/body/status/listed-header
membership. A changed response hash fails membership. This is a restricted verifier
for the actual exact-path default CEL/no-request profile, not a general CEL
interpreter. [Read-only verifier](instrumentation/verify-http-certificates.mjs)
follows the [official HTTP gateway protocol](https://docs.internetcomputer.org/references/http-gateway-protocol-spec/).
Cache policy values were compared separately where not listed in the certificate
expression. Header presence alone was not counted as cryptographic verification.

After the mobile failure, candidate staging was retained separately, the preserved
75-file rollback was staged and hashed, and the same scoped command restored it.
By 09:26:47 UTC the [restored signed inventory](results/inventory-restored.json)
matched exactly. [All 74 restored public bodies/headers](results/served-restored.json)
and [all 74 v2 HTTP proofs](results/http-certificates-restored.json) PASS.
A [fresh authenticated Rules7 browser observation](results/live-restored.json)
loaded without error; [actual restored screenshot](captures/restored-production.png).
The three added contact files are absent from the restored public inventory.

## Live acceptance results

| Area | Actual installed-candidate result |
|---|---|
| Default sound / one control | PASS ordinary fresh Chromium enabled intent, no old popover/lane switches/sliders; first sound-button gesture activates blocked intent correctly. |
| Native music output | PASS actual decoded browser output-stream energy and [music-return recording](captures/production-music-return-0.webm); not physical speakers/headphones. |
| Genuine tab return | PASS same-window 5/35/8-second hides, automatic output in 1225/1290/1371ms, phase retained, no toggle ritual, <=2 queued music nodes; same verified session/clock/queue objects. |
| Two B2Z tabs | PASS deliberate activation, hidden predecessor yielding, automatic visible-return reclamation. |
| Optional music delivery fault | PASS browser-only failed music transport leaves authenticated game/effects healthy; restoring delivery plus an ordinary trusted navigation gesture restarts native output. This is not a genuine subnet outage claim. |
| Explicit mute | PASS mute stops output; reload and unrelated game gesture retain mute. |
| Returning owner | PASS fresh account storage at 1440/390/320: existing canonical account reaches territory without NEW or clicked selection. Actual world has one cannon at cell 0, with a compact seam-spanning starting territory. |
| Other account cases | NOT VERIFIED live: multiple/dormant owned cannons, nondefault-subaccount ownership, genuinely new-account payment, delayed lookup/cancellation. Earlier controlled tests retain their separate scope. |
| Selection / Focus | PASS cannon click preserves camera; explicit Focus works; selected body/ground emphasis captured. |
| Fire/Move/Build | PASS desktop and390 legal default previews, exact revised prompts/fees/warnings, no obsolete numeric inputs. Only Fire completed at320 before the defect stopped the journey. |
| Financial copying | BLOCKED: pre-existing authenticated low-energy protection disables controls. Attempts did not invoke clipboard; no safety override was used. Live API/native/fallback copy and Update/Keep are NOT VERIFIED here. |
| Preview financial bytes | PASS all seven completed previews independently recompute exact Rules7 quote/memo, amount, payer, recipient and legal destination. This does not claim a successful copy or payment. |
| Quantity gestures | PASS desktop/390 mouse and emulated touch count/amount/memo coherence, fixed click slot, no unintended aim/camera change; FAIL320 upward-heading availability, below. |
| Reconnection / geometry | PASS24-second browser-only503 interruption, 83 samples,0px maximum panel drift, retained camera/draft/memo/session/clock/queue; recovery without reload. Copy stays disabled because protection remains active. |
| Zoom controls | PASS actual min/max disabled states at desktop/390. Further320 navigation and contracted/text-zoom journeys NOT RUN after failure. |
| First-load playback | Verified world and retained interval acquired, but protection held displayed time8830 at endpoint8831. No new-motion/no-H+1 success is claimed. No fabricated movement or rewind was observed. |
| Own/threat/medium-zoom sound | Assets/manifest/seven active FX buffers verified; actual matched impact/output comparison NOT VERIFIED live. Only one player/cannon and protected gameplay were available. Earlier native paired captures remain source-qualified evidence, not production observations. |
| Follow/arrow/pinch/minimap/trails | Existing source qualification preserved; screenshots show actual minimap/preview. Full live follow, shaft-drag/pinch, moving tails/wake and adversarial-integrity journeys NOT VERIFIED in this stopped/protected operation. |

[Native audio results](results/live-audio.json), [protected control journey](results/protected-control-attempt.json),
[seven exact preview results](results/seven-live-previews.json),
[desktop Fire](captures/1440-fire.png), [Move](captures/1440-move.png),
[Build](captures/1440-build.png), [390 Fire](captures/390-fire.png),
[returning territory at320](captures/320-returning-territory.png) and
[reconnecting](captures/reconnecting.png) retain actual production-browser scope.

The first full-copy journey failed its wait for enabled copying. This was an
incorrect test assumption about the actual protected backend, not a copy bypass or
runtime verification failure. [Original attempt](results/initial-control-attempt.json)
and [log](results/live-controls.log) are retained. The subsequent protected-state
journey tested disabled-copy safety without presenting it as enabled-copy acceptance.
The original nine-preview audit stopped at its count assertion after seven completed
previews; its [failure](results/quote-verification.log) remains. The scoped seven-file
audit keeps all financial assertions and explicitly lists unperformed320 actions.

## Rollback-triggering defect

At320×640, after selecting the actual cannon at canonical cell0, explicit Focus,
opening Fire and using the normal keyboard aim handle, the quantity editor disappears
at displayed heading347.15° although the cannon and its guide remain visible.
Camera: `[3.6575453715563526, 3.6575453715563526, 64]`; panel rectangle:
`x8, y221, width304, height295`. The focused element remains `aim-handle`.

The first journey caught it after80ms. An independent fresh production context
then waited a full second at every heading: the widget is visible at212.15,
257.15,302.15,32.15,77.15,122.15,167.15, but has `hidden:true` at347.15.
Camera position and scale remain identical throughout. This is not a transient
panel-expansion baseline or a lost camera animation.

[Settled reproduction](results/settled-quantity-reproduction.json),
[actual screenshot](captures/quantity-hidden-settled.png),
[first failure](captures/failure.png) and
[exact browser input script](instrumentation/reproduce-320.py) preserve the defect.
The existing bounded slot/obstacle placement policy fails to provide an editor for
this legitimate real-world pose. Source inspection identifies the failure path:
`quantityPlacement()` can return null when all fixed slots collide; `shell.mjs`
then sets the active quantity widget hidden. The cannon/action remain active.
This explains the missing editor without attributing it to transport or financial
state. No backend or quote problem was implicated.
This fails the required visible-cannon narrow-screen quantity workflow and was
treated as an unusable mobile action control under the rollback condition.

**Separate proposed correction, not implemented:** add this exact live camera,
heading, panel and HUD pose to the native-browser regression; diagnose rejected
slots and provide a stable safe placement when the cannon is visible. Retain
arrow/body/HUD separation, pointer/focus slot locking, immutable targeting and exact
financial/copy invariants. Freeze changed frontend bytes and obtain appropriate
exact-source qualification before seeking another deployment decision. Do not
silently fix or redeploy within this deployment task.

## Protected backend and preserved authority

The before-installation capture already says “Game paused · low energy” and
`canPrepare:false`. The authenticated operating state exposes protection with
closed admission. No attempt was made to change it. Observation/territory navigation
and local previews remain available. This is not a regression introduced by the
new frontend, and restoring the old frontend does not supply operating resources.

| Preserved backend identity | Value |
|---|---|
| Backend module | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Certified Rules7 | `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f` |
| Configuration7 | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` |
| Source identity | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |
| Schema | `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790` |
| Asset-canister module throughout | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |

Authenticated before/installed/restored metadata verifies unchanged modules,
controllers and European13-node subnet. Source/configuration/rules remain the same.
Only frontend asset syncs occurred. No backend upgrade/reset/restart, mode change,
Rules9/ICRC-2 activation, Ledger operation, payment/allowance, transfer/funding or
settings/controller call was issued. Autonomous publications are not expected to
be static; ordinary serving/asset sync has resource cost, not a transfer operation.

## Performance and remaining limitations

**P09 remains FAIL/unqualified, accepted only as the historical bounded trial
limitation.** No improvement is inferred from noisy live shared-host measurements.
The [matched ON/OFF/OFF/ON observation](results/performance-observations.json) uses
the same1440×900 camera and actual protected one-cannon/one-ball world. Frame p50
is16.7ms throughout; p95 is50.1/16.8/16.8/16.7ms and p99 is300/250/66.7/33.3ms.
This is not dense-scene, representative-hardware or causal audio overhead proof.

In that run first-world wait was9.57s, and the bounded audio observation transferred
7,074,810 bytes, not the whole soundtrack. Normal decoded music peaked9,331,200
bytes with seven FX buffers, one observed fetch/decode at a time and no effect starts
in that stationary view. The native live music stream's measured sample peak was
0.4543; this is not dense full-mix/true-peak or physical-route qualification.
[Source zoom calculation](results/zoom-gain-source.json) gives scale24 gain0.6737
versus close scale48 gain1 and scale5 gain0. Those calculations and earlier matched
native effect captures are not relabelled as actual live matched impacts.

Firefox audible output, Safari/WebKit/iOS, Android output routes, BFCache,
headphones/Bluetooth, subjective quality and dense hardware performance remain
NOT VERIFIED. Chromium viewports and native media-stream recordings are explicitly
not physical-device listening. Actual production costs were not estimated from
these downloads or incidental cycle balances.

## Current rollback and next decision

Current production JS:
`97d8ee0bf61e8b76816511772ab348962d56bbf78b597acc365f48a38725cdc9`.
Current complete75-file inventory:
`e9b5c4be2216420f6f70d7c3f33f3ef4596b7d56e05c06eae43171fd629cb8c1`.

Exact old bytes remain in `.work/audio-onboarding-compact-controls/rollback/frontend`;
`.work/s14/assets` currently holds that verified rollback. The rejected candidate
remains in the original frozen directory and
`.work/audio-compact-deployment-20261115/candidate-staging-before-rollback`.
Future recovery follows the same manifest-before-sync, observer-only command,
complete served-byte/signed-inventory/v2-proof and authenticated Rules7 checks.
Never restore/reset the paid backend to repair this frontend defect.

The owner should review the [native return recording](captures/production-music-return-0.webm)
and the settled mobile failure. A narrowly corrected, freshly qualified frontend
and separate deployment decision are needed before repeating this trial. Normal
live copy/fresh-gameplay acceptance additionally needs the existing backend to be
operational through a separately authorised resources decision. No funding action
is proposed or executed automatically here. Owner headphone/phone listening,
medium-zoom own/threat contacts, long sessions and physical tab-return checks remain
acceptance items for a subsequent authorised trial.

Raw logs/captures remain under `.work/audio-compact-deployment-20261115/`.
Reviewed evidence includes all failures and the successful restoration. No general
public launch occurred; no runtime source changes were made during this operation.
