# S03 — Admission, causal collision windows and replay-safe inputs

**Date:** 2026-09-20  
**Delivery:** self-contained source-and-conformance checkpoint  
**Promotion gate:** BLOCKED  
**Real-funds authorization:** none

S03 continues S02 with executed JavaScript gameplay, shared-host hardening,
independent conformance evidence and partial portable Rust source. It is not a
compiled Rust release, an IC deployment, or a production economics specification.
The original S02 rules are retained for historical regression rather than silently
reinterpreted under the new rules.

## 1. Implemented and executed

### Safe, resumable cannon admission

An accepted initial `ANGLE` payment can now create a cannon, its first ball and
exactly nine owned cells. The search prioritizes hash-ranked directed live/live
frontiers, then live/neutral frontiers, then neutral interior positions. A final
safe interior fallback allows joining a board wholly owned by a single player.
The last fallback is an explicit v3 choice, not an assumption that a boundary
always exists.

Every candidate excludes existing cannon cells, ball centres on or inside the
closed patch, and any removal that disconnects an affected owner's territory.
Connectivity checking is resumable. An exhausted work slice saves its cursor;
it does not reject the payment or pretend there is no valid position. Rejected
candidates cannot modify the board. Only a completed accepted search transfers
the nine cells and creates the initial ball.

Selection is deterministic and weighted by eligible directed edges, not uniform
among cells or players. It is predictable, potentially manipulable placement—not
cryptographic or economic fairness. Replay uses canonical sealed input data.

Early checks reject underpayment, entity limits, account constraints and exhausted
identifiers. To bound command-driven search load, test configuration permits at
most eight otherwise qualified spawn searches per segment. A later search receives
`SPAWN_SEARCH_CAPACITY`, distinct from `NO_ELIGIBLE_SPAWN`; its payment is retained.
This quota and the other prices/caps are provisional reference configuration.

### A causal nonzero annihilation window

Opposing near-time hits can now annihilate without retroactively undoing a capture.
A ball bounces immediately; its contested chip remains pending for **1/16 logical
tick**. A reciprocal actual hit through the inclusive deadline, within **64/1024
cell** along the same edge, destroys both balls at the second arrival and performs
neither chip. A later hit does not undo history.

Each ball can have only one pending chip. It may bounce again during that fuse,
but cannot arm another chip until the effect resolves. This small cooldown is a
real game rule and is documented. Arrivals precede expiries at an equal logical
time; eligible deterministic pairing precedes expiry captures. Expiries recheck
the live ball, owners, cells and protected cannon before applying a chip.

Pending effects survive committed segment boundaries and serialized process
restarts. Segment-end events still belong to the next half-open segment, after
that checkpoint's commands. Cannon movement can therefore protect a pending
target. Extinction, neutralization and preserved area-time remain in effect.

### Shared input normalization

S03 found and corrected a replay hazard. The source commitment normalizes an
unsigned position and payload bytes, while the first spawn implementation hashed
the unnormalized JavaScript wrapper. Equivalent `0`, `"0"` and `0n` positions—or
an extra uncommitted transport field—could then select different placements under
the same input commitment.

Both shared host entry points now hand kernels only canonical position/payload
envelopes. The direct BTZ constructor applies the same rule. Generic tests and
full-game tests require identical output for these equivalent representations.
The source commitment wire format is unchanged; existing saved work is not
silently migrated.

### Measured, same-rule optimizations

The executed simulator caches owned-area counts until a mutation and uses a local
articulation precheck before an unnecessary territory search. Both can be disabled
to obtain a slower reference mode with the same rules. Seven scenario comparisons
produce byte-identical state, events and scores.

In the dense reference fixture (32 balls, 128 cells, four logical ticks), abstract
work falls from **27,106 to 7,138 units: 73.67% fewer**. These units are not Wasm
instructions, cycles, economic cost or a production capacity measure. Elapsed
local time is a single-run diagnostic. Snapshot-size samples are not proofs of
worst-case memory. The measurements are in
[local-workload.json](../evidence/S03/local-workload.json).

## 2. Rust source progress and the remaining port

The six pure Rust workspace packages remain registry-free. `btz-mechanics` now
also contains candidate enumeration, exact protected-centre masks, resumable
masked-connectivity admission and deterministic pending-strike pairing. A native
fixture emitter is wired to compare the new placement cases when a Rust toolchain
is available.

**The complete BTZ world, command interpreter, event/scoring codecs and resumable
journal have not been ported to Rust.** This is missing implementation, not merely
missing verification. The new mechanism source has not been compiled, formatted
by rustfmt, run through Clippy or executed natively here. Rust spawn continuation
currently has typed/clone checkpoints, not a new production stable-memory codec.

An explicit numerical gate remains: exact rational area-time can require wider
integers than i128. A regression preserves a prior credit exceeding 180 bits.
The native port must preserve the canonical arbitrary-precision contract using a
reviewed, pinned implementation rather than narrowing scores silently or claiming
that checked geometry arithmetic solves accounting precision.

See [porting/performance notes](../docs/architecture/S03_PORTING_AND_PERFORMANCE.md).

## 3. Verification actually performed

Command: `python3 -B tools/check.py all --output evidence/S03/verification`.

| Gate | Result |
|---|---|
| Node source conformance | **840 passed; 0 failed, skipped or cancelled.** |
| Python tooling/integration tests | **35 passed.** |
| Existing protocol, Life, geometry and territory references | Passed. |
| Independent spawn oracle | **72 cases**, using a separate Python masked union-find model. |
| Independent near-time oracle | **132 cases**, using analytical exact-Fraction corridor outcomes. |
| Full v3 byte traces | **7 scenarios**, explicitly labeled implementation-derived regression goldens. |
| Budget partitioning and serialized continuation | Passed, including spawning, pending strikes and territory transfers. |
| Separate-process recovery | Passed through the local file-journal demonstration and Python subprocess tests. |
| Generic input normalization and BTZ full-output invariance | Passed. |
| Same-rule optimization comparisons | Passed; state/event/score bytes identical. |
| Source structure and document links | Passed. |
| Native Rust, rustfmt, Clippy and native vector comparison | BLOCKED: required toolchain unavailable. |
| Wasm/Candid, PocketIC, actual ledger/wallet and certification/cost | BLOCKED; incomplete integration, not claimed as executed. |

The full command exits **2 / BLOCKED**, intentionally. Its logs and environment
inventory are included in [verification.json](../evidence/S03/verification/verification.json).
Source-only execution exits zero. No Cargo.lock, Wasm, compiler pass or actual
cycle/ETH-equivalent metric has been fabricated.

These tests are evidence for the small reference configuration, not a proof of
all game states or a security audit. The 7 full traces are not independent oracles;
the 72 spawn and 132 analytical cases are independently derived. Historical v2
tests remain in the aggregate suite.

## 4. Demonstration

From a pristine extracted archive, with Node >=22.16 and Python >=3.11:

```sh
python3 -B tools/verify_checkpoint.py
python3 -B tools/check.py source

node tools/demo.mjs btz admission --journal .work/admission.json --budget 1 --slices 10
node tools/demo.mjs btz admission --journal .work/admission.json --budget 127
node tools/demo.mjs btz near-impact --journal .work/near-impact.json
node tools/btz_bench.mjs
```

The first admission invocation stops in a hidden spawn search with zero published
cannons. The second process resumes to a committed two-cannon segment. No network,
wallet or ICP transfer occurs. A local filesystem checksum is not an IC certificate.

## 5. Package and evidence discipline

The ZIP includes this report, current specifications, older reports/evidence,
actual check logs, canonical fixtures, tool scripts and a complete file-hash
manifest. Packaging verifies staged and freshly extracted contents. Independent
fresh-extraction source execution, final archive hash and repeated byte-identical
packaging are recorded in the accompanying external release-verification JSON so
that the archive does not contain a self-referential checksum.

The working tree was saved in an incremental recovery archive during implementation.
Per-check subprocess timeouts and incrementally written reports continue to bound
individual verification runs. Early development failures are retained and labeled;
they are not substituted for final passing evidence.

## 6. Open boundaries and next substantial bundle

No actual IC stable-memory adapter, live source completeness verification, certified
browser observer, settlement, real cycle telemetry or target-subnet capacity test
exists in S03. There is no deployment and no authorization to use real funds.

The next bundle should close the native numerical/state/cursor/event contract
against the complete v3 traces, then connect the generic stable host and actual
ledger/index/archive interfaces. The first working IC integration should retain
Life as a second kernel and explicitly test upgrades, dropped hints, duplicate
inputs and interrupted pending effects. Source, native and live-canister evidence
remain separate gates; tool absence cannot be promoted into a compiler pass.

## 7. Normative references inside this checkpoint

- [BTZ v3 admission and impacts](../docs/specs/BTZ_V3_ADMISSION_AND_IMPACTS.md)
- [Decision record](../docs/adr/0003-causal-strikes-and-safe-admission.md)
- [Conformance coverage](../docs/testing/S03_CONFORMANCE.md)
- [Decision register](../docs/DECISIONS.md)
- [README and commands](../README.md)
