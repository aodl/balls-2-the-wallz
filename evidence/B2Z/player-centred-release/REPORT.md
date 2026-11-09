# B2Z player-centred release candidate

**Not ready for production approval:** source publication is blocked by missing
ordinary HTTPS Git credentials, so no new exact-source hosted CI run exists.
Local implementation, clean-source freeze and visual review package are complete.
Production deployment and live settings are outside this instruction's authority.

The initial checkout was HEAD `2491d55f30125b421bedb7155db0fcac9bf0711f` on the
existing release branch, with the previous 55-file candidate staged and no
unstaged/untracked changes. The remote head agreed. Those staged changes were
preserved; the prior [dirty review evidence](../player-centred/REPORT.md), including
failed/incomplete source attempts and dirty artifact identities, remains historical.

UX-04/06/10/13 corrections bound only optional telemetry. The public status reader
uses a separate pinned SDK agent per request, request-scoped AbortSignal for query
and certificate-key fetches/body reads, zero SDK retries, and a bounded one-target
five-minute key cache through the SDK's existing store interface. It never mutates
or cancels the authenticated game agent. Timeout aborts the operation; retry awaits
settlement and uses bounded backoff. A transport ignoring abort remains explicitly
Unavailable rather than claiming Collecting or spawning overlapping replacements.
Visibility/stop fence stale results and stopped timers. Compact labels are fixed;
reset diagnostics and net-versus-gross limitations remain in expanded details.

The maintained [UX contract](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md) retains
UX-01..13 and separates development assertions, source qualification through all
six substantive hosted gates, required short visual review and separate production
approval/served-asset verification. No runtime economics, physics, backend code,
DTR, dependencies, protection floors, source reconciliation or Ledger authority changed.

## Local checks and review evidence

- Complete frozen-source wrapper: PASS, 1,759 JavaScript tests, 196 Python tests and all
  reference/structure/document checks; no skips and the existing 300-second outer
  Node allowance is unchanged. [Executed source result](local-source.json).
- Focused telemetry: 19 tests PASS, including obsolete queued-timer/deadline fencing. A recorded pre-fix never-settling regression
  failed exactly because hide/return published Collecting. Real pinned-SDK/native
  fetch tests prove timeout cancellation closes both query and certificate-key
  requests, including stalled response bodies. Retry, late success, visibility,
  stop and duplicate-loop cases are deterministic/bounded.
- Populated full browser matrix: PASS at desktop, 390×844 and 320×640, including
  reset/error caption bounds and payment-preparation independence. [Result](local-browser.json).
- [Matched baseline/candidate rules and broad-run diagnosis](broad-suite-diagnosis.json)
  preserves historical uncertainty. Both complete unchanged 22-test rules files
  pass (40.5/44.5 s), and the complete frozen candidate source suite passes. The earlier 1,758-test development pass is retained separately; the final 1,759-test pass includes queued-callback fencing. The
  historical cache-bypass assertion's exact cause is not established; neither its
  2-second application work budget nor any assertion/runtime rule was changed.

## Visual review package and performance

Actual populated [desktop](desktop.webm), [390×844](390x844.webm) and
[320×640](320x640.webm) recordings cover selection, aim dragging, Move/Build,
copy/replacement, close/reopen with a progressing unchanged clock, minimap/seams,
and canonical waiting/resumption. They are approximately 89/39/27 seconds.
[Capture identities/scope](media.json) binds source-module and fixture bytes.
[Byte-equivalence proof](visual-equivalence.json) shows the later optional-monitor
queued-callback fix leaves the compiled visual fixture exactly unchanged; the
mainnet bundle is frozen and checked separately.
The waiting scene uses declared accelerated disposable time; it is not IC timing
or certificate proof. No actual transfer was sent.

Populated screenshots: [desktop](1440x900-populated.png),
[390×844](390x844-populated.png), [320×640](320x640-populated.png).
Wallet and waiting screenshots for each size are in the same capture manifest.
These expose actual renderer/UI quality; they do not constitute human approval.

The bounded [ABBA seam comparison](seam-comparison.json) uses identical canonical
fixture data and the same 1440×900 browser/SDK/Three/host, three cannons/balls,
seven-second windows, no video. Baseline frame median is 150 ms; candidate median
83.3/83.4 ms. Candidate p95 varies 133.3–299.9 ms, baseline 183.4–366.7 ms.
Candidate render CPU p95 is 11.5–14.1 ms, shell/layout .8–.9 ms, status 4.3–6.2 ms;
JS heap 18.7–19.6 MB versus baseline 13.4–14.0 MB, excluding GPU/process memory.
Reduced-motion/card-closed diagnostics retain ~83 ms frame medians. The fixture
refreshes status per frame, more often than the production app's 100 ms cadence.
These probes do not establish a single causal product bottleneck or justify
removing the requested effects/UI. No rendering implementation was changed to
improve a benchmark. Prior software measurements remain preserved.

GPU is ANGLE/Vulkan SwiftShader (software), Chromium 153. Hardware smoothness,
physical-phone, native-keyboard, actual-wallet and maximum-population qualification
remain unavailable. Frame targets are not met. All six measurement rows and JSON
were written; the command session later reported teardown exit 143, retained as a
measurement limitation rather than a passing qualification gate.

## Source freeze, publication and CI

The ordinary HTTPS dry-run and actual authorized source push failed: Git could not obtain a username
with terminal prompting disabled. No credentials were read/exported or alternate
credential route attempted. The remote branch was refreshed and still points to
`2491d55f30125b421bedb7155db0fcac9bf0711f`; this is a direct remote observation,
not an assumption based on a local unpushed count.

| Frozen identity | Value |
| --- | --- |
| Normal runtime source | `3ec1cb5d40b3cde5a1014e79a590649f835b9df1` |
| JavaScript SHA-256 | `8ecd824ff2bc37bafcbfdbe524fd7393634d7a6d293ba255f3df076bedda4532` |
| Builder manifest SHA-256 | `36b6d2e2b91084c0360a2f6da9081a1b4cfb4ba19b5092286a21ba2d1b8e7b4b` |
| Complete 15-file manifest SHA-256 | `179c06783d3915ea917f9376ad6bda86c51038028d3c9b82ed98f27f7495d050` |
| Provenance | `source_dirty: false` |

[Complete files](frontend-files.json), [builder provenance](frontend-build-manifest.json)
and [frozen input identities](frozen-runtime-inputs.json) make this independently
checkable. The assets remain at `.work/review-closeout/frozen/frontend/`; none
were uploaded. Only `app.mjs` and `build-manifest.json` differ from the dirty review
bundle. The other 13 files, including HTML/CSS, configuration, backend binding and
CSP/security policy, are byte-identical. The dirty manifest remains historical.
The runtime was frozen once from the clean source commit. This later evidence/docs
commit changes no runtime, dependency, build or test input and does not rebuild it.

The workflow was inspected directly. [Candidate hosted status](hosted-ci.json):

| Required substantive gate | New candidate conclusion |
| --- | --- |
| Source conformance | Not created — source unpublished |
| Native conformance | Not created — source unpublished |
| Packaged DTR and clean consumers | Not created — source unpublished |
| Runtime-lab Wasm | Not created — source unpublished |
| Browser HTTP and Web Crypto | Not created — source unpublished |
| S14 and million-cell installed-IC qualification | Not created — source unpublished |

No new run URL exists. No required job is waived, skipped or called green from a
focused subset. “BLOCKED production inventory (not a pass)” remains informational.
Baseline run 42513865544 passes all six at the old head only; its success is not
candidate qualification. Publication of the evidence-only descendant triggers
exact-head CI with identical executable inputs to the frozen runtime source.

After checking that this is the intended branch, the ordinary non-force continuation
from this checkout is:

```sh
git push origin release/btz-prelaunch-playability
```

Then inspect the actual new `verification` run for the pushed head; all six
substantive jobs must pass before a separate production approval decision. Do not
publish a superseding evidence push while that run is active. No credential
export/setup workaround is requested. Production asset upload/rollback, backend
operations, settings/controllers and financial actions remain unauthorized here.

## Exact frozen-bundle read-only verification and preservation

[Read-only preview result](frozen-live.json) served the exact frozen JavaScript and
security headers locally, with genuine mainnet-root DTR/certificate/source checks.
At desktop, 390×844 and 320×640, native amount/recipient/memo/hex copies matched:
`0.1`, `s5ir5-gqaaa-aaaas-amyna-cai`, `FIRE 1 255 1` and
`464952452031203235352031`. These are observations of that verified quote, not
hard-coded prices. Wallet fee and retention risk remain separate.

Only optional `canister_status` fetches were deliberately failed in that preview.
The compact meter stayed Unavailable; authenticated observation refreshed 35
certificates, clock/queue identity survived and safe preparation remained enabled.
Presentation correctly waited when no verified coverage existed; it did not invent
motion. All IC POSTs were queries/read_state. No transfer was sent. An initial
preview assertion used an immediate clipboard/hidden-text read; the corrected
harness awaits native clipboard completion and reads full hex content. The initial
failure remains under `.work/review-closeout/frozen-live/`; product/security code
was not changed to accommodate that harness error.

The separate [anonymous real SDK status read](public-status-final.json) succeeds
with normal root/query signatures, confirming `status_visibility = public`. No
setting change is necessary or was made. [Fresh certified identities](production-readonly.json)
match the prior backend/frontend modules, controllers, European subnet and 13 nodes:

- Backend `s5ir5-gqaaa-aaaas-amyna-cai`, module
  `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend `s2jxj-liaaa-aaaas-amynq-cai`, module
  `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Default receiving AccountIdentifier remains
  `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.

No production module, paid state, financial journal, source cursor, setting,
controller or Ledger authority was modified by this work. Legitimate autonomous
processing continued; byte equality of a running world is not claimed. Backend
code, locks, DTR and build inputs are unchanged. No install/upgrade/reset/stop/start,
former-canister operation, canister creation, payment, cycle action, subscription
or paid agent activity was performed. Receipt association, real-wallet/human-research
and actual-device limitations remain as documented. The public site still serves
the preceding release; this candidate is not deployed.
