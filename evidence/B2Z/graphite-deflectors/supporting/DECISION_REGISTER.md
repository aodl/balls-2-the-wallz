# Decisions: agreed intent versus candidate engineering defaults

This register prevents ideas introduced by the implementation brief from being misrepresented as previous owner approvals.

## Agreed by the owner

- Elegant, minimal, cool/premium physical look.
- The selected armoured cannon and square-mounted directional wedge reference family.
- Structures actually centred/aligned on their own tile and lightweight to render in numbers.
- A coherent payment HUD using the approved layout, adapted to the same material/theme.
- Light accents based on player/territory identity rather than universal lime.
- A new separate action button for constructing Deflector/arrow tiles.
- Direction chosen when constructing; balls entering the tile turn to that direction, at a point/time depending on entry. This is not a conventional reflected outgoing angle.
- Existing payment-driven authoritative-game architecture and the earlier minimal-UI requirements.

## Already-established contracts preserved by this brief

- Read-only shared panel, aligned dividers/Copy column, From person icon, full canonical clipboard values.
- Real cannon selection does not focus automatically; explicit Focus remains.
- Supported quantity/War Cry editors remain available in reserved space, including narrow layouts.
- Cosmetic text affects speech, not gameplay seed outcomes.
- Certified active rules/configuration determine supported financial commands and legality.
- Existing combined Rules11 features are retained, not traded for the new feature.
- No production mutation or release authority from this new development brief.

## Provisional v1 defaults — implement/test, then present for production approval

| Item | Candidate default | Why / qualification |
|---|---|---|
| Deflector footprint | Low square-aligned base, rotated wedge contained inside the tile | Directly supports the selected art; exact dimensions are engineering targets. |
| Gameplay contact | Midpoint in time of the incoming straight chord across the tile | Path-dependent, covers every positive-duration traversal, cheap candidate; not a previously approved final collider. |
| Scope of effect | Qualifying legal ball residence in an owner-held tile | Does not bypass existing territorial reflection/capture or convert enemy balls. |
| Placement | Empty own tile in eligible active owned island, four-cell enemy clearance | Avoids free expansion, arbitrary hostile traps and conflict with combined clearance. |
| Placement occupancy | Reject if cannon, Deflector or live ball occupies tile | Avoids retroactive triggers under a ball; needs precise processing-time ordering. |
| Lifecycle | Fixed heading; remove on loss of tile ownership or clearing/pruning; no rotate/sell/move in v1 | Smallest coherent first feature. Removal is authenticated; no implied refund. |
| Strategic role | Not a cannon, not an island anchor, no ball or new territory included | Keeps cannon/territory economic model intact. |
| Price | Flat 10,000,000 e8s (0.1 ICP) in disposable candidate config | An explicit test value, **not approved live pricing**. Retained-payment semantics unchanged. |
| Capacity | 16/player, 256/world in candidate config | Bounded starting point; profile and seek final review. Do not change existing cannon/ball caps. |
| Command | `DEFLECT <cell> <angle>` under a new supporting parser/capability | Clear new operation; cannot be confused with old NEW. No War Cry suffix. |
| Visual audio | Small verified contact glint; no new audio by default | Avoids another audio-performance programme. Optional neutral cue only inside existing budgets. |
| Cooldown/rearm | One per qualifying residence; stronger simulated-distance/time guard only if progress proof needs it | Do not silently introduce missing turns or use real-time timers. Any guard is an explicit rule choice needing review. |

## Engineering decisions that must be resolved and documented before freezing

1. Exact bounded trajectory representation for interior arbitrary-heading turns.
2. Equal-time interaction ordering and pending-event invalidation.
3. Progress proof or explicit rearm policy for degenerate loops.
4. New schema/adapter/rules identities and compatible migration from the actual intended predecessor.
5. Final model/LOD/batch budgets justified by actual renderer statistics.
6. Cost/cap balance supported by normal routing and deliberately adversarial loops.
7. Rule transition and compatible forward-recovery boundary, including durable writes during preparation.

A successful visual review is not approval of provisional economics or physics. A source/CI pass is not production activation. Do not ask for a series of minor approvals during development; return these decisions in one coherent release package.
