# B2Z fiduciary cycle optimisation — local engineering result

Started 27 October 2026. This is a local engineering candidate, not production sign-off.
The existing 34-node fiduciary subnet, paid v5 world and deployed visual frontend
are unchanged. No mainnet mutation, payment, funding, setting/controller change,
remote Git write or DTR publication was performed.

## Decision and operating condition

**Operational warning:** at 2026-10-28T01:03:14.644872+00:00, liquid cycles were **2.420881T**, total **2.567739T**. The observed total/liquid deduction was 146.858B cycles. Selected mode was **ReserveProtection**, supported rate 0 ticks/s, admission closed. The paid v8/epoch-2 v5 head stayed stationary; `running=true` does not mean gameplay advanced. Source cursor 39711127, no pending records or source/run error. Fresh IC-root capture and actual Ledger balance, treasury status, certified module/controller reads are in the raw evidence. Treasury is Idle with no new successful conversion. No positive replenishment was observed. The protected 3T reserve alone is short by **0.579T**, before any upgrade/maintenance allowance. **NO-GO for deployment at this balance.**

The current controller queries expose total and liquid balances but do not expose
a separate reserved-cycle figure. Their difference is reported as an observed
deduction, without claiming a fresh split between freezing and reservation. No
management update call was used to obtain a stronger balance breakdown.

Keep gameplay funding and qualification separate. Reserve Protection already
admits zero ticks: there is no remaining active-play runway at the observed
balance. The refreshed maintenance-only window debited **80,203,101,539 cycles in
14,883.382 seconds**, about **0.01940T/hour**, with zero gameplay ticks and zero
treasury credit. At an unchanged rate, current liquid would last about **124.8
hours to zero liquid**; this is not an availability guarantee. It is not the
historical active three-ball burn. No future conversion is assumed. The observed
zero Ledger balance cannot fund continuing active operation. A hypothetical
successful upgrade does not fix this operational funding condition.

The selected normal local candidate is SHA-256
`0d86ac6414a8c921f8b1eb0c53890503815b643a0510adeeaa60aeb56d537f7d`.
It combines B2Z `d6c2e593e90fd75d64ed8b6d8b4e39da56a35165` and local, unpublished
DTR `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68` (`0.14.1-cost.1`). The checked-in
production Git pin remains `e1bfcf25071d11190d14f461288e12a21ca26cf8`; all four
locks are restored by the explicit development override. The unchanged npm
0.14.0 archive is SHA-256
`ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`.

Release CI for this combined source pair is BLOCKED pending user-owned DTR
publication, an immutable consumer pin and exact-commit B2Z publication. A1's green
CI is not A2 CI. Treat the new private execution/proof implementation conservatively
as Class B for promotion review; externally observable Class A equality is tested.
There is no stable-layout migration or Class C implementation.

**Sustained browser gate: FAIL.** The unchanged **900.031-second** window recorded
**14 sampled stalls, 5 resynchronisations and rebuffering**. Independent producer
bounds were **0.987744–0.995522 ticks/s**; admitted/displayed rates were
**0.895525 / 0.888529 ticks/s**. Normal remained selected without adaptive limiting.
Rate, stall/rebuffer, resynchronisation and buffer-accounting checks failed.
The complete window is preserved without trimming, restarting or favourable-repeat
selection. The short isolated test passed, as did the subsequent Economy, Lifeline,
cold reconnect and five-publication extended recovery checks. They do not replace
the failed long gate. **This candidate is not release-qualified.**

Existing proxy traces show response-header tails up to **13.53 seconds** for
retained publications and **14.45 seconds** for artifact bundles, plus one proxy
502. These observations correlate with resynchronisations; they do not establish
a cause or distinguish backend, gateway and host effects. See
[the bounded delivery diagnosis](delivery-diagnosis.json). No additional workload,
source correction or acceptance change was introduced for this diagnosis.


## Fixed baselines and methodology

| Anchor | Source | Exact normal Wasm SHA-256 |
|---|---|---|
| A0 | frozen installed production release | `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51` |
| A1 | `b2955d694968c056a638b2bb1f88c544a6b2211d` | `fec372ec5afe5787e5fa5573c18b1d5d16201166d244a9602b276e7cee88c03b` |
| A2 | B2Z `d6c2e593…` + DTR `77ba46c…` | `0d86ac6414a8c921f8b1eb0c53890503815b643a0510adeeaa60aeb56d537f7d` |

A0 and A1 are preserved binaries, never replacements rebuilt from their source.
The independent A1 snapshot's 812 checksums were checked; the investigation
snapshot was checked separately. A1 exact-commit CI 40555604193 completed SUCCESS,
including all six substantive jobs. Dedicated ignored A/B and recovery cases were
explicitly rerun and passed, including authentic v8 paid-state recovery; generic
integration CI is not offered as proof they ran.

Cost comparisons use pinned PocketIC, official local Ledger/Index Wasms, a
fiduciary subnet fixture, identical clocks/inputs and normal uninstrumented modules.
The independent oracle harness uses immutable old DTR and the stateless full-restore
kernel. It compares every completed publication with original native replay and
verifies the disposable-root certificate/artifacts using the unchanged JS SDK.
Separate recovery runs create genuine paid v8/epoch-2 fixtures through valueless
local Ledger payments and upgrade the exact A0 module; these are not fabricated
mainnet payments or copies of mainnet financial state.

The initialized v5 cost profiles begin with a valid **v6 genesis publication**;
their geometry/state content does not make them authenticated v8 fixtures. Only
the separate paid transition/recovery fixtures claim **v8 / epoch 2**. All three
modules share the same snapshot, clock and inputs within each paid trial; separate
trials create fresh local payment histories and may have different timestamps.
The unchanged four-ball long-browser fixture also initializes a v5 world with a
v6 catalog; it is not represented as a paid-v8 browser scene. Paid-v8 certification,
byte equality and replay use their separately identified exact-predecessor fixtures.

Balances bracket the start/stop operation and complete tick prefix. Existing
callbacks are drained without advancing virtual time; treasury credits and storage
reservations are recorded or excluded. Per-publication balance readings can contain
later reservation refunds and are signed, rather than mistaken for independent
charged instructions. Whole-window total-cycle deltas are the cost measure.
Per-phase instruction counters are diagnostic scopes, not separately billed costs.
Runtime driver messages, source calls, memory capacity and cold/sample deltas are
retained in raw JSON. System/CDK callbacks and allocator counts are not observable
from those counters. An isolated allocator diagnostic is reported separately;
see limitations below.

Initialized captured-state profiles explicitly pause treasury locally to exclude
artificial conversion credits. The empty/Reserve quiet fixture also has a paused
disposable treasury. They measure actual backend debit for those matched windows,
including source work, rather than a complete active-treasury production cadence.
Authentic paid-v8 upgrade/recovery and the separate financial suite exercise the
unpaused treasury and genuine local Ledger/CMC activity. The model below retains
this limitation; the live quiet-maintenance observation is a separate measurement.

## Measured results

The genuine paid-v8 **64-tick** exact-predecessor run used **58,269,955,217 cycles**
for A2, versus **105,499,077,279 for A1** and **182,308,539,204 for A0**:
**44.77% incremental** and **68.04% aggregate** savings on that matched window.
This is about **0.91047B actual local cycles per completed tick/publication**.
Its authenticated state, publications, retained artifacts and full financial
control comparison match. It crosses the retention capacity repeatedly; it is
not a long-term production burn measurement.

| Workload | A0 cycles/tick | A1 cycles/tick | A2 cycles/tick | A1→A2 saving | A0→A2 saving |
|---|---:|---:|---:|---:|---:|
| final-cost-capture-1 | 2,861,076,426 | 1,620,462,070 | 933,247,293 | 42.41% | 67.38% |
| final-cost-small / 2 balls | 1,234,662,119 | 843,425,429 | 533,197,738 | 36.78% | 56.81% |
| final-cost-small / 3 balls | 2,249,651,252 | 1,532,517,039 | 879,016,970 | 42.64% | 60.93% |
| final-cost-small / 4 balls | 3,528,516,357 | 1,937,161,474 | 1,119,173,172 | 42.23% | 68.28% |
| final-paid-paused-1 | 2,338,740,034 | 1,629,745,876 | 913,682,787 | 43.94% | 60.93% |
| final-paid-long | 2,848,570,925 | 1,648,423,082 | 910,468,050 | 44.77% | 68.04% |
| final-cost-population-8 | 6,205,671,460 | 3,872,045,786 | 1,974,485,256 | 49.01% | 68.18% |
| final-cost-population-16 | 10,631,450,594 | 7,141,411,042 | 4,169,545,408 | 41.61% | 60.78% |
| final-cost-population-32 | 20,219,045,380 | 18,634,934,537 | 8,620,044,072 | 53.74% | 57.37% |
| final-cost-population-64 | 38,673,751,388 | 37,703,030,245 | 17,445,006,267 | 53.73% | 54.89% |
| final-cost-fragments-128 | 3,229,973,886 | 1,827,709,032 | 1,070,616,168 | 41.42% | 66.85% |
| final-cost-fragments-2048 | 11,097,717,302 | 8,260,575,060 | 4,556,292,528 | 44.84% | 58.94% |
| final-cost-fragments-8192 | 38,404,674,116 | 38,415,641,146 | 23,616,329,302 | 38.52% | 38.51% |

All three captured-state eight-tick repeats were identical. The paid-v8 64-tick run starts at a paused publication boundary with no unfinished stage. Its different trajectory is reported separately from initialized captured-state profiles; unfinished recovery costs are not pooled as complete-tick costs. Cold/individual publication balance samples and memory/callback counters are in measurements.json; these can contain reservations/refunds and varying trajectories. Caches are cold on every new coordinator/message, not a cross-message warm cache. Compilation/install costs are outside the tick window.

Authentic paid-v8 eight-tick repeats: **43.9370–43.9377% incremental saving versus A1**. Actual whole-window ranges were A0 18,709,833,940–18,710,171,845; A1 13,037,880,676–13,038,218,582; A2 7,309,431,020–7,309,531,148 cycles. These are three bounded fresh-fixture trials, not a production confidence interval.

| Captured three-ball / 8 ticks | A0 | A1 | A2 |
|---|---:|---:|---:|
| Whole-window actual cycles | 22,888,611,410 | 12,963,696,560 | 7,465,978,344 |
| Driver messages / source calls | 15 / 1 | 8 / 1 | 8 / 1 |
| Linear heap capacity after (bytes) | 3,014,656 | 3,342,336 | 3,735,552 |
| Stable capacity after (bytes) | 33,619,968 | 33,619,968 | 33,619,968 |
| First-publication signed balance delta | 2,185,688,009 | 1,450,318,527 | 890,587,249 |
| Mean later-publication signed balance delta | 2,953,084,779 | 1,640,232,621 | 934,952,387 |
| Remaining operation tail cycles | 31,329,949 | 31,749,684 | 30,724,388 |

The first/later rows are balance observations along an evolving deterministic trajectory, including outstanding-response reservations/refunds; they are not independent billed-tick or cache-warm microbenchmarks. The total row brackets the complete operation. Storage reservation balances are zero at both ends. Linear/stable capacities are high water, not live allocated bytes. All source/treasury/native arithmetic and timeline schedules remain identical inputs.

Only ratios computed from matched complete windows are used. Incremental A1→A2
and aggregate A0→A2 savings are separate, never added. Repeated deterministic
samples demonstrate reproducibility for these fixtures; they are not a confidence
interval for arbitrary production trajectories or the HTTP upstream delivery tail.
The 64-tick paid-v8 recovery run crosses retention capacity repeatedly; it is a
bounded accumulation check, not a multi-day heap soak.

## Changes accepted and experiments rejected

1. DTR `dc843d3…`: preallocated lowercase hex lookup instead of allocating a
   formatter per byte; every byte and realistic large fields remain identical.
2. DTR `ba25231…`: direct canonical JSON writer after the same recursive validation,
   depth/node/length limits, integer/rational checks and serde escaping. It sorts
   keys when `preserve_order` is enabled. The old writer is a differential oracle.
3. DTR `f82baa6…`: reuse the exact validated committed head, identity, epoch and
   acknowledgement inside one coordinator operation. Full checks remain on misses.
4. DTR `1a0548b…`: full typed Record equality keys a bounded validated-record and
   encoded-snapshot proof. Public mutation, including same-revision mutation, cannot
   inherit validation. Errors clear the DTR proof; oversized records use the original
   uncached path. Proposals remain isolated clones; ordinary Rust Err cannot commit
   a partially mutated record.
5. B2Z typed session, isolated original `f97ff37…`, integrated `c86f9cc…`: every
   external cursor has the original full canonical/hash/schema restore. A private
   typed proposal is cloned, stepped by the unchanged engine, checked by the same
   invariant routine and encoded canonically before reuse. There is no mutable
   typed-state accessor or cross-await/cross-message cache. Every continuation is
   differentially compared to full stateless restore, including historical fixtures.

6. B2Z `fae11d8…`: retain the same bounded operation cache for up to 1 MiB of
   cursor/output data. A1 stays frozen at 256 KiB; the DTR head/record proofs stay
   at 256 KiB. Public wire/image/artifact limits and the uncached fallback are
   unchanged. The isolated 64-ball screen saved a further 41.31% versus the 256 KiB
   combined candidate, with 786,432 additional bytes of linear-memory capacity.
7. DTR `77ba46c…`: restore the published native `Sync` and unwind-safety contract.
   The earlier RefCell proof implementation failed an explicit external trait
   regression; bounded mutex-protected optional proofs pass. Native panic poisoning
   discards proof copies and repeats full validation. The independent original and
   corrected consumers produce the same snapshot hash and concurrent results.

The earlier combined normal Wasm `10b266b7…` / source `677a864c…` + DTR `1a0548b…`
remains an immutable intermediate baseline; its successful full local suite and
negative screens are preserved. It is not substituted for final-artifact checks.

Stage measurements are in [measurements.json](measurements.json). These are combined-prefix measurements,
not independent percentages that can be added. The B2Z-only typed-session screen
with immutable old DTR was also measured, separating local benefit from upstream work.

Rejected experiments remain on separate branches with source, Wasms and raw logs:

| Experiment | Outcome and disposition |
|---|---|
| Compare stable chunks before writing (`0d3d6d6`) | 0.015% worse than A1; excluded. Comparison work outweighed avoided writes. |
| Rust opt-level 2 instead of 3 | 0.27% worse on the matched head-memo screen; excluded. LTO and overflow checking unchanged. |
| Exact checked i128 rational fast path (`042d08d`, DTR) | 1.65% incremental screen gain, insufficient for its additional arithmetic complexity; excluded. Arbitrary-precision production arithmetic unchanged. |
| Bounded ownership-validation proof (`91026a1`) | About 2% beyond A1; excluded as insufficient benefit for another invariant-proof mechanism. |
| Next-crossing memo (`0a9ec5b`) | 3.38% beyond A2 on the captured three-ball workload, exact replay PASS; excluded because another engine cache is not justified for that gain. |

The discrete strike-filter experiment (`7721565…`) also preserved exact outputs but produced no material three-ball or 64-ball gain; it is excluded.

Some early exploratory builds exposed a development-tool defect: blanket Cargo
update refreshed unrelated package versions. These results/logs are retained and
superseded for final qualification. The override now updates only the four named
DTR packages and verifies every other name/version/source/checksum, including
multiple versions, is unchanged. Final selected builds and comparisons use the
strictly preserved graph. A failed ownership build's stale copied artifact was
quarantined and never benchmarked. Earlier harness faults and the resolved browser
library-path blocker are retained; no failed run is silently relabelled PASS.

Operational counters, timing and root revisions can differ because callback counts differ. Equality claims concern authoritative state, events, scores, seals/manifests, publication commitments and retained bytes—not cycle balances, entire private stable images or certificate timestamps/signatures.

## Hotspot ledger and attribution limits

| A2 scope | Instructions / 8 ticks | Tariff equivalent cycles | % actual debit |
|---|---:|---:|---:|
| step | 1,608,988,628 | 4,208,124,104 | 56.36% |
| publish | 245,732,182 | 642,684,168 | 8.61% |
| persist | 306,680,037 | 802,086,251 | 10.74% |
| seal | 129,644,994 | 339,071,523 | 4.54% |
| Unattributed after those non-overlapping scopes | Not measured | 1,474,012,298 residual | 19.74% |

Representative A2 driver peak: 334,014,536 instructions versus 604,267,875 for A1 and 768,702,951 for A0. Driver messages fell from 15 to 8/8. This is not a complete count of IC/CDK/source/financial callbacks. Normal linear-memory capacity and stable-memory high water are separately tabulated in the machine-readable measurements.

Instrumented intermediate builds distinguish root decode, image read/hash,
Coordinator restore, typed cursor restore/snapshot, simulation, output materialisation,
publication preparation and root encoding. They showed tens of millions of
instructions in repeated cursor decode/validation and approximately 15M in
publication preparation; root decode was around 0.6M. Coordinator restore is an
inclusive parent scope: its cursor children are not added to it. These diagnostic
builds are not the performance artifacts. Allocation diagnostics and complete
platform-message visibility are distinguished from normal-Wasm cycle debits.
Final normal rows record artifact lengths, memory capacities and existing phase
counters. Complete encoded/decoded/hashed/stable-written byte-operation totals
were not added to normal Wasms; intermediate diagnostic samples are bounded scopes,
not a complete final byte ledger. No unseen residual is assigned by inference.
The isolated `07e1926…` allocator probe counted 110,022/110,441 allocations and 8,704,870/11,704,956 requested bytes for two representative callbacks, with 1,845,650/2,225,631 peak live requested bytes. This includes successful reallocations and excludes the final destructor/logging tail; it is not physical allocator fragmentation or an A0/A1 allocation comparison. Its cycle debit is excluded. Unsafe System-allocator forwarding is confined to that diagnostic branch; the selected normal candidate retains its original `forbid(unsafe_code)`.

After the selected changes the largest measured phase remains Step, followed by
persistence/publication and pre/post-phase work. The failed ownership/arithmetic
screens do not justify changing physics, exact scoring or event scheduling.
No lazy-score cursor migration, stable object-store/ring migration or cross-message
heap cache was incorporated without demonstrated value and recovery proof.

Lazy scoring, a retained-artifact ring/object-store migration and a cross-message
heap cache were **not prototyped** in this bounded programme. Their savings are
unmeasured. Lazy scoring needs an additional proof of exact error/observation
boundaries; the storage/cache alternatives require broader crash/invalidation
coverage. The isolated arithmetic, ownership and next-event screens did not
justify that complexity for this frozen candidate. The unresolved sustained
qualification gate is a stopping point, not a claim that every future safe
optimisation has been exhausted.

## Correctness, recovery and qualification

| Gate | Outcome |
|---|---|
| A1 exact-commit CI | PASS: Run 40555604193, six substantive jobs; not A2 evidence. |
| A1 explicitly invoked ignored A/B and recovery | PASS: Frozen normal binaries; dedicated operation_cache_profile, exact predecessor and authentic paid v8. |
| Final source | PASS: 17 groups; exact D6 source / DTR77 where applicable. |
| Final native | PASS: 11 groups; exact D6 source / DTR77 where applicable. |
| Final wasm | PASS: 5 groups; exact D6 source / DTR77 where applicable. |
| Final browser | PASS: 1 groups; exact D6 source / DTR77 where applicable. |
| Final matched normal-Wasm matrix | PASS: 19 invocations: three repeat captured profiles, 0/2/3/4/8/16/32/64 balls, admissible fragmentation, quiet maintenance, three paid-v8 repeats, 64-tick paused-boundary paid run, in-flight and NotifyPending recovery. |
| Initial final-source installed aggregate | FAIL: One unchanged 90-second browser test had 12 stalls / 2 resynchronisations under competing LLVM/PocketIC load; all other executed checks passed. Raw aggregate remains FAIL. |
| Unchanged isolated 90-second browser | PASS: Executed separately against the same source pair and normal Wasm; no acceptance thresholds changed. |
| History replay skipped after failed aggregate | PASS: Executed separately against the same source pair and normal Wasm; no acceptance thresholds changed. |
| 900-second Normal / Lifeline / cold reconnect | FAIL: Executed unchanged; the actual sustained result is preserved. A failed continuous-playback gate is unresolved, not waived. |
| Installed composite resolution | FAIL: The isolated short repeat and explicit history replay passed. The sustained result determines this gate; an initial failed aggregate is also preserved. |
| Checkpoint and allocator traps | PASS: Six write/certification stages and three forced allocation thresholds, plus controls: authenticate before retry; all paid/source/finance/retained state and resumed outputs match. Diagnostic modules only. |
| Generic DTR and independent consumers | PASS: Original JS 200 tests; Rust workspace, formatting, clippy; preserve_order; non-B2Z Rust/npm consumer; native original/new concurrency and snapshot equality. |
| Normal artifact / reproducibility | PASS: Two initially empty target directories reproduce 0d86ac64; no test hooks or profiling exports, Candid unchanged. |
| Strict 600M headroom for every stress workload | NOT_ESTABLISHED: Representative three-ball driver peak 334M; large populations and fragmentation exceed the unchanged between-action yield trigger. Final response/destruction tail is outside the counter. Do not claim universal latency/headroom qualification. |
| Complete platform callback / allocator / byte-operation accounting | NOT_ESTABLISHED: Normal total-cycle debit is measured. Driver/source counters are partial; allocator probe is A2-only and scoped, not full A0/A1/A2 allocations or platform message tracing. Final artifact sizes and diagnostic byte scopes do not establish complete final encoded/decoded/hashed/stable-write totals. |
| Exact final upstream publication, immutable pin and six-job CI | BLOCKED: User-owned remote actions prohibited in this task. DTR77 remains local; production Rust/npm pins are not silently changed. No old CI is borrowed. |
| Production release authority and protected reserve | BLOCKED: No production deployment authorized; live liquid is below the protected 3T reserve even before upgrade/maintenance allowance. Class B review and fresh budget required. |

The memos retain immutable copies and exact byte/digest identities. Invalid UTF-8,
empty/noncanonical input, wrong commitments, duplicate/unsorted/reserved keys,
integer/rational limits, malformed hex, schema/source/epoch/manifest corruption and
oversized objects continue through the existing rejection tests. Returned output
copies cannot mutate cached state. >1 MiB cursor/output and >256 KiB DTR proof entries fall back
to uncached behaviour. The limits bound encoded data, not all Rust heap
objects. Memory capacity is measured separately. Three forced allocation thresholds in the isolated diagnostic module produced genuine Rust OOM traps; each preserved authenticated paid state, source cursor, treasury identity and retained bytes, then recovered to the matched control after inspection and an explicit local restart. These are message-rollback rehearsals, not native catchable allocation errors or an exhaustive near-4GiB heap stress.

The 512 Step cap, 600M instruction yield, MAX_ACTIONS=8 and MAX_WORK=2048 are
unchanged. 511/512/513 requests are tested with the real clamp at 512: 513 is not a
larger unconstrained Step. The yield is checked between actions, so an individual
expensive action and final persistence can overshoot it; the IC hard limit is not
an acceptable performance target. Large population/fragmentation results and any
headroom failure are reported explicitly rather than hidden behind equal outputs.

Checkpoint faults use a test-hooks module only, never a deployment artifact. The raw wrapper receipt
labels its checked A0/A1/A2 input arguments as normal even in fault mode; that
label does not describe the executed fault module. The reviewed measurements
explicitly record each actual diagnostic hash and exclude these cases from cycle
savings. The immutable raw receipt is preserved, rather than rewritten.
A trap rolls back that message, not earlier messages around an await; payment
callback leases/fences remain unchanged. Local snapshot restoration cold-upgrades
the same module to restore CDK timers. After a deliberately trapped one-shot game
timer, the fixture explicitly pauses/starts locally before retry: idempotent
start while already marked running does not re-arm the consumed timer. This is
not an automatic production repair or rollback. [IC message atomicity](https://docs.internetcomputer.org/references/message-execution-properties/).

Two fresh empty-target normal builds match the frozen A2 hash. Rust 1.94.1,
locked dependencies, opt3, LTO, checked overflow and immutable npm input are
recorded. The independent generic Rust/npm consumer passed against a Git archive
of the exact local DTR revision; the fixture's historical “remote” text does not
mean the unpublished revision is remotely available. Rust + original JS generic
DTR suites, preserve_order and canonical adverse corpus passed.

## Fiduciary operating model

The backend's IC-root-verified subnet-key response contains 34 node keys. Execution
estimates use the official 34/13 multiplier: 13.077M base cycles per update and
2.615 cycles per Wasm instruction, with storage, ingress and Xnet separate.
No subnet relocation or security reduction is a saving. [Current tariffs](https://docs.internetcomputer.org/references/cycle-costs/), [subnet types](https://docs.internetcomputer.org/references/subnet-types/).

| Tier / tick rate | Entry / exit liquid T | Historical A0 T/h model | A2 ratio / quiet-held / residual-held T/h | Gross ICP/h ratio–residual scenarios |
|---|---:|---:|---:|---:|
| Lifeline / 0.05 | 3 / 2.5 | 0.560 | 0.183 / 0.196 / 0.273 | 0.096–0.143 |
| Survival / 0.1 | 3.5 / 3 | 1.120 | 0.365 / 0.378 / 0.545 | 0.192–0.286 |
| Conserve / 0.2 | 5 / 4 | 2.241 | 0.731 / 0.744 / 1.091 | 0.383–0.571 |
| Steady / 0.3 | 10 / 7.5 | 3.361 | 1.096 / 1.109 / 1.636 | 0.574–0.857 |
| Economy / 0.5 | 15 / 12 | 5.601 | 1.827 / 1.840 / 2.727 | 0.957–1.428 |
| Cruise / 0.75 | 25 / 20 | 8.402 | 2.741 / 2.754 / 4.090 | 1.436–2.143 |
| Normal / 1 | 40 / 30 | 11.203 | 3.654 / 3.667 / 5.453 | 1.914–2.857 |

These are scenarios, not confidence bounds or guaranteed upper limits. The cautious residual-held scenario leaves the historical 23.13% unattributed cost unchanged and scales only each measured instruction phase by its matched A2/A0 phase ratio. One conversion/hour and 0.0001 ICP per conversion are assumed for the gross column. No conversion is initiated. The prior treasury has converted 6.1993 ICP and credited 12.11027282T in total; it provided zero replenishment in the new health window.

The accepted production study measured 3.111941B cycles/tick and 2.186615T/hour
at 117 ticks/599.442 seconds, with no replenishment. The forecast applies the
matched local cost ratio to that workload only; it is not a measured production
saving. A separate fixed-cost sensitivity keeps quiet maintenance unchanged.
The table assumes exactly 3,600 × rate completed ticks/hour. Thus its 0.2 row
uses 720 ticks/hour and an A0 model of 2.241T/hour; the original observation
completed about 703 ticks/hour. Applying the local ratio to that observed
throughput instead gives about 0.713T/hour, still only a projection.
PocketIC's replica build/configuration, virtual timing and call scheduling differ
from mainnet. The 23.1% unattributed historical cost remains unattributed; it is not
assigned to source or treasury by assumption. The current quiet maintenance debit
cannot establish the fixed component of active operation.

The observed CMC rate is 1.9089T/ICP, not a guaranteed future exchange rate.
Gross ICP includes the stated conversion-fee assumption; there is no income promise.
The prior 6.2 ICP lifetime receipts and treasury conversions are historical, not a
sustainable hourly replenishment rate. No receipts arrived during this programme's
health window and the current spendable balance is zero.

## Remaining decisions and guarded future procedure

The historical HTTP-upstream delivery-tail risk remains open; this work does not
claim to eliminate it. High-population/fragmented actions still exceed the
between-action yield trigger, even though their measured costs improve and their
outputs match. Complete platform callback/allocation attribution and a multi-day
soak are not established. These limitations accompany the candidate into review;
the local savings are not unconditional production sign-off.

- Resolve the failed unchanged continuous-playback gate with a bounded matched
  baseline/candidate delivery comparison before claiming release qualification.
  The existing proxy/publication correlation is diagnostic, not proof of cause.
  No repeated favourable-window selection or acceptance change is proposed.
- Review the private typed/proof implementation as Class B, publish reviewed DTR
  through the user-owned release process, then deliberately pin the immutable Rust
  revision and qualify clean consumers and all six substantive exact-commit B2Z CI
  jobs. Refresh frozen normal artifacts if release inputs change. No remote push
  is needed or authorized merely to manufacture CI evidence.
- Publication batching, changed `segment_ticks`, compressed trajectory events or
  a new catch-up protocol remain Class C analysis only. Less publication work is
  a modelled opportunity, not a measured saving: batching changes seal/
  payment assignment, certification bytes, observer latency and retained duration.
  Sixteen one-tick publications cover 16/r seconds; batching k ticks would cover
  about 16k/r seconds and add up to (k−1)/r seconds of certification delay. Source
  admission must be analysed, not assumed identical. In the representative A2 run,
  Publish accounts for about 8.6% of tariff-scaled scoped instructions relative to
  total debit. Halving/quartering only that work models roughly 4.3%/6.5% of total
  cost, excluding changed fixed/persistence costs and new overhead. At 0.2 tick/s,
  k=2/k=4 would add up to 5/15 seconds and extend nominal retention to 160/320
  seconds from 80. Those are arithmetic scenarios, not measured cycle savings.
  Existing v5 limits deliberately enforce one-tick publications; event compression
  and multi-tick seals require separately versioned wire/client and recovery work.
  No such change is implemented.
- A future mainnet preflight must independently authenticate the then-current paid
  v8 world, all accounts/receipts/credits/scores, source/Index fence and cursor,
  treasury phase/leases and all retained artifacts; verify existing IDs/controllers,
  exact installed predecessor `7c078fb3…`, approved candidate and independent backup.
  Require a fresh whole-operation/recovery allowance plus protected reserve, not
  an automatic Normal/40T threshold. Present the quantified budget for new approval.
- Only new explicit deployment authorization may permit a gameplay-only pause and
  empty-argument state-preserving upgrade of the existing backend. Compare all
  preserved bytes/paid/source/treasury state and authentic roots before resuming,
  test source/treasury deadlines and cold reconnect, then observe funded-tier pacing.
  No world transition, reinstall, reset, frontend redeploy, financial action or
  controller change is part of that procedure. Stop on any mismatch or inadequate
  reserve; never attempt an unqualified downgrade.
- The deployed visual commit `e2fc63d6…` is already an ancestor of this branch.
  Remote master remained `5899df61…` on refresh. Any separate user-owned source
  integration must preserve that visual history. No production frontend asset was
  rebuilt or redeployed; browser checks build disposable local bundles only.

## Reproduction and independent evidence

Raw workspace: `/home/codexdev/src/b2z/.work/fiduciary-optimisation`. Independent read-only snapshot: `/home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027`.
Its `SHA256SUMS` SHA-256 is `2e2482f5d4f380836aa172c8214e213ed67df715cc34f1b6584873b8ef608288`; **7255 files** were read and verified before freezing. The original snapshots remain independently verified (51 investigation files, 812 A1 files). Source archives, thin Git bundles with stated baseline prerequisites, negative diffs, normal/diagnostic Wasms, exact commands/exits, certificates and all failed/superseded logs are preserved. Build caches, dependencies and private identity material are excluded.

```sh
cd /home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027
sha256sum --check SHA256SUMS
# In the preserved B2Z checkout, with the exact DTR Git revision available locally:
cd /home/codexdev/src/b2z
python3.11 tools/build_cost_experiment.py --output .work/reproduction-normal \
  --dtr /home/codexdev/src/dtr-b2z-cost-sync \
  --revision 77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68
python3.11 tools/verify_operation_cache.py \
  --baseline /home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027/raw/baselines/A0.wasm \
  --a1 /home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027/raw/baselines/A1.wasm \
  --prototype /home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027/raw/final-selected-normal/normal.wasm \
  --fiduciary --capture /home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027/raw/fixtures/health-state.bin \
  --counts 3 --ticks 8 --output .work/reproduction-cost
```

A build without the explicit DTR override is not the measured A2: the production manifest still pins E1. Restore the exact source pair above for reproduction.

The reproduction override verifies the exact local DTR HEAD, uses locked dependencies and restores all production locks. The original counter-oracle harness is frozen separately; `final-matrix-progress.json` records its checksum and every actual invocation. Recovery, faults, pending finance, zero/quiet and browser commands are retained alongside their raw outputs. No command here connects to mainnet.

[Fresh production health](production-health.json), [artifact identities](artifacts.json), [all measurements](measurements.json), [qualification](qualification.json), [operating scenarios](economics.json), [changed files](changed-files.json), [snapshot receipt](SNAPSHOT.json). The final report/status commit changes documentation/evidence only; functional source and normal Wasm stay identified by the source pair above.
