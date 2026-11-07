# B2Z European release — installed and usable

**[Open B2Z](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/).** Backend and frontend are
installed on the owner's existing European canisters. Certified rules 7, schema 6,
1000×1000 world and fresh epoch index 4 are verified. The empty game is efficiently
idle, with **Trickle selected, admission open, nominal/supported 0.01 ticks/s**.
No deployment blocker remains.

## Published source, CI and frozen identities

Qualified published tree: **`7a74f1a206aa7c6272e2efc58691d496d95a1a4c`**.
[Exact-source run 42418003762](https://github.com/aodl/balls-2-the-wallz/actions/runs/42418003762)
passed all six substantive jobs: Source conformance; Native conformance; Packaged DTR
and clean consumers; Runtime-lab Wasm; Browser HTTP/Web Crypto; S14/million-cell
installed-IC qualification. The separate BLOCKED inventory remains informational.
[CI record](ci-qualified.json) and [58 passing executed checks](hosted-s14-results.json)
retain actual conclusions. The public evidence archive SHA-256
`1e778c0cf36b1536dabb7a4c24f5282f601f9afe521b33e83406cb974b74843a`
was checked against GitHub's published digest before its JSON was read.

Component build provenance is preserved: backend source **07693c7f5a2102fce080ed6fbe156512d4c6fbe9**,
frontend source **6d788f554bcfdcb542fa14082d6384a0ba75416d**. Qualified tree 7a74f1a
adds only evidence/status after 6d788f5; all backend/dependency inputs remain equal to
07693c7. [Input equality and frozen-file verification](published-source-artifact-reconciliation.json)
records this bridge. No artifact was rebuilt merely for documentation, and CI is not
attributed to the cancelled 6d788f5 run. This report follows in a separate evidence commit.

| Installed/frozen component | SHA-256 |
|---|---|
| Normal backend Wasm | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Frontend JS | `b452a8bdd5632bf9c9bc20500e768c725add15b72c21a9b980386dc31b48c07c` |
| Complete 15-file frontend manifest | `2b1da4a704a04644b45693470319b616c3d575e43c2a1f24bcf331cbe0e0d7eb` |
| Frontend asset-canister module | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |

[Backend manifest](backend-manifest.json), [frontend build provenance](frontend-build-manifest.json)
and [every frontend file](frontend-ready-files.json) identify actual bytes. All 14 public
files, including configuration/provenance/API files, match the served result. The
15th file is the upload header configuration; its [expected security headers](security-headers.json)
match every public response, including CSP. [Served verification](served-assets.json).
DTR remains **282d709143dacb4bca769a4d6e72b97fc93ef518**, JS client **0.15.0**.

## Actual installation, authority and financial state

Backend **s5ir5-gqaaa-aaaas-amyna-cai**, frontend **s2jxj-liaaa-aaaas-amynq-cai**.
[Immediate preflight](targets-preinstall.json) verified module absence, controllers,
placement and balances; [official account preflight](account-preinstall.json) was empty.
Only the frozen normal backend was installed, using supported empty v3 genesis and
FromBeginning. Torus, million, playability and entry transitions each used their own
actual Ledger/Index fence and certified sealed predecessor manifest. The autonomous
driver was started once after activation/binding verification, generation 1. Observer-only
asset installation followed; no backend build/deploy side effect occurred.

[Final certificate/artifact capture](final-verified.json), [archived proof bytes](certified-world/)
and individual prepare/commit records verify the full eight-publication/four-epoch chain.
Rules hash `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`,
configuration `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`,
schema `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`,
source `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125`.
Archived certificate freshness is evaluated at its recorded observation time; the live
observer continues genuine IC-root/canister/freshness verification.

The verified default receiving AccountIdentifier is:

`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`

It was independently derived by Rust/DFX and JS, then matched against the certified
source and actual worker configuration. Official Ledger **ryjl3-tyaaa-aaaaa-aaaba-cai**
and Index **qhbym-qaaaa-aaaaa-aaafq-cai** bindings agree. [Final signed history check](account-final.json)
has zero balances, no transactions/oldest ID. Cannons, balls, credits, pending payments
and received e8s are zero; source cursor remains zero. No history, receipts or world
were imported. Source and treasury are healthy; treasury is enabled, Idle, observed ICP
balance zero, no conversion/credit. Event Horizon is **disabled**, independent fallback **60s**.

[Final certified placement/controller checks](targets-final.json) retain exactly the original
two-controller sets on **bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe**, with
**13 current node identities**. Both installed module hashes match above. No reinstall,
upgrade, migration, controller/subnet change, new canister, manual ICP payment, cycle
transfer/purchase or notifier/endowment operation occurred. The former deployment was
not touched. Ledger-only actual-paying-account authority, deterministic gameplay,
prices and financial/recovery checks remain intact.

## Real operation and browser evidence

Latest SDK observation **2026-11-07T23:08:03.296789+00:00**: backend total **1,477,728,203,808**,
liquid **1,422,199,114,608 cycles**; Trickle, admission open, supported rate 0.01.
Trickle entry stays **1.25T liquid**, exit below **1T**; source/treasury/transition floors
0.15T/0.2T/0.5T and upper bands are unchanged. SDK liquid already excludes platform
reserves; nothing was subtracted a second time. The separate ignored
[natural starting-budget test](../europe-final/natural-budget.json), recording exact normal
612ad0d0, remains independently executed evidence; generic CI is not credited with it.
[Depletion/recovery evidence](../europe-final/verification.json) retains synthetic cycle-burn/
test-hook setup followed by normal-module recovery as distinct phases.

The settled [operating window](operating-consumption.json) ran **642.45s**,
2026-11-07T22:55:44.819490+00:00 → 2026-11-07T23:06:27.330883+00:00. It spans two five-minute maintenance intervals
(periodic sample ends advance 600.32s; treasury nonce +2),
10 source scans, unchanged game publication and zero simulation segments. Workload:
empty-world source/treasury/health maintenance, idle/storage costs and three bounded
operator read snapshots; browsers were closed before baseline. No credits/discontinuities
were observed, endpoint scans were settled and treasury was Idle.

| Canister | Start total | End total | Net decline |
|---|---:|---:|---:|
| Backend | 1,478,730,019,841 | 1,477,881,915,574 | 848,104,267 cycles |
| Frontend | 1,491,605,755,962 | 1,491,594,499,392 | 11,256,570 cycles |

Backend liquid at window end was **1,422,354,770,374 cycles**. Normalized net
rates were approximately **0.004752T/h backend**, **0.0000631T/h frontend**. These are
sampled empty-world net consumption, not gross execution, marginal polling costs,
populated-world lifetime or a measured 13/34 cost ratio. Callback totals containing
execution reserves are kept separate from settled/query observations. Setup net declines
(installation/activation/browser/verification interval) were **20,971,781,095 backend** and
**8,096,305,072 frontend cycles**, outside this steady window.

[Production browser results](production-browser.json) PASS at **1440×900, 390×844 and
320×640**: genuine verified world without Identify; local Identify; right rail; current-rule
New quantity/angle preparation; visible amount, separate fee wording, recipient, memo,
paying account and no-refund warning; exact native clipboard bytes; denied-copy fallback;
explicit packet replacement; backend-scoped Activity; local pause; continued certificates
without refresh. All POSTs were query/read_state only. Field rectangles are inside the
viewport and clear of the rail. Screenshots accompany this report. Owned-cannon/paid
outcome/populated playback paths reuse the genuine disposable CI evidence.

Hosted Normal playback measured 0.9964 ticks/s; the unchanged **900.36-second** sustained
case measured **0.999895 ticks/s**, zero stalls/resyncs, PASS. Two earlier local Normal
assertion failures remain preserved in [the prior record](../europe-continuation/verification.json);
environment-only causation was not established and those failures were not relabelled.

Public receipts still omit original memo evidence, so automatic packet association remains
unavailable. No human study, physical-device/soft-keyboard or real-wallet payment test was
performed. Production populated/max-population/lifetime performance is not established.
The frontend implementation stops here pending actual human usability feedback.
