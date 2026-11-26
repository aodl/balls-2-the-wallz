# Graphite visual system

The graphite system follows six original owner references under
[evidence](../../evidence/B2Z/graphite-deflectors/reference/REFERENCE_GUIDE.md).
The references describe the graphite design lineage. The current product uses
the [human experience contract](B2Z_HUMAN_EXPERIENCE.md), including aligned
wallet handoff and the optional Rules18 Pay controls. Later mesh and lifecycle
refinements are in the maintained observer source.

`theme.mjs` owns presentation contrast adjustment. Canonical account/territory
palette assignment is unchanged. Real structures resolve their canonical owner;
the pane resolves the declared payer, never an inspected enemy. Unknown payer
uses neutral. Luminous accent is lightened only as needed to reach4.5:1 against
#20282b; main text remains off-white, and risk information remains calm blue.
Theme changes dispatch one event when the account changes, without per-poll DOM
measurement, packet mutation or world/clock reset. Forced colours and reduced
transparency retain readable outlines and opaque surfaces.

`structure-geometry.mjs` authors original indexed/flattened procedural geometry,
with no external textures. Each family uses two shared opaque instanced batches:
fixed base and rotating upper, plus the existing shared inexpensive shadow path.
A vertex mask tints only authored light strips. There is no player-specific
material, point light, bloom, shadow map or postprocess. The final merged buffers use indexed vertices while retaining hard armour-plane
normals and light-mask boundaries. Cannon vertices are369 rather than780;
Deflector vertices are226 rather than348. Structure transforms/colours are cached
against camera/entity/heading/palette identity, with context-restore invalidation.
Animation-only frames do not upload unchanged body instances. The contrast cache
is bounded to1024 hues; account input cannot grow it without limit.

The cannon has260 triangles:84 fixed base and176 upper. Its base spans.84 tile;
the upper radius is below.43 tile, height below.45. The substantial barrel,
armoured collar, dark recessed muzzle and thin rim belong to the same rotating
upper. The Deflector has116 triangles (84+32), slightly above the initial40–100
illustrative target; the shared chamfered plate and edge strips explain the cost.
Its base spans.88 tile and upper radius is below.42. Full65536-heading tests and
analytic radial bounds keep both upper assemblies within a canonical cell.
Bases never rotate. Real/selected/provisional cannon geometry is shared.

Physical models are never enlarged at far zoom. A separate cheap owner-colour
marker aids distant cannon readability. Capacity overflow throws a visible
renderer failure rather than silently dropping authoritative objects. Existing
DPR/pixel budgets, culling, guide depth, context loss/restore and editor reservations
remain. Rendering a Deflector in an explicitly synthetic art fixture is not
proof of a supported source identity, paid construction or authenticated turn.
The current verified Rules7/11 observer does not admit Deflector state.

Affected UX contracts are UX-02/03/07/08/10/11/12/13 and quantity availability.
Run `graphite-structures.test.mjs`, existing financial/editor tests,
`verify_quantity_browser.py`, `verify_refinement_browser.py` and actual shared-panel
browser qualification. `verify_graphite_browser.py` provides synthetic render-only
turntables/populations and measured calls/triangles/update timing. Keep timings
separate from installed backend cycle cost and physical GPU qualification.

### Machined cannon refinement

The cannon keeps its fixed square plate, rotating hull, short barrel and
authored muzzle. Existing cap, collar and top-bevel faces receive neutral
pale graphite trim. The dark octagonal hull and bore retain their silhouette.
Four near-black hex heads are stamped flush into the fixed plate corners.
They use 24 small coplanar-with-each-other triangles on a plane just above the
mounting deck. Existing owner light slits are shorter and the masked muzzle
ring remains independent of the neutral trim and selection lift. The revised
cannon uses 284 triangles and 397 indexed vertices in the same two batches.
The Deflector geometry is unchanged.

## Prelaunch satin finish

Terrain keeps its existing geometry, ownership palette, seams and grid. A
shared, view-relative satin accent uses the tile relief level of detail so
that the overview stays quiet. The reserved Reservoir water and its atlas
retain their established rendering. Cannons and Diverters retain their exact
procedural meshes and accent masks. A single analytic highlight is stronger
on metal trim than graphite armour. The finish uses no new texture, per-object
light, reflection pass or terrain draw call.
