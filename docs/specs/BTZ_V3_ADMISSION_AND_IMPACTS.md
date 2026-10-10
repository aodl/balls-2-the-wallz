# BTZ v3: admission and causal wall effects

Status: implemented, executed offline reference rules for S03. Not a finalized real-money protocol. Rules/configuration/schema identities all change from S02. The unchanged [v2 specification](BTZ_SMALL_BOARD.md) applies to the historical `btz-v2` kernel, not this version.

## State and numerical contract

Keep S02's four-connected board, integer motion equations, exact rational grid-crossing times, cannon-cell solidity, area-time scoring and half-open segments. Each live cannon owns at least one ball. A cannon losing its last ball dies and its remaining territory becomes neutral. Earned account credits survive death.

World version 3 additionally stores monotonically increasing `next_cannon_id`, `next_strike_id`, and a bounded `pending` strike list. A pending strike is a gameplay effect, not host scheduling state. It survives publication and checkpoint transitions. IDs never wrap or reuse a dead cannon's seniority. Ordinal exhaustion rejects admission or halts a segment before publication as specified below.

The reference supports boards up to 32 by 32 cells, 32 live cannons, 64 total balls and 32 balls per cannon. These are test-envelope constants, not promised production capacity. Initial joins cost 1,000,000,000 e8s; the additional-ball curve remains `10,000,000 * active_count^2` e8s. MOVE costs 10,000 e8s in this test configuration. One ANGLE operation creates at most one ball; excess payment is retained, not converted to bulk ammunition.

## Exhaustive, resumable spawn admission

An ANGLE from an account with no live cannon attempts creation. A MOVE from such an account is rejected as `NO_CANNON`. Underpayment, cannon/ball capacity, exhausted ordinal space and account-score capacity are checked before placement search.

A valid patch is the centre cell and its eight surrounding cells: a 3 by 3 square wholly on the board. It cannot contain any live cannon. Its **closed geometric rectangle** cannot contain any live ball centre, including a centre exactly on a patch edge. Testing only the ball's sided grid-cell field would miss that boundary case.

For each affected owner, remove the proposed patch in scratch only and search from that owner's cannon. Every remaining owned cell must remain connected to its cannon. An invalid candidate changes no cells, deletes no balls and consumes no creation ordinal. Accepted creation atomically changes exactly nine ownership cells, inserts the new cannon and inserts its initial ball. No severance windfall is awarded by spawning.

Candidate preference classes are, in order:

1. Directed live-owner/live-owner frontier locations.
2. Directed live-owner/neutral frontier locations.
3. Interior centres whose entire patch is neutral.
4. Remaining interior centres as a last fallback, including a completely occupied single-owner board with no frontier.

The last fallback prevents a monopoly board from permanently excluding new entrants when a safe nine-cell insertion still exists. It is an explicit S03 extension to the earlier neutral-only fallback sketch.

Each directed frontier chooses the patch centre on its originating side. The same centre can appear for multiple edges: this is **edge-weighted**, not uniform over unique cells, area, or players. Protection/eligibility exclusions also change the distribution. We do not claim economic fairness or resistance to grinding.

Compute a base seed from the canonical previous-state hash, canonical input-batch hash, logical start and the `BTZ-SPAWN-INPUT-03` domain. Derive the attempted join seed from that base, source position and next cannon ordinal. Rank each candidate with SHA-256 of canonical typed JSON containing `domain="BTZ-SPAWN-RANK-03"`, seed, class, centre and neighbor (-1 for an interior candidate). Order by class, rank, centre, neighbor. No private entropy or notifier timing is used. The exact preimages are fixtures.

Enumerating candidates, testing candidates, flood traversal and connectivity verification have durable continuation state. The current bounded candidate sort and fixed-size loops are not instruction-metered slices. Do not infer IC instruction safety from abstract work counts.

The search exhausts its candidates before returning `NO_ELIGIBLE_SPAWN`. Running out of a host slice never means no spawn exists. Later input commands wait until the current search finishes. Each accepted join changes the board on which the next search is evaluated.

### Admission-work bound and retained payments

At most **eight placement searches** start per segment in the test configuration. This counts unsuccessful exhaustive searches as well as successes. Further otherwise-qualified joins receive `SPAWN_SEARCH_CAPACITY`, not `NO_ELIGIBLE_SPAWN`. Underfunded and structurally invalid commands do not consume a search slot.

Both rejection classes retain the entire payment, as do the other documented invalid operations. This remains harsh, race-sensitive behavior: status is not a reservation. No real payments are authorized by the prototype. A future production configuration must expose and document this resource-admission limit conspicuously.

## Near-time annihilation without rewinding history

The v3 default uses a fuse of **1/16 logical tick** and an impact-position tolerance of **64/1024 cell** along the same grid edge. These are balance parameters, not measured optimal values.

When a ball strikes a capturable **opponent-owned** wall, it reflects immediately. Its chip is armed rather than applied immediately. Store ball/owner/defender IDs, original sided edge, impact position, impact time and inclusive deadline. The ball keeps moving normally; its motion equation requires no fractional positional nudge or pause.

A ball may have at most one outstanding strike. During that fuse, further physical wall impacts still reflect but do not arm another chip. This short attack cooldown bounds pending effects to the ball count. It is deliberate gameplay, not an accidental queue overflow policy.

An opposing unarmed ball striking the same edge in the reverse direction can pair with the pending strike if its impact position is within tolerance and its arrival is no later than the pending deadline. Both balls disappear at the **second actual arrival**, and neither paired strike captures territory. Already completed captures are never undone.

At an exact timestamp, freeze eligible incoming strike targets and include current valid pending strikes. Sort by undirected edge and ball ordinal; greedily pair reciprocal compatible strikes in that order, at most one pair per ball. Pairing applies independently of cannon seniority. A compound corner nominates only its single row-major capturable target for pairing and arming. The general corner reflection/no-diagonal-leak rules remain.

After pairing cleanup, process surviving incoming motions in cannon/ball order. Uncontested neutral-cell captures remain immediate. Arm surviving eligible contested attacks. **Only then** process pending expiries at that timestamp, ordered by cannon ordinal, ball ordinal and strike ID. Arrivals exactly at a deadline can therefore annihilate before the expiry chips a cell.

At expiry, recheck that the ball and cannon live, the source cell still belongs to the attacker, the target still belongs to the recorded defender, and the target is not now a cannon cell. An invalidated strike is cancelled, not redirected to a different owner. A valid strike captures the target and runs the ordinary severance/destruction cascade. Removing a ball removes its outstanding strike. Paired-ball cleanup does not transfer the residual territory: cannon extinction neutralizes it.

These semantics do not attempt to predict a ball's hypothetical future path through walls already changed by other events. They are causal, with a visible immediate bounce and a small delayed territory effect.

## Segment boundaries and moves

Segments are `[start,end)`. A pending deadline or incoming collision exactly at `end` belongs to the next segment, after that checkpoint's commands. Pending state appears in the committed snapshot, not merely the transient cursor. A MOVE onto a strike's target can protect it before expiry. This is strategic and replayable, not a timer-order accident.

For no intervening commands, splitting an interval at an integer checkpoint produces the same final world as running it whole. Per-segment event sequence numbers and per-segment accounting deltas naturally differ; tests compare the appropriate world or entire unsplit output, not a false claim of identical per-segment packaging.

MOVE may place the cannon over an existing own ball. A ball inside a cannon cell may exit; subsequent entry collides. New balls start at the cannon cell centre with the chosen integer heading. A renderer may conceal their initial exit inside a launch animation.

## Work optimization and authoritative equivalence

Cached area counts are rebuilt after ownership mutations, not every grid crossing. A local 0/1 defending-neighbor check avoids an unnecessary full cut search. Both optimizations have slower selectable reference modes. Cache flags affect work and scratch bytes, never canonical world/events/scores. Differential tests enforce that distinction.

Bounded canonical-JSON size, event limits, arithmetic constraints and ID exhaustion still can halt work. The host must preserve the last committed head and diagnosable pending stage; it must not publish an incomplete board or pretend a paid command was never ingested. Whole-world JSON is an offline conformance representation, not a production stable-memory plan.

## Audit and implementation boundary

The JavaScript state machine executes these rules. Independent Python masked union-find fixtures test spawn selection, and independent closed-form Fraction fixtures test facing-ball timing and scores. Full JS trace goldens additionally detect regressions but are not an independent proof.

Rust source now includes exact centre masks, hash preimages, candidate enumeration, resumable masked search and bounded opposite-strike matching. It is still not the complete v3 world/cursor/event/scoring port, and it has not been compiled here. A complete port must preserve arbitrary-precision area-time, or explicitly version a different approved scoring rule; silently truncating to i128 is not conformant.

### Input representation for deterministic placement

Before hashing the selected input batch, each envelope is normalized to precisely
`{position: bigint, payload_hex: canonical_lowercase_hex}`. Uncommitted adapter
metadata is discarded; equivalent numeric source-position encodings cannot alter
placement. This is enforced by both shared runtime entry points and the direct
BTZ constructor. Range membership is additionally enforced against the seal by
the runtime; the direct synthetic constructor is not a replacement for ingestion.
