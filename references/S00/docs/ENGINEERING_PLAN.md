# DTR / BTZ engineering plan

## Decision: one repository, several clear deliverables

Start with one monorepo. It keeps fixtures, wire contracts, kernels, observer and tests versioned together. Produce full checkpoint ZIPs from that repository; do not begin by creating a distributed family of frameworks and deployment services.

The deliverables are a small deterministic runtime, an IC host/adapter, a browser timeline library, BTZ, and a tiny Life conformance kernel. Jupiter and Event Horizon remain integrations rather than embedded dependencies of the pure runtime. Extract an independently versioned infrastructure library only after genuinely different consumers demonstrate a stable interface.

Proposed source layout, **not a claim that these packages already exist in S00**:

```text
dtr-suite/
  Cargo.toml                 # workspace; Cargo.lock generated with the actual toolchain
  Cargo.lock
  rust-toolchain.toml
  package.json
  package-lock.json          # generated, never fabricated offline
  icp.yaml
  Dockerfile.repro
  AGENTS.md
  crates/
    dtr-core/                # pure ordered timeline and kernel contract
    dtr-ic/                  # source ingestion, stable state, scheduling, proofs
    dtr-testkit/             # replay, fixtures, fault injection, reference runners
  kernels/
    btz/
    life-conformance/
  canisters/
    btz-arena/
    frontend/                # certified static hosting using supported tooling
    settlement/              # introduced only when the monetary boundary is implemented
  packages/
    timeline-client/         # verified retrieval, buffering, presentation clock
  apps/
    btz-observer/
  tests/
    fixtures/
    pocketic/
    e2e/
    migrations/
  tools/
    xtask/
    scripts/
  docs/
    architecture/
    specs/
    adr/
    testing/
    security/
    operations/
  checkpoints/
```

Codec, certified store and observability can start as clearly separated modules. They do not each need their own crate or canister on day one. Modules can be promoted once their boundaries are useful and stable. The table above is the anticipated implemented layout; S00 is documentation and evidence only.

## Dependency and authority boundaries

`dtr-core` must compile without `ic-cdk`, an ICP ledger client, principal types, browsers or BTZ geometry. It works with canonical input bytes, logical time, version identifiers, state commitments and resumable progress. Typed funding accounts and amounts belong to the ICP adapter/game envelope, not the deepest universal abstraction.

The kernels own their state and rules. A kernel receives no clock, network or ambient randomness capability. It may use a versioned public pseudorandom function with inputs already committed in the replay record. Independent native and Wasm runners must agree.

`dtr-ic` owns durable source discovery, scheduling, verified input assignment and publication. Its work budgets decide when to pause, never who wins. `timeline-client` owns retrieval, proof checking and playback; it cannot alter authoritative state. The BTZ renderer owns visual meaning. Frontend code can be modified without changing the game, but certificate verification and honest payment instructions still matter to the user.

## Deploy fewer canisters initially

Use one authoritative arena canister for ingestion state, the deterministic game, checkpoint commitments and recent read data. Serve frontend assets separately. Keep independently deployable settlement out of the initial no-money prototype, then introduce it before meaningful prizes if the permission boundary justifies it. Specify exactly which arena/accounting records it accepts; a separate canister is not automatically a safety boundary when another role can instruct arbitrary payments.

Do not split physics, individual players, board regions and collision resolution across canisters. That would replace local deterministic transitions with asynchronous coordination. Public IC guidance also treats awaits and cross-canister work as separate transaction boundaries; journaled workflows are needed when external effects are involved. See [R3 and R8](IC_REFERENCES.md).

Add archives or read replicas only when retention, serving load or lifecycle requirements justify them. Mirrored data is verified against commitments; mirrors are never new authorities. A new canister must have a documented reason: permissions, independent lifecycle, resource isolation or measured capacity.

## The replay record

A complete replay bundle contains:

```text
genesis + canonical configuration history + rules/schema versions
+ verified external inputs
+ checkpoint-seal/input-assignment records
+ any explicitly permitted public entropy material
```

Ledger transactions alone do not tell a replay which simulation epoch a delayed scheduler assigned them to. S01 must specify either a pure input-to-epoch mapping or an explicit committed seal stream. The provisional choice is an explicit seal stream, with deterministic processing once a seal is fixed. This gives reproducible history; scheduler fairness and cutoff timing remain separately specified properties, not magically proven by replay.

A seal references source identity, ordering/completeness evidence through its watermark, configuration/rules hashes, logical interval and assigned input range. For an account index, a set of included relevant records is not itself proof that none were omitted. The adapter must declare and test its completeness strategy; the exact ledger/index/archive capability is an S01 gate.

## Atomic publication, resumable work

Use the conceptual state machine:

```text
OPEN -> SEAL_RECORDED -> INPUTS_COMPLETE -> SIMULATING
     -> READY_TO_COMMIT -> COMMITTED
```

Persist bounded progress in a staging area. During simulation, queries serve the last completed certified snapshot. Once state, event and accounting roots are ready, publish them together through a small final commit. Never expose half a region transfer or half a segment as final state.

Each simulation safe point must satisfy partition invariance: running with different step budgets, interruptions and resume points gives the same final state, accounting and canonical events. Logical simultaneous-event groups cannot be cut at arbitrary execution boundaries. Connectivity searches, spawn searches and output construction themselves require continuations rather than a nominal `step()` wrapped around an unbounded inner loop.

Fenced generations protect asynchronous callbacks. An interrupted operation resumes or is reconciled; a later generation cannot inherit stale mutation authority. The live canister and the offline runner use the same logical contract, not necessarily the same storage container.

## Bounded resource posture

Specify limits for input bytes/records, scan pages, pending queue storage, balls, cannons, collision events, connectivity visits, spawn candidates, event bytes and retention. All counters use checked arithmetic and documented maximum sizes. Financially costly commands are not assumed affordable for the canister merely because someone paid for them.

Protocol overload behavior must be deterministic and documented. Suspend authoritative advancement or queue bounded work according to the admission rule; do not silently skip difficult physics or paid inputs. Economic price ramps are useful policy, not a mathematical resource bound. Worst-case work is measured before choosing production board/player/ball limits.

Cheap observation uses precomputed, bounded responses and witnesses, not a fresh global flood fill on query. Wakeups coalesce and are scheduled under a rate budget. A permissioned Event Horizon accelerator is compatible with a permissionless game when fallback polling remains independent; a public hint endpoint must not multiply scans. Query availability and cheap update handling are separate concerns. [R6](IC_REFERENCES.md) informs this posture.

## Cross-game friction the runtime should remove

| Shared difficulty | Shared facility | Game-specific choice |
|---|---|---|
| Delayed/duplicate discovery | Durable adapters, fencing, source cursors | Memo meaning and accepted funding sources |
| Checkpoint timing | Seals, logical intervals, input horizon | Interaction cadence and cutoff policy |
| Long simulations | Safe-point continuation, staged commit | Physics/CA/agent algorithm |
| Deterministic replay | Canonical codecs, versions, golden vectors | State and event vocabulary |
| Large outputs/reconnect | Chunk roots, snapshots, verified resumption | Renderer and snapshot reconstruction |
| Latency/jitter | Downloaded-and-verified buffer, adaptive playback | Visual style and acceptable delay |
| Diagnostics | Bounded operational metrics with provenance | Optional game-specific statistics |
| Payouts | Durable obligation machinery at monetary stage | Score formula and distributable pool |

Use Life to test high-volume discrete transitions and BTZ to test continuous trajectories and topology. Keep tower defence and autobattlers as interface-review examples until there is a concrete second product. No entity-component system, generic physics layer, scripting VM, plugin loader or general sharding framework is required.

## Integration posture

**Event Horizon:** the hint has no financial authority. It may coalesce or disappear. The authoritative scan resumes from persistent state, validates records and advances only on success. Test malicious bursts, duplicate hints, a lost final hint and late callbacks.

**Jupiter:** optional operational funding. Start with a narrow read-only status compatibility probe and a mock funding source. Specify target canisters, observation visibility, startup cycles and failure behavior. Funding outage may affect availability, never game ownership or an existing payout obligation. Do not redevelop neuron handling, maturity routing, factories or CMC integrations inside `dtr-core`.

**Wallets:** test real supported memo/account paths early. Avoid a mandatory game frontend as the only encoder; provide a published binary/numeric specification and small offline command helper. Certified status is advisory, not a reservation or guaranteed price. Nonrefundable race outcomes must be visible before payment.

## Configuration and upgrade contract

Every committed segment identifies rules, effective economic configuration, schema and input-source configuration. Changes have an announced activation boundary and retained old configuration. Source hash, deployed module identity and runtime configuration identity are distinct.

Stable storage requires a memory-ID registry, migration fixtures and a routine-upgrade path. Upgrades must preserve earned area-time for destroyed cannons, deduplication positions, unsettled payouts and in-progress operations. Recovery is not permission to rewrite committed history. Development builds may expose debug helpers; deployed production artifacts must prove they do not.
