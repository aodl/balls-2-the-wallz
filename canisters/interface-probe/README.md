> Scope update: see [the S06 canister boundary](../README.md). This source remains uncompiled; no deployment is authorized.

# Disposable interface probe (source only)

This is **not** a game, treasury, deployed canister, or production status endpoint. It reads a configured ledger/index, never sends tokens or cycles, and requires a controller for each outbound-call method. A shared 30-second cooldown and 1–8-block limit bound this experiment. The query `info` is explicitly uncertified.

The selected dependency versions are inherited from the supplied Jupiter lockfile. They have not been resolved or compiled in this environment. This crate is isolated from the dependency-free root workspace. No Cargo.lock or Wasm is fabricated.

On a tool-equipped machine, from the repository root:

```sh
cargo generate-lockfile --manifest-path canisters/interface-probe/Cargo.toml
cargo test --manifest-path canisters/interface-probe/Cargo.toml --locked
cargo build --manifest-path canisters/interface-probe/Cargo.toml --locked --release --target wasm32-unknown-unknown
```

Record the generated lockfile and compare generated Candid to `interface-probe.did` before local testing. The intended constructor is `(ledger : principal, index : opt principal)`. There is no automatic deployment script and no implicit mainnet default.

Use a local test ledger first. Confirm constructor configuration, unauthorized-call rejection, cooldown, memo observations from test transactions, archive responses, and that `index.ledger_id()` matches the configured ledger. A decoded record is not a verified source history. This probe deliberately omits full operations/callback fields through Candid record subtyping; it must never be used to decide payments.

Heap configuration is disposable; `post_upgrade` requires explicit configuration again. **Do not copy this persistence pattern into the arena.** Arena cursors, seals, staging and obligations must persist in stable memory. Live-wallet support, Candid compatibility, archive calls and PocketIC execution remain blocked gates, not claimed results.
