# B2Z hourly review — reserve protection, no unresolved payments

At 06:40 UTC, **ReserveProtection** was active: nominal/supported gameplay rate
zero, admission closed, performance_limited false. Liquid balance was approximately
**2.8839T** in the separate operational query. This is the actual mode and balance
observation; no tier was forced or inferred from an old threshold. Source binding
remained checked, pending records zero and no source error was present.

All **32 overnight payments** were applied, none unresolved. Expenditure is
**3.6058 ICP including fees**, leaving **3.2941 ICP** within the frozen allowance.
The earlier smoke spent 1.1001 ICP. No top-up, cycles purchase, manual gameplay
pause, source reset or other financial operation was performed. The eight-hour
spending expiry remains **07:14:09.902 UTC**; funding the accounts or leaving budget
unused does not extend it. The ordinary conservation policy caused this pause.
[Time-stamped operational/game status](live-status.json).

The four players retained one cannon/two balls each, with territories
475/763/1786/363 cells. These wall-clock observations at changing tiers are not an
equal-logical-tick strategy comparison. The browser reported no failure. The
recorder held 13 significant publications (about 3.17 MiB), below its bounds.

## Cadence observation and agent-information correction

The adaptive observation process reported 252 refresh attempts over roughly
65 minutes (about 3.9/minute), instead of the old nominal twelve passive checks per
minute. Some urgent action/receipt reads remain, and the interval includes changing
funding mode and paused gameplay. This is an observed query-operation reduction,
not an isolated billed-cycle or artifact-bandwidth savings estimate.

The pause exposed an information distinction: operational funding/admission can
change while the certified gameplay head remains fixed. Commit `7e07794` exposes
operational sample time/age separately from certificate age in agent provenance,
and records observed operational transitions without extra chain calls. Samples
are explicitly not certified gameplay or a complete earlier transition history.
The first recorded ReserveProtection observation cannot establish its exact prior
activation time. [Recorded samples](operational-changes.json).

PASS: **73 focused tests**, plus the focused operational-sample regression after
adding the idle flag. A genuine read-only production `decide` call returned
`paused`, chose Wait and performed **zero forecast work**, rather than inventing
immediate admission or moving physics. Its operational age was explicit.
[Exact live read-only reply](read-only-paused-decision.json).

The original campaign/journal now monitors until its unchanged expiry. Existing
entities remain under ordinary conservation afterward; stopping software does not
remove them. No additional spending authority, controller operation or deployment
is used to bypass ReserveProtection. Remote CI remains NOT RUN for unpublished
local commits; backend/frontend/DTR identities are unchanged.

Next hourly check: confirm automatic campaign expiry, reconcile all paid actions
and actual remaining Ledger balances, and retain the authenticated final state.
Further experiments after expiry must remain read-only or valueless local tests
unless a new paid campaign is explicitly approved.


## Paused monitor startup failure preserved and fixed

The attached 06:48 status records a real safe-stop, STALE_SNAPSHOT. Startup had
applied the thirty-second *payment* freshness check even when only monitoring a
paused game. All 32 transfers remained applied; none was resubmitted. The failure
is preserved, not interpreted as corrupt gameplay or a failed Ledger transfer.

`d8c48d5` uses the existing five-minute read-only observation window at monitor
startup. Payment preparation/submission still require thirty-second freshness;
a genuine-certificate regression proves a sixty-second snapshot passes monitoring
but fails the default financial check. PASS: 74 focused tests. No certificate
verification was disabled or current world invented. The new browser witness
window does not extend no-refresh claims across the safe stop.

The monitor now runs normally with ReserveProtection and closed admission,
recording a separately sourced operational sample. [Resumed monitor](resumed-monitor-status.json).
There is still no extension of the 07:14:09.902 UTC financial approval.
