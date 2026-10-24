# B2Z arena, pacing and staged world transition

## Graduated pacing release candidate (2026-10-23)

This candidate preserves the installed paid v4 32×32 world and treasury. The older staged-world and 0.5 tick/s descriptions below are historical. It uses published DTR 0.13.0 unchanged. Normal targets 1 tick/s independently of world dimensions; the separately measured supported ceiling is exposed honestly.

| Mode | Entry / exit liquid cycles (T) | Target ticks/s |
| --- | --- | --- |
| Normal | 40 / 30 | 1 |
| Cruise | 25 / 20 | 0.75 |
| Economy | 15 / 12 | 0.5 |
| Steady | 10 / 7.5 | 0.3 |
| Conserve | 5 / 4 | 0.2 |
| Survival | 3.5 / 3 | 0.1 |
| Lifeline | 3 / 2.5 | 0.05 |

Below Lifeline's exit, Reserve Protection suspends simulation. The independent treasury worker remains available subject to its own call reserve. Funding hysteresis and supported performance are separate.

Retention holds up to sixteen publications under the unchanged 8 MiB byte cap. The observer fetches bounded missing catalogs and artifacts concurrently, validates predecessor links in order, and admits only fully authenticated, endpoint-validated segments. Its fetch high-water marks are 24 queued segments and 32 logical ticks; a catch-up batch is bounded to sixteen segments and every admission still enforces the existing 8 MiB client bound. Startup reserves one publication plus sixteen seconds at rates of at least 0.5 tick/s, eight seconds below that. Lifeline still starts within two one-tick publications. This adds delivery reserve, not a rate cap. Diagnostic admitted/played counters exclude snapshot-resynchronization jumps; backend production, retrieval, derivation, resynchronization and playout are measured separately. Qualification remains pending the sustained authenticated browser gate.

The viewport is the arena. Local native dialogs hold Play, Players, Rules, View and Settings. Dialogs contain/restore keyboard focus and never pause shared execution. The single aim control moves into a compact dismissible empty-world overlay only after authenticated configuration/source and a healthy verified empty state. It is not recreated during animation. Camera coordinates are cells, independent of canvas/device pixels and authoritative motion. Pointer/touch pan, anchored wheel/pinch zoom, fit, selected-cannon centring and split seam minimap bounds are local. Entity counts and picks refer to one underlying world, including repeated seam copies. Historical cannons with no authenticated heading use a neutral symbol.

## Current live-world boundary

The initial inspected mainnet state on 2026-10-21 contains a real paid cannon/ball, received total 100,000,000 e8s and source cursor 39,526,412. It is a 16×8 bounded v3 world. Never replace this with a new empty constructor.

**DTR CHANGE REQUIRED for live topology/schema migration.** The pinned `dtr-host` coordinator's `Action` enum has no identity/history transition. `validate_record` requires the current head seal to match the journal identity and verifies its original manifest/ack; changing the identity or state in place invalidates that commitment. No DTR code changes are made in this branch. UI, camera and runtime pacing can be deployed using the unchanged existing identity.

The required narrow generic API is an atomic `Transition` at a committed boundary: expected previous manifest/state hash, old identity, new identity, logical boundary, source cursor/anchor, migration identifier and new state/events/scores hashes. It must reject staged work/reservations, preserve inbox pending inputs/cursor/retirement and original manifests, append an authenticated transition record, and let observation verification link old and new epochs without treating the new state as genesis. Migration bytes/placement/topology remain B2Z-owned. A frontend must explicitly recognize this link and invalidate transfer drafts. No topology, camera, cycle policy or treasury machinery belongs in DTR. That dependency would need user publication and immutable pins before any production consumer upgrade.

## Bounded shared pacing (unchanged v3 world)

The B2Z host executes at most eight coordinator actions and 2,048 logical work units per message, yielding before another phase once the instruction counter reaches 600 million. Each Step remains at most 512 units. It persists once before yielding, publishes at most one two-tick segment per callback, and applies an absolute deadline between completed segments. A delayed timer drops catch-up debt instead of producing unlimited future batches. Empty arenas retain the existing sleep and independent 60-second Index poll. No logical velocity, seal, score or payment format changes.

The initial measured live producer delivered 0.492 verified ticks per actual wall second over 89.46 seconds, while the old client tried approximately one tick/second. Its 84 samples contained 36 STALLED samples. This is a sustained production deficit, rather than evidence of network jitter alone. The new shared target is 1 tick/s Normal, 0.5 Economy, 0.25 Conserve. A repeated compute overrun can reduce the shared supported ceiling; clients slew toward the advertised nominal rate and retain the existing DTR clock's small jitter correction. User replay-speed controls do not change live pace. Startup uses one two-tick batch plus four seconds of delivery headroom at the shared pace: six ticks Normal, four Economy, three Conserve. This covers measured retrieval jitter after correcting the producer deficit; it never authorizes extrapolation.

Thresholds are **liquid cycles**, in trillions: Normal enters at 4 and exits below 3; Economy enters at 1.5 and exits below 1; Conserve enters at 0.5 and exits below 0.25. Below that, reserve protection suspends simulation. Recovery uses the higher entry thresholds. These are conservative initial budgets, not lifetime promises: previous active measurements were approximately 0.18–0.36 billion cycles per two-tick segment, plus reconciliation. The 0.25 trillion application reserve leaves hundreds of representative segments' expenditure for recovery rather than running to freezing. The Index is polled only above 0.15 trillion liquid headroom, protecting its observed approximately 0.11 trillion outgoing-call reservation plus margin. Below that floor, the history cursor remains unchanged and polling retries later. Already admitted payments remain in the original inbox until simulation resumes; later ledger transfers remain in the official Index.

The pinned SDK's `canister_liquid_cycle_balance()` already accounts for freezing/resource reserves and current-message/call reservations. These thresholds are additional application headroom; the implementation never subtracts the freezing reserve again. See the [IC liquid-balance semantics](https://docs.internetcomputer.org/references/ic-interface-spec/abstract-behavior/) and [system API reservations](https://docs.internetcomputer.org/references/ic-interface-spec/canister-interface/). Only hysteresis/reserve-check principles were borrowed from Event Horizon; its funding machinery, thresholds and polling cadence are unchanged.

`lab_status.run.pace` is a public operational hint, separate from certified publications and payment authority. Exact cycle balances and phase instruction counters are available only to controllers via `controller_runtime`. Missing/unverified game data is never labelled Live. Reserve protection disables actionable transfer preparation. Camera, dialogs and local aiming remain usable. The durable root schema and old canonical game artifacts are unchanged by this host scheduling extension.

Delivery and compute limits are distinct. The host also measures completed-batch intervals less its deliberately scheduled rests, so timer/self-call delivery overhead contributes to the supported ceiling. Three ordinary overruns reduce that ceiling to 80% of the observed capacity; a paid input/spawn batch is excluded from this feedback. Small deadline debt is bounded to two periods and dropped after a longer delay. Each callback still publishes at most one batch, so delayed execution cannot generate an unbounded future. The legacy stored `pacing_seconds` field remains compatible; it no longer inserts a rest between Seal, Step and Publish. The reviewed targets above drive wall-clock pacing.

The observer retrieves the three independently hash-bound state/events/scores artifacts concurrently, with at most three artifact streams and sequential chunks within each stream. All streams settle, all bindings and endpoint conformance pass, and only then is a segment admitted to playback. This removes three serial round trips without changing certificate, predecessor or artifact verification. Diagnostics distinguish the operational backend segment counter, retrieved verified ticks, displayed ticks, buffer and fetch/certificate/artifact durations. Operational counters never authorize outcomes. Pace hints refresh at a bounded two-second interval; actual motion remains capped by contiguous verified data.

Changing local aim/action marks an existing transfer card stale and disables copying until explicit refresh, rather than collapsing the card and shifting the aiming pad inside a centred dialog during a drag. Pointer focus also preserves scroll position. Current authenticated instructions stay visible as one consistent set.

The staged world contract, placement, Index cutover barrier and exact identity table are in [B2Z_TORUS_V4.md](B2Z_TORUS_V4.md). The larger world's tested shared ceiling is 0.5 ticks/s; this is staged policy and does not alter the live 16×8 ceiling. No DTR change or live topology migration has occurred.
