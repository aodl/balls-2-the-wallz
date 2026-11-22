# European production preflight

The 22 November 2026 reads show both canisters running the deployed Rules16
pair. The frontend is `s2jxj-liaaa-aaaas-amynq-cai` with Wasm SHA-256
`8cb0d9e375d84c7ca969fbcbc1a9ba2404e9d55afc3d728283ecf723a10e034d`.
The backend is `s5ir5-gqaaa-aaaas-amyna-cai` with Wasm SHA-256
`a5889a92ce936b035d02632588b75ae7f66ddfda73398177dd79cba2b5b48dcd`.
Both module hashes were independently certificate-verified. Both snapshot
inventories and the frontend chunk store were empty.

At 17:30 UTC, authenticated publication 15064 retained source cursor 40640535
and 104,000,000 received e8s. Schema8 includes the existing four Reservoirs.
The official Ledger exclusive head and Index coverage both read 40643344.
The signed operational read showed one-tick Trickle at 0.01 ticks per second,
healthy source binding and zero pending source records. The Ledger head is an
observation. It is not a committed upgrade cutoff.

## Installation decision

| Resource | Read or allowance |
| --- | ---: |
| Frontend balance at 17:18 UTC | 1,161.600B cycles |
| Frontend 30-day freezing allowance | 202.793B cycles |
| Frontend upgrade, recovery, staging and contingency | 494.000B cycles |
| Frontend remainder after these allowances | 464.807B cycles |
| Backend total at 17:29 UTC | 1,178.391B cycles |
| Backend liquid at 17:29 UTC | 1,115.006B cycles |
| Backend post-upgrade Trickle entry | 1,250.000B liquid cycles |
| Backend shortfall at entry alone | 134.994B liquid cycles |

The backend can sustain its existing Trickle mode above the 1,000B exit
threshold. An upgrade clears the in-memory pace clock. Entering Trickle
again requires 1,250B liquid cycles before covering installation and
recovery. Leaving the game running on Rules16 preserves its current pace.
Using the prior measured backend installation of 21.09B cycles, a
conservative allowance of 25B for installation, 25B for compatible recovery
and 50B for contingency would require 1,350B liquid before starting. The
observed shortfall against that allowance was 234.994B liquid cycles.
Refresh both balances and actual upgrade costs before any later cutover.

Production deployment was held at this resource check. No controller,
payment, state, funding, snapshot or operating-settings operation followed.
