# Source and research basis

Prepared 16 November 2026. These are read-only observations and proposed design guidance, not deployment verification or production authorization. Recheck the actual checkout and installed identities; the owner's separate frontend80 operation may be in progress.

## Supplied visual sources

The six images in `reference/` were directly inspected from the available conversation files. The owner selected the refined armoured cannon and the square-mounted wedge, then approved the unified graphite/player-colour HUD direction. The final panel structure was separately approved before the material concept. `REFERENCE_GUIDE.md` resolves these two roles without pretending a generative mockup has accurate geometry/physics or is a rendered product capture.

## Repository sources inspected

Repository: https://github.com/aodl/balls-2-the-wallz
Pinned combined-development reference inspected: `0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20`.

- Branch collection read: release `6afe3b2fc2426887f905259312f5c090ed7dc7ab`; combined feature `0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20`; experimental ICRC-2 remains separate. This does not establish current served bytes.
- `apps/b2z-observer/render.mjs`: already creates shared `InstancedMesh` batches; uses an 8-sided base, 12×8 sphere turret, 10-sided barrel; shared ghost/selection parts; hemisphere/directional scene lighting; simple ground shadows; explicit low-power/pixel/DPR budgets and context-loss handling. Cannon geometry is currently spread across part batches; adding per-object meshes would be a regression, not an optimization.
- `packages/kernels/b2z/geometry.mjs`: integer-intercept trajectories, rational next-cell-crossing times and integer-intercept-preserving axis reflections. Interior arbitrary-heading changes need a numeric representation decision.
- `packages/kernels/b2z/world.mjs` (ball/state validation): live balls must occupy their canonical player's territory; x0/y0 are bounded `bigint` intercepts; canonical positions must agree with cell bounds. The new structure must not casually invalidate those invariants or historical schema.
- `docs/specs/B2Z_WAR_CRY.md`: exact shared panel axes, five-character summaries, 44px buttons, full canonical copying, read-only values, capability-gated grammar, complete 32-byte UTF-8 memo, pending launch association, safe bounded speech, and measured joint-editor fallback. These are contracts to preserve.

Pinned links:

https://github.com/aodl/balls-2-the-wallz/blob/0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20/apps/b2z-observer/render.mjs
https://github.com/aodl/balls-2-the-wallz/blob/0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20/packages/kernels/b2z/geometry.mjs
https://github.com/aodl/balls-2-the-wallz/blob/0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20/packages/kernels/b2z/world.mjs
https://github.com/aodl/balls-2-the-wallz/blob/0cd29d5fcb84cda4ebcfc6e132e31d522ce77f20/docs/specs/B2Z_WAR_CRY.md

The Deflector itself is not present in these inspected sources. Its opcode, state, interior-contact scheduling, economics and lifecycle in this package are proposed implementation work, not claims about existing code.

## Primary public technical references consulted

1. Three.js `InstancedMesh` documentation: intended for repeated geometry/material with per-instance transforms and colours, reducing draw calls relative to separate mesh draws. Use the repository-pinned version, not an unsolicited update.
   https://threejs.org/docs/pages/InstancedMesh.html
2. Three.js manual, Optimize Lots of Objects: batching compatible geometry and using vertex colours can reduce object/draw overhead. A visually simple object still needs measurement; merging into multiple material groups is not proof of one draw.
   https://threejs.org/manual/pages/optimize-lots-of-objects.html
3. W3C WCAG 2.2 / non-text contrast and use-of-colour explanations: colour alone should not carry essential state; meaningful graphical controls need sufficient contrast. The project-specific brief retains 44px targets and tests adjacent colour combinations, not just sample lime.
   https://www.w3.org/TR/2023/REC-WCAG22-20231005/
   https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
   https://www.w3.org/WAI/WCAG20/Understanding/use-of-color.html

No claimed renderer performance improvement has been measured for the proposed art. Triangle/batch figures are initial engineering targets. No real production Deflector price, physics outcome or maintenance cutover has been approved or tested by this package.
