# Rules17 daily economy qualification

The source branch follows the deployed Rules16 toolbar and payment release.
At the initial read-only production observation, the certified backend was
`a5889a92ce936b035d02632588b75ae7f66ddfda73398177dd79cba2b5b48dcd` and the
frontend was
`8cb0d9e375d84c7ca969fbcbc1a9ba2404e9d55afc3d728283ecf723a10e034d`.
Publication 15037 had one Cannon, one Ball, four Reservoirs and
104,000,000 received e8s. The source cursor was 40640535. These measurements
are reference evidence. A fresh authenticated observation is required before
changing either canister.

The shared [Rules17 economics contract](../../../docs/specs/B2Z_DAILY_ECONOMY_17.md)
defines bootstrap, UTC boundaries, grace, Ledger time and capacity semantics.

## Local evidence

- The embedded release inventory contains 88 public files, six gzip variants
  and the complete unchanged set of 61 audio assets. The exact Wasm identity
  is in [embedded-module.json](artifacts/embedded-module.json).
- Five focused JavaScript tests passed, including exact nanosecond grace
  edges and continued purchases and simulation with 1,028 participating
  accounts, 1,045 Cannons, 257 Diverters and 65 Balls in the starting fixture.
  Native conformance reproduced the first paid interval byte-for-byte.
  It used 449 work units and produced 482,559 state bytes, 258,743 event
  bytes and 161 score bytes from 481,398 input state bytes. These are
  synthetic deterministic-kernel measurements.
- Chromium fixture captures show the daily schedule at
  [1440px](browser/daily-pricing-1440.png), [390px](browser/daily-pricing-390.png)
  and [320px](browser/daily-pricing-320.png). Each case copied the exact
  `RESERVOIR 4005` memo from a `0.1 ICP` quote.
- The first installed timing run reached the economy activation and preserved
  the paid state. Its idle-cannon retirement check failed because the older
  timer guard only recognised the original playability activation. Rules17
  now also arms maintenance from its own completed activation record.
- The next disposable run settled all seven paid action types and 17 exact-once
  receipts, including the historical transfers. The retained artifact replay
  exposed a Schema9 allowlist missing from the animation projector. The fixed
  observer plays through all 14 captured records, including eight checkpoints.
  The browser harness also uses the named verification disclosure now that the
  same status panel contains a second disclosure for daily pricing.
- The repaired disposable run passed all 15 authenticated publications and
  17 receipts. The browser's placement UI invalidates the prior proposal on
  an explicit invalid destination, including for historical epochs. Visible
  authoritative entities can grow the instance buffers on demand. Cosmetic
  shadows, glows and distant markers keep their previous draw budget.

## Rehearsal

- Reproduce the reviewed embedded frontend byte-for-byte and compare the
  installed disposable HTTP-v2 body, gzip, status and proof inventory.
- Use the exact archived Rules16 production executable as predecessor.
  Verify unchanged world, recipient, source journal, receipts and credits
  around the normal upgrade and the source-fenced patch.
- Stamp time only in the same message that commits the gameplay segment or
  lifecycle checkpoint. Audit the retained world hash at midnight.
- Run official Ledger transfers with independently read block timestamps.
  Assert late processing cannot reprice them and client creation time cannot
  select the tariff.
- Reproduce all certified artifacts with the independent JS kernel, including
  bootstrap, midnight snapshots and exact receipt values. Compare old epoch
  interpretations and fail closed on mismatch.

## Production rollout after qualification

Measure the frontend and backend liquid balances, freezing floors and identity.
Confirm sufficient installation, compatible recovery, temporary staging and
contingency allowance. Preserve the recovery Wasm and zero-snapshot policy.
Install the qualified compatible frontend on the existing identity and verify
the complete certified frontend while Rules16 is still active.

Pause through the established backend operator interface. Preserve the
authenticated world, source, finance and funding-controller observations.
Verify the exact upgrade bytes and the still-active Rules16 publication.
Call `prepare_economy_transition`, authenticate the freshly sealed predecessor
after the official Ledger/Index cutover and use its exact manifest in
`commit_economy_transition`. The first persisted preparation record is the
backward compatibility boundary. After that point, recover with a qualified
Rules17-compatible normal module only. Resume the same one-tick Trickle
configuration and independently verify the authenticated result and replay.

Stop at a mandatory qualification, certification, financial, source,
continuity or recovery-resource failure. No mutation follows from a local
build alone.
