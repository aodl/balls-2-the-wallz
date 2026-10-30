# Frozen A2 installed and running — state preservation PASS, browser no-error check FAIL

The user explicitly authorised agent execution with existing codex_local controller access and individual-command plaintext-warning acknowledgement, then confirmed a renewed top-up after the earlier blocked preflight. No further approval was requested. The earlier insufficient-balance preflight remains BLOCKED_UNSAFE_BALANCE and its evidence is unchanged.

## Executed operations

Backend `s34gv-3qaaa-aaaar-qcifa-cai` was paused once, upgraded once in place with empty Candid arguments, then resumed once with original `segment_ticks=1`, `pacing_seconds=1`, `work_budget=512`. All three commands returned exit 0 and affirmative results. Exact mainnet installed A2 SHA-256 is **2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb**, with frozen DTR77 `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`. No rebuild or substitution occurred.

Fresh public-principal checks confirmed codex_local is existing controller `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`. Both controllers and the same 34-node fiduciary subnet verify unchanged before/after. Observer `s45ab-wiaaa-aaaar-qcifq-cai` module/controllers verify unchanged; no frontend operation ran. No transfer, withdrawal, purchase, funding request, controller change, reinstall, reset, epoch transition, rollback, branch merge or push occurred. No identity material was inspected/exported; warning acknowledgement was scoped only to individual authorised command subprocesses.

## State and financial preservation

Paused pre-upgrade liquid/total: **12,003,089,449,260 / 12,149,947,801,830 cycles**. Paused post-upgrade liquid/total: **11,963,502,354,232 / 12,110,372,854,402 cycles**. These bracket installation and intervening service/query observations; their net difference is not claimed as isolated install cost.

Committed paid-v8 publication, world v5 state, events/payments, scores, source descriptor and configuration were byte-identical across upgrade. All 16 retained catalogs and artifact/chunk hashes match. Ownership, accrued credits, balls/cannons and cumulative receipts therefore preserve exactly at the paused boundary. Current source/receiving account identities remain unchanged.

The persisted ready stage with manifest `ffcb13b582927ca8b365e4e07d00b63247e4581b8730a8759dd408f6fa99e3a1` survived unchanged. On resume it published as **65821**, with exact manifest equality. The retained chain through 65825 has continuous previous-manifest/state/logical links across the paused head **65820** and resumed successor. No private continuation byte equality is inferred from unavailable queries; the exposed ready commitment and actual successor establish its observed recovery.

Durable treasury fields, successful conversion/credit totals, plans, errors and source cursor preserved. Expected cold initialisation advanced treasury nonce **2015→2016** and reset its lease; later normal maintenance renewed the lease and nonce to **2017**. This is explained service progress, not lost/duplicated financial state. Final source is bound/healthy with cursor **39,711,127**, no pending records, no work phase/ready manifest/pending inputs. Treasury is Idle, unpaused, not halted, no error; successful credit total remains 12,110,272,820,000 cycles.

## Actual resumed operation and consumption

Gameplay is running **Steady, nominal/supported 0.3 ticks/s**, no performance limiting or run error. The ~12T observed liquid balance enters Steady under the unchanged 10T entry policy. Conserve was not forced. Steady naturally exits below 7.5T; tier selection remains automatic.

Final observed liquid/total: **11,861,095,724,077 / 12,009,542,657,467 cycles**. Certified publication advanced **65820→65920**, logical end **120073**. Across the controller consumption interval there were **95 completed segments in 318.774952 seconds** and net total/liquid debit **96,483,999,342 cycles**. Treasury credit delta was zero and the total-minus-liquid gap remained 148,446,933,390 during that interval. This is short active-game net consumption, not maintenance-only, a long-run bound or a new sustained qualification.

## Browser verification limitation — preserved FAIL

The sandboxed existing Chromium and unchanged production observer used genuine mainnet certificate verification. The 45-second observation authenticated heads **65890→65903**, counted **81** certificate verifications and played **9.709036 ticks**. Final phase PLAYING; no page errors, no performance limiting, zero resynchronisations and final consecutive delivery-failure count zero.

However, it recorded **“observation rollback”** delivery rejections. The strict no-error browser observation is therefore **FAIL**, not a clean PASS. Accepted heads remained monotonic and playback recovered; the SDK rejects regressing revision/ingest/head/logical/source observations. The exact offending wire response was not captured, so its gateway/replica origin or any A2-specific cause is not asserted. The frontend retains deliveryError after successful retry counters clear, explaining the final sticky error. No frontend change, favourable rerun, automatic pause or rollback followed.

Two earlier inspection-driver starts had no measurement samples: missing the existing browser-library path, then a Playwright wait helper incompatible with production CSP. Their original logs/results are retained. Reusing the already reviewed library bundle and the repository's evaluate/poll approach permitted observation with sandbox and CSP intact. No dependency installation or security bypass occurred. The measured 44-sample browser FAIL was not repeated.

Deployment outcome: **A2 installed, paid history preserved, gameplay running; post-release browser no-error verification remains FAILED/needs diagnosis.** The historical frozen A2 Normal technical qualification retains its accepted scope and verdict; this bounded production check is separate.
