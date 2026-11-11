# Exact upgrade predecessor

`pacing-c7c69ddf.wasm.gz` contains the frozen normal production pacing module
from B2Z release `2b5e61746cab6b992afe969d5cc60363d32f6a66`.
Its uncompressed SHA-256 is
`c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`.
It was installed and verified on the existing backend; see
`evidence/B2Z/graduated-pacing/activation.json`.
The local runner decompresses and hashes it before the paid v4→v5 rehearsal.
This is a reviewed immutable test fixture, not a rebuild or deployment input.

`europe-612ad0d0.wasm.gz` is the exact previously frozen European normal backend,
retained solely as a disposable upgrade predecessor. Decompressed SHA-256:
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
Its original release provenance remains in `evidence/B2Z/europe-final/`.
This is immutable test evidence, not installation, rollback or live-operation authority.
