# Approved payment-panel deployment — European prelaunch acceptance

**Installed and retained, with the limitations below.** No backend operation or
financial mutation occurred. The current site is https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
War Cry and territory-clearance successors are NOT active: the paid backend remains
Rules7. Combined-rules development is a separate workstream and cannot change this freeze.

## Exact installed identity and scope

- Qualified source: `367edf563222854423f2687711a21ab0087d7910`; all six substantive
  [gates passed](https://github.com/aodl/balls-2-the-wallz/actions/runs/43785291394).
  Starting checkout/remote: `9a5c55e19f1637cb07bac7553635f6935ee8cc7e`, clean.
- Frozen runtime/build source: `427199b38e847f4cfb7142db2b42212e804169a6`.
- JavaScript: `c37ed0c363902e29443ba9eb1501c6b653873945bb63e7d92b341f8400f1085d`.
- Complete79-file inventory: `63cffcc2793a1855269c8b5cbcb8d01507d9cac5f056b7b8989939e83c13d45f`
  (78 public assets plus consumed upload policy).
- Audio manifest: `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c`;
  all61 audio assets unchanged. No rebuild or audio regeneration.

Every candidate and rollback hash and all470 consumed source-input entries matched
before staging. The existing78-file staging tree was verified and moved to
`.work/approved-panel-deployment-20261116/previous-staging`; the approved freeze
was copied into a clean `.work/s14/assets` and all79 files were rehashed.
[Staged proof](results/staged.json), [candidate inventory](results/candidate-inventory.json),
[CI identity](results/approved-ci.json).

## Authorised operation and independent installation proof

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

DFX0.31.0, exact observer mapping `s2jxj-liaaa-aaaas-amynq-cai`, assets-only source
`.work/s14/assets`, no observer build/dependency hook. Existing certified controller
access was confirmed using the public principal; no key material was inspected.
An attempted `list_authorized --query` was rejected locally because it is an update
method; no authorization-update call was made. Certified controller membership
provided the required access proof.

The [deployment log](logs/deploy.log) has a generic “Upgraded code” message, but
`--no-asset-upgrade` was used and the certified frontend module remains
`04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
No backend builder, installation, settings, controller, funding or payment operation
was invoked. After installation all78 public bodies/lengths/hashes, reviewed
security/CSP/cache/MIME headers and identity-only FLAC encoding matched. All78
fresh ICv2 BLS/delegation/canister/body/header/path witnesses verified, including
a changed-response negative. This is the actual installed site, not merely a
successful DFX exit.

[Before77 bodies](results/served-before.json), [before certificate proofs](results/http-certificates-before.json),
[after78 bodies](results/served-after.json), [after certificate proofs](results/http-certificates-after.json),
[signed after inventory](results/inventory-after.json).

## Paid backend preservation

Backend `s5ir5-gqaaa-aaaas-amyna-cai` remains:

| Identity | SHA256 |
|---|---|
| Module | `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948` |
| Rules7 | `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f` |
| Configuration | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` |
| Source | `54d927b945f7f0e99f40544e8e909eb10a3adf93d66d59467f68c5880b3d4125` |

Fresh before/after/final authenticated observations retained the same module,
controllers and European subnet. At08:28UTC the source was checked/healthy, no
pending records/errors, autonomous Trickle10milli running, admission open and
`canPrepare:true`. The source cursor remained40180669; autonomous publication
heads advanced normally. No world reset, rule/capability preparation/activation,
Ledger transaction, allowance, treasury, funding, cycle transfer or settings change.
[Before scene](results/observation-before.json), [final scene](results/observation-final.json),
[before metadata](results/metadata-before.json), [after metadata](results/metadata-after.json),
[final metadata](results/metadata-final.json).

## Actual production-browser acceptance

All screenshots and videos are real browser captures. Canonical fixtures and
previous source CI are not substituted for these installed-site checks.

| Journey | Actual result |
|---|---|
| Shared panel at1440×900,390×844,320×640 | PASS nine Fire/Move/Build panels; both divider axes0px mismatch; Copy axes within1px,44px targets, finance text>=14px, no financial inputs/fee row |
| Full recipient, amount, memo | PASS actual Clipboard API and external native paste for all nine quotes; full address Ctrl+C also recorded at the copy event |
| Canonical prices/memos | PASS nine independent pure quote reproductions from the actual authenticated snapshot/config, plus binary memo round trips |
| Manual fallback and frozen instructions | PASS denied-API fallback, quantity Update/Keep restores coherent amount/memo/count/heading; no camera move |
| Account reassociation / first Join | PASS all3 widths: From person opens reassociation; same account retains camera; different payer invalidates old action without unsolicited NEW; explicit Join prepares bare `NEW 225 1` / `1 ICP` automatic site, no guaranteed cell |
| Warning / inspection / Help | PASS exact additional-Build/Move sentence, calm blue note, native reachable narrow scroll, selectable full principals; fee separation in Help, no routine fee row |
| War Cry unavailable | PASS editor hidden and all actual payment memos bare under certified Rules7; no local speech fabricated or clearance claim |
| Exact mobile pose | PASS actual cannon0 and exact camera3.6575453715563526,3.6575453715563526,64 at347.15°;130×46 quantity dock;304×296 panel at8,221 |
| Heading/input coverage | PASS original8headings,72-step full sweep,52 adjacent states, native quantity keys/tap/hold, arrow drag, instrumented pinch, held-press resize fence, contraction/reopen |
| Startup beforeH+1 | PASS all3 contexts displayed motion under initial heads9609/9610/9611, latest financial reference distinct from earlier presentation; no fabricated motion |
| Read outage/recovery | PASS browser-only24s503 query fault, unsafe copying disabled, same session/clock/queue/camera/draft, no verified-endpoint overrun, automatic recovery,0px panel drift |
| Camera / controls | PASS selection without focus, explicit Focus, actual min/max zoom disabled controls, legal default Move/Build, Move arrow, Build silhouette, native ball selection/follow/click-away and minimap navigation |
| Audio | PASS enabled intent, single control, native output after actual same-window5/35/8s tabs, two-tab ownership, exhausted audio delivery recovery without toggling, saved mute |
| Accessibility | PASS320 reduced motion and350px contracted first-Join scroll; native narrow warning scroll and full-address reveal; actual text-zoom shortcut is NOT VERIFIED where browser context did not change |

See [panel/copy/reconnect evidence](results/live-controls-ready-event.json),
[independent quotes](results/quote-verification.json), [startup details](results/startup-summary.json), [sampled playback bounds](results/live-playback-bounds.json),
[original mobile pose/input](results/critical-mobile-instrumented.json),
[entry/reassociation](results/live-entry-bounded-ready.json), [native audio](results/live-audio.json),
[accessibility](results/live-accessibility.json), [ball/minimap](results/live-following-native.json)
and [capture gallery](GALLERY.md).

First verified-world observations were4.708/3.837/3.453seconds. Historical playback
acquisition used2 extra requests and16,913bytes in each,389–535ms, and actual
positions changed while the initial accepted head remained unchanged. This proves
this observation window's no-H+1 path, not a universal mainnet latency guarantee.
Native music output returned after approximately3.89/4.40/4.26seconds in the
5/35/8second cycles. These are software stream/energy observations, not physical
speakers, headphones or subjective listening.

## Failed attempts and corrections to instrumentation

- The first full mobile attempt timed out at the final pinch heading-equality
  check. The exact pose, all headings, quantity targets and prior gestures had
  passed; the widget stayed visible. The original expected pre-pinch angle was
  not saved, so its cause is UNPROVEN. Three focused current and three prior-
  frontend controls preserved heading. A full instrumented repeat passed the
  unchanged assertions, including pinch/resize/reopen. No application bytes were
  changed. Retain this intermittent native-test limitation; do not label its
  root cause proven or replace it with a blanket no-failures claim.
- An initial native recipient-copy check failed while its screenshot showed
  reconnecting. That harness did not record readiness at the copy event. Ten
  ready-state copies subsequently returned exact full principals. A controlled
  read-only outage proved that the real native-copy guard deliberately returns
  empty text/unavailable feedback while unready, then restores exact copying.
  The final journey checks readiness at the event and requires exact bytes if
  ready, empty protected output otherwise, with bounded recovery. The original
  event state remains unrecorded; the guard explains the reproducible class,
  not a claimed retrospective certainty about that first event.
- Entry instrumentation initially required stale hidden markup to be empty,
  then contained an erroneous expected backend suffix(amynq instead ofamyna).
  Those were test mistakes. Actual recipient remained correct. Another immediate
  Join assertion ran while its verified-data continuation was still pending.
  Final tests require the real bounded continuation to resolve and verify active
  proposal state, preserving no-purchase-while-unknown safeguards.

[First pinch failure](failures/critical-mobile.json), [pinch controls](results/pinch-diagnostic.json),
[first copy failure](failures/live-controls-permitted.json), [event-level copy/protection](results/copy-diagnostic.json).
Raw attempt logs and exact instrumentation are retained under logs/ and instrumentation/.

## Performance, limitations and rollback decision

P09 remains FAIL/unqualified, accepted only for the existing controlled prelaunch
trial. A shared software-renderer live ON/OFF/OFF/ON sample was slow: enabled
p95≈1083/750ms versus muted≈417/383ms. A bounded old/new/old control was also
unstable: enabled p95≈350/467/483ms, muted≈450/633/533ms. Later prior-frontend
frames were as slow as the candidate; active local PocketIC workloads were
observed and left untouched. This is INCONCLUSIVE for incremental overhead or
a new candidate-specific regression; it is not a performance pass.
[Actual live sample](results/live-cost-quiet.json), [bounded controls](results/bounded-performance-control.json).

Physical phones, Firefox/Safari/iOS/Bluetooth/headphone listening and representative
hardware performance remain NOT VERIFIED. BFCache is not newly qualified; the
previous media-capture route was BLOCKED. The current real world did not supply
all dormant/multi-cannon/nondefault-subaccount/enemy-pressure scenarios; do not
substitute controlled fixtures for absent live cases. No future activity or
payment was manufactured. Sustained follow motion was not separately isolated
from its native selection/click-away behavior.

No demonstrated serious new frontend regression required rollback; the exact79
installation is retained for owner playtesting. The unexplained initial pinch
timeout and readiness ambiguity remain visible limitations. If a serious defect
is found, use [ROLLBACK.md](ROLLBACK.md), never a backend operation.
Previous78-file rollback JS3ee92eee…/inventory46067574… remains complete at
`.work/approved-panel-war-cry/rollback/frontend`; current79freeze remains separately
retained at `.work/approved-panel-war-cry/frozen/frontend`. The new combined-rule
compatibility candidate must NOT replace either staging or production without a
separate future frontend approval.
