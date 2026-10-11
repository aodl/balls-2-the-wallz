# Balls 2 The Wallz — S11 DTR consumer

BTZ is a continuously running, local-only Internet Computer game service and now consumes the independently maintained Deterministic Timeline Runtime. DTR supplies the generic checkpoint/coordinator, publication verification and client buffering; this repository owns BTZ gameplay, payments, observer application and concrete canister assembly.

**Live local IC — test-network certified. No mainnet deployment, wallet, real funds, payout or production-readiness claim.**

## Verify

Use Node 22.16+, Python 3.11+, the repository-pinned Rust 1.94.1 toolchain, and the pinned Playwright 1.63.0 Chromium. Setup is documented in [Linux setup](docs/operations/LINUX_SETUP.md).

```sh
python3.11 -B tools/check.py source --output .work/source
python3.11 -B tools/check.py native --output .work/native
python3.11 -B tools/check.py wasm --output .work/wasm

# With the pinned Playwright environment and sandbox-capable host:
python3.11 -B tools/check.py browser --output .work/browser
python3.11 -B tools/verify_s10_local.py --output .work/s10-local
```

For S11 upgrade evidence, pass the recorded S10 module with `--baseline-wasm PATH`. The wrapper builds the test harness before starting its owned idle-timed PocketIC server, executes recovery/upgrade tests, runs the browser and game concurrently, stops only its owned process group, and reruns the S09 certificate snapshot. Missing approved browser prerequisites remain BLOCKED; executed failures remain FAIL.

The bundled offline observer is still available:

```sh
python3.11 -B tools/serve_observer.py --port 8080
```

Open **http://127.0.0.1:8080/apps/btz-observer/**. That default mode is labeled **Offline replay — pinned content, not IC-certified** and is distinct from the harness-configured S10 live mode.

## Current boundary

| Component | S11 role |
|---|---|
| Pinned DTR revision | Generic Rust coordinator/wire crates, canonical timeline primitives, publication verification, source/storage models, Life and playout buffering. |
| `canisters/runtime-lab` | BTZ application host: verified ledger classification, autonomous progression, stable state, certification and three-publication/8 MiB retention. |
| `native/btz-native` and `kernels/btz-mechanics` | BTZ authoritative rules and independent replay reference. |
| `apps/btz-observer` | Existing read-only Canvas renderer with live certified retrieval, bounded buffering and visible snapshot resynchronization. |
| `tools/serve_observer.py` | Loopback-only allowlisted test proxy for actual PocketIC query/read-state bytes. It is not a production service. |
| `tools/verify_s10_local.py` | Bounded owner of the disposable PocketIC/browser integration and its sanitized results. |

BTZ v3 gameplay, canonical payment inputs, authoritative state/events/scores/seals, publication v6, animation v1 and Life regression behavior remain unchanged. See the [S11 ownership map](docs/architecture/S11_DTR_EXTRACTION.md), [current status](STATUS.md), [checkpoint report](checkpoints/S11_REPORT.md) and [verification summary](evidence/S11/verification-summary.json).

The DTR remote/push and fresh CI are still permission-gated. Production ledger scalability, settlement, real-wallet integration, governance and release-grade reproducible Wasm remain separate work. Jupiter Faucet and Event Horizon remain independent products.
