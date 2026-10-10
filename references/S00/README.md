# DTR / Balls 2 The Wallz — S00 engineering checkpoint

**Date:** 20 September 2026  
**Status:** Reference review and engineering plan. No DTR/BTZ implementation or deployable Wasm is included.  
**Release eligibility:** Not a software release; not approved for handling real funds.

This checkpoint turns the BTZ/DTR discussion and the supplied Jupiter Faucet reference into a practical engineering baseline. It preserves actual verification evidence separately from recommendations and unexecuted release gates.

## Read in this order

1. [Engineering plan](docs/ENGINEERING_PLAN.md): repository, components, canister boundaries, runtime contracts and integration posture.
2. [Jupiter review](docs/JUPITER_REVIEW.md): patterns to adopt, patterns not to copy, source path/line evidence and actual checks.
3. [Design corrections and open decisions](docs/DESIGN_DECISIONS.md): changes to earlier sketches before they become code.
4. [Testing and verification](docs/TESTING.md): layers, failure injection, requirement IDs and honest gate semantics.
5. [Security and observability](docs/SECURITY_AND_OBSERVABILITY.md): trust boundaries, money, denial-of-service, cycles metrics and external funding.
6. [Documentation and releases](docs/DOCUMENTATION_AND_RELEASES.md): source discipline, provenance and checkpoint ZIP contract.
7. [Staged delivery](docs/STAGES.md): S01–S08 scope and exit criteria.
8. [IC reference register](docs/IC_REFERENCES.md): primary documentation and skill references reviewed for this plan.

Machine-readable state is in [CHECKPOINT.json](CHECKPOINT.json). Original test results and logs are under [evidence/jupiter](evidence/jupiter). The archive inventory and selected source evidence identify the exact reference reviewed; Jupiter source itself is not duplicated here.

## What is verified in S00

The supplied archive was inspected and inventoried. Four source-level Jupiter checks returned success; one skips release-artifact checks when artifacts are absent. Its frontend test command did **not** succeed as a whole: 137 passing tests and 12 test-file import failures were reported. Dependency installation failed with a registry DNS error. Rust, Wasm, PocketIC and reproducible-build execution remain unverified in this environment.

The S00 package includes its own dependency-free Python integrity verifier and unit tests. These verify the planning package and its manifest, **not** any future Rust implementation.

With Python 3.11 or later, from the extracted checkpoint root:

```sh
python3 tools/verify_checkpoint.py
python3 -B -m unittest discover -s tools -p 'test_*.py' -v
```

`FILES.sha256` covers every payload file except itself. Verify the ZIP's sibling SHA-256 sidecar before extraction. Checksums detect accidental change and establish identity; they are not a signature or security audit.

## Next checkpoint

S01 is the workspace and interface-feasibility checkpoint. It will resolve actual ICP ledger/index/memo/account contracts and establish executable tooling gates before a detailed BTZ implementation. A missing required tool is recorded as blocked, never silently treated as a passing release gate.
