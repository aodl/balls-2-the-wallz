# Final human-player corrections — frozen locally; publication pending

Exact source: `33067280fa8cf42213fa3ecc109ea1fc398b6547`, continuing the accepted
`9820380613aeb45652785e6351a77c7e728e515e`. No redesign or new framework.

The ordinary action card exposes exact ICP amount, separate wallet-fee wording,
exact memo/Copy memo, full receiving AccountIdentifier/Copy address, paying account
and retained-payment/no-automatic-refund warning without opening the disclosure.
Principal/subaccount addressing and hex memo remain advanced details. The existing
verified quote and memo codec still supply every copied value.

Draft feedback expires on new selection, draft/edit and cancellation. A disappeared
cannon's frozen packet retains its warning and replacement gate; unresolved public
payment instructions and historical receipts stay in Activity.

**PASS:** 19 focused JS tests and the existing sandboxed browser harness at 320×640,
390×844, desktop 1440×900, plus its existing landscape/tablet sizes. The complete
Identify → own cannon → angle → quantity → wallet review/copy → Activity task
checks each field's reachable rectangle with disclosure closed and no aim/rail
overlap. Actual clipboard writes are captured and their amount, full nondefault
recipient and UTF-8 memo bytes compared exactly. Denial/manual fallback, explicit
Replace/Keep, disappearance → new cannon → valid Fire, preserved reported-payment
Activity and the missing frozen-target warning/replacement gate pass.
[Measured tasks](responsive-tasks.json), [verification](verification.json).
Raw runs (including harness/setup failures) remain in `.work/human-interface-final/`.
No unrelated backend suite was rerun; unchanged executable inputs retain the
[previous qualification](../human-interface/verification.json).

The reviewed builder froze 15 files in `.work/human-interface-final/frozen-assets/`
from clean source. Only HTML and JS differ from the accepted bundle; CSS, locks,
configuration, Candid and all other payloads are identical.
[Builder manifest](frontend-manifest.json), [complete file hashes](ready-files.json),
[security headers](security-headers.json). SHA-256:

| Artifact | SHA-256 |
|---|---|
| HTML | `64ec1ae93f7dd9a4edf586d212397673fd0a117dd1f026998ed3dfd2fabf9224` |
| JavaScript bundle | `920cd1fa42a2bee2a2807833d51958315a75e16651f7dc49435e28203a2bcec8` |
| CSS | `09e1e79dbe2ad62f214485dbe1fe37b02bc80b289e03bd86f7d2296f9c33c63a` |
| Complete file manifest | `40939fb9c543a05c8c6722568c0bb418e952015e43e3323ea1b6ce3cc6c9c1a9` |

Genuine Chromium [desktop](candidate-1440x900.png)/[mobile](candidate-390x844.png)
captures show the **local frozen candidate observing authenticated production**.
Right rail, Identify, Reserve pause status, disabled payment preparation and
[source/certificate verification](candidate-verification-mobile.png) pass.
Actual currently served production has separate [desktop](production-1440x900.png)
and [mobile](production-390x844.png) captures. These are not post-upload evidence.
[Read-only observations](read-only-smoke.json) use only query/read_state requests.
Synthetic task screenshots remain labelled: [320px destination](synthetic-320x640-payment.png),
[320px warning](synthetic-320x640-risks.png), [390px destination](synthetic-390x844-payment.png).

**BLOCKED: source publication → hosted exact-commit CI → asset-only deployment.**
Live `git ls-remote` confirms the branch is already published at
`dc3b4073bb750de42798c7aec94dd46f9bc5b60b`; the earlier unpublished-baseline report
is historical. GitHub currently has zero runs for new source `3306728`. None of
its six substantive hosted jobs is claimed to pass. The separately labelled
production-inventory job remains an informational BLOCKED inventory, not a test pass.
`AGENTS.md` leaves remote Git user-owned. The exact non-force operator action is:

```sh
git push origin 33067280fa8cf42213fa3ecc109ea1fc398b6547:refs/heads/release/btz-prelaunch-playability
```

Publish this exact source first so its own CI runs; a later evidence-only commit
must not substitute for its exact-commit gate. After the applicable hosted jobs
pass, existing authority permits only frozen-asset publication to
`s45ab-wiaaa-aaaar-qcifq-cai` using the established observer-only procedure in
[S14_OPERATOR.md](../../../docs/operations/S14_OPERATOR.md). Stage the verified
frozen bytes into the configured asset source; do not rebuild/substitute a later
candidate or deploy the backend. DFX 0.31.0 remains installed. No upload occurred.
[Served-file comparison](served-assets.json) confirms production still serves the
previous HTML/JS/CSS/manifest; its security headers match. Candidate served-byte
verification and post-upload smoke are NOT_RUN, pending that gate.

Authenticated [before/after module reads](preserved-modules.json) show unchanged
backend `cfcf6130432a040a40738627df65da65d0d5c57195c04d3bb147a848af6d8303`,
frontend module, controller sets and 34-node subnet. Authoritative gameplay,
Ledger/Index authority, DTR verification, financial records and payment execution
were not modified. No backend install/upgrade, pause, controller/subnet operation,
cycles transfer, ICP spending, wallet/signing or automatic resend was performed.
Normal autonomous activity/cycle consumption is not claimed to stop.

Public receipts still omit original memo evidence, so no safe automatic association
with local packets is implemented; payer/amount/reported index are insufficient.
No human participants, real-wallet payment, real-device/soft-keyboard qualification
or complete nonvisual spatial-accessibility study occurred. Automatic refunds and
payouts remain unavailable. Production Reserve protection prevents a live payment
preparation journey; synthetic checks are qualified separately. Further frontend
implementation awaits actual human usability feedback after shipping.
