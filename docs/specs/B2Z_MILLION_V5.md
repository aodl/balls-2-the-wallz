# B2Z million-cell world (v5)

This specification describes the versioned successor to the paid v4 32×32
torus. It does not modify the v3 or v4 identities, artifacts, seals, prices,
source account, or payment grammar.

## Identity and dimensions

The v5 authoritative world is a 1000×1000 torus containing exactly 1,000,000
independently addressable cells. Its rules, state schema, and configuration have
new hashes. Ball coordinates remain exact fixed-point values, but v4 positions
and velocities are scaled by 1000/32 at the checkpoint so motion retains its
relative size and remains visible.

## Compact ownership

V5 state stores the authenticated v4 32×32 ownership grid as a compact base.
Each base cell expands to its exact proportional rectangle under integer axis
partitioning. A sorted, non-overlapping range map records later cell changes,
and sorted per-owner totals make area scoring independent of full-board scans.
Every cell can be read and changed independently; the compact base is not a
smaller simulation hidden behind a large renderer.

Ordinary captures use resumable compact range sets. A local boundary hit can
finish without scanning a scaled territory when all defender seeds remain in
one component. A genuinely large severance remains bounded and resumable, with
deterministic output across work budgets. V5 spawn searches use a fixed,
deterministic candidate budget rather than scanning one million cells.

## Migration and scoring

The v4 base is expanded without moving ownership across an old toroidal seam,
so adjacency through both old seams is preserved. Cannons map to the centre of
their expanded base region. Balls map by exact toroidal position and scaled
velocity. Accounts, credits, received ICP, scores, headings, ball identities,
source progress, and treasury state are preserved exactly.

Previously earned scores are never multiplied. Future v5 area-time accrual is
normalized by `1024 / 1_000_000`, retaining the v4 full-arena scoring scale
under the new rules identity.

## Authenticated cutover

The controller API accepts no replacement state, identity, Ledger height, or
source cursor. `prepare_million_transition()` establishes a fresh exclusive
Ledger tip and waits for the official Index global watermark. Account history
strictly below the fence is paginated and admitted under v4. Newer transfers
remain for v5. Old inputs, host stages, and transient world strikes must drain
before `commit_million_transition(expected_previous_manifest)` derives v5 from
the actual committed state.

The commit uses DTR's generic subsequent-epoch operation and publishes v8. It
keeps the original v6 publications and v7 epoch interpretation intact while
authenticating the bounded predecessor summary and new state. An exact retry
returns the committed result; a stale manifest or different retry fails.

The implementation depends on DTR 0.14 multi-epoch support. B2Z must not replace
its published DTR 0.13 pins until the reviewed DTR commit and package are
published at immutable references and their hashes can be locked reproducibly.

## Presentation

The observer verifies the v5 identity and compact ownership before display. It
draws base and changed ownership ranges at low detail, culls exact cells to the
viewport at high detail, invalidates changed ranges incrementally, and derives
the minimap from compact rectangles. Fresh sessions focus an active cannon;
cell picking remains exact when zoomed in. Wrapped copies never change entity
counts or game state.
