# Rules13 release plan

Production verification in this development task was read-only. Production remains on Rules12. No deployment, epoch activation, funding, pace change or real payment was performed.

The approved scope is development and non-force publication of the feature branch. A production release starts with separate approval for the exact [embedded frontend module and same-ID migration](embedded-frontend/RELEASE_PLAN.md). Backend activation then requires approval of both provisional Deflector prices, the exact normal backend Wasm and the state-preserving transition. Preserve the legacy frontend snapshot for Rules12 recovery and a verified Rules13-compatible frontend Wasm for recovery after activation.

Promote only an exact source and artifact set with the six hosted gates plus disposable Ledger/Index, independent replay, controller upgrade/recovery and genuine browser acceptance. See [upgrade and recovery](UPGRADE_AND_RECOVERY.md) for ceremony and compatibility boundaries, and [economics](ECONOMICS_AND_OWNER_DECISIONS.md) for the provisional prices.
