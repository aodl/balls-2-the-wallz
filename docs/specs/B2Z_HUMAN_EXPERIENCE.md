# B2Z human experience

This is the normative human-interface contract. It supersedes the screen layout,
toolbar, dialog, reporting and live-pause requirements in earlier observer and
human-interface documents. Historical evidence remains evidence of its own release.
The fluid-player continuation supersedes the inspection dialog, legacy/hex UI,
instant camera commands, same-cell UI Moves and the previous waiting wording.
Canonical financial semantics and historical records remain unchanged.
The tactical continuation below additionally supersedes square-map orientation,
bright passing-tile highlights, the old .6-cell tail cap and unconditional hidden
observation suspension. The player-centred correction brief supersedes the former docked-panel, full-diamond
overview, east-facing display-zero and removed-minimap presentation requirements.
Those earlier release artifacts remain historical evidence.
The financial/game contract remains [B2Z_APPLICATION](B2Z_APPLICATION.md).

## Contracts and regression map

| ID | Required behaviour | Maintained implementation / regression evidence |
| --- | --- | --- |
| UX-01 | Arena first; no declaration or compulsory dialog to observe. | `index.html`, `arcade.mjs`; integrated browser journey |
| UX-02 | Controls serve the current task; secondary detail is progressive. | `arcade.mjs`; contextual action browser matrix |
| UX-03 | One composer, anchored to its selected cannon/site; compact global secondary views, no stacked dialogs or duplicate paths. | `shell.mjs`, `index.html`; navigation/focus browser journey and `verify_s14_deployment.py:locate_seam_action` |
| UX-04 | Navigation never pauses, resets, drains or restarts live playback; return preserves useful verified intervals. | `app.mjs`, `observation-loop.mjs`; `ux-playback.test.mjs`, clock/queue browser journey, `warm-return.mjs` / `elastic-playback.test.mjs` / `tactical-polish.test.mjs`, `verify_warm_browser.py` and installed seam→Locate identity checks |
| UX-05 | Presentation never exceeds verified coverage. | `model.mjs`, pinned DTR clock; actual-clock, three-publication slow/wrap journey and authenticated delivery regressions |
| UX-06 | Producer, delivery and presentation states remain distinct. | `experience-status.mjs`; status truth table |
| UX-07 | Verified backend principal/default account is the ordinary destination; historic legacy data remains compatible. | `identity.mjs`, `arcade.mjs`; destination derivation and clipboard bytes |
| UX-08 | Copies share one frozen amount/recipient/payer/memo/action binding. | `handoff.mjs`, `arcade.mjs`; edit, denial, manual copy and reload regressions |
| UX-09 | No transaction reporting/index entry; instructions are not payment evidence. | `handoff.mjs`; legacy migration, account history and browser absence assertions |
| UX-10 | Exact prices, fee, retention risk and restrictions at the handoff. | canonical `quoteV6`, `arcade.mjs:paymentWarning`, wallet panel; `payment-warning.test.mjs` and actual action-card narrow-screen/fee/legality checks |
| UX-11 | Accessible/reduced-motion UI retains essential live updates. | semantic panel, `shell.mjs`; keyboard, zoom, reduced-motion browser checks |
| UX-12 | Exact ownership at every zoom, non-repeating seamless torus, persistent overview and shared screen-heading/picking projection. | `camera.mjs`, `interaction.mjs`, `minimap-projection.mjs`, renderer/effects; `tactical-polish.test.mjs`, `verify_tactical_grid.py`, `verify_tactical_browser.py` and existing round-trip/payment/pointer checks |
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
a small Locate cannon affordance replaces the detached card. Locate animates through the shared camera controller; the card becomes reachable
when its anchor returns, while clock/queue identity remains unchanged. Explicit Locate or
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
| My cannons | Hidden without cannons; one smoothly focuses it; several open a compact chooser. |
| Widest arena view / zoom | Fixed orthographic projection, tight non-repeat zoom limit; pointer/pinch/buttons/Home/resize/restore all clamp consistently. Full-world overview belongs to the persistent minimap. |
| Minimap | Exact canonical map plus seam-clipped inverse-projected viewport polygons, selected/own cannon markers; tap/drag or keyboard arrows navigate without gameplay input. |
| Account | Sending declaration, Change/Forget, own cannons, saved instructions and recent verified account outcomes. |
| Close / Escape | Close panel/clear preview; no transfer cancellation or playback side effect. |

Hide irrelevant actions. Disable a relevant temporarily unavailable action with
one accessible concise reason. Never replace all explanations with disabled icons.
Cannon action icons have accessible names, tooltips and 44px targets; the
expanded prompt explains the task. Wallet Copy buttons retain visible labels.

## Fluid player experience (UX-02/03/04/05/07/08/10/11/12/13)

This section is the current camera/selection/composer contract. It intentionally
supersedes the older inspection-card heading/action rows and secondary technical
payment controls. Financial/authentication, exact ownership, no-repeat and
verified-only contracts are unchanged.

### Camera, shared territory focus and map

One `camera-controller.mjs` owns explicit Focus/My cannon/Locate, widest view,
zoom buttons/keys, map click/keys and double-click. `Camera` retains projection
and constraints. Interpolate position with 220–380ms smoothstep and logarithmic
scale, shortest torus periods and continuous no-repeat clamping. Replacement
starts at the current interpolated state. Direct pan/pinch/wheel cancels animation;
it never resumes later. Store only settled/debounced poses. Use frame timestamps,
not frame counts; hidden/frozen transitions cancel safely. Reduced motion makes
movement immediate. Keyboard viewport accommodation may be immediate.

Focus is disabled at scale ≥36 when the working footprint has ≥52px safe margins
and avoids camera/map/cycles controls. Focus targets at least scale 48 and a useful
upper working position on narrow screens. Clicking a visible cannon only selects
it; it does not steal camera control. Explicit camera actions keep selection,
unsent drafts, copied packets and the playback clock/queue intact.

`player-anchor.mjs` chooses selected owned island, then largest relevant active
island by area/numeric-ID tie-break. Sum circular cell-centre moments analytically
over the existing exact rectangles. Ambiguous centroids use a stable owned cannon.
Cache across ordinary captures. Account/selected-island/source context or explicit
Overview can rebase; ball movement cannot. Without ownership retain meaningful
local focus. This is presentation, never an ownership or gameplay decision.

The diamond remains a full world of aspect sqrt(3), with that stable anchor at its
centre. `minimap-projection.mjs` translates/wraps one canonical cut, and applies the
same transform to exact cached ownership, markers, cut-clipped camera polygons,
picking and keyboard navigation. At most four existing-atlas rectangles are drawn;
no second ownership model or per-frame million-cell reconstruction. Centre click
navigates to the player anchor. Freeze the cut during map dragging. Drag is direct;
click/keys animate. An outside-diamond drag keeps its last valid point.

### Balls, gesture priority and verified-only following

`ball-presentation.mjs` supplies displayed positions to renderer, picking and
following; stationary coverage reuses the cached point array. Following requires
no account and opens no payment/cannon dialog. Selection highlights a ball and
shows a temporary Stop following control (also Escape; keyboard B cycles current
balls, Enter selects the centre object). Initial acquisition pans smoothly without
changing zoom. Tracking then uses a 32px deadband and damped correction only when
the verified playhead changes. It stops at coverage end, resumes with new coverage,
unwraps seams, and never predicts future motion. Destruction, identity/reset,
another object, manual pan/pinch or an explicit camera target exits. Zoom buttons
may retain follow. Identity is never persisted across browser sessions.

Placement/captured gestures have priority. Otherwise displayed ball/cannon hit
areas use the actual projection and deterministic physical depth: larger
x+y+height is nearer this fixed camera. Occluded balls cannot steal cannon hits;
practical core/halo targets remain bounded. Overlays exclude arena interaction.

Mouse pairs use a 400ms/7px arena-only double-click window. Cannon selection is
immediate; only placement commitment and ball camera acquisition defer for this
window. Touch/keyboard activate immediately; no mandatory double-tap. A pair cancels
pending placement/follow and animates 1.65× zoom about the clicked world point.
At maximum zoom it changes no camera state. Fields, wallet values, buttons and map
never participate. Empty terrain clicks no longer aim: use the handle/numeric/
keyboard alternatives. The small contextual delay prevents an attempted zoom from
first changing a paid destination or memo; it is not a universal selection delay.

### Toolbar and one progressive instrument section

Collapsed selection is one row: **Focus / Fire or Revive / Move / Build / Close**.
No visible Cannon # heading or inspection wall. Identity/island facts remain
accessible metadata/history. Opponents expose Focus/Close only. Icons have 44px
hit areas, names/tooltips, visible focus and pressed/expanded state. Relevant
disabled actions give concise accessible reasons. Close deselects; collapse retains
selection/draft. Switching icons replaces one lower section, never a stacked dialog.

Prompts: **Aim & Pay**, **Choose a Tile & Pay**, **Choose a Tile, Aim & Pay**. Pay is
an external-wallet intention, not a transaction button. Fire has a precise heading
chip and quantity stepper. Move hides heading and discloses numeric cell entry;
Build chooses an eligible neighbour and aims its ghost. First Join stays automatic.
Only exact amount, principal, canonical text memo, compact payer, Copy controls
and short fee/retention warning appear in the ordinary handoff. Legacy/hex DOM and
native-copy references are removed, while underlying validation/history bytes stay.

Smoked glass has a readable solid fallback for narrow/reduced-transparency/forced
colour conditions. Expansion uses 180ms opacity/clip feedback; reduced motion skips
it. ResizeObservers invalidate content/chrome measurements; camera frames use
cached geometry and side hysteresis, not repeated scroll-size measurement. Focus,
caret, one natural scroll and keyboard viewport access must survive publications.

UI Move preparation excludes the cannon's own cell, including manual entry:
**Choose a different tile**. Valid cell zero stays legal from elsewhere. Revalidate
on revisions, never silently replace a target, and retain old copied records as
history. This safeguard does not change `quoteV6` or the Ledger interpreter:
independent wallets can still submit same-cell commands accepted by the backend.
No on-chain rejection rule is claimed. All other legality/prices/memo bytes remain.

### Depth, effects and concrete implementation budgets

Selected cannons have a persistent dual-tone ground footprint independent of Move
or aim expansion. Hover is lighter; committed destinations are distinct ghosts.
The canonical preview barrel and 2px/4px guide agree at encoded precision. Guide
materials depth-test without writing depth; ground height .028 and start offset
.42 cell keep solid cannon geometry above it. It is no collision forecast or
canonical rotation. Build/selection overlays also respect depth.

Tile darkening is capped at 20%, ≤128 cells, with an independent 1.25s squared
fade. Tail lifetime remains .35s, brighter .92 inner/.36 outer opacity, ≤1.2 cells/
12 recent path points per ball. Reflections/wrap follow actual displayed travel;
stops/camera movement produce none. Reset on discontinuity/epoch/context restore;
reduced motion suppresses optional effects. Atlas/minimap colours never change.
No new full-screen pass, global bloom or per-ball light. These are work budgets,
not hardware performance claims; record actual measurements with environment.

| Contracts | New regression evidence |
| --- | --- |
| UX-04/05/06 | `elastic-playback.test.mjs`, retained expiry-checkpoint test, `measure_elastic_playback.mjs`, controlled rendered returns, actual installed observer and genuine browser lifecycle evidence labelled separately |
| UX-04/05/11/12 | `fluid-experience.test.mjs`: intermediate camera frames, anchored zoom, cancellation, reduced motion, follow stop/resume and identity fencing |
| UX-02/03/12 | Stable circular territory anchor, exact shifted map round trips/atlas areas/footprint clipping; populated navigation/gesture journeys |
| UX-07/08/10/13 | `payment-warning.test.mjs` and actual action-card browser assertions cover Move/Build-specific warning, ordinary Fire/Revive/Join warning, separate fee and frozen-packet binding. Same-cell UI guard with legal zero, unchanged canonical helper, historic packets and exact modern wallet copies |
| UX-05/12 | Separate wake/tail expiry, shared ball projection/depth hits, GPU guide occlusion and persistent selection |
| UX-02/03/11 | Actual desktop/390/320 toolbar/glass/action/keyboard/focus tests and recorded populated journeys |

All six exact-source CI gates and a separate production approval remain required.
Local focused passes are not source qualification. Historical release evidence
is not rewritten or treated as qualification for changed executable inputs.

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
“Wallet fee extra.” remains separate. Beneath the ordinary wallet fields, Fire,
Revive and automatic first-cannon Join show “Payments and unused ICP are kept;
no automatic refunds.” For Move or additional Build with an explicitly selected
destination (including valid cell zero), replace that generic warning with exactly:

> If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.

Never show both warnings. Unchosen destinations do not expose a copyable packet
or this destination warning. Choose the warning from the displayed instruction
packet, including a frozen packet after Keep previous; editing another action
must not mix its risk text into the retained handoff. This is explanation of the
existing race/retention risk, not a change to on-chain eligibility or refunds.
The warning stays in the same natural panel scroll, without another disclosure.
The ordinary handoff has no legacy-address or hexadecimal-memo controls. Internal
AccountIdentifier/hex validation and historic records remain compatible. Display
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
producer stop; details explain that distinction. A depleted presentation queue with active balls says **Waiting for next update**,
with a static ring. Actual authenticated backlog admission/resynchronisation alone
says **Catching up with on-chain activity ...**, with a spinner. Both debounce
for 500ms and come from the same resolver; neither hides another failure state. The top control
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
low-opacity white tail is at most 1.2 world cells (six normal core diameters),
derived only from recent displayed displacement and fading over 350 ms. It unwraps
the short torus path, disappears on stationary frames, and resets at spawn/despawn,
backward/discontinuous time, resync/source/world change or graphics restoration.
Reduced motion removes tails/darkening while retaining readable white balls. Passing-tile
darkening is bounded to 20%, wall-clock fading over 1,250 ms, secondary to ownership and derived from
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
bits persist longer. Geometry is a continuous top plane per intersecting toroidal copy (a shallow box only for bounded historical boards),
not a million-object graph. Selected/eligible cells remain unit-size overlays,
independent of terrain detail. At imprecise zooms, Focus provides precision instead
of highlighting coarse blocks as legal. Ownership/palette revisions compare compact row runs and update dirty cells plus
edge neighbours in the persistent atlas, with at most 32 single-row GPU updates or one bounded full persistent-atlas upload for a larger change; camera movement/render frames do not scan or allocate the million-cell map.
The overview paints those same cached dirty rows (full exact regions on initialization),
not a second ownership model. A one-cell capture dirties at most three rows; no
million-cell buffer is allocated for an incremental capture.

Limits remain 4,096 instances per entity batch, 8,192 preview cells, 128 cosmetic
tiles, 4,096 short tails, at most 25 candidate world copies, DPR ≤2 / one million
drawing pixels. Geometry/materials are shared; no per-ball lights/shadow maps,
full-screen bloom or independent simulation clock. Resize buffers only when their
actual dimensions/DPR change. Texture/canvas memory is disclosed separately from
JS heap. All geometry/effects are presentation only.

## Tactical presentation and elastic verified return (UX-02/03/04/05/11/12)

The hierarchy is terrain → solid gunmetal cannon → white ball → temporary warm
interaction cue. CSS custom properties in `style.css` maintain surfaces, ink,
quiet text, accent, invalid and cannon material tokens; renderer reads its cannon
colours from those properties. Ownership colours remain the exact atlas palette.
Cards use near-opaque graphite, an 8px edge, fine highlight and modest local shadow.
Button feedback is 120ms; local aiming is immediate. No full-screen blur/scrim.
Amount is dominant, but recipient/memo/payer and the fee/retention warning remain
ordinary accessible content. Important text targets 4.5:1; disabled text remains
readable. Forced colours uses system pointers; reduced motion removes transitions.

| Input state | Resolution / presentation | Regression |
| --- | --- | --- |
| Empty / camera capture | Grab / grabbing, no pretend touch pointer | shell pointer journeys |
| Displayed cannon | Shared projected base/barrel hit, pointer + footprint contour; opponent inspection only | `interaction.mjs`, tactical tests/browser |
| Captured aim | Local reticle SVG, 14×14 hotspot, native crosshair fallback; gesture cannot pan | aim/pinch/cancel browser checks |
| Legal Move/Build hover | Disposable unit-cell contour + wire ghost; never changes quote | shared resolver + tactical browser |
| Chosen target | Persistent stronger contour + translucent ghost, never actual relocation | existing canonical selection/quote browser tests |
| Illegal hover / invalidated target | Cross/negative contour; retain target, block new unsafe copies | canonical revision/invalid-click checks |

Hover and activation use `resolveInteraction`; DOM surfaces win, then captured
input, placement, cannon inspection, camera. Hover is recomputed from one retained
pointer during visible rendering, without network calls or cell scans. Leave,
hiding, graphics loss and overlays clear it. Touch and keyboard do not need hover.
Card-side hysteresis avoids flipping while its current side still fits.

The minimap projects one canonical atlas into the same sqrt(3)-aspect diamond as
the arena. `diamondMap` provides exact forward/inverse transforms for ownership,
markers, seam-clipped viewport polygons and navigation. Transparent corners are
CSS-clipped and rejected by hit testing. A captured drag outside the diamond
retains its last valid point; it does not clamp to an unrelated corner. Arrow keys
move in projected screen directions. Width is 164px desktop / 124px narrow.

Grid footprint derivatives use continuous `ground` before wrapped lookup, not
`fwidth(mod(...))`. Torus geometry has no boundary skirt. Same-owner seams must be
compared at equivalent pixel phase; real boundary bits must remain visible.
GPU pixel comparisons, not a plausible shader edit alone, qualify a seam claim.

Local barrel orientation uses the final canonical encoded heading only for the
selected displayed cannon at the same planning cell. A latest-position difference
uses a separate ghost. Cancel/invalid heading removes the override; verified
`c.heading` is never written. A 2px light / 4px dark `Line2` guide has stable CSS
width. Its short ground direction is intent, not collision prediction.

Balls have unlit white cores and batched camera-facing depth-tested halos. Short
travel history retains at most 12 segments per ball, 1.2 world-cell extent and
350ms age, merged for tiny collinear samples only within a 50ms bucket; a merge never refreshes the original expiry. Slow travel cannot accumulate a long old tail. Inner/outer tapered streaks follow
actual displayed travel, with seam unwrapping and discontinuity resets. Passing
cells receive at most 20% transient black overlay; overlaps do not accumulate in
the atlas or minimap. Stationary cores can glow, but cannot generate travel.

Visible observation is due every 250ms (the worker additionally honours delivery
backoff); hidden-but-executing checks are due every 15s, operational refresh every
60s. Hidden rendering, pointer and optional-cycle work stops. There is one pipeline,
single flight per worker, finite scoped HTTP deadlines and normal certificate /
continuity / anti-rollback policy. No wake-lock or throttling workaround. Hidden
queues retain the most recent complete useful verified interval and trailing
checkpoints, using existing segment initial/final state, event data and players.
This explicitly supersedes the tactical two-second-tail policy: polling the same
head must not consume a remainder. After admitting a newer hidden interval the
application may discard older unseen visual history and move to the retained
interval's start, never its last two seconds. The same queue/clock objects remain;
8MiB/24-segment limits still apply. No duplicate world cache or independent verifier
is introduced. Receipts, quotes and account state use the latest authenticated
head regardless of displayed history. A byte-limit conflict may require retaining
only an authenticated checkpoint, honestly leaving no motion.

On return, an existing remainder resumes immediately; a newer retained complete
interval starts at its beginning, without replaying superseded history. Consumed
motion is never rewound or looped. With no unconsumed coverage, keep the last scene
and say Waiting for next update. Warm reconstruction occurs before a round trip;
fresh certificate/operational admission is still required for new instructions.
An intentional forward skip clears cosmetic history and reacquires a valid followed
ball through the same short toroidal camera transition, preserving zoom and local
controls/packets. An uninterrupted cold foreground start retains its established startup buffer.
After a newer same-identity snapshot is authenticated, recovery retains useful
unconsumed verified coverage even before first playback. Otherwise retention
misses can repeatedly erase the buffer before startup completes. This recovery
uses the same clock/queue and verified-only interval path as warm return; it does
not change producer pacing or authenticate an unavailable span. When the retained remainder ends, adopt the already cached authenticated anchor,
including terminal expiry/checkpoint state, without waiting for another motion
publication. The next verified interval must match the explicit new source fence; presentation skips the missing span without
interpolating it. An epoch/source identity change uses the existing authenticated
recovery and invalidates incompatible following. Discard/reload does not trust a
stored scene as freshly authenticated.

One application policy (`elastic-playback.mjs`) estimates arrival from distinct
advancing certified heads, not repeated certificates or unchanged-head replies.
It retains eight interval-normalized cadence samples and requires two differences
(three distinct advancing observations). The median cadence is bounded below by
the publication duration at the actual supported pace; a stale estimate (more than
three periods) or insufficient evidence falls back to nominal. Pace/context changes
reset evidence. Estimate timestamps/periods are operational observations, never
certified predictions. Late arrival uses another estimated period as an uncertain
horizon and may conserve remaining coverage at the lower rate, eventually exhausting
it rather than promising infinite playback. The last valid pace hint may continue
presentation through an operational-query failure; it never authorizes payments.

Spendable verified ticks exclude the larger of the existing fast-mode jitter
reserve (`buffer target − publication ticks`) and the maximum observed complete
delivery-cycle duration times nominal pace, over the last eight distinct heads.
Using the larger avoids counting those margins twice. This preserves Normal's
already qualified delivery headroom: a real 4.35s fetch exposed a stall when an
initial policy incorrectly accelerated through that reserve. Slow-mode startup
still needs only one complete interval; its legacy extra reserve is zero, and a
measured delivery margin never becomes a compulsory second-publication threshold.
Spendable ticks divided by estimated time until the next distinct head selects a
target of 0.5–1.5× nominal, with factor slew limited to 0.12 per wall second.
Large supported-tier changes clamp the effective presentation rate into the new
0.5–1.5 bounds immediately (zero means stopped); ordinary in-tier changes remain
smooth. Warm return re-bases the rate, not the clock, so a stale Normal rate cannot
consume a retained Trickle interval in one second. The pinned DTR clock still enforces the endpoint; its application-configured internal
rate is unity so the two adaptations do not multiply. No game speed, physics,
source timer or conservation threshold changes. Bounded intentional delay is
disclosed as Live/Slow · delayed when more than ten nominal wall seconds behind
the accepted head. That disclosure is secondary to error/protection/idle status
and does not itself prevent safe latest-head preparation. Actual network catch-up
and no-coverage waiting remain different states. Diagnostics distinguish producer
nominal/supported rate, effective presentation rate and retained-buffer bytes.

Controlled canonical-player comparisons retain 80s of a .8-tick Trickle remainder,
versus about 2s with the deployed policy, and a complete 1-tick recent interval after
several hidden admissions. These are controlled clocks, not production/lifecycle
or continuous-delivery guarantees. The release report records exhaustion, delay,
byte bounds and real rendered/browser coverage separately. A frozen browser cannot
execute background checks, and exhausted verified coverage cannot produce motion.
Health replies retain request-start age and lifecycle generation; pre-hide replies
cannot become fresh after return. Certificate freshness uses actual certificate
time plus monotonic elapsed time. No authentication/freshness check is relaxed.
Frozen/BFCache pages disarm scheduling; resume re-arms once. Discard/reload follows
normal authenticated boot. Hidden/offline requests can be throttled or suspended;
there is no background freshness guarantee. Two tabs have bounded independent
readers; no new leader-election service is introduced. Measurements and actual
browser visibility coverage belong in the tactical release report, separately
from controlled-clock policy tests and hardware/device claims.

Adopted research principles: [Riot UI](https://www.riotgames.com/en/artedu/user-interface-design)
(task hierarchy), [Riot clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity)
(readability within performance constraints), [Ubisoft](https://news.ubisoft.com/en-us/article/3FpgxppxEUmS0dciV2vsY7/create-the-unknown-communicating-information-in-games-is-more-complicated-than-you-think)
(function before ornament), Xbox [contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102)
and [additional cues](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103)
(shape as well as colour). Lifecycle follows [Chrome](https://developer.chrome.com/docs/web-platform/page-lifecycle-api),
[visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
and [throttling limits](https://developer.chrome.com/blog/timer-throttling-in-chrome-88).
[Cursor](https://developer.mozilla.org/en-US/docs/Web/CSS/cursor),
[wide lines](https://threejs.org/docs/pages/Line2.html) and camera-facing halo
semantics use the pinned local Three/standard CSS facilities. No borrowed art/assets.

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

## Optional delegated-payment boundary

The manual release still needs no sign-in and performs no payment. The isolated,
disabled-by-default optional feature follows [DP-01..13](B2Z_DELEGATED_PAYMENTS.md).
It extends UX-07/08/09/10/13 only for explicitly authorized signed Ledger
submission: A remains owner, S is a separately granted spender, G stays certified.
The cannon icons never spend; final Pay is deliberate. Keep manual instructions,
coherent copies and the exact Move/Build warning. No frontend gameplay API or
manual receipt-reporting path is introduced. Unit, actual disposable and real
Internet Identity/wallet evidence remain distinct.
