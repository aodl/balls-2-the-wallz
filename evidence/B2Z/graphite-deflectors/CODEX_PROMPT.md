# B2Z — Graphite/player-colour visual system, lightweight structures, and the Deflector action

## 0. Mandate, source of truth, and boundaries

Implement the approved visual direction and a complete, separately gated Deflector feature. Produce working application code, deterministic gameplay code where required, actual application captures, reproducible tests, frozen artifacts and release decisions. Do not stop at mockups, replace the mechanic with a local animation, or begin another unrelated UX redesign.

The requested result is an elegant, minimal, premium-looking isometric game: dark bevelled physical structures; restrained luminous player-colour accents; a matching compact payment HUD; a separate **Build deflector** action; and balls that turn in a deflector's chosen direction at a path-dependent point inside its tile.

This package is self-contained. `CODEX_PROMPT.md` is the authoritative execution brief. Read `reference/REFERENCE_GUIDE.md`, inspect the actual supplied PNGs, and use the supporting decision register, engine notes and acceptance matrix. The prose requirements override incidental defects in generated reference images.

### Existing work must not be disturbed

Repository: `aodl/balls-2-the-wallz`.

The remote branches checked on 16 November 2026 were:

- `release/btz-prelaunch-playability`: `6afe3b2fc2426887f905259312f5c090ed7dc7ab`.
- `feature/b2z-combined-clearance-war-cry`: `0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20`.
- Rules11 qualified source: `c0e3dd28879199c48aae328d712d6543ffcc5455`.

The owner has separately instructed Codex to deploy a Rules11-compatible frontend. That operation may be underway or completed when this brief is read. Reconcile the actual branch, uncommitted work, served asset identities and certified backend identity before starting. Do not reset to these historical references or assume repository HEAD equals the installed game.

Use an isolated worktree/feature branch, for example `feature/b2z-graphite-deflectors`, based on the reconciled combined-policy source. Preserve the existing frozen deployments and rollout evidence. Do not reuse `.work/s14/assets` for an experimental preview or overwrite another task's staging/rollback directory. Do not merge an unfinished Deflector into the already approved Rules11 release.

Production frontend: `s2jxj-liaaa-aaaas-amynq-cai`.
Production backend: `s5ir5-gqaaa-aaaas-amyna-cai`.

**This instruction authorizes development, local/disposable installation, tests, documentation and ordinary non-force source publication. It does not authorize production frontend deployment, backend upgrade, pause/resume, rule preparation/activation, canister settings/controllers changes, ICP payments/allowances, funding or cycles transfers.**

No standalone Rules9/Rules10, experimental Rules8/ICRC-2, or new Deflector rules may be activated under this instruction. Preserve paid state and all source/certificate/accounting safeguards.

### Approved requirements versus proposed defaults

The visual identity, selected models, tile alignment, new action button and fixed-outgoing-direction mechanic come from the owner. Deflector pricing, caps, placement/lifecycle policy and exact contact-time algorithm were not all decided by the owner. Section 9 and `supporting/DECISION_REGISTER.md` mark sensible **provisional development defaults**, not already approved live game rules. Implement and test them transparently; put their production approval on the final release checklist. Do not claim they were previously agreed, nor block routine development to ask for every parameter.

---

## 1. Visual references and their precedence

Inspect these actual files, not just their names:

1. `reference/01_APPROVED_VISUAL_LANGUAGE.png` — the approved unified graphite, accent-light and HUD direction.
2. `reference/02_APPROVED_CANNON.png` — the refined selected cannon: low faceted body, armoured barrel collar, dark muzzle and ownership-coloured muzzle rim.
3. `reference/03_APPROVED_DEFLECTOR.png` — the refined low directional wedge on a square chamfered tile-aligned base.
4. `reference/04_APPROVED_PANEL_STRUCTURE.png` — the exact information layout: common vertical axis, From left, To right, three aligned Copy buttons and person/reassociate icon.
5. `reference/05_CURRENT_UI_BASELINE.png` — actual pre-theme application screenshot, for before/after comparison, **not** the desired new material treatment.
6. `reference/06_CURRENT_CANNON_BASELINE.png` — actual older cannon screenshot, for readability comparison, **not** the target shape.

The latest style sheet provides materials and visual language, not permission to change the previously approved information hierarchy. Its central lines are not perfectly aligned; correct that in code using a shared grid. Its footer is a concept catalogue, **not** an additional permanent HUD. Its giant presentation scale, duplicate illustrative objects, illustrative prices and glowing paths are not gameplay data.

Do not add a large redundant action icon before the panel title merely because the style sheet contains one. Do not add a second full set of labelled action cards from its footer. Do not bake the green board, neon trails or photographic lighting into the model.

Target the reference's silhouette/material intent with less gratuitous glow. Actual tile geometry, correct headings, readable financial values, economical rendering and the established minimal interaction take precedence over decorative illustration details.

---

## 2. One shared theme, not neon everywhere

Create a small, documented theme/token layer shared between DOM HUD and renderer where practical. Preserve the existing deterministic territory palette and map colour assignment.

### Material language

- Graphite/charcoal primary surfaces; slightly lighter bevels and broad lit faces; near-black recesses and muzzle opening.
- Restrained player-coloured light strips, muzzle rim, active-action indicator and selected tile contour.
- Thin edges and modest depth; broad quiet surfaces, no greebles, bolts, ornamental grids, scanning lights or constant shimmer.
- Stable soft contact shadows, not dramatic cinematic real-time shadows.
- Small chamfered/cut-corner details can connect the HUD to the structures. Keep them decorative so clipping cannot cut away hit targets or keyboard focus rings.
- Payment values remain high contrast. Prefer off-white amount text with a restrained accent edge; only tint the amount if measured contrast remains sufficient across the entire player palette.
- Informational/retained-payment notes remain calm blue/cyan, independent of player hue. Errors remain errors; never recolour them into a player's innocuous team accent.

The material should feel expensive; the rendering implementation should not be expensive.

### Player colour rules

The lime in the reference is an example of one player's colour, not a universal brand colour.

- A real cannon/deflector uses its verified owner's canonical player colour. Resolve territory/island labels to player identity; same-player islands must not get unrelated colours.
- Inspecting an enemy must not recolour the enemy as friendly or imply permission to pay from their account.
- A payment pane, active purchase tab and proposal use the actual declared paying account's accent where resolved. Account declaration is not authentication or signing authority.
- With no resolved paying account, use a restrained neutral accent, not an invented ownership claim.
- A proposed structure's material remains unmistakably provisional even when its tint matches the player's real structures.
- Derive a contrast-adjusted luminous tint from the existing hue. Do not change consensus colour mappings or repaint territory to make highlights work.
- Selection/hover/disabled/invalid state must also differ by contour, shape, weight or icon state, not colour alone. Preserve whole-body selected-cannon emphasis, not just a ground ring.

Test lime, cyan, magenta, amber, red, dark blue, near-dark and pale territory examples plus neutral terrain. Retain reduced-motion, reduced-transparency and forced-colour behaviour. Use normal-text contrast of at least 4.5:1 and meaningful control outlines at least 3:1 where the applicable contrast test requires them; keep 44px targets and the established minimum readable financial type size.

Theme account changes update the local pane promptly without altering current payment authority, frozen packets, world colours, clocks or queues. A temporarily unknown account must not cause theme/layout flicker on every poll.

---

## 3. Cannon: faithful shape, clear at gameplay scale, truly on its tile

Build one reusable canonical cannon model matching reference 02, not a second set of approximate preview shapes.

### Shape

Use a squat chamfered/octagonal base, faceted turret, a readable armoured collar, a short substantial barrel and a genuinely dark muzzle opening with a thin luminous rim. Retain the selected reference's broad grey armour planes and small base/turret accent slots. Avoid reverting to a spherical knob on a glowing ring.

Use broad deliberate normals/bevels and a modest number of sides. Surface relief must remain readable at normal gameplay scale; a beautiful 1,200px hero render is not sufficient evidence.

The base stays aligned to world tile axes. The turret and barrel rotate together around the cell centre using the existing canonical heading and screen projection. Do not rotate the entire square-ish plinth as a shortcut. Do not change the game's heading convention because the mockup happens to face the viewer.

### Tile and size contract

For modelling, use one tile as 1×1 in horizontal world space, with its centre at `(cellX + 0.5, cellY + 0.5)`.

- Start with a base footprint approximately 0.78–0.86 tile wide, centred and inset from all four edges.
- Keep the full rotating assembly, including barrel and muzzle corners, inside the cell's horizontal footprint at **every** supported heading. Aim for a maximum radial footprint of about 0.46 tile; measure rather than assume the barrel's centreline proves the whole barrel fits.
- A useful initial height range is roughly 0.35–0.50 tile, tuned to match the reference and preserve adjacent-cell readability.
- Centre the actual mesh origin and selection/pick anchors on the canonical cell, not on its screen-space bounding-box centre.
- Elevation may legitimately overlap an adjacent diamond in screen projection; validate world-space horizontal footprint rather than confusing that with misplaced ground contact.
- Shadows and decorative edge softness may extend a little beyond the base, but cannot become authoritative occupancy.
- A far-zoom readability marker is allowed; do not enlarge the physical model several tiles wide. Marker size must not change the canonical cell or collider.

Verify geometric footprint bounds analytically or through all quantized headings in a cheap geometry test, plus rendered cardinal/diagonal views at actual game scales. Two neighbouring structures must not visibly interpenetrate. Keep toroidal copies continuous and anchored to the same canonical identity.

### Real, hover, selected and preview variants

Share the same geometry and transforms for a real cannon, selected cannon, Move destination and Build ghost. The actual base/turret/barrel/muzzle must match.

Maintain the owner-approved persistent selected-body highlight and darker separating contour. Adapt its hue to the unified theme without losing obvious selection on hover/click. Preserve muted/desaturated/dormant distinction without falsely showing ready-to-fire neon where gameplay is protected.

Provisional meshes can use restrained translucent material, a fine dark outline and a distinct dashed/segmented footprint. Do not show mesh triangles or a second turret design. Local aim rotates only the local preview/selected visual; verified cannon state changes only when authenticated events do.

Do not add continuous recoil, bobbing or spinning. Any optional firing kick/flash must be bounded, presentation-only and tied to an actual verified launch. It is not required for this task.

---

## 4. Deflector art: the selected square-mounted directional wedge

Use reference 03. Do not substitute the earlier round pedestal/hovering triangle concept.

- A shallow square chamfered graphite mounting plate, aligned with the four world tile edges and centred on one cell.
- A low triangular arrowhead/wedge with two or three readable broad faces, a dark sidewall and a narrow ownership-coloured edge/spine showing the outgoing direction.
- Rough starting footprint: plate 0.84–0.90 tile; rotating arrow assembly radius no greater than about 0.39–0.42 tile, preserving clearance at all headings.
- Keep it clearly lower than a cannon, approximately 0.10–0.20 tile above the terrain as an initial modelling target.
- Base does not rotate. Only the arrowhead rotates to the chosen heading. The arbitrary-heading requirement is not limited to four cardinal arrows shown in the style catalogue.
- Keep the arrow readable at medium zoom and dark territory. At very wide zoom, a simple oriented chevron is more useful than noisy microgeometry.
- No permanent beam, twin light rails, extra ball, or energy tube is part of the idle structure. Paths in the reference explain behaviour only.
- A small contact glint and the existing ball trail's continuous kink are sufficient activation feedback. Do not create a new constant particle system, per-deflector sound loop or full-screen flash.

Real, hovered, selected and provisional Deflectors share geometry. A provisional Deflector is not a cannon ghost with a triangle painted over it. Ownership light and the current direction remain readable when selected.

The physical triangle expresses direction; the recommended mechanic below is **tile-wide**, so not every ball must literally intersect the small triangle. Use a very subtle inset tile treatment/groove or a brief contact indication to make a redirect elsewhere in the tile understandable. Do not make the visible plate an impassable wall.

---

## 5. Rendering architecture and measurable cost

The inspected renderer already uses `THREE.InstancedMesh` with shared base, turret, barrel, muzzle, accent and shadow batches. Do not advertise instancing itself as a new optimization or replace it with hundreds of individual `Mesh`/material objects.

The existing broad shape uses an 8-sided base cylinder, 12×8 sphere turret and 10-sided barrel. Improve silhouette while reducing unnecessary segments and component/material overhead where measurement supports it.

### Preferred low-cost path

1. Build shared indexed low-poly geometry once, procedurally or from a small original authored asset. Keep generation source and deterministic asset hashes.
2. Combine compatible static parts and use vertex colours/material masks for metal, dark recesses and luminous strips. One object with many material groups can still require many draws; measure actual draw calls.
3. Keep a minimal separate rotating upper assembly unless a small vertex/instance transform mask can rotate it cheaply while the base stays aligned. Do not sacrifice correct rotation merely to claim one mesh.
4. Share materials across players; ownership colour is instance data, not a new material and draw batch per account.
5. Render luminous accents as colour/emissive contribution, with a restrained small halo only if it earns its cost. No per-object point light, shadow map, bloom, SSAO, reflection probe, heavy PBR texture stack or fullscreen postprocess.
6. Reuse the existing inexpensive contact-shadow approach. Avoid stacking several transparent full-tile quads per piece.
7. Use a small number of screen-size LOD bands with hysteresis. Keep selected/aimed pieces intelligible, avoid popping and maintain exact pick identity. No LOD mutation of authoritative state.
8. Cache unchanged instance data; don't allocate geometry/materials on hover, heading changes, colour changes or every frame. Maintain correct dirty flags for new structure/revision/palette/selection state.
9. Preserve the renderer's pixel/DPR budget, culling, bounded effects, render-on-change/idle behaviour, GPU-context loss and restore.
10. Never silently drop authoritative visible pieces when a render capacity is reached; keep the new configured structure cap and render capacity compatible and expose a testable failure instead of pretending missing structures do not exist.

Initial design targets, not claims: cannon roughly 150–300 triangles at close LOD, Deflector roughly 40–100; usually two or three shared opaque body/accent batches per family plus a shared shadow approach. A demonstrably better implementation can justify another budget. The target is fewer or comparable costs at matched scenes, not arbitrary polygon counting.

Benchmark old/new in identical populated scenes and camera poses with controls and audio in equivalent states. Record renderer calls, triangles, geometries/textures, instance uploads, frame p50/p95/p99, CPU layout/update cost and GPU timing when supported. Include 1, 32 and the actual certified cannon cap; dense proposed Deflectors; mixed scenes; desktop, 390 and 320 viewports; and a far overview. Render-only stress beyond game caps is useful but must be labelled synthetic, not supported gameplay capacity.

Browser rendering cost and backend cycles are different budgets. Cheaper meshes do not prove cheaper authoritative physics. Do not claim a percentage improvement without matched measurements. Existing P09 and hardware limitations remain unresolved unless actually retested successfully.

Use the repository-pinned Three.js version; no package upgrade or new rendering engine merely for this redesign.

---

## 6. HUD material pass: reskin the approved structure, not the workflow

Apply the graphite/chamfer/player-accent language to the contextual toolbar, read-only action pane, quantity editor, War Cry field, sound and camera controls, selected-item marker and small help surfaces. Keep the arena dominant.

A thin brighter top/bevel edge and short player-colour active underline are preferable to glowing every button/frame. Most surfaces should be neutral. Hover/focus can brighten a border, not add a large halo. Keep controls immediately recognisable at real 320px scale.

Use DOM/CSS and simple SVG icons, not raster screenshots, WebGL HUD text or a large blur/postprocessing layer. A fallback without backdrop blur must remain attractive. Keep fonts local/existing; no remote font dependency.

### Do not regress the approved card

Use one shared grid for Fire/Revive, Move, Build, Join and Deflector:

- Row 1: action title left; exact ICP amount right; amount Copy in the rightmost reserved column.
- Row 2: `From` + five-character account summary + person/reassociate icon left; `To` + five-character recipient summary + Copy right. Labels beside values, not above them.
- Row 3: `Memo` + complete canonical text + Copy.
- Both vertical dividers use exactly the same grid boundary; all three Copy centres share the same x coordinate, within 1 CSS pixel.
- Principal/memo/amount readouts are selectable text, never fake input fields. Full values are available inline without a new modal.
- `From` is not a Copy action. It changes/reassociates the actual payer; do not copy the abbreviated identity or swap to a selected enemy.
- Native/API/manual copy uses the full canonical packet; exact amount has no `ICP` suffix in the clipboard. Freeze and Update/Keep still cover the complete instruction.
- No routine Wallet fee extra row; retain accurate network-fee disclosure in Help. Do not claim the displayed price includes that fee.
- Calm blue note preserves exact retained-payment statements. For Move, additional Build and provisional Deflector placement use:

> If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.

Retain any concise active-rules clearance explanation needed for nearby enemy claims. Fire/Revive/Join use the appropriate established retention wording. Informational styling is not permission to conceal risk.

Keep existing prompts `Aim & Pay`, `Move & Pay`, `Build, Aim & Pay`, and suitable first-Join wording. The new Deflector title is **Deflect & Pay**. It prepares an external-wallet instruction; it does not submit money or imply an immediate local build.

Status-only changes must retain 0px panel drift and preserve scroll/focus/draft. Readiness can disable copying without inserting volatile paragraphs. Do not bind theme/layout recomputation to every backend poll.

The larger model must not break camera composition, exact clicked-tile identity, guide occlusion beneath the cannon, full-body highlighting, no automatic focus on selection, or the reserved quantity/War Cry dock. Update the model's visual bounds in the existing composition and hit-test helpers rather than hard-coding new offsets.

---

## 7. Add a distinct, discoverable Deflector action button

The owner explicitly wants a new action, not a hidden replacement for Build cannon.

In the existing context toolbar, use this order where the capability and permissions apply:

**Focus | Fire | Move | Build cannon | Build deflector | Close**

Build cannon keeps its cube icon. Build deflector gets a bespoke thin-line wedge/arrow-tip icon, preferably with a small bent incoming path so it is not mistaken for camera navigation, Move or a play button. Keep the same stroke weight and scale as neighbouring icons. Tooltip/accessible name: **Build deflector**.

No permanent footer catalogue, duplicate global button or second build-menu modal. Do not make users open Build cannon to find the Deflector.

Six 44px hit targets with sensible gaps can fit a 304px card; use actual layout measurements. Never shrink hit targets or hide Close to accommodate decoration. Keep fixed slots during action switching and readiness updates. Use the established exceptional contracted-viewport priority pattern instead of wrapping a normal portrait toolbar into a tall menu.

### Availability and permissions

On an unsupported certified backend, hide the unsupported purchase action or retain a clearly unavailable explanation consistent with existing capability UI; never emit a Deflector memo. Do not use a local feature flag to unlock production payment copying. Controlled feature fixtures can enable it against a genuinely supporting disposable backend.

On a supported backend, a declared payer with eligible owned territory can prepare a Deflector. Disable the action if no legal destination/capacity is available, with a short accessible reason. Unknown legality while computing is not a proof that there are no sites. Enemy inspection must not enable purchases using someone else's cannon/account.

Keep the new action reachable through the player's normal cannon context. A Deflector itself can be inspected/selected and explicitly focused; do not give it Fire, Revive, quantity or War Cry controls. Avoid inventing rotate/move/sell actions that the new protocol does not implement.

### Placement workflow

1. Click Build deflector.
2. Choose a deterministic legal default tile immediately: prefer near the selected owned cannon, otherwise nearest eligible tile using the documented toroidal distance/tie-break rule.
3. Show the exact Deflector ghost and one chosen-tile contour. Hover clearly distinguishes another eligible tile from the committed proposal.
4. Reuse current click-near/drag-arrow aiming for the ghost's outgoing heading. Support arbitrary existing quantized heading, not just four directions. Pointer cursor must match actual gesture ownership.
5. Keep the standard exact payment summary. No numeric cell/angle form fields, ball-quantity counter or War Cry input for this action.
6. A static short outgoing guide is a local orientation preview, not a promised future ball path. Do not simulate the paid game ahead of verification.
7. Changing tile/angle/payer updates the proposed amount/memo coherently. After copying, use Update/Keep. Never silently choose another site when the committed proposal becomes illegal.
8. Closing cancels local preparation, not a payment already sent from an external wallet.
9. Only an authenticated applied receipt/event creates the solid structure. The browser does not optimistically place it as verified.

Maintain exact canonical clicked-tile identity through deferred taps, pan/zoom and account/epoch changes. Preserve offscreen Locate behaviour and ordinary drag-to-pan outside the aim/placement region. A new icon must not steal quantity/War Cry keystrokes or turn tooltip focus into a persistent obstruction.

---

## 8. Deflector mechanic: what is actually required

**Collision/contact determines when and where the turn occurs. The stored arrow heading alone determines the outgoing direction.** This is a directional device, not a mirror obeying reflection-angle mathematics.

A qualifying ball enters the tile along its actual verified trajectory, travels to an interior contact point dependent on that entry/path, turns there, and continues along the Deflector's canonical heading. Preserve the canonical speed policy, ball identity, owner and ordinary capture/annihilation behaviour. Do not accelerate the ball, change its owner, jump it to the centre or muzzle, or visually curve a turn that the engine treats as instantaneous.

The tile is the effect region. A finite small triangle collider would allow some paths to miss; that would not satisfy the owner's every-entering-path intention. The mesh is not required to be a literal contact surface. Never silently downgrade to 'only paths hitting the triangle' or 'change direction immediately at the tile edge'.

Use one effect per qualifying residence in a Deflector tile. A ball already travelling in the configured direction consumes that encounter without redundant turn effects. Repeated frames cannot reapply the turn. Returning after genuinely leaving can encounter it again, subject to the explicitly specified anti-degenerate policy.

### Recommended development contact model (not previously approved physics)

Prototype a tile-wide **incoming-chord midpoint** rule first:

- At a positive-duration logical entry, find the straight incoming trajectory's next geometric exit from that cell before any Deflector redirection.
- Contact time is halfway between entry and that geometric exit; contact point is on the incoming trajectory at that time.
- Left/right/top/bottom/oblique entries produce different contact positions and times; no teleport to one central point.
- The outgoing heading then becomes the stored arrow heading. The incoming line and selected heading, not a surface normal, determine the two path pieces.
- If another authoritative event removes the ball/structure or changes relevant validity before contact, invalidate/recompute through the normal deterministic scheduler.
- A zero-duration corner touch or tangent that never enters the tile interior is not a qualifying residence.

Demonstrate this with reference-like near-centre paths and glancing paths before freezing the policy. If a different bounded interior-contact rule materially better matches the physical wedge, document and compare it; it must still guarantee the required valid paths are affected, retain continuous motion and pass the same determinism/resource criteria. Do not hide this product choice in renderer code.

### Important existing territorial constraint

The reviewed engine validates that a live ball occupies its owner's territory. Foreign boundary encounters are already reflected/captured through existing rules. Do not let a Deflector reach across that frontier, convert an enemy projectile, prevent normal captures or turn a ball that never entered its cell.

The first version therefore primarily routes the owner's balls within their actual territory. If ownership is lost, the provisional lifecycle in section 9 removes the structure. A neutral/hostile projectile-capture device would be another mechanic, not part of this request.

---

## 9. Explicit provisional gameplay and economy defaults

These defaults close unmade design choices for a testable candidate. They are **not production approval**. Record them in generated configuration and the final decision register, not hidden constants.

| Area | Provisional development policy |
|---|---|
| Name | Deflector; the payment action is Build deflector / Deflect & Pay. |
| Placement | One per currently payer-owned tile in an otherwise eligible active owned island; no free neutral/enemy claim. Not confined to a cannon's four adjacent cells. |
| Clearance | Apply the same minimum toroidal Chebyshev distance 4 from enemy territory as the combined Move/additional-Build policy. Recheck at processing. |
| Occupancy | Cannot share a tile with a cannon or another Deflector; cannot install underneath a ball currently occupying the target. Existing cannon placement/Move must also reject an occupied Deflector tile. |
| Identity | Canonical player/account ownership and stable ID/generation, independent of which cannon opened the UI. |
| Heading | Selected at construction and immutable in this first version. No extra rotate/move/sell interaction. |
| Anchoring | Does not anchor territory, rescue a dormant island, count as a cannon, include a free ball or alter cannon/ball pricing and limits. |
| Territory loss | Remove on loss of owner territory, clearing/pruning to neutral or player retirement; removal is authenticated and invalidates pending encounters. No automatic transfer of a working trap to an opponent. |
| Nearby enemy growth | Clearance is a purchase-time restriction, not an ongoing deletion halo. A pre-existing Deflector remains while its own tile remains owned. |
| Prototype price | `deflector_build_e8s = 10_000_000` (0.1 ICP), flat, for disposable testing only; no production price approved. The quote must read certified configuration. |
| Prototype caps | At most 16 per canonical player and 256 globally, independently bounded from cannon/ball caps; subject to measured feasibility and owner release approval. |
| Accounting | Existing retained-payment semantics; insufficient/invalid purchases reject deterministically, no invented refunds/credits. Repeat payments are distinct inputs, not deduped by memo text. |
| Expiry | No new periodic expiry/timer. Ownership loss and existing island lifecycle provide removal. |
| Sound | No new soundtrack or continuous effect. A redirect cue, if needed, reuses a short bounded neutral sound through the verified event budget, never the 'enemy hit our wall' cue. |
| War Cry | Not offered on Deflector placement: constructing a routing tile does not launch a ball. Existing FIRE/NEW War Cry stays unchanged. |

The owner should approve the final price/caps/lifecycle/contact policy before any activation. Do not spend real money to evaluate them. If a default violates an actual existing invariant, resolve the conflict explicitly in the candidate and decision report, rather than changing unrelated mechanics silently.

---

## 10. Authoritative physics, exact arithmetic and bounded work

This is the difficult engineering part, not an image-only change. Read `supporting/DEFLECTOR_ENGINE_NOTES.md` before coding it.

The reviewed geometry uses `x(t)=x0+vx*t`, `y(t)=y0+vy*t` with integer intercepts and rational boundary times. Axis-aligned reflection preserves that form. Arbitrary redirection at a fractional interior time generally does **not** preserve integer intercepts. A naïve `x0 = x(t) - newVx*t` followed by integer rounding can change position and invalidate replay.

### Required numeric design checkpoint

Before building the production candidate, document the trajectory/event representation and prove its bounds:

- Exact rational anchored state is a candidate, but show denominator growth and long-loop bounds, not merely that one event works.
- If a bounded fixed-point/versioned representation is needed, specify quantization, time ordering, maximum spatial error and cumulative behaviour explicitly; use identical JS/native integer arithmetic and prove the error bound. Do not silently convert old worlds to browser floats or round ad hoc.
- Preserve exact historical encodings/interpreters. A new state schema is acceptable only when required, explicit and migrated without losing old certified history.
- No-deflector scenarios under the new policy must preserve established gameplay, receipts and outcome semantics; any new internal encoding cannot be presented as byte-identical to the old encoding unless it really is.
- Never normalize outgoing velocity with platform-dependent trigonometry. Reuse the canonical heading/speed construction and document its quantized meaning.

Provide executable old/new parity vectors demonstrating position continuity to the chosen canonical precision, same outgoing heading from different entry sides, stable speed policy and no cosmetic-text influence on physics.

### Scheduling and tie handling

Add a real interior event candidate to the existing bounded scheduler; do not poll every Deflector or integrate every ball at render FPS.

Use a bounded cell→structure lookup. For a ball in a candidate cell, compare the interior event against ordinary boundary/strike/lifecycle candidates using canonical event-time ordering.

Pin equal-time rules. Preserve ordering among existing events; destruction or loss of structure validity must not resurrect a ball or apply a stale turn. Process surviving new simultaneous events in a canonical stable order. Track the structure generation and visit/encounter state so a removed/replaced object cannot own an old scheduled effect. Correctly handle toroidal nearest-image coordinates.

Build while a ball is in the target is rejected by the provisional policy; do not retroactively arm a contact for an already traversing ball. A same-time ball entry and payment must follow the documented event ordering, not callback arrival order.

### Loops and denial-of-service safety

One trigger per residence is necessary but does not, by itself, prove safety against arbitrarily short grazing/re-entry cycles. Deliberately search two-device loops, corner grazing, reverse headings, nearby solid cannons and boundary-reflection loops for zero-time or geometrically shrinking event sequences.

Require a progress/resource proof. If geometry alone cannot provide it, introduce a small explicit **simulated-distance/time rearm rule** in the new candidate configuration and document which re-entries it affects. This is a proposed gameplay safeguard that needs product review, not permission to discard events silently. Do not use browser/host wall time, arbitrary frame delay, a silent event quota that drops real turns, or delete stuck balls as a shortcut.

The ordinary scheduler must remain resumable with bounded work per message. Hitting a processing budget persists an exact continuation and progresses on later messages; it must not starve unrelated source ingestion or silently change physics. Enforce structural/numeric caps before accepting paid construction that cannot be supported.

A deterministic loop can still consume cycles. Measure a deliberately adversarial loop, identify a sustainable cap/rate and report it separately from rendering improvements. No full new game-balance or pricing assurance can be inferred from a single demo path.

### Authenticated state/events

Define bounded sorted Deflector state, next ID, canonical owner, cell, heading and any necessary generation/encounter metadata. Include exact creation/removal/redirect semantics in canonical outputs.

A redirect event must identify the ball, Deflector/generation, time, canonical contact position, incoming and outgoing motion state, and sufficient authenticated information for normal replay/presentation. Use existing event/state conventions rather than duplicating entire worlds.

Update native execution, JS replay, validators, checkpoint/durable cursor recovery, animation projection, observer, source fixtures and hash construction together. A renderer-only kink is not implementation.

---

## 11. Payment protocol and versioned capability

Implement a distinct command in a new versioned adapter/rules identity. Do not overload NEW so an old backend might build a cannon instead of a Deflector.

Recommended candidate text grammar: **`DEFLECT <cell> <angle>`**. This is a proposal for the supporting new backend, not a current production command. Keep one canonical renderer/parser in JS and Rust, exact integer validation and the current degree/heading convention.

The worst ordinary text shape `DEFLECT 999999 359.99` is comfortably inside the current 32-byte memo budget. Measure actual emitted bytes and test boundaries; do not change the Ledger limit or infer arbitrary-length support. No quantity field or War Cry suffix is needed for this action. Legacy numeric/binary and all old text memos retain their exact historical meanings.

The transaction's actual canonical funding account owns the purchase. Local selected cannon/declared account is not authority. Enforce ownership, active-island eligibility, occupancy, clearance, caps, price and available storage at processing time. The browser mirrors legality for preparation but cannot enforce the game by itself.

Define stable rejection reasons and receipts, including target captured, occupied, too close to enemy, capacity, invalid heading/memo and insufficient payment. Reject invalid actions before partially creating structure state. Existing excess/unused-payment semantics remain retained; no refund mechanism is introduced.

A supporting certified configuration must bind the new opcode/adapter, price, limits, contact model, rearm rules, schema and capability. Exact configuration identity—not a local toggle—enables the new toolbar action, quote and decoder. Under Rules7/11 without Deflector support, keep ordinary memos and no unsupported action copying.

Include capability identity in frozen quote comparison. An epoch change invalidates copied proposals even where visible price/memo text happens to be unchanged. Preserve exact recipient, amount, payer, command and text for Update/Keep. Do not invent transaction-index entry or payment-submission APIs.

### Successor composition

Develop a distinct successor to **combined Rules11** so clearance and War Cry are retained. Reserve the next available identity after checking current work; do not assume Rules12 is free or reuse an existing hash. Do not fork back to plain Rules7 gameplay or lose clearance while adding Deflectors.

The intended cutover is from the actually approved combined predecessor. If the active backend is still Rules7, do not silently replace the separately reviewed Rules11 maintenance plan with a direct experimental migration. Qualify an explicit route and present it for later approval. Existing transitions and old decoders remain preserved.

Test empty-structure migration, existing player/cannon/ball/territory state, source/admission/retirement cursors, accounting, pending inputs and replay. Any schema extension and irreversible old-module compatibility boundary must be stated accurately, including whether preparation alone writes an incompatible durable field.

No mainnet pause, upgrade, prepare, commit or resume is authorized by this brief.

---

## 12. Presentation, verified motion and interaction of the new structure

Only applied authenticated events create/remove real Deflectors and turn real balls. Use the existing verified animation interval; no frontend extrapolation into future gameplay.

Render the incoming path up to the canonical contact, then the new outgoing track. The ball position is continuous to the agreed canonical precision. The existing white trail must form a clean kink rather than a long straight chord through the bend, teleporting flare or duplicate ball. Bound additional trail vertices and ageing.

A redirect does not count as a new launch, purchase success, territory capture or wall hit. Do not fire War Cry again or play friendly/enemy wall feedback solely because direction changed. A small distinct neutral redirect cue is optional and must retain existing event-time provenance, spatial attenuation and voice budgets.

Follow-ball camera tracks displayed verified positions through turns and wrap boundaries without zoom changes, snapping, duplicate displacement or replay reset. A nonblocking pending preview never influences that camera.

Selection and picking map to canonical structure identity/cell, including across wraps and visual LODs. Enemy structures can be inspected but not edited. No extra floor halo on every unselected structure; the examples use selection outlines for clarity, not a requirement to make the whole board glow.

The new art may have larger silhouettes than the current cannon. Re-evaluate arrow occlusion, pointer aim zones, contact shadows, panel anchoring, speech-bubble avoidance, quantity/War Cry dock and sound occlusion using actual rendered bounds. Maintain cached layout measurement and gesture ownership; do not introduce frame-by-frame DOM probing.

---

## 13. Test plan and acceptance evidence

Add meaningful failing regressions before fixing source defects where feasible. Keep historical failures and exact commits. The supporting CSV is a minimum checklist, not permission to replace existing tests.

### Visual and layout

Capture matched populated actual application views: old/new cannon at real game scale, selected/hover/dormant/preview; Deflector at 8 representative headings and non-cardinal examples; square footprint proof at seams and adjacent pieces; mixed ownership colours; close/medium/wide zoom; new six-button toolbar; Fire/Move/Build/Deflect cards; and genuine viewport contraction.

Use 1440×900, 390×844 and 320×640, DPR variants, landscape, safe insets, reduced motion/transparency and supported forced colours/text zoom. Preserve the exact cell-zero/camera `[3.6575453715563526, 3.6575453715563526, 64]` / screen heading 347.15° quantity regression and sweep adjacent/full headings. If new layout changes legitimate dimensions, measure usability, target bounds and reachability rather than loosening 'must remain visible'.

Require the same panel divider/Copy axes within 1 CSS pixel, plain text fields, full-value clipboard fallback and zero status-only panel drift. Actual mobile touch/keyboard/IME/cancellation must keep both quantity and War Cry available where supported. The new action does not show those launch-only editors.

Generated reference images are not final application evidence. Provide real screenshots and short clips from the executable candidate, side-by-side with the unchanged references. Preserve their original hashes.

### Physics/protocol

Test entries from every side and corner region, shallow angles, exact tangency, zero-length touches, aligned/reverse/diagonal outgoing headings, both seams, simultaneous balls, removal before contact, ownership loss at contact, chain A→B→C, A↔B loops and pathological re-entry searches. Different entry paths to the same Deflector must have distinct valid contact points but the same chosen outgoing heading.

Verify unchanged ball count/owner/speed policy and no centre snap; canonical representation bounds; state/event/receipt parity; durable every-work-unit interruption; same batch build/capture/rejection ordering; capacity boundaries; and no silent overflow/deadlock/starvation.

Check every old rules/adapter fixture remains unchanged under its original identity. Deflector metadata cannot alter old War Cry parsing, cosmetic seed projection, FIRST JOIN, pricing, audio or territory-anchor lifecycle.

### Installed authenticated scenario

Use pinned official valueless Ledger/Index transactions on disposable infrastructure to buy Deflectors and exercise actual world changes, not a direct debug build endpoint disguised as gameplay.

Prove source ingestion, positive/negative purchase receipts, independent JS/native replay, certificate/epoch/artifact verification, two observers seeing the same redirect position/heading/time, source/cursor recovery, old-history compatibility and state-preserving upgrade from the intended predecessor. Include unsafe nearby-enemy placement, foreign payer, occupied site, no capacity, malformed memo and post-preparation ownership change.

Use fixtures for geometry that real disposable setup cannot economically reach, but identify them clearly; at least one chain and one real installed redirect must traverse the full authoritative path. No real mainnet payment or event injection into a production claim.

### UI workflow

Test Build deflector discovery, stable six-icon toolbar, no-legal-site disabled state, eligible-tile hover, default selection, broad/arrow aiming, keyboard heading, pan/pinch ownership, payer changes, frozen packets, cancelled action, offscreen Locate and unavailable backend capability.

Test a new user still joins through a cannon; a returning player still reaches owned territory; inspection never invents ownership; selecting a Deflector never launches a ball or opens invalid cannon controls.

### Performance

Measure matched renderer-only old/new scenes separately from authoritative new-rule costs. Include legal game limits, bounded synthetic dense render scenes, adversarial Deflector loops, reconnect/context restore, muted/enabled audio controls and idle periods. Report actual draw calls and allocations, not just an artist's polygon estimate. Do not report synthetic high counts as a change to certified limits.

Hardware unavailable is a limitation, not a performance pass. Preserve P09 FAIL/unqualified and BFCache/mixed-module interruption limitations unless their original cases are genuinely cleared.

---

## 14. Implementation sequence and output boundaries

Proceed without requesting routine intermediate approvals, but do not cross a production authority boundary.

**A — Baseline and protected work:** reconcile the ongoing frontend80/Rules11 tasks, create an isolated worktree, read exact source/specs, save comparable reference poses and performance baselines.

**B — Visual family:** implement shared palette/tokens, canonical cannon and Deflector meshes, tile alignment, previews and LOD. Demonstrate real-scale readability before adding ornament. Make the theme usable on current supported rules with the new unsupported purchase hidden.

**C — Interaction:** theme the existing HUD, add the direct Deflector icon and capability-gated placement/aim workflow using controlled supporting fixtures. Preserve the read-only card contract and editor regressions.

**D — Deterministic design:** complete the numeric/progress/resource design checkpoint, define versioned candidate policy and command, implement JS/native state/events/source/observer support and explicit migration. Implement the provisional economy/limits as certified candidate configuration.

**E — End to end:** disposable payments, contact/loop tests, independent replay, dual browsers, UI/clipboard/capability cases and performance measurements. Correct actual defects; do not weaken meaningful existing gates.

**F — Freeze and qualify:** clean final source, exact frontend inventory, exact normal backend Wasm, generated rules/config/schema/source identities, all six substantive hosted gates and added Deflector-specific installed tests. Preserve exact artifact provenance; different local/hosted Wasm hashes are not interchangeable.

**G — Deliver:** no deployment. Return two clear releases: (1) independently qualified visual/frontend improvements compatible with current verified rules, without pretending Deflectors are active; (2) complete new-capability candidate and compatible frontend plus a separately approvable upgrade/cutover/recovery plan. Freezing an artifact is not activation.

Do not slow the existing authorised frontend compatibility rollout by bundling this new mechanic into it. Do not silently overwrite another task's qualified assets. Publish reviewed source/evidence normally without force-pushing shared history.

---

## 15. Documentation, final report and definition of done

Update `docs/specs/B2Z_HUMAN_EXPERIENCE.md` and add maintained visual/Deflector specifications (for example `B2Z_VISUAL_SYSTEM.md`, `B2Z_DEFLECTORS.md`). Update canonical memo/payment, deterministic geometry, animation projection, source cutover, renderer limits and operator documentation as affected. Cross-reference old versions without rewriting historical evidence.

Use a consolidated evidence directory such as `evidence/B2Z/graphite-deflectors/` containing:

- `REPORT.md`: actual starting/deployed identities, completed changes, test matrix, measurements, failures and honest limitations.
- `GALLERY.md`: real application desktop/mobile captures, selected/preview model comparisons, player colours, new toolbar, exact critical pose, authenticated redirect chain and turn trail.
- `DECISIONS.md`: approved requirements versus provisional price/caps/placement/lifecycle/contact/rearm choices, measured tradeoffs and what needs owner approval.
- `RELEASE_DECISIONS.md`: separate frontend-only release, future compatible frontend, exact backend artifact, intended predecessor, migration boundary and forward recovery. No production authorisation implied.
- Frozen full inventories, source-input provenance, rule/config/schema hashes, normal Wasm hash, JS/native parity outputs, installed wire/replay/certificate results and CI job conclusions.

The existing six gates remain Source, Native, Packaged DTR/clean consumers, Runtime-lab Wasm, Browser HTTP/Web Crypto and S14/million-cell installed-IC. The production inventory job is informational. Old green runs cannot qualify new runtime or physics; tests for the new feature are additional, not substitutes.

**Definition of done:** the approved graphite/player-colour design is recognisable in the real game at ordinary scale, structures fit and align with their canonical tiles, the UI retains its compact safe payment contract, and there is one obvious new Deflector action. A fully supporting disposable game accepts its canonical payment, creates the correct structure and deterministically turns actual balls at path-dependent interior contact points toward the stored heading, with independent authenticated replay and bounded cost. Clearance and War Cry remain intact; no paid production state or pending rollout has been touched.

If a numerical, gameplay or performance proof remains unresolved, report the exact failed contract and retain the visual work as a separate candidate. Do not conceal it with attractive screenshots, a frontend-only turn, arbitrary rounding or silent event dropping. Do not declare a mechanic production-ready because its art or unit tests are finished.

Final response: separate **visual/frontend**, **new authoritative Deflector capability**, **performance evidence**, **unresolved candidate-policy choices**, and **later approvals**. Provide exact source/artifact identities and actual application evidence, not a list of intentions.
