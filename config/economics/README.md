# Prelaunch economics

Edit **prelaunch.json** to prepare a new deterministic profile. Amounts are decimal strings of integer e8s; no floating-point ICP values are accepted. Run:

```bash
node tools/generate_economics.mjs
node tools/generate_economics.mjs --check
node tools/prelaunch_vectors.mjs --check
```

The generator produces exact JavaScript/Rust constants and the observer's canonical configuration bytes. Both runtime acceptance and certified configuration hashes derive from these amounts. Source tests and the release freezer reject stale generated files. Changed behavior requires deliberate new-profile vectors, native conformance and release review; never regenerate historical goldens to hide a change.

`references/S14/mvp-configuration.bin` is the immutable original 10 ICP configuration, checked against its historical hash. Historical `TEST_CONFIG`/`B2Z_IDENTITY` fixtures and old sealed histories retain it. New canister initialization uses the prelaunch identity. Cursors distinguish these two supported profiles; an ordinary upgrade retains the durable journal's identity and **does not activate a new price**. This is not a mutable-price API or a repricing migration.

Each future price change needs a versioned profile and a separately reviewed live transition. Do not edit a deployed profile and assume recompilation changes the live timeline safely. The current 1 ICP activation is staged pending explicit release/reset approval. No DTR modification is involved.
