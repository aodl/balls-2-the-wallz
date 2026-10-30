# B2Z operation-scoped cursor reuse — bounded prototype

2026-10-27. **GO for further qualification; no production deployment authorised.**
Branch `prototype/b2z-operation-cache`, based on accepted investigation
`79c8521c5e2cc3d5184439acf3110038bd86e8f5`. The original documentation-only
investigation commit is unchanged. No NNS evidence or decisions apply here.

## Production condition: Reserve Protection

At **07:51:50 UTC**, read-only controller observations reported **2.913720T total,
2.766862T liquid**, selected **ReserveProtection**, supported/nominal rate **0**, and
admission closed. Configured `running=true` does not mean ticks are advancing.
The safety policy has already gated gameplay; remaining active-play runway is zero.
Query-time liquid above 2.5T does not override the callback-selected tier/reserves
and hysteresis. No operator changed pacing, funding or gameplay.

Genuine IC-root certificate verification passed: v8 publication, v5 1,000×1,000,
1 cannon, 3 balls, 2 credited accounts, received 620,000,000 e8s. Head commitment
`95c7dc5c0d0d2def4ca17f999ad552db247a6f1c73c7db994e910f44dd6f3e34`
remained unchanged across the window (completed segments 63,379). No unfinished
work, pending inputs/records, transition, source error or gameplay error was reported.
Paid state remains authenticated; **ongoing gameplay progress is gated**, not PASS.

Source admission cursor remains 39,711,127; Index calls advanced from 8,597 to
8,660 and the official Index synced through 39,719,688. Treasury is Idle, unpaused,
not halted, without error or outstanding operation. Actual Ledger balance is **0**.
Last successful conversion remains block 39,711,126 on 26 October at about
22:37 UTC, credit 1.90990899T; cumulative reported credit 12.11027282T is unchanged.
There is no observed new treasury replenishment during these observations.

At 06:48 liquid was 2.569072T; at 06:57:43 it was 2.786132T. That positive movement
(~0.217T total) is **unattributed**, not negative burn or an assumed treasury credit.
Between 06:57:43 and 07:51:50 total declined by 0.019270T, approximately **0.0214T/h**,
with ticks stationary. This is a maintenance/accounting observation, not the cost of
active Conserve. If that rate held without any credits, liquid would reach 2.5T in
about **12.5 hours**; this is conditional and does not forecast a resumption of play.
The balance is already below the 4T and 3T policy thresholds. Do not assume another conversion.
Read-only management evidence confirms installed backend `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`
and unchanged two controllers (full identities in the independent snapshot).

## Investigation closure

[CI 40461823074](https://github.com/aodl/balls-2-the-wallz/actions/runs/40461823074)
is completed **success on exact commit 79c8521c5e2cc3d5184439acf3110038bd86e8f5**.
All six substantive jobs passed: Source, Native, Runtime Wasm, Browser, Packaged
DTR/consumers and installed-IC qualification. The informational production-inventory
job is explicitly not additional production qualification. This CI does not qualify
the new prototype commit.

All entries in the independent accepted investigation snapshot
`/home/codexdev/b2z-release-evidence/million-cycle-investigation-20261026/SHA256SUMS`
verified; its original files were not changed. The accepted 599.442-second study
measured **364,097,153,656 total cycles debited**, 117 ticks/publications,
**2.186615T/h**, **3.111941B/tick**, with no replenishment in that window.
Phase-level cycle allocations remain estimates from instructions; **23.125% residual
was unassigned**. They are not independently metered actual charges.

## Minimal correction and trust boundaries

The coordinator repeatedly restores and validates the same canonical cursor in
restore/Step/publication, redoing JSON decoding, world/schema roundtrips and output
encoding. `operation_kernel.rs` adds one exact-byte memo for one coordinator
lifetime, retaining a validated decoded cursor and optionally its immutable output.
The original stateless B2Z kernel and immutable DTR 0.14 revision
`e1bfcf25071d11190d14f461288e12a21ca26cf8` are unchanged.

Every unseen byte string still passes original `Cursor::restore`, hash, bounds,
world and canonical schema validation. Warm reuse requires exact byte equality
and matches every supplied expected digest. Generated snapshots are **not** marked
validated; their first consumer restores them normally. Step clones the validated
cursor and executes the original budget/arithmetic. State/events/scores are encoded
once per validated completed cursor. The memo dies with its coordinator, never
crosses IC messages/upgrades, never enters durable state and uses no global cache.
The cached source bytes and output are each limited to 256KiB; larger continuations
use the original uncached validation. Decoded object overhead is additional.

Production changes: one wrapper module and its coordinator construction sites;
two private transition helpers accept a generic kernel, with unchanged logic.
No authoritative kernel rules, numeric arithmetic, work budget, pacing policy,
public Candid, source/treasury logic, durable layout or publication bytes change.
No dependency/lockfile, frontend or production state change.

## Actual disposable-IC measurements

Normal frozen production predecessor: `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`.
Normal prototype Wasm: `fec372ec5afe5787e5fa5573c18b1d5d16201166d244a9602b276e7cee88c03b`.
Neither includes synthetic/manual-step exports. Explicit artifacts are consumed
without rebuilding or substituting them. Tests use identical fixture/state, clock,
canister IDs and source settings. Eight complete logical ticks are measured from
**before** start through pause, including those update costs. No treasury credit
arrives in the measured interval. These are actual PocketIC cycle deltas and Wasm
instruction counters, not native CPU timings or individual phase-cycle charges.

| Case | Frozen cycles / 8 ticks | Prototype cycles / 8 ticks | Reduction |
| --- | ---: | ---: | ---: |
| measured-2-3-4 / 2 balls / 512 | 3,776,613,654 | 2,579,889,663 | 31.69% |
| measured-2-3-4 / 3 balls / 512 | 6,881,286,295 | 4,687,699,290 | 31.88% |
| measured-2-3-4 / 4 balls / 512 | 10,793,108,974 | 5,925,435,210 | 45.10% |
| qualified-live / 3 balls / 512 | 8,751,528,007 | 4,956,707,622 | 43.36% |
| qualified-511 / 3 balls / 511 | 8,742,668,578 | 4,950,027,602 | 43.38% |
| qualified-513 / 3 balls / 513 | 8,751,528,007 | 4,956,707,622 | 43.36% |

Captured-state Step/publication counters (actual Wasm instructions, eight ticks):

| Phase | Frozen instructions | Prototype instructions |
| --- | ---: | ---: |
| seal | 304,842,302 | 305,396,598 |
| step | 4,253,527,480 | 3,051,005,871 |
| publish | 1,757,711,874 | 705,919,078 |
| persist | 650,662,961 | 335,495,780 |

Messages fall from 15 to 8 in the captured-state window. Lower aggregate
persist work follows fewer yielded messages; persistence layout/logic is unchanged.
Seal work is essentially unchanged. Measured totals include simulator charges
outside these phase counters; counters must not be summed and called actual cycles.

The two/three/four-ball fixtures are representative compact-v5 diagonal-motion
workloads. Captured-state cases start from the authentic production paid three-ball
state. Constructor-based cost fixtures publish v6; **they are not v8 epoch-upgrade
evidence**. The separate paid, subsequent-epoch recovery case below supplies v8.
The 511/512/513 test-input boundaries preserve production's unchanged 512 cap;
all three finish with exactly equal publication and artifact hashes.

## Determinism, authentication and recovery

PASS: native deterministic replay at each publication; exact final state, events,
scores, manifests, publication artifacts and source/financial semantics for each
matched A/B pair. SDK signature/canister/root checks, wrong-canister rejection and
staleness checks pass on disposable roots. No offline fallback or disabled time
verification. Cost-window certificates are refreshed only after accounting/equality.

PASS: exact frozen 7c078fb3 predecessor reaches a paid v8/epoch-2 world, starts an
unfinished cursor and is locally snapshotted. A deliberately torn stable image is
rejected by the prototype with **stable blob integrity**. Restore that disposable
snapshot, then compare frozen→frozen control with frozen→prototype upgrade and four
resumed ticks. Pre-upgrade paid state, retained chunks and publication are intact;
post-recovery state/events/scores, publications, complete retained history, queried
source status and **full exposed treasury state** match the control exactly.
Normal upgrade lease/nonce changes are compared with the frozen control, not
misrepresented as byte-constant pre/post fields. Both successor publications are
SDK-authenticated v8. No production snapshot load, transition or upgrade occurred.

The harness respects install-code rate limiting: after a definitive rate-limit
rejection it advances disposable idle rounds with time before a bounded exact retry.
It never disables the limiter. Explicit local virtual-clock correction preserves
SDK certificate time checks after these idle rounds. Earlier fixture/setup failures
(clock agent methods, rate-limit debt, an incorrect Python import invocation) and
preliminary screens are retained as negative harness evidence. They are not passing
qualification and are not attributed to NNS or hidden. Final named datasets above
use the final Wasm and complete cost windows.

Local verification PASS: 29 runtime unit tests (including three cache trust/fallback
regressions), native workspace tests (8 + 6), runtime Clippy with warnings denied,
unchanged generated Candid, seven Python harness tests and complete source checks
(source structure, JS/native-reference suites, portable cursors, documentation links,
Python tool tests). Locked/offline dependencies used where applicable.

## Estimate and decision

Applying the captured-state ratio 0.566382 to the accepted active three-ball
Conserve observation gives **1.238T/h**, a conditional saving of
**0.948T/h** (~43.36%) at 0.2 ticks/s. This is a planning
estimate, **not measured mainnet candidate consumption**. PocketIC/mainnet subnet
pricing, fixed/storage/call overhead, unchanged residual consumption, evolving
territory and scheduling limit extrapolation. Current selected rate remains zero.
No funding-tier policy or sustainability guarantee is changed; zero current receipts
cannot sustain either cost. No hypothetical replenishment is included.

Material improvement is demonstrated, so **GO for further qualification of this
narrow prototype**, not deployment. Require review, exact-commit CI and operational
upgrade authorisation before any backend release. This bounded test does not claim
all gameplay populations, long-run memory/fragmentation or every interruption point.
No broader physics, DTR or funding redesign was undertaken.

## Evidence and reproduction

Reviewed machine-readable measurements, current health, CI and recovery summaries
are adjacent to this report. `SHA256SUMS` covers these committed evidence files.
Raw inputs, SDK certificates, output artifacts, actual normal Wasms, test logs,
earlier negative attempts and source provenance are independently frozen at:
`/home/codexdev/b2z-release-evidence/million-operation-cache-prototype-20261027`.
Verify there using `sha256sum -c SHA256SUMS`. Raw working results remain under
`.work/million-cost-prototype/`; final datasets are `measured-2-3-4`, `qualified-live`,
`qualified-511`, `qualified-513`, `recovery-bounded-retry`.

Reproduce with `python3.11 tools/verify_operation_cache.py --baseline <frozen.wasm>
--prototype <prototype.wasm> --output <new-directory>`; defaults run two/three/four
balls at budget512. Add `--counts 3 --capture <health-state.bin>` for captured state,
`--work-budget 511` or `513` for boundaries, and `--mode recovery` for paid-v8 upgrade
and torn-image checks. Uses checksum-pinned disposable IC/official Ledger/Index
fixtures only. No DFX identity, real payments or public mutation.

Changed-file scope: `STATUS.md`; runtime `lib.rs`, `operation_kernel.rs`,
`transition.rs`; integration `s14_index.rs`, `support/funding.rs`;
`tools/verify_operation_cache.py`, `tools/verify_operation_cache_observation.mjs`;
this evidence directory. Remote Git operations remain user-owned.
