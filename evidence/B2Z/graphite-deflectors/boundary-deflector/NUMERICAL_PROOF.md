# Boundary Deflector numeric and progress checkpoint

This supersedes the former interior-midpoint proposal. The old negative evidence
remains valid for that former model, not a counterexample to this construction.
This checkpoint alone is not an admitted backend, source grammar or paid structure.

## Coordinates and an explicit heading-table conflict

The existing canonical helper has east=0 and positive-y south. Its8192 vector is
(+22627,+22627), i.e. southeast, not northeast. The owner instruction's named
front/rear face table is preserved by mapping NE/SE/SW/NW to canonical headings
57344/8192/24576/40960. Existing cannon math and precision are unchanged. Stored
orientation will be an enumeration, not arbitrary angle input. The numeric-table
correction has been raised explicitly; it is not a silent change of cannon axes.

## Exact common denominator

Let Q=1024, D=22627, P=1000Q and H=10^9 ticks. Existing validators permit integer
velocity components up to M=65536; reachable normal launches use the existing
speed32000 integer CORDIC and have components no larger than32000. Store reduced
(x_num,y_num,d,vx,vy), d>0, gcd(x_num,y_num,d)=1. The intercepts are x_num/d and
y_num/d. Historical states/identities keep their existing encoding and semantics.

Before the first active redirect, every launch intercept is integer; translations
and blocked-wall/cannon sign reflections preserve it. At a vertical boundary X,
t=(X-x0)/vx. The new intercepts are X-ux*t and y0+(vy-uy)*t. Therefore their common
reduced denominator divides |vx|, at most M. The horizontal derivation exchanges
x/y and divides by |vy|. A zero velocity component cannot own the crossing axis;
no division by zero is needed. Exact simultaneous-axis contact uses the existing
blocked-vertex response and does not introduce any new denominator.

After a redirect, |vx|=|vy|=D. At a vertical contact let k=ux/vx (±1) and
l=(vy-uy)/vx (−2,0,2). Then x0'=(1-k)X+k*x0 and y0'=y0+l*(X-x0).
Both are integer-affine in old intercepts and integer boundary X. Their common
reduced denominator divides d. At a horizontal contact, y0'=(1-k)Y+k*y0 and
x0'=x0+l*(Y-y0), with the analogous integer k/l. These formulas cover all16
orientation/face pairs; front/rear only selects signs. Reflection is
x0'=2X-x0 (or y), preserving d. Toroidal translation adds an integer multiple of
P to the relevant intercept, preserving d. No remaining existing same-ball
operation reassigns arbitrary velocity: Fire/Revive create a new ball; annihilation,
capture and expiry may remove it. Historical world migrations remain under old
identities; no old migration is applied again to a successor ball.

Thus d never grows after the first redirect and is at most65536 conservatively
(or32000 for reachable normal-launch histories). Reductions may only decrease d.
There is no cumulative approximation error: every update is exact integer algebra.

## Magnitudes, event times and capacity

At every valid state/contact, canonical position lies within [0,P] per axis.
For 0<=t<=H and |v|<=M, |intercept|<=P+MH<10^14. Thus each reduced numerator is
at most65536*10^14=6,553,600,000,000,000,000<2^63. Use BigInt in JS and Rust;
never convert this numerator to Number/i64 for arithmetic. The canonical denominator
is a bounded integer, converted only after exact capacity checks. A stored d>1
requires both component magnitudes D in the future schema validator.

Initial integer-trajectory boundary-time denominator is at most M. Later boundary
time denominator divides dD<=1,482,424,832<2^31. A pending-strike deadline adds the
existing1/16 tick; its denominator is at most16dD<2^35, numerator at most H*16dD
<2^65. Rearm time adds4096/D and stays within denominator dD. Integer segment heads
introduce no new factors. Equal-time ordering uses exact fraction comparison.

Raw arithmetic before gcd cancellation can exceed stored sizes. The largest
redirect intermediate is bounded by (|a_num|*time_den + 2M*|time_num|*d), below
2^112 under these bounds; fraction comparisons are below2^130 when including
strike deadline cross-products. Arbitrary-precision operations remain bounded by
these fixed sizes; this is not permission for unlimited digit lengths. Source/world
validation must enforce the horizon, canonical form, velocity class and numerator/
denominator capacities. Scores/accounting retain their independent existing rules;
this proof does not claim to change their validators or aggregate rational bounds.

## Sidedness, exact corners and event ordering

For a genuine single-face impact, the selected diagonal has positive dot product
with the occupied tile's outward normal. Keep the open source cell; its next wall
in that axis is a full tile away. The other axis was strictly interior, so its next
crossing is strictly later even if its sign changes. Tangent v_normal=0 cannot
attempt entry. At simultaneous axes, perform the established blocked-vertex/
passage response with no front/rear classification. Recompute the next crossing
from the resulting source/open cell; do not select an axis by callback order.
Future integration must retain existing frozen intent, annihilation-before-resolve,
owner/ball resolution and strike-expiry ordering, revalidate actual occupancy and
invalidate removed-generation contacts. This paragraph specifies obligations, not
proof that those unimplemented integration paths have already passed.

## Necessary provisional resource exception

Strictly positive steps are insufficient. The canonical8191 launch gives velocity
(22630,22625). Starting at a tile centre, its first vertical boundary is256/2263
coordinate units short of a corner. Two perpendicular NE Deflectors send the ball
back and forth at step256/51204901 ticks: approximately200019 contacts/tick. The
actual shared crossing-helper fixture reaches195494 contacts before tick1 because
the first entry consumed part of that tick. This exceeds the existing131072-event
capacity for one ball. The unguarded policy is NOT acceptable for paid admission.

Candidate safeguard: after an active redirect, rearm the ball at t+4096/D, four
tile lengths of canonical diagonal component travel. Before that exact simulated
time, an occupied Deflector contact uses ordinary cannon-style blocked-face
reflection and records an explicit `deflector_rearm_reflection` motion outcome.
No crossing is skipped, delayed or dropped; ownership/capture remain separate.
Exact corners still use the blocked-vertex rule. An eligible single face uses its
orientation/front/rear policy with an explicit `deflector_redirect` outcome.
This is a visible, provisional exception to unconditional face redirection and must
be included in certified candidate configuration and final owner policy review.

Between active redirects, only ordinary reflections change signs. Each axis needs
Q/D simulated time between its own successive crossings. In a window length T,
active redirects are at most floor(TD/(4Q))+1. Partitioning at those redirects gives
at most 2TD/Q +2(floor(TD/(4Q))+2) axis crossings, at most(5/2)TD/Q+4 per ball,
plus the bounded first pre-diagonal interval. Simultaneous axes count as one motion.
The synthetic one-tick fixture records44 contacts and6 eligible redirects with the
candidate guard, preserving every remaining contact as a reflection.

For candidate admission, pin a maximum successor seal duration of1 tick. This
is a new provisional rules/configuration bound, not a change to the paid game's
operating settings. Preparation and commit require the existing configured segment
allowance already be at most1; ordinary1-tick operation is preserved verbatim.
The kernel rejects a longer successor seal. Old identities retain their64-tick
contract and history. No deadline is extended.

For a reachable normal-speed ball, sum of pre-first-redirect axis rates is at most
45258/Q<45 per tick. Partitioning once at that first redirect and applying the
rearm bound gives a conservative64T+8 boundary motions per ball in an integer
window T<=1. At64 balls this is at most4608 motions. A motion can arm at most one
strike and that strike can produce at most one later resolution/cancellation;
thus at most13824 associated events. Initial pending strikes contribute at most64,
annihilation cleanup at most64, and final lifecycle stamping one. Commands all run
before the motion phase: at most256 Deflectors,128 one-per-cannon Moves,128 retained
cannon constructions,64 new balls and64 purchase-completion events can be created.
Removed structures are a bounded list in their existing topology event, not a new
per-structure event stream. The total is below20000, retaining the existing131072
event limit. Invalid transfers produce receipts, not unbounded success events;
the existing4096-input cap remains. These are conservative count bounds, not a
claim of measured instruction cost or full topology/byte-budget qualification.

The numerical constructor supports the old validator's wider integer components
conservatively for arithmetic research. Successor admission validates normal-speed
squared magnitude<=32001^2, and d>1 requires both components D. Rules11 migration
checks this reachable normal-game speed precondition before changing anything.
It must fail without mutation on an unsupported synthetic old state, rather than
silently rescale a ball. Actual installed source, output-byte, instruction/cycle,
source-starvation and durable-recovery measurements remain required in checkpointG.

### Serialization correction, measured during integration

The draft8-tick allowance was rejected:64 balls exceeded the canonical structural
bound. At1 tick with stale rearm metadata the same stress emitted1063392 bytes,
above1048576. Expired rearm is now cleared at the next actual boundary;64-ball
corridor output is904416 bytes/2817 events. The successor allowance is1 tick,
not8. These are actual kernel/serializer measurements, not installed cycle proof
or a universal byte bound for every possible topology/input batch. The original
negative JSON/logs remain under `.work/boundary-deflector/budget-v1*`.

### Canonical schema7 motion representation

The full verbose64-ball enclosed box produced1300960 bytes, and a first partial
packing still produced1056233 bytes near the logical horizon. Both are retained
negative evidence. The final fixed-slot motion record is
`[0, sequence, time, ball_id, from_cell, track, contact_or_null, vertex_blocked]`,
where `track=[cell,x0,y0,vx,vy,den,rearm_or_null]` and contact is
`[structure_id, orientation_index, face_index, kind_index, front_or_null]`.
Orientation order is NE/SE/SW/NW; face order N/E/S/W; kind0=active redirect,
1=rearm reflection. Front is a boolean only for kind0. Owner is immutable for a
ball ID and comes from the authenticated initial snapshot or its authenticated
spawn event. All integers/rationals remain exact canonical values. This is an
explicit new schema7 event encoding, never a rewrite of earlier audit bytes.
The presentation decoder rejects verbose/invalid motion wire under schema7 and
expands records before existing ordering, trajectory and endpoint validation.

Executed full-kernel stress at64 balls and the maximum logical horizon emits
758133 bytes/2817 events in the enclosed box; all2816 actual contacts survive.
The open corridor emits fewer bytes. Event/canonical/1MiB limits are unchanged.
These cases do not by themselves prove every possible input/topology byte budget;
installed financial/capacity checks and source qualification remain mandatory.
