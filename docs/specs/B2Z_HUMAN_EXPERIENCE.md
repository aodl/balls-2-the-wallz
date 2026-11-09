# B2Z human experience

This is the normative human-interface contract. It supersedes the screen layout,
toolbar, dialog, reporting and live-pause requirements in earlier observer and
human-interface documents. Historical evidence remains evidence of its own release.
The player-centred correction brief supersedes the former docked-panel, full-diamond
overview, east-facing display-zero and removed-minimap presentation requirements.
Those earlier release artifacts remain historical evidence.
The financial/game contract remains [B2Z_APPLICATION](B2Z_APPLICATION.md).

## Contracts and regression map

| ID | Required behaviour | Maintained implementation / regression evidence |
| --- | --- | --- |
| UX-01 | Arena first; no declaration or compulsory dialog to observe. | `index.html`, `arcade.mjs`; integrated browser journey |
| UX-02 | Controls serve the current task; secondary detail is progressive. | `arcade.mjs`; contextual action browser matrix |
| UX-03 | One composer, anchored to its selected cannon/site; compact global secondary views, no stacked dialogs or duplicate paths. | `shell.mjs`, `index.html`; navigation/focus browser journey |
| UX-04 | Navigation never pauses, resets, drains or restarts live playback. | `app.mjs`, `observation-loop.mjs`; `ux-playback.test.mjs`, clock/queue browser journey |
| UX-05 | Presentation never exceeds verified coverage. | `model.mjs`, pinned DTR clock; actual-clock, three-publication slow/wrap journey and authenticated delivery regressions |
| UX-06 | Producer, delivery and presentation states remain distinct. | `experience-status.mjs`; status truth table |
| UX-07 | Verified backend principal/default account is primary; legacy is secondary. | `identity.mjs`, `arcade.mjs`; destination derivation and clipboard bytes |
| UX-08 | Copies share one frozen amount/recipient/payer/memo/action binding. | `handoff.mjs`, `arcade.mjs`; edit, denial, manual copy and reload regressions |
| UX-09 | No transaction reporting/index entry; instructions are not payment evidence. | `handoff.mjs`; legacy migration, account history and browser absence assertions |
| UX-10 | Exact prices, fee, retention risk and restrictions at the handoff. | canonical `quoteV6`, wallet panel; narrow-screen field and legality checks |
| UX-11 | Accessible/reduced-motion UI retains essential live updates. | semantic panel, `shell.mjs`; keyboard, zoom, reduced-motion browser checks |
| UX-12 | Exact ownership at every zoom, non-repeating seamless torus, persistent overview and shared screen-heading/picking projection. | `camera.mjs`, renderer/effects; round-trip, seams, displacement and performance checks |
| UX-13 | Paid state, scoping, financial integrity and authentication survive releases. | unchanged backend, certificate pipeline, scoped storage; release before/after identities and existing finance/security suites |

Every change to a control, flow, status label, payment handoff, renderer or playback
lifecycle must name affected UX IDs, update intentional changes here, and run the
corresponding regressions. A screenshot is not behaviour evidence.

## Screen and controls

The screen contains the arena, B2Z / quiet “on ICP”, one status button, account chip,
contextual Join or My cannons, a small camera group (Widest arena view, Zoom out/in),
a persistent bottom-right world map, and compact Cycles / Est. burn readouts.
Help is an entry in the secondary Account panel menu; it requires no declaration. No unavailable network selector, permanent action rail,
onboarding modal, live pause/restart/download controls or payment-report workflow.

Inspection and actions use one compact nonmodal contextual card anchored to the
selected visible cannon copy. A chosen Build site becomes the ghost, guide and
card anchor. A first Join has no promised site and uses the compact global surface.
Account, Help, saved instructions and technical details use that same DOM surface
in global mode. No duplicated desktop/mobile composer or opaque docked slab.
The card flips/clamps around its anchor, excludes the aimer, camera controls,
cycles readout and minimap, and scrolls naturally once. If its anchor leaves view,
a small Locate cannon affordance replaces the detached card. Explicit Locate or
one precision-mode entry can focus/zoom; publications never repeatedly recenter.
The background remains interactive: no modal semantics, scrim or focus trap.
Close/Escape returns focus and removes a local preview, never saved instructions.

| Context | Control/result |
| --- | --- |
| Visitor | Observe; Account or Join requests a local sending-account declaration. |
| Account without cannons | Join → first-cannon instructions in the same panel; one included ball; automatic first site. |
| Own active cannon | Fire opens local heading/quantity editing; Move selects a canonically legal board cell; Build shows legal adjacent sites. |
| Own dormant cannon | Revive replaces Fire; brief expiry/restriction reason; canonical eligibility still applies. |
| Opponent cannon | Compact inspection only. |
| My cannons | Hidden without cannons; one centres directly; several open a compact chooser. |
| Widest arena view / zoom | Fixed orthographic projection, tight non-repeat zoom limit; pointer/pinch/buttons/Home/resize/restore all clamp consistently. Full-world overview belongs to the persistent minimap. |
| Minimap | Exact canonical map plus seam-clipped inverse-projected viewport polygons, selected/own cannon markers; tap/drag or keyboard arrows navigate without gameplay input. |
| Account | Sending declaration, Change/Forget, own cannons, saved instructions and recent verified account outcomes. |
| Close / Escape | Close panel/clear preview; no transfer cancellation or playback side effect. |

Hide irrelevant actions. Disable a relevant temporarily unavailable action with
one accessible concise reason. Never replace all explanations with disabled icons.
Financial/gameplay actions have visible labels; camera icons have names/tooltips.

## Accounts and wallet instructions

One input accepts canonical principal, ICRC textual account or checksummed legacy
AccountIdentifier. Explicit subaccount is advanced. Do not infer a principal from
an AccountIdentifier or treat a wallet's displayed owner as its actual sender.
Remember valid public declarations locally when available; storage failure does
not block use or claim persistence. Change and Forget are Account actions.

Verify owner plus the default subaccount derives to the certified receiving
AccountIdentifier before showing principal-only instructions. A mismatch disables
preparation. Never substitute frontend/Ledger principals or a hard-coded address.
Nondefault receiving accounts require their complete ICRC representation.

The wallet panel exposes Amount (exact ICP), Send to (principal/default account),
Memo (canonical readable text), From (declared actual payer), Copy controls and
“Wallet fee extra. Payments and unused ICP are kept; no automatic refunds.”
Legacy address and identical memo bytes in hex are secondary disclosures. Display
heading is screen-relative; wallet memo direction remains canonical. Copy the
complete unchanged memo, never manually substitute the displayed angle.
No Prepare → Confirm → Report chain. Editing and wallet instructions share a panel.
Canonical quote helpers are the sole price/legality convenience implementation.
Partial quantity is described as “Up to N”; no guaranteed fulfilment or refund.

First successful copy freezes the complete binding. Later copies use that packet,
including when live prices change. Editing requires an inline Update instructions /
Keep previous decision before replacement values become copyable. A denied copy
shows exact selectable text and claims no success. A native Copy event over the
manual fallback or financial fields conservatively freezes the complete packet,
without claiming the OS clipboard write succeeded. Keep the selected DOM intact
until the browser default copy completes. Explicit manual handoff also freezes
the same complete packet. This prevents paying an old amount with a new memo.
Account/backend/target changes cannot silently retarget a copied packet. Closing
or reloading retains bounded scoped history; old instructions are historical, not
reservations or a recommendation to pay/resend. Missing targets retain warnings.

Saved instructions and verified account outcomes are separate. Neither copying nor
an old reported index proves payment. Migrate reported records to unknown local
history; never heuristically associate receipts by amount, payer, timing or index.
Cached receipts are explicitly historical, not freshly verified. No automatic
receipt association is possible with current receipt fields.

Standards: [ICRC-1 accounts/memo](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/README.md),
[canonical textual accounts](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/TextualEncoding.md).
Standard support does not establish a wallet's UI compatibility; report actual
no-transfer wallet coverage separately.

## Status and live lifecycle

One resolver drives indicator, details and preparation gating. Certified facts:
configuration, source/destination, entities and authenticated trajectory/time.
Operational observations: run/pace, health, treasury and source-worker queries.
Local facts: verified-delivery age/errors, clock/queue, visibility and renderer.
Do not describe operational telemetry as certified game state.

Precedence: authentication/render failure → unavailable/stale delivery → observed
operator stop/transition → source/processing error → protection (Refuelling only with actual pending treasury evidence)
→ empty/dormant idle → presentation resynchronising/waiting → advancing Slow/Live.
An unchanged head with a fresh valid certificate is not stale. A successful fetch
alone is not advancing motion. Retained verified motion may finish after a
producer stop; details explain that distinction. A depleted presentation queue with active balls resolves to waiting, never simply
Slow. After 500 ms of continuous genuine waiting, the arena centre shows a white
glowing spinner and exactly “Rendering on-chain activity ...”. The top control
becomes Status rather than repeating a competing waiting paragraph. It dismisses
when verified motion resumes. The indicator has no backdrop and no pointer events;
reduced motion keeps a static ring. Meaningful visibility changes are announced
politely, never every frame. Idle, pause/protection, transport, verification and
graphics failure retain their own truthful explanations and do not show this spinner.
Explicit transport failures say Reconnecting and can recover only after fresh
verified accepted history; certificate, conflict and rollback failures remain
blocking within the session and require a fresh verified reload. Unknown failures
are verification failures. Display status settles asynchronously after operational queries; browser tests
must wait for a label consistent with verified presentation, rather than require
a DOM change in the same task as a rate change. Slow requires advancing coverage;
it cannot conceal buffering, failed delivery or authentication.
No speculative countdown. Ordinary buffering does not close admission; missing
verification/configuration/source binding or real admission failure does.

Observation/status scheduling is independent of rendering and panels: bounded
single-flight operations, generation/abort fencing, backoff and teardown. Hidden
tabs may suspend. Returning refreshes verified information; a substantial gap uses
the authenticated recent-snapshot path rather than long fast-forward playback.
Retained-gap recovery remains bounded; no weakened continuity/anti-rollback.
Camera/valid selection survive; cosmetic history resets at discontinuities.

Planning reads latest verified state, while presentation advances separately.
It never recreates the clock or discards the queue. One usable complete low-rate
interval can start immediately. At Trickle, one tick still represents about 100
seconds of production scheduling; removing an extra interval cannot remove that
cadence. Idle terminal coverage drains without inventing future simulation.
Reduced motion suppresses cosmetics, not live updates. Old live-pause preferences
are ignored narrowly; replay controls/preferences remain separate.

## Projection, effects and budgets

Fixed orthographic isometric projection; game remains 2D. Drawing, picking, aim,
preview and camera share one invertible ground-plane mapping. Pointer headings
are computed in world space. Wrapped copies keep one logical identity. Use shortest
toroidal displacement; never change canonical coordinates/memos/physics precision.
The screen heading is 0 up, 90 right, 180 down, 270 left (clockwise). The pure
`headings.mjs` layer inverse-projects screen direction before encoding canonical
world centidegrees/u16. Screen 0 maps to world 225; screen 45 to world 255.
The guide/ghost use the final encoded heading. Existing cannon directions and
stored instruction angles retain their original canonical world meaning. Saved
packets restore their canonical text directly, never through a lossy display
round trip. Fire defaults to the selected cannon's direction; Join defaults up.
Intentional current drafts survive appropriate edits; unrelated contexts do not
inherit the old hard-coded 37.5°.

A visible 44px aim handle/ring owns a Fire drag from pointer-down; empty-arena drag
owns pan. Two pointers transition to camera pinch/pan and cannot finish as a tap.
Pointer cancellation/lost capture cannot select or prepare another action.
Fields, cards and minimap never bubble into canvas gestures. Invalid Build/Move
taps give their reason and are consumed, not reinterpreted as aiming. Numeric
heading/destination, handle arrow keys and canvas [ / ] provide keyboard alternatives.
Only inputs relevant to the current action are validated. Build requires an
explicit eligible site; first Join remains automatic. All owned active anchors'
canonically eligible orthogonal neighbours remain available, with the selected
anchor emphasized. Options/highlights are revalidated on verified revisions,
retaining valid choices and focus, and retaining an explicit unavailable choice
without silently switching it to automatic placement. Island ball pools are
labelled “Island balls”, not private per-cannon counts. No ordinary orbit or perspective controls.

Matte shallow tiles, coherent ownership, volumetric bases/turrets/barrels and solid
spheres with shared lighting/contact shadows. Local aim uses a distinct short
ground guide. Balls have an unlit, tone-mapping-independent white core, shared soft white glow
and minimum ~2 CSS-pixel core at wide views. No perpetual bobbing. A tapered,
low-opacity white tail is at most .6 world cells (a few normal ball diameters),
derived only from recent displayed displacement and fading over 350 ms. It unwraps
the short torus path, disappears on stationary frames, and resets at spawn/despawn,
backward/discontinuous time, resync/source/world change or graphics restoration.
Reduced motion removes tails/highlights while retaining readable white balls. Any passing-tile
highlight is bounded, wall-clock fading, secondary to ownership and derived from
displayed world displacement. Stationary balls, camera movement and resync create
no travel effect. Reset on spawn/discontinuity and suppress with reduced motion.

No million-object graph, million-cell per-frame scan, per-ball dynamic shadows or
unbounded effects. Share geometry/materials, instance visible tiles/entities, use
overview LOD and bounded cosmetic state. Cap DPR at 2 and the drawing buffer at one million pixels; explicit context loss/error,
recover renderer without replacing verified session; dispose resources on teardown.

Copy/layout budgets (dynamic addresses, prices and memos excluded):

| Surface | Budget / constraint |
| --- | --- |
| Permanent arena chrome | At most 20 words; one primary status, no technical paragraph. |
| Cannon inspection | At most 30 words plus contextual labelled actions. |
| Action restriction | One reason, normally at most 12 words. |
| Replacement choice | One inline choice, normally at most 18 words. |
| Ordinary wallet view | At most 65 static words, including the mandatory fee/retention warning; one scroll. |
| Account declaration | At most 40 words before advanced detail/history. |
| Help | Secondary, at most 110 words. |
| Technical status/history | Disclosed; bounded source data/records, no default-arena paragraph budget. |

Financial warnings are explicit exceptions if more information is necessary; never
hide them to satisfy a count. Cards are at most 360 CSS px wide, bounded by viewport,
keyboard/safe-area space and navigation widgets. Financial values remain at least
14 CSS px and primary controls target 44 px. Critical text has restrained translucent
backing/contrast, not unreadable text floating directly over territory. During a short keyboard viewport, numeric editing uses one bounded camera
accommodation after resize, while the redundant drag handle/player chooser yield
space to the focused field; the cannon/guide, minimap and cycles remain visible.
They restore when space/focus returns. No accommodation runs under an active pointer
or on publication updates. Account and
input nodes are retained across background updates, preserving selection/caret.
Latest-state previews never replace displayed authoritative entities or clocks.

For a square torus of side L and CSS viewport A×B, the actual projection's minimum
scale is `(1+1e-7) * max(A/(L√2), B/(L√(2/3)), min(A√2/L, B√6/L))`.
These are the limiting integer period translations; a slightly smaller scale admits
positive-area repetition. This is not a world-axis bbox or whole-diamond fit.
Bounded historical boards retain bounded fit semantics. Terrain fragments use
clipped viewport intersections; each logical entity chooses one projected visible
copy, shared by picking, shadows, guide and UI anchoring. Minimap footprint is the
actual inverse-projected quadrilateral, clipped/split at canonical seams.

`terrain-surface.mjs` creates one exact RGBA ownership/boundary atlas from compact
verified territory layout (4 MB for 1000²). Main shader and cached overview consume
this same raster/layout. Ownership colour is never centre-sampled into mixed blocks.
Fine anti-aliased procedural tile divisions fade at subpixel scale; real boundary
bits persist longer. Geometry is a shallow shared box per intersecting world copy,
not a million-object graph. Selected/eligible cells remain unit-size overlays,
independent of terrain detail. At imprecise zooms, Focus provides precision instead
of highlighting coarse blocks as legal. Ownership/palette revisions compare compact row runs and update dirty cells plus
edge neighbours in the persistent atlas, with at most 32 GPU row-band updates; camera movement/render frames do not scan or allocate the million-cell map.
The overview paints those same cached dirty rows (full exact regions on initialization),
not a second ownership model. A one-cell capture dirties at most three rows; no
million-cell buffer is allocated for an incremental capture.

Limits remain 4,096 instances per entity batch, 8,192 preview cells, 128 cosmetic
tiles, 4,096 short tails, at most 25 candidate world copies, DPR ≤2 / one million
drawing pixels. Geometry/materials are shared; no per-ball lights/shadow maps,
full-screen bloom or independent simulation clock. Resize buffers only when their
actual dimensions/DPR change. Texture/canvas memory is disclosed separately from
JS heap. All geometry/effects are presentation only.

## Public operational cycles

The optional reader directly queries management canister `aaaaa-aa`, method
`canister_status`, with backend as argument and effective routing ID. It retains
mainnet root/query-signature verification and uses existing SDK Actor/Candid.
It does not query an invented method on the game actor or access `canister_metrics`.
The display requires public status visibility; verify the installed permission
read-only before release. Preserve unrelated settings; setting changes require
separate explicit approval. See
[status policy](../../config/europe-public-status.json) and [operator procedure](../operations/S14_OPERATOR.md).

Cycles displays the management response's `cycles` balance, not invented SDK liquid.
Reserved cycles are a separate balance; they are not subtracted twice. Est. burn
is an approximate observed net decline over at least 120 seconds, at most a
10-minute / 12-sample window. The idle memory/compute baseline is labelled separately
in details, never substituted for total gameplay expenditure. No runway guarantee.
Unseen credits/refunds/attached-call reservations can affect net decline; public
sampling cannot reconstruct gross execution cost or every hidden discontinuity.

A balance increase, changed reserved balance, backend/module change, version
regression, invalid/old timing or >150-second gap resets/rejects the window. The IC
version counter advances on normal successful executions as well as upgrades;
monotonic increments with the same module are not mislabelled as a code deployment.
This distinction is necessary to collect a useful active-game estimate. Module
changes/regressions are fenced; unknown same-module operations remain a limitation
of public sampling. Balances/deltas remain BigInt until bounded formatting.

One independent optional worker queries at 60 seconds, bounded exponential failure
backoff to 300 seconds, generation fencing, visibility reset and teardown.
A 12-second request deadline aborts only the dedicated telemetry SDK agent's query
and certificate-key fetches, including response bodies. SDK retries are disabled
for this optional read; the monitor owns retry/backoff. The SDK-supported one-target
memory key cache keeps the default five-minute TTL without waiting on IndexedDB.
The in-flight slot is released only after settlement. A noncompliant transport
that ignores cancellation stays Unavailable until settlement or a genuine recovery
action (reload); hiding/returning cannot falsely claim collection or launch
unbounded replacements. Stop aborts telemetry and cannot resurrect timers/results.
Compact labels are only Collecting, Unavailable, Stale or a bounded estimate.
Reset causes, sample age/window, idle/reserved balances and limitations are details,
never compact arena copy. These labels are tested at desktop and 320×640.
Stale/collecting/unavailable are explicit, never fabricated zero. It cannot block verified observation, essential lab_status or
payment preparation. The superseded runtime_health frontend meter/await is removed;
backend endpoints, treasury accounting and pacing are untouched.

Primary references: [management interface](https://docs.internetcomputer.org/references/ic-interface-spec/management-canister/),
[abstract balance/routing semantics](https://docs.internetcomputer.org/references/ic-interface-spec/abstract-behavior/),
[status setting](https://docs.internetcomputer.org/guides/canister-management/settings/),
[execution version counter](https://docs.internetcomputer.org/references/ic-interface-spec/canister-interface/).

Performance targets (not claims): desktop 60 fps, physical phone 30 fps; measure
p50/p95 frame time, interaction delay, heap, draw/instance counts and verification
interference on populated journeys. Release report records measured budgets and
environments, including viewport versus physical-device limits. The release report must identify software-rendered VM measurements explicitly; a
mobile viewport or text-size emulation is neither a physical-phone nor native
browser-zoom pass. No maximum-world
qualification is inferred from a small fixture or an empty production screenshot.

Preceding minimal-isometric release baseline (8 November 2026, Chromium 153, software
ANGLE/SwiftShader VM, seven-second steady populated canonical fixture, no video):

| Viewport | Frame p50 / p95 | Draw CPU p95 | Visible tiles / draw calls |
| --- | --- | --- | --- |
| 1440×900 | 216.6 / 266.6 ms | 6.6 ms | 1,147 / 7 |
| 390×844 | 66.7 / 116.6 ms | 5.9 ms | 353 / 7 |
| 320×640 | 50.0 / 66.7 ms | 5.7 ms | 241 / 7 |

Measured JS heap was 13.5–13.8 MB; it excludes GPU/process memory. These software
results miss the frame targets and do not qualify a hardware desktop, phone or
maximum population. Geometry sharing, cached visible layout, bounded uploads,
no MSAA and the one-million-pixel cap are the measured design's detail limits.
Automation click-to-visible durations include Playwright/input/stability overhead
and must be labelled accordingly, not presented as isolated input-handler timing.
Keep raw measurements and fixture/source identities in the release evidence.

Player-centred review measurements (same software renderer, seven-second windows,
no video; these are observations, not hardware budgets met):

| Viewport / fixture | Frame p50 / p95 | Draw CPU p95 | JS heap | Visible entities / ground instances |
| --- | --- | --- | --- | --- |
| 1440×900, one cannon/ball | 83.3 / 116.6 ms | 6.5 ms | 15.96 MB | 2 / 1 |
| 390×844, one cannon/ball | 33.3 / 83.4 ms | 8.5 ms | 17.21 MB | 2 / 1 |
| 320×640, one cannon/ball | 16.7 / 33.4 ms | 5.0 ms | 17.05 MB | 2 / 1 |
| 1440×900, three cannons/balls at seam | 100 / 316.6 ms | 18.3 ms | 18.32 MB | 6 / 2 |
| 1440×900, cached fragmented terrain (no visible entities) | 16.7 / 16.7 ms | 0.4 ms | 17.66 MB | 0 / 1 |

The one-ball software frame measurements improve on the preceding baseline; draw
CPU is similar with added overview/glow/tails. The six-entity seam sample remains
slow and misses targets. No hardware smoothness or maximum-population claim follows.
Heap excludes GPU/process memory; the persistent 4 MB atlas, 1000² overview backing
canvas and GPU texture are separate bounded resources. A single-cell capture
reuses the atlas and uploads at most three rows / 12 KB. There is no repeated
million-cell raster reconstruction per frame. Automation click-to-visible
measurements (0.09–1.95 seconds in the small scenes; 1.38–1.70 seconds in the
six-entity sample) include browser input/stability scheduling and software rendering,
not just handler time. Hardware interaction latency remains unqualified.

The focused player regressions are `player-camera.test.mjs`,
`player-headings.test.mjs`, `player-terrain.test.mjs`, `player-motion.test.mjs`,
`public-cycles.test.mjs`, and `tools/player_playability_browser.py` called by the
existing populated HTTP browser harness. Existing playback, lifecycle, status,
quote, memo, handoff and authentication regressions remain required. The review
report records exact commands, scope, inputs and results rather than treating
synthetic fixtures as certified mainnet or physical-device evidence.

## Development, source qualification and production release

Local development may use focused assertions, synthetic fixtures and `--no-video`
for fast iteration or uncontaminated performance measurement. A focused pass is
not repository-wide source qualification or a substitute for visual review.

Source release qualification requires a reviewed clean source revision, an auditable
complete frontend manifest and all six substantive exact-source gates in
[the verification workflow](../../.github/workflows/verification.yml):

1. Source conformance.
2. Native conformance.
3. Packaged DTR and clean consumers.
4. Runtime-lab Wasm.
5. Browser HTTP and Web Crypto.
6. S14 and million-cell installed-IC qualification.

A failed, skipped, cancelled or incomplete substantive gate blocks production
approval. “BLOCKED production inventory (not a pass)” is informational and supplies
no qualification. No renamed job, focused subset or unchanged-component assertion
waives the required hosted gates. Reuse evidence only with explicit executable
input/artifact identity justification; preserve original failures and qualifications.

Substantial visual changes also require a small actual-application visual review:
populated desktop, 390×844 and 320×640 screenshots and short desktop/mobile
recordings. Cover selection/aim dragging, Move/Build, coherent copy/replacement,
card close/reopen while motion continues, minimap/seams, and genuine waiting/resume.
Several journeys may share a recording. Keep captures tied to source/module/artifact
identities; synthetic/accelerated fixtures are not mainnet timing or certificate
proof. No generated mock-ups, empty-world-only review or assertion-only waiver.
Keep physical-device, native-keyboard, actual-wallet and hardware-GPU limits honest.
Software frame measurements are evidence, not a smoothness pass.

Production approval is a separate explicit authority after source qualification
and visual review. Follow the installed paid-game [operator procedure](../operations/S14_OPERATOR.md).
Retain prior immutable assets/manifest for rollback. Verify every served file,
backend binding, CSP/security headers and paid-backend preservation after any
approved asset-only publication. Never replay historical fresh-install commands.
A source commit or controller access alone grants no production operation authority.

## Review checklist

- Reject unnecessary permanent controls, duplicated messages, ordinary developer
  concepts, hidden playback side effects, unsupported payment-success claims and
  unmeasured rendering complexity.
- Test the UX-01..13 matrix semantically: actual clock/queue, exact clipboard bytes,
  canonical legality, keyboard/focus, reduced motion, seams and context recovery.
- Keep payment, certificate/anti-rollback, source and financial assertions intact.
- Preserve published source/dependency/runtime provenance; evidence-only updates do
  not justify rebuilding a qualified runtime artifact.
- Record test environments, exact commands/conclusions and concrete release
  blockers in the release report. Temporary task authorization/status belongs in
  that report or operator procedure, not this product contract.
