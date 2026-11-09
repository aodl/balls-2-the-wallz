# B2Z player-centred correction — local review

The corrected interface is implemented for local review. **Not committed or deployed.**
The initial checkout was clean at `2491d55f30125b421bedb7155db0fcac9bf0711f` on
`release/btz-prelaunch-playability`; the remote branch matched that revision.
There were no post-archive changes to revert. No unrelated work was changed.

The maintained [UX specification](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
supersedes the previous docked card, whole-diamond overview, removed minimap and
east-facing display-zero requirements. The [frontend maintenance guide](../../../docs/operations/B2Z_FRONTEND.md)
and [installed paid-game procedure](../../../docs/operations/S14_OPERATOR.md)
identify the single composer, observation lifecycle and frontend-only release boundary.

## Changes and regression evidence

| Requirement / demonstrated defect | Implementation | Evidence / UX contracts |
| --- | --- | --- |
| Zoom changed ownership; coarse Move blocks appeared legal | `terrain-surface.mjs` derives one persistent exact ownership/boundary raster from compact verified row runs; `render.mjs` uses it at every zoom. Fine grid fades independently; previews are unit cells. GPU and minimap share dirty bands. | Actual bound-texture path across 2.99/3.01/9.99/10.01, islands/corridor/hole/enemies/seams; `player-terrain.test.mjs`; UX-05/12. |
| Centred overview broke wrap and exposed repeats on pan | `camera.mjs` uses the tight projection-specific period limit with a numerical margin. No centred-copy exception. Resize, restore, Home and all zoom inputs share `constrain()`. Bounded boards retain their old semantics. | `player-camera.test.mjs`: four reference viewports, overlap below the limit, no overlap at it, seam/corner copies and exact footprint area; UX-12. |
| Missing overview/navigation | `minimap.mjs` restores a permanent bottom-right canonical map, same exact territory cache, clipped inverse-projected quadrilateral footprint and own/selected markers. Click/drag/arrows change only camera. | Populated browser navigation and unchanged clock/queue; UX-01/04/11/12. |
| Display headings and dragging were unintuitive | `headings.mjs` supplies one projection conversion. Screen 0/45 map to world 225/255; memo stays canonical. `shell.mjs` captures aim/pan/pinch ownership at pointer-down. Guide uses final encoded u16 heading. | Heading cardinal/intermediate/quantization units; actual handle drag, numeric, keyboard, touch/pinch/cancel browser journeys; UX-04/08/11/12. |
| Hidden invalid Fire heading blocked Move | `arcade.mjs` validates only action-relevant inputs. | Clear heading, switch to legal Move and obtain exact `MOVE` bytes; UX-02/08/10. |
| Build guide stayed on old cannon; unchosen site silently meant automatic | Additional Build requires an eligible selected site. Ghost, guide and card use that site, including seams. First Join alone remains automatic. Canonical quote filtering covers all owned anchors and is cached until relevant world/config/account/revision changes. | Chosen seam site 997; actual ghost/guide matrix origins; initial unchosen packet disabled; later canonical occupied site remains selected/unavailable, never silently retargeted; UX-02/08/10/12. |
| Opaque dock detached actions from cannon | One compact nonmodal contextual card flips/clamps around the visible wrapped cannon/site. Offscreen anchors offer Locate. Global Account/Help/history/status reuse the surface. Island pools say “Island balls”. | Desktop/narrow card/cannon/map exclusion, focus/caret, keyboard viewport contraction, Locate and same clock/queue; UX-02/03/04/11. |
| Balls inherited owner colour; stationary rendering looked active | White unlit/tone-mapping-independent core, shared soft glow, minimum apparent marker. Short tapered white tails derive only from displayed displacement and expire; seam-safe effects reset on discontinuities/context restoration. | Motion unit tests and actual renderer expiry after a long frame gap; reduced motion; UX-05/11/12. |
| Waiting was inconspicuous / ambiguous | Existing status resolver drives the central white spinner and exact “Rendering on-chain activity ...” after 500 ms genuine waiting. No backdrop/input interception or second clock. Other failure/idle/pause states retain their explanations. | Status truth table, slow one-interval/start/wait/resume and error precedence browser assertions; UX-04/05/06/11. |
| Cycles meter absent / obsolete health await | `public-cycles.mjs` independently queries management `aaaaa-aa` with the backend effective target using SDK 6.1.0. Bounded BigInt samples display approximate net decline; idle baseline is separate. `mainnet.mjs` no longer awaits unused `runtime_health`. Backend method remains. | Actual SDK Candid/routing tests, sampler/fencing/error isolation, anonymous mainnet query and local candidate preview; UX-06/10/13. |
| Payment/security preservation | Existing principal/default-account binding, exact quote/memo/amount/payer, frozen packet and Update/Keep previous, denied/manual copy, backend/account-scoped history and certificate checks retained. Retention warning precedes the first copy field. | Existing full wallet/certificate/quote/authority tests plus new screen-angle journeys; UX-07/08/09/10/13. |

No rendering framework, backend method, custom metrics service or UI state framework
was added. Three.js and SDK remain pinned/local. No protocol, prices, placement,
capacity, physics, receipts, persistence, treasury policy, replay or DTR changes.

## Executed qualification

- **PASS — 31 focused units:** `node --test tests/js/player-camera.test.mjs tests/js/player-headings.test.mjs tests/js/player-motion.test.mjs tests/js/player-terrain.test.mjs tests/js/public-cycles.test.mjs`.
- **PASS — complete populated browser journeys:** `LD_LIBRARY_PATH=/home/codexdev/.cache/browser-libs/root/usr/lib/x86_64-linux-gnu .work/browser-venv/bin/python -B tools/verify_playability_actions.py --no-video --output .work/player-centred/browser-final07`. All three sizes, actual clipboard/manual/replacement, touch/pinch/cancel, focus/keyboard viewport, reduced motion, exact renderer ownership, context restoration, slow wait/resume and same clock/queue. [Executed result](browser-journeys.json).
- **PASS — stored world-angle compatibility:** `.work/player-centred/saved-heading.py` calls maintained `verify_saved_world_heading()`: saved `FIRE 1 37.5 1` restores screen 167.15°, identical text/hex bytes and an explicit historical warning after reload. This assertion is also added to the maintained browser CLI. [Result](saved-heading.json).
- **PASS — 12 HTTP checks:** `LD_LIBRARY_PATH=/home/codexdev/.cache/browser-libs/root/usr/lib/x86_64-linux-gnu .work/browser-venv/bin/python -B tools/verify_observer_http.py --output .work/player-centred/http-final`. Actual browser sandbox/Web Crypto/CSP, verified coverage, generation fencing, same clock/queue, context restoration, reduced motion and fail-closed corruption. This offline-content HTTP mode is not IC certificate evidence. [Result](http-webcrypto.json).
- **PASS — normal frontend build and all 15 files verified:** `node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/player-centred/review-ready/frontend`; each builder-listed digest and the complete external manifest were checked.
- **PASS — read-only genuine IC-root preview:** `.work/player-centred/read-only-preview-final.py` served locally built JS with the candidate CSP and existing mainnet source. No insecure browser flags/root fallback. Canonical Fire draft, recipient/risk, independent public status and continued verified playhead/queue passed; all IC POSTs were query/read_state only. End status Slow, 74 accepted certificate observations, no resync, reported Cycles 2.66T / Est. burn Collecting. [Proof/source/result](live-readonly-preview.json).
- **PASS — 421 applicable frontend/protocol/quote/observer units, zero skips:** `node --test --test-concurrency=1` over the exact file list in [frontend conformance](frontend-conformance.json). This includes all `observer-*`, `player-*`, `ux-*`, live delivery, camera, identity, memo/payment, canonical quotes/prices/purchases and public cycles. Duration 205.7 seconds on this host.
- **PASS — 196 Python tool tests:** `python3.11 -B -m unittest discover -s tools -p 'test_*.py' -v` (34.4 seconds). Initial-payment disabling is checked semantically, independently of HTML attribute order, including its warning description.
- **PASS — 23 torus tests:** `node --test tests/js/b2z-torus.test.mjs`, including canonical interrupted replay, migration/financial preservation and the new exact minimap polygon assertion. Floating clipping coordinates allow only 1e-9 numerical tolerance.
- **FAIL — broad repository source wrapper:** `python3.11 -B tools/check.py source --output .work/player-centred/source-final`. Its 300-second Node allowance expired inside unchanged `rules-v6.test.mjs`. The original run also caught the now-fixed naming-doc, removed-minimap-API and HTML-attribute-order assertions. Naming and Python reruns pass; the applicable 421-test frontend gate above passes. The original FAIL remains in [source conformance](source-conformance.json).
- **FAIL — extended broad Node attempt:** `timeout --kill-after=5s 600s node --test --test-concurrency=1 tests/js/*.test.mjs` also expired at the unchanged every-work-boundary rules fixture (exit 124). It additionally reported an assertion in untouched `b2z-forecast-cost.test.mjs` (“cache bypass…”). That same unmodified file passes both tests standalone. Its 2-second work budget suggests timing sensitivity; the interrupted attempt does not establish the exact cause. No agent limits, rules tests, certificate deadlines or assertions were weakened. There is **no full repository-wide green claim**; this remains a qualification limitation for an eventual release.

The HTTP/security harness exercises the same maintained modules in its offline
bundle; it is not the frozen mainnet bundle. The IC preview uses the exact final
JavaScript bytes recorded below. The last HTML/CSS-only adjustment removed the overlapping sticky warning and added
its accessibility description; the final populated browser run covers that layout.
Authentication, quote and dependency inputs did not change; identical JavaScript bytes let us reuse those security/IC-preview results.
The dedicated [final player controls](player-controls.json) additionally record
actual GPU pixel readback after ownership changed during context loss.

The final bundle is a **dirty local review build**, not a qualified new commit:

| Identity | SHA-256 / revision |
| --- | --- |
| Baseline source | `2491d55f30125b421bedb7155db0fcac9bf0711f` |
| Final JavaScript | `2d9ea9db4144b2a4659fce89a2dd18f4468a8a9220b84cf603ea64b6f7a759d6` |
| Builder manifest | `661755e927cbe7a0996815ad7bc8b6aa1eeaa580b58fafc6c97fdf2fdb7e382f` |
| Complete 15-file manifest | `be6eae07e3a5cf47332bbe57b5abc6f279691923a08e6ff5934486a9def4f8e7` |

[Complete files](frontend-files.json), [builder provenance](frontend-build-manifest.json),
[artifact verification](artifact-check.json) and [changed working-input hashes](working-inputs.json) identify the candidate.
The builder honestly records `source_dirty: true`. There is no new source commit,
hosted CI claim or served-file verification for this uncommitted candidate.
No backend Rust/Wasm/S14 installed-IC suite was rerun: executable backend/protocol
code and pinned dependencies are unchanged. Existing backend qualification remains
historical evidence, not qualification for changed frontend bytes.

Raw attempts are retained under `.work/player-centred/`. Earlier shader, fade-cache
and keyboard-layout regressions were fixed and rerun. The first broad JS attempt
was interrupted during implementation and is explicitly not qualification. An
initial offline-only preview CSP blocked mainnet access; using the actual candidate
CSP corrected the test setup without relaxing policy. The first source pass found
an ordinary branding-doc reference and an obsolete minimap rectangle test; their
focused corrections retain the historical branch name and strengthen polygon-area
coverage. A first extra performance setup had no visible entities and is excluded
from populated claims. It was corrected to show all six entities. Failures/setup
limits are not relabelled as passes.

## Measured rendering cost

Chromium 153.0.8010.12 / Playwright 1.63.0, headless sandbox enabled, software
ANGLE/Vulkan SwiftShader, seven-second steady windows, no video encoding:

| CSS viewport / workload | Frame p50 / p95 ms | Draw CPU p95 ms | JS heap MB | Entities / ground copies |
| --- | --- | --- | --- | --- |
| 1440×900, canonical one cannon/ball | 83.3 / 116.6 | 6.5 | 15.96 | 2 / 1 |
| 390×844, same | 33.3 / 83.4 | 8.5 | 17.21 | 2 / 1 |
| 320×640, same | 16.7 / 33.4 | 5.0 | 17.05 | 2 / 1 |
| 1440×900, three cannons/balls near seam | 100 / 316.6 | 18.3 | 18.32 | 6 / 2 |
| 1440×900, cached fragmented terrain only | 16.7 / 16.7 | 0.4 | 17.66 | 0 / 1 |

[Measured inputs/results](performance.json). One-ball software frames improve on
the preceding release's measurements; CPU cost is similar with the added features.
The populated seam result still misses hardware frame targets. **No smooth-hardware,
phone or maximum-population qualification.** Heap excludes GPU/process resources.
The new persistent 4 MB atlas, 1000² overview backing and texture are bounded,
shared resources; a single capture dirties at most three rows / 12 KB and allocates
no replacement million-cell raster. No per-ball lights/full-screen bloom.
Automation click-to-visible measurements include Playwright stability scheduling
and software rendering (roughly 0.09–1.95 s small scenes; 1.38–1.70 s six-entity),
not isolated handler latency. These measurements do not establish hardware touch
responsiveness or production delivery timing. The slow journey uses 20× accelerated
disposable wall time at the real Trickle policy, separately from the IC preview.

## Read-only operational verification

At 21:10 UTC on 8 November 2026, certificate-verified metadata identified **both**
existing canisters on subnet `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`,
with 13 members. Local mappings remain:

- Backend `b2z`: `s5ir5-gqaaa-aaaas-amyna-cai`.
- Frontend `observer`: `s2jxj-liaaa-aaaas-amynq-cai`.
- Live site: https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/ (preceding release).
- Backend module: `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend asset-canister module: `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Controllers preserved: `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`
  and `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`.

The verified backend/default receiving binding remains principal
`s5ir5-gqaaa-aaaas-amyna-cai` → AccountIdentifier
`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
Read-only metadata/status/observation queries cannot prove byte equality of a running
paid world over time; legitimate autonomous progression continues. No update/install,
activation, pause/reset, controller or financial operation was performed.

### Public status and estimate semantics

Controller query and anonymous SDK queries verified `status_visibility = public`.
**No live setting change is needed or was made.** Existing log/snapshot visibility
was not changed. [Policy](../../../config/europe-public-status.json) and the narrow
[query Candid](../../../config/europe-public-status.did) preserve the expectation.
The public query used management `aaaaa-aa`, argument/effective route backend,
normal mainnet root and query-signature policy. No invented game method/proxy.

Three anonymous samples, 60 seconds apart, measured:

| UTC, 8 November 2026 | Reported cycles | Reserved | Execution version |
| --- | ---: | ---: | ---: |
| 20:53:39.584 | 2,721,471,169,420 | 0 | 18,697 |
| 20:54:40.053 | 2,720,541,251,909 | 0 | 18,720 |
| 20:55:40.861 | 2,719,782,480,865 | 0 | 18,744 |

The 121.277-second window yielded approximately **50.13B cycles/hour net decline**.
Reported idle memory/compute baseline was **1.876B cycles/day**, separately labelled.
This is active existing-game operational sampling, not an empty-world measurement,
exact gross execution cost, lifetime estimate or demonstrated hardware/subnet saving.
Credits/refunds/reservation movements can obscure gross costs, including a credit
hidden inside a net decline. Public `cycles` is not an SDK liquid-balance reading;
reserved cycles are separate and never subtracted twice.

A normal execution increments the IC version counter; ordinary monotonic increments
with unchanged module do not reset sampling. Module/source/reserve changes, version
regression, balance increases and invalid/old/gapped timing are fenced. The window
requires 120 seconds, retains at most 12 samples/10 minutes, rejects gaps over
150 seconds, pauses/resets across visibility changes, and queries at 60 seconds
with bounded backoff and one in flight. Optional telemetry cannot block gameplay.

Primary sources: [management interface/status query](https://docs.internetcomputer.org/references/ic-interface-spec/management-canister/),
[balances and routing](https://docs.internetcomputer.org/references/ic-interface-spec/abstract-behavior/),
[status setting](https://docs.internetcomputer.org/guides/canister-management/settings/),
[execution version](https://docs.internetcomputer.org/references/ic-interface-spec/canister-interface/).
Public status does not grant public access to controller/subnet-only canister metrics.

## Limits and continuation

This is source/build/browser evidence, **not deployed behaviour**. Physical phones,
native OS software keyboards, actual wallet recipient/memo entry and real transfers
were not tested. Browser mobile viewports/touch emulation and text-size emulation
are labelled accordingly. The headless zoom shortcut did not change DPR; 150% root-text emulation is not native browser-zoom qualification. No new human research or maximum-population qualification.
Current receipts still cannot reliably associate a saved instruction with a receipt;
no reporting workflow, heuristic matching or resend suggestion was introduced.
Trickle's genuine production cadence remains; the spinner does not invent coverage.

Before publication, review/approve the uncommitted change; separately authorize
commit/non-force remote publication and the frontend-only release. Freeze a clean
approved source through the existing builder, obtain applicable exact-source CI,
then follow the observer-only procedure for `s2jxj-liaaa-aaaas-amynq-cai`, verifying
all files/security headers and backend preservation. Do not deploy/rebuild/upgrade
the backend as a side effect. Prior qualified assets/manifests in the existing
minimal-isometric release remain untouched as rollback evidence; restoring assets
also requires release authority. No rollback/reset operation was performed.
