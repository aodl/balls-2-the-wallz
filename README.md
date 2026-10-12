# Balls 2 The Wallz — S12 measured operating envelope

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
python3.11 -B tools/verify_s10_local.py --upgrade-mode cross-version --output .work/historical-upgrade
```

Same-version mode explicitly installs the current normal module as the recovery baseline. Cross-version mode fetches the public BTZ source at pinned S10 revision `e4405bbdcfccb11533d8a2a98ce709e2d8d02ed0`, validates its commit and tree, builds it in a disposable checkout outside the repository, and snapshots it before building the replacement. It never substitutes the replacement for a missing historical module. Both modes build the test harness before starting their owned idle-timed PocketIC server, execute recovery/upgrade tests, run the browser and game concurrently, stop only their owned process group, and rerun the S09 certificate snapshot. Missing approved browser prerequisites remain BLOCKED; executed failures remain FAIL.

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

BTZ v3 gameplay, canonical payment inputs, authoritative state/events/scores/seals, publication v6, animation v1 and Life regression behavior remain unchanged. See the [S11 ownership map](docs/architecture/S11_DTR_EXTRACTION.md), [current status](STATUS.md), [S12 report](checkpoints/S12_REPORT.md), [workload inventory](benchmarks/s12/README.md) and [machine-readable run](evidence/S12/benchmark-run.json).

The public DTR source is `https://github.com/aodl/dtr`; BTZ pins its exact implementation revision for Rust and a reviewed npm-pack artifact for JavaScript. S12's verified local continuous envelope is the 16×8/2-cannon/32-ball fixture at two logical ticks, work budget 512 and a 20-second local target cadence. This is not a production capacity promise. Production ledger-source selection, real cycle burn, settlement, wallet integration, governance and release-grade reproducible Wasm remain separate work. Jupiter Faucet and Event Horizon remain independent products.
