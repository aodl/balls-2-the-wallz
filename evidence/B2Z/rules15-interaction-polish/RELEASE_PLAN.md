# Rules15 frontend-only release plan

The candidate replaces the immutable embedded frontend on
`s2jxj-liaaa-aaaas-amynq-cai`. The authoritative Rules15 game on
`s5ir5-gqaaa-aaaas-amyna-cai` continues running throughout. The 21 November
2026 read-only sample authenticated the deployed Rules15 backend
`8d7f1a670acb9f89646afbf715d05045079de0f6925367058476c88ac1da9d89`,
Schema7, Adapter9 and source cursor 40180669, with one-tick Trickle, open
admission and empty pending queues. The official account history, receiving
balance and 100,000,000 e8s paid total matched the activation evidence.

## Resource preflight

At 20:43 UTC the running frontend module was
`9f60fc9d77afc7667c07bd27ce423221b290ef01a3be389f13fcc7a7b8e70d1c`.
It had 1,919,313,172,543 cycles, zero reserved cycles, 1,010,685,514 bytes of
reported memory, a 2,592,000-second freezing threshold and an empty chunk
store. The backend reported 1,940,401,676,285 total and 1,883,522,450,255 liquid
cycles. The fixed release budget assumes no new funding.

| Existing frontend snapshot ID | Listed memory |
|---|---:|
| `0000000000000000000000000240661b0101` | 83.94 MiB |
| `0000000000000001000000000240661b0101` | 219.93 MiB |
| `0000000000000002000000000240661b0101` | 219.94 MiB |
| `0000000000000003000000000240661b0101` | 220.01 MiB |

The fifth snapshot is budgeted at approximately 220 MiB, with 185B cycles
reserved for the additional freezing floor. The snapshot budget includes
a 5B debit. The previous frontend install window consumed 184.030B cycles
net. The following estimate uses 190B for each of the install and one
compatible recovery reinstall.

| Budget component | Cycles |
|---|---:|
| Existing freezing floor, 30 days at observed idle debit | 800,551,044,450 |
| Fifth snapshot freezing-floor increase allowance | 185,000,000,000 |
| Snapshot creation allowance | 5,000,000,000 |
| Candidate install and one compatible recovery | 380,000,000,000 |
| Peak temporary chunk storage | 64,000,000,000 |
| Growth and measurement reserve | 30,000,000,000 |
| Contingency | 20,000,000,000 |
| Projected residual margin after all reserves | **434,762,128,093** |

These are separate observations and estimates. Re-read balances, observed
idle debit, snapshot and chunk storage, memory and subnet headroom before
any authorised change. Recompute the floor and recovery margin after
measuring the actual fifth snapshot. Insufficient headroom, changed
identities or an unavailable recovery snapshot stop the rollout.

## After owner publication and separate deployment authorisation

1. Require successful substantive hosted gates from the exact published
   branch revision. Check the hosted immutable Wasm and public inventory
   against the independent frozen builds. Retain the verified existing
   Rules15 Wasm and exact candidate raw Wasm.
2. Authenticate the live module, Rules15 identity/configuration,
   Schema7, Adapter9, source and current world on both sides of the
   frontend change. Check the current source cursor and no unresolved
   source or financial discrepancy. Keep the backend running.
3. Stop only the frontend long enough to take the fifth snapshot.
   Preserve all four earlier snapshots. Download and independently hash
   the new snapshot metadata, module, Wasm memory and stable memory.
   Match its module to the current Rules15 frontend, restart that
   predecessor and recertify access. Recompute headroom before upload.
4. In the approved isolated DFX 0.31.0 operator project, use
   `dfx canister install s2jxj-liaaa-aaaas-amynq-cai --network ic --mode upgrade --wasm <verified-raw-frontend.wasm> --argument '()'`.
   Use the established chunked path and only the approved exact artifact.
   Verify the installed module and an accounted-for chunk store.
5. Verify every IC-v2 response and expected body, all identity/gzip
   variants, HEAD and alternate routes, security headers, branding,
   audio, and real branded 404. Compare certified backend identity,
   source accounting and financial history across the window.
6. In a browser on the European origin, use read-only interactions to
   check 1440×900, 390×844 and 320×640. Exercise automatic Build/Fire, a
   destination move and offscreen dock, compass, aiming, rotated pinch,
   exact Copy and Keep/Update, payment readiness and reconnect. Existing
   Diverter cases absent from the paid world are covered by the labelled
   disposable browser fixture rather than by production payments.
7. A failed identity, certificate, paid-state or interaction check stops
   acceptance. Recover only the frontend with the independently verified
   Rules15 snapshot or its exact compatible predecessor Wasm, as the
   condition and approved procedure permit. Authenticate recovery and
   repeat asset and browser checks. Preserve snapshot archives and the
   live backend. The Rules14 and older snapshots remain historical.

[Qualified Rules15 production procedure](../rules15-spacing-orbit/RELEASE_PLAN.md) · [Baseline activation and snapshot verification](../rules15-spacing-orbit/production-activation/REPORT.md)
