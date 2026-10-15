# BTZ application contract — S14

This is the current application contract. Earlier source/laboratory specifications and S09–S13 measurements describe historical implementations. BTZ v3 rules, exact arithmetic, prices, memos, state/events/scores/seal encodings, publication v6 and animation v1 are unchanged.

## Payment authority and identity

BTZ relies on the configured official ICP index for the contents and completeness of its receiving account's transaction history. An application certificate binds what BTZ published; it does not independently prove the index reported every payment. Mainnet uses ICP ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` and index `qhbym-qaaaa-aaaaa-aaafq-cai`. Initialization/readiness verifies the index's `ledger_id` before admitting history.

There is one receiving account, derived with `ic-ledger-types::AccountIdentifier` from the backend principal and numeric subaccount (default 0). Numeric N is `24 zero bytes || N.to_be_bytes()`. The same account controls index queries, recipient validation, certified source identity, public display and operator subscription declaration. The source identity domain is `BTZ-ICP-INDEX-01`; source anchors use `BTZ-ICP-INDEX-ANCHOR-01` and bind normalized account records in original global-ID order. They are not ledger block hashes.

The funding AccountIdentifier owns its cannon under existing rules. It is not one human or a recoverable principal. There is no login, identity linking, wallet connection, allowance, session, hosted balance or frontend transaction submission. Shared-sender wallets can combine users' gameplay identity; some wallets cannot preserve required memos.

## Reconciliation and recovery

Use only `get_account_identifier_transactions` (pinned exact upstream DID in `interfaces/icp-index.upstream.did`). `start` is exclusive and pages run backwards, newest first. A pass freezes its first high ID, walks backwards to the previously admitted position or the index-reported oldest account transaction, and stages at most 256 records. New arrivals above that high ID wait for the next pass. Strictly descending exclusive pages, consistent oldest ID and nonempty expected history are required. No account-ID gaps are filled or renumbered.

Only after the complete unseen range is established are classified inputs admitted oldest first through DTR's bounded ordered admission. Their positions remain true global transaction IDs; progress is exclusive high ID + 1. Empty/irrelevant account records advance this adapter's stream without inventing game commands. A source-range advance does not assert inspection of unrelated global transactions.

Root schema 7 stores the bounded pending download separately from the coordinator's admitted progress and eventual publication retirement. Stable memories 0/1/2 retain their root/chunk/history assignments. Root limit is 256 KiB; coordinator and public artifact limits remain 1 MiB in this host. At most 256 records are staged per pass; exceeding that bound halts visibly with `INDEX_BACKLOG_CAPACITY`. It preserves admitted progress and the preceding durable pending range. A reviewed operator recovery/upgrade is required; infrastructure failures are never donations. `FromBeginning` is the sole explicit starting policy and includes pre-existing history. There is no silent newest-only bootstrap.

There is one fenced in-flight reconciliation. Each external call has a 30-second timeout; a 45-second lease can be replaced on recovery. A nonce and immutable index identity reject late responses. Download progress, complete pending ranges and admitted inputs survive upgrades. Atomic persistence admits inputs and source progress together; backpressure retains pending records. Upgrade invalidates the old lease, rechecks durable coordinator/artifacts, restores certification and rearms independent source/game timers. Old disposable scanner schemas are intentionally not migrated by S14; never reinstall a funded deployment to bypass incompatibility.

## Pokes and scheduling

`poke : (vec record { target : variant { subaccount : nat64; neuron_nonce : nat64 }; max_amount : nat }) -> ()` is the sole production notification endpoint. A CDK guard checks the configured Event Horizon caller before argument decoding and bounds encoded bytes to 32 KiB. No configured sender disables pokes. At most 256 matches are considered. Empty/global, neuron, other subaccounts and zero amounts do nothing: no persistent write, game read, timer or index call. Correct-target positive Nat amounts coalesce into one request; arbitrarily large Nat values are never narrowed. The local floor is one raw unit, avoiding suppression of valid relocation commands.

Pokes prove neither payment nor subscription funding. They can precede index visibility. One bounded retry burst (2 and 10 seconds) is permitted per minute; repeated pokes do not restart it. A poke during an await retains a follow-up request. Known pending pages continue promptly. An independent fixed 60-second fallback handles missed pokes and Event Horizon outages; discovery can take up to another fallback interval plus index lag/call time and game publication delay. These constants are initial policy, not an optimization claim. Legitimate small transfers can still cause work; receiving/decoding updates costs cycles.

## Game, payments and observation

Only incoming transfers to the exact account are command candidates. Outgoing/self transfers, mint/burn/approve operations are ignored for gameplay while reconciliation progresses. Funding account, amount and numeric/blob memo come from index records. Existing mixed-memo and delegated-transfer rejection behavior remains. Unknown/malformed wire data halts source work for review. Game-invalid or underfunded payments and excess amounts follow the existing retained-payment policy; no refunds are implemented. Index errors/backpressure never become rejected-payment receipts.

Memo is eight bytes: `BTZ`, opcode `0x11` ANGLE or `0x12` MOVE, then big-endian u32. ANGLE's high 16 payload bits must be zero. Legacy memo is the big-endian u64 interpretation; blob memo is exactly those bytes. A present blob requires numeric memo zero; malformed blobs never fall back. `npm run memo -- angle 0` / `npm run memo -- move 1` are offline encoders, never senders.

Existing config prices: join 1,000,000,000 e8s, ball base 10,000,000 e8s with existing occupancy pricing, relocation 10,000 e8s; transferred amount excludes sender fee. Consult the current authenticated world/rules identity and kernel for eligibility and dynamic ball price. Account history ordering, not poke amounts/order, determines commands. Seals bind actual admitted inputs to checkpoints; timer-dependent discovery can change eligible checkpoints. No exact wall-clock fairness or payment-to-seal deadline is promised.

The autonomous loop advances independently of payments, observers and notifications. Operator start/resume uses two logical ticks, 512 work and one-second callback pacing in the prepared configuration; authorized pause/resume remains. No production method admits synthetic payments or exposes manual Seal/Step/Publish/state replacement. Publication and input retirement remain atomic, with three publications / 8 MiB retention and explicit authenticated snapshot resynchronization.

The read-only observer uses the SDK mainnet root for network `ic`, explicit build-time backend/endpoint policy, intended canister, freshness, delegation, certified-data path, catalog/artifact hashes, chaining and anti-rollback. It never fetches a replacement root on mainnet. The receiving descriptor's hash must equal the certified source identity. Optional render data is not authenticated through a predecessor manifest that does not bind it. Disposable local mode requires its explicit pinned root and cannot substitute for failed mainnet authentication.

Area-time scores, including accrued scores after elimination, preserve the intended revenue-sharing direction. **Automatic payouts are unavailable.** A controlled operator exercise is distinct from opening paid/prize participation. No guaranteed distributions may be advertised.
