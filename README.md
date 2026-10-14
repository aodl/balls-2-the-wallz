# Balls 2 The Wallz — S12 corrective measurement closeout

BTZ is a continuously running, local-only Internet Computer game service that consumes the independently maintained Deterministic Timeline Runtime. S12 adds reproducible workload, canister-instruction, persistence, ledger-backlog, continuous-operation and tariff measurements without changing gameplay or the public interface.

**Live local IC — test-network certified. No mainnet deployment, wallet, real funds, payout or production-readiness claim.**

## Verify

Use Node 22.16+, Python 3.11+, the repository-pinned Rust 1.94.1 toolchain, and the pinned Playwright 1.63.0 Chromium. Setup is documented in [Linux setup](docs/operations/LINUX_SETUP.md).

```sh
npm ci --ignore-scripts
python3.11 -B tools/check.py source --output .work/source
python3.11 -B tools/check.py native --output .work/native
python3.11 -B tools/check.py wasm --output .work/wasm

# Bounded S12 benchmark smoke; see benchmarks/s12/README.md for extended mode.
python3.11 -B tools/benchmark_s12.py --profile smoke --output .work/s12/smoke

# With the pinned Playwright environment and sandbox-capable host:
python3.11 -B tools/check.py browser --output .work/browser
python3.11 -B tools/verify_s10_local.py --upgrade-mode same-version --output .work/same-version
python3.11 -B tools/verify_s10_local.py --upgrade-mode cross-version \
  --historical-baseline-wasm PATH_TO_VERIFIED_S10_WASM \
  --historical-baseline-evidence PATH_TO_PROVENANCE_JSON --output .work/historical-upgrade
```

Same-version mode installs the current normal module as the recovery baseline. Cross-version mode with both reuse arguments validates and snapshots an existing source-bound S10 module at revision `e4405bbdcfccb11533d8a2a98ce709e2d8d02ed0`. Without those arguments, its preparation path performs remote Git cloning; that path is reserved for explicit user preparation and must not be invoked automatically. Neither mode substitutes the replacement for a missing historical module. Both compile the harness before starting the owned PocketIC server, execute recovery/upgrade and concurrent browser checks, clean up owned processes and verify a fresh S09 snapshot. Missing prerequisites remain BLOCKED; executed failures remain FAIL.

The bundled offline observer is still available:

```sh
python3.11 -B tools/serve_observer.py --port 8080
```

Open **http://127.0.0.1:8080/apps/btz-observer/**. That default mode is labeled **Offline replay — pinned content, not IC-certified** and is distinct from the harness-configured S10 live mode.

## Current boundary

| Component | S12 role |
|---|---|
| Pinned DTR revision | Generic Rust coordinator/wire crates, canonical timeline primitives, publication verification, source/storage models, Life and playout buffering. |
| `canisters/runtime-lab` | BTZ application host: verified ledger classification, autonomous progression, stable state, certification and three-publication/8 MiB retention. |
| `native/btz-native` and `kernels/btz-mechanics` | BTZ authoritative rules and independent replay reference. |
| `apps/btz-observer` | Existing read-only Canvas renderer with live certified retrieval, bounded buffering and visible snapshot resynchronization. |
| `tools/serve_observer.py` | Loopback-only allowlisted test proxy for actual PocketIC query/read-state bytes. It is not a production service. |
| `tools/verify_s10_local.py` | Bounded owner of the disposable PocketIC/browser integration and its sanitized results. |
| `tools/benchmark_s12.py` | Smoke/extended S12 runner for fixtures, canbench, continuous normal-Wasm PocketIC, controlled ledger traffic and cost projections. |

BTZ v3 gameplay, canonical payment inputs, authoritative state/events/scores/seals, publication v6, animation v1 and Life regression behavior remain unchanged. See the [S11 ownership map](docs/architecture/S11_DTR_EXTRACTION.md), [current status](STATUS.md), [S12 closeout](checkpoints/S12_CLOSEOUT.md) and [original report](checkpoints/S12_REPORT.md), [workload inventory](benchmarks/s12/README.md) and [closeout evidence](evidence/S12/closeout/provenance.json).

The public DTR source is `https://github.com/aodl/dtr`; BTZ pins its exact Rust implementation and reviewed JavaScript artifact. The tested combined local configuration is 16×8/two initial cannons/32 initial balls, two logical ticks, work budget 512, one-second callback pacing, five-second fallback and 64-record pages. Independent 1/8 record/s streams drained for 128 virtual seconds; 128 record/s accumulated backlog. Twenty seconds was an earlier target deadline, not a measured publication cadence. Complete update headroom and all-in costs remain unestablished. Production ledger-source selection, actual cycle burn, settlement, wallets, governance and reproducible Wasm remain separate work. Jupiter Faucet and Event Horizon remain independent products.

Historical upgrade commands must supply both existing provenance-bound reuse arguments above to avoid the default remote-cloning preparation path. Every remote Git operation belongs to the user.
