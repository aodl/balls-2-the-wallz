# Current status — S11

**The behavior-preserving DTR extraction passes locally. Full S11 closeout remains BLOCKED only on an authorized DTR remote and fresh two-repository CI. Production promotion remains BLOCKED.**

BTZ branch `checkpoint/s11-dtr-extraction` consumes standalone DTR commit `71e59e93cf49a3656689679b538b4c3f138787f8`. Rust manifests and all four lockfiles name the exact intended Git URL and revision. JavaScript consumes the actual allowlisted `@dtr/timeline-runtime@0.11.0` npm-pack artifact (SHA-256 `ec890c3946d27efa1ef210a97db92407b04f61fc317f507988d46f20894d3ec8`). Editable generic DTR sources no longer remain in BTZ.

The DTR repository at `/home/codexdev/src/dtr` independently owns core seals/timeline interfaces, source fencing models, the generic native coordinator/wire crates, publication/certificate verification, bounded client/storage utilities and competitive Life. BTZ retains mechanics, payment/memo classification, pricing/scoring, animation/renderer, concrete canister assembly and integration fixtures. `runtime-lab` remains in BTZ because it imports the BTZ kernel and payment classifier.

The retained-predecessor verifier now fails closed when either catalog includes an optional render artifact; rendered catalogs still work through direct certificate or pinned-root authentication. The pre-fix probe failed as expected, and focused plus historical observer tests pass after the correction.

Local verification passed DTR standalone tests (186 JavaScript, 29 Rust), immutable-artifact clean consumers, BTZ source (1,166 JavaScript tests plus tooling), native Rust, Wasm/Candid, sandboxed browser, 10 installed-Wasm PocketIC regressions, the 11-segment concurrent live scenario and the S09 certified snapshot regression. The generated Candid remains byte-identical to S10. The S10 Wasm upgraded to the extracted build at idle, running, ready and completed-publication boundaries without resetting state, scores, source position, autonomous run state or certificates.

The normal S11 Wasm hash is `b34943dc1cb4815ff0456bbd77002b04d4fef22e5446dd60677e21ea238096c3`; the test-hook hash is `edc5cce7c98d03df624fa467daf1284ac11d0d1fbcb682abd81f538556f8d68e`. They are distinct from S10 and no byte-reproducibility claim is made.

The intended DTR remote `https://github.com/aodl/dtr.git` is not locally configured or known to contain the pinned commit. Remote creation/push and workflow execution were not authorized by this task. Until that exact history is published and both fresh workflows pass, delivery is correctly recorded as BLOCKED rather than complete.

Details are in [the S11 report](checkpoints/S11_REPORT.md), [ownership map](docs/architecture/S11_DTR_EXTRACTION.md) and [verification summary](evidence/S11/verification-summary.json).
