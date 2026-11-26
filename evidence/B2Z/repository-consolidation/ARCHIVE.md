# Historical captures and diagnostics

The 2,086 removed working-tree copies are preserved in the Git tree
at `315fe2ff1ff873c16e8f693025cc625b0ae59cab`. This commit remains on the protected `master` history.
The [archive inventory](archived-files.tsv) records original paths, Git
blob IDs, byte counts and SHA-256. The [retrieval record](archive-verification.json)
records the local full verification and independent remote samples.

Open the report or gallery through the **Original tree** link below to
follow its original relative links. The historical reports and their
conclusions remain available at that exact revision. From a full clone:

```sh
git show 315fe2ff1ff873c16e8f693025cc625b0ae59cab:PATH > retained-file
sha256sum retained-file
```

Compare against the SHA-256 for `PATH` in the inventory. Use `git archive`
on the same commit to retrieve a collection with its reports and captures.
See [production releases](../../../docs/operations/PRODUCTION_RELEASES.md)
for independently retained executable bytes.

| Collection | Original tree | Files | Bytes |
| --- | --- | ---: | ---: |
| evidence/B2Z/agent-foundations-2026-11-01 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/agent-foundations-2026-11-01) | 5 | 193,928 |
| evidence/B2Z/approved-action-panel-war-cry | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/approved-action-panel-war-cry) | 431 | 123,859,996 |
| evidence/B2Z/arena | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/arena) | 1 | 311,340 |
| evidence/B2Z/audio-corrective-qualification | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/audio-corrective-qualification) | 18 | 3,452,081 |
| evidence/B2Z/audio-integration | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/audio-integration) | 8 | 2,756,669 |
| evidence/B2Z/audio-mainnet-playtest | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/audio-mainnet-playtest) | 9 | 1,511,819 |
| evidence/B2Z/audio-onboarding-compact-controls | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/audio-onboarding-compact-controls) | 160 | 45,489,906 |
| evidence/B2Z/combined-clearance-war-cry | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/combined-clearance-war-cry) | 159 | 85,625,616 |
| evidence/B2Z/entry-rules-7-mainnet-release | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/entry-rules-7-mainnet-release) | 3 | 103,125 |
| evidence/B2Z/europe-live | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/europe-live) | 9 | 557,481 |
| evidence/B2Z/europe-release | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/europe-release) | 6 | 466,216 |
| evidence/B2Z/expander-first-live-payment-2026-11-01 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/expander-first-live-payment-2026-11-01) | 3 | 172,463 |
| evidence/B2Z/farthest-entry-2026-11-01 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/farthest-entry-2026-11-01) | 3 | 166,461 |
| evidence/B2Z/fiduciary-cycle-optimisation | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/fiduciary-cycle-optimisation) | 2 | 46,962 |
| evidence/B2Z/fluid-player-experience | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/fluid-player-experience) | 28 | 26,060,402 |
| evidence/B2Z/frontend-diagnostic-deployment-2026-11-02 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/frontend-diagnostic-deployment-2026-11-02) | 2 | 292,273 |
| evidence/B2Z/graphite-deflectors | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/graphite-deflectors) | 556 | 148,082,628 |
| evidence/B2Z/human-interface | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/human-interface) | 9 | 509,115 |
| evidence/B2Z/human-interface-final | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/human-interface-final) | 11 | 703,666 |
| evidence/B2Z/human-playtest-corrections | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/human-playtest-corrections) | 221 | 65,679,427 |
| evidence/B2Z/million-cell-boundary-review | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/million-cell-boundary-review) | 24 | 976,884 |
| evidence/B2Z/million-cell-visuals | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/million-cell-visuals) | 36 | 1,704,127 |
| evidence/B2Z/minimal-isometric | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/minimal-isometric) | 27 | 15,819,702 |
| evidence/B2Z/overnight-campaign-closeout-2026-11-02 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/overnight-campaign-closeout-2026-11-02) | 2 | 92,045 |
| evidence/B2Z/player-centred-live | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/player-centred-live) | 9 | 1,833,712 |
| evidence/B2Z/player-centred-release | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/player-centred-release) | 24 | 26,179,238 |
| evidence/B2Z/player-experience-refinement | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/player-experience-refinement) | 88 | 54,361,577 |
| evidence/B2Z/post-self-play-review-2026-11-02 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/post-self-play-review-2026-11-02) | 2 | 327,600 |
| evidence/B2Z/reactive-defence-closure-2026-11-02 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/reactive-defence-closure-2026-11-02) | 2 | 291,043 |
| evidence/B2Z/reservoir-visuals | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/reservoir-visuals) | 10 | 3,878,150 |
| evidence/B2Z/rules13-context-structures | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules13-context-structures) | 39 | 6,722,952 |
| evidence/B2Z/rules13-experience-refinement | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules13-experience-refinement) | 18 | 7,807,743 |
| evidence/B2Z/rules14-universal-shout | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules14-universal-shout) | 10 | 2,994,511 |
| evidence/B2Z/rules15-interaction-polish | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules15-interaction-polish) | 31 | 12,637,384 |
| evidence/B2Z/rules15-spacing-orbit | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules15-spacing-orbit) | 34 | 13,496,258 |
| evidence/B2Z/rules16-reservoirs | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules16-reservoirs) | 5 | 1,219,594 |
| evidence/B2Z/rules16-toolbar-payments | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules16-toolbar-payments) | 10 | 4,066,934 |
| evidence/B2Z/rules17-daily-economy | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules17-daily-economy) | 7 | 2,491,497 |
| evidence/B2Z/rules18-delegated-payments | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/rules18-delegated-payments) | 6 | 1,559,674 |
| evidence/B2Z/tactical-polish | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/tactical-polish) | 34 | 21,736,455 |
| evidence/B2Z/tactical-review-2026-11-02 | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/tactical-review-2026-11-02) | 2 | 330,993 |
| evidence/B2Z/temporary-dev-speed | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/B2Z/temporary-dev-speed) | 4 | 905,478 |
| evidence/BTZ/release1-mainnet | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/BTZ/release1-mainnet) | 5 | 124,766 |
| evidence/BTZ/v6-gate-qualified | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/BTZ/v6-gate-qualified) | 5 | 466,075 |
| evidence/BTZ/v6-mainnet-release | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/BTZ/v6-mainnet-release) | 6 | 242,006 |
| evidence/BTZ/v6-release-candidate | [Open](https://github.com/aodl/balls-2-the-wallz/tree/315fe2ff1ff873c16e8f693025cc625b0ae59cab/evidence/BTZ/v6-release-candidate) | 2 | 199,912 |
