# Combined clearance and War Cry — qualification closeout

**Production frontend79 is installed; combined Rules11 remains undeployed.**
The approved panel deployment and live acceptance are recorded separately in
[the deployment report](../approved-action-panel-war-cry/deployment/REPORT.md).
Development is isolated on `feature/b2z-combined-clearance-war-cry`, starting from
published deployment-evidence commit `6afe3b2fc2426887f905259312f5c090ed7dc7ab`.
Final exact-source hosted qualification is pending; no earlier separately green
Rules9/Rules10 run qualifies this composition.

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

## Latest controlled rehearsal status

The atomic capture run retained complete history but failed its90-second Join
receipt assertion: payment3 applied in publication107 while the unheld one-second
fixture advanced to192. The browser was catching up/resynchronising and did not
observe that bounded historical receipt. Setup now holds the actual paid
publication until its receipt and entities are authenticated, then resumes before
copy/cutover. This follows the existing finance-harness contract; it is not a
throughput or production-latency pass. No assertion or timeout is relaxed.

The coordinated repeat passes actual same-page Rules7→11, stale Keep disabled,
explicit quantity Update and `FIRE 2 0 2|Combined!`, protected Copy during the
real pause, and both no-safe-action disabled controls. The overall run still
**FAILS** strict wire finalisation on three net::ERR_ABORTED requests around the
extra mid-browser old/new module upgrades. Original packets, timings and errors
are retained; no incomplete response is called verified. Precise request identity/
upstream timing correlation remains incomplete, so this is not labelled resolved.

Inspection also found that the European rehearsal's initial normal install used
the candidate despite having an exact predecessor parameter. It now starts on612ad0…
and measures both mid-browser module upgrade windows. This strengthens actual
old-module paid-state coverage; it does not alter capture acceptance. That repeat
is in progress, and full qualification is not claimed before its outcome.
