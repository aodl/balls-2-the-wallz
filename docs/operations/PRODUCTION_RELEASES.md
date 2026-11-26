# European executable retention

The capped Trickle installation of 25 November 2026 and its compatible
same-epoch recovery pair are retained as public-safe executable bundles.
Both annotated tags identify the exact hosted build source. The binaries
were independently rehashed and both published ZIPs downloaded and matched
against the local bundle digests.

| Role | Qualified source | Retained raw SHA-256 |
| --- | --- | --- |
| Installed backend | `741dbf898ade58ed2fa3a064d8bbe1acb577ed4a` | `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` |
| Installed frontend | same capped Trickle source | `2a6da764e4e7f63bf367bc6e55265df00a4714121019e895e67d0598521475ff` |
| Compatible recovery backend | `3f93d8b4c57f3c0ba752f3a8f6975e76069b9dc7` | `b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de` |
| Compatible recovery frontend | same Rules19 public source | `48de515cac98524e02a60f48112d8a65ca05bc2cb497528227f22b9e0df855e1` |

- Installed `prelaunch-trickle.wasm` and embedded developer frontend, including inventory and Candid/export evidence. [Capped Trickle bundle](https://github.com/aodl/balls-2-the-wallz/releases/tag/production/europe-rules19-prelaunch-trickle)
- Rules19 normal backend and embedded public frontend. This pair understands the committed compact epoch and omits the temporary controls. [Compatible recovery bundle](https://github.com/aodl/balls-2-the-wallz/releases/tag/production/europe-rules19)

```sh
gh release download production/europe-rules19-prelaunch-trickle -R aodl/balls-2-the-wallz
gh release download production/europe-rules19 -R aodl/balls-2-the-wallz
unzip europe-rules19-prelaunch-trickle.zip -d capped-trickle
(cd capped-trickle && sha256sum -c SHA256SUMS)
unzip europe-rules19.zip -d rules19-recovery
(cd rules19-recovery && sha256sum -c SHA256SUMS)
```

Compare raw Wasm hashes to the table and verify archive provenance with the
[machine-readable release inventory](../../evidence/B2Z/repository-consolidation/executables.json).
Keep the recorded Rules19/Schema11 and Adapter12 compatibility boundary.
An older Rules18 executable belongs to its historical epoch. A Wasm bundle
restores software. Preservation of stable state follows the
[same-canister procedure](B2Z_PRELAUNCH_TRICKLE.md) and separate authorization.

The complete developer Actions archives 15033641591 and 15031828103 were
also retained under the operator's local `b2z-release-evidence/repository-consolidation/`
directory. The permanent public bundles contain the required production
executables and selected provenance. Qualification and installation records
are under [capped Trickle acceptance](../../evidence/B2Z/prelaunch-trickle/PRODUCTION.md)
and [historical Rules19 trial](../../evidence/B2Z/rules19-compact-reservoirs/PRODUCTION_TRIAL.md).
