# S09 Wasm build provenance clarification

11 October 2026. This note supplements the preserved S09 reports and evidence. It does not replace either build result or establish a cause for the difference.

The developer corrective run recorded these module identities:

| Module | SHA-256 |
|---|---|
| Normal runtime-lab Wasm | `bcbbcd258112c77b15e86cca039bed382f64ae35046a5517c42615c7071f06e7` |
| Test-hook runtime-lab Wasm | `87bc9ea48b1d188635ca653eb18bb16f4a7946753cbbe51951dd789db9d6b6a0` |

Fresh GitHub Actions run `38132545307`, at corrected implementation commit `68e714979eaf72c3d301b1cc43c1ec2caccd1a27`, recorded these distinct identities in the local-IC job's `results.json`:

| Module | SHA-256 |
|---|---|
| Normal runtime-lab Wasm | `0366497485d1419b143ffb75cd01c8a1a9a9cc29a0721024f391736a6a63dcd4` |
| Test-hook runtime-lab Wasm | `5fe4cba1bc755dc485e462fab6abceb3866249f42420dabca3737aac12f66fb8` |

The developer and hosted-CI modules are not byte-identical. Both sets remain evidence for their respective executed environments; neither is substituted for the other. No cause is asserted without a controlled reproduction. Independent byte-for-byte reproducible Wasm verification remains an open release gate and is not part of S10's live-local functional milestone. S10 records the identities of its own tested modules separately.
