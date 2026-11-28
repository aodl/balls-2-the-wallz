# Rules20 European prelaunch continuation, 28 November 2026

Production preflight stopped at controller access. Both certified Wasm
identities still match the installed Rules19 backend and manufacturing
frontend. The active `codex_local` principal appears in both certified
controller sets. DFX rejects its plaintext identity on mainnet. The
anonymous `controller_work` query confirms it needs a controller.
An existing secure signing path for a principal already on both canisters
is required to complete controller preflight and execute the upgrade.

## Production observations

The 08:48 UTC settled bracket gave 2.004892T total and 1.946958T liquid
backend cycles, 0.767459T total frontend cycles, and 0.113742T frontend
headroom after estimated freezing and a 450B upgrade and recovery
allowance. The 7,224-second comparison measured 0.591206T/day net decline
over 72 publications. At that rate and workload, 1T ReserveProtection
is 1.60 days away. Liquid balance is 123.042B below the 2.07T Full Speed
floor. Capped Trickle was open at 0.01 ticks/s. The settled observation
shows room within the existing 60B backend and 450B frontend allowances
for the direct-root pair. The combined profile requires its own budgets.

The read-only observer authenticated Rules19 and Schema11, head 19,836,
source frontier 40,647,923, one score row and 108,100,000 e8s received.
The certified authorization registry had zero grants. Signed operations
showed a bound Index, no pending inputs and no run or source error. The
official Index status separately reported 40,761,220 synchronized blocks
at 09:00 UTC. Fifteen consecutive retained publications and their state,
event and score bodies were verified and archived locally. The oldest
publication rotated out during capture. There was no maintenance
transition in signed public status. A controller observation of work
reservations and maintenance coordination remains needed before mutation.

The visible journal supports the healthy path at the observation time.
Recheck the paid journal and source cutoff before choosing the path.
Neither canister was upgraded or paused. Anonymous owner speed access was
denied, and the historical controller binding must be checked by the
authorized owner after an upgrade because it is held in heap memory.
[Certified observations](production-operating-2026-11-28-0848.json)

## Exact direct-root fallback

The fallback uses the same qualified capped-Trickle backend from source
`995bbb962c3fe01da98775bbadffc2ba7491f4d1` and artifact 15251183760 from
the same developer workflow. The raw backend SHA-256 is
`5c373613320ce733de51da958a1cf16f0e1febc8b788791afe0fc312d7c61a18`.
The 92-asset developer frontend SHA-256 is
`e01072323a6088db9694059850a67a70c4f991922893b643c38ba762a49020cb`.
The permanent origin, backend ID, both successor identities, and developer
entry point are embedded. The controlled owner UI passed at desktop,
390px and 320px. The same-source hosted run tested the pair on the
Rules19 predecessor identity and ran all 28 installed Rules20 cases
against the backend. The predecessor and both rollback boundary rules
remain in the release procedure.

A local PocketIC same-ID rehearsal installed the exact candidate frontend,
verified its 92 HTTP assets and 28 alternate routes, and restored the exact
91-asset manufacturing frontend with all 28 alternate routes. The first
attempt timed out during restore verification. The complete retry passed
in 621 seconds. The immediate debits were 185.578B to upgrade and 185.524B
to restore in that fixture. Release assets were downloaded and all 11
listed payloads passed `SHA256SUMS`.
[Published fallback](https://github.com/aodl/balls-2-the-wallz/releases/tag/candidate/europe-rules20-prelaunch-direct-2026-11-28) ·
[Fallback manifest](RULES20_DIRECT_PRELAUNCH_FALLBACK_2026-11-28.json)

## Combined qualification in progress

Draft PR 27 preserves the DTR 0.16.0 lock and pins telemetry to the same
capped Trickle profile that executes the 28 installed successor cases.
Operational record storage owns slot 4, separate from the coordinator,
retained artifacts and treasury. The maintained browser, agent and
operator bind the record and publication to the composed certified root
before passing the authenticated publication digest to DTR. The developer
frontend displays the approximate settled net decline with interval and
sample age. Unknown external credits can reduce the displayed estimate.

The no-test-hooks local backend built and passed the export inventory.
Its healthy transition, compatible restart and independent replay case
passed. A local telemetry fixture missed the required predecessor
publication after compaction. Commit `c2fa5825` adds that publication
before activation. The earlier frontend freeze failure came from a local
symlinked npm installation. The corrected clean-lock frontend built twice
byte identically on hosted source `c2e4a375` and passed owner browser
checks. Exact combined source qualification, active burn measurement,
combined release freeze and production acceptance remain pending. The
qualifying workflows for `c2fa5825` are standard 46128567112, financial
46128566815 and developer/prelaunch 46128566848.
[Combined integration](https://github.com/aodl/balls-2-the-wallz/pull/27)
