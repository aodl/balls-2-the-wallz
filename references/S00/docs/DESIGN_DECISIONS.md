# Design corrections and decision register

The preceding conversation was architecture exploration, not a finalized protocol. This register prevents convenient shorthand becoming an unintended security guarantee. The following entries are proposed S00 decisions or required resolutions, not implemented features.

| ID | Subject | S00 position | Gate |
|---|---|---|---|
| D-001 | Replay inputs | Preserve checkpoint assignment/seals and effective configuration, not only ledger transactions | S01/S02 |
| D-002 | Bot fairness | Input horizons forbid changes to committed segments; they do not remove simulation/look-ahead or public-ordering advantage | Rules docs S03–S04 |
| D-003 | ICP source API | Pin and test actual ledger/index/archive interfaces; no blanket ICRC-3 assumption | S01 |
| D-004 | Player identity | Funding-account identity is feasible; one-principal identity cannot be inferred from an opaque account identifier | S01 |
| D-005 | Memo form | Decide one unambiguous canonical encoding and explicit legacy-u64/blob compatibility; no silent precedence on conflicting fields | S01 |
| D-006 | Step budgets | Final roots and canonical events are invariant under work partition and resumption | S02 |
| D-007 | Atomic physics | Define temporal pairing/corner/capture precedence before implementing optimizations | S03 |
| D-008 | Spawning | Choose intended sampling population, bounded search, eligibility semantics and bootstrap/fallback behavior | S03–S04 |
| D-009 | Obligations | Rejected-input no-refund policy is separate from durable outgoing prizes | S07 |
| D-010 | Telemetry | Optional host module; source/coverage/quality included; no game-logic dependency | S06 |
| D-011 | Status visibility | Public or allowed-viewer status is a reviewed deployment setting, not controller authority | S01/S06 |
| D-012 | Extraction | One repo and a few modules; split services only for a demonstrated boundary | S00 onward |
| D-013 | Days and delays | Name logical scoring periods separately from UTC operating-cost periods | S02/S07 |
| D-014 | Code reuse | Adapt patterns now; resolve ownership/license/versioning before extracting Jupiter code | Before publication |

## Details that materially affect implementation

### Inputs and identity

Jupiter's actual index types distinguish an account identifier from a principal and legacy numeric memo from ICRC blob memo. A transfer from a custodial/shared account is not proof of a unique human. Support for arbitrary memo values must be tested in the wallets being documented. A small angle/move protocol may fit a legacy numeric memo, but byte order, tagging, legal ranges and mixed-field rejection must be explicit.

One live cannon per funding account is the proposed practical policy; it differs from one per principal, and neither establishes one per person. Do not claim progressive per-cannon pricing prevents users opening multiple accounts. Keep that strategic issue in economic tests.

### Checkpoints and completeness

The observer can replay only what the transcript records. Timer-delayed sealing must not be retrospectively interpreted as the same ledger cutoff. Store the seal. A paid command must not be applied twice on restart, nor omitted because the newest index page arrived first. An input root proves included bytes, not index completeness. A production adapter needs an explicit completeness and freshness story, with a slow but safe recovery path.

### Exact gameplay

Older-cannon precedence resolves competing actors, not every geometry ambiguity. For example, a single ball simultaneously striking two perpendicular boundaries still needs a compound-collision and reflection rule. Near-time annihilation needs causal grouping that does not change when the runtime yields. Overlapping cannon relocation must have deterministic exit/reentry behavior.

Spawn selection should specify whether the distribution is uniform over directed frontier edges or over distinct eligible cannon cells. Those distributions differ at corners and junctions. Predictability and grinding are acknowledged properties, not statistical fairness guarantees. Candidate ordering and connectivity checks must be resumable. Rejecting after a fixed search budget is different from proving that no eligible placement exists; choose and document one policy rather than conflating them.

The prior 3×3 patch and non-severing/no-ball eligibility rules are proposed rules, not discovered user requirements. Test their effects on admission, hostile border layouts and late-game scarcity before freezing them. Define the first cannon, a board with one owner and no internal frontier, and the all-neutral board explicitly.

### Money and extinction

A queued angle payment may be processed after its cannon dies. Because `ANGLE` also implies join when no cannon exists, specify whether a sufficiently large payment recreates a cannon or is rejected. Do not allow an accidental implicit rule to decide this. Define move fees, amount-to-ball cardinality, rounding, sub-fee payouts, retained overpayments and day-end remainders.

Earned area-time and corresponding account entitlement survive a cannon's destruction and must not vanish when live entity state is removed. A new cannon gets a new ordinal without double-counting the account's prior entitlement. Simulator progress delays and a real-world midnight do not define the same scoring boundary by default.

### Runtime and presentation

The buffer is the future timeline actually downloaded and verified by this client, not the backend's advertised simulation head. Slow playback cannot compensate indefinitely when generation throughput is below consumption. Depletion must visibly stall or resynchronize rather than invent authoritative movement. Far-ahead replay remains possible and must be accepted as a strategic property.

### Treasury and network metrics

Retained ICP is treasury revenue; it becomes operating cycles only through the relevant conversion/funding path. A top-up is not evidence that those cycles were burned. A balance drop is not automatically pure execution consumption. Public status and privileged consumption metrics are different APIs [R1](IC_REFERENCES.md).

Report measured UTC-day operation separately from logical-day scoring. If no reliable ETH-equivalent reference methodology has been selected and documented, omit that display rather than manufacture a denominator. A later metric reference change cannot alter past scores or commitments.
