# B2Z hourly review — dormant revival and pause semantics

At 04:20 UTC, all **22 overnight transfers** were applied; no player was paused,
no payment was ambiguous and the public witness had no failure. Overnight spending
was **3.6038 ICP**, leaving **3.2961 ICP** under the unchanged original allowance.
The game remained Conserve (0.2 ticks/s), with about **4.337T liquid**. Funding may
naturally descend; no Normal-mode funding or top-up is required by the runner.
The reviewed active phase completed 246 forecast evaluations, all complete.
[Time-stamped live status](live-status.json).

The new recorder saved three actual publications for paid cannon moves (713,251
bytes total). Independent re-verification PASS: original historical IC root and
certificate/delegation, retained predecessor links, full events artifact hash,
canonical final-state hash, and selected original events. Recorded-time checks
cannot authorize a fresh payment. [Proof-check results](verified-combat.json).
The recorder has not yet captured a new live combat elimination; move evidence
must not be misrepresented as death-event evidence.

## Reproduced local agent defect and correction

The dormant-only fixture has no live balls. The valid positive-price revival
launches one ball for 0.1 ICP (fee extra). The old planner rejected that useful
forecast because Wait completed zero logical ticks while revival completed four:
all three scenarios were labelled MISSING_MATCHED_WAIT. The authoritative kernel
and price were correct. [Original result](revival-before.json); the failing
regression is preserved under `.work/b2z-dormant-policy/regression-FAIL.log`.

Commit `2edb523` preserves both logical progress and the explicit assumed elapsed
window. Normal comparisons retain matching logical horizons. An idle baseline is
compared under the same elapsed window and explicitly labelled
`elapsed-window-with-idle`, showing both tick counts. The corrected test chooses
the positive-price revival without inventing free progress for Wait.
[Corrected exact-kernel forecasts](revival-after.json). This planning comparison is
not an equal-logical-tick strategy performance claim.

A second local defect was fixed: zero funding pace previously fell back to a
five-second tick and could forecast immediate admissions/progress despite the
pause. Zero funding, disabled gameplay and closed admission now report paused,
perform zero forecast work and make default policies Wait. Funding reduction,
manual pause and future resume are not silently conflated. Existing authenticated
elapsed-expiry maintenance remains independent; no backend lifecycle rule changed.

PASS: 69 focused observer/analysis/executor/interface tests, followed by the focused
pause/analysis/interface run after adding manual/admission-pause coverage.
PASS: 18 native/reference equality checks, bounded work and wrong-artifact checks.
No real payment was made for these dormant/pause tests. Existing live spending
remains within the original campaign; no source/payment history or game epoch
changed. Remote CI NOT RUN for unpublished local commits.

The pilot resumes in labelled phase `policy-v2-idle-and-paused-semantics`, with the
same browser window, approval, journal, balances and 07:14:09.902 UTC expiry. Next
hour: observe the natural funding-tier change, confirm reduced wall-clock speed is
represented correctly, and check any newly recorded combat/receipts. No automatic
funding, balance reset or administrative gameplay intervention is authorized.
