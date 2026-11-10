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

## Qualification and identities

Final results and clean artifact identities will be appended after execution.
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
