# Fluid player experience — candidate qualification

Implementation and local qualification in progress. **Not deployed.** The paid
European backend and existing tactical frontend have not been modified by this
work. No canister, setting/controller or financial operation is authorised here.

## Implemented contract

[UX-01..13](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md) remain normative. One
camera controller coordinates timestamp-based pan/logarithmic zoom, interruption,
Focus/Locate, My cannon, widest view and minimap navigation. Direct manipulation
remains immediate. A stable circular territory centroid re-centres the widest view
and exact diamond cut, reusing the existing atlas with at most four rectangles.
Ball picking and following use shared displayed verified positions, preserve zoom,
stop at unavailable coverage and end on manual navigation, destruction or identity
changes. No camera operation owns the observer, queue, clock or a payment draft.

Cannon selection has a persistent dual-tone ground footprint and one five-icon,
44px-target toolbar. Fire/Revive, Move and Build expand one instrument section;
collapse preserves the action draft. Wallet amount, principal, exact text memo,
payer and fee/retention warning remain visible. Legacy-address/hex-memo DOM and
handlers are removed; internal AccountIdentifier/memo bytes and historic records
remain supported. Update/Keep, clipboard fallback and scoped history remain.

The guide is depth-tested at ground height .028, starting .42 cells beyond the
source, with the canonical preview barrel/heading unchanged. White inner/outer
tails are brighter; the bounded tile wake fades independently over 1,250ms while
tail history expires at 350ms. Neither changes ownership/minimap or creates motion
when the verified playhead stops. Waiting for production is labelled “Waiting for
next update”; actual backlog/recovery uses “Catching up with on-chain activity ...”.

The UI-only Move guard excludes the source cell. Valid cell zero remains usable
from elsewhere. The backend interpreter is unchanged: an independent Ledger
client can still send a same-cell command accepted by the existing backend.

## Additional elastic-return correction

The owner extended this candidate before artifact freeze. The deployed warm policy
advanced to endpoint minus two supported wall seconds on each hidden poll. Its
same-head 5/35/300-second regression cases failed before replacement. The new
policy retains an unconsumed remainder or the latest complete useful interval,
keeps the queue/clock identities, and independently advances the authenticated
source/account/receipt head. Same-context resync can retain verified motion across
an explicit future presentation fence; no motion crosses the absent span.

Arrival estimates use distinct advancing heads and a bounded eight-sample cadence
history. Two differences are required; stale/insufficient/changed-context evidence
falls back to nominal. External pacing is 0.5–1.5× nominal with 0.12/s factor slew;
the unchanged pinned clock remains the endpoint ceiling. Delayed playback is
labelled while financial preparation uses current verified facts. Cosmetic history
resets on skips, with valid ball-follow reacquisition at unchanged zoom.

Controlled ten-minute jittered comparisons are in `.work/fluid-player-experience/elastic-measure03/results.json`:
old policy 517.1s of verified advancement / three exhaustion episodes; new policy
570.03s / two. Mean visual delay increases from 50.63s to 58.31s, maximum 119.97s to
127.44s. New effective rate ranges .005–.0128015 ticks/s at .01 nominal. Both still
exhaust coverage. Same-head .8-tick remainders last about 80s instead of 2s; a recent
whole interval lasts 100s. These are injected canonical intervals and controlled
clocks, **not** real background delivery, hardware or production timing claims.

An installed Normal run caught a real adaptive-pacing regression: discarding the
established delivery reserve yielded one stalled sample and 1.1693 displayed
versus 0.9829 admitted ticks/s over 89.53s, with a 4.35s maximum fetch. The unchanged
zero-stall assertion remains. The policy now retains the existing fast-tier reserve
and the larger measured delivery-work margin. A focused regression first failed
and now passes. Slow tiers still admit one complete interval without an additional
startup publication. These failed/incomplete records remain under `installed-observer02`.
The earlier `installed-torus01` failure was an obsolete synchronous Locate-visibility
assertion; the screenshot showed the action correctly visible after animation.
Its visibility, inertness and clock/queue assertions are retained after waiting for
the approved transition. Neither fix changes authentication, production pace or
backend code.

The corrected authenticated torus run passes the original steady assertions:
89.36s, zero stalled samples, 1.0071 admitted / 1.0167 displayed / 0.9847 backend
ticks/s, no resync, 12.86–19.65 buffered ticks, maximum fetch 4.13s. A subsequent
35.06s **controlled** document-hidden interval admitted fifteen newer authenticated
heads from two head queries, retaining one complete two-tick interval (8,590 encoded
bytes versus 74,699 before). The same session/clock/queue/camera survived; first
verified render submission was 31.6ms. Received encoded bytes were 131,979. This is
actual installed PocketIC/SDK/certificate execution, **not** native hidden-tab,
physical-display latency or hardware/phone qualification.

The million-cell run then exposed a cold-start distinction: a foreground snapshot
recovery could invoke warm retention before Normal's startup target was met. The
new eligibility guard preserves the cold foreground buffer while retaining data
for actual hidden/return and established playback. A subsequent startup attempt
reported a transport timeout, backend performance limitation and repeated retention
gaps on a shared host with unrelated compilation active. Those failed records
remain `installed-million04`; no assertion, source deadline or backend budget was
relaxed. The single unchanged-deployed-source comparison also failed the same 60-second
foreground startup predicate (214.34s including setup), using identical prepared
backend/harness inputs and a fresh pinned PocketIC. This supports an environmental
contribution but does not turn either failure into a pass. The million-cell gate
remains unresolved pending exact-source hosted qualification; neither deadlines
nor backend/application safety budgets were relaxed.

## Qualification and identities

Final integrated results and clean artifact identities will be appended after execution.
The original fluid-camera checkpoint is `a37fd351f8e3ac7a35046bc0122069bdd334ddce`.
Before the added elastic requirement, all 1,783 JavaScript tests passed in a bounded
isolated run (333.86s); the earlier 300s contended wrapper failed/incompleted. The
outer source JavaScript allowance is now 600s based on that measurement, with all
application work budgets/assertions unchanged. 199 Python tooling tests, source
structure, references and docs passed. Two unchanged forecast assertions passed
on baseline and candidate in isolation; that alone does not explain every earlier
contended result. Their failed/incomplete record is retained, not relabelled.
The added delayed label exposed a 150%-text header overflow (327px at a 320px
viewport). Preserving the account chip's intrinsic width and allowing the status
to wrap restores a 320px document; the failed integrated06 record is retained.
A focused slow-travel regression also proved that repeated collinear merges could
refresh an old tail for seconds. Merges now stay within 50ms buckets without
refreshing their 350ms creation expiry. Canonical state/ownership is unaffected.
The additional policy passes focused pinned-clock/player regressions; it still requires final
integrated/authenticated/browser and exact-source release qualification.
Initial failing/diagnostic records remain under `.work/fluid-player-experience/`:
`initial-failures.log` (four focused failures before implementation), `browser01`
(exact-scale floating point drift), `integrated01..04` (superseded effect-lifetime,
stale Build anchor and fractional scroll-edge checks), `depth01` (test-script syntax).
They are development records, not passes. A replacement command at the current
camera pose now cancels the prior animation; ball acquisition retains exact zoom.

## Release boundary and limitations

No production deployment under this task. All six substantive exact-source hosted
jobs remain necessary: Source conformance; Native conformance; Packaged DTR and
clean consumers; Runtime-lab Wasm; Browser HTTP and Web Crypto; S14 and million-cell
installed-IC qualification. Inventory is informational. A local subset or dirty
build is not hosted/source release qualification.

Actual application fixtures are disposable canonical kernel outputs, not claims of
IC authentication. Separate installed-IC/HTTP evidence identifies its actual trust
boundary. Software WebGL, emulated touch/keyboard viewport contraction and desktop
mobile viewports do not establish hardware/physical-phone/native-keyboard or
real-wallet qualification. No real transfer is sent. Receipt association is still
not inferred from local instructions, amounts, times or user reports. No new human
research or maximum-population qualification is claimed.

After source qualification and a separate exact-artifact approval, follow the
[installed-game asset-only procedure](../../../docs/operations/S14_OPERATOR.md).
Stage the complete frozen candidate in `.work/s14/assets` and use observer-only
`dfx deploy observer --network ic --no-wallet --no-asset-upgrade`, with the existing
scoped identity handling. Verify every served asset/header and backend module
preservation. On an approved rollback stage the preserved tactical set from
`.work/tactical-polish/frozen-final/frontend` and use that same asset-only route.
Never rebuild, upgrade or reset the backend as part of either operation.

## Read-only preservation inventory (10 November 2026)

A signed anonymous public management status query at 21:07 UTC observed backend
module `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`,
1,643,237,572,290 total cycles, zero reserved cycles and canister version 54553.
This is a total/reserved management observation, not a separately measured SDK
liquid balance, gross burn or lifetime forecast. No top-up or financial recovery
was attempted. Production's fifteen public files still match deployed tactical
identities; the retained sixteen-file rollback directory was checked byte for byte.
Raw inventory is under `.work/fluid-player-experience/{backend,production,rollback}-preservation`
(the precise reviewed JSON filenames are included in the final evidence index).

Local installed tests used normal Wasm
`b14049c0407bbfa5084cc7282b88e7c69631f0deed701142e773788b47479488`
and explicitly disposable test-hook Wasm
`d1f08a35a83be563f275023f732040c039bcf11001c64ead75e8054a71ba6513`.
These prepared local inputs differ from the installed production module and are
not claimed as a byte-reproduction of it. Backend sources, interfaces, locks,
prices and DTR pins were not changed by this task. Exact-frozen frontend checks
against the real read-only European backend are recorded separately.

## Source-publication boundary

The authorised ordinary non-force push was attempted with interactive credential
prompting disabled and failed because no GitHub username/credential was available.
The connected GitHub repository write route independently returned HTTP 403
“Resource not accessible by integration”. No credentials were inspected or
requested, no remote branch was rewritten, and no replacement CI run is claimed.
The final operator command and actual local head will be recorded after freezing.
