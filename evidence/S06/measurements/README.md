# Measurement scope

`before.json` was executed against the manifest-verified S05 archive (SHA-256 recorded in CHECKPOINT.json). `after.json` was executed against S06. The same instrumentation script and scenario/budget combinations were used. Originals are never modified: the script patches only canonical encode/decode counters inside a temporary source copy.

Both the direct and orchestrated simulations are executed and all three output byte sequences are compared. The counters cover advancement only, excluding setup, publish, status and explicit exports. They count cumulative encoded/decoded bytes, not peak memory or network data. Timings are single-run diagnostics. These measurements do not establish Wasm performance, IC execution cost, cycles, ETH-equivalent compute or safe mainnet limits.

Reproduce S06 with `python3 -B tools/measure_runtime.py --output .work/codec-work.json`. To compare an original checkpoint use `--source /path/to/extracted/dtr-suite-S05`; no former archive is needed for normal S06 source tests.
