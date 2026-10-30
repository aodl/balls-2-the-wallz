# Frozen A0/A2 Normal delivery on an isolated Linux host

This package runs baseline **b96c64b43a412c022143787cd9d6ed94da2bbc67** directly, with no Actions service. It contains a complete Git-exported baseline, the already reviewed prepared inputs from artifact **12884987721**, original frontend assets, both frozen Wasm modules, the original native reference harness, and SHA-256 manifests. It installs pinned dependencies normally before any measurement. It never builds either comparison Wasm or regenerates frontend assets.

| Identity | SHA-256 / revision |
| --- | --- |
| A0 normal | `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51` |
| Approved A2 normal | `2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb` |
| DTR77 | `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68` |
| Reference native harness | `20ecd7716612a4554e8e753f13d68d41cf05437943ebb27d3a8784312239b507` |
| Reviewed input ZIP | `bf610b2081c2f044e54a15bceca91f2208e00b1ded7826a4d56fec81dfa13295` |

## Host and approval boundary

Prefer Ubuntu 22.04 x86-64, eight **dedicated** vCPUs, 32 GiB RAM and at least 100 GiB fast local SSD space for native compilation and complete traces. These are provisioning recommendations, not new acceptance criteria. This workspace itself is eligible if it passes the original resource requirements. The user has requested waiting and checking this workspace every 30 minutes, retaining every result. Do not buy another VM while that instruction remains in force.

Run as an ordinary user. The host needs Node **24.15.0**, Python **3.11** with venv support, Git, rustup, a native C/C++ compiler/linker and standard Linux build tools. Rust **1.94.1** is installed user-scoped, without changing the global default. The reviewed native reference ELF requires glibc symbols through **2.34**; Ubuntu 22.04 glibc 2.35 is compatible at that ABI level. Actual executable loading, browser libraries, sandbox and disposable simulator compatibility must still pass provisioning.

Install Chromium's normal Ubuntu shared-library/font dependencies in the VM image through its administrator: NSS/NSPR, ATK/AT-SPI, CUPS, D-Bus, DRM/GBM, X11/XCB/XComposite/XDamage/XExt/XFixes/XRandR, xkbcommon, ALSA, Cairo, Pango, fontconfig, FreeType and normal browser fonts. The exact pinned Playwright installer supplies its dependency diagnostic if anything is missing. An existing reviewed user-scoped library bundle may be supplied through a command-scoped `LD_LIBRARY_PATH`, as documented in `docs/operations/LINUX_SETUP.md`; preparation records its library hashes and the run retains and verifies that same path. This does not change browser binaries or disable security. No script here invokes sudo, installs system packages, disables AppArmor/seccomp, changes namespace policy, disables the sandbox or disables other host security. Missing libraries or denied sandbox require an approved compatible image, not a bypass.

Allow outbound dependency downloads during provisioning (npm, PyPI/Playwright downloads, Rust distributions, GitHub DTR and checksum-pinned DFINITY artifacts). Comparison services bind loopback; do not open port 18765 or PocketIC ports publicly. Keep ordinary firewall and OS security. No identity files, wallets, credentials or public-IC access are required for this test. No persistent self-hosted Actions runner is installed.

For any future paid VM, obtain approval for the provider, location, exact dedicated instance offering, hourly price, spending cap, administrative image setup and retention/termination arrangement first. Suggested reservation: up to three hours for provisioning plus one bounded comparison; actual baseline runner limits remain unchanged. No paid infrastructure is currently approved or provisioned.

## Export and verify

On the trusted B2Z checkout, using the preserved original artifact ZIP:

```sh
python3.11 -B tools/package_frozen_delivery.py \
  --artifact .work/a2-delivery-evaluation/artifacts/12884987721/original.zip \
  --output .work/isolated-delivery/frozen-package
```

Transfer `frozen-package.tar.gz` and its adjacent SHA-256 file using the operator's approved channel. Check the archive digest against the reviewed handoff digest independently, then extract it in a new user-owned directory. Never extract over an existing source tree or prior attempt. Within that directory:

```sh
python3.11 -B package_frozen_delivery.py --verify .
```

The outer manifest checks every exported baseline/input file. Both compressed and decompressed Wasm checks are retained. The reference ZIP is authenticated by its exact previously reviewed checksum, not merely by a new self-generated manifest. These pins prove content consistency, not mainnet authenticity.

## Provision, with no measured windows

Choose a new absolute state directory outside the package/source snapshot. Its `runtime` subtree holds dependencies and build caches; its separate `evidence` subtree contains logs, identities and raw results.

```sh
python3.11 -B host.py prepare --package "$PWD" \
  --state "$HOME/b2z-frozen-delivery-state" --native-build
```

`--native-build` compiles **only the native acceptance harness from the unchanged exported b96 baseline** with locked/offline Cargo resolution after all five locked fetches. It does not compile Wasm. This is needed because the reference native binary embeds its original absolute source root `/home/runner/work/balls-2-the-wallz/balls-2-the-wallz`. The local native executable's actual hash and build log are retained, and that hash is pinned for the attempt. Its code, fixture, browser acceptance logic and all predicates remain the b96 baseline. The frozen Wasm and frontend bytes remain exact reviewed copies.

Alternatively, an administrator may arrange the exported `baseline` directory at the reference binary's original absolute source root, with the package's `baseline` path resolving there. Then omit `--native-build` to execute the exact reference native binary. This directory setup requires host-owner approval; no permission escalation or filesystem namespace workaround is performed by these scripts. Do not patch the native executable or change source to relocate it.

Preparation performs all five normal remote `cargo fetch --locked` operations before the unchanged offline provenance checker, normal `npm ci --ignore-scripts`, hash-pinned Python installation, pinned Chromium installation/inventory verification and an actual sandbox launch. It downloads checksum-pinned PocketIC/ledger/index artifacts and runs the already reviewed **provisioning-only** `delivery_public_binding` check with valueless disposable fixtures. No delivery window starts during preparation. No frontend generation or Wasm build is invoked.

`evidence/READY.json` exists only after successful preparation. Check every provisioning log before execution. A failed preparation blocks comparison and is retained; do not bypass it. Stop all preparation/build processes before collecting the resource prerequisite.

## One controlled attempt

After the user-authorized host is prepared, stop interactive work and other workloads. In this workspace, first await the next requested 30-minute resource check; preserve rejected screens. Once it passes, invoke exactly once:

```sh
python3.11 -B host.py run --package "$PWD" \
  --state "$HOME/b2z-frozen-delivery-state"
```

This delegates to the **unchanged exported** `tools/run_matched_delivery.py`. It sets the original prebuilt frontend/reference manifest, sandboxed browser interpreter and native harness checksum. The baseline writes its execution predeclaration before resource sampling. It uses the existing bounded **180-second allowance**, unchanged complete **60-second resource prerequisite**, five-second CPU/I/O/memory/swap/throttling sampling and foreign-work interruption rules. No monitoring threshold is relaxed. Eight CPUs/32 GiB are not added as rejection predicates.

Execution is sequential **A0 then A2**, disposable **34-node fiduciary**, original **four-ball million-cell v5 world/v6 genesis**, **90-second Normal prelude each**, then **untrimmed 900-second strict Normal each**. Producer/admission/display rates, zero stalls/rebuffers/resynchronisations, buffer conservation/deficit, bounded queue, real certificate verification and sandbox requirements are unchanged. Native history capture and replay still run. This is Normal-only: it executes no Economy, Lifeline, low-funding or cold-reconnect phases; their historical evidence remains separate.

A permanent `evidence/attempt` directory claims the single comparison. A second `run` command refuses to execute, including after a failed/blocked/interrupted attempt. Do not delete that directory or use fresh state to obtain a favourable repeat. Provisioning or environment defects require diagnosis and separate authorization for any later measurement.

## Retention and verdict

Preserve **all** `evidence` files, the package archive/digest and every resource-screen result, including failures. The launcher writes `attempt/VERDICT.json` and hashes the full evidence tree even when the baseline returns nonzero. After an external termination, invoke `host.py seal --state ...` to generate the manifest over whatever partial evidence exists; never restart the comparison. Copy evidence to an independent user-owned location and verify every manifest entry there before releasing any host. Exclude `runtime`, node_modules, Cargo caches and virtualenvs from Git/checkpoint archives.

Inspect each candidate's full `comparison/*/million-browser-sustained/results.json`, strict analysis/aligned telemetry, dense traces, publication/controller polls, request and certificate evidence, actual module identity, host samples, interruptions and native replay. A missing case or missing strict window is **NOT_RUN**, never PASS. A0/A2 both PASS qualifies only this frozen Normal delivery gate. A0 PASS/A2 FAIL calls for candidate-specific diagnosis; admissible failures in both call for shared transport/gateway/simulator/browser diagnosis. Environmental interruption is BLOCKED, with the precise process/pressure evidence retained. Never retry automatically.

Production remains the existing state-preserving v5→v5 upgrade on its 34-node fiduciary subnet. No mainnet mutation, reinstall, controller change, funding/transfer or frontend deployment is authorized. Only after both frozen strict windows pass may a fresh read-only mainnet preflight, funding estimate and guarded upgrade procedure be prepared for separate approval. Remote publication of evidence commits remains user-owned.
