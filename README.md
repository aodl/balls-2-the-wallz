# DTR / Balls 2 The Wallz — S07

A **read-only, locally served browser observer**, built on the verified S06 coordinator, publication v6 and compact animation contract. The recordings are finite deterministic outputs of the existing BTZ v3 reference kernel—not hand-scripted gameplay.

**Offline replay, not IC-certified. No wallet, payment, deployment or real funds. Native/IC promotion remains BLOCKED.**

## Start the observer

Node 22.16+ and Python 3.11+ run the source tools. A modern browser on localhost (or HTTPS) supplies Canvas, Web Crypto, ES modules and BigInt. No npm installation is needed to view the bundled recordings.

```sh
# First, verify the pristine extracted package.
python3 -B tools/verify_checkpoint.py

# Serve only allowlisted observer files and their source-module dependencies.
python3 -B tools/serve_observer.py --port 8080
```

Open **http://127.0.0.1:8080/apps/btz-observer/**. Stop the server with Ctrl+C. Opening the HTML directly through `file://` is not supported.

Choose Frontier pressure, New arrivals, The bridge breaks, or Mutual destruction. Pause **downloads** to see the verified buffer drain, then unpause them to resume. Pause **playback** to inspect a frame. Replay speed changes presentation only. The recording stops at its verified end; Restart explicitly returns to genesis.

The contribution panel shows **unmeasured**, not invented cycles or ETH-equivalent figures. The territory table describes the visible board, not a financial payout ranking.

## Verify

```sh
python3 -B tools/check.py source
node tools/build_observer_recordings.mjs --check
python3 -B tools/check.py all

# With an already installed Playwright + Chromium, while the server is running:
python3 -B tools/browser_observer.py --mode http \
  --url http://127.0.0.1:8080/apps/btz-observer/

# Isolated, network-free Chromium fixture-document tests:
python3 -B tools/browser_observer.py --mode offline
```

The complete gate deliberately reports BLOCKED for unexecuted native/IC and browser-HTTP integration. It is not an overall deployment pass.

**Browser evidence qualification:** this environment blocks Chromium navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. The executed offline browser tests inject the unchanged UI/modules into an isolated document, supply recording responses in memory and delegate SHA-256 to Python hashlib. They establish actual Chromium application/layout/control behavior, **not HTTP loading, production CSP enforcement, native browser Web Crypto or IC certificates**. Those are separate gates. No browser policy was changed and no browser was downloaded.

## Current source boundary

| Component | Role |
|---|---|
| `apps/btz-observer/` | Renderer, verified replay admission, bounded local transport and UI. |
| `tools/build_observer_recordings.mjs` | Reproducibly runs the existing coordinator to produce 32 segments plus four genesis anchors. |
| `tools/serve_observer.py` | Loopback-only static demonstration server; not a production host. |
| `tools/browser_observer.py` | Separate HTTP and offline Chromium verification modes. |
| Existing `packages/client/` | Unchanged catalog/chunk verification and adaptive presentation clock. |
| Existing kernels/coordinator | Unchanged game, accounting, input and publication rules. |

This checkpoint adds no backend, new runtime, custom crypto framework or canister laboratory. The original verbose audit stream remains available beside the compact render projection.

Read [checkpoint report](checkpoints/S07_REPORT.md), [observer contract](docs/specs/OBSERVER_V7.md), [status](STATUS.md), [verification](evidence/S07/verification/verification.json) and [offline browser results](evidence/S07/browser/offline/results.json). Screenshots: [desktop](evidence/S07/browser/offline/desktop.png), [mobile](evidence/S07/browser/offline/mobile.png).

The S06 [simplification contract](docs/specs/SIMPLIFICATION_V6.md) remains in force for runtime, publication and private implementation freedom.
