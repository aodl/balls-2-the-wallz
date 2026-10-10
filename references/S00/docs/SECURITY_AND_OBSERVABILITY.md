# Security, operations and observability

## Authority map

| Component | Authority | Explicitly not trusted for |
|---|---|---|
| Pinned ledger and verified source adapter | Establish relevant transfers and canonical source positions | Human uniqueness, user intent beyond the transaction |
| Arena/rules implementation | Execute committed game transitions | Concealing changes to rules/config/control |
| Settlement component | Discharge authorized recorded obligations | Inventing game scores or silently discarding uncertainty |
| Event Horizon | Prompt a bounded scan | Payment validity, command ordering or omission proof |
| Observer/mirror | Present independently verifiable results | Changing territory, account entitlement or command history |
| Jupiter funding integration | Replenish agreed operational targets | Gameplay, scoring or ownership of funds owed to players |
| Controllers/release operators | Deployment/upgrade permissions as disclosed | Being invisible in the trust model |

Document the controller and upgrade policy per canister and stage. Do not claim controllerless execution before it actually exists. Public certification identifies published state, not an independently audited algorithm or an honest interpretation by a malicious UI.

## Money posture

No real-value deployment in the first implementation stages. Keep keys, identities, governance proposals and funding actions out of checkpoint ZIPs. A future funded pilot needs explicit authorization, security/recovery review, documented caps and appropriate legal review of the product mechanics. This checkpoint makes no legal conclusion about nonrefundable payments or paid play with prizes.

Incoming payment validation and outgoing obligations have different lifetimes. Retain deterministic rejection reasons, but cap their stored detail and allow replay-based reconstruction. Do not create an unbounded per-invalid-payment storage allocation. Accepted prize obligations persist across death, rejoin, day boundaries and upgrades. Separately track gross revenue, nonrefundable excess/rejections, operational reserve, distribution pool, rounding residue, payable obligations and successful transfers.

Unknown transfer outcomes require durable reconciliation. A finite retry budget may stop active attempts, but must not erase a prize liability or justify a new payment identity without checking the old attempt. See [R3](IC_REFERENCES.md).

## Cycle-drain and data-volume controls

Bound input length before complex parsing; bound work and response size; coalesce wakeups; cache/precompute witnesses; rate-budget expensive maintenance; fence late callbacks; and maintain recovery headroom. Do not expose a public function that starts an independent ledger scan every time it is called. Authorization must be enforced on the execution path, not only at an optional ingress precheck. See [R6 and R10](IC_REFERENCES.md).

Do not promise that a public query or a one-bit update has zero abuse cost. Likewise, retaining an invalid ICP transfer does not guarantee that its tiny value covers the processing it causes. Separate an expensive action's eligibility from a cheap observation endpoint. Track queue saturation and progress without accepting an unbounded logging burden.

## Cycles telemetry belongs in the host, not the game kernel

Start with an optional `dtr-ic::observability` module and a small public schema. It can later become a standalone crate when reuse warrants it. Do not build a separate metrics canister/framework for the initial game.

Store and publish:

- Measured interval and timestamp, UTC day boundary, included canister set and measurement coverage.
- Raw cumulative/interval cycles and instruction quantities where available, plus source and quality.
- Any calculation method/tariff/reference version and reset/baseline provenance.

Use categories such as protocol counter, reconciled measurement and estimate, but define exactly what each means. Certification proves the application published the measurement; it does not promote an estimate to exactness. Never let measured burn, host scheduling or sampled cycle balance change deterministic scores, economic rules or replay roots. Telemetry can have a separate certified-tree branch.

### Important current API distinction

The current management specification permits configurable `canister_status` visibility, including public and allowed viewers. Access to the detailed `canister_metrics` consumption counters remains restricted. Public status is therefore not a public exact burn API. [R1](IC_REFERENCES.md)

Jupiter's funding model can use status observation without making the observer a controller. Choose visibility deliberately and document the complete exposed fields. Do not add a controller merely to obtain attractive telemetry. The blanket earlier recommendation to never expose cycle balance is replaced by an explicit observation-versus-exposure tradeoff and measured abuse controls.

### Accounting for burn

A balance reconciliation needs opening/closing balances and all relevant credits, debits, refunds and reserve movements. Missing external top-ups can invalidate an apparently precise total. Sampling only balance decreases can miss consumption while replenishment occurs. The first observation is a baseline, not measured historical burn.

For multiple canisters, identify the included set and avoid counting internal transfers as network consumption twice. Name totals “since measurement began” unless full coverage from deployment is actually established. Report operating UTC-day cost separately from a possibly delayed logical scoring day. Include stale and partial status rather than extrapolating silently.

### ETH-equivalent display

Treat this as optional comparative compute, not actual Ethereum transactions, throughput, gas paid or avoided cost. Publish the reference method, denominator, date/version and whether figures are estimates. No denominator is selected in S00. Display raw cycles first; omit the comparison until a defensible methodology has been established. Funding or treasury receipts are not an ETH-equivalent compute measure.

## Jupiter integration boundary

The initial adapter only needs target registration/configuration, a compatible observation path and a funding-status view. Bootstrapping operational cycles is separate from later replenishment. A lost funding service is an availability condition, not permission to confiscate territory or alter earned scores. Keep enough operating reserve for orderly suspension and eventual reconciliation. No automatic live Jupiter setup occurs in this checkpoint.

## Release controls

Production/debug build features and DID interfaces must be separately tested. Pin dependencies and build tools; classify advisories by actual reachability; log exceptions with expiry; record SBOMs and deployed code/configuration identities. Verify downloaded test/build artifacts. Treat agent skills and generated snippets as reference input to review, not as authority to install arbitrary packages or relax checks.
