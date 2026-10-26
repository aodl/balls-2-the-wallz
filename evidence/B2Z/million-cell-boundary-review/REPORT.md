# B2Z bounded visual review

The approved visual candidate required one rendering correction: 50,000 isolated
ownership modifications produced 200,000 cached edges, all visited on every frame
before viewport filtering. Desktop/mobile overview renderer p95 was 64.0/73.7 ms.

Only production `render.mjs` changes in this correction. Fixed spatial bins select
close-view boundaries; one viewport overlay avoids repeating unchanged paths.
Overview uses one fixed 2,000×2,000 boundary raster with exact integer ownership
edges, including both halves of toroidal seams. There is no ownership expansion
or per-frame million-cell iteration. Opaque territory, piece dimensions, tails,
trajectories, camera controls and authoritative data remain unchanged.

| Viewport | Changes | Zoom | Renderer p95 before → after | Frame interval p95 after | Pan p95 |
|---|---:|---|---:|---:|---:|
| 1440 | 10,000 | overview | 16.9 → 0.6 ms | 16.8 ms | 0.3 ms |
| 1440 | 10,000 | close | 0.8 → 0.2 ms | 16.7 ms | 3.3 ms |
| 1440 | 50,000 | overview | 64.0 → 0.4 ms | 16.7 ms | 0.4 ms |
| 1440 | 50,000 | close | 4.0 → 0.2 ms | 16.8 ms | 3.7 ms |
| 390 | 10,000 | overview | 16.4 → 0.5 ms | 16.8 ms | 0.3 ms |
| 390 | 10,000 | close | 0.6 → 0.2 ms | 16.7 ms | 1.0 ms |
| 390 | 50,000 | overview | 73.7 → 0.5 ms | 16.8 ms | 0.3 ms |
| 390 | 50,000 | close | 4.3 → 0.2 ms | 16.7 ms | 1.3 ms |

All eight focused stress scenarios passed. Stationary frames and overview panning
visit zero edges. At 50k modifications, close-view panning visits about 395
candidates/frame on desktop and 199 on mobile, versus 200,000 previously.

Costs remain visible: cold cache builds take 111–450 ms across the tested scenes.
Changed ownership invalidates those caches; this is not a promise of hitch-free
rebuilds at arbitrary publication frequency. Retained JS heap after GC is about
3.9 MB at 10k / 15.4 MB at 50k. Overview raster backing is 20.0 MB including the
opaque territory raster; close raster backing is 9.18 MB desktop / 5.32 MB mobile
at DPR 1. Visiting both zoom paths retains at most both fixed rasters plus one
viewport overlay (25.18 MB desktop / 21.32 MB mobile at DPR 1), not an accumulating
camera-history cache. CDP sampling and raw memory records are included. JS heap
and explicit bitmap bytes do not measure total browser RSS/GPU storage.

The 10k fixture modifies 13,334 cells and encodes to 398,412 bytes. The 50k fixture
modifies 66,667 cells and encodes to 1,988,916 bytes, exceeding the production wire
cap. It is a requested rendering stress, not a claim of authenticated admissible
production state. Measurements use sandboxed headless Chromium on this Linux
host at 1440×900 and 390×844; mobile viewport results are not mobile hardware results.

Fresh IC-root v8 PLAYING captures and local test results are linked in `index.html`
and `verification.json`. Original approved before/after evidence remains under
`../million-cell-visuals/`. All screenshots of live gameplay use genuine certified
and interpolated state, with no substituted pieces or trajectories.

The correction needs its own successful exact-commit CI before deployment.
Run 40381316962 applies only to the approved parent cefa6983. No unchanged repush
or mainnet mutation was performed. The guarded asset-only plan is prepared in
`FRONTEND_RELEASE.md`; execution requires separate deployment approval.
