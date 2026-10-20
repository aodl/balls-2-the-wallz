# S05 conformance and evidence map

`python3 -B tools/check.py source` executes the offline gate without package downloads. `all` additionally attempts native and IC gates and remains BLOCKED when tools or integration harnesses are missing. Source checks do not rewrite fixtures.

| Claim | Executable evidence | Boundary |
|---|---|---|
| Atomic input/seal/simulation/retirement | coordinator tests, per-operation before/after fault matrix | JS atomic model, not executed IC stable memory |
| Saved image portability | five workloads and every saved-image continuation | Native runner authored; native side unexecuted |
| Game-independent host | Life and B2Z through same JS coordinator; native toy-kernel tests authored | Complete native Life adapter not claimed |
| Correct publication bytes | independent Python standard-library constructor, five cases | Source host worlds are implementation-derived |
| Chunk integrity and bounds | shuffled/duplicate/corrupt/stale/incomplete artifact tests | Not IC certificate authenticity |
| Certificate fail-closed boundary | missing-verifier, deployment, time and root tests using labelled stubs | No actual BLS/delegation/key verification |
| Anti-rollback and chain behavior | same-revision/head, predecessor and missed-segment tests | Requires a trusted root/certificate policy |
| Presentation buffer safety | buffer headroom, slowdown/slew, exhaustion, recovery and tab suspension | No browser renderer or network latency evidence |
| Process recovery | separate invocations after seal and publication failure/ack loss | Synthetic source, local checksums only |
| Native source/API inventory | manifest checks and explicit dependencies/exports | Not Rust compilation or permission execution |

## Fixture provenance

`coordinator-v5.json` freezes implementation-derived complete coordinator images at each selected operation. It is an exact byte regression contract, not an independent implementation. The native runner compares them, imports JS images at each point, and exports native images for JS continuation.

`observation-v5.json` is independently constructed in Python from those saved worlds. It checks canonical publication and catalog hashing, not independent game physics or ledger truth. Previous independent geometry/topology/placement/collision/large-fraction references are retained unchanged.

The new native gate expects 60 actual comparison lines and four native-to-JavaScript continuations (four B2Z scenarios, seven host operations each, seven imported resumptions each, and one publication comparison each). Do not equate an authored runner or empty test filter with executed evidence.

## Remaining integration gates

Rust lock resolution, compilation, rustfmt, Clippy and existing/native host comparisons; Wasm/Candid equivalence; runtime-lab controller authorization; real stable-image rollback and upgrades; pinned ledger/archive source authority and completeness; certificate BLS/delegation/freshness against actual IC responses; persistent historical event availability; browser rendering; durable monetary obligations; real cycle instrumentation and target-subnet capacity.
