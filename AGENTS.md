# B2Z development and verification

Use [STATUS](STATUS.md) for dated production observations and
[the application contract](docs/specs/B2Z_APPLICATION.md) for the specification
hierarchy. Old status, checkpoints, workflows and procedures describe their
recorded versions. Historical failures and qualifications retain their scope.

## Current product

- Preserve the paid European game. The maintained authority is
  `canisters/runtime-lab` and the browser is an independent verifier and
  presenter with optional user-click payments. Rules19 compacts the Reservoir
  encoding in Schema11. Adapter12 (`BTZPAY09`), Rules17 daily tariffs chosen by
  Ledger block time, and Rules18 authorization and receipt semantics continue.
- Use the official ICP Index, one numeric receiving subaccount, the configured
  target-filtered payload-bearing Event Horizon `poke`, and fixed 60-second
  fallback. Preserve sparse ordered admission, stable recovery and the
  Ledger/Index separation. Keep the trust boundary explicit.
- Rules18 optional Pay uses Internet Identity, a Ledger ICRC-2 allowance and
  a separate funding-account grant. Every transfer requires an explicit
  player click and signature. Preserve exact wallet fallback bytes, payer
  attribution, the certified intent/receipt boundary and retained-payment
  disclosure. Automatic refunds and payouts are unavailable. Treasury is a
  separate configured backend policy.
- Preserve the permanent derivation and player origin
  `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`. Under capped prelaunch
  Trickle, ordinary pacing is 0.01 ticks/s and one tick per checkpoint. Keep
  reserve safeguards and the temporary controller-bound owner Full Speed
  authorization. Public-launch builds exclude temporary developer exports
  and controls. Test hooks and manual stepping are confined to disposable
  qualification.
- Keep historical public bytes, goldens, replay, seals, epoch boundaries and
  migration fixtures intact. Conformance means public-output equality and
  successful recovery for each implementation. Keep Life as the generic
  second-kernel boundary test. No history rewriting or paid-world reset,
  reinstall, interpreter substitution or economic changes for cleanup.

## Verify exact inputs

Use Rust 1.94.1, Node ≥22.16 and Python ≥3.11, committed Cargo/npm locks,
immutable DTR pins, and normal dependency resolution. Use `--locked` and
avoid temporary dependency overrides for current builds. Preserve
`vendor/dtr/`, approved runtime audio and required historical Wasms.

Run relevant local gates, fix in-scope failures and rerun. Use `DFX_IDENTITY=codex_local`
for local IC tests and checksum-pinned disposable PocketIC fixtures. The
browser HTTP gate uses the actual server, CSP, browser-native Web Crypto,
and genuine sandboxing. Label controlled lifecycle, browser visibility,
emulation and physical-device evidence separately. A Wasm build supplies
compilation evidence. Candid, exports, certificates, migrations, payment
acceptance and replay each require their own executed gates.

Review [human experience](docs/specs/B2Z_HUMAN_EXPERIENCE.md),
[visual system](docs/specs/B2Z_VISUAL_SYSTEM.md) and
[audio](docs/specs/B2Z_AUDIO.md) before frontend changes. Name affected UX
contracts, exercise populated actual-speed desktop and mobile journeys,
and retain evidence for the changed behavior. Preserve canonical placement,
verified financial head versus presentation time, exact wallet bytes and
mobile quantity, controls and scroll reservations.

For release qualification use the exact source and applicable hosted
[standard](.github/workflows/verification.yml),
[financial](.github/workflows/delegated-payments.yml) and
[developer/prelaunch](.github/workflows/developer-speed.yml) gates. Track
PASS, FAIL, BLOCKED and NOT RUN independently. Tie reused evidence to exact
input identities.

## Operations and retention

- Read-only production inspection uses approved tools. An installation,
  operating-setting change, Full Speed experiment, controller operation,
  snapshot or financial action requires separate explicit owner authority.
  Preserve paid state, source position and receipts through verified same-ID
  upgrades. Use exact current and compatible recovery artifacts and the
  [current operator procedure](docs/operations/S14_OPERATOR.md).
- Never inspect or export private keys, identity material, seed phrases,
  wallet secrets or environment secrets. Never run `dfx identity export`,
  use sudo, weaken browser or OS security policy, or access directories
  outside the authorized workspace/user scope. Keep dependencies and
  private working material out of Git.
- Save coherent commits and preserve published history. Remote operations
  require task authorization. Stage reviewable summaries in `evidence/` and
  raw outputs in `.work/`. Classify unique release, recovery and failure
  evidence before cleanup. Keep reviewed archive inventories and verify
  retrieval. Follow the [maintenance policy](docs/operations/REPOSITORY_MAINTENANCE.md).
- Use `tools/package_review.py` for committed-source handovers. Use a
  complete checkout for builds and exact qualification. The historical
  checkpoint packager retains its separate comprehensive purpose.
