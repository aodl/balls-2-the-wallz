# DTR / Balls 2 The Wallz — S10

S10 is a continuously running, local-only Internet Computer game service. After one controller-authorized local start, the existing Rust coordinator autonomously scans a disposable ICP ledger, seals verified input prefixes, performs bounded BTZ v3 simulation work, publishes consecutive publication-v6 segments and continues through empty-input periods. The read-only browser remains connected to the running PocketIC instance, verifies fresh genuine IC certificates and plays authenticated segments through the existing animation-v1 projection.

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

The S10 wrapper builds the exact installed-Wasm test harness before starting its owned idle-timed PocketIC server. It then executes the installed-Wasm recovery/upgrade suite, runs the browser and game network concurrently for the live checkpoint, stops only its owned server process group, and reruns the S09 finite certified-snapshot mode as a regression. Missing approved browser prerequisites remain BLOCKED; executed failures remain FAIL.

The bundled offline observer is still available:

```sh
python3.11 -B tools/serve_observer.py --port 8080
```

Open **http://127.0.0.1:8080/apps/btz-observer/**. That default mode is labeled **Offline replay — pinned content, not IC-certified** and is distinct from the harness-configured S10 live mode.

## Current boundary

| Component | S10 role |
|---|---|
| `canisters/runtime-lab` | Current IC host: verified ledger ingestion, one generation-fenced progression loop, coordinator persistence, certification and three-publication/8 MiB retention. |
| `native/dtr-host` and existing BTZ kernel | Unchanged authoritative coordinator/game rules and independent replay reference. |
| `packages/client` | Publication/artifact checks, standard-library IC certificate verification, predecessor-chain authentication and anti-rollback sequencing. |
| `apps/btz-observer` | Existing read-only Canvas renderer with live certified retrieval, bounded buffering and visible snapshot resynchronization. |
| `tools/serve_observer.py` | Loopback-only allowlisted test proxy for actual PocketIC query/read-state bytes. It is not a production service. |
| `tools/verify_s10_local.py` | Bounded owner of the disposable PocketIC/browser integration and its sanitized results. |

BTZ v3 gameplay, canonical payment inputs, authoritative state/events/scores/seals, publication v6, animation v1 and Life regression behavior remain unchanged. See the [S10 live-local specification](docs/specs/LIVE_LOCAL_S10.md), [current status](STATUS.md), [checkpoint report](checkpoints/S10_REPORT.md) and [verification summary](evidence/S10/verification-summary.json).

Production ledger scalability, settlement, real-wallet integration, governance, release-grade reproducible Wasm and repository extraction remain separate work. Jupiter Faucet and Event Horizon remain independent products.
