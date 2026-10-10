# Working rules — S07

Start with STATUS.md, checkpoints/S07_REPORT.md, docs/specs/OBSERVER_V7.md and the retained S06 simplification contract. S07 reconstructs an observer from the verified S06 ZIP, not from unavailable prior S07 source.

Preserve BTZ v3 state, scoring, original audit events and seal bytes. Publication remains v6; compact presentation remains btz-animation-1. Do not add another coordinator, persistence framework or canister laboratory. Keep operational status out of immutable artifact identity.

The offline observer never submits commands or makes gameplay decisions. It verifies local content, projection bindings and visible final-state reconstruction, then uses the existing playout clock. Pins bundled with the same recording are not IC authenticity. Missing real certificates cannot silently become authenticated mode.

Browser test modes differ: HTTP means real server/browser Web Crypto/CSP; isolated fixture mode means unchanged application modules in an in-memory document, synthetic fetch and host SHA-256. Report each honestly. Chromium navigation is restricted here; do not modify policies or install a browser to make a gate pass. No metric estimates from local test work or elapsed browser time.

Required conformance is public output equality and each implementation's recovery, not permanently identical private JS/Rust cursors. Keep independent references. Never rewrite historical goldens merely to match a port. Rust/Cargo remain unavailable; source inventories are not native execution.

Run tools/check.py source and all with captured logs. Browser tests have their own bounded runner. Keep PASS/FAIL/BLOCKED distinct. The source test tier needs Node/Python but no dependency installation; optional Playwright tests use already installed tooling. No remote installer, deployment, controller change, wallet or transfer without authorization.

Save progress to disk incrementally. Each delivered checkpoint is a complete source ZIP with predecessor identity, actual evidence, full hashes, fresh extraction and deterministic packaging checks. Do not publish an unfinished working archive as a release.
