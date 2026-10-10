# S03 evidence index

`verification/verification.json` is the final full gate run: 840 Node tests and
35 Python tests pass; native/IC promotion remains BLOCKED. Its `logs/` directory
contains each command's actual output and `environment.json` records tool presence.

`local-workload.json` compares slower and optimized execution under identical v3
rules. Abstract work units are not instructions or cycles; elapsed time is a
single local run including snapshots. No ETH-equivalence denominator is invented.

`logs/` contains incremental development runs, including early failures before
fixes. Names containing `initial`, `first` or similar are not release evidence.
`input-normalization-regression.log` verifies the final representation fix;
`final-full-gate.log` summarizes the full report. `npm-local-lock.log` records the
actual offline dependency-free npm lock refresh, not Rust dependency resolution.

Canonical expected-data provenance:

* `tests/fixtures/spawn-reference.json`: independent Python masked union-find oracle.
* `tests/fixtures/impact-reference.json`: independent analytical Fraction oracle.
* `tests/fixtures/btz-v3-golden.json`: implementation-derived full regression traces,
  never described as independent proof.

The packaging script validates file hashes and fresh extraction. The final ZIP
checksum, repeated deterministic packaging and a separate extracted-tree source
run are recorded in the externally delivered release-verification JSON. No build,
network test, certification check, actual cycles or deployment is implied.
