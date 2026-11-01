# V6 island metadata and presentation — development PASS

Authoritative action events now carry compact island/player/lifecycle deltas.
New placement includes its exact ownership operations; defended captures include
both pair IDs and rational positions. Completion facts stamp the corresponding
per-action lifecycle rows as well as the retained current grace fences. Rust and
JS state/event/score outputs agree after these additions; only unpublished v6
fixtures changed.

The observer can project v6 segments and apply those facts to the existing view.
It verifies final ownership, funding-account bindings, lifecycle and strike state.
Territory, ball and cannon IDs use separate colour lookup domains, all resolving
to canonical authenticated funding accounts. Terrain-cache identity includes
player/island mappings. A synthetic open presentation reveals a new player
without replacing the page or changing its camera. Mutual-elimination effects
use the certified positions, shortest toroidal connection and reduced-motion
preference. No browser hit detection or simulation authority is introduced.

All source checks PASS: 1,547 JS tests and 185 Python tests, historical fixtures,
naming, source and docs. The 13 affected Rust tests pass, including 14 complete
cross-language segment cases; strict Clippy and formatting pass. Ninety-five
focused new/legacy presentation tests pass, including 31 new v6 cases. The earlier
full native workspace at the parent interpreter stage passed 45 tests.

The existing sandboxed HTTP/browser recording check passes 14 checks with native
Web Crypto and production CSP. Its exact bundle and scope are recorded in
`checks.json`: it is not live v6 IC authentication, a deployed frontend or the
required installed lifecycle rehearsal. Minor boundary/query-caching edits after
that bundle are covered by current source/Node checks; final release browser
qualification remains pending. Original failed new-validator logs remain retained.

Production was queried only at 23:49 UTC: 3.599117836502T liquid,
3.747295059272T total, running in Survival at 0.1 ticks/s without limiting.
Source has no pending records/errors; runtime and treasury report no errors.
No production mutation, funding operation or push occurred. The final release
must remeasure costs and check fresh funds against its bounded recovery budget.

Remaining work includes IC completion time/idle expiry, the fenced v5→v6
activation, v9 buffered checkpoint handoff, new action/quote/API UI, capacity
screening and the consolidated installed-IC/CI release gates.
