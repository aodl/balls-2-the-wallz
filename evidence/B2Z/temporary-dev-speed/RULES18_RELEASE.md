# TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH

The release source is `04538efd1796d3d12784a29e4c09506decbeccca` on
`feature/b2z-temporary-dev-speed`. It starts from the exact Rules18 runtime
source `351d96d7059f7f84957af1470c86a7028c588392` and incorporates the
production origin and activation record at `366b6954cc0df7dba75cd70318fdaf3072430914`.
The production Rules18 branch and the ordinary app bundle retain their exact
bytes. The development frontend adds one certified script and references it
from `index.html`. [Operator guide](../../../docs/operations/B2Z_DEV_SPEED.md)

The developer control uses a separate memory-only Internet Identity session
on the permanent frontend canister origin. An existing controller can bind
and revoke one public owner principal for speed control. The authorization
does not change controllers, game ownership or financial permissions.

## Local qualification

- The real game Status panel passed at 1440, 390 and 320px with controlled
  authentication and transport. It exercised owner sign-in, explicit speed
  changes, expiry, readiness and custom-origin refusal.
  [Browser results](game-browser.json) · [Desktop](game-status-1440.png) ·
  [Narrow](game-status-320.png)
- A disposable rehearsal upgraded from the exact production Rules18 binary
  with six queued Ledger inputs and live Balls. Three checkpoints landed at
  100, 1,100 and 2,100 ms and used 1.725B cycles in that fixture. Adaptive
  resumed at 10 milliticks per second. Independent replay matched all 20
  captured publications, including signed disposable payment results. The
  original normal module recovered exact state, finance and source position.
  [Upgrade](rules18-local-upgrade.json) · [Independent replay](rules18-local-replay.json)
- Installed checks covered nonowner rejection, controller-only binding,
  revocation, manual deactivation, timeout, restart and ReserveProtection.
  [Pacing and authorization](owner-pacing.json)
- Independent embedded frontend builds matched the hosted frontend byte-for-byte.
  Certified HTTP checks verified 90 assets, seven gzip representations, 60
  audio files, 28 alternate GET/HEAD responses and a genuine 404. Public-launch
  checks rejected the development backend flag and the temporary frontend
  asset. [Installed frontend verification](local-certified-http.json)

## Hosted qualification

Both jobs passed on `04538efd1796d3d12784a29e4c09506decbeccca`. The
independent frontend builds matched the artifact installed for IC HTTP
certification. The reviewed hosted backend is the same executable that
processed six queued inputs and was recovered to the exact normal predecessor.
Its three Full Speed checkpoints used 1,724,790,165 cycles in the disposable
fixture. Production usage remains to be measured.

| Qualified Wasm | SHA-256 |
| --- | --- |
| Embedded developer frontend | `f7c9450f9fccf77cc7f2d4dd0c41066d9addf02af0bad3cedd6400e493faaad0` |
| Developer backend | `9fb444b041a7b699f0cf92159a2505d1bdf4cb3dc5e092fc4b85310b1deb0d42` |

The development-specific workflow checks reproducibility and the actual
Rules18 predecessor. The earlier standard run applied the original frozen
runtime manifest to the development branch and rejected its changed backend
inputs. That manifest still applies to the separate Rules18 production branch.
[Development qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45133912176)

## Production readiness

At 08:05 UTC on 23 November 2026 the frontend had 604.560B total cycles and
a 203.132B freezing floor. It had **401.428B liquid cycles**, **92.572B below**
the 494B installation and compatible recovery allowance. The backend had
2.345T liquid cycles after its freezing floor. The frontend shortfall blocks
the coordinated installation. The live modules are still the exact Rules18
baseline. Mainnet activation, the full two-minute run and owner operation
remain pending. [Read-only resource check](release-budget.json)
