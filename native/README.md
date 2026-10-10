# Native scope at S08

This workspace compiles and tests with the repository-pinned Rust 1.94.1 toolchain. S06 updated the publication producer to v6 and made public outcome plus native-own recovery checks the default. S08 executes those gates; it does not port the JS typed hot path or implement actual stable-memory storage.

Run `cargo test --manifest-path native/Cargo.toml --workspace --locked --offline`, `python3 -B tools/verify_portable_native.py` and `python3 -B tools/verify_host_native.py`. `--legacy-cursors` opts into older bidirectional private-cursor fixtures for port diagnostics; it is not a permanent release requirement. The default tests verify final state, audit events, scores, input retirement and native-own snapshots.

The current source IC host is `canisters/runtime-lab`. Do not add another host laboratory to avoid compiling this one. See [the current contract](../docs/specs/SIMPLIFICATION_V6.md).
