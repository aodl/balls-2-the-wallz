# Audio corrective qualification — not release-qualified

Starting published source: `c2818281219bcfb9979a32ff0d4e5ffbf658e4dc`.
The original frozen runtime was `a2aa9a25c14b711e853857b013bbf0e4855ce8de`.

This maintained closeout is in progress. Original failures remain in
[historical candidate evidence](../audio-integration/REPORT.md) and the raw
`.work/audio-corrective` captures. No hosted PASS is claimed for local corrections.

The contracted-view source occlusion is a real CSS defect: the audio wrapper at
x=336..380/y=66..110 covered source (335.6033,109.9646) in 390x430 at DPR1.5.
The identical camera/fixture with the previously qualified non-audio layout hit
`#board`; current layout hit `.audio-controls`. Narrow short-edit left anchoring
clears this working area without changing camera, panel or financial logic.

A separate deterministic regression reproduces adding FX during an in-flight
native music decode: prior cancellation fenced the music load and then marked
FX unavailable because the native decoder remained busy. Independent lane toggles
now preserve the current load; full mute/stop/lifecycle still fence generations.
A new explicit load can wait boundedly for the old native decoder to finish,
without fetching/decoding in parallel or accepting the old cancelled result.

No approved music/effect files, memo codec, authority, renderer budget, gameplay,
backend, source reconciliation, prices or paid state were changed. No remote
publication, deployment, canister installation, funding or financial action was
performed. Physical listening, real-device performance, rights and production
costs remain prerequisites; see [manual acceptance](MANUAL_ACCEPTANCE.md).
