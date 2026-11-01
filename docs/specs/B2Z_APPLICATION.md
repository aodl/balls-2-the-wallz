# B2Z application contract — prefix-free text input extension

Version scope: the contract below records the original S14 application and its
historical interpretations. The last verified production release is release 1,
world v5 with paid-v8 publications. The separate next-version candidate is
[BTZ v6 playability](B2Z_PLAYABILITY_V6.md); it requires its own authenticated
activation and has not been deployed. It does not reinterpret old payments,
receipts, physics or publications. Consult executed release evidence for live
module identities rather than treating the historical v3 descriptions as the
current mainnet world.

Earlier source/laboratory specifications and S09–S13 measurements describe historical implementations. B2Z v3 mechanics, exact arithmetic, internal command encoding, state/events/scores/seal encodings, publication v6 and animation v1 remain historical contracts. The original prelaunch profile is 1 ICP to join. Adapter v3 extends only the accepted command syntax and application naming. [Text command contract](B2Z_TEXT_MEMOS.md) defines adapter v3 and historical replay.

## Payment authority and identity

B2Z relies on the configured official ICP index for the contents and completeness of its receiving account's transaction history. An application certificate binds what B2Z published; it does not independently prove the index reported every payment. Mainnet uses ICP ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` and index `qhbym-qaaaa-aaaaa-aaafq-cai`. Initialization/readiness verifies the index's `ledger_id` before admitting history.

There is one receiving account, derived with `ic-ledger-types::AccountIdentifier` from the backend principal and numeric subaccount (default 0). Numeric N is `24 zero bytes || N.to_be_bytes()`. The same account controls index queries, recipient validation, certified source identity, public display and operator subscription declaration. The source identity domain is `BTZ-ICP-INDEX-01`; source anchors use `BTZ-ICP-INDEX-ANCHOR-01` and bind normalized account records in original global-ID order. They are not ledger block hashes.

The funding AccountIdentifier owns its cannon under existing rules. It is not one human or a recoverable principal. There is no login, identity linking, wallet connection, allowance, session, hosted balance or frontend transaction submission. Shared-sender wallets can combine users' gameplay identity; some wallets cannot preserve required memos.

## Reconciliation and recovery

Use only `get_account_identifier_transactions` (pinned exact upstream DID in `interfaces/icp-index.upstream.did`). `start` is exclusive and pages run backwards, newest first. A pass freezes its first high ID and walks backwards to the previously admitted position or the index-reported oldest account transaction. It retains only the oldest 256 rows seen so far: newer rows displaced from that window remain unadmitted and are downloaded again after the oldest window is committed. New arrivals above that high ID wait for the next pass. Strictly descending exclusive pages, consistent oldest ID and nonempty expected history are required. No account-ID gaps are filled or renumbered.

Only after reaching the old watermark/oldest history are classified inputs from that oldest window admitted oldest first through DTR's bounded ordered admission. Their positions remain true global transaction IDs; each committed window advances to its highest retained ID + 1. If rows remain below the frozen high, the next bounded backwards traversal restarts exclusively at frozen high + 1. Arrivals above it wait for the next pass. This deliberately re-reads newer rows to keep storage bounded; read amplification can grow quadratically with backlog/window count. It removes the 257-record hard stop, not the need to budget reconciliation capacity. Empty/irrelevant account records advance this adapter's stream without inventing game commands. A source-range advance does not assert inspection of unrelated global transactions.

Root schema 7 stores the bounded pending download separately from the coordinator's admitted progress and eventual publication retirement. Stable memories 0/1/2 retain their root/chunk/history assignments. Root limit is 256 KiB; coordinator and public artifact limits remain 1 MiB in this host. At most 256 records are staged in an oldest window; 257 or larger finite histories drain through repeated windows without cursor skipping. A full coordinator inbox or image/storage limit still preserves the complete pending window and admitted progress for retry after retirement; infrastructure failures are never donations. Window restart state and frozen high are durable across upgrades. `FromBeginning` is the sole explicit starting policy and includes pre-existing history. There is no silent newest-only bootstrap.

There is one fenced in-flight reconciliation. Each external call has a 30-second timeout; a 45-second lease can be replaced on recovery. The ordinary request/fallback path can schedule an expired in-flight operation, including when a B2Z post-await callback trap preserved its pre-await durable lease. Unexpired operations remain serialized. Replacement increments the nonce; a nonce and immutable index identity reject late responses. Download progress, complete pending ranges and admitted inputs survive upgrades. Atomic persistence admits inputs and source progress together; backpressure retains pending records. Upgrade invalidates the old lease, rechecks durable coordinator/artifacts, restores certification and rearms independent source/game timers. Old disposable scanner schemas are intentionally not migrated by S14; never reinstall a funded deployment to bypass incompatibility.

## Pokes and scheduling

`poke : (vec record { target : variant { subaccount : nat64; neuron_nonce : nat64 }; max_amount : nat }) -> ()` is the sole production notification endpoint. A CDK guard checks the configured Event Horizon caller before argument decoding and bounds encoded bytes to 32 KiB. No configured sender disables pokes. At most 256 matches are considered. Empty/global, neuron, other subaccounts and zero amounts do nothing: no persistent write, game read, timer or index call. Correct-target positive Nat amounts coalesce into one request; arbitrarily large Nat values are never narrowed. The local floor is one raw unit, avoiding suppression of valid relocation commands.

Pokes prove neither payment nor subscription funding. They can precede index visibility. One bounded retry burst (2 and 10 seconds) is permitted per minute; repeated pokes do not restart it. A poke during an await retains a follow-up request. Known pending pages continue promptly. An independent fixed 60-second fallback handles missed pokes and Event Horizon outages; discovery can take up to another fallback interval plus index lag/call time and game publication delay. These constants are initial policy, not an optimization claim. Legitimate small transfers can still cause work; receiving/decoding updates costs cycles.

## Game, payments and observation

Only incoming transfers to the exact account are command candidates. Outgoing/self transfers, mint/burn/approve operations are ignored for gameplay while reconciliation progresses. Funding account, amount and numeric/blob memo come from index records. Delegated-transfer rejection remains. Adapter v2 uses the present ICRC blob regardless of the numeric memo value. Unknown/malformed wire data halts source work for review. Game-invalid or underfunded payments and excess amounts follow the existing retained-payment policy; no refunds are implemented. Index errors/backpressure never become rejected-payment receipts.

The primary ICRC-1 memo is bounded ASCII text: `ANGLE 37.5`, `ANGLE 225` or `MOVE 83`, with the exact [text grammar and normalization](B2Z_TEXT_MEMOS.md). It becomes the existing eight-byte command: `B2Z`, opcode `0x11` ANGLE or `0x12` MOVE, then big-endian u32. ANGLE's high 16 payload bits must be zero. Old binary blobs remain supported; legacy numeric decoding applies only when the blob is absent. Malformed/empty blobs never fall back. `npm run memo -- angle 37.5` / `npm run memo -- move 83` are offline text encoders, never senders.

The editable `config/economics/prelaunch.json` generates the new profile: join 100,000,000 e8s (1 ICP), ball base 10,000,000 e8s with unchanged occupancy-squared pricing, relocation 10,000 e8s; transferred amount excludes sender fee. Consult the current authenticated world/rules identity and kernel for eligibility and dynamic ball price. Account history ordering, not poke amounts/order, determines commands. Seals bind actual admitted inputs to checkpoints; timer-dependent discovery can change eligible checkpoints. No exact wall-clock fairness or payment-to-seal deadline is promised.

The observer's public play reference displays funding AccountIdentifiers, ball prices (`ball_base_e8s × active count²`), owned MOVE cells and recent command receipts from already authenticated snapshots/configuration/audit artifacts. These are read-only references; application-time eligibility can change. It retains at most 100 observed receipts and can omit older outcomes after reconnect/retention gaps. Operational pause/source/error status is a separately identified signed query. No public permanent receipt archive or new payment authority is introduced.

The autonomous loop advances independently of observers and notifications while cannons, balls, unresolved strikes, a staged segment or queued canonical inputs exist. With none of those, enabled gameplay intentionally idles: it retains the last certified publication and removes the simulation timer instead of producing empty segments. The separate 60-second Index timer remains armed. Admission of every canonical payment, including malformed or underfunded commands, rearms enabled gameplay; rejection outcomes publish before returning to idle. Operator pause remains a distinct state and admission does not override it. The signed operational query adds `run.idle`; this is recomputed from restored authoritative state on upgrade, without changing durable root schema 7, historical inputs or publication identities. The observer labels healthy verified emptiness as idle, permits authenticated transfer preparation and consumes only any verified terminal animation remainder before waiting. Operator start/resume retains two logical ticks and 512 work units per Step. The stored legacy one-second pacing field remains readable; the bounded shared driver now paces completed batches instead of inserting a rest between internal phases. Liquid-cycle modes, reserve protection, capacity feedback and client delivery buffering are specified in [B2Z_ARENA_AND_PACE.md](B2Z_ARENA_AND_PACE.md); authorized pause/resume remains. No production method admits synthetic payments or exposes manual Seal/Step/Publish/state replacement. Publication and input retirement remain atomic, with up to sixteen publications / 8 MiB retention and explicit authenticated snapshot resynchronization.

The read-only observer uses the SDK mainnet root for network `ic`, explicit build-time backend/endpoint policy, intended canister, freshness, delegation, certified-data path, catalog/artifact hashes, chaining and anti-rollback. It never fetches a replacement root on mainnet. The receiving descriptor's hash must equal the certified source identity. Optional render data is not authenticated through a predecessor manifest that does not bind it. Disposable local mode requires its explicit pinned root and cannot substitute for failed mainnet authentication.

Area-time scores, including accrued scores after elimination, preserve the intended revenue-sharing direction. **Automatic payouts are unavailable.** A controlled operator exercise is distinct from opening paid/prize participation. No guaranteed distributions may be advertised.

## Versioned prices and the arcade observer

The original S14 configuration hash `3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622` continues to mean a 10 ICP join. Its immutable configuration and golden histories remain unchanged. Fresh initialization uses the generated prelaunch configuration. Existing journal identity is not rewritten during an upgrade: compatibility with old cursors/seals preserves old payment interpretation, not a mid-game price transition. The application exposes no repricing endpoint. A fresh-game reset requires separate approval and an immediate recheck of all receiving-account history, pending inputs, scores and current controllers.

The arena-first observer prepares exact memos with the shared codec and displays ICP through integer arithmetic. It accepts only configuration bytes matching the authenticated publication's supported profile hash, including the historical profile. Before verification or while service health is unavailable, transfer preparation is disabled. Runtime pause/error status is a separate signed query, not a certificate of game outcomes. Copied values never submit transactions. Primary player/territory displays remain derived from verified snapshots; decorative presentation does not advance the game. Full deployment, certificate/configuration identities, retained-chain diagnostics and replay controls are in the Settings dialog. The visible retained-payment/no-refund/no-prize disclosure applies to every profile.


Stable maintenance writes the same chunk keys and bytes. Blob shrink removes only formerly allocated trailing keys, and retention eviction removes the publication/artifact keys described by the evicted metadata. Capacity bounds (64 chunks per artifact, up to sixteen publications / 8 MiB total) and integrity verification remain unchanged. Idle is a scheduling optimization; it does not accrue logical time or scores while no players exist, and changes no physics, pricing or source admission rules.

The independently staged [32×32 torus v4](B2Z_TORUS_V4.md) has distinct rules/schema/configuration identities and persistent accepted cannon headings. It is not the current paid world and cannot be activated by rewriting the existing journal identity. The combined candidate implements only the fixed authenticated v3→v4 transition
specified there, using published DTR `c12af747190f7e24d5e68cdf57dbb1494095a46b`
and client 0.13.0. Only explicit epoch commit introduces publication v7 and
v4 rules; original v3 state/history, v6 publications and prices remain intact
until that operation. No mainnet transition has been executed. The prelaunch
treasury below remains independent of the cutover and cannot admit gameplay.

## Locally prepared prelaunch self-funding

The additive B2Z-owned worker is staged, **not deployed**. Its separate stable
memory 3 and controller-only funding methods do not change this game/source
contract. It sweeps the actual default-account Ledger balance through the
fixed CMC self-top-up route, independently of gameplay and the browser.
[Policy, recovery and future activation](../operations/PRELAUNCH_SELF_FUNDING.md).
No player payout or refund feature is added. This task authorizes local
valueless tests only; value-moving deployment needs separate authorization.
