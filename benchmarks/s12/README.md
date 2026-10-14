# S12 benchmark inventory

This directory defines the bounded operating-envelope measurements for the existing BTZ v3 service. It does not change game rules, public Candid, stable-memory IDs, publication v6, animation v1 or the DTR dependency.

## Workloads

`workloads.json` is generated deterministically by `tools/generate_s12_fixtures.mjs`. Each row records rule/config/schema hashes, canonical initial state, sealed source positions, logical interval, two work budgets and expected state/event/score/ownership hashes.

| Fixture | Purpose | Legal occupancy |
|---|---|---|
| `small-reference` | Existing admission-sized reference | 2 final cannons / 2 balls |
| `empty-motion` | One existing ball, 32 logical ticks, no new input | 1 / 1 |
| `ball-dense-medium` | Dense motion and frontier interaction | 2 / 32 |
| `ball-dense-high` | Actual global ball cap | 2 / 64 |
| `many-cannon-frontier` | Adjacent ownership/frontier competition | 32 / 32 |
| `fragmentation-severance` | Narrow connection and component cleanup | 1 / 1 final |
| `collision-intensive` | Near-simultaneous opposite strikes | 0 / 0 final |
| `spawn-admission-pressure` | Underfunded, competing and search-capped admissions | 6 / 6 final |
| `multi-segment-persistence` | Seed for repeated commit/publication/retention work | 2 / 2 |

The actual implementation limits are 32×32/1,024 cells, 32 cannons, 64 balls, 32 balls per cannon, 4,096 sealed inputs, 64 ticks per segment, 8 spawn searches per segment and 131,072 audit events. No fixture raises those limits. The two work budgets produce identical authoritative bytes.

## Measurement definitions

- `work_units` are deterministic BTZ kernel units. They are not Wasm instructions.
- `instructions` are canbench performance-counter instructions for the named operation.
- `heap_increase` and `stable_memory_increase` are 64-KiB pages grown during the benchmark query. They are not peak or live payload bytes.
- PocketIC stable-memory samples are serialized stable-memory length, not heap use.
- Local elapsed time is host/PocketIC timing, not mainnet latency, finality or capacity.
- Candid reply bytes are the controlled fixture's encoded response bytes, not a packet capture.
- Cost projections apply dated public tariffs to measured counts. They are not observed production cycle burn.
- Missing metrics are recorded as `NOT_MEASURED`; zero is never used as a substitute.

canbench 0.7.0 runs only in a dedicated `canbench` feature build. Normal Candid rejects benchmark/tracing/test exports. `certified_data_set` cannot execute in canbench's non-replicated query mode, so persistence benchmarks measure the production snapshot/publication/stable-write path with only that system call disabled and name the exclusion.

## Reproduction

```sh
npm ci --ignore-scripts
node tools/generate_s12_fixtures.mjs --check

# Bounded smoke tier.
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s12.py \
  --profile smoke --output .work/s12/smoke

# Extended normal-Wasm PocketIC, ledger and cost tier.
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s12.py \
  --profile extended --output .work/s12/extended
```

The smoke profile runs the complete deterministic fixture matrix plus the
cold first-step plus new-root persistence microbenchmark and all-irrelevant ledger-page canbench cases.
The normal CI workflow runs this tier. The extended tier adds fresh normal Wasm,
PocketIC autonomous progress, repeated controlled-ledger traces, the pinned
upstream ledger/archive case and cost projections; it is intentionally manual.

The extended runner snapshots normal Wasm, compiles the test binary before starting the idle-timed PocketIC server, applies explicit per-case timeouts, saves partial results after every case, and terminates only its owned server process group. Omit `--harness-target` for a fresh target; the optional argument exists only for deliberate local reuse.

`canbench_results.yml` is the deterministic regression baseline. `cost-assumptions.json` records the tariff retrieval date, official URLs, replication assumptions and model qualifications. Original results remain immutable under `evidence/S12/` and `checkpoints/S12_REPORT.md`. Current closeout results are under `evidence/S12/closeout/`, interpreted by `checkpoints/S12_CLOSEOUT.md`; the current cost assumptions are `closeout-cost-assumptions.json`.

## Corrective capture and interpretation

The runner creates per-process configurations and uses `--persist --csv`, writing `current-N.yml`/`.csv` only inside the specified output directory. Smoke's two processes use different files. Use a new empty directory for each run; existing current results are rejected. The committed result files remain historical baselines. Direct canbench persistence with the committed configuration would update that baseline and is not the normal capture workflow.

`current-measurements.json` binds raw results to source, fixtures, budget, logical interval, tool/runtime and Wasm. The instruction regression gate compares structured values at 2%; hosted elapsed time is informational. New warm cases have no historical baseline and make no regression claim. The cost CLI requires this manifest and never defaults to committed historical values.

Extended adds warm existing-root operations, source-independent virtual-time ledger arrivals concurrent with autonomous simulation, idle/draining/overload scenarios, upstream-compatible ledger/archive functionality and corrected partial costs. Certification/timer dispatch are outside canbench query scopes. Manually driven page processing is distinct from autonomous service. The extended owned-server hard lifetime covers its declared case timeout budgets, while individual timeouts remain failures.

The declared eight-segment fixture now runs eight chained pure-kernel intervals at both budgets and eight coordinator snapshot/restore/publication intervals with bounded memory retention. Its first-interval golden remains unchanged; IC stable writes for that specific JS fixture are not measured.
