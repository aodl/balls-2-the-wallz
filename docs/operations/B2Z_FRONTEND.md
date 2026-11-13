# B2Z frontend maintenance

The single normative UI contract is [B2Z_HUMAN_EXPERIENCE](../specs/B2Z_HUMAN_EXPERIENCE.md).
Name affected UX IDs for control, flow, status, handoff, renderer or lifecycle
changes. Update intentional policy and run its mapped regressions. Keep the
[installed-game release procedure](S14_OPERATOR.md) separate from fresh-install history.

Maintained sources are `apps/b2z-observer`: `app.mjs` verifies/queues observations;
`observation-loop.mjs` schedules bounded work independently of rendering;
`experience-status.mjs` resolves producer/delivery/presentation facts;
`arcade.mjs` owns the single local composer and anchored action card; `handoff.mjs` scopes saved public
instructions; `identity.mjs` validates account formats and derives the receiving
account; `camera.mjs` supplies the invertible ground-plane projection;
`render.mjs` uses locally bundled pinned Three.js and shared bounded instances;
`terrain.mjs` preserves compact ownership geography; `terrain-surface.mjs` keeps
one persistent exact ownership atlas with bounded dirty-row uploads, also used by
`minimap.mjs`; `headings.mjs` converts screen bearings to unchanged canonical
headings; `public-cycles.mjs` independently queries public management status and
labels observed net decline separately from idle allocation cost; `motion-effects.mjs` derives
cosmetics only from displayed displacement. Canonical rules/quotes remain in the
existing maintained kernel/helpers, not the renderer.

Ordinary live gameplay has no pause/restart/replay/recording controls. Explicit
local/replay diagnostics in `replay-tools.mjs` are exposed only for null or
`pocketic-local` deployment, through `__b2zTools`; they manipulate local observation
or replay, never issue canister updates. HTTP/browser and installed-canister
harnesses exercise that boundary separately from the ordinary game controls.

Use `npm ci --ignore-scripts`; dependency versions and integrity are locked. No
runtime CDN, vendored runtime edit, signing client or backend update belongs here.
The existing frozen builder bundles normal source and emits complete provenance.
Never hand-edit the generated bundle. The older served frontend is rollback data,
not another selectable interface.

`tools/verify_playability_actions.py` uses actual composer/renderer modules with
synthetic canonical kernel fixtures on loopback HTTP. Its recordings are not IC
certificate or physical-device evidence. `tools/verify_observer_http.py` exercises
actual Web Crypto/CSP and fail-closed transport; `tools/verify_s14_local.py` supplies
the named genuine disposable installed-IC/financial evidence. Keep these claims
separate. Production smoke is read-only and must preserve paid backend identity.

Tactical polish preserves those contracts. Shared `interaction.mjs` resolves hover
and activation from displayed wrapped pieces/current canonical eligibility;
`minimap-projection.mjs` supplies diamond projection/inversion;
`warm-return.mjs` selects a recent point only within retained verified coverage.
`bounded-observation.mjs` adds scoped finite SDK fetch deadlines to the existing
read-only query ABI, with unchanged DTR verification/root policy. Local cursors
are copied and hashed by the established wrapper builder. Any intentional visual
change needs populated before/after evidence; use `verify_tactical_browser.py`
for actual renderer/interaction capture and `verify_tactical_grid.py` for shader
pixel comparisons. `verify_warm_browser.py` requires actual tab visibility
transitions and records unsupported headless environments as BLOCKED, separate
from controlled hidden scheduling. It never spoofs OS hiding.
Each frontend publication requires release-specific production approval.

The fluid-player candidate keeps one `camera-controller.mjs` beside geometric
`Camera`; `player-anchor.mjs` caches compact toroidal territory centres and
`ball-presentation.mjs` shares displayed-only positions. One icon toolbar expands
one instrument section with a principal/text-only handoff. Legacy history stays
valid internally. The UI same-cell Move guard is not a backend rule. Run the
fluid controlled-frame and populated browser regressions before freezing. The current ordinary release and retained tactical rollback assets are identified
in the [deployment record](../../evidence/B2Z/fluid-player-experience/REPORT.md);
future publication still requires release-specific authority.

Elastic verified playback retains a complete recent interval in the existing bounded
queue while hidden. Same-head returns retain the unconsumed remainder. Cadence is
advisory and only distinct advancing authenticated heads count. The external
presentation factor is 0.5–1.5× supported pace; the pinned clock remains the verified
endpoint ceiling. See UX-04/05/06 and `tests/js/elastic-playback.test.mjs`.
Never quote from the intentionally delayed presentation or treat a copied packet
as a receipt. Controlled return fixtures are not genuine hidden-tab evidence.

The optional financial feature remains separate. Its source-qualified disposable
results do not replace [genuine II acceptance](B2Z_II_ACCEPTANCE.md) or authorize
any new route, origin metadata, backend activation, allowance or transfer.

The player-refinement continuation captures immutable canonical placement targets
before any double-click delay, accumulates discrete camera destinations, and
keeps the toolbar fixed above one usable scroll surface. Review the maintained
UXR-01..25 matrix and run `verify_refinement_browser.py`, existing fluid/payment
and authenticated-observer checks. Visual evidence must include awkward populated
layouts and actual supported slow pace; software DPR/SwiftShader is not physical
hardware coverage. This new candidate requires its own six-gate qualification and
separate production decision; do not deploy it as a documentation follow-up.

The [player-refinement candidate record](../../evidence/B2Z/player-experience-refinement/REPORT.md)
contains all 25 dispositions, exact frozen bytes, executed commands, populated
media, software performance limits and the still-required hosted qualification.
Do not substitute it for the currently deployed ordinary asset set.

Payment-layout qualification waits for correct natural-content/body targets, committed
layout work, completed camera/body transitions and four stable frames before
scrolling exact values. A completed animation with a stale target is not settled.
Run `tools/verify_panel_geometry.py --output .work/panel-geometry --video` for the
same-world Fire/Move/Build readiness matrix (desktop/mobile/contracted/reduced
motion). It samples every transition frame, exact wallet strings, copy gating,
scroll/camera/clock identity and pending layout work without invoking layout internals.
The shared `settled_panel()` helper observes ordinary frames; never replace it with
a fixed sleep or weaken the 1px geometry check. Content mutations must invalidate
natural-size caches even when hide/show yields no ResizeObserver size delta.
Disabled/ARIA readiness writes must not cause an action-content layout transition.


Final visual closeout must also run `tools/verify_visual_closeout.py` against the
maintained populated fixture. Preserve the canonical-target, fixed-toolbar and
payment-scrollport regressions. Review Build source/preview visibility at multiple
sites and keyboard-contracted viewports, filled ghost material, mouse/keyboard/touch
hint modality, and matched terrain/object captures. My-cannon navigation is suppressed
only while a visible selected-cannon context makes it redundant, and restores on
Close. No UI/material adjustment qualifies a backend upgrade or production deployment.


Camera ownership assertions must distinguish entry composition from captured input.
Before comparing a stationary aiming gesture, use the existing finite
`settled_panel()` predicate (camera plus actual panel transitions), not a fixed
sleep or an early pose. `player_playability_browser.py` also holds a real camera
transition to prove this wait, and separately asserts that native aim pointer-down
cancels an active transition and the camera stays at that captured pose. Keep both
assertions and exact memo checks; waiting for entry is not permission to weaken
direct-manipulation ownership or change playback.

Installed-browser qualification distinguishes immediate historical startup from
steady motion with the existing presentation reserve. Wait on observed verified
coverage (`clock target - publication interval`) before the unchanged sustained
rate/zero-stall trace; record acquisition separately. Native aim changes its memo
synchronously, while `__b2zExperience.composer` is a 100ms diagnostic snapshot:
wait for the snapshot before exact-angle assertions. Shared canonical-cell helpers
must settle Home navigation, check the actual DOM hit target and use the existing
keyboard path for an occluded tile, preserving the requested cell. Configuration
HTTP unavailability must recover on the same page; configuration-hash and certificate
failures must remain hard errors with disabled copying.
