# Prelaunch mainnet audio playtest — not general-release qualified

## Follow-up: authorized installation

The owner confirms both soundtrack compositions were generated and downloaded
under an active Suno Pro subscription, using text prompts only and no uploaded
third-party copyrighted audio. This declaration is the recorded basis for hosting
the supplied music in this publicly accessible prelaunch trial. No subscription
receipt/account export was supplied or inspected; retain that provenance evidence
with the project when available. This does not imply the public canister is private.

All six substantive hosted gates for `74f08183b905d97dbfd821ede0a4c2cdc47538f5`
now pass: [final conclusions](ci-final.json). The informational inventory guard is
excluded. The final preflight rehashed all74 frozen files and confirmed no changed
application/build/dependency bytes since that candidate. Later local changes are
documentation/evidence only; no new application build occurred.

The [genuine isolated rehearsal](rehearsal/results.json) installed the exact previous
frontend, uploaded the exact74-file audio candidate, then restored the previous
frontend using `--no-asset-upgrade`. HTTP bytes, security headers and certificate
headers matched in every phase (15 →73 →15 public keys). Independent SDK checks
verified local-root certificates and signed query hashes/lengths:
[previous](rehearsal/previous-certified.json), [candidate](rehearsal/candidate-certified.json),
[restored](rehearsal/restored-certified.json). All three module hashes equal the
production asset-service module. These are isolated local-root checks, not mainnet
attestations. The optional `certified_data` metadata field returned null and is not
used as evidence of a verified HTTP witness. Signed inventory hashes independently
match HTTP bytes; certificate headers are present.

The [sandboxed restored browser](rehearsal/browser-sandboxed.json) authenticated the
actual mainnet backend in `certificate-verifier` mode: one cannon, one ball, expected
Ledger/index/recipient, no errors, only `/query` and `/read_state` POSTs.
[Restored browser screenshot](rehearsal/restored-sandboxed-game.png).
The head diagnostic mistakenly read a nonexistent field (`undefined`); no exact
head claim is made from it. The first rehearsal attempt hit DFX's workspace-path
restriction before asset upload; its [failure](rehearsal/initial-workspace-path-failure.json)
is retained. Moving copies inside the disposable project fixed setup. An extra
browser probe initially ran after local shutdown; the restarted sandboxed probe
passed. No live production mutation was needed for rehearsal. Local instances
were stopped afterward; none is a replacement production canister.

Immediately before production upload, current public bytes, signed inventory,
modules/controllers/subnet and exact rollback bytes were rechecked. The complete
previous staging was additionally retained at `.work/audio-mainnet-playtest/pre-install-staging`.
The unchanged74-file candidate was copied into `.work/s14/assets`, rehashed and
published with the exact observer-only command in [installation/rollback procedure](INSTALLATION.md).
DFX returned success; independent installed-byte and browser verification follows
in the deployment results section. No backend command or financial mutation was sent.

P09 remains FAIL and is explicitly accepted only for this single-owner trial.
Physical listening and device acceptance are owner follow-up work after installation.

## Deployment results — candidate retained

Verified installed URL: https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
Exact qualified source, runtime, JS, complete inventory and audio manifest hashes
are the identities in the table below; no rebuild occurred. The only production
write was the observer-only asset publication in [command output](deployment/deploy.log).
All73 public files match approved bytes, lengths, MIME/cache/security headers and
carry certificate headers: [served verification](deployment/served-installed.json).
Independent mainnet-root verified [signed inventory](deployment/inventory-after.json)
confirms exact keys/hashes and identity-only encodings on all57 FLACs.
[Certified metadata after](deployment/metadata-after.json) confirms unchanged
frontend/backend modules, controllers and European subnet. The diagnostic helper's
console success text says fifteen assets; its actual assertion and JSON inventory
check all73 against the complete candidate inventory, not a fifteen-file subset.

The [actual deployed-browser results](deployment/live/results.json) pass the
bounded smoke journey at1440×900,390×844,320×640, using fresh sandboxed Chromium
contexts. First authenticated world timings were2.85s,2.77s,3.21s respectively.
Initial authenticated heads were segment7907/logical7904 on desktop, and
segment7908/logical7905 on mobile widths; full seals/source bindings are recorded.
All contexts made zero audio requests and created no audio context before an
explicit gesture. Music started successfully; FX decoded all four enabled buffers.
Music disabling/master mute left music inactive and zero FX voices at the300ms
check. Native output remains digital/software-browser evidence, not owner listening.

| Live check | Result and limit |
| --- | --- |
| Authenticated gameplay/source and unchanged recipient | PASS in all three contexts |
| Silent startup, deliberate Music/FX activation, mute | PASS |
| Audio controls at desktop/390/320 | PASS; emulated widths, not physical mobile |
| Overview effects suppression | Zero new starts over10s; no eligible events occurred, so causal event suppression is not proved live |
| Wall-collision / cannon-launch effects | NOT_OBSERVED: zero eligible events/starts in30s Trickle window; no paid commands manufactured |
| Audio-only error isolation | PASS in fresh context; browser abort of audio requests yields `Failed to fetch`, authenticated game stays ready/error-free |
| Serious runtime/renderer regression | None observed; no page errors |
| Physical listening, continuous-loop subjective quality, hardware performance | Owner follow-up; not claimed PASS |

The separate [audio-fault result](deployment/live/fault.json) and
[screenshot](deployment/live/audio-fault.png) are controlled browser fault injection,
not a real subnet interruption. Its context was fresh, avoiding cached files that
could mask the failure. The earlier same-context fault attempt in the main journey
is not independently claimed to force a new download failure.
[Desktop](deployment/live/1440-enabled.png), [390](deployment/live/390-enabled.png),
[320](deployment/live/320-enabled.png) and [overview](deployment/live/overview.png)
screenshots are from the installed origin. No historical fixture replaces these.

[Backend status after](deployment/backend-status-after.json) preserves generation1,
Ledger/index/recipient/subaccount/cursor bindings; pending records remain zero and
no source/run errors are present. Autonomous callbacks advanced7880→7904 between
recorded observations. Normal autonomous execution and cycle consumption continue;
no attempt was made to freeze those balances. No backend installation, gameplay,
financial/settings/controller/funding mutation or remote Git write was performed.

No serious regression was found and **no production rollback was required**.
Exact prior16-file assets remain at `.work/audio-mainnet-playtest/rollback/frontend`,
with the rehearsed [rollback procedure](INSTALLATION.md). The isolated restored
frontend module matches production. Rehearsal phase times were15.09s previous,
57.06s candidate and19.21s restore, including their verification work; these are
not production cost/performance measurements. Public serving/storage/download
costs are not qualified by this smoke test. No additional funding is authorized.

Reproduction helpers are retained under [verification](verification/rehearse.py);
they are evidence tooling, not application inputs. P09 remains accepted FAIL.
The deployed candidate is retained for owner testing, not a general public launch.

## Original preflight snapshot (superseded by follow-up above)

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
the original snapshot below preceded installation; the installed audio candidate
is confirmed in the follow-up results above.

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
