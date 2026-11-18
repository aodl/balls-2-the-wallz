# European graphite and Rules12 release

**European graphite frontend and Rules12 Deflectors are deployed and active; existing paid world and financial history have been preserved.**

All seven release stages passed after the owner confirmed that their B2Z tabs were closed. The backend is running on the original European canister at Trickle, with one logical tick stored and effective, open admission and generation 7. No rollback was needed. [Stage checklist](STAGE_CHECKLIST.md) · [Live application](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/)

## Certified production identities

| Item | Exact identity |
|---|---|
| Frontend canister | `s2jxj-liaaa-aaaas-amynq-cai` |
| Frontend asset module | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |
| Frontend JavaScript SHA-256 | `c5b688ae74527cb30e7b50f06141d429f237eef0297ed7eba0192d268e0d8c9b` |
| Complete 81-file inventory SHA-256 | `0b14bcccf7f1ed76bcfd4039b6aabcfb1965c7e6b94e437e3cc46d7e165d7c3e` |
| Backend canister | `s5ir5-gqaaa-aaaas-amyna-cai` |
| Rules12 normal backend Wasm SHA-256 | `2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13` |
| Active Rules12 | `1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c` |
| Configuration | `251381a4eabb835e5adf526beb58eec647fafba8439435662e5f743c020b028b` |
| Schema7, memo adapter7 | `b1d72af43945fba68412e388626bd4f19050d5586c174e13d12d4b34ff048cc2` |
| Source identity | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |
| Rules11 epoch | `90d32ed34b15a75f084a120c90f68bf2c999315439c10d35818b5a9643c267c9` |
| Rules12 epoch | `9b489857f8cdb46d22f3235a8bdddbe8e6eca57e52d0a1340e726e446a8b8688` |
| Final certified publication sampled at 16:01:40 UTC, 18 November 2026 | 11632, logical end 11627 |
| Certified publication hash | `a90ad56af42b08442041af46a277302583984001e754cb30003eebc867ff2219` |
| World state hash | `7ed3f33581c134e2b32977881e6810c42123589f416d04b291d7be08b2834d90` |
| Manifest hash | `11a3b45c07efb586207f1c748e8c44c3e84a3d4e3edbc049bf8a88c51f05f5e8` |

All 80 live public assets, signed inventory, four gzip representations, headers and IC-v2 proofs passed before and after the backend maintenance. Both canisters remained on their existing European subnet with the same controllers. [Final certified wire](backend-results/wire/cert-final-12/) · [Certified modules](backend-results/final-assets/metadata.json) · [Final frontend proofs](backend-results/final-assets/http-certificates.json) · [Qualified artifacts and CI](ARTIFACTS.md)

## Results

- **State and finance.** Both epochs independently verified. Rules11 preserved exact predecessor bytes, and Rules12 reverse-projected exactly to Rules11. The observed chain showed no new receipts, the received amount remained 100,000,000 e8s, and source cursor 40180669 and its anchor were unchanged. Ledger and Index matched at 40533893 on the final read. Source and work queues had no pending input. The pre-existing treasury balance-read timeout remained recorded, with idle funding and zero receiving balance. No payment or funding was issued. [Rules11](RULES11_TRANSITION.md) · [Rules12](RULES12_TRANSITION.md) · [Finance and source](FINANCIAL_AND_SOURCE_INVARIANTS.md)
- **Operating cost.** Four Rules12 gameplay intervals were independently replayed through handover. The 183.237-second operating window completed two certified one-tick publications. It used 0.860B net cycles, about 0.430B per completed tick. A simple extrapolation is 0.405T/day under the same conditions. This is a short quiet-world observation that includes verification traffic. Final balances were 1.587T total and 1.530T liquid. [Operating evidence](OPERATING_ALLOWANCE.md)
- **Live browser.** Deflector preview, all four orientations, exact 0.1 ICP amount and native recipient/memo copying passed on desktop and 320×640. Update/Keep, the Fire quantity dock at 347.15°, War Cry, Move/Build, payer reassociation, returning-player entry, reconnect, pause-gated Copy and tab-return audio passed. No production Deflector was purchased. Physical hardware playback, dense P09 performance and mixed open-browser module interruption remain unqualified. [Production browser evidence](PRODUCTION_ACCEPTANCE.md)
- **Recovery.** The separate 81-file compatible recovery set is retained. The previous 80-file frontend and the older modules are historical artifacts across the new schema and prepared-record compatibility boundaries. [Recovery status](RECOVERY_STATUS.md)
