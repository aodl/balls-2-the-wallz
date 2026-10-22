# B2Z arena, camera and shared pacing — 2026-10-21

> Verification addendum, 2026-10-22: the published `af212f2` CI run failed its source export inventory and standalone browser navigation checks. The deployment/preservation evidence below remains unchanged. The tooling-only correction and complete standard-gate reruns are recorded in [B2Z_ARENA_VERIFICATION_FIX.md](B2Z_ARENA_VERIFICATION_FIX.md); no production deployment or live-world activation is part of that patch.

**Live:** viewport arena, on-demand accessible controls, pan/zoom/minimap, bounded producer, shared liquid-cycle pacing, parallel verified artifact retrieval and corrected foreground frame timing. **Staged:** 32×32 toroidal rules, persistent accepted cannon heading and a non-deployable migration candidate. The live paid game remains bounded 16×8 v3. **DTR CHANGE REQUIRED for world activation; DTR CHANGES MADE: NONE.**

The same backend `s34gv-3qaaa-aaaar-qcifa-cai` and frontend `s45ab-wiaaa-aaaar-qcifq-cai` were used with `codex_local`. No reinstall/reset, canister creation/deletion, settings/controller change, Event Horizon modification, mainnet transfer or remote Git action occurred.

## Visible interface

The canvas fills 100dvh with safe-area overlays. A small B2Z/status mark, five labelled icon controls and optional minimap replace the hero, introduction, join button, expanded cards and footer. Play, Players, Rules, View and Settings use native dialogs, keyboard containment/restoration, Escape and local focus handling. Shared execution continues behind them. The verified empty overlay is dismissible and does not reopen on publications. Local aim remains usable while disconnected; actionable transfers require certified configuration/source and healthy operation.

The camera uses world cells, anchored wheel/pinch zoom, pointer/touch pan, fit, selected-cannon centring and consistent MOVE picking. It preserves local state across publications, resize and reconnect. The staged renderer wraps copies without changing counts/picks, culls offscreen geometry and splits minimap bounds at both seams. Historical live cannons show a neutral symbol because v3 cannot authenticate their last accepted heading.

[Live desktop](../evidence/B2Z/arena/live-desktop.png), [tablet](../evidence/B2Z/arena/live-tablet.png), [mobile](../evidence/B2Z/arena/live-mobile.png), [additional-ball card](../evidence/B2Z/arena/live-add-ball.png), [MOVE preparation](../evidence/B2Z/arena/live-move.png). [Staged torus desktop](../evidence/B2Z/arena/torus-desktop.png), [mobile](../evidence/B2Z/arena/torus-mobile.png), [corner-seam MOVE/minimap](../evidence/B2Z/arena/torus-seam-move.png). The staged pictures include the selected cannon's owned-cell MOVE highlight.

Twenty-second normal-speed recordings: [local v3 populated play](../evidence/B2Z/arena/populated-local-v3.webm), [local torus / two territories / four balls](../evidence/B2Z/arena/populated-local-torus.webm). The torus clip was reviewed at playbackRate 1 over 20.216 wall seconds, 20 video seconds and 490 displayed frames. Ball movement continues between exact events, reflections are crisp and seam copies do not count as new entities. No trajectory predictions, ownership prepainting, power-ups or velocity changes were added. These are disposable local scenes, not mainnet payments or proof of live torus activation.

## Production and consumption

The old driver deliberately rested one second between Seal, Step and Publish while the client consumed about one tick/s. The actual pre-change 89.46-second mainnet trace retrieved 0.492 ticks/s, displayed 0.479 and contained 36 STALLED samples out of 84. A buffer could not repair that sustained mismatch.

The driver now performs consecutive bounded phases, persists atomically once, publishes at most one two-tick batch per callback and paces completed batches. Limits are eight actions, 2,048 work units/message, Step ≤512 and a 600M-instruction yield boundary. Delayed callbacks cannot accumulate unlimited catch-up or authoritative lookahead. Actual mainnet maximum in the measured interval was 74.27M instructions/message; reserve recovery locally reached 158.97M with five actions. IC consensus time is fixed within a message: controller counters measure phase instructions, not invented per-phase wall milliseconds. Across 23 mainnet segments they recorded Seal 228.67M, Step 550.34M and Publish 388.21M total instructions. Wall-clock pacing/delivery is measured separately.

The client follows the shared nominal rate gradually, then uses unchanged DTR jitter correction. State/events/scores retrieve concurrently through three bounded streams; certificates, all artifact bindings, chaining and endpoint conformance still pass before admission. Foreground live frames use the existing clock's one-second elapsed bound; hidden-tab transitions reset the anchor. No unverified motion is invented.

| Run | Wall seconds | Backend ticks/s | Retrieved ticks/s | Displayed ticks/s | Post-startup STALLED samples |
|---|---:|---:|---:|---:|---:|
| Final local v3, genuine IC | 34.815 | 0.977 | 0.919 | 0.984 | 0 |
| Staged 32×32, four balls | 29.049 | 0.482 | 0.482 | 0.489 | 0 |
| Final public mainnet, Conserve | 89.546 | 0.246 | 0.246 | 0.248 | 0 |

The final local v3 window had 1.981–6.881 ticks buffered, maximum fetch 2,128 ms, certificate verification 517 ms and artifact retrieval 1,876 ms. The staged trace buffered 2.121–4.251 ticks, with maximum fetch 1,156 ms, verification 425 ms and artifact retrieval 430 ms. The earlier frozen-Wasm acceptance also sustained 1.035 produced / 0.996 displayed ticks/s with zero stalls. The full traces include intentional startup/disconnection/retention-gap stops; those are not relabelled as continuous play. Rates are finite representative observations, not a claim that every permitted 64-ball population is sustainable. Reconnect explicitly resynchronizes when retention is exceeded.

The larger scene at 1 tick/s starved artifact delivery (11.7-second fetch, 12 stalled samples). Its B2Z-owned shared ceiling was therefore reduced to 0.5 before the passing trace. Live v3 targets remain 1 / 0.5 / 0.25 ticks/s; staged v4 targets are 0.5 / 0.25 / 0.125. Three ordinary overruns can lower the ceiling further. Paid spawn batches are excluded from that feedback. Logical velocity, score area-time and seal inputs are unchanged.

## Cycle policy and measurements

Thresholds use the pinned SDK's **liquid** balance, which already accounts for freezing/current-message/call reservations. The implementation does not subtract them again. Exact balances and instruction diagnostics remain controller-only; public mode/pace hints never authorize payments or outcomes.

| Mode | Enter at liquid cycles | Leave slower below | Live target |
|---|---:|---:|---:|
| Normal | 4T | 3T | 1 tick/s |
| Economy | 1.5T | 1T | 0.5 ticks/s |
| Conserve | 0.5T | 0.25T | 0.25 ticks/s |
| Reserve protection | below 0.25T | recover through higher entry bands | simulation suspended |

The independent 60-second Index retry calls only above 0.15T liquid headroom. This protects the measured approximately 0.11T outgoing-call reservation with margin. Below that floor, pending inputs and cursor remain intact; newer payments remain durable in the official Index. Preparation is disabled during reserve protection. Local tests kept two admitted payments plus a later Index payment and applied all correctly after a disposable local top-up. No mainnet top-up was performed. Boundary/hysteresis tests cover every band and prevent oscillation within it. Empty arenas retain zero unnecessary game callbacks and keep bounded Index checks.

Matched exact-state local old/new normal modules computed the same 32 ticks /16 segments: **48→16 callbacks, 162.820M→92.972M cycles/segment, 42.9% lower**. This isolates the phase/persistence improvement without conflating it with slower gameplay.

A fresh-instance matched mode test computed the identical world/scores for all three modes:

| Mode | PocketIC virtual seconds | Segments | Total cycles | Cycles / virtual second |
|---|---:|---:|---:|---:|
| Normal | 30 | 16 | 1,491,034,358 | 49.701M |
| Economy | 60 | 16 | 1,551,172,274 | 25.853M |
| Conserve | 120 | 16 | 1,611,352,238 | 13.428M |

Economy/Conserve spend **48.0% / 73.0% less per virtual second** than Normal. They compute fewer ticks per real-time interval, not merely slower browser rendering. Initial immediate batches account for the finite window's 32/30, 32/60 and 32/120 achieved rates. Virtual seconds are not compared to mainnet wall seconds.

Actual mainnet quiescent boundaries at 21:58:51–22:02:13 UTC span **202.249 seconds, 23 segments, 23 callbacks, four Index calls, 6,285,750,387 cycles**: **31.079M cycles/wall second, 273.293M/segment**, including Index and controller-measurement overhead. The old 378-second active observation estimated 101.277M/s /445.148M/segment at a different pace, but its boundaries were not quiescent. Outstanding execution/call refunds can raise reported balance without funding; that estimate is not a precise causal savings percentage. Same-state local evidence supplies that comparison. Compute allocation is zero; latest idle storage charge is about 4.19B/day, far below active aggregate execution. Costs of Index calls are not separately attributed from that aggregate.

Latest backend management status: **1,390,887,289,912 cycles**, 2026-10-21T22:42:53.845649+00:00. It is running in Conserve with admission open and clear source/runtime errors. Displayed management balances during active calls may temporarily include reservation effects. The current paid player prevents a fresh empty-mainnet measurement; no player was deleted to obtain one. Historical empty-arena measurements remain in the unchanged [idle release](B2Z_EMPTY_ARENA_CYCLES.md).

## Upgrade and authoritative continuity

The exact prior installed normal module `1510d8677464944d0d2ddad53370f339b75ab627ff0e3c8180467a3e63fa84f3` was upgraded locally to the frozen candidate with real upstream ICP ledger/index data. Thirty-three captured canonical publications replayed exactly in native/JS; transaction positions 2–9 appeared once. Pending inputs, completed/retained publications and an unfinished old stage survived. Reserve, empty wakeup, malformed/underfunded outcome, browser-closed progression and elimination-to-idle recovery tests passed.

Mainnet was paused at an unfinished `running` stage and upgraded **in place** to:

`53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec`

Before/after world, scores, events, publication, all retained catalog/chunk bytes, source descriptor/cursor, controller work and controllers/resource settings matched exactly. The unfinished work resumed autonomously. Final certified state still has one cannon, one ball, received **100,000,000 e8s**, cursor **39,526,412**, no pending source rows and healthy official ledger binding. Certified publication heads advanced 13063→13083 from 2026-10-21T22:39:19.202Z to 2026-10-21T22:42:10.035Z; accrued credits continued increasing. Canonical rules/schema/configuration/source identities remain unchanged; their complete values are in the verification summary.

Final frontend assets are from clean commit `c0cfc29eccffcc849c21a75fb3d3fa3ccc851c3c`. Every listed public asset matches the frozen build and carries an IC certificate header. App SHA-256:

`8e1f38a45f34a5c253d7fd44ab291bc79f2e6a78bdf2906708b38d0160c5646b`

The frontend's existing asset-canister module remains `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`. The public browser used the SDK mainnet root, validated certified observation and source/configuration, copied ANGLE 37.5 and equivalent hex, checked all quadrants and action prices, disconnected/reconnected without losing aim, and made only read-only query/read_state requests. No browser errors or real gameplay transfer were observed/performed.

Prices remain **1 ICP join; 0.1 ICP × active-ball-count² additional ball; 0.0001 ICP MOVE**, fees separate. Prefix-free text, old prefixed text/binary/numeric compatibility and the receiving account are unchanged:

- ICRC owner: `s34gv-3qaaa-aaaar-qcifa-cai`; default subaccount 0.
- AccountIdentifier: `344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`.

## Staged world, orientation and required transition

New v4 rules/schema/configuration identities distinguish the 32×32 torus. Native/JS exact fixtures cover horizontal/vertical/corner crossings, seam collisions, spawn/anchor exclusion, connectivity/severance/capture/annihilation, relocation and recoverable integer trajectories. Limits are unchanged. `cannon.heading` is optional u16, changes only on accepted launches, is restored from authenticated state and applies at its playback event. Unknown historical directions remain absent. Ordinary bounces and local aiming never turn the cannon. A real disposable ledger/index run replayed 31 publications / transaction IDs 1–4 exactly, retained two pending commands across a v4-to-v4 upgrade and preserved heading 40960.

The pure placement helper embeds old cells at offset (8,12), preserving owners/accounts/entities, balances, time, received totals and rational credits. It rejects unfinished work, admitted/downloaded/in-flight inputs and missing/incomplete official-Index cutover evidence, so old-width pending MOVE IDs cannot be silently reinterpreted. Source cursor and global ledger cutover remain distinct. The candidate is explicitly non-deployable; no global scan or alternate index path was added. A fresh v4 constructor and v4-to-v4 upgrade are not proof of live v3-to-v4 migration.

**DTR CHANGE REQUIRED:** the pinned host has only Ingest/IngestOrdered/Seal/Step/Publish and validates the head seal against the journal identity and original manifest/ack. A narrow generic atomic transition must bind old manifest/state/identity, new identity and migrated state, logical boundary, source cursor/anchor and application metadata; reject staged work/reservations; retain old seals/receipts/artifacts; and expose an authenticated epoch link the verifier recognizes. B2Z retains topology, placement, Index cutover, camera and economics. No DTR edit, hidden sibling override, dependency repin or live identity rewrite occurred. This is the remaining activation blocker; the user must publish any separately scoped shared change before real-remote consumer validation.

## Verification and local commits

Final regression: **1,349 JS, 137 Python; Rust mechanics 11, protocol 11, native replay 8, new torus replay/migration 2 and host 18**, all passed with locked/offline dependencies and formatting checks. Final current frontend + exact live Wasm integration passed 18 browser groups and exact replay of **56** actual captured publications / positions 1–3 once. Mainnet browser and asset hashes passed. Reviewed JSON and media are under [evidence/B2Z/arena](../evidence/B2Z/arena/verification.json); raw traces, including failed earlier experiments and their actual qualifications, remain under `.work/arena/`. The rejected 1-tick/s staged scene and missing-browser-library aggregate are not reported as passes.

1. `99bae476c3f8e71115f60c13dd1716f45568c36f` — arena shell/camera.
2. `caf3702b447bc145af380e87d858c1ce4ae4e050` — bounded producer, budget policy and verified playback.
3. `c0cfc29eccffcc849c21a75fb3d3fa3ccc851c3c` — staged torus/orientation, local transition evidence and frame correction.
4. The following local report commit records deployment/evidence; obtain its SHA with `git log -1`.

Checkout `/home/codexdev/src/b2z`; branch `checkpoint/b2z-arena-camera-and-pacing`. DTR remains clean at `1f47c1a0a104875bd13475d561b8d5aa10770d99`. New remote CI is **NOT_RUN** until the user publishes. User-owned command:

```sh
git push -u origin checkpoint/b2z-arena-camera-and-pacing
```

No unrelated milestone was started. Live torus/orientation activation remains blocked as described above; UI and sustainable shared pacing are already live independently.
