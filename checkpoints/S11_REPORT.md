# S11 — standalone DTR extraction and BTZ consumer

11 October 2026. **The behavior-preserving extraction passes locally. Remote clean-clone and fresh CI remain BLOCKED pending authorization to create/push the DTR repository.**

## Result

The reusable DTR implementation now lives in `/home/codexdev/src/dtr` at implementation commit `71e59e93cf49a3656689679b538b4c3f138787f8`. BTZ remains in `/home/codexdev/src/stream` and was tested at `5c522373055686114bf9dd9e9a30c8e9b03e4b8b`. Both use branch `checkpoint/s11-dtr-extraction`; DTR has no configured remote.

DTR owns generic seals/timeline interfaces, source fencing models, wire/coordinator crates, bounded publication/storage/client code, certificate-verification integration, sequencing/playout and competitive Life. BTZ owns all mechanics, commands/payment interpretation, economics, scores, projection/rendering, the observer application and concrete canister. `runtime-lab` remains in BTZ because it directly assembles the BTZ kernel and payment classifier.

BTZ manifests name `https://github.com/aodl/dtr.git` and exact revision `71e59e93cf49a3656689679b538b4c3f138787f8`; lockfiles resolve that same source. Local pre-remote tests used a command-scoped URL rewrite only. JavaScript consumes `@dtr/timeline-runtime@0.11.0` from a real npm-pack tarball, SHA-256 `ec890c3946d27efa1ef210a97db92407b04f61fc317f507988d46f20894d3ec8`, integrity `sha512-opmkcujWohpEHNGgOITafyBODDyXT8/ne+l+yZ7EUuu65QM8I3ADdbhWmGAvtfq2yNXoAokMibBvCMv9/sG9Eg==`. Editable generic sources were removed from BTZ.

## Security correction

Before extraction, a focused probe altered only a retained predecessor's optional render descriptor/bytes and reproduced acceptance by the old verifier. `verifyRetainedPredecessor` now rejects chaining when either catalog has `render_format !== null`. Null-render retained chains pass; authoritative state/event/score mutations fail; directly authenticated rendered catalogs and historical offline rendering still pass. S10 live catalogs remain null-render and their behavior is unchanged.

## Executed local evidence

| Tier | Result |
|---|---|
| DTR JavaScript / Rust / Life | **PASS — 186 JS and 29 Rust tests** |
| DTR format, Clippy, package inventory | **PASS — 20 packaged files** |
| Immutable-artifact clean consumers | **PASS — JS API test and four Rust packages** |
| BTZ source and tooling | **PASS — 1,166 JS tests and 79 Python tests** |
| BTZ root/native Rust | **PASS** |
| Runtime Wasm, format, Clippy, generated Candid | **PASS** |
| Sandboxed HTTP browser/native Web Crypto | **PASS — 11 assertions** |
| Installed-Wasm PocketIC regressions | **PASS — 10 tests, one live test intentionally orchestrated separately** |
| Concurrent live PocketIC/browser | **PASS — segments 0–10 and 11 browser assertions** |
| S09 genuine-certificate snapshot regression | **PASS — 12 assertions** |

The cold integration target began empty and compiled for 234.179 seconds before the server started. The installed-Wasm suite took 74.425 seconds; the live concurrent slice took 61.243 seconds. The owned PocketIC process was healthy and cleaned up.

The live run used two local funding accounts, a payment after first publication, empty-input progress, archive traversal, dropped-hint fallback, short retained catch-up, long authenticated resynchronization and native replay of captured seals. It recorded 24 ledger calls, 2 archive calls, 3 retained publications/14,840 bytes, 15,755 event bytes, 53,068 publication/artifact bytes, input high-water 3, final 3 balls/2 cannons and 3,612 work units (731 maximum in one segment). These are local observations, not cycle or mainnet capacity claims.

The S10 normal Wasm (`3ee3b6e11a94850114e74e64fe96ee420c1ab14f2008360ae0c2570959a10450`) installed first. It upgraded to S11 during unfinished work and at idle/ready boundaries; S11 was also upgraded immediately after publication. State, scores, sealed inputs, source cursor, run state, publication bytes and certificate verification survived. The generated Candid remains byte-identical with SHA-256 `587bddc30097bbbcbe732818b084c98c721292fe38f994898a8ecc145675352c`.

S11 normal Wasm is `b34943dc1cb4815ff0456bbd77002b04d4fef22e5446dd60677e21ea238096c3`; test-hook Wasm is `edc5cce7c98d03df624fa467daf1284ac11d0d1fbcb682abd81f538556f8d68e`. Different S10/S11 and developer/CI hashes are separate artifacts; reproducible Wasm remains open.

## Remaining gate

The intended DTR remote has not been authorized/created/pushed. Therefore the committed remote dependency cannot yet resolve on an unrelated machine, DTR CI cannot run, BTZ fresh CI cannot fetch it, and the remote clean-clone acceptance gate is BLOCKED. Local immutable Git-bundle and npm-tarball consumers are valid staging evidence, not a substitute for that gate.

No remote action, registry publication, release, public-network deployment, real wallet/funds, payout or production-controller change occurred. Production scalability, settlement, trust-root policy, capacity and reproducible-release gates remain separate.
