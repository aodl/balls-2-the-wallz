# TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH

The controller-only lease and loopback console are on the local branch
`feature/b2z-temporary-dev-speed`. The production payment candidate does not
include this branch.

The installed check was repeated on the isolated branch after incorporating
the exact Rules18 baseline `351d96d7059f7f84957af1470c86a7028c588392`. The
disposable executable was
`96c199d2832d78557dadd72551c35af36122f2913a66f21be57bf887b6a85626`.

- Ten pace unit tests passed. Current adaptive tiers retain their existing
  hysteresis. The new tests cover one-second scheduling, expiration,
  immediate deactivation, backlog and the recovery floor.
- PocketIC published three one-tick intervals 1,000 ms apart, applied one
  actual disposable Ledger payment and reproduced five complete publications
  using the independent native coordinator. The test rejected an ordinary
  payer's requests, kept finance and source intact on restart, and prevented
  further publication in ReserveProtection. [Installed evidence](installed.json)
- The real Chromium loopback console toggled both settings, showed a
  countdown and rejected cross-origin, missing-token and invalid-duration
  requests. This browser test uses controlled controller responses.
  [Console capture](control.png)
- The `public-launch` build compiled with the development feature off.
  Selecting both features failed compilation as required. The two temporary
  methods were present in the disposable Wasm and absent in the normal
  Rules18 build. [Operator procedure](../../../docs/operations/B2Z_DEV_SPEED.md)
