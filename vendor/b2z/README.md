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
