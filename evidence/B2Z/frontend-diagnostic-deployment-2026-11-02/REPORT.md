# Frontend diagnostic release — deployed and verified

Published, qualified source: `aa3a202fa91c640af2f425658f9036fe75a87830`.
Executable parent: `899adec2562b250c59e9c8d66bcc4c3a263da6c2`; the final source
commit adds evidence/STATUS only. The operator published this head; no remote Git
write or credential export was performed here.

[CI 41495569371](https://github.com/aodl/balls-2-the-wallz/actions/runs/41495569371)
completed SUCCESS on that exact head: Native conformance; S14 and million-cell
installed-IC qualification; Source conformance; Browser HTTP and Web Crypto;
Runtime-lab Wasm; Packaged DTR and clean consumers all PASS. The informational
production-inventory wrapper remains substantively **BLOCKED**, not production
qualification. Earlier CI and failed evidence remain unchanged.

The source is ready for ordinary merge into master. A read-only three-tree check
against master `48932aadb0ec7c5e5598c8429662cb90cd133f4a` found no conflicts. This
host's Git 2.34 lacks `merge-tree --write-tree`; its supported three-tree form was
used instead. No merge commit or working-tree merge was made.

## Production frontend publication

The existing authorised asset-only command completed at 18:46:42 UTC:

```sh
NPM_CONFIG_IF_PRESENT=true DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity dfx --identity codex_local deploy observer --network ic --mode upgrade --no-asset-upgrade --no-wallet
```

Frozen normal assets were rebuilt from the clean exact CI head. All fourteen
manifest file hashes matched the earlier qualified executable candidate; only
build-manifest source metadata changed. Public HTTPS fetches verified thirteen
served payloads plus the build manifest against those exact bytes. Asset configuration
is not a served payload; CSP is recorded in public-assets-verified.json.

Deployed app SHA-256:
`8ee6c13b059413ea39af40044dca9f0883773c603a51645aefa4d013fa80fe98`

Deployed CSS SHA-256:
`760ffc86ad7d9306a6b9ec1506f936aabc43263d8675e1f27e33de9cd09eeb24`

Certificate-verified before/after metadata confirms unchanged backend Wasm
`cfcf6130432a040a40738627df65da65d0d5c57195c04d3bb147a848af6d8303`,
unchanged observer asset-canister Wasm
`04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`,
unchanged controller sets and the same 34-node fiduciary subnet. No backend
installation, gameplay pause/resume, controller operation, cycle transfer, account
funding, real ICP payment or campaign restart occurred.

Frontend balance before publication: 2,709,495,918,875 cycles; after verification:
2,704,654,503,030. The 4,841,415,845-cycle net decline includes upload and intervening
queries/maintenance; it is not a gross billed deployment meter or backend burn
estimate. Existing frontend liquid cycles exceeded its freezing allowance and
bounded release headroom. No funding was transferred.

## Focused mobile and operational results

One read-only public Chromium session verified genuine DTR gameplay and both
390×844 and 320×640 layouts. All thirteen toolbar controls were accessible, labels
unclipped, notice/toolbar rectangles disjoint and status/minimap separated. At
320 pixels the notice starts at y=270 after the toolbar ends at y=250. At 390
pixels the notice starts at y=354. Screenshots and bounds are attached.

Live authenticated head: 85761. Actual operational state: Reserve Protection;
notice kind `reserve`, no spinner, Settings agrees. No browser exceptions. Five
cannons/eight balls remained visible; a stationary head in this funding stop is
expected. Manual-stop and unchecked-binding alternatives are covered by the nine
focused diagnostic regressions, not claimed as production states exercised here.
Purchase gating and certificate verification remain unchanged.

## Strategic findings and remaining limits

The accepted economic experiment is retained in the previous diagnostic closure:
24 executions, 28,229 work units, 38.293 seconds; matched budgets and Wait controls.
Timely Move protects a predictable cardinal connection cheaply, but an equally
priced diagonal attack defeats that defence. Additional supporting/recovery balls
can preserve positions where movement fails, at higher full payment cost. Waiting
preserves ICP. These small fixed-horizon fixtures justify no pricing/combat change.

Controlled-population conditional ranking stays planning-only. Unassessed 60/120
second futures remain unassessed; campaign validity/accounts must come from trusted
durable orchestrator state and population must be rechecked immediately before any
future authorised dispatch. The expired campaign stays stopped. A useful next local
experiment is a matched, equal-budget opponent follow-up against the supporting-ball
choice, to test whether its short-horizon survival benefit persists.
