# BTZ v6 mainnet release — deployed, verified and resumed

The pending rules release is live on [the public app](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/).
The existing backend was upgraded in place, the exact authenticated v5→v6
transition committed once, the compatible client published before commitment,
and gameplay resumed with its captured settings. No reinstall, history reset,
controller change, financial transfer or production test payment occurred.

## Exact identities

| Item | Identity |
|---|---|
| Maintained default-branch source, ordinary PR #5 merge | `f72503feccd7373d937346d7ac903c82b2bec72b` |
| Qualified release head; merged tree is identical | `9afac756247217294b0585f71c26b5a3e5f0c0be` |
| Installed predecessor Wasm | `c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526` |
| Deployed frozen normal Wasm | `b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e` |
| Frozen gzip | `d5bd1391d13a0bab7b86d3d0e5ce792e775f807a35416cb7ef4d972b5383cdb3` |
| Public frontend app | `ba2c84787743bddd331466a885fe223a7b0a201efecc71bb3132d243b1bcdd67` |
| Public stylesheet | `182655097ed67aec63b12db775d5bd0c3b14b1acb3cb90b3d1c8d2ab351a7e2c` |
| DTR revision | `282d709143dacb4bca769a4d6e72b97fc93ef518` |
| Activated epoch, transition index 3 | `e7905ce5167be6f4a416ca59a73430fbece44b273e3324aa289e8e3699997d07` |
| Rules | `c1374abe923db8556c0a611caaa5c39711f0cda2ca4710f05e02fc71967a4c46` |
| Configuration | `e7a8db840b355bec688d553aef1a9891bc5c1a030bc24f89d8d546f1dd916e68` |
| Schema | `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790` |

The world is **rules v6, 1,000×1,000**, using authenticated publication v8.
Backend `s34gv-3qaaa-aaaar-qcifa-cai` and observer
`s45ab-wiaaa-aaaar-qcifq-cai` remain on the same **34-node fiduciary subnet**
`pzp6e-ekpqk-3c5x7-2h6so-njoeq-mt45d-h3h6c-q3mxf-vpeq5-fk5o7-yae`.
Both original controller sets are certificate-verified unchanged. The observer
Wasm remains `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`;
only its frontend assets changed. [Certified installed metadata](certified-module-placement.json).

## Preservation and live verification

The operator's top-up was confirmed at 13:27 UTC: **6.277275681974T liquid**,
above the saved **3.357988370090T** guard. The runtime selected Conserve naturally.
Only autonomous gameplay was paused; source and treasury maintenance continued.
Across the backend upgrade, the publication/state/events/scores/configuration/
source-descriptor bytes and all **80 files for 16 retained publications** were
identical. Treasury obligations, totals and recovery records were preserved.
[Upgrade comparison](upgrade-preservation.json).

V6 activated from manifest
`a3554426e8491902ed999a4f12abeca2eda5f2b5ad8cd5e265c7b063c6271e86`
at logical tick **132261**, head **78108→78109**. The independent JS migration
over the certified predecessor exactly equals the certified Rust output. Cannon
**#3**, its cell/heading, all **three balls** and their exact trajectories,
ownership, both rational credit records, and **620,000,000 e8s received** survived.
Receiving account `344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a`,
default subaccount, official Ledger/Index, source cursor **39,711,127**, source
anchor and all 14 observed account-history transaction IDs remain unchanged.
The next publication normally ages one oldest catalog out of bounded retention;
the other 15 old catalogs/artifacts match exactly.
[Independent migration](rules-activation-preservation.json),
[source/finance/history comparison](post-transition-preservation.json).

The public browser connected on paused v5 before commitment and accepted
**29 consecutive heads, 78108–78136**, with one authenticated epoch checkpoint,
**zero reloads, zero resyncs and no camera reset**. Seven genuine stale certified
replies were discarded across four recovered warning episodes. No accepted head
went backwards; no warning remained active at closeout. The 471-packet,
15,782,067-byte wire capture closed successfully through head 78136 with no
capture errors. The 128.328-second resumed sample admitted 26 ticks, consistent
with the funding-reduced 0.20 tick/s pace; normal initial buffering was retained.
This was release verification, not another maximum-capacity performance trial.

Screenshots: [paused v5 baseline](before-transition-desktop.png),
[running v6 desktop](after-transition-desktop.png),
[running v6 mobile](after-transition-mobile.png),
[selected-cannon Fire controls](desktop-fire.png),
[mobile Fire controls](mobile-fire.png), [mobile selected cannon](mobile-board.png).
The mobile toolbar scrolls to its remaining controls. No browser update call,
payment, signing operation or clipboard submission was used for these images.

At **13:44:59 UTC**, a fresh final read still showed v6 running Conserve,
**6.080656810211T liquid**, one cannon/three balls, no source/runtime/treasury
error, no pending payment input, and the same source cursor. The authenticated
final snapshot reached head **78242**, logical tick **132394**.

## Active rules and limits

The operator's accepted **friendly-island model** is active: canonical funding
accounts own players/balls/territory; connected friendly cannons share their
island's live-ball pool and pricing. Balls have no continuing launch-cannon
attachment. Limits are **128 total cannons, 64 total balls, 64 balls per purchase
island, 16 retained cannons per player, 1,024 funding-player records**, and a
maximum requested batch of 64. The proposed 512-ball target did not qualify;
the existing measured capacity evidence is reused without a new throughput claim.

Sequential ball prices are integer `10,000,000 × max(1,n)²` e8s. At one existing
ball, two extra balls cost **0.5 ICP**, three cost **1.4 ICP**. A first **1.5 ICP**
payment can produce a cannon with three balls total, subject to capacity and
placement. New cannon base prices are **1/4/9 ICP** as retained count grows;
dormant cannons count. First placement retains the v5 deterministic neutral-patch
policy; additional placement is legal adjacent placement. Untargeted legacy
commands choose the lowest own cannon ID; historical interpreters are unchanged.
Surplus/illegal-move payments remain retained, with wallet fees extra and no
automatic refund or withdrawable balance.

Authenticated elapsed time supplies the **24-hour recovery window** and fenced,
idempotent expiry. Paid fire revives a dormant island at the positive zero-ball
price. Dormant anchors do not earn score or support expansion. Occupied cannon
cells remain reflective. Defended captures pair one attacker/defender and cancel
the transfer; illegal moves leave gameplay state unchanged except their normal
receipt/accounting outcome. These outcomes were exercised in the qualified
Rust/JS/disposable-IC cases, without new real-money demonstrations.

The release-1 conservation policy remains active, with unchanged rates and
hysteresis. Enter/exit-below thresholds in T are Normal **40/30**, Cruise
**30/24**, Economy **20/16**, Steady **15/12**, Conserve **5/4**, Survival **3.5/3**,
Lifeline **3/2.5**, and unchanged Reserve Protection. Logical physics/score speed
is unchanged; actual post-release mode is **Conserve, 0.20 ticks/s**, without
performance limiting.

## Qualification, public APIs and remaining limits

[Final CI 41304728674](https://github.com/aodl/balls-2-the-wallz/actions/runs/41304728674)
passed all six substantive jobs, including 52 installed checks. All six uploaded
artifact ZIPs were checked against GitHub's SHA-256 digests. CI's runner-built
normal hash is `216ba07e1a116bab2d580196823e2c310b460d5148bea5e38b2211884ba62e96`;
the explicitly qualified frozen **b618…** module was installed, not substituted
with that separate build. The merged source tree equals qualified head 9afac75.

Ordinary CI still ignores the full v6 case. Its separate explicit
**`B2Z_PLAYABILITY_BROWSER=1` complete frozen-artifact rehearsal passed**, including
paid-v5 preservation, unfinished work/pending treasury recovery, same-page paid
actions and actual receipts, 45.087-second representative playback, elapsed expiry,
146-publication independent exact replay and retention-gap reconnect.
[Complete executed gate](../v6-gate-qualified/REPORT.md). The original head-34→64
receipt-loss FAIL and first quiet execution's terminal reporting FAIL remain
preserved. Existing cost/capacity/history evidence was reused; no qualification
loop or longer trial was added to mainnet.

Public typed game/account/cannon/region/quote/receipt queries, Candid and bounded
API documentation are deployed. Typed replies remain **uncertified convenience
data** with authenticated state references. A real anonymous `action_quote` for
cannon #3/two balls was independently matched to authenticated head **78219**:
**250,000,000 e8s**, exact heading-zero memo `f600000003000002`, no reservation,
and the correct receiving account. The browser independently displayed **2.5 ICP**
with text `FIRE 3 37.5 2` for its chosen angle. [Public quote verification](public-quote.json).
Two earlier sequential CLI inspections correctly refused moving-head references;
their stderr remains preserved. No missing receipt was inferred from entities.

Event Horizon remains **disabled**, with the existing **60-second official ICP
Index fallback**. A verified compatible deployed ABI, relevant subscription and
usable cadence-health evidence remain unavailable; no EH deployment/purchase or
assisted-cadence claim is made. MCP discovery/terms opt-in remains inactive;
ordinary APIs are available. This release supplies no MCP payment execution or
wallet/signing bypass.

Across a **146.614-second** post-resume controller observation, liquid balance
declined from **6.210959320280T to 6.180489449936T**: **30,469,870,344 cycles**,
approximately **0.748T/h observed net decline**. This includes gameplay,
maintenance and verification queries, and is not a gross billed computation meter
or a runway forecast. No treasury credit occurred in that window. The public
meter honestly showed **Measuring** while its rolling estimate restarted across
a balance/reservation discontinuity. [Machine-readable release results](summary.json).

`RAW_SHA256SUMS` identifies the retained controller replies, genuine certificates,
authenticated artifacts, action audit records, screenshots, wire bodies, CLI
refusals and successful quote check under `.work/v6-mainnet/`. No identity,
environment secret, browser profile or build cache is included.
