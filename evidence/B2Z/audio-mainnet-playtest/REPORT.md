# Controlled mainnet audio playtest — preflight; NOT DEPLOYED

The owner authorized a reversible **frontend-only prelaunch mainnet playtest**,
conditional on six exact-source hosted gate passes, public audio-hosting rights,
rollback readiness and normal safety checks. This supersedes the earlier need to
finish physical listening and representative-device qualification before a trial.
It does not establish general-release qualification. P09 remains FAIL and is an
explicitly accepted limitation for this bounded trial; no threshold was changed.

## Deployment hold

At the recorded check on 13 November 2026, five substantive gates passed and the
installed-IC gate was still running. No rights record establishing permission to
host the supplied Suno music publicly was found. A factual rights/provenance
question was sent to the owner. **No frontend publication was attempted.**

The supplied handoff README expressly says it does not independently establish
the account's commercial-use rights. Approval of musical content is not recorded
as a substitute. The public mainnet canister cannot be treated as private testing.

## Exact candidate and target

| Item | Identity |
| --- | --- |
| Preflight starting local and remotely observed release head | `74f08183b905d97dbfd821ede0a4c2cdc47538f5` |
| Frozen application runtime | `5a66aaf6bd8f83f8bf444ef5ea031ed34f3e260e` |
| Final locally tested qualifier code | `db73806436d124cfb6707873d54004e575a794ae` |
| Frozen directory | `.work/audio-corrective/frozen/frontend` |
| JavaScript SHA-256 | `cba3eb98c63bb513494500de7f1b79550a1ba4332ee50181529839c6252eed0e` |
| Complete 74-file inventory SHA-256 | `b4abc541bf7277dbae865f4269d1abd12cc4d6e0bcba39bcf2b21a875c1ae72f` |
| Audio manifest SHA-256 | `d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7` |
| Upload policy SHA-256 | `6ec03d6641a287c5a780a64280443376b430377f8a97b90cfe41901987f9ef29` |
| Only authorized deployment target | `s2jxj-liaaa-aaaas-amynq-cai` |
| Unchanged backend binding | `s5ir5-gqaaa-aaaas-amyna-cai` |

Every frozen file was rehashed against the [complete inventory](../audio-corrective-qualification/frozen-inventory.json),
including exact file-set equality: 74 files, 76,234,102 bytes. No rebuild or
substitution occurred. Deployment configuration remains `ic` / `https://icp-api.io`
with the approved backend. No application, dependency, build or audio bytes changed
in this preflight. The starting working tree was clean.

## Hosted qualification

[Run 43519301054](https://github.com/aodl/balls-2-the-wallz/actions/runs/43519301054)
is for exact source `74f08183b905d97dbfd821ede0a4c2cdc47538f5`.
See the timestamped [preflight conclusions](ci-preflight.json) and unchanged
[closing recheck](ci-latest.json). These are snapshots, not a claim about later results.

| Substantive gate | Observed conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | PASS |
| S14 and million-cell installed-IC qualification | IN_PROGRESS; not PASS |

The separately named BLOCKED production-inventory job is excluded. Previous
c281828 failures remain historical evidence in the [corrective report](../audio-corrective-qualification/REPORT.md).
Local passes do not replace the outstanding hosted result.

## Actual mainnet read-only preflight

Cache-bypassed identity-encoding HTTP reads verified all 15 currently served
public assets and their hardened security headers against the previous approved
release. The [served identities](served-before.json) and independent
[signed asset-list query](inventory-before.json) agree. The consumed upload policy
was recovered from the verified retained deployment inputs; it is not an HTTP
asset. Current served JS remains
`9d45b94008d6f417c4d685c76d52b8a869af34c4b950aea395596ef13104014c`.

[Pinned-mainnet certified metadata](metadata-before.json) confirms the same
modules, controller sets and 13-node European subnet as the prior deployment:

- Backend module `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Subnet `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`.

The [backend status query](backend-status-before.json) reports revision 23648,
generation 1, callback 7880, Trickle 0.01 ticks/s, admission open, zero pending
records and no source/run errors. Official Ledger/index bindings and admitted
cursor 40180669 remain consistent with the prior deployment. This is a signed
status read; it is not a new browser gameplay-certificate acceptance test.
Autonomous gameplay continues normally between observations.

Only anonymous metadata/asset reads and the `lab_status` query were performed.
No backend update call, gameplay command, payment, allowance, funding, canister
creation, settings/controller change, installation or remote Git write occurred.

## Rollback readiness

All current public bytes plus the consumed policy are retained at
`.work/audio-mainnet-playtest/rollback/frontend` and checked against complete
inventory `f85e3ddf9b1ed38dd7b441162f7579707b5e7ef1c10c0612d0990795cb46e99c`.
The [preservation check](rollback-preservation.json) passes. The original staging
directory `.work/s14/assets` still contains that same exact 16-file set.

DFX 0.31.0 supports `--no-asset-upgrade`. The established route names `observer`
only and has no backend dependency. If publication later occurs, restoration is:

1. Reconcile the installed signed inventory, retain the trial evidence and verify
   the saved rollback manifest and all 16 files again.
2. Preserve current staging, stage the verified rollback directory at
   `.work/s14/assets`, preserving `.ic-assets.json5` exactly.
3. Run the existing observer-only asset command:

   ```sh
   DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
   ```

4. Independently verify every restored public file/header, exact signed asset-key
   inventory (including removal of audio keys), certified unchanged modules and
   authenticating browser gameplay. Never restore or reset the backend.

This preflight tests byte preservation and stage-input identity. It does **not**
claim an actual canister rollback rehearsal. Complete the owner's rollback
demonstration requirement before the trial upload; do not confuse a saved hash
with demonstrated restoration.

## Audio isolation and remaining acceptance

Code review reconfirms defaults `music:false`, `effects:false`; even saved enabled
preferences require a new user gesture before context creation/unlock. The
application catches construction, begin and flush faults separately from game
observation/rendering. Existing native corruption/activation/lifecycle evidence
remains in the corrective report. None is relabelled as installed-site evidence.

Installed audio manifest availability, user-activated music, eligible displayed
FX, overview suppression, audio-only fault isolation and desktop/mobile smoke
checks are **NOT_RUN: candidate not installed**. No rollback was necessary.
Physical listening, device routes and long-session responsiveness are intended
owner playtest outcomes, rather than prerequisites to this authorized trial.
Production storage/download costs remain unmeasured; no funding was initiated.

This documentation/evidence update passes `tools/check_docs.py` (373 links) and
`git diff --check`. No application rebuild or repeated game qualification was
needed for these documentation-only changes. It does not qualify the candidate
before the remaining hosted gate completes.

After CI, rights and rollback conditions are met, deploy only these frozen bytes,
verify all 73 served assets and policy/certification, then perform the requested
short live smoke test. On success label the site **prelaunch mainnet playtest —
not general-release qualified** and retain it; on serious regression restore only
the frontend assets. No general launch or invitations are authorized.

## Owner listening checklist for a successfully installed trial

Use https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/ only after installation is confirmed;
it currently remains the pre-audio frontend.

- Start with Music only; assess quality, internal transitions and continuous
  looping for at least three 407.36-second loops, during slow and fast gameplay.
- Try FX only, then both: visible wall collisions and cannon volleys should sound
  restrained; torus wrap and unavailable historical activity stay silent.
- Pan, follow and zoom to overview; local effects should attenuate/suppress and
  hidden/occluded sources should not produce sound storms.
- Repeat on desktop and a real phone; inspect Fire/Move/Build payment scrolling
  and selection without sending payments.
- Background/return, refresh, mute, switch tabs and audio output; saved preferences
  must not cause unsolicited autoplay or competing tabs.
- Record device/browser, headphones or speakers, approximate session duration,
  clicks/gaps, errors and responsiveness. Detailed procedure:
  [manual acceptance](../audio-corrective-qualification/MANUAL_ACCEPTANCE.md).
