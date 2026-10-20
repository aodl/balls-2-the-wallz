# S11 DTR ownership and dependency boundary

The dependency direction is strictly B2Z → DTR. The tested DTR implementation revision is `71e59e93cf49a3656689679b538b4c3f138787f8`.

| Owner | Components |
|---|---|
| DTR | `dtr-core`, `dtr-source-model`, `dtr-wire`, `dtr-host`; canonical JavaScript timeline/source/storage/publication/client modules; competitive Life; generic recovery and sequencing tests. |
| B2Z | B2Z protocol/account/memo and payment classification; physics, territory, cannons, annihilation, spawning, pricing, rejection, scoring; native adapter; animation projection and renderer; observer application; runtime canister; ledger/archive/live integration fixtures. |

The concrete `canisters/runtime-lab` deliberately remains in B2Z. It imports `B2zHostKernel`, constructs the B2Z payment envelope and exposes application-specific configuration. Extracting it would require a new plugin/host abstraction with no second canister consumer, increasing complexity without reducing duplication.

Rust consumers use the exact public Git URL `https://github.com/aodl/dtr.git` and revision in manifests and lockfiles. The preserved original staging evidence used a command-scoped Git URL rewrite before publication; the current package/consumer gate uses the public remote with rewrites disabled. JavaScript uses the reviewed npm-pack artifact under `vendor/dtr/`, with its integrity pinned by `package-lock.json` and `tools/check_source.py`. The observer's loopback server exposes only the required installed DTR package directory, not arbitrary dependencies.

Updating DTR requires a reviewed DTR commit, standalone DTR tests, a fresh inspected `npm pack`, exact Rust revision and tarball/integrity updates, B2Z source/native/Wasm tests, the S10-baseline upgrade matrix, and the live PocketIC/browser scenario. Floating branches and sibling path dependencies are forbidden.

The only intentional validation change in S11 is that retained-predecessor chaining rejects catalogs with optional render artifacts. Such a catalog requires direct authentication. Gameplay and all authoritative encodings are unchanged.
