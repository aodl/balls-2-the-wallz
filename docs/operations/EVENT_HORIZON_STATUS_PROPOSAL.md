# Optional Event Horizon operational status — proposal only

This interface does not currently exist as a verified deployed service. No EH
implementation, subscription or deployment is authorised by the B2Z release.
B2Z therefore keeps its existing independent 60-second ICP Index fallback.

A small public query could return cached facts from the existing EH poller:
observed Ledger, outbound poke ABI identifier, effective mode, delay after poll
completion, last successful/completed poll times, last processed Ledger block,
error/staleness state, and whether the requested subscriber/subject/target has
an admitted relevant subscription satisfying the locally required threshold.
Return only public bounded eligibility facts, without treasury plans or private
financial records. Computing the reply must not initiate Ledger polling.
An admitted subscription never supplies subscriber consent: B2Z must separately
configure the trusted caller, its own subject, subaccount zero, threshold and
accepted flags. Unsolicited/global-only hints confer no authority.

Once a compatible deployed sender and the relevant subscription can be verified,
B2Z could cache that status for at most 600 seconds and refresh around 300 seconds
from its source worker. Only healthy/current Very Fast or Continuous mode could
select a 600-second independent fallback. Very Fast waits ten seconds *after*
a poll completes; it does not promise ten-second delivery. Missing/unknown data,
errors, stale status or mode downgrade selects 60 seconds immediately, scheduling
an overdue reconciliation from the last successful Index reconciliation. Pokes
must never postpone that deadline. No extra health query per viewer or tick.

Before enabling assisted mode, qualify the real record payload and caller guard,
local subject/target filtering, burst/await coalescing, scheduled collisions,
Index lag, lost wakeups, missed/duplicate hints and health downgrade recovery.
Compare actual saved Index calls with actual health-query costs. The existing
B2Z branch does not implement or advertise this proposed external interface.
