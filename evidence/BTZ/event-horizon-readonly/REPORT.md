# Event Horizon read-only compatibility boundary

At 2026-10-30 21:49 UTC, genuine IC-root metadata verification confirmed canonical
`eo6ei-gaaaa-aaaar-qchra-cai`, module
`e012e7138cfe2d251bd24edf868cb74aa5fd35856412facd926b65ad519cdcca`,
on the 34-node fiduciary subnet. Its documented public `get_instance` query
returned official ICP Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` for both observed and
ICP Ledger fields. Anonymous query signatures and certificate time verification
remained enabled. No certified `candid:service` metadata was available.

Repository source `12268955dca440fef5f7272221009d43c8df3a12` documents the record
`poke(record { global_activity; matches })`, with explicit subject, target,
first block index and maximum individual amount. This differs from B2Z's legacy
vector receiver. Source documentation and the successful instance query do not
establish the deployed outbound sender ABI, an active relevant subscription or
cadence health. Its repository Candid exposes instance/pricing/preview queries;
preview is not proof of subscription admission, subscriber consent or health.
No ready cadence/subscription-health query was established by these observations.

IC Index PR [11882](https://github.com/dfinity/ic/pull/11882) was rechecked: open,
unmerged, current head `76b7e1ea4f9cd034c91c4418891962e1cd430f3f` (different from
the brief's reviewed `5823687…`). It is not evidence of a deployed official
Ledger/Index receiver. B2Z has no dependency on its being merged.

**Notification-assisted mode remains disabled.** Preserve the existing
60-second official Index fallback and bounded catch-up retries. Do not switch
to 600 seconds, change to a 10-second fallback, or trust a hint as a payment.
Do not change the receiver ABI merely because repository HEAD documents it.
No new health polling is enabled: measured assisted-mode savings and added
operational health calls are both zero for this disabled feature. No Event
Horizon change, subscription purchase/endowment or financial operation occurred.

Raw repository snapshots, PR metadata, anonymous query output and IC certificates
are retained under `.work/v6-external/` with an independent SHA-256 manifest.
The optional additive status proposal is separate; its absence does not block
the remaining ordinary B2Z gameplay/API release.
