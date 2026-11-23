# Exact upgrade predecessor

`pacing-c7c69ddf.wasm.gz` contains the frozen normal production pacing module
from B2Z release `2b5e61746cab6b992afe969d5cc60363d32f6a66`.
Its uncompressed SHA-256 is
`c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`.
It was installed and verified on the existing backend; see
`evidence/B2Z/graduated-pacing/activation.json`.
The local runner decompresses and hashes it before the paid v4→v5 rehearsal.
This is a reviewed immutable test fixture, not a rebuild or deployment input.

The lossless Rules13 candidate predecessor is archived as
`rules13-d17fb92e.wasm.gz`. Its decompressed SHA-256 is
`d17fb92e83a01a3f09a4e969ef4b9d3e045053fec818a53dfe91ba139cd1f4fd`.
It comes from the normal Wasm in qualification run 44707489146, source
`2e7f1b44995e14c5786c61abe5cb4c148e91c4e0`. The Rules14 installed rehearsal
uses it as the exact predecessor in disposable PocketIC.

- `rules16-a5889a92.wasm.gz` contains the production Rules16 normal backend.
  Raw SHA-256 `a5889a92ce936b035d02632588b75ae7f66ddfda73398177dd79cba2b5b48dcd`.
  The Rules17 disposable cutover uses it as the immutable predecessor.

`rules17-c066140f.wasm.gz` is the exact European Rules17 normal executable,
retained for the disposable Rules18 state-preserving upgrade rehearsal. Its raw
SHA-256 is `c066140f4ef3174b3f440694c19ec4116a03298fcc63b80636b0b5389bc210ca`.

The temporary developer-speed installed rehearsal also uses two exact predecessors:

| Archive | Decompressed Wasm SHA-256 | Hosted source |
| --- | --- | --- |
| `rules18-43095677.wasm.gz` | `43095677376fe4f3c66185b1cf185ef9e161b5c44320609b93e134a771f4bf59` | [Rules18 normal backend](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109997) |
| `rules18-dev-9fb444b0.wasm.gz` | `9fb444b041a7b699f0cf92159a2505d1bdf4cb3dc5e092fc4b85310b1deb0d42` | [Initial speed-control backend](https://github.com/aodl/balls-2-the-wallz/actions/runs/45133912176) |

The installed test runner verifies each raw hash. These archives keep the
rehearsal repeatable after the hosted artifacts expire. The temporary developer
predecessor is only used by the developer-speed qualification.
