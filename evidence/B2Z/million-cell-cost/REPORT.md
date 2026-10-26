# Production million-cell operating cost — observational study

A bounded 10-minute observation on the unchanged live backend measured
**2.187T cycles/hour**, **3.112B cycles/logical tick** and the same
per publication. There were 117 publications/ticks over 599.442s,
235 working driver messages, 11 low-frequency controller samples and
**zero treasury credits or new receipts during the window**. Actual rate was
0.1952 ticks/s against Conserve's supported 0.2; no performance limiting
or source/run error was observed. Paid gameplay, source and treasury stayed running.

This window has one cannon and **three balls**, not the earlier two-ball workload.
Sampled segment work is 593–608, above the configured 512-unit Step budget. About
two working callbacks/publication and extra cursor/coordinator checkpoints explain
why the earlier ~1T/hour two-ball sample cannot be reused as today's cost.

| Bucket | Measured instructions | Estimated execution T/hour | % actual total cycle debit |
|---|---:|---:|---:|
| Seal | 5,000,179,443 | 0.079 | 3.6% |
| Step | 63,410,401,682 | 0.996 | 45.5% |
| Publish | 26,363,644,375 | 0.414 | 18.9% |
| Persist | 12,245,928,127 | 0.192 | 8.8% |
| Unattributed residual | Not cumulatively counted | 0.506 | 23.1% |

Actual debit is balance-based after separately adding known treasury credits.
Instruction bucket cycle equivalents use the [official fee schedule](https://docs.internetcomputer.org/references/cycle-costs/)
and a freshly certified count of 34 subnet signing-node keys, hence 34/13 cycles
per measured instruction. These estimates are not independent charge meters.
Storage/idle rent from management status is only 0.000204T/hour;
the counted working-callback base fees are approximately
0.0185T/hour and are already inside the residual, not added
again. Extra timer/source/treasury/call/byte charges are not individually metered.

Step contains cursor restore, canonical schema roundtrips, result/ready-manifest
work and validation as well as deterministic simulation. Publish includes repeated
result/manifest and coordinator validation. Persist includes encoding, hashing,
coordinator snapshots, stable writes, retention and certified-data update. Host
restore/validation occurs before phase counters. The 23.1% residual
must not be labelled entirely source polling or entirely physics. Existing counters
do not expose a cumulative whole-message total; last/max instructions cannot be
summed as if every message had that cost. Separate controller-query timing and an
in-flight publication create small endpoint uncertainty.

The source made 10 official Index calls, with no pending records or source error;
its admitted cursor stayed 39711127
because no eligible new payment arrived. Official Index sync advanced
39711193 → 39711456.
Treasury nonce rose twice; phase stayed Idle, no conversion/transfer occurred and
Ledger balance is 0 e8s. Existing smaller-world
PocketIC pacing/idle evidence is retained as historical context, not current-v5
fixed-cost calibration. No expensive mainnet probe or new instrumentation ran.

The release-native drill-down replays the captured certified v5 state 60 times per
row at budgets 128/512/1024. All state/events/scores output hashes match across
in-memory and checkpoint-resume paths. At budget 512, cursor restore/snapshot is
38.7% of combined raw-Step/checkpoint CPU time. That is native
CPU evidence, not a Wasm-cycle saving and not a proposal to raise production work
budgets. Existing PocketIC evidence demonstrates pacing/output invariance on its
separately identified fixture; no replacement world was installed on mainnet.

## Ranked proposal, before backend implementation

1. **Prototype reuse of immutable, already-validated cursor/coordinator bytes within a single message; reduce redundant canonical decode/encode, hashing and output revalidation without removing trust-boundary checks.** Step is the largest bucket; host.restore is before phase counters; DTR restore/propose/post-propose and kernel cursor/result repeatedly validate canonical snapshots. Native checkpoint codec accounts for 38.7% of combined raw-Step/checkpoint CPU time. Complexity: medium-high; likely B2Z/DTR internal interfaces, separate upstream review if DTR changes. State-preservation risk: medium; cache keyed by exact immutable commitment, discarded on mutation/upgrade; corruption and schema checks remain mandatory. Determinism: Exact public output and corruption/recovery equivalence required; no arithmetic, ownership or physics changes. Screening target: 10–30% (0.219–0.656T/hour).

2. **Reuse result/manifest/artifact encoding work across ready validation, Publish and certified observation preparation, keyed by exact cursor/seal hashes.** Publish estimated execution 0.414T/hour; Step also computes result/ready manifest and validation may recompute it. Complexity: medium-high. State-preservation risk: medium; never reuse across a different cursor/seal/publication; retain all exact certified bytes and historical formats. Determinism: Require byte-identical v8 publication, seal, state/events/scores, artifact chunks and replay. Screening target: 5–10% (0.109–0.219T/hour).

3. **Compare unchanged image chunks or reuse encoded descriptors before stable writes; retain identical coordinator snapshot bytes, key layout and atomic commit semantics.** Persist is a measured 0.192T/hour execution bucket, not pure storage rent; slot-0 coordinator image is rewritten each working callback. Complexity: medium. State-preservation risk: low-medium if stable layout is unchanged; interruption/upgrade/recovery tests are mandatory. Determinism: Logical output unchanged; durable image and publication integrity must remain equal. Screening target: 2–6% (0.044–0.131T/hour).

4. **After codec costs are isolated, profile and reduce exact rational-arithmetic allocations and repeated collision candidate calculations while preserving candidate order and tie-breaking.** Native raw simulation remains substantial; Step includes other costs, so no measured pure-physics cycle share is claimed. Complexity: high. State-preservation risk: medium-high due to event ordering and edge cases. Determinism: No floats/approximation, changed cell geometry or changed results; require full differential fixtures, torus seams, collisions and retained replay. Screening target: 5–15% (0.109–0.328T/hour).

5. **Defer source/treasury/timer tuning; investigate only the remaining residual after the dominant pipeline costs are reduced. Preserve exact polling, payment and funding behavior.** 10 Index calls / 10 minutes, no pending records; treasury nonce rose only twice, no financial operation or replenishment in the window. Historical empty-world PocketIC control is small but is not current v5 attribution. Complexity: undetermined; not justified as first optimisation. State-preservation risk: high relative to likely gain for payment/source changes. Determinism: No poll interval, source cursor, financial semantics or pacing change proposed.

Targets are not measured savings, cannot be added together and require a matched
Wasm/PocketIC cycle A/B before acceptance. Start with immutable-byte reuse at
existing trust boundaries; preserve all corruption/schema checks, exact publication
bytes and stable layout. Require deterministic equality across work budgets,
crash/resume/upgrade tests from the exact frozen production predecessor, source
and treasury recovery, toroidal collision/tie-breaking regressions, historical
replay, memory bounds and message-instruction headroom. No optimisation is implemented
or approved for deployment by this report. No DTR pin or authoritative rule changed.

## Funding-tier scenarios at this workload

| Tier | ticks/s | Projected T/hour | Gross ICP/hour to match observed last conversion yield | Entry→exit band hours |
|---|---:|---:|---:|---:|
| Normal | 1.00 | 11.203 | 5.866 | 0.89 |
| Cruise | 0.75 | 8.402 | 4.399 | 0.60 |
| Economy | 0.50 | 5.601 | 2.933 | 0.54 |
| Steady | 0.30 | 3.361 | 1.760 | 0.74 |
| Conserve | 0.20 | 2.241 | 1.173 | 0.45 |
| Survival | 0.10 | 1.120 | 0.587 | 0.45 |
| Lifeline | 0.05 | 0.560 | 0.293 | 0.89 |

All rows use the live run's one logical tick/publication and current three-ball
cost/tick, not the historical two-tick PocketIC fixture. Fixed overhead is folded
into the calibration; an independent current-v5 intercept is unavailable. Reserve
Protection is not a free operating tier: gameplay/admission can be gated, while
source/treasury and storage still cost cycles. No arbitrary-population or fragmented-
ownership sustainability is claimed. Receipts can add workload, making constant-
population projections optimistic. No prices, payments or pacing changes are proposed.

The last actual gross-1-ICP conversion credited 1.909909T, but receipts are
bursty. Between the pre-frontend-release treasury observation and this window,
3.826417T was credited from 2.00 ICP new receipts over
21.3 minutes. That burst averages 10.788T/hour;
it is not continuing revenue. **The measured 10-minute window had zero replenishment.**
At Conserve, the current-population nominal-rate projection requires roughly
1.17 gross ICP/hour at that observed conversion yield to
match expenditure. No future receipt or conversion is assumed for runway.

## Operational warning

Latest query liquid balance: **7.299T** at
2026-10-26T22:52:10.968397+00:00; Conserve supported 0.2 ticks/s.
Configured falling thresholds are **4T**, **3T**, **2.5T**. With no further receipts,
the workload-based scenario is about **1.47h to 4T**, **2.36h to 3T** after
the first downshift, and **3.26h to Reserve Protection** after both downshifts.
Callback-time message reserves and changing workloads can trigger policy transitions
earlier than this query-balance extrapolation. Do not treat the current healthy
state or an empty treasury as assurance of future funding. No funding, pause or
manual pacing action was initiated. No immediate threshold crossing was observed.

## Separate frontend source-integration PR

The exact published/deployed head remains e2fc63d6bc73b77e60c87f3b37134c7f9cc09abc,
two commits ahead of master 5899df61f0a5f540d91956dc5b6006ec708a5a1e, with no divergence.
The complete draft body/provenance is in `frontend-pr.md`; exact creation parameters
and [comparison link](https://github.com/aodl/balls-2-the-wallz/compare/master...feature/b2z-million-cell-visuals?expand=1)
are in `frontend-pr-request.json`. GitHub integration rejected creation with
403 “Resource not accessible by integration”; **no PR was created or merged**.
No credential or permission escalation was attempted. Preserve both commits and
prefer a user-owned fast-forward after a fresh ancestry check; require all six
substantive jobs on the exact resulting master head. Do not redeploy unchanged assets.

Raw controller samples, authenticated snapshots/certificates, local profile source,
build/result logs and historical benchmarks are in the independently checksummed
copy indexed by `raw-evidence.json`. Only reviewed summaries are committed here.
