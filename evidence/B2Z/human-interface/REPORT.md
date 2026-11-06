# B2Z human-player workspace — local candidate; publication blocked

Implemented a working board workspace and froze the frontend-only candidate at
`9820380613aeb45652785e6351a77c7e728e515e`. The active branch was first fast-forwarded
from `baac5c1` to locally available merged master `0b4f8f5`. No other worktree was
modified; no additional unmerged frontend commits were found in local refs.
The implementation commits are `c81f681` and `9820380`.

**Not deployed.** Repository instructions leave remote Git publication user-owned.
The candidate is unpublished, so the mandatory hosted exact-commit CI gate cannot
run on it yet. This is the external release blocker, not an assertion that controller
credentials are missing. Existing frontend publication authority was not requested
again. No upload, backend installation, pause, transition, controller operation,
real payment or funds transfer was performed.

The concrete ready artifact is `.work/human-interface/frozen-assets/`.
[Complete frozen file identities](ready-files.json), [builder provenance](frontend-manifest.json)
and [security-header policy](security-headers.json) identify the exact candidate.
After the user publishes this source and its applicable hosted gates pass, the
existing asset-only observer procedure can publish these bytes to
`s45ab-wiaaa-aaaar-qcifq-cai`. Preserve/check this manifest when staging the files;
do not run the existing dfx configuration against stale `.work/s14/assets` or
substitute a later build. No backend deployment is part of this release.

## Working journeys

The shell renders immediately. First arrival has no compulsory Identify modal,
frames an actual cannon, and distinguishes verification, a verified snapshot and
buffered playback. Paused arrival offers exploration/identification for later,
without suggesting a payment or backend funding. Identity and Activity remain
at the top right; Fire/Revive, Move and New remain on the right rail.

Identify has explicit Principal/default-account and AccountIdentifier input modes,
advanced subaccount input, derived account preview, optional persistence and Forget.
Changing input modes removes hidden precedence. Identify resumes a pending tool.
Compatibility-sensitive account colours and existing scoped identity preferences
are preserved. Camera, minimap and motion preferences persist in world terms;
blocked storage leaves the session usable. Return restores inspection, selection
and camera, with unresolved handoffs in Activity.

Cannons can be selected directly, with inspection-only opponent selection and
ambiguous-hit choices. My cannons supplies an accessible secondary roster.
Fire uses a screen-space aim ring at the nearest toroidal copy, numeric direction,
keyboard adjustment and a dashed direction guide. Move and additional-cannon New
use legal board overlays and ghosts; the authoritative cannon remains present.
First New describes automatic placement under the verified rules, including the
rules-7 farthest eligible 3×3 policy. There is no arbitrary first spawn selector.
The existing canonical memo, integer-heading, legality and shared-island pricing
modules determine the real quote.

Quotes update locally without Prepare or per-control network requests. The first
successful clipboard/manual handoff freezes a coherent public packet, including
account, backend/network, target, quantity, amount, recipient, memo, rules, snapshot
and preparation time. Later edits require Replace/Keep; changed legality or pricing
blocks further copying until review. Concurrent clipboard operations cannot mix
packets. Denied clipboard access exposes exact manual text and never says Copied.
I've sent this and a transaction index remain tracking hints.

Activity keeps 32 public intents and 64 historical receipt records in scoped local
storage. Fresh verified receipts and historical cached receipts have explicit,
different labels. Partial fill quantities, used amounts, retained remainders and
rejection reasons are shown. Missing history stays unresolved; no automatic resend,
optimistic game entity or fabricated success is introduced. Existing forward-only
confirmed-state display remains available independently of animation delay.

## Simplifications

Removed the generic Play and View routes, hidden Prepare-button dispatch, global
cannon-selection dropdown, detached aiming panel, directional-button strip and
accumulated CSS override paths. The replacement has one explicit local interaction
state, measured overlay placement and bounded handoff/history storage. Players,
rules and technical diagnostics remain secondary views. The existing observation
stream, operational sampler, camera, renderer and verifier remain in use.

## Verification and evidence boundaries

Local exact-source checks PASS, including 1,720 JS tests.
The machine-readable [verification summary](verification.json) distinguishes the
exact-source local checks, disposable IC evidence, synthetic UI fixtures and live
read-only observations. Raw attempts, including failures, remain under
`.work/human-interface/`; no historical checkpoint evidence was rewritten.

- The five exact viewport journeys pass: 320×640, 390×844, 844×390, 768×1024,
  1440×900. Measured card/aim/rail rectangles do not intersect, targets are at
  least 44px, and portrait layouts retain the aiming control. Internal scrolling
  preserves readable payment fields. Minimap collapse does not overwrite its preference.
- Board selection, two own cannons, batch quote/target agreement, illegal move,
  automatic first placement, dormant revival, expiry, account switching, packet
  freezing, wallet return, manual clipboard fallback and cached historical receipts
  are covered by the synthetic widget runner. Its content is not IC authentication.
- A separate Tab/typing/Enter-only journey completes Identify → roster selection →
  angle/quantity → copy → Activity without pointer input or programmatic focus.
- The real HTTP regression suite passes browser-native Web Crypto, unchanged CSP,
  buffering, pause/recovery, finite verified playback and reduced-motion checks.
- The named S14 disposable-PocketIC test
  `empty_arena_initial_rejected_payment_wakeup_and_browser_closed_activation` passes,
  with 48 host tests passing. It proves its named Ledger/browser-independence
  behavior; it is not a new full v6 upgrade/ledger/cost qualification.
- Existing pure purchase execution produced a 1/2 partial fill using 0.1 ICP and
  retaining 0.05 ICP; the UI displays that exact result. Rejection and unknown-history
  presentation are also checked. No real payment or new full installed partial-fill
  browser experiment was performed.

The first broad source attempt recorded a 300-second Node timeout during concurrent
compilation. The completed follow-up passed, and the final cache change has its own
exact-source result in the verification summary. Earlier failed layout assertions
led to fixes for SVG visibility and narrow-screen ring/card overlap. An HTTP assertion
was updated from the retired replay wording to the current honest playback labels.
All original raw failures remain retained; no certificate/security predicate changed.

## Ledger-first authority

Production browser capture contains only query/read_state POSTs. One hundred local
angle edits caused zero requests. No login, wallet connection, signing, allowance,
deposit balance, payment submission, relayer, update-command call, session authority
or frontend payment prerequisite was added. Account declaration remains local;
existing wrong-owner/legality tests remain in the source suite. Clipboard, board
previews, clearing preferences and reporting sent cannot issue a game command.
The disposable IC test demonstrates processing without a browser or prior quote.

## Genuine screenshots and measured efficiency

| View | Before: actual served production | After: local candidate observing authenticated production |
|---|---|---|
| Desktop | [Before](before-desktop.png) | [After](after-desktop.png) |
| Mobile | [Before](before-mobile.png) | [After](after-mobile.png) |

These are genuine Chromium screenshots, not mockups. After images are **local**
assets and do not imply deployment. Production was in Reserve Protection during
both samples. Synthetic action screenshots are explicitly labelled separately:
[320px](synthetic-action-320x640.png), [390px](synthetic-action-390x844.png),
[short landscape](synthetic-action-844x390.png), [tablet](synthetic-action-768x1024.png),
[desktop](synthetic-action-1440x900.png).

[Observed comparison](observed-comparison.json) retains DOM size, unforced heap
point samples, ten-second frame intervals and request counts. Samples overlap
local verification load, so their differences are not a causal speedup or sustained
memory claim. No new polling service or million-cell DOM exists.
[Manipulation measurements](manipulation.json) record synchronous input-to-quote
handling, not settlement or complete visual response. The sub-100ms end-to-end
feedback target is not qualified: observed frame p95 exceeded 100ms on this busy host.

Observed point samples (before → after): 366 → 361 DOM nodes; 7082772 → 7806432 heap bytes; 18 → 19 query/read-state requests per ten seconds. These totals include the existing sampler and verification calls.

Reduced-height keyboard and effective 200% viewport simulations have nonintersecting
controls; actual soft keyboards/browser chrome/native desktop zoom remain device checks.

## Production preservation and remaining limits

Authenticated [before](before-metadata.json)/[after](after-metadata.json) reads show
backend module `cfcf6130432a040a40738627df65da65d0d5c57195c04d3bb147a848af6d8303`,
observer module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`,
both original controller sets and the same 34-node fiduciary subnet unchanged.
The observed rules/configuration/source identity, receiving account and certified
head remain the original production values in the comparison. No backend, DTR,
rules, agent, controller or financial-execution source was changed. Ordinary cycle
consumption continued; this is not a claim that every balance stayed numerically fixed.
[Still-served asset hashes](still-served-assets.json) confirm production retains the
previous frontend. Actual candidate asset publication, served-hash/CSP checks and
post-publication production journeys are **BLOCKED / NOT RUN**.

Current public receipts omit original memo bytes. Therefore the UI cannot safely
automatically unite a copied packet with a receipt, even if a reported index, payer
and amount appear to match. Instructions and verified outcomes remain separate,
explicitly qualified Activity entries for wallet comparison. Automatic association,
combined transfer/result entries and transfer/source-pending states lacking actual
authoritative evidence remain unavailable; they are never inferred from entity counts.
This is an unmet part of the requested seamless handoff, preserved as a limitation
rather than false success or an unauthorised backend/interface change.

No human participants were available. No human study or complete nonvisual spatial
accessibility claim is made. The small remaining [human task script](HUMAN_TASKS.md)
records discovery, targeting, duplicate-send intentions and status comprehension.
No sustained gameplay, strategy experiment or new 900-second qualification was run.
