# Rules17 closeout

The 22 November 2026 19:04 UTC read independently verified both live Rules16
module identities. Certified publication 15070 matched the earlier state hash,
with Reservoirs at 998000, 998001, 999000 and 999001. The source cursor was
40,640,535 and cumulative received payments totaled 104,000,000 e8s. The sampled
official Ledger length was 40,645,687 and the Index watermark was 40,645,686.
The source binding was healthy, with no scan, pending source records or
pending inputs. One completed simulation segment was waiting to publish.
The signed operational observation showed ReserveProtection and closed
payment admission. Both snapshot inventories were empty.

## Cycle gate

The backend balance was refreshed at 19:18 UTC. The frontend figures are
from 19:04 UTC.

| Measurement | Cycles |
| --- | ---: |
| Backend total | 1,127,750,019,935 |
| Backend liquid | 1,064,364,626,105 |
| Backend 30-day freezing floor | 63,385,393,830 |
| Arithmetic shortfall to Trickle entry | 185,635,373,895 |
| Cutover and recovery shortfall | 285,635,373,895 |
| Frontend balance | 1,161,105,363,316 |
| Frontend 30-day freezing floor | 202,793,003,670 |
| Frontend margin after the existing 494B allowances | 464,312,359,646 |

The prior backend installation debit was 21.09B cycles. The 1.350T liquid
target allows 25B for installation, 25B for compatible recovery, 10B for
temporary staging and 40B for operational contingency. The staging allowance
covers the roughly 5.5B freezing reserve estimated for the 4.21 MB module at
the observed storage rate. Apply those
allowances to the SDK liquid reading directly. The freezing floor is already
included in that reading. The practical rounded top-up at this observation
was 300B cycles to the European backend. Refresh the liquid reading before
starting the upgrade, since restored Trickle operation uses cycles.

The pacing test confirms a 1.000T Trickle exit threshold and a 1.250T entry
threshold. The operating mode is in memory and a normal Wasm upgrade starts
with the entry threshold. The exact execution-time reading that triggered
the recorded exit is unavailable. The producer is
still configured to run one tick per segment with its existing work budget.
Scheduled callbacks can restore admission after a sufficient top-up.

Production activity for this closeout was read-only.

## Frozen hosted release

All seven substantive jobs in the [hosted run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45051304132)
passed on `d27f754f52c075b7cb35af22b096f240be0437b0`. The installed job compared
its normal backend byte-for-byte with the hosted backend before running the
official disposable Rules16 cutover. The independent exact-artifact replay
matched 15 publications and 17 receipts.

- Frontend Wasm SHA-256 `2f5444bdf85aa9df57ecae32cce998454a5b254693c919881b5ffafd4f05789d`
- Normal backend Wasm SHA-256 `c066140f4ef3174b3f440694c19ec4116a03298fcc63b80636b0b5389bc210ca`

## Missing Index timestamp

The focused test ran the exact hosted normal Wasm. It removed timestamps from
two rows copied from the official disposable Index. The first run stopped at
the archive setup assertion. The test Ledger had its archive creation reserve
set to 10T cycles and the Trickle-sized fixture balance was 2.4T. Allocating
more cycles to the disposable Ledger enabled its official archive.

The rerun recovered block 9 from the official archive at timestamp
`1795132680000000000` and block 17 directly from the official Ledger at
`1795136400000000007`. An amount mismatch kept the source cursor at 9 with
zero pending records. The corrected response advanced it to 18. Independent
authenticated replay reproduced 15 publications and 17 receipts, including
the delayed archived payment at its original tariff. The added test and
runner selection leave both production artifacts byte-identical.
