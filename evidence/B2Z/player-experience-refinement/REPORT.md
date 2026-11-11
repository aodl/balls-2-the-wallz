# B2Z player-experience refinement — final local qualification in progress

The ordinary frontend correction is implemented. The final proven-trajectory
Normal-frame correction is being frozen after its executed failing/passing test. **It is not deployed. Hosted six-gate
qualification is BLOCKED by absent GitHub Git credentials**, not assumed green.
The ordinary push returned `could not read Username for https://github.com`.
Local final source, populated browser and performance closeout is in progress;
this lead will be reconciled with the actual completed results.

## Starting identities and boundaries

Started clean on `release/btz-prelaunch-playability` at
`5279625a2ff913f3a8067896c0c00344ac394c10`, an evidence-only descendant of remote
`38e9cfbca9099fab246daf566c4a1f35cc011c95`. Both remote heads were refreshed
before editing and again before attempting the ordinary push. Optional financial
remote remains `38987fe84813ddb6b8cceef293dd42a98fd64985`; its independent local
worktree/evidence commit `bc06b15` is preserved. No feature code was merged.

[All fifteen actual production files](starting-production.json) still matched the
ordinary deployed runtime `662f9052bbb4235b2739df12646de66eca10dfbd`, JS
`79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a`, full manifest
`68116ceeb93935b9be851bbe894fdd208cde71c4f4cc2a508d4fb9b524f0cb03`.
The current website remains https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
Backend `s5ir5-gqaaa-aaaas-amyna-cai`, frontend `s2jxj-liaaa-aaaas-amynq-cai`:
no deployment, install/upgrade/reset/start/stop, controller/setting/financial action
was executed in this corrective pass. Ledger-only play and disabled ICRC-2 remain.

## Finding dispositions

The maintained [UX contracts and UXR regression map](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
retain UX-01..13. Each finding below has a source correction; final acceptance
results and genuine environment limits are recorded separately.

| Finding | Disposition | Correction and evidence |
| --- | --- | --- |
| UXR-01 | Fixed | Frozen canonical target/context/identity/revision/gesture; revalidate the original cell, never old pixels. Actual native pan/zoom/Focus/mode/occupied/removal/double-click journeys. |
| UXR-02 | Fixed | Immediate cannon selection plus useful conditional click-to-focus; three awkward locations per viewport. |
| UXR-03 | Fixed | Shared working composition, stricter screen tolerances, actual panel/map/chrome exclusion and settled Focus state. |
| UXR-04 | Fixed | Stable narrow placement; one usable scroll; keyboard contraction prioritizes the action and preserves visible source cannon. |
| UXR-05 | Fixed | Fixed 44px icon slots; body width/height independent of header; zero measured toolbar drift. |
| UXR-06 | Fixed | Rapid zoom multiplies pending destination, not intermediate pose; exact 48→94.08 two-step regression. |
| UXR-07 | Fixed | Actual projected speed selects bounded recent-travel retention; bright inner wake; partial segment trimming preserves fast-frame tails. Real .01/.05 samples and canonical Normal-rate controlled regression. |
| UXR-08 | Fixed | 450ms hold then 1.75s linear fade, 20% darkening, 128-cell bound; no atlas mutation. |
| UXR-09 | Fixed | Arena-first aim/placement; small heading, quantity stepper and optional cell/site precision controls. |
| UXR-10 | Fixed | Aligned compact rows, dominant amount, named 44px copy icons and complete exact clipboard bytes/payer. |
| UXR-11 | Fixed | Removed generic wallet-copy paragraph and duplicate placement/quantity paragraphs; included ball/partial quantity beside their values. Exact relevant risk and separate fee retained. |
| UXR-12 | Fixed | Controlled smoked translucency/local blur, readable value backing, solid reduced/unsupported/forced-colour fallbacks. |
| UXR-13 | Fixed | Explicit measured-height, opacity and padding transition; actual 0/mid/end height sample and stationary header. |
| UXR-14 | Fixed | Short accumulated classic wheel transitions, coalesced magnitude preserved; fine/ctrl trackpad deltas direct. |
| UXR-15 | Fixed | Ball highlight and follow entry immediate; old pending-ball delay/state removed. |
| UXR-16 | Fixed | No-op max zoom tested before clearing follow; native double-click preserves existing follow at the limit. |
| UXR-17 | Fixed | Real selected cannon owns toolbar/Focus; two Build sites change only ghost/guide/quote. |
| UXR-18 | Fixed | Rebase on meaningful circular displacement, focal loss, relocation/identity; stable small captures and deterministic fallback. |
| UXR-19 | Fixed | CSS-coordinate diamond with DPR backing up to 3, 512 dimension/262144-pixel cap; atlas/inverse unchanged. |
| UXR-20 | Fixed | Light 76px ring, 22px visible handle, retained 44px hit target and depth-tested wide guide. |
| UXR-21 | Fixed | Viewport-aware 64–88 working scale and useful composition; no global model/hitbox enlargement. |
| UXR-22 | Fixed | Quieter analytically filtered grid; genuine ownership edges and exact atlas retained. |
| UXR-23 | Fixed | Solid source footprint, thin hover, octagonal destination, invalid cross and wire ghost are shape-distinct. |
| UXR-24 | Fixed | Routine Waiting uses compact primary status; central treatment only genuine catch-up, smaller and nonblocking. |
| UXR-25 | Fixed | Distinct Revive glyph; accessible names/pressed states, native titles and one ephemeral keyboard/long-press hint; relevant disabled reason. |

## Confirmed reproductions and corrections

The source-bound baseline retained under `.work/player-refinement/baseline` is
runtime-identical to the deployed ordinary source. Its actual native pointer
probe reproduced **click 452577 → delayed selection 453576 → MOVE 1 453576**
after camera motion. Corrected tests retain **452577** through pan/zoom or cancel
safely on changed context. A later publication occupies the original site and
blocks copying instead of choosing another tile. Cannon removal, mode switch,
Focus and native double-click also fence the pending gesture.

Native event traces exposed an additional slow-rendering edge: Chromium could
emit a double-click after delayed processed timestamps passed the local pair
window. Native double-click recognition now cancels pending placement; no commit
runs while another pointer is held. This fixes the operation rather than raising
an unrelated runtime budget or delaying every ordinary click.

Baseline Fire toolbar drift measured `[0,27.5,55,82.5,110]`px at desktop; corrected
controls remain stationary through expansion. At 320×640 this replica measured
186px viewport / 483px content (the review's 71px result was another placement,
not relabelled reproduced here); the correction measures 245px / about 356px.
Financial font/hit sizes were preserved, warnings not hidden. Awkward locations,
actual 300px/430px viewport contraction and landscape receive separate checks.

The old short tail and squared wake fade were real: first corrective captures
still looked too faint. Projected-speed retention was increased based on actual
samples. Normal canonical speed additionally exposed deletion of a whole segment
just beyond the pixel budget; trimming its travelled oldest portion fixes this
without inventing future path. [Original failed/incomplete records](development-records.json)
remain available. Earlier release reports/goldens were not rewritten.

## Implementation and preserved contracts

Focused maintained changes: `interaction.mjs` immutable intents; `shell.mjs`
gesture/anchor/layout ownership; `camera-controller.mjs` composition/accumulation;
`player-anchor.mjs` meaningful revision invalidation; `minimap.mjs` bounded DPR;
`motion-effects.mjs` real-travel history and independent hold/fade; `render.mjs`
quiet grid/distinct previews; `arcade.mjs`, HTML/CSS compact instrument surface.
The existing observer/session/clock, DTR, canonical quote/memo/physics/economics,
Ledger adapter, backend/Candid and dependency locks were not changed.

First successful copy still freezes amount/recipient/payer/memo/target; edits need
Update/Keep, denied clipboard offers exact manual copy, and saved instructions are
not payment evidence. Modern principal/text only; no legacy/hex/reporting/signing
control. Selected Move/additional Build warning is exactly:

> If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.

`Wallet fee extra.` remains separate. Fire/Revive/Join keep ordinary retention
risk. Same-cell Move guard and valid eligible cell zero remain frontend-only;
no new on-chain rejection or refund guarantee is claimed.

## Earlier clean comparison freeze — superseded by Normal-frame correction

[Comparison manifest](frontend-files-23e4ebe.json), [comparison provenance](build-manifest-23e4ebe.json).
Sixteen files: fifteen public assets plus consumed `.ic-assets.json5`.
Runtime source **`23e4ebec619e5a2e8d42982959f6e2a175f121e8`**;
JavaScript SHA-256 **`2b731a35a744b78ad963a1fd9aa95fb9443c8d241429fc69c3af780a3e340ddc`**;
complete manifest SHA-256 **`1d2ffe97d34ccbeabb2c2f67c4451cc3087ff7e297108327e5ab1b9e313381ba`**.
Comparison directory `.work/player-refinement/frozen-final/frontend`; source_dirty=false;
no experimental payment/auth module in the build input graph. Earlier `195db31`
freeze remains preserved as superseded development evidence after demonstrated
keyboard/expansion corrections; it is not silently substituted as final.

Final local results, media/performance and six-gate publication status follow in
this same report after execution. **Do not deploy from this in-progress record.**

The 23e4ebe comparison freeze above is retained unchanged, not the final release
artifact. Real warm Normal playback showed that the conservative >2-cell reset
can drop legitimate straight frames. The final implementation accepts only a
travelled suffix with unchanged verified vx/vy/x0/y0, retaining the fail-safe reset
for changed trajectories. No physics, endpoint, authentication or paid state is
modified. A new explicit clean artifact identity will follow for this source change.
