# Installed European game — frontend updates

The backend now contains **real paid gameplay and financial state**. This is the
current procedure. Never run the archived empty-target installation, constructor,
reset, activation or transition sequence against it.

- Backend: `s5ir5-gqaaa-aaaas-amyna-cai`.
- Frontend: `s2jxj-liaaa-aaaas-amynq-cai` / https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
- Expected subnet: `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`, 13 nodes; refresh certified membership.
- Default receiving AccountIdentifier: `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.

Asset-only frontend publication requires explicit release-specific owner authority.
The authorised player-centred asset release and its actual served verification are
recorded in [the release report](../../evidence/B2Z/player-centred-live/REPORT.md).
That completed publication does not grant standing authority for future releases. Backend controller access
is not upgrade authority. No backend install/upgrade/reinstall, stop/start,
transition, migration, controller change, ICP/cycle transfer, cycle purchase,
new canister or former-deployment operation is part of this procedure. Normal
existing autonomous processing continues. Do not pause gameplay for an asset update.

Read [STATUS](../../STATUS.md), the [current frontend release report](../../evidence/B2Z/player-centred-live/REPORT.md) and the normative
[human-experience contract](../specs/B2Z_HUMAN_EXPERIENCE.md). Changes to controls,
flows, statuses, handoff, rendering or playback must identify affected UX IDs,
update intentional contract changes and execute corresponding regressions.

## Freeze and qualify

Check actual branch/head, clean source and remote publication; never force-push.
Remote Git operations remain user-owned under repository rules. If publication is
not available, return the exact ordinary push command for the final source.
Do not push an evidence-only replacement while qualification is running.

Freeze clean committed frontend source with the existing reviewed builder:

```sh
node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/minimal-isometric/final-release/frontend
```

Use a fresh output directory. Retain the preceding served asset set and its full
manifest separately for rollback. Record every asset hash, build/dependency/source
provenance and the complete manifest hash. Never rebuild a qualified artifact merely
to package documentation. Record source and later evidence commit separately.

All six substantive exact-source hosted jobs must pass: Source conformance, Native
conformance, Packaged DTR/clean consumers, Runtime-lab Wasm, Browser HTTP/Web Crypto,
S14/million-cell installed-IC qualification. Inventory BLOCKED is informational.
Tests use disposable valueless payments. No real-wallet spending is required.

## Immediate read-only preservation check

Verify aliases in `canister_ids.json`, controller sets/access, existing frontend
module, backend module, subnet/membership and balances. Use certified metadata and
fresh authenticated gameplay/source/configuration reads. Capture pending source
and treasury health. Independently derive the receiving account from the verified
backend/default subaccount. Preserve receipts, cursor, financial journals, pending
payments/plans, scores, territory and authenticated history.

Expect legitimate autonomous changes between reads, not byte-identical game state.
Reconcile unexplained identity/configuration/state or ambiguous responses before
continuing. No automatic reinstall or rollback. SDK liquid already excludes platform
reserves; do not subtract again. Current Trickle entry 1.25T, exit below 1T, rate
0.01 ticks/s and existing floors are backend policy, unchanged by a frontend update.
Event Horizon remains disabled; independent fallback remains 60 seconds.

## Public cycles status — preserve existing setting

Read-only controller and anonymous SDK queries on 8 November 2026 verified backend
`status_visibility = public`; no setting change is currently necessary. The
[required policy](../../config/europe-public-status.json) records this expectation.
Use [the narrow management query interface](../../config/europe-public-status.did)
to read it without accessing identity material:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity dfx canister call aaaaa-aa canister_status '(record { canister_id = principal "s5ir5-gqaaa-aaaas-amyna-cai" })' --query --network ic --candid config/europe-public-status.did --output json
```

The existing SDK 6.1.0 frontend queries management `aaaaa-aa` with the backend as
both argument and effective routing ID; it keeps mainnet root/query signatures.
The installed DFX 0.31.0 has no status-visibility flag. Do not run a broad settings
sync or change log/snapshot visibility/controllers to enable the meter. If the
setting later differs, prepare a **status_visibility-only** management setting
change with the then-current interface for explicit approval. Preserve every
unrelated setting. No backend method/upgrade/proxy is needed for public status.
Idle cycles/day is the idle baseline, not total gameplay burn; the frontend's
approximate net decline is a bounded, non-authoritative observation. Public status
permission does not make canister_metrics public. Treasury/financial accounting
and all existing safety floors remain unchanged.

## Asset-only publication

Use existing `codex_local` identity without inspecting/exporting identity material.
The scoped `DFX_WARNING=-mainnet_plaintext_identity` acknowledgement remains allowed.
Verify installed DFX supports `--no-asset-upgrade` before running. Stage the exact
frozen complete assets in `.work/s14/assets`, preserving prior staging first.

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

This names **observer only** and skips asset-canister Wasm upgrade. Do not use
`--all`, `dfx deploy b2z`, a backend release preparer, `install` or `reinstall`.
No backend rebuild/upgrade is a side effect authorised by this task.

Verify every actually served HTML/CSS/JS/configuration/provenance asset against the
frozen manifest, plus CSP/security headers and genuine browser certificate/source
verification. Exercise bounded read-only desktop, 390×844 and 320×640 smoke checks.
No production entities/payments may be manufactured to get a screenshot. Use
populated disposable evidence where live ownership/scenarios are unavailable.
Capture backend module/controllers/source before and after; record autonomous state
progress and any concrete anomaly without resetting it.

## Rollback and limitations

An operator can stage the retained preceding complete asset set, verify its saved
manifest, and run the same observer-only asset command. Reconcile any ambiguous
publication first. This restores frontend assets only; it cannot roll back paid
backend state. Never substitute a backend rollback or reset.

Local saved instructions are not payment proof. Public receipt fields do not permit
automatic packet association; no heuristic matching/reporting workflow exists.
Document physical-device, actual-wallet, human-research and maximum-population
coverage precisely. A mobile viewport is not a physical phone.

The [fresh European installation archive](S14_OPERATOR_FRESH_EUROPE_ARCHIVE.md) and
[older operator archive](S14_OPERATOR_HISTORICAL.md) are immutable historical
procedures, not current deployment instructions or authority.
