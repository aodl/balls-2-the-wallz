# BTZ read-only player API — developing v6 release

These methods are additive candidate interfaces. They are not available on the
last verified release-1 mainnet module until the qualified second release is
installed. The backend stays `s34gv-3qaaa-aaaar-qcifa-cai`; the observer stays
`s45ab-wiaaa-aaaar-qcifq-cai`. This guide authorises no transaction.

The generated `canisters/runtime-lab/runtime-lab.did` is the actual service
interface. `get_api_doc()` supplies bounded public documentation. All player
methods below are queries. Controller lifecycle/funding/upgrade methods are not
player actions and must never be exposed as wallet or agent operations.

| Query | Bound and meaning |
|---|---|
| `game_info()` | Authenticated-configuration bytes/hash reference, actual limits, official Ledger/Index and receiving account. |
| `player_state(account)` | Canonical lowercase 64-hex ICP AccountIdentifier with valid checksum; bounded retained cannons, current balls and exact accrued rational area-time. |
| `cannon_state(id)` | Exact cannon, current connected friendly island pool and per-cannon dormant deadline. Balls have no continuing launch-cannon attachment. |
| `nearby_region(cell,width,height)` | At most 16×16 cells, bounded entities and exact trajectory intercepts/velocities at the referenced logical time; toroidal seams wrap. |
| `action_quote(account,action)` | Integer e8s, per-item prices, requested ceiling/maximum current fill, exact memo, capacities and destination. Refuses paused/unhealthy/closed admission and inactive v6. |
| `payment_receipt(position,segment?)` | One retained publication (latest by default), or a known admitted pending input. `searched_segment`/`search_retained` expose the search boundary. Old missing data is unknown/not retained, never proof of rejection or non-payment. |
| `runtime_health()` / `lab_status()` | Operational observations, not certified gameplay or a billed gross cycle meter. |

Every typed player reply is a convenience query with `certified_reply=false`.
Its `StateRef` names the publication, manifest, state, rules/configuration/schema,
source watermark and epoch. Authenticate `observation_bundle()` with the real IC
root, canister binding, delegation and freshness checks; verify the artifact
hashes; then recompute or compare the typed data against that exact snapshot.
A reference alone is not a Merkle proof. A moving/different head requires fresh
inspection, not acceptance of a regressing head. Retained receipts require the
bounded predecessor chain from a fresh certified observation and the event
artifact hash. Do not fall back to offline trust on an authentication failure.

`Fire` contains `{cannon:nat32; angle:nat16; quantity:nat8}`; `New` contains
`{angle:nat16; quantity:nat8; cell:opt nat32}`; `Move` contains
`{cannon:nat32; cell:nat32}`. Quantity is 1–64 and is a maximum. The uint16 angle
is the exact existing game heading, not degrees. Memo bytes are the exact
eight-byte binary form; `numeric_memo` interprets them big-endian. `text_memo`
is optional: a decimal angle with two fractional digits cannot represent every
uint16 heading, so the API never substitutes a rounded text instruction.
When supplied, text exactly round-trips to the binary command:

```
FIRE <cannon-id> <degrees> <quantity>
NEW <degrees> <quantity> [adjacent-cell]
MOVE <cannon-id> <cell>
```

Text is bounded to 32 ASCII bytes. First placement is automatic; later placement
is adjacent to an active own cannon. If automatic sites have different merged
island pools, choose an explicit site to quote more than the included first ball.
Legacy ANGLE/MOVE remain replayable; under v6 their untargeted cannon is the
lowest existing own ID. Old-version payments retain their original meaning.

The declared account is a lookup preference, not login or wallet authority. Only
the Ledger's actual paying account authorises a command. Principal/subaccount
account derivation is one-way; do not infer a principal from account history.
The wallet's current Ledger fee is separate from the quoted amount. Quotes do
not reserve price, capacity or legality. Application buys the affordable allowed
prefix; receipts disclose actual/requested quantity, item prices, used amount,
retained remainder and stop reason. Unused payments are retained; refunds,
withdrawable balances and automatic payouts are absent.

Receipt outcomes are pending, applied, partially applied, rejected, duplicate
where explicitly recorded, or unknown/not retained. Source-level duplicate
Ledger IDs have one original result and the stable key `source_id:position`;
querying again returns that result, not a new action. A new wallet transfer has
a new Ledger ID and is not a harmless retry. Never resend an ambiguous payment.
Operational pending/unknown replies are not certified receipts.

The anonymous read-only example verifies the real certificate/source/config and
artifacts, suggests inspecting the lowest own cannon, independently checks an
exact payment quote, and optionally verifies a retained receipt:

```sh
node tools/inspect_b2z_player.mjs --account YOUR_64_HEX_ACCOUNT --quantity 2
node tools/inspect_b2z_player.mjs --account YOUR_64_HEX_ACCOUNT --receipt LEDGER_ID
```

It reads no identity or keys, submits no gameplay decision and invokes no Ledger
or controller update. It refuses a quote on a different observed head. Its
`--local-config` is only for an explicitly pinned loopback PocketIC fixture,
with `network`, `host`, `canister_id`, `ledger`, `index` and `root_key_hex`; it
cannot substitute a root on mainnet. Run `--help` without making any query.

MCP service discovery remains inactive. No `/.well-known/ic-architecture` opt-in
is published without the operator's specific acceptance of the external App
Operator Terms. A future manifest may list only this app's canisters, never the
official Ledger as BTZ-owned. This release supplies no MCP payment execution;
do not disguise, proxy or rename financial calls to bypass connector limits.
Autonomous paid play needs a separately permitted user-controlled wallet/signer
with genuine authorisation and spending limits. It is outside this release.
