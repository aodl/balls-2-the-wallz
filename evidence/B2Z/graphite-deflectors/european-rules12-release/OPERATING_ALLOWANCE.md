# One-tick Trickle operation

The controller changed stored segment allowance from two to one at the Rules11 resume and retained it at the Rules12 resume. Pacing stayed at one second and work budget at 512. Both stored and effective publication size were one logical tick. Signed operation samples remained in Trickle at 10 milliticks/s with admission open, no performance limitation, no run callback or source error and no pending source records.

Measured Rules12 window, after the first completed gameplay publication following resume:

| Measurement | Start | End |
|---|---:|---:|
| UTC on 18 November 2026 | 15:57:00.346 | 16:00:03.583 |
| Completed gameplay segments | 11624 | 11626 |
| Total cycles | 1,588,228,219,084 | 1,587,368,279,720 |
| Liquid cycles | 1,531,664,251,024 | 1,530,754,082,180 |

The total balance fell by **859,939,364 cycles over 183.237 seconds**, about **429,969,682 per completed tick** in this window. Scaling the observed net change by elapsed time gives approximately **0.405T cycles/day**, conditional on identical operation. The sample includes routine production activity and verification queries with one existing ball and no Deflectors. It excludes the installations and does not isolate query, callback or persistence costs, predict dense-load costs, or establish a guaranteed daily burn. The final controller sample separately reported **1,586,916,104,598 total** and **1,530,301,907,058 liquid** cycles. Its generation was 7 with open admission and completed segment counter 11627. [Time series and counters](backend-results/operate12/) · [Final controller state](backend-results/signed-queries/final-control-12/lab_status.json) · [Final resources](backend-results/signed-queries/final-control-12/controller_runtime.json)

Three Rules12 gameplay intervals from the epoch to the end of the measured window reproduced exact state, event and score bytes. A fourth did so at final handover. The wall-clock sample above counts the two intervals completed between its endpoints. Both epochs and the continuing publications were authenticated on the actual European backend. [Replay at measurement end](backend-results/replay-running-12.json) · [Final replay](backend-results/replay-final-12.json)
