# B2Z torus v4 — staged, not activated on mainnet

The live paid game remains v3, 16×8 with bounded edges. Arena/camera and pacing improvements are independently deployed. **DTR CHANGE REQUIRED before live world migration:** the pinned host has no authenticated rules/schema transition. A fresh disposable v4 constructor and a v4-to-v4 upgrade are local test evidence; neither proves a supported v3-to-v4 live transition. Never reinstall the funded backend to bypass this boundary.

## State and rules

V4 is exactly 32×32 / 1,024 cells. Entity limits stay 32 cannons, 64 balls total and 32 per cannon. Row-major cell IDs remain unsigned 32-bit commands; board ownership/bounds remain application checks.

Every neighbour lookup wraps north, west, east and south, in that deterministic order. Spawn patches, inclusive ball/anchor exclusion, connectivity, severance, relocation and strike adjacency use this topology. Crossing into an owned non-anchor cell translates the integer trajectory intercept by one world period. Enemy/neutral cells across the seam use ordinary collision/capture/reflection rules. A seam itself is not a wall. Simultaneous corner crossings retain the existing diagonal no-cutting rule and target ordering. Opposite-strike pairing remains edge/ball ordered with exact rational timing and periodic impact distance. No velocity, heading conversion, score, price or entity modifier changes are introduced.

State version 4 adds optional `cannon.heading: u16`. Absence means unknown, including migrated historical cannons. Null/out-of-range headings are invalid. Only accepted ANGLE launches update it. MOVE, rejected commands and ball reflections do not. Cannon-spawn metadata and ball-spawn events carry the accepted heading; presentation applies it at the event's playhead time. Reload and upgrade recover it from authenticated state. The current v3 live snapshot has no such field, so its cannon uses a neutral symbol.

| Identity | Live v3 | Staged v4 |
|---|---|---|
| Rules | `1647187ec03a468d957cbffd84b2928110cb4aada9e05b671ddf1b3e8e9ddee0` | `e4d01123f895dd7a1f841332323171bbba1b5159d49dcf66e4c5c7e3c9c8f894` |
| Schema | `c1e0a56ec208d69a9f0c08bae3ee1fe02ff0bd0f6ac11de5f86dcc3f02f49692` | `66a78c3b028d6ba546b4eba1e5b440d72837cb1cf87f9e26b24739383fa9cad6` |
| Configuration | `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42` | `6f06db2b7485f8c0bc116682e7a7f43317a3214f0d4d62bbc4d9b028ad11c9d4` |

V4 domains are `B2Z_TORUS_RULES_04` and `B2Z_STATE_04_TYPED_JSON`. Configuration adds version 4 / torus topology, with identical generated economics: 1 ICP join, 0.1 ICP × active-count² additional ball, 0.0001 ICP move, separate wallet fees and retained payments. Legacy binary magic, `BTZPAY02`, spawn derivation domains and historical animation format remain unchanged compatibility bytes. Existing v3 identities and goldens are untouched. The input adapter remains v3: prefix-free ANGLE/MOVE, old prefixed text, binary and numeric compatibility, original transaction IDs/digests and exactly-once source semantics.

## Supported pace and presentation

The B2Z policy's demonstrated initial maximum for the larger world is 0.5 ticks/s, giving Normal / Economy / Conserve targets of 0.5 / 0.25 / 0.125. The smaller live world's targets remain 1 / 0.5 / 0.25. Three ordinary compute/delivery overruns can lower the shared ceiling further. This changes wall-clock production, never logical velocity or area-time. The 32×32 four-ball/two-territory browser scene is the bounded representative envelope; it is not a claim that 64 balls sustain that rate. The rejected 1 tick/s larger-world trace is retained as evidence of artifact-delivery starvation.

World/screen coordinates are separate. Rendering normalizes wrapped positions, culls geometry, omits false seam walls, draws necessary copies and counts/picks one underlying entity. Camera bounds split into up to four minimap rectangles at seams. Foreground frame intervals use the existing live clock's one-second bound rather than silently dropping all elapsed time above 250 ms; hidden-tab changes reset the frame anchor. All rendering still stops at contiguous verified data.

## Staged placement and old-width MOVE safety

The pure JS/Rust placement embeds the old 16×8 rectangle at offset (8,12):

`new_cell = (floor(old_cell / 16) + 12) * 32 + (old_cell % 16) + 8`

Other cells start neutral. Translate x/y intercepts by 8×1024 and 12×1024; retain velocities and logical time. Map cannon/ball cells and strike endpoints, translating the strike's orthogonal coordinate exactly. Keep accounts, IDs/next IDs, all entities, received totals and earned rational credits. Unknown historical cannon directions stay unknown. No already published bytes or seals are rewritten.

A real cutover also needs a ledger boundary, not merely an empty local inbox. The B2Z adapter must obtain an exclusive cutover from the configured official Index's sync watermark, drain the receiving account's old-width history through that boundary under v3, and complete the old segment. Do not scan global blocks or archives. Do not pad/advance the account source cursor to an unrelated global height. Record the distinct cutover watermark, actual source cursor and anchor. Later public transfers remain durable in the Index while admission is held at this boundary; resume the same source path after an atomic transition. Transactions below the cutover cannot be silently interpreted using width 32.

The staged helpers reject unfinished work, admitted inputs, downloaded history pages, in-flight reconciliation, missing Index history-barrier evidence or an incomplete barrier. They preserve the source identity in the proposal. The helper returns a **non-deployable candidate**, not an IC-authorized transition or a proof that the supplied operator boundary evidence is genuine. Frontend drafts include version/dimensions and become stale when the world changes. This is not a quote reservation.

## Historical staging requirement (superseded by the activation candidate below)

Pinned `dtr-host::Action` offers Ingest/IngestOrdered/Seal/Step/Publish only. Its validator requires the head seal's identity to equal the journal identity and verifies the original manifest/ack. Replacing identity/state in place violates those commitments.

A narrow generic atomic Transition facility must bind the expected old manifest/state/identity, new identity and migrated-state hash/bytes, logical boundary, preserved source cursor/anchor and application migration-metadata hash. It must reject staged/reserved work, preserve original seals, receipts and retained evidence, and publish an authenticated old/new epoch link recognized by the client verifier. Index cutover logic, placement, topology, camera, orientation and cycle economics remain B2Z-owned. DTR changes require separate scope and user publication before immutable consumer pins and real-remote validation. **DTR extension is now separately published; see the candidate below.**

## Checks

New v4 fixtures cover horizontal/vertical/corner passage, blocked diagonal seam crossings, competing seam strikes/capture/annihilation, seam-only connectivity, severance and alternate wrap connectivity, spawn exclusion and accepted/rejected heading changes. Native/JS canonical state/events/scores match with interruption recovery. The actual disposable upstream ledger/index path exercises text transfers, persistent orientation, two pending inputs across upgrade and exact captured-seal replay. Browser checks use a genuine pinned disposable IC, with corner-seam MOVE picking, native touch pinch, responsive screenshots and bounded populated playback. Historical v3 replay/recovery remains a separate required gate.

## Authenticated activation candidate

The current transition branch pins published DTR
`c12af747190f7e24d5e68cdf57dbb1494095a46b`, client 0.13.0, for the generic
atomic epoch checkpoint. The earlier "required shared facility" section above
records the original staging boundary; the live game remains v3 until the tested
candidate is explicitly activated. No treasury implementation is included.

The fixed controller methods are `prepare_torus_transition()`,
`torus_transition_status()` and `commit_torus_transition(expected_old_manifest)`.
They accept neither arbitrary state nor caller-selected rules, principals or
Ledger heights. Preparation requires the existing source reconciliation to be
between windows. It durably holds admission before measuring the Ledger's
exclusive `chain_length` with `query_blocks({start:0,length:0})`. This is one
metadata-only call, never a block scan. The worker then waits for the configured
Index's `status().num_blocks_synced >= cutover`. Both calls use the existing
30-second timeout and fenced source lease. Failures preserve the fence and retry
through bounded maintenance; upgrade invalidates outstanding callbacks.

The account query starts exclusively below the recorded cutover, using the same
bounded history windows, raw transaction digests, sparse cursor and anchors.
An empty account page establishes completeness only **after** the independent
Index sync check. The worker checks the account's oldest ID, finishes all windows
and never assigns the global Ledger height to the account cursor. Transactions
at/above the cutover remain durable in the Index for the new epoch. Every older
command, including invalid or underfunded payments, finishes under v3. While held,
only an unfinished stage, admitted inputs, unretired source progress or an initial
uncommitted head requires old-world simulation. Ordinary old-world production
stops at its committed boundary. Existing operator pause/resume is respected.

Commit requires the controller's exact current old manifest, a drained source,
no stage/reservation/inputs and actual committed 16×8 prelaunch v3 state. It derives
the placement internally. New checkpoint events and score **deltas** are empty;
all accrued credits, received totals and player/ball state remain in the migrated
world. Application metadata separately records the global Ledger cutover,
observed Index sync count, account-history completeness through exactly the
cutover, actual sparse account cursor and anchor. Its hash is bound by the DTR
epoch proof. The new publication ordinal consumes zero logical time and is not
counted as a simulated segment. Persistence, retention and certification change
atomically. Identical commit retries return the existing evidence; a conflicting
old manifest fails. Later upgrades validate both the epoch and application
metadata commitments before rearming the same source/runtime timers.

Publication v7 authenticates the predecessor v6 catalog, unchanged logical/source
boundary, new state/identity and metadata hash. Every later `DTRSEAL2` binds this
same epoch proof. Old v6 bytes remain unchanged. The frontend verifies this link
before switching world projections/configuration, explicitly replaces incompatible
playback, resets the camera fit once and invalidates old transfer drafts. Aim
selection remains local and retained. A fresh v7 session does not require a cached
old snapshot; retained-history gaps still require explicit authenticated resync.

Upstream semantic inspection: official ICP Index source at
`dfinity/ic@6a7e0a3efc521453c8969102cbaee703811cafa4`,
`rs/ledger_suite/icp/index/src/main.rs`: status reports the global block-log length;
block append updates account indices synchronously, and account-history `start`
is exclusive. `oldest_tx_id` is the account's global oldest ID, independent of
pagination. The existing official Index trust assumption remains; this does not
claim a separate cryptographic proof of the Ledger's complete history.
