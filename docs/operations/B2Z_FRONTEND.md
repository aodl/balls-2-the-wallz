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
pixel comparisons. `verify_warm_browser.py` separates real browser suspension
from controlled hidden scheduling and never claims headless visibility as OS hiding.
Do not deploy this next candidate without new release-specific approval.
