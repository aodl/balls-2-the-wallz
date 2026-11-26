# Certified operational burn prototype

The feature-gated host maintains a bounded estimate from settled total-cycle
observations. The existing treasury callback and successful settlement of an
Index reconciliation check whether a sample is due. No separate periodic
driver runs. Source and treasury calls in flight, as well as uncertain treasury
phases, defer a sample. The settlement test is about the balance measurement
and does not change source admission.

## Measurement

The effective sampling period is at least five minutes. The meter keeps up to
13 samples within the preceding hour and uses actual canister timestamps.
A window spanning at least 55 minutes is established. A shorter elapsed
observation is preliminary. The exact integer formula is observed decline
times the nanoseconds per day divided by observed nanoseconds. Known treasury
credits, a positive balance movement or a large observation gap reset the
window. The last useful rate remains available as stale. Credits coincident
with losses can escape the observation, so the value estimates settled net
decline. It does not represent billed gross cost.

Stable operational slot 4 retains only the last valid record for ordinary
upgrade recovery. After restart, the prior rate starts stale and rolling
samples accumulate again. No operational field enters the canonical
gameplay state, seal, event or score.

## Witness and compatibility

On the `certified-operational-burn` experimental build, `observation` and
`observation_bundle` carry an optional operational record with their IC data
certificate. The host commits:

```text
SHA-256("B2Z-CERTIFIED-OPERATIONAL-01" ||
        SHA-256(canonical publication bytes) ||
        SHA-256(operational record bytes))
```

The fixed-width record contains one byte of version, one byte of quality,
one byte of sample count, two big-endian 64-bit timestamps in nanoseconds,
and a big-endian 128-bit daily rate. An explicitly unavailable record includes
zero fields after the version. Fresh replica certificates, the canister
domain, witness root and canonical publication verification all remain
mandatory. Historical seals and predecessor links are unchanged.

An old observer expects the legacy direct publication root. The compatible
frontend must be available before a separately authorized host upgrade.
The compatible frontend accepts the direct root with no operational
record, including recovery to the exact current host. A composed root
without its exact record fails verification. The displayed optional rate
uses only the witness-bound value. Production activation awaits exact
installed certification, resource overhead and recovery evidence.
