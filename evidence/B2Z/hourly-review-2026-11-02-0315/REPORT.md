# B2Z hourly review — retired artifact race

At 02:33:59.826 UTC, the local runner stopped safely on the exact host response
`publication unavailable: snapshot resync required`. All 19 overnight payments
remained applied, with no ambiguous transfer and unchanged 3.6032 ICP expenditure.
The authoritative game continued; it was never paused, reset or redeployed.
[Original failed status](failed-status.json).

The observer handled missing predecessor publications but did not handle a valid
retained publication whose separately fetched artifacts had already retired.
This is an observation/integration defect, not a paid-state or gameplay defect.
Three genuine-certificate regression tests initially FAIL under the original code;
those raw failures remain under `.work/b2z-retired-repro-FAIL.log`.

Commit `e165399` catches only the exact artifact-transport retirement response,
then reuses the existing authenticated snapshot resync with a fresh certificate.
Retries are bounded to three. Last accepted heads remain monotonic. Intervening
unavailable history is explicitly marked; it cannot supply invented receipts or
combat. Diagnostics retain the warning after a successful verified recovery.
Persistent retirement still fails safely. Certificate errors, same-height conflicts,
wrong contexts, invalid chains and artifact hash failures are not retry-classified.

PASS: **80 focused tests**, including the genuine certificate/sequence/artifact
fixtures, one-off retirement recovery, bounded persistent failure and a bad
certificate after a retired transport response. No DTR change, verifier bypass,
frontend reload or payment resubmission was used. Remote CI remains NOT RUN for
these unpublished local commits; production module identities remain unchanged.

The same approved campaign/journal resumed in a separately labelled phase and a
new browser witness window. The prior browser was closed by the runner's safe
shutdown; no continuous-browser claim spans the shutdown. The accepted floor
restored at head **84034**. Fresh certified state resumed and the recorder explicitly
logged missing heads **84035–84542**. No earlier combat was reconstructed.
[Fresh resumed state and operational observation](resumed-status.json).

At 03:17 the fresh readout showed Conserve (0.2 ticks/s), about 6.429T liquid,
healthy source and no performance throttling. This is operational telemetry, not
a certified billing meter. The original spending expiry remains 07:14:09.902 UTC.
No funding transfer or additional spending authority was requested.

Next local test: exercise the planner in an entirely dormant world. Waiting can
idle logical time while a revival restarts it, so compare the reported horizon
coverage before assuming the current matching rule can value a revival. This is
an untested agent-policy hypothesis, not a reported authoritative defect.
