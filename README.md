# DTR / Balls 2 The Wallz — S08

A **read-only, locally served browser observer**, built on the verified S06 coordinator, publication v6 and compact animation contract. The recordings are finite deterministic outputs of the existing BTZ v3 reference kernel—not hand-scripted gameplay.

**Offline replay, not IC-certified. No wallet, payment, deployment or real funds. Native conformance now passes; IC integration and production promotion remain BLOCKED.**

## Start the observer

Node 22.16+ and Python 3.11+ run the source tools. A modern browser on localhost (or HTTPS) supplies Canvas, Web Crypto, ES modules and BigInt. No npm installation is needed to view the bundled recordings.

For the pinned Rust toolchain, user-scoped Python option and one-time locked dependency fetch, see [Linux setup](docs/operations/LINUX_SETUP.md).

```sh
# First, verify the pristine extracted package.
python3.11 -B tools/verify_checkpoint.py

# Serve only allowlisted observer files and their source-module dependencies.
python3.11 -B tools/serve_observer.py --port 8080
```

Open **http://127.0.0.1:8080/apps/btz-observer/**. Stop the server with Ctrl+C. Opening the HTML directly through `file://` is not supported.

Choose Frontier pressure, New arrivals, The bridge breaks, or Mutual destruction. Pause **downloads** to see the verified buffer drain, then unpause them to resume. Pause **playback** to inspect a frame. Replay speed changes presentation only. The recording stops at its verified end; Restart explicitly returns to genesis.

The contribution panel shows **unmeasured**, not invented cycles or ETH-equivalent figures. The territory table describes the visible board, not a financial payout ranking.

## Verify

```sh
python3.11 -B tools/check.py source
node tools/build_observer_recordings.mjs --check
python3.11 -B tools/check.py all

# With the pinned Playwright test dependency and its Chromium installed:
python3.11 -B tools/verify_observer_http.py --output .work/browser-http

# Isolated, network-free Chromium fixture-document tests:
python3.11 -B tools/browser_observer.py --mode offline
```

The complete gate reports unimplemented IC integration requirements as BLOCKED. It is not an overall deployment pass.

**Browser evidence qualification:** the S07 environment blocked Chromium navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; that remains historical evidence, not an assumption about the current host. S08 executes HTTP mode against the loopback server with the production static-page CSP and browser-native Web Crypto. Neither HTTP nor fixture mode establishes IC certificates.

## Current source boundary

| Component | Role |
|---|---|
| `apps/btz-observer/` | Renderer, verified replay admission, bounded local transport and UI. |
| `tools/build_observer_recordings.mjs` | Reproducibly runs the existing coordinator to produce 32 segments plus four genesis anchors. |
| `tools/serve_observer.py` | Loopback-only static demonstration server; not a production host. |
| `tools/browser_observer.py` | Separate HTTP and offline Chromium verification modes. |
| Existing `packages/client/` | Unchanged catalog/chunk verification and adaptive presentation clock. |
| Existing kernels/coordinator | Unchanged game, accounting, input and publication rules. |

This checkpoint adds no gameplay, backend, new runtime, custom crypto framework or canister laboratory. It validates and minimally repairs the existing native/runtime implementations. The original verbose audit stream remains available beside the compact render projection.

Read the [S08 checkpoint report](checkpoints/S08_REPORT.md), [observer contract](docs/specs/OBSERVER_V7.md), [status](STATUS.md), [verification summary](evidence/S08/verification-summary.json) and [HTTP browser results](evidence/S08/browser/http/results.json). Screenshots: [desktop](evidence/S08/browser/http/desktop.png), [mobile](evidence/S08/browser/http/mobile.png).

The S06 [simplification contract](docs/specs/SIMPLIFICATION_V6.md) remains in force for runtime, publication and private implementation freedom.
