# S13 fixed fallback comparison

Normal application Wasm, unchanged game and independently clocked typed ledger reuse
S12's installed-Wasm fixture. Only fallback_seconds changes within each disposable
pair. Rates and latency use PocketIC virtual seconds; host duration is separate.

```sh
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s13.py --profile smoke --output .work/s13/smoke
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s13.py --profile extended --output .work/s13/extended --harness-target tools/s09-integration/target
```

Smoke: 32 seconds, no hints, 64 records every eight seconds, fallback 1/5.
Extended: twenty independent 128-second cases: eight primary cases (idle, 8, 32,
128 records/s), six no-hints controls, two fixed-512-backlog recovery cases at
8 arrivals/s, and a second primary trial of the 8/32 record/s pairs.

Each case has a 600-second host timeout, configurable within 30–1200 seconds.
Compile before starting the owned server. Save partial observations after every
virtual second and validated summary after every case. Never reuse output directories.
No per-page sync or per-segment controller stepping. No production/test endpoints added.

Current traces bind source, normal Wasm, dependency, fixture, harness, runtime and
cost configuration. Pair validation rejects differences besides fallback. Latency
includes all relevant records, including censored records. Each captured history
is replayed independently against native outputs; two different policies need not
seal identical histories. Empty-poll counts are observational classifications.

Cost projections explicitly reuse S12 query samples only with identical normal
Wasm and workload. They project actual finite-window initiated calls, callbacks
and publications; payload sizes/residual costs remain assumptions. Sample ranges
are partial illustrations, not complete-update limits or measured cycle burn.
