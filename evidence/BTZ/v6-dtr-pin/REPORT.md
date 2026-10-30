# Published application-checkpoint dependency — development pin verified

The user published DTR branch `checkpoint/generic-application-checkpoints` at
`282d709143dacb4bca769a4d6e72b97fc93ef518`. Remote ref verification and ordinary
Cargo resolution agree; its source tree is
`1e487a321de4f515510da01ac74ef66e4e9a71a6`.

All five Cargo graphs were deliberately updated only for DTR packages, then
fetched with `--locked` before the unchanged fail-closed offline provenance
checker. Every unrelated Rust dependency version/source/checksum is unchanged.
The new npm 0.15.0 archive is packed from those immutable Cargo-downloaded Git
objects, with normalized source modes and npm 11.12.1:
`22fb89851542ce19361a3b78a35c8a921d65e65e27890050b23cfcd1375e7720`.
All unrelated npm package entries remain identical. The historical 0.14.0
archive and its provenance records remain retained.

The initially empty-CARGO_HOME Rust consumer and clean JS package consumer pass.
All 23 package files match the immutable source; fresh archive reproduction is
byte-identical. Source checks pass after correcting an import-order cycle in
local gameplay development and refreshing the current-package version guard in
the v8 compatibility tests. Historical fixtures/goldens and verification
assertions are unchanged. Raw failed/corrected invocations remain under
`.work/v6-dtr-*`; the checked summaries and independent manifest accompany this
report. These checks concern development dependencies and legacy compatibility,
not qualification of the unfinished v6 runtime.

The generic extension authenticates application-supplied zero-logical-time
context without inventing Ledger records or running empty ticks to age timers.
It adds no B2Z clock, scheduler, pricing or game logic to DTR. B2Z's lifecycle
semantics, independent replay, installed-IC upgrade/transition rehearsal and
capacity qualification remain application work. No mainnet change, remote push,
package-registry publication or final runtime qualification ran for this pin.
Production release 1 remains the installed `c7d12fd7…` module with DTR77.
