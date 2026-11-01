# B2Z naming and immutable historical identifiers

The public display name is **Balls 2 the wallZ - BTZ**, abbreviated **BTZ**. Repository paths, packages, symbols, CLI arguments and deployment aliases retain `b2z` / `B2Z` / `B2z`; branding is not a wire migration. The backend alias `b2z` maps to the existing principal; it does not create or rename a canister on-chain. The observer alias and both receiving account representations remain unchanged. The new `BTZ-identify-v1` preference namespace and `BTZ-player-colour-v1` colour domain have no payment authority. DTR and third-party packages are unchanged.

These literal byte strings intentionally retain their published spelling:

| Identifier | Reason |
|---|---|
| `42 54 5a` (`BTZ`) and diagnostic `BTZ/1` | Published binary memo magic/format; old numeric memos encode those same bytes. |
| `BTZ ANGLE …`, `BTZ MOVE …` | S15 text compatibility grammar, never new wallet output. |
| `BTZPAY02` | Existing canonical normalized payment bytes, including sealed and pending inputs. |
| `BTZ_SMALL_BOARD_RULES_02`, `BTZ_SMALL_BOARD_RULES_03` | Historical rules hash commitments. |
| `BTZ_STATE_02_TYPED_JSON`, `BTZ_STATE_03_TYPED_JSON` | Historical schema hash commitments. |
| `BTZ-SPAWN-INPUT-03`, `BTZ-SPAWN-RANK-03` | Deterministic input/ranking hash domains; changing them changes spawn outcomes. |
| `BTZ-ICP-INDEX-01`, `BTZ-ICP-INDEX-ANCHOR-01` | Existing account-source identity and source-anchor domain. |
| `BTZCUT02` | Resumable mechanics snapshot header required for recovery. |
| `btz-animation-1` | Published compact animation format identifier. |
| `btz-s12-*`, `btz-s13-*` | Published benchmark/measurement artifact schemas, consumed without rewriting old evidence. |
| `"game":"btz"` | Frozen coordinator fixture discriminator; active CLI arguments use `b2z`. |
| `not emitted by BTZ JS`, historical benchmark work-unit labels | Exact fixture/measurement provenance reproduced by reference generators. |

The original fixture contents, recordings, archived checkpoint/evidence files, benchmark records, historical `CHECKPOINT.json` / `FILES.sha256` and past changelog entries are preserved. Their old product spelling, paths, environment-variable names, commit/branch names and deployment commands describe those historical releases. They are not current instructions. Historical links are checked against the documented path migration where possible; current documentation uses current paths. No protocol bytes are obfuscated to satisfy a name search, and no binary protocol version was invented for the name change.

Raw-history normalization is epoch-specific: v1 binary/numeric, v2 S15 prefixed text, v3 prefix-free text plus compatibility. Canonical captured input replay remains authoritative. A source rename never changes an existing hash, seal, raw transaction digest or durable canonical payload.
