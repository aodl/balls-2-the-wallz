# Final European entry correction — locally qualified; publication blocked

Exact artifact source: **`07693c7f5a2102fce080ed6fbe156512d4c6fbe9`**.
A following evidence-only commit records these results; it does not replace this
frozen source identity or qualify it through another commit's CI.
The attempted ordinary push failed for missing HTTPS write authentication.
GitHub's branch was checked directly and still points to `4db8279`; this final
source has no hosted CI run. No installation or asset upload occurred.

```sh
git push origin 07693c7f5a2102fce080ed6fbe156512d4c6fbe9:refs/heads/release/btz-prelaunch-playability
```

Publish that source and obtain its six substantive hosted jobs before installation.
The separately labelled BLOCKED production inventory is informational. The prior
[4db8279 run](https://github.com/aodl/balls-2-the-wallz/actions/runs/42400350684)
failed Source and installed-IC integration; it does not qualify this revision.
Its public logs were unavailable; the supplied log shows only the integration wrapper.
Locally, obsolete archived-certificate policy and 60-second health-test assumptions
were reproduced and corrected, with their assertions preserved. Exact new hosted
CI remains required; other causes of the old integration failure are not ruled out.

## Source and artifact reconciliation

[Complete ancestry and exact application diff](reconciliation.json) records all
387 ancestry records through the artifact source and the full relevant chain from `9820380`.
`a69723e → 35feac4 → 4db8279 → 94e6d48 → 07693c7` is continuous, without a reset,
rebase or cherry-pick substitution. Preserved local freezes reproduce both user-stated
packages; an independent examination of the supplied ZIP is not claimed.

At `4db8279`, `arcade.mjs` gives `DEGRADED_BUFFER` network-delay text precedence over
Trickle, and `play-reference.mjs` excludes that phase from the Trickle indicator.
That adds 134 bytes to the built JS. HTML/CSS and the old backend bytes stay identical.
The old manifest also changes because JS and build provenance change. These hashes
are distinct packages, not alternative names for one release.

| Artifact source | Normal backend | Frontend JS | Complete file manifest |
|---|---|---|---|
| `a69723e` | `c4b7b910…` | `0870c699…` | `a860019e…` |
| `4db8279` | `c4b7b910…` | `15928f74…` | `6132ec22…` |
| **`07693c7` final** | **`612ad0d0…`** | **`15928f74…`** | **`919eba1e…`** |

Final SHA-256 identities:

- Normal backend: `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend JS: `15928f745abb7ec918cef4aa0bd514cf3d351fac666507adbba6e1e40a7b348e`.
- Complete 15-file manifest: `919eba1e186a299affdcf97ed027429078919b15f8a6cccf1a2eed3852177f9e`.
- Unchanged DTR: `282d709143dacb4bca769a4d6e72b97fc93ef518`, client `0.15.0`.

The clean reviewed builders froze `.work/europe-final/frozen/backend/normal.wasm`
and `.work/europe-final/frozen/frontend/`. [Backend manifest/exports](backend-manifest.json),
[frontend provenance](frontend-build-manifest.json), [every file](frontend-ready-files.json)
and [security headers](security-headers.json) were checked against actual bytes.
The final frontend was rebuilt; all payload files equal `4db8279`, with only its
build-provenance file changed. Its prior browser qualification is reused by byte equality.
The freezer re-encodes Wasm while attaching checked Candid metadata: raw `b14049c0…`
is not the frozen candidate. Startup, floor, pending-payment and health checks were
rerun against the exact metadata-bearing `612ad0d0…` artifact.

## Focused correction and checks

Production logic changes only `TRICKLE_ENTER`: **1.5T → 1.25T liquid**. Exit remains
**below 1T**; Trickle remains .01 ticks/s. Upper bands, hysteresis algorithm,
source/treasury/transition floors .15T/.2T/.5T, prices, physics, rules and payment
interpretation are unchanged. Event Horizon stays disabled; fallback stays 60 seconds.

[Natural starting-budget probe](natural-budget.json): normal production Wasm,
1.5T initial total, empty supported v3 genesis and all four authenticated transitions
to current rules 7/world schema 6/epoch index 4. No cycle addition/burn, liquid override,
synthetic gameplay endpoint, imported history or arbitrary source cursor is used.
The ordinary controller API enables the disposable-local treasury to match mainnet's
normal enabled policy. Empty maintenance runs; the world idles without extra ticks.

The scheduler selects **Trickle, admission open**, with **1.420911235679T query liquid**
after activation/maintenance. A normal valueless Ledger command applies without a site,
quote or poke in **92 virtual seconds**; trajectory production advances.
A normal upgrade preserves the paid world and cursor, with **1.401542594169T query liquid**
remaining. Query values are observations, not claims about every callback's reservations.

[Floor/protected recovery](floor-and-recovery.json) separately verifies permitted
execution and below-1T Reserve, world preservation, source maintenance and upgrade.
[Pending-payment recovery](pending-recovery.json) holds an admitted payment in Reserve,
preserves it through upgrade and applies it once after disposable replenishment selects
Trickle. No test overrides the liquid API: deliberate low-budget tests burn actual
cycles; the natural starting-budget case does neither. Bounded headroom supports this
entry correction; maximum-population capacity and indefinite lifetime remain unqualified.

[Focused results and raw references](verification.json): 50 host tests, 94 focused JS
checks, 18 archived-certificate checks and the named installed probes pass. A separate
low-liquid treasury defer/recovery check passes. The health test now advances through
two existing 300-second maintenance samples, preserving the full bounded/anonymous/
non-authoritative assertions. Archived proofs use their recorded deployment, while an
additional test proves the European policy rejects a former-backend certificate.

Unchanged human-interface payment/copy/disappearance regressions and browser checks
are reused from the [reviewed European UI evidence](../europe-release/REPORT.md), including
320×640, 390×844 and desktop. Those are synthetic browser journeys, not a production
European observation. Original raw failures remain under `.work/europe-final/`; no
full-source or hosted pass is inferred from a repaired focused test file.

## Targets, remaining action and limits

[Fresh certified target checks](target-preflight.json) verify the expected European
subnet and all 13 node identities, unchanged controller principals and **no module**
on both targets. Management totals at the recorded check:

- Backend `s5ir5-gqaaa-aaaas-amyna-cai`: **1,499,847,335,121 cycles**.
- Frontend `s2jxj-liaaa-aaaas-amynq-cai`: **1,499,847,595,219 cycles**.

These are total balances, not post-install liquid values. Actual installed rules,
source/treasury readiness, selected tier, served hashes/CSP and desktop/mobile
production smoke are **NOT_RUN**. [Website target](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/)
is not installed. After CI, follow the current procedure, rechecking state/balances/history before install.
Use only the exact frozen artifacts and rehearsed transitions; reconcile ambiguous replies.

The newly derived default-account AccountIdentifier is
`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
The fresh signed [official Ledger/Index check](account-check.json) shows zero balances,
no account transactions/oldest ID and the correct official Ledger binding. Certified
game-source verification awaits installation; this document is not a live payment card.

The [active operator procedure](../../../docs/operations/S14_OPERATOR.md) contains only
current European instructions. Historical executable commands were moved verbatim to
[a separately labelled archive](../../../docs/operations/S14_OPERATOR_HISTORICAL.md).
Current aliases and deployment defaults contain no former target. The frozen historical delivery assertion builder remains outside this deployment route.
Immutable historical evidence is unchanged.

The former deployment, its authoritative state, backend module and financial records
were untouched. Ledger-first authority, exact paying-account authority and all DTR
certificate checks remain intact. No real ICP payment, cycles transfer/purchase,
controller change, subscription or notifier operation occurred. Public receipts still
lack original memo evidence, so automatic packet association is unavailable. No human
participants, actual-device/soft-keyboard study or real-wallet payment test occurred.
