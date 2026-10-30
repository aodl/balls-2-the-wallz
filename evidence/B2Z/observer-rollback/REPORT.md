# Live observer rollback diagnosis and narrow frontend proposal

A2 remains installed, paid state remains preserved and gameplay is running. This work did not reopen the backend release. No mainnet update, gameplay pause, backend build/install, cycle transfer, controller/subnet change, frontend deployment, branch merge or remote push occurred. The original production browser no-error **FAIL** and all previous qualification records remain unchanged.

## Demonstrated cause: authentic stale observation

One bounded read-only production browser session ran against the **unchanged deployed frontend**. Its script SHA-256 `95a1dc6252207ba364909f27455bebf113db3f4bb7f386d9f73a6be38e82bcb0` exactly matches the frozen deployed asset. The browser used its original IC root, certificate/delegation/canister/freshness verification, query-signature verification, sandbox and CSP. A debugger exception hook read only publication/response locals at the original guard; it did not replace assets, patch application objects or accept observations. Debugger inspection can perturb local timing, but the rejected response had already arrived when inspection paused execution.

| Captured response | Preceding accepted | Rejected |
|---|---|---|
| Browser request ID | 388565.13 | 388565.14 |
| Query start UTC | 2026-10-30 13:33:43.057800 | 2026-10-30 13:33:43.359001 |
| Decoded head | **66541** | **66540** |
| Certificate time, ns | 1793367221291490830 | 1793367217621651584 |
| Certified publication root | 04a98ed9008cdaab5cbb16ad4f9ae19bec25434a6e2e5bb35e74aa54821a36f8 | 833b15e9fdb26dcff4151e91757924bc687dbf71e0f80986aae8fc1a19e4a610 |

Both are paid-v8 publications in the same authenticated epoch `af63115be28d56310cda76b5542cb0349c7962c96b5f9f9735d0bb0b46ce791b`. The rejected certificate is 3.669839246 seconds older. The stale query was issued **76.767 ms after the newer query finished**, ruling out overlapping browser request-completion reordering for this incident. Raw Candid/CBOR response bytes, request/response/finish timestamps, certificate bytes, decoded publications, certified roots and preceding accepted ticket are retained.

The exact throw is deployed `app.mjs:455`, DTR 0.14.0 `PublicationSequence.accept`:

```js
if (b2.segment_id === null || b2.segment_id < next) throw new Error("observation rollback");
```

The guard correctly rejected older head 66540 after accepting 66541. It did not lower the authenticated floor. This is **an authentic stale head**, not an invalid certificate or a demonstrated chain/state inconsistency. Both exact certificates pass the unchanged mainnet verifier at the recorded time. The rejected certificate also passed an independent normal-clock mainnet-root verification before expiry. A separate normal-clock check verified the same accepted head under another captured certificate; its record is retained distinctly from the exact preceding-ticket check. Historical regression tests freeze only their own test clock at capture completion; no live clock or verification policy was changed.

The two query responses carry different query-signature identity fields. That does not establish whether an endpoint reused a response or a serving node had an older certified view. **No gateway or replica origin is attributed.** The evidence identifies the stale reply and its ordering, not an unobserved server-side cause.

Capture bounds were 120 seconds before drain, 384 requests and 32 MiB. The single session retained 209 completed responses / 6,660,843 bytes, 89 telemetry samples, zero capture errors and zero outstanding body callbacks at close. Already-dispatched response reads drained while the context remained alive. No credentials or HTTP headers were collected; browser temporary profiles are excluded from the archive. Accepted browser heads advanced 66540→66567, no resynchronisation occurred, and playback recovered, but `deliveryError` stayed “observation rollback” after retry failures returned to zero. This unchanged-frontend diagnosis is not a clean production no-error PASS and was not repeated with the proposed patch.

## Historical comparison

The retained October 24 graduated-pacing record already has `delivery_error="observation rollback"`, `delivery_failures=0`, continued playback and zero resynchronisations. Its installed module was **c7c69ddf…**, a pre-A2 predecessor; do not relabel that module as exact frozen A0 **7c078fb3…**. It demonstrates the symptom predates A2. Those historical telemetry fields alone do not prove the exact cause of every earlier warning. Original historical statuses/bytes remain unchanged. The user independently reported the symptom on A0 as well; this work does not rerun A0 or infer an A2-specific regression.

## Proposed frontend-only change, not deployed

`apps/b2z-observer/live-delivery.mjs` adds a small diagnostic/recovery helper; `pumpLive()` calls it only around its existing verification/guard/error paths. The DTR package, anti-rollback invariant, certificate checks, TLS, request pattern, backoff, five-consecutive-failure threshold, pacing and buffering are unchanged. Every older observation is still passed to the original sequence guard and rejected; it is never admitted as a new floor.

Only the specific same-context, certificate-verified lower-head rejection is classified as transient stale delivery. A subsequently verified current authenticated root, or fully accepted authenticated forward head, may clear that active stale error. The original event retains message, timing, attempted/accepted heads, roots, epoch and certificate time with a recovery timestamp. Diagnostics expose the latest 64 events, lifetime failure/recovery counts and explicit eviction count through `__dtrLive.delivery`; recovery does not delete its history entry. This is bounded session history, not new persistent storage.

Persistent regressions still reach the existing five-failure terminal state. Non-stale errors remain latched, including across an intervening stale reply and recovery, so a certificate/chain conflict is not hidden. Same-height conflicts and certificate failures remain failures. No error filtering or retry budget was relaxed.

The proposed production asset build changes only **app.mjs** and **build-manifest.json**. CSP/security headers, configuration, backend target, styles and all other assets are byte-identical to the original. The local build is a review candidate and records its dirty source/base commit honestly; it is not a published or deployed release. Exact source and output hashes are recorded separately.

## Regression and source/browser checks

- **8 focused tests PASS**: authentic captured stale response rejected with unchanged floor; same-head verified recovery retaining history; authenticated retained/forward catch-up; persistent regressions remain terminal; conflicting same-height content remains rejected; invalid certificate failure; expired certificate failure; later stale recovery cannot hide an earlier certificate/delivery error.
- **1,397 JavaScript tests PASS** with the final exact captured certificate fixtures.
- **14 local HTTP/browser checks PASS**, with sandbox, CSP and native WebCrypto. These use offline recording fixtures; they are not another production observation or proof the deployed frontend changed.
- Source/dependency structure checks PASS under required Python 3.11; frontend-only bundle build and unchanged-asset comparison PASS. An initial system-Python 3.10 checker lacked `tomllib`; that diagnostic log is retained and the correct supported interpreter passed. No backend rebuild ran.

Historical public certificate fixtures retain the actual root/signature/delegation/canister/time checks at their recorded time. The same-height synthetic conflict is explicitly content-pinned test data, not a fabricated mainnet certificate. The original production FAIL is not relabelled by these local regression passes.

## Short operating assessment

Controller-runtime sample interval: **113.962451904 seconds**, within the 13:33–13:35 UTC observation. Completed segments **66539→66573**, or **0.298344 ticks/s**, versus selected Steady nominal/supported **0.3 ticks/s**, no limiting. Liquid **11,238,858,986,637→11,203,752,453,011** cycles; total **11,387,305,920,027→11,352,199,386,401**. Net debit **35,106,533,626 cycles**, reported treasury credit delta zero, unchanged total-minus-liquid gap **148,446,933,390**.

This is combined **active-game net expenditure**, not maintenance-only, gross isolated gameplay cost, a universal bound or a funding/runway forecast. No future income is assumed. Source remains bound/healthy, cursor 39,711,127, zero pending records and Index calls 13266→13268. Treasury remains Idle, unpaused, not halted, no error. Fresh authenticated metadata confirms the frozen A2 hash and unchanged controllers/34-node fiduciary subnet. No mutation was made.

## Decision

**A narrow frontend-only deployment is justified** to report verified recovery accurately while preserving failure history and every trust invariant. Backend/DTR changes are not justified by this evidence. The patch is local and undeployed; current production can still show the historical sticky warning. User-owned publication, relevant exact-commit CI and separate frontend-only deployment approval remain required. This is not authority to deploy or a claim of a clean post-patch production run.
