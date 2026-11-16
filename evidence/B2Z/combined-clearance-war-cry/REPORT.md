# Combined clearance and War Cry — qualification closeout

**Production frontend79 is installed; combined Rules11 remains undeployed.**
The approved panel deployment and live acceptance are recorded separately in
[the deployment report](../approved-action-panel-war-cry/deployment/REPORT.md).
Development is isolated on `feature/b2z-combined-clearance-war-cry`, starting from
published deployment-evidence commit `6afe3b2fc2426887f905259312f5c090ed7dc7ab`.
Final exact-source hosted qualification is pending; no earlier separately green
Rules9/Rules10 run qualifies this composition.
The final test continuation at `b1d7fe81670962b410966a2786301b1c55d52c31`
passed five gates but failed the installed paused-Copy assertion; its negative
evidence and the explicit observed-pause correction are recorded below.

## Identities and separation

| Policy | Rules SHA-256 | Configuration SHA-256 |
| --- | --- | --- |
| Production Rules7 | `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f` | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` |
| Historical clearance Rules9 | `cfb882f7fb231214bac3df61e34a66ceb8c71e1216caabee899495c0910b2b70` | `0567d064106d26a14791f9d07bd64a2e4f87b26789dbef7167b2ee7e96114153` |
| Historical War Cry Rules10 | `5f53d5ea243b2dc8806f96bff9deab5a795702f2ff4e16f45475320b7be40120` | `26320f99c33d235931a807b010cb9c7c9550351cef60648993a396a9437e715a` |
| Combined Rules11 | `5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756` | `b2fcfaabecc226e4b99e1660b2341690e4ffb0eace29e152e26bc37d71f9e5df` |

World schema6 is unchanged:
`b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
The new allocation was checked against maintained identities and remote branches;
Rules8 delegated payments remain separate and disabled. Adapter6/BTZPAY03 and its
strict32-byte UTF-8 grammar are reused without changing historical adapters.

The selected future **normal hosted Wasm**,3,659,359bytes, is
`5ffb6cc2c1cd377ef36a847df309fc21ead8e4b66d97d49200ca00d80b3e8a43`.
It is retained at `.work/combined-clearance-war-cry/frozen/backend/runtime-lab.wasm`,
recovered from hosted run43843201572/source89bfdd6b6500a57cdbb827aa9cb9a8351547d995,
artifact14213678913. Archive SHA-256:
`150ffa39d7875366b509811c95851beeab3079ff43a861ccede09ca8621fdd38`.
Normal exports exclude test hooks. Backend consumed-input parity remains exact.
The fully qualified686b2d9 build from artifact14222258758 was independently
downloaded and compared byte-for-byte with the frozen file: identical5ffb6c… .
[The reproduction attestation](results/checks/qualified-hosted-wasm-43859604893.json)
retains its archive digest; the original freeze is not replaced or relabelled.
The separately retained local Wasm23c3586fc18aa11294f789d03fcf9cb8b1cb9827d3f94b7f179a5ef37f55d43e
is not interchangeable: both contain17 checkout-path strings from different build
environments, but complete byte equality is neither asserted nor established.

The compatible **frontend80** freeze is from clean source
`fc317d188ba6b503c81f9767da0358b89c60868f`:

- JavaScript `bc2872444e4574ae818983e2d7ede46f7ff0c4c2d71b198b9b821c344636321c`.
- Complete inventory `e8a9303538dbb2cc5028b21cf5ae97caacdb9c438497a35a567e30a9071a0c67`.
-79 public files plus consumed upload policy;76,341,055 total asset bytes.
- Audio manifest `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c`;
  all61 audio files byte-identical to production79.

Only app.mjs, backend.did, build-manifest.json and new configuration-combined.bin
change versus approved79. No audio, HTML/CSS, camera, quantity dock, economics,
lockfile/dependency or gameplay-physics change is introduced. Full offline byte
reproduction and consumed-input checks pass. [The complete inventory and build
provenance](artifacts/provenance.json) name every input. Neither frontend80 nor
combined backend has been installed on production; `.work/s14/assets` retains79.

## Implementation

`config/rules/v11-combined.json` formally pins both policies. Generated JS/native
identities and configuration bytes feed the existing single v6 purchase interpreter.
Move and explicit/implicit additional New use the processing-time7×7 toroidal
Chebyshev check; distance0–3 from a different non-neutral canonical player rejects,
distance4 is eligible subject to every other rule. Island labels resolve to players;
friendly separate islands, neutral cells and unclaimed balls are not enemies.
Dormant enemy territory remains enemy. First Join's existing entry/spawn contract,
Fire/Revive, prices, receipts and retained-payment semantics remain intact.

The unchanged adapter6 decoder authenticates complete raw input and optional text.
Cosmetic text is excluded from the gameplay seed for the entire batch, preserving
site/trajectory results across different words. An annotation accompanies only the
first actual successful launch; zero/rejected purchases do not speak or leak words
to later payments. Pending annotations survive durable cursor restore.

The existing observer validates exact supporting identity, successful receipt,
Ledger position, funding account and actual launch. It retains pointer-transparent
safe text, one bubble per cannon,55-second display/five-second fade, hidden aging,
once-only event keys and epoch/source fencing. No new polling, speech timer,
audio work, HTML execution, signing or payment submission is introduced.

The compatible frontend recognises the full certified Rules11 tuple, uses both
capabilities together, preserves Rules7/9/10 history and rejects a stale Rules7
copied packet even when bare Fire amount/memo happen to match. There is no local
activation flag. Under production Rules7, War Cry remains unavailable and the
clearance policy is not advertised as active.

## Deterministic and financial evidence

The additive50-vector fixture binds original Rules9 and Rules10 fixture hashes;
none of their historical outputs were rewritten. JS/native compare complete exact
normalized input, state, events, scores and hashes, including every-work-unit cursor
recovery with pending words. The native50-row run passes in938.34s wall on this
contended host; unchanged Rules9 and both historical War Cry native cases also pass.

Coverage includes distances0–5, cardinal/diagonal/seam/corner placement, friendly
islands, neutral/dormant/multiple enemies, explicit/implicit New, no safe sites,
Move, first Join, Fire/Revive, full/partial/zero fulfilment, processing-order territory
changes, identical text at distinct positions, cosmetic-seed independence, rejected
text leakage, Unicode/BOM/graphemes, invalid separators/controls and memo limits.

The exact hosted5ffb6c…/paid European612ad0… **disposable launch rehearsal passes**.
Synthetic setup is labelled; all subsequent transfers use the pinned official
valueless ICP Ledger/Index and normal modules. The actual old normalized input at
Ledger position2 is admitted before module upgrade, survives its durable inbox and
remains MALFORMED_MEMO under Rules7. It is never reinterpreted after activation.
World/publication/source/financial bytes remain equal through module upgrade and
the direct Rules7→11 epoch. Prepared transition, admitted annotated input and real
unpublished running execution survive normal-module upgrades without duplication.
Native vectors independently exercise the exact pending-cry recovery unit.

| Actual disposable payment | Outcome |
| --- | --- |
|3: `FIRE 1 0 1\|é😀`,10,000,000e8s | Revive/one successful launch, exact words |
|4: `NEW 0 1 452578\|Unsafe!`,400,000,000e8s | ENEMY_TERRITORY_TOO_CLOSE, amount_used0, no annotation |
|5: `FIRE 1 0 64\|Charge!`,10,000,000e8s | Partial fulfilment, one ball and one annotation |
|6: zero-funded Fire | UNDERFUNDED, no annotation |
|7/8: separate `Twin` payments | Two distinct position-bound annotations |
|9: extra separator | MALFORMED_MEMO, no annotation |
|10: valid32-byte zero-funded command | Processed/rejected by funding, no annotation |
|11: new account `NEW 0 1\|Hello!` | First Join remains permitted |
|12: BOM-containing cry | Accepted exact bytes, no normalization |
|13: safe explicit additional `NEW…\|Build!` | Successful Build/launch, one annotation |

The official Ledger independently rejects33-byte memos and accepts32. Twelve
Ledger inputs retire exactly once;7 annotations occur. No refunds/internal credits
are created; rejected actions retain normal remainder/accounting semantics.

Actual BLS root/canister/freshness and signed query transport authenticate15
publications (13 gameplay,2 checkpoints). A separate replay reconstructs full
canonical publication bytes and state/events/scores hashes. Six deliberate negative
captures reject changed normalized cry, incomplete events, altered launch text,
wrong source, wrong canister and damaged certificate. Incomplete evidence is never
admitted. The disposable source identity/root key are not production identities.

## Actual native-browser evidence

Two ordinary Chromium observers independently authenticate and display the same
`Build!` launch for cannon4 and the same event key. Real5/35-second tab switches,
hidden aging, fade and expiry pass; native expiry was60,324ms, and repeated rendering
does not restart it. BDI text and pointer-events:none are measured. Captured WebM is
visual interaction evidence, not a physical listening test.

Complete combined fixture journeys pass at1440×900,390×844 and320×640, including
native IME/clipboard/denied fallback, Update/Keep, heading sweep, original347.15°
quantity pose, dock, DPR, visual viewport and240/180px contractions. They remain
separate from authenticated installed observations and actual production acceptance.
The first desktop journey failed the unchanged8-second settled-panel assertion;
matched Rules10 and complete instrumented Rules11 reruns pass. The initial cause is
unproven; no panel assertion/timing was relaxed or runtime geometry redesigned.

## Capture failure and correction

The original exact-host clearance rehearsal failed448.83s into capture with
`publication unavailable: snapshot resync required`. Its diagnostic repeat fails
at publication146, artifact2/chunk0, after146 complete rows; its observed head was
already152. Browser captured catalogs reach160 and upstream queries continue for
later publications. The backend's unchanged16-publication window evicts a row
between the collector's separate artifact requests as the live disposable game advances.
The backtrace identifies live_record while waiting for the actual Join receipt,
not a successful verifier admission or a fabricated payment.

The live test collector now uses the existing atomic artifact_bundle for complete
publications<=1MiB. It checks artifact count, lengths, whole hashes, chunk count
and every chunk hash, then advances the consecutive row list. Larger publications
retain strict chunk capture. Missing history, transport errors or malformed bodies
still fail; there is no snapshot substitution, skipped row, timeout increase or
suppression. New explicit negatives reject a missing artifact, truncation, changed
bytes and damaged chunk descriptor. Browser wire capture, DTR replay and certificate
negatives are unchanged. This changes test instrumentation, not normal Wasm or UI.

## Preserved failures and exact-source checks

- Baseline composition negative: Rules10 alone accepts unsafe annotated New;
  Rules9 alone rejects the new envelope. Neither is the combined policy.
- Profiling exposed Buffer.slice sharing authenticated input storage in JS seed
  projection. The failing regression observes PAY03 magic mutation; a bounded
  Uint8Array copy fixes it without changing normal Uint8Array outputs or Rust.
  Frontend input provenance was re-frozen; original negative is retained.
- New vector harness180s deadline initially failed; identical complete execution
  measured231.988s wall/39.961s user CPU. Its scoped new allocation is300s with the
  unchanged500,000-work cap. No product deadline or existing assertion changed.
- Two unchanged forecast2s cases failed the first full source run. Focused current
  tests pass; an independently archived approved6afe baseline reproduces the hard
  timeout. No deadline/assertion was changed. Final full source passes **1969 Node
  and202 Python** tests; earlier failures remain historical evidence.
- The first installed fixture exhausted its fixed disposable payer balance using
  an extra1b rejection transfer. Exact canonical400m price corrects the fixture;
  no balance, price or production funding change. Full Ledger error decoding now
  reports failures accurately rather than accepting them.
- Resolving the virtualenv interpreter symlink lost Playwright. The runner now
  preserves its path and checks import before replica startup.
- Test HTTP server omitted configuration-combined.bin, yielding404. The failing
  route regression and both hosted server logs establish the cause. Only that
  approved filename is added; all21 server/security/unknown-file tests pass.
- One early diagnostic referenced a freeze being replaced local23→hosted5ffb.
  It is excluded from exact-artifact qualification. The runner now copies and pins
  a per-run immutable normal Wasm and records its hash at start/end.
- The new packet test initially expected enabled Copy while its controller was
  deliberately paused. It now requires both stale Keep and updated local proposal
  to remain protected, without overriding actual readiness.

Bootstrap hosted run[43843201572](https://github.com/aodl/balls-2-the-wallz/actions/runs/43843201572)
for source89bfdd6b6500a57cdbb827aa9cb9a8351547d995: Source/Native/Packaged DTR/
Browser **PASS**; Wasm **FAIL** (strict local-versus-hosted frozen hash); Installed
**FAIL** (both new native browser scenarios fail closed on the omitted config route).
Compilation/Candid/fmt/clippy passed. The informational inventory guard is excluded.
The exact hosted artifact is selected above; this failed run is not relabelled green.

## Resource observations and limitations

The49-cell authoritative check is purchase-time work; no recurring query, gameplay
timer or per-frame million-cell scan is added. Frontend cached destination discovery,
bounded cues/overlays and existing audio budgets remain unchanged.

Isolated actual JS purchase/normalization measurements use128 interleaved A/B and
A/A blocks×32 warmed operations, with unchanged-world assertions. Median incremental
Move2.83µs, safe additional New15.84µs, unsafe New12.56µs and Fire0.028µs are
block-averaged shared-host observations, not target-hardware guarantees. p95/p99
are noisy and A/A has comparable tails; the complete raw distributions are retained.

Actual installed launch rehearsal total23,239,644,535 cycles includes deliberate
upgrades and mandatory game/controller work. Per-purchase windows are244.6–661.7M
cycles and253–708ms wall; **the first is only a resumed execution window after the
intentional interruption**, not the complete purchase cost. These are not isolated
annotation/clearance increments or production-subnet quotes. No extra production
cost, balance, runway or required funding amount is invented.

P09 remains **FAIL/unqualified**, accepted only for the existing controlled audio
trial. Physical phones, representative dense hardware, Firefox/Safari/iOS audible
output, headphones/Bluetooth, subjective listening and previously blocked BFCache
are not qualified by these Chromium/software captures. Actual production War Cry
payments/bubbles cannot be tested while Rules7 is active and remain unperformed.

## Production boundaries and release decisions

Only Workstream A's explicit observer-assets deployment occurred. Production
backend module612ad0…, Rules7/configuration/source, controllers/settings and
financial authority remain unchanged. No backend install/prepare/commit/resume,
funding, ICP payment/allowance, cycles transfer, Rules9/10/11 or ICRC-2 activation
occurred. The actual production report distinguishes source fixtures, disposable
certified browsers, live mainnet observations and unverified physical devices.

[RELEASE_DECISIONS.md](RELEASE_DECISIONS.md) provides four separate future owner
decisions: compatible frontend80; exact normal backend upgrade; resource-safe
prepare/drain/exact-manifest epoch; verified resume. Preparation itself can persist
a Root field old strict decoders reject. After the epoch, Rules7-only rollback is
unsafe. Recovery must be a compatible state-preserving forward module; never reset,
reverse an epoch, restore an old world, reset cursors, reindex or manufacture refunds.

## Completed exact-predecessor closeout

The selected positive clearance rehearsal is
[the authenticated run](results/hosted-clearance/run.json), source
`50d4b2963c515d97f63f25d5add90c451e53d5d6` (the full executed ref is recorded in that JSON), **PASS301.31s**.
It starts on the exact European612ad0… normal module, commits the established
Rules7 setup while paused, processes a real bare Fire under that old module,
interrupts actual execution, and upgrades to the exact hosted5ffb6c… module
**before starting the native observer**. Complete world, publication, source cursor
and paid accounting are equal before/after. This is a direct Rules7→combined
activation; the historical Rules6→7 setup is not an intermediate production plan.
The separate normal-module journey retains its actual native Rules6→7 coverage.

The browser then verifies Rules7→11 on the same page: an actually copied
`FIRE 2 0 1`/0.4ICP packet becomes stale; Keep stays disabled, explicit Update
produces `FIRE 2 0 2|Combined!`, and Copy correctly remains unavailable during
the real controller pause. Both no-safe-destination controls disable under the
authenticated Rules11 tuple. Its complete native wire capture passes with180
responses, zero errors and no pending bodies at fence120. No wire-capture
assertion, finalisation rule, frontend deadline or negative test is relaxed.

Actual new-rule payments5/6 (`MOVE` and `NEW…|Unsafe!`) both reject with
ENEMY_TERRITORY_TOO_CLOSE, amount_used0 and retained full remainder; neither
emits an annotation, allocates a cannon/ball ID or relocates a cannon. Pre-cutover
Move4 executes under Rules7 and is not retrospectively rejected.

Those final receipts occur after the native browser fence. The focused
`verify_combined_installed_history.mjs` independently captures their final
observation and complete artifacts over **actual signed-query loopback HTTP**,
with a10-second per-request bound. Pinned BLS/root/canister/freshness verification
anchors the entire recorded predecessor/artifact chain through head121. All122
publications (120 gameplay/two checkpoints) and all five paid inputs replay
exactly. Seven complete final HTTP packets total60,885bytes;3,934,432 recorded
artifact bytes verify. Seven negatives reject changed normalized cry, missing
publication, forged receipt, truncated artifact, wrong source, wrong canister and
damaged certificate. [Full authenticated results](results/hosted-clearance/authenticated/result.json)
and [receipts](results/hosted-clearance/clearance-receipts.json) are retained.
This supplements the strict browser wire capture; it does not repair or accept an
incomplete browser response.

Its full setup/upgrade/physics/HTTP window costs39,845,621,045 cycles; the two
rejection processing window costs521,087,624 cycles. Neither is an isolated
clearance cost or production-subnet quote. The earlier269.31s positive run is
retained locally; its legacy result predecessor field reflected a helper argument,
not the actual installed module. The explicit management-module assertion and
european-upgrade.json proved612ad0…; the final reporting-only correction now
records the actual predecessor directly. No old raw record was rewritten.

## Retained interruption and setup failures

The first atomic collector repeat retained the full history but missed Join's
bounded receipt: real payment3 applied in publication107 while the unheld
one-second fixture advanced to192. The browser was resynchronising and did not
observe that receipt. Financial setup now holds the **actual paid publication**
until the native receipt/entities are authenticated, then resumes before old-packet
copy/cutover. This follows the existing financial-harness contract and is not a
throughput or production-latency pass; deadlines and assertions are unchanged.

The coordinated mixed module/browser experiments passed their native Rules7→11
assertions but **failed** strict finalisation on three net::ERR_ABORTED requests.
The measured old/new module installs took6,653/6,924ms. Precise per-request/upstream
correlation remains incomplete; they are not declared environmental, repaired, or
qualified. Their original packets, timings, errors and failed conclusions remain
in results/failures. An earlier repeat also correctly failed closed when the
fixture resumed immediately after its Rules6→7 epoch and the required predecessor
was evicted before the browser verified it. Setup now follows commit-paused →
authenticate → resume. A wrong helper initially decoded the entry status as an
unwrapped record; using the existing wrapped-status helper corrects that test-only
38.87s failure. The original mixed interruption test remains available; no coverage
or strict assertion was removed.

The positive ordered rehearsal tests the proposed owner-only maintenance sequence
and supplies complete cryptographic evidence. It does not qualify the failed
mixed interruption interval. Future module maintenance should close owner game
tabs, upgrade while paused, then reopen the qualified80-file frontend and verify
Rules7 before preparing/committing the new epoch. A tab missing an evicted epoch
may fail closed; this work does not weaken trust or invent a historical bridge.
See the separate release decisions for this limitation and the recovery boundary.

## Exact frozen frontend80 against the actual European backend

The **undeployed** frozen80 assets were served locally with their unchanged
approved policy, rehashed first, and used ordinary mouse/keyboard/emulated-touch
against the real mainnet backend. All POSTs were query/read_state; no status/world
override, payment or installation occurred. All three views320×640,390×844 and
1440×900 pass returning-owner navigation without NEW, hidden War Cry/bare Rules7
memos, native quantity edits and coherent Keep/Update. The original320/cell0/
347.15° pose uses camera[3.6575453715563526,3.6575453715563526,64] and retains
a usable130×46 editor. First verified worlds appeared in2.647/2.421/2.440s; this
is not a controlled performance comparison.

Real recipient/amount/memo API writes pass at320 and1440. The first390 check
correctly disables copying when its actual canPrepare becomes false; a separate
ready390 journey then passes all three exact writes without an override. Native
input videos/screenshots and [four independent canonical quote/memo checks](results/checks/frozen-mainnet-quote-verification.json)
are retained. These are mainnet-backed local frozen-byte observations, **not a
production80 deployment**, physical-phone acceptance or new listening evidence.

## Fresh production preservation

At2026-11-16T12:34:33.472Z the actual deployed79-file site is still authenticated
Rules7, head9778, source54d927…, backend module612ad0… and unchanged asset module/
controllers/subnet. All78 signed inventory entries match approved79. Fresh HTML,
JavaScriptC37 and audio-manifest76ed bodies/security headers and full IC-v2
path/body/header/BLS proofs pass. This preservation sample supplements Workstream A's
original **all78-body** verification; it is not described as refetching every
media body again. The actual site renders verified state with no browser errors.

Read-only operating status is running/Trickle, nominal/support10 milliticks/s,
admission open, source binding checked, no source/run error, zero pending source
records, admitted_to_exclusive40180669. Reported public cycle balance is
2,404,531,536,354 with reserved0; the sampler has no rate/runway estimate. Liquid
balance and treasury/pending-funding details are not established by this capture.
No balance, required funding amount or re-entry override is invented. Autonomous
heads and resource use continue normally; no paid backend/financial/settings
operation occurred.

## Hosted qualification and final continuation

All **six substantive gates PASS** in
[43859604893](https://github.com/aodl/balls-2-the-wallz/actions/runs/43859604893)
for exact published source686b2d94225c0e719efc72d450189565d2b37149:

| Gate | Conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | PASS |
| S14 and million-cell installed-IC qualification | PASS |

The separately labelled BLOCKED production-inventory guard is excluded. The
strict Wasm gate reproduces the selected5ffb6c… bytes. The bootstrap source89bfdd6
failures retain their own actual conclusions; they are not relabelled green.
[Recorded job identities](results/checks/ci-43859604893.json) associate this pass
with its actual source.

The final continuation adds paused setup acknowledgement, the positive ordered
European rehearsal and stronger final-receipt certificate/HTTP assertions. It
changes no runtime/build/dependency input or frozen artifact. A full final-source
run of those stronger assertions is still pending publication/completion. No
previous pass is presented as a run of changed test code.

### Final-continuation negative and observed operational pause

[Run43872278065](https://github.com/aodl/balls-2-the-wallz/actions/runs/43872278065)
at exact source `b1d7fe81670962b410966a2786301b1c55d52c31` passes Source, Native,
Package, Wasm and Browser, but **fails installed-IC** in
`entry_installed::combined_clearance_on_normal_installed_module`,
`tools/entry_browser.py:69`: Copy was enabled after explicit Update. The real
controller is paused and Rules11 checkpoint119 is authenticated, but the browser
still reports “Waiting for next on-chain update,” not the observed “Game paused.”
The test inferred browser operational confirmation from a controller-side pause
and a separately delivered checkpoint. The two-second operational poll and the
certificate delivery are independent; the last status body itself was not retained
by the generic artifact-only capture, so its exact contents are not invented.

The correction adds a bounded real-observation handshake: while the controller
remains paused/drained under Rules7, the browser must observe a fresh paused
operational reply **and disabled Copy** before the harness permits epoch commit.
It records that reply's age, rules, memo and control state. Existing stale Keep,
explicit Update, disabled Copy, byte limits and strict certificate/wire assertions
remain unchanged. No timeout, runtime, frontend asset or backend module changes.
This mirrors the separately approvable maintenance precondition; no status is
overridden. The original assertion abort also correctly leaves capture without
a final publication fence; it is not accepted as a completed replay or a transport
timeout pass. [Original failure](results/hosted-43872278065-failure/diagnosis.json),
[actual browser state](results/hosted-43872278065-failure/browser/exception-browser-state.json),
[controller cutover](results/hosted-43872278065-failure/clearance-cutover.json).

## Scope matrix before final hosted closeout

| Check | Result and actual scope |
| --- | --- |
| Combined JS/native50 exact vectors and cursor recovery | PASS, public state/events/scores/receipts and historical fixture hashes |
| Runtime52/controller/Candid/transition negatives | PASS; compile alone is not installed proof |
| Exact612ad0… paid Rules7 →5ffb6c… upgrade | PASS, disposable Fire and unfinished state/source/accounting preservation |
| Official Ledger/Index Unicode/32-byte normalization | PASS, actual valueless transfers;33-byte negative |
| Unsafe Move and annotated additional Build | PASS, actual rejected receipts and zero annotations |
| First Join/Revive/partial/zero/twins/BOM/safe Build | PASS, actual launch fixture, seven annotations |
| Final complete certified122-publication replay | PASS, signed HTTP tip/artifacts, BLS anchor and seven negatives |
| Same-page Rules7→11 stale packet and local editor | PASS; copying stays protected during actual pause |
| Two independent native authenticated bubbles | PASS, same event, real visibility and55+5s aging |
| Shared panel/native input/quantity347.15°/contractions | PASS, controlled fixture and separate actual deployed79 acceptance |
| Exact future80 mainnet-backed Rules7 | PASS three views, full-value API copying; first390 blocked then separately ready |
| Current production79 preservation | PASS signed78-file metadata, fresh three-body/header/BLS sample; original all78-body deployment proof retained |
| Frozen runtime six hosted gates | PASS686b2d9/run43859604893; final test-only continuation still requires its exact-source run |
| Supplemental mixed module-install/browser capture | FAIL, retained unqualified interruption experiment; positive ordered maintenance scope is separate |
| Isolated shared-host purchase cost | MEASURED, with noisy A/A tails; no representative hardware pass |
| Historical audio P09 | FAIL/unqualified; accepted only for the existing controlled trial |
| Physical phone/Firefox/Safari/headphone/Bluetooth listening | NOT VERIFIED |
| Prior BFCache capture restriction | BLOCKED in its recorded scope, not cleared here |
| Production frontend80/backend/epoch/payment/funding | NOT RUN / NOT AUTHORISED |

The focused observed-pause correction passes locally on the unchanged selected
normal5ffb6c… module:230.994s,118 independently authenticated/replayed publications,
zero native wire errors, unchanged disabled-Copy/Keep/Update assertions and both
clearance rejection receipts. [Actual observed pause](results/paused-ack-normal/browser/browser-clearance-pause-seen),
[installed result](results/paused-ack-normal/results.json),
[final certificate/HTTP proof](results/paused-ack-normal/authenticated/result.json).
This local run explicitly records an uncommitted test-only continuation; its new
source commit still requires all six hosted gates.
