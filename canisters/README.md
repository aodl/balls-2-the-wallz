# Canister scope at S08

`runtime-lab` is the only current IC host candidate. It compiles to `wasm32-unknown-unknown` with locked dependencies and passes rustfmt and Clippy. It remains controller-only synthetic infrastructure with a v6 publication/root. A prior v5 root is rejected; no PocketIC upgrade or migration has been tested. Persisted multi-segment retention and the typed hot-path remain open integration work.

`arena-lab` is a frozen S04 storage experiment, not another platform to extend or deploy. `interface-probe` is a diagnostic interface probe, not part of the game service. Their source and earlier evidence remain for reference; they are not additional S06 production release requirements.

No real funds, deployment, ledger authority, certificate verification, or measured capacity is authorized or claimed by any directory here. See the [current contract](../docs/specs/SIMPLIFICATION_V6.md).
