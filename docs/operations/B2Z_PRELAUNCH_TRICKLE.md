# European prelaunch Trickle and owner Full Speed

The exact profile was installed and accepted on 25 November 2026.
[Current observations](../../STATUS.md) · [Exact production and recovery bundles](PRODUCTION_RELEASES.md)

The combined frontend/backend installation sequence below records that
completed capped-Trickle activation. For a later **frontend-only** review
candidate against the already installed Rules19 backend, use the
[same-ID embedded frontend procedure](S14_OPERATOR.md#frontend-maintenance)
and [release inventory](PRODUCTION_RELEASES.md). The frontend-only route
does not repeat the backend upgrade, owner binding or gameplay activation
steps below. Every mainnet installation still requires its own exact-artifact
authorization and fresh read-only resource check.

The `prelaunch-trickle` Cargo feature enables the temporary `developer-speed` profile and caps ordinary publication pacing at 10 milliticks per second. The release uses one logical tick per ordinary checkpoint. Funding still selects the existing adaptive tier and admission. ReserveProtection still closes admission and stops ordinary ticks at its existing threshold. The public-launch build excludes both the cap and the developer exports.

The public observer reports the effective pace. The temporary developer frontend displays the effective scheduler rate alongside the funding tier in the signed-in owner panel. A change in the funding tier leaves the existing due time alone when the effective ordinary mode stays Trickle. Ordinary publication schedules the next tick from actual completion, avoiding shortened intervals after delays. A fresh scheduler waits one interval before its first ordinary tick. Ledger/Index deadlines, block times, tariff rollover, gameplay rules, input ordering and certification are independent of this profile.

Only the controller-bound owner principal can start Full Speed in this profile. The controller can cancel the window and revoke or rebind its owner. The existing 120-second default, 300-second maximum, performance and cycle reserve checks, and failure fences still apply. Automatic expiry and manual cancellation return to capped Trickle while admission stays open. The heap-only owner binding and any active speed window clear on upgrade or restart. The initial host recovery and low-resource paths keep their existing safeguards.

## Qualification and funding

Use the exact developer frontend and `prelaunch-trickle` Wasm from the exact candidate’s hosted jobs. The plain developer Wasm built by the same job represents the legacy qualification path. The `prelaunch-trickle,test-hooks` Wasm is confined to disposable resource checks. The exact Rules19 predecessor is the published `b258ec…` normal executable.

Nominal Trickle burn projects to approximately **0.544T cycles/day** at the two-Ball mainnet workload, using 864 checkpoints at 0.412B cycles plus the observed 0.188T/day background projection. The existing Full Speed reserve check requires at least **2.07T liquid** to arm a default 120-second window, subject to the other safeguards. Recheck liquid cycles and all active reserves before every authorized operation. [Production trial](../../evidence/B2Z/rules19-compact-reservoirs/PRODUCTION_TRIAL.md)

For two retained **settled, authenticated** read-only observations, run
`python3.11 -B tools/estimate_operating_runway.py FIRST.json LAST.json` from
the checkout. The offline calculator uses exact balances and actual elapsed
time to report a workload-specific **net** cycles/day rate and dated time to
the reserve and default Full Speed cycle floors. It does not authenticate the
input files, query production or infer gross expenditure across unknown credits.
Keep the original signed observations and inspect any intervening top-up or
temporary reservation before acting on a projection.

Allocate **60B backend cycles** and **450B frontend cycles** for installation and a possible rollback. Disposable same-canister rehearsals used about 23.50B for the backend upgrade and 23.34B for its rollback, and 185.49B for the frontend upgrade and 180.16B for its rollback. Keep those budgets separate from operating cycles and freezing reserves. At the observed workload, seven days of continuous Trickle projects to about 3.81T cycles and 30 days to about 16.32T.

## Historical combined same-canister installation sequence

1. Recheck both certified module hashes, actual pause, payment and Index state, currently available cycles, and the two raw installation and recovery pairs. Compare the paid Rules19 head, source cursor, state, event and score artifacts and retained history. Use the existing European IDs and the same controller procedures.
2. Upgrade frontend `s2jxj-liaaa-aaaas-amynq-cai` with the exact certified developer frontend Wasm. Verify certified assets, CSP and the optional owner panel on `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`. Preserve the permanent derivation origin. The panel presents the temporary controls and its backend methods become available when the backend upgrade succeeds. The public predecessor continues to serve and verify the paid state during this step.
3. Upgrade paused backend `s5ir5-gqaaa-aaaas-amyna-cai` with the exact no-test-hooks capped release Wasm and empty Candid arguments. Authenticate the unchanged Rules19 head and paid-state artifacts, verify the source and retained receipts, and confirm the optional Full Speed status reports a paused backend with no active window. This is an ordinary same-epoch upgrade using Schema11 and Adapter12.
4. The controller calls `bind_dev_speed_operator` with the owner’s verified Internet Identity principal from the permanent frontend origin. Validate owner sign-in and the pending authorization while paused. A later upgrade or restart requires the same explicit rebind. The controller can cancel or revoke if needed.
5. After activation approval, resume ordinary gameplay with one tick per publication, the existing one-second timer setting and work budget 512. Confirm effective 10 milliticks per second with a higher underlying funding tier, adaptive admission and verified presentation. Begin ordinary operation with the temporary override off. Over the first 15 minutes, check that certified heads advance by one logical tick at intervals of at least 100 seconds, the source stays healthy, and wallet preparation is available without submitting a payment. Compare settled balances and callback counts against the rehearsal. Temporary Index reservations can reduce individual balance readings.
6. For recovery, pause and upgrade the same IDs with the exact recorded compatible frontend and backend predecessors. Verify the saved Schema11 head, retained receipts and source continuity before a further resume. Restore the public frontend when reverting to the normal public backend so the displayed controls correspond to its exports. Neither direction requires a reset, new epoch, snapshot or payment.


## Owner sign-in acceptance

1. Open the [permanent European origin](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io).
2. Open **Game status**, then **DEV ONLY · Simulation speed**.
3. Select **Sign in as owner** and complete authentication in the official
   provider window using the identity already bound by the controller.
4. Confirm the owner status shows the current effective scheduler rate and
   funding tier, and that the authorized controls appear. Record the time and
   visible result without capturing credentials or exporting delegations.

Leave the speed override inactive during this acceptance. A live Full Speed
window requires separate authorization and a fresh resource check.

## Read-only runway observation

```sh
node tools/observe_europe_prelaunch.mjs --output .work/europe-check.json
node tools/observe_europe_prelaunch.mjs --baseline .work/europe-check.json --output .work/europe-later.json
```

Run the second command after a comparable operating window. The observer
verifies both module identities and the publication certificate, checks the
source descriptor and uses signed public status and health queries. The
backend balance bracket subtracts only the estimated freezing requirement
from the *observed gap* when testing for additional reservations. The
reported liquid balance comes directly from the runtime health response.

A fresh projection requires at least one hour of comparable settled samples.
Positive balance movements, a changed module or runtime, and known credits
can invalidate the comparison. The result estimates settled net decline.
The Full Speed cycle floor is only one prerequisite. The separate frontend
estimate subtracts the freezing requirement and the existing 450B
installation/recovery allowance from the observed management balance.
