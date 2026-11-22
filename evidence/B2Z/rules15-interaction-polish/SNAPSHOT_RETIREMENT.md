# European production snapshot retirement

On 22 November 2026, from 11:37:15 to 11:37:35 UTC, the five snapshots
below were deleted sequentially from frontend `s2jxj-liaaa-aaaas-amynq-cai`.
Each deletion succeeded, and its following inventory matched the expected
remaining set. Backend `s5ir5-gqaaa-aaaas-amyna-cai` already had zero
snapshots. Both canisters had zero afterward, confirmed by the lists and
the management status snapshot-storage readings.

- `0000000000000000000000000240661b0101`
- `0000000000000001000000000240661b0101`
- `0000000000000002000000000240661b0101`
- `0000000000000003000000000240661b0101`
- `0000000000000004000000000240661b0101`

## Resource measurements

| Measurement | Frontend before | Frontend after | Backend before | Backend after |
| --- | ---: | ---: | ---: | ---: |
| Balance, cycles | 1,715,556,183,775 | 1,715,513,423,459 | 1,692,506,761,303 | 1,692,502,440,365 |
| Snapshot storage, bytes | 1,010,671,824 | 0 | 0 | 0 |
| Total reported memory, bytes | 1,241,406,417 | 230,734,593 | 40,393,477 | 40,393,477 |
| Idle cycles per day | 32,579,501,873 | 6,758,816,811 | 1,895,974,201 | 1,895,974,201 |
| Estimated freezing requirement, cycles | 977,385,056,190 | 202,764,504,330 | 56,879,226,030 | 56,879,226,030 |

The freezing threshold stayed at 2,592,000 seconds (30 days) and reserved
cycles stayed at zero for both canisters. The freezing-cycle estimate uses
the reported daily idle debit over that threshold. Frontend savings are
25,820,685,062 idle cycles per day and 774,620,551,860 cycles in estimated
freezing requirement. Historical storage charges are already spent.
[IC cycle costs](https://docs.internetcomputer.org/references/cycle-costs/).

The frontend balance fell by 42,760,316 cycles between the status reads
bracketing the five deletions and their verification calls. The repeated
balance differences attribute 10,090,000 cycles to deletion ingress
(2,018,000 each), 27,296,000 to intervening inventory and status reads, and
5,374,316 to other debits in that window. These individual amounts are
derived from observed balance differences. The status API exposes a total
balance without a per-call debit receipt.
[Snapshot deletion implementation](https://github.com/dfinity/ic/blob/master/rs/execution_environment/src/canister_manager.rs).

## Preservation and recovery

- Both canisters stayed running. Certified installed Wasm hashes matched
  before and after. The frontend remained
  `a7436dd9a8c7e7c761118a9776d27ecada3d3d5f55fb0090777f062037c31b4e`
  and the backend remained
  `8d7f1a670acb9f89646afbf715d05045079de0f6925367058476c88ac1da9d89`.
- Authenticated Rules15 configuration, Schema7, Adapter9, source anchor and
  Ledger cursor `40180669` matched. The independent replay of publication
  `14852` from `14851` reproduced exact state, events and scores with zero
  new inputs. The receiving account balance, official account history,
  queried receipt lookups and paid total of 100,000,000 e8s matched. The
  backend continued one-tick Trickle at 10 milliticks per second.
- Live HTTP-v2 verification passed for 86 public assets, six gzip variants,
  GET and HEAD, and 28 alternate route checks including branded HTTP 404.
- The current and preceding Rules15-compatible frontend Wasm archives were
  independently rehashed. Off-canister archives and historical deployment
  evidence were retained. The
  [current operator recovery policy](../../../docs/operations/S14_OPERATOR.md#current-pre-launch-recovery-policy)
  governs subsequent releases.
