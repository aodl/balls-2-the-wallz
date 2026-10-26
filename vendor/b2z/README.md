# Exact upgrade predecessor

`pacing-c7c69ddf.wasm.gz` contains the frozen normal production pacing module
from B2Z release `2b5e61746cab6b992afe969d5cc60363d32f6a66`.
Its uncompressed SHA-256 is
`c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`.
It was installed and verified on the existing backend; see
`evidence/B2Z/graduated-pacing/activation.json`.
The local runner decompresses and hashes it before the paid v4→v5 rehearsal.
This is a reviewed immutable test fixture, not a rebuild or deployment input.
