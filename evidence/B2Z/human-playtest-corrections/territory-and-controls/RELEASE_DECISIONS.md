# Territory/control release decisions — no production authority

All six substantive hosted gates passed for the exact published candidate `7f5eeed7d2b5eacc55bf1eab2abe4ccd579a8ab9`, run
[43587243414](https://github.com/aodl/balls-2-the-wallz/actions/runs/43587243414).
No artifact was rebuilt during closeout. See `artifact-audit.json` for the new
complete rehash and source-input parity proof.

## Decision A: frontend only, independently approvable

Approve the retained `.work/territory-controls/frozen-8fd/frontend` directory,
75 files including the consumed `.ic-assets.json5` policy. Its manifest hash is
`e9b5c4be2216420f6f70d7c3f33f3ef4596b7d56e05c06eae43171fd629cb8c1`;
JavaScript is `97d8ee0bf61e8b76816511772ab348962d56bbf78b597acc365f48a38725cdc9`.
The build manifest truthfully identifies clean freeze source
`8fdc2a273a93d711bb18ef4bf390f18ff61acf98`; its consumed inputs match the
published candidate. Last frontend runtime change is
`fbd0cdf30d8577b38bd2e102bd7198b269690a30`.

Only app.mjs, backend.did, build-manifest.json and the new
configuration-clearance.bin differ from the installed audio frontend: +14,326
bytes, total 76,248,428. HTML, CSS, CSP policy, icons and all 58 audio files match.
The frontend authenticates both exact Rules7 and Rules9 configurations, selects
legality from that identity and invalidates incompatible quotes; installing it on
Rules7 does not activate or announce four-cell enforcement. Certified disposable
same-page cutover, quote, stale-copy and independent replay checks cover the change.

After separate owner approval, preserve existing staging, rehash the approved
inventory, copy this complete frozen directory into `.work/s14/assets/` and verify
that staging has exactly those files. Confirm canister_ids.json maps observer to
`s2jxj-liaaa-aaaas-amynq-cai`. Use the established observer-only asset operation:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

This command is recorded for later approval; it was not run in this closeout.
Do not invoke a builder, backend deploy, --all, install/reinstall or asset-canister
Wasm upgrade. Independently retrieve and hash all 74 public files (the 75th is the
consumed upload policy); check certification, content types, CSP/security/cache
headers and no unexpected script origin. Record backend module, certified
rules/config/schema/source and account-history state before and after. Autonomous
game advancement is expected; the operator must not mutate gameplay for testing.

Use fresh contexts at 1440×900, 390×844 and 320×640, plus contracted/reduced-motion
views: startup verified playback; reconnect recovery; minimum/maximum intended
zoom disabled states; cold unselected state; click select without camera movement;
aim cursor/shaft/head gestures; legal Move/Build defaults/disabled actions; Move
arrow; exact recipient/account/amount/memo/fee/warning; copy freshness; stable
status-only action geometry; follow interruption; audio opt-in. No real payment.
Unavailable live ownership/scenarios remain limitations, not fabricated tests.

Immediate rollback while backend remains Rules7: preserved
`.work/territory-controls/rollback/frontend`, 74 files, inventory
`b4abc541bf7277dbae865f4269d1abd12cc4d6e0bcba39bcf2b21a875c1ae72f`, JS
`cba3eb98c63bb513494500de7f1b79550a1ba4332ee50181529839c6252eed0e`.
Rehash, replace staging with the complete old set, run the same observer-only
operation and confirm removed clearance key, restored served hashes, headers and
certified startup. The original audio-trial rollback rehearsal is historical;
this closeout rehashes retained bytes and does not claim a new installation.
Rollback on broken verification/payment identity, missing assets, persistent
startup/recovery errors, serious action/mobile failure or repeated renderer errors.
Never reset or roll back the paid backend to fix a frontend defect.

## Decision B: backend upgrade and Rules9 activation, separately approvable

Exact candidate: `.work/territory-controls/frozen/backend/normal.wasm`,
3,579,652 bytes, SHA-256
`8b853bc7a93a225ad600b6acb857693a15a08c76c14650d2f849c7e7c2530caf`.
Rules9 `cfb882f7fb231214bac3df61e34a66ceb8c71e1216caabee899495c0910b2b70`;
configuration `0567d064106d26a14791f9d07bd64a2e4f87b26789dbef7167b2ee7e96114153`;
unchanged schema `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
Last backend runtime change: `e7e425083ddef569fa481d65acfd204274a03c8a`.

Expected paid predecessor: backend `s5ir5-gqaaa-aaaas-amyna-cai`, module
`612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`,
Rules7 `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`,
configuration `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`,
source `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125`.
Re-establish every identity against fresh authenticated observations before action;
stop on mismatch. No controller/settings/funding/source-configuration changes.

Use the detailed owner procedure in `docs/specs/B2Z_TERRITORY_CLEARANCE_9.md`:
compatible frontend first; preserve module, RunConfig, certified publication/world,
accounts, receipts, financial counters and source/index cursor; owner-pause; upgrade
existing canister in **upgrade** mode with empty `()` argument and exact normal Wasm;
compare preserved state before proceeding. Then prepare_clearance_transition,
wait for healthy ready/drained global Ledger/index/journal boundary with existing
liquid headroom, retain exact cutover evidence and commit_clearance_transition
with the freshly authenticated expected manifest. No admitted batch switches rules.
Every pre-cutover command retains its old interpretation; the committed authenticated
epoch introduces Rules9 for subsequent processing. No reindex/reset or source change.

Verify old/new identity and epoch binding, equal world hashes, preserved account and
receipt history, balances/paid accounting, source anchor/cursor and latest quote
policy. Resume the preserved RunConfig only after all checks. Stop and preserve
state/evidence on mismatch. Do not force a phase, clear a source error or pay to test.

Preservation proof is disposable, not a production mutation: exact European module
upgrade and valueless Ledger/Index tests preserve world and finance through cutover;
Rules9 unsafe Move/New receipts retain amount_used=0/full remainder; independent
JS replay matches 134 publications including two checkpoints. Historical Rules7
hashes and the 28 JS/native vectors remain intact. Full hosted installed qualification is PASS for the published source.
The hosted Wasm build is separately identified as 8f3288fa… (3,580,379 bytes);
it is not byte-identical to the retained 8b853bc7… artifact. Source-input parity
and the exact local European-predecessor installed proof support that retained
candidate; no cross-host byte-reproducibility claim is made.

**Rollback boundary:** preparation writes new transition/root state, so the old
Rules7-only backend is no longer a blind rollback target from that point. After
activation or Rules9 command admission, neither the old module nor old audio frontend
is a safe rollback. Use an independently qualified Rules9-compatible recovery artifact
or forward fix preserving the current root/epoch/journal, never an older paid-world
snapshot, reverse epoch, replay reset or improvised refund. If such recovery is needed,
its exact artifact and authorization must be established before executing recovery.

## Audio and remaining limitations

Audio is unchanged from the existing controlled prelaunch trial, not requalified as
a general release. Manifest remains
`d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7`.
Historical P09 remains FAIL/accepted trial limitation. Emulated Chromium/mobile,
software rendering and disposable IC results do not prove physical-device listening,
hardware performance, target-subnet incremental clearance costs or real-wallet
execution. No ICRC-2 activation is included. Both production decisions remain
unexecuted and require separate explicit owner authorization.


Hosted installed completion is documented in `hosted-43587243414/`: all60 wrapper
checks and52 installed cases PASS; Normal/Economy/Lifeline, complete strict capture
(fence1045, no errors/pending), independent1,046-publication replay and Rules9
cutover/receipt checks PASS. The exact-European predecessor remains the separately
executed local proof. Both source and artifact scopes are explicit; see
`hosted-43587243414/artifact-provenance.json` before approving backend bytes.
