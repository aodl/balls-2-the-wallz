# Autonomous development programme — reviewed progress

Observation and source review: 26 November 2026. This report covers repository development and read-only observation. The paid European canisters were not upgraded, paused, funded or reconfigured.

## Latest closeout update — 26 November, 15:45 UTC

Master is now `0855896239ba222892a372e6eeba22530fa59afc`. Its Rules19-compatible
manufacturing and interaction frontend passed all eleven substantive hosted
jobs: [standard 45833070734](https://github.com/aodl/balls-2-the-wallz/actions/runs/45833070734),
[financial 45833070824](https://github.com/aodl/balls-2-the-wallz/actions/runs/45833070824),
and [developer/prelaunch 45833070929](https://github.com/aodl/balls-2-the-wallz/actions/runs/45833070929).
The exact prelaunch frontend Wasm (SHA-256
`1a22f9aca323738492db1df02acf021753b665dd468c9d3b916d23289057dff5`)
is a [published prerelease](https://github.com/aodl/balls-2-the-wallz/releases/tag/candidate/europe-prelaunch-frontend-manufacturing-2026-11-26).
All six release assets were downloaded and byte-compared. Same-ID upgrade and
exact installed-frontend recovery passed in disposable qualification. No
production installation occurred.

PR #16's later [standard run 45832046550](https://github.com/aodl/balls-2-the-wallz/actions/runs/45832046550)
**failed** a distinct historical Rules13 Shout browser fixture after its
authenticated publication and independent replay had passed. The obsolete
fixture clicked `#reorient-action` after automatic owned-Diverter Reorient
had already opened, so Playwright timed out on a hidden control. An unmodified
local rerun passed once, showing timing sensitivity. [PR #18](https://github.com/aodl/balls-2-the-wallz/pull/18)
now waits for the selected Diverter and automatic Reorient state without
the redundant click; its focused installed browser case passed at 1440×900
and 320×640 with exact memo and query-only checks. The original failure and
corrected pass are retained in verified operator archives. PR #18's exact
hosted gate is pending and must not be replaced by the frontend candidate's
earlier passing runs.

The latest [15:45:39 UTC certified read-only observation](production-observation-2026-11-26-1545.json)
found installed modules unchanged, head 18,360, running capped Trickle and
zero pending source records. Backend settled liquid was 2.917196T cycles.
The settled 10,965.596-second/110-publication bracket showed 0.545470T/day net
balance movement, giving dated conditional estimates of 3.51 days to the
1T protection boundary and 1.55 days to the usual 2.07T Full Speed cycle
floor. This is neither proven gross expenditure nor a funding decision.

The sections below preserve the evidence and pending states as recorded at
their earlier review points.

## Qualified source and release boundary

The reliability capture correction is integrated on `master` through [PR #9](https://github.com/aodl/balls-2-the-wallz/pull/9), with eleven substantive exact-source hosted passes: [standard](https://github.com/aodl/balls-2-the-wallz/actions/runs/45790064177), [financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45790064334) and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45790064164). The informational production-inventory guard is excluded from that count.

The combined Rules19-compatible frontend review source is `8a3100363f8c10adc2d343ae0a0096b5612ba4b2` in [PR #16](https://github.com/aodl/balls-2-the-wallz/pull/16). Its prior test-only commit `0290261` passed [financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45817559859), [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45817559795), source, native, DTR, Wasm, frontend and browser jobs, but the [standard workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/45817559637) **failed** a historical Rules13 installed browser fixture. That fixture checked for an empty-tile panel 350 ms after the click, before the intentional double-click arbitration could commit a single-click selection. The corrected full-source hosted [standard](https://github.com/aodl/balls-2-the-wallz/actions/runs/45832046550), [financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45832046637) and [developer/prelaunch](https://github.com/aodl/balls-2-the-wallz/actions/runs/45832046592) reruns were pending when this record was prepared. This source is not a production installation.

Against the programme's starting master `f60426d7b9c07b643db4241428b4707db7afdd7e`, Git tree objects for the authoritative Rust and independent JavaScript kernels, canister runtime source, vendored predecessors and DTR, approved audio, historical v3 golden and Rust locks are byte identical. The changed frontend and verification paths are listed by the ordinary Git diff. [Machine-readable source invariance](source-invariance.json)

The exact developer/prelaunch embedded frontend Wasm was retrieved from current source `8a31003`'s [developer artifact 15122299954](https://github.com/aodl/balls-2-the-wallz/actions/runs/45832046592) and independently rehashed. It is **77,689,127 bytes**, SHA-256 **`1a22f9aca323738492db1df02acf021753b665dd468c9d3b916d23289057dff5`**, byte-identical to the prior test-only candidate. Its embedded asset inventory SHA-256 is **`addbee9e943b06b26226f0894f74ba39be0dad680ae48770fc4ff2c7c363bc2e`**. The retrieved CI bytes and module report agree. A disposable same-ID frontend upgrade and exact-current-frontend recovery passed on those exact bytes: 91 certified GET/HEAD responses and 28 alternate routes passed before, during and after; candidate installation used 185,524,191,169 cycles and recovery 185,492,867,154. The current source's full hosted gate remains separate from this byte-equal rehearsal. See the [current artifact inventory](frontend-candidate.json) and [historical test-only manifest](frontend-candidate-0290261.json). Production deployment requires a separate exact-artifact decision.

## Reliability

The original short local installed browser case failed when a real observation request was aborted at its ten-second browser deadline while a disposable same-ID backend upgrade held its upstream response for over 10.55 seconds. The corrected harness drains browser and capture work around that explicit upgrade boundary while retaining complete response, certificate and independent-replay checks. The same short case then passed. The original failure remains historical FAIL. [Detailed evidence](reliability/REPORT.md)

The historical Rules13 installed fixture failure on `0290261` is retained as [original failed evidence](</home/codexdev/b2z-release-evidence/development-programme/pr16-context-fixture-failure.zip>). Source `8a31003` waits for the exact tile or Diverter panel title instead of assuming the old click timing, and asserts the new automatic Reorient state. Its [focused installed rerun](</home/codexdev/b2z-release-evidence/development-programme/pr16-context-fixture-corrected-pass.zip>) passed authenticated paid annotation, independent replay of three publications and native Chromium at 1440×900, 390×844 and 320×640. Each view copied the exact `DROT 2 N` memo and made no write request. The full hosted standard suite remains a separate gate.

Two full 900-second Normal attempts found distinct presentation coverage failures. The first left a verified-coverage guard during a supported-rate downshift; the second applied a single-request deadline to a genuine 10.53-second multi-request authenticated catch-up. Both failure captures were retained. A third full local installed case on product source `66420f5e1927578b8c42229bda0c906a1ead7ebe` passed its unchanged 900.48-second window: producer 0.9950–1.0006 tick/s, authenticated admission 0.99836 and displayed progression 0.99833 tick/s, with zero stalls, rebuffering and resynchronization. It completed cold Lifeline and independent exact replay of 1,049 consecutive authenticated publications. Source `0290261` changes only a browser assertion for the new compass semantics; the tested product bytes are unchanged. The third result does not erase the two historical failures.

## Manufacturing and interaction

Cannons and Diverters use their existing exact procedural geometry in bounded presentation-only manufacturing overlays. A site has moving graphite drones, payer-accent laser beams with near-white cores, developing luminous structure parts and an honest indeterminate progress bar. Manual wallet copying remains a local intention. Signed plans remain tied to the existing immutable intent and verified receipt; the overlay yields to the authoritative structure at displayed birth. Unknown automatic first-Join placement receives no invented preview. Four native Chromium fixture scopes and reduced motion passed. [Manufacturing evidence](manufacturing/REPORT.md)

The same candidate adds displayed-owner territory clipping for selected-Ball arrows, owned-Diverter default Reorient with canonical clockwise alternative, deferred tile selection for double-click zoom, a prominent central spinner for genuine exhausted verified coverage, relative compass rotation that moves North to the clicked position, the compact Cycles line, 0.5× music and 3× sound effects through the existing gain buses, an operational-only sliding speaker button, and restrained satin highlights on terrain and structures. The Rules19 placement and pricing policies remain active against the installed backend. Four sandboxed Chromium viewports, focused interaction tests and the hosted browser job passed. [Interaction evidence](interaction/REPORT.md) · [Satin evidence](satin/REPORT.md)

A genuine disposable Ledger/Index test produced a signed Cannon birth and a separate manual Diverter birth with authenticated publication and Rust replay. Independent JavaScript replay initially failed on a transient grant-map serialization edge. A narrow internal draft-clone correction replayed the frozen public bytes exactly in both implementations. A complete fresh installed rerun first failed an overly strict pre-payment publication-identity assertion: source admission can emit a certified no-tick publication without applying either payment. The corrected test fences on the unchanged paid source cursor and absent structures, then captures the latest certified predecessor for replay. On isolated source `50355dac7bc8f5675709baf59f8cbe4d9e19c971`, the full 40.512-second disposable run **passed** signed Cannon position 4, manual Diverter position 9, authenticated births, exact native/independent JavaScript state, events and scores, and presentation arrival. This correction is not part of frontend source `8a31003` and has a separate [hosted qualification PR #18](https://github.com/aodl/balls-2-the-wallz/pull/18). The original failed runs remain retained. [Selected verified public capture](</home/codexdev/b2z-release-evidence/development-programme/installed-construction-50355-pass.zip>) (SHA-256 `c9b3f36218a2b0372d49edef89b3d45ec9da42ec560438389f57137bc16039bf`). A browser-to-Ledger end-to-end journey and physical devices remain open. Manual packets are not presented as Ledger-confirmed by their presence alone.

The same test exposed a distinct current Rules19 durable authorization-map encoding boundary for some valid account identifiers. The backend stopped the affected disposable operation while retaining its last certified publication. The internal JavaScript clone correction does not fix that durable boundary. A versioned registry representation, old decoder, paid-state-safe transition and recovery qualification are required before a backend correction. The controlled reproduction remains outside the public source tree.

## Performance and successor work

The catalog-decode cost experiment lowered disposable measured checkpoint cycles by 0.09–0.34% in the tested small and moderate fixtures. A six-nanosecond virtual-time difference in the first cross-upgrade output comparison and the small benefit kept it off master. Manufacturing instancing reduced active-site draws by four with unchanged triangles, but software-rendered frame timings were mixed; that experiment also remains local. A fresh exact-source Node CPU audio-on/off slice met the narrow p95≤0.5 ms and p99≤2 ms incremental targets across seven fixtures. It does not reverse the historical integrated P09 FAIL or qualify native GPUs and physical listening. [Audio CPU summary](audio-cpu-summary.json)

A separate disabled certified-burn prototype demonstrated bounded preliminary, established and stale observations, signed coexistence with publication certification, same-ID restart/recovery, and tamper and wrong-canister rejection. Its full browser, reservation and incremental-cost gates are incomplete. The current frontend truthfully omits the estimated rate on the older backend. Rules20 symbolic pricing passed Rust and independent JavaScript boundary and grace-prefix vectors, including 10/20/40 ICP first Cannons at applicable populations 1,000/1,001/1,002 and fail-closed unrepresentable prices. Authenticated tariff activation, actual successor payments, construction-over-Balls passage, checkerboard corner capture, migration and paid-state recovery remain incomplete. None of those backend prototypes is installed or integrated. [Outstanding-work register](../../../ROADMAP.md)

## European operation

The [reviewed 12:42:54 UTC read-only observation](production-observation-2026-11-26.json) retained the installed backend `b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90` and frontend `2a6da764e4e7f63bf367bc6e55265df00a4714121019e895e67d0598521475ff`, authenticated head 18,250, running capped Trickle at 0.01 tick/s, open admission and zero pending source records. Backend settled liquid was 2.986425T cycles. Across a comparable 7,684-second bracket, net liquid declined 47.915B cycles, about 0.538765T/day at that workload. The dated projection was 3.69 days to the 1T ReserveProtection boundary and 1.70 days to the usual 2.07T Full Speed cycle floor. Credits and workload changes can alter that projection. Owner-specific Full Speed eligibility was not established. The latest real owner sign-in remains pending; no live Full Speed window was started.

The later [14:14:24 UTC settled read-only observation](production-observation-2026-11-26-1414.json) retained those exact installed modules, head 18,305, logical time 18,289, the same observed population and entity counts, running 0.01-tick/s Trickle and zero pending source records. Backend liquid was **2.951839T cycles**. Over 5,489.418 seconds and 55 publications since the prior settled capture, liquid declined 34.586B cycles, approximately **0.544358T/day** of net movement using the exact interval. At that observed workload and absent unknown credits, the dated estimate was **3.59 days** to 1T ReserveProtection and **1.62 days** to the usual 2.07T Full Speed cycle floor. Frontend total was 0.964769T, leaving about 0.311063T beyond its estimated freezing reserve and the historical 450B installation/recovery allowance. No production intervention occurred.

The new offline [operating-runway calculator](../../../tools/estimate_operating_runway.py) accepts two retained settled observations and uses their exact nanosecond interval and integer cycles. Its four focused tests passed. For the same raw observation pair, the more precise 7,684.978-second interval gives 0.538697T/day and 318,596/146,982 seconds to the two floors; the earlier report used 7,684 whole seconds. The tool never contacts production or authenticates its input files. Use the existing signed observation procedure first. [Operator command](../../../docs/operations/B2Z_PRELAUNCH_TRICKLE.md)

The closeout documentation and offline tool passed the complete local `python3.11 -B tools/check.py source --output .work/development-programme/closeout-source` gate, including source vectors, Node tests, documentation links and Python tool tests. Raw logs remain under `.work/`.

The exact installed and compatible recovery bundles remain under [the installed release](https://github.com/aodl/balls-2-the-wallz/releases/tag/production/europe-rules19-prelaunch-trickle) and [Rules19 predecessor release](https://github.com/aodl/balls-2-the-wallz/releases/tag/production/europe-rules19). The current frontend Wasm hash above is the appropriate same-ID recovery for a frontend-only review of the new candidate. The paid backend remains on its existing module.
