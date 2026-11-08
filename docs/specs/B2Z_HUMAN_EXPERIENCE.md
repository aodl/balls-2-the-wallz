# B2Z human experience

This is the normative human-interface contract. It supersedes the screen layout,
toolbar, dialog, reporting and live-pause requirements in earlier observer and
human-interface documents. Historical evidence remains evidence of its own release.
The financial/game contract remains [B2Z_APPLICATION](B2Z_APPLICATION.md).

## Contracts and regression map

| ID | Required behaviour | Maintained implementation / regression evidence |
| --- | --- | --- |
| UX-01 | Arena first; no declaration or compulsory dialog to observe. | `index.html`, `arcade.mjs`; integrated browser journey |
| UX-02 | Controls serve the current task; secondary detail is progressive. | `arcade.mjs`; contextual action browser matrix |
| UX-03 | One nonmodal shared panel; no stacked dialogs or duplicate paths. | `shell.mjs`, `index.html`; navigation/focus browser journey |
| UX-04 | Navigation never pauses, resets, drains or restarts live playback. | `app.mjs`, `observation-loop.mjs`; `ux-playback.test.mjs`, clock/queue browser journey |
| UX-05 | Presentation never exceeds verified coverage. | `model.mjs`, pinned DTR clock; actual-clock and authenticated delivery regressions |
| UX-06 | Producer, delivery and presentation states remain distinct. | `experience-status.mjs`; status truth table |
| UX-07 | Verified backend principal/default account is primary; legacy is secondary. | `identity.mjs`, `arcade.mjs`; destination derivation and clipboard bytes |
| UX-08 | Copies share one frozen amount/recipient/payer/memo/action binding. | `handoff.mjs`, `arcade.mjs`; edit, denial, manual copy and reload regressions |
| UX-09 | No transaction reporting/index entry; instructions are not payment evidence. | `handoff.mjs`; legacy migration, account history and browser absence assertions |
| UX-10 | Exact prices, fee, retention risk and restrictions at the handoff. | canonical `quoteV6`, wallet panel; narrow-screen field and legality checks |
| UX-11 | Accessible/reduced-motion UI retains essential live updates. | semantic panel, `shell.mjs`; keyboard, zoom, reduced-motion browser checks |
| UX-12 | Bounded presentation-only isometric projection; correct toroidal interaction. | `camera.mjs`, renderer/effects; round-trip, seams, displacement and performance checks |
| UX-13 | Paid state, scoping, financial integrity and authentication survive releases. | unchanged backend, certificate pipeline, scoped storage; release before/after identities and existing finance/security suites |

Every change to a control, flow, status label, payment handoff, renderer or playback
lifecycle must name affected UX IDs, update intentional changes here, and run the
corresponding regressions. A screenshot is not behaviour evidence.

## Screen and controls

The screen contains the arena, B2Z / quiet “on ICP”, one status button, account chip,
contextual Join or My cannons, and a small camera group (Overview, Zoom out/in).
Help is secondary. No unavailable network selector, permanent action rail,
onboarding modal, live pause/restart/download controls or payment-report workflow.

Desktop has one docked nonmodal panel; mobile uses the same panel as a bottom
sheet. The background remains interactive, so the panel must not claim modal
semantics or trap focus. One panel scroll; no nested field scroll containers.
Opening a panel does not seize the camera. Explicit Locate is a camera operation.
Close/Escape returns focus and removes a local preview, never a saved instruction.

| Context | Control/result |
| --- | --- |
| Visitor | Observe; Account or Join requests a local sending-account declaration. |
| Account without cannons | Join → first-cannon instructions in the same panel; one included ball; automatic first site. |
| Own active cannon | Fire opens local heading/quantity editing; Move selects a canonically legal board cell; Build shows legal adjacent sites. |
| Own dormant cannon | Revive replaces Fire; brief expiry/restriction reason; canonical eligibility still applies. |
| Opponent cannon | Compact inspection only. |
| My cannons | Hidden without cannons; one centres directly; several open a compact chooser. |
| Overview / zoom | Camera only, fixed orthographic projection; pointer/pinch anchoring and keyboard alternatives. |
| Account | Sending declaration, Change/Forget, own cannons, saved instructions and recent verified account outcomes. |
| Close / Escape | Close panel/clear preview; no transfer cancellation or playback side effect. |

Hide irrelevant actions. Disable a relevant temporarily unavailable action with
one accessible concise reason. Never replace all explanations with disabled icons.
Financial/gameplay actions have visible labels; camera icons have names/tooltips.

## Accounts and wallet instructions

One input accepts canonical principal, ICRC textual account or checksummed legacy
AccountIdentifier. Explicit subaccount is advanced. Do not infer a principal from
an AccountIdentifier or treat a wallet's displayed owner as its actual sender.
Remember valid public declarations locally when available; storage failure does
not block use or claim persistence. Change and Forget are Account actions.

Verify owner plus the default subaccount derives to the certified receiving
AccountIdentifier before showing principal-only instructions. A mismatch disables
preparation. Never substitute frontend/Ledger principals or a hard-coded address.
Nondefault receiving accounts require their complete ICRC representation.

The wallet panel exposes Amount (exact ICP), Send to (principal/default account),
Memo (canonical readable text), From (declared actual payer), Copy controls and
“Wallet fee extra. Payments and unused ICP are kept; no automatic refunds.”
Legacy address and identical memo bytes in hex are secondary disclosures.
No Prepare → Confirm → Report chain. Editing and wallet instructions share a panel.
Canonical quote helpers are the sole price/legality convenience implementation.
Partial quantity is described as “Up to N”; no guaranteed fulfilment or refund.

First successful copy freezes the complete binding. Later copies use that packet,
including when live prices change. Editing requires an inline Update instructions /
Keep previous decision before replacement values become copyable. A denied copy
shows exact selectable text, claims no success, and explicit manual handoff freezes
the same complete packet. This prevents paying an old amount with a new memo.
Account/backend/target changes cannot silently retarget a copied packet. Closing
or reloading retains bounded scoped history; old instructions are historical, not
reservations or a recommendation to pay/resend. Missing targets retain warnings.

Saved instructions and verified account outcomes are separate. Neither copying nor
an old reported index proves payment. Migrate reported records to unknown local
history; never heuristically associate receipts by amount, payer, timing or index.
Cached receipts are explicitly historical, not freshly verified. No automatic
receipt association is possible with current receipt fields.

Standards: [ICRC-1 accounts/memo](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/README.md),
[canonical textual accounts](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/TextualEncoding.md).
Standard support does not establish a wallet's UI compatibility; report actual
no-transfer wallet coverage separately.

## Status and live lifecycle

One resolver drives indicator, details and preparation gating. Certified facts:
configuration, source/destination, entities and authenticated trajectory/time.
Operational observations: run/pace, health, treasury and source-worker queries.
Local facts: verified-delivery age/errors, clock/queue, visibility and renderer.
Do not describe operational telemetry as certified game state.

Precedence: authentication/render failure → unavailable/stale delivery → observed
operator stop → protection (Refuelling only with actual pending treasury evidence)
→ empty/dormant idle → presentation resynchronising/waiting → advancing Slow/Live.
An unchanged head with a fresh valid certificate is not stale. A successful fetch
alone is not advancing motion. Retained verified motion may finish after a
producer stop; details explain that distinction. A depleted presentation queue at
slow production says “Waiting for next update · slow mode”, never simply Slow.
No speculative countdown. Ordinary buffering does not close admission; missing
verification/configuration/source binding or real admission failure does.

Observation/status scheduling is independent of rendering and panels: bounded
single-flight operations, generation/abort fencing, backoff and teardown. Hidden
tabs may suspend. Returning refreshes verified information; a substantial gap uses
the authenticated recent-snapshot path rather than long fast-forward playback.
Retained-gap recovery remains bounded; no weakened continuity/anti-rollback.
Camera/valid selection survive; cosmetic history resets at discontinuities.

Planning reads latest verified state, while presentation advances separately.
It never recreates the clock or discards the queue. One usable complete low-rate
interval can start immediately. At Trickle, one tick still represents about 100
seconds of production scheduling; removing an extra interval cannot remove that
cadence. Idle terminal coverage drains without inventing future simulation.
Reduced motion suppresses cosmetics, not live updates. Old live-pause preferences
are ignored narrowly; replay controls/preferences remain separate.

## Projection, effects and budgets

Fixed orthographic isometric projection; game remains 2D. Drawing, picking, aim,
preview and camera share one invertible ground-plane mapping. Pointer headings
are computed in world space. Wrapped copies keep one logical identity. Use shortest
toroidal displacement; never change canonical coordinates/memos/physics precision.
Tap differs from pan/pinch; accessible numeric heading and destination alternatives
remain. No ordinary orbit or perspective controls.

Matte shallow tiles, coherent ownership, volumetric bases/turrets/barrels and solid
spheres with shared lighting/contact shadows. Local aim uses a distinct short
ground guide. No long default ball tails or perpetual bobbing. Any passing-tile
highlight is bounded, wall-clock fading, secondary to ownership and derived from
displayed world displacement. Stationary balls, camera movement and resync create
no travel effect. Reset on spawn/discontinuity and suppress with reduced motion.

No million-object graph, million-cell per-frame scan, per-ball dynamic shadows or
unbounded effects. Share geometry/materials, instance visible tiles/entities, use
overview LOD and bounded cosmetic state. Cap DPR at 2; explicit context loss/error,
recover renderer without replacing verified session; dispose resources on teardown.

Copy/layout budgets: arena has at most one primary status sentence, no persistent
technical paragraph; action context at most one concise restriction; wallet keeps
the mandatory five fields and retention/fee warning visible in its single scroll;
technical addresses wrap/select without truncating clipboard bytes. Primary touch
controls target 44 CSS px. Financial warnings are an explicit copy-budget exception.

Performance targets (not claims): desktop 60 fps, physical phone 30 fps; measure
p50/p95 frame time, interaction delay, heap, draw/instance counts and verification
interference on populated journeys. Release report records measured budgets and
environments, including viewport versus physical-device limits. No maximum-world
qualification is inferred from a small fixture or an empty production screenshot.

## Review and release checklist

- Reject unnecessary permanent controls, duplicate messages, ordinary developer
  concepts, hidden playback side effects, unsupported payment-success claims and
  unmeasured render complexity.
- Test contract matrix semantically: actual clock/queue, exact clipboard bytes,
  canonical legality, keyboard/focus, reduced motion, seams and context recovery.
- Desktop, 390×844, 320×640, zoom and software-keyboard viewport checks; populated
  rendered recordings include copy/edit, repeated panels, slow wait/resume,
  hidden return and wrap. Label synthetic, certified disposable and production.
- Preserve paid backend and financial/authentication suites. Follow installed-game
  [operator procedure](../operations/S14_OPERATOR.md), frontend-only; retain prior
  immutable assets/manifest. Never replay historical fresh installation commands.
- Freeze clean exact source/assets, all six substantive exact-source CI jobs,
  verify every served manifest file, CSP/security headers and backend preservation.
- Report actual wallet/device/human-research/receipt-association limits honestly.

Execution evidence and final measurements belong in
`evidence/B2Z/minimal-isometric/REPORT.md`; this specification is maintained policy,
not a claim that every target has already passed qualification.
