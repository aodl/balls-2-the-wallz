# Release identities and scope

| Item | Exact identity |
|---|---|
| Reviewed source head | `8cc07ad56abb98da31e16cb9471c667b540222b6` |
| Frozen Rules12 build inputs | `9afcd80cf6c92e6f4ed3b0e268005146337c36a1` |
| Qualified Rules12 source | `f819257311e43ae41332b83e7b40921c1418f1bf` |
| Qualified Rules11 source | `c0e3dd28879199c48aae328d712d6543ffcc5455` |
| Graphite JavaScript SHA-256 | `c5b688ae74527cb30e7b50f06141d429f237eef0297ed7eba0192d268e0d8c9b` |
| Graphite 81-file inventory SHA-256 | `0b14bcccf7f1ed76bcfd4039b6aabcfb1965c7e6b94e437e3cc46d7e165d7c3e` |
| Frontend Rules7 rollback JavaScript SHA-256 | `bc2872444e4574ae818983e2d7ede46f7ff0c4c2d71b198b9b821c344636321c` |
| Frontend Rules7 rollback 80-file inventory SHA-256 | `e8a9303538dbb2cc5028b21cf5ae97caacdb9c438497a35a567e30a9071a0c67` |
| Audio manifest SHA-256 | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |
| Certified frontend asset-canister module SHA-256 | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |
| Rules7 production module SHA-256 | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Rules11 exact normal Wasm SHA-256 | `5ffb6cc2c1cd377ef36a847df309fc21ead8e4b66d97d49200ca00d80b3e8a43` |
| Rules12 exact normal Wasm SHA-256 | `2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13` |

Both hosted runs reported success of all six substantive gates at these qualification sources. Both retained compressed normal Wasms decoded to the exact approved bytes. The Rules11 configuration file independently hashed to `b2fcfaabecc226e4b99e1660b2341690e4ffb0eace29e152e26bc37d71f9e5df`. The release uses that authoritative value under the owner's explicit transcription-resolution instruction. [Rules11 CI](https://github.com/aodl/balls-2-the-wallz/actions/runs/43884464465) · [Rules12 CI](https://github.com/aodl/balls-2-the-wallz/actions/runs/44214091550)

The installed targets are frontend `s2jxj-liaaa-aaaas-amynq-cai` and backend `s5ir5-gqaaa-aaaas-amyna-cai`. The graphite deployment project is `.work/release-readiness/graphite-recovery`, with a separate original freeze at `.work/boundary-deflector/frozen/frontend`. The 80-file rollback project is `.work/release-readiness/rollback80`. Both projects were independently rehashed before the frontend upload. All 61 audio assets were byte-identical. [Maintained frontend preflight](../boundary-deflector/release-readiness/FRONTEND_DEPLOYMENT_PREFLIGHT.md)
