# Immutable embedded frontend

The Rust frontend follows Jupiter's embedded-directory and IC HTTP-v2 certification architecture. The reference was master commit `a4391db42d3efd990dcea4174b2e6a8f1661f088`. Its build, Rust router, Candid and standalone error page were reviewed. B2Z keeps its own website, security policy and asset identities. [Jupiter reference source](https://github.com/aodl/JUPITER_FAUCET_SUITE/tree/a4391db42d3efd990dcea4174b2e6a8f1661f088/canisters/frontend)

The crate embeds the whole staged public directory with `include_dir!`. It builds the exact GET and HEAD certification tree on install or upgrade. GET uses the library's router. HEAD has its own method-bound certification and an empty body with the identity representation length. Unknown requests fall back to the embedded branded page with status 404. The recorded build strips mutable upload policy, the deployment manifest and the build manifest from the public directory. Hardened policy is compiled into the response configuration instead.

The only Candid method is `http_request`. There is no stable asset store or application method for individual asset writes. The SHA-256 of the exact raw Wasm becomes the release identity. Per-file and encoding hashes, the certified routing tree and the backend's ordinary independent verification serve distinct purposes.

All 61 approved audio files retain exact bytes and identity encoding. Other approved assets include deterministic gzip variants for HTML, CSS, JavaScript and Markdown. Non-content-addressed public asset names use `no-cache`. Existing digest-named FLAC URLs retain immutable cache policy.
