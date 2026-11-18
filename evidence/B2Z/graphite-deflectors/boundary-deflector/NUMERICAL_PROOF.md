# Boundary Deflector numeric and progress checkpoint

This supersedes the former interior-midpoint proposal. The old negative evidence
remains valid for that former model, not a counterexample to this construction.
This checkpoint alone is not an admitted backend, source grammar or paid structure.

## Coordinates and an explicit heading-table conflict

The existing canonical helper has east=0 and positive-y south. Its8192 vector is
(+22627,+22627), i.e. southeast, not northeast. The owner instruction's named
front/rear face table is preserved by mapping NE/SE/SW/NW to canonical headings
57344/8192/24576/40960. Existing cannon math and precision are unchanged. Stored
orientation will be an enumeration, not arbitrary angle input. The owner explicitly approved this numeric-table correction; the generated
shared mapping is consumed by parser, JS/native execution, renderer and tests.
Cannon axes and historical interpretation remain unchanged.

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
<2^65. Integer segment heads
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
Integration retains existing frozen intent, annihilation-before-resolve,
owner/ball resolution and strike-expiry ordering, revalidate actual occupancy and
invalidate removed-generation contacts. Installed tests remain a separate qualification obligation.

## Progress without changing the contact law

Every ordinary impact redirects. There is no rearm state, mirror fallback, dropped
collision, cooldown or artificial pause. A prior research safeguard was rejected
for violating that contract; its source and negative findings remain in
[SUPERSEDED_REARM_RESEARCH.md](SUPERSEDED_REARM_RESEARCH.md).

The unconditional adjacent-NE pair is a real counterexample to economical
processing: heading8191 produces velocity(22630,22625), and a centre launch
passes only256/2263 coordinate units from a corner. The shared scheduler produces
195494 impacts before tick1, above the existing131072-event capacity. This is a
resource failure, not denominator growth or a zero-time loop.

The candidate therefore requires **toroidal Chebyshev tile distance at least2
between any two Deflectors**, including diagonals and seams. This is a provisional
placement-policy decision requiring final owner approval. The backend checks all
nine candidate-neighbour cells and rejects with `DEFLECTOR_TOO_CLOSE`; schema
validation independently rejects an impossible adjacent stored pair. No cannon
spacing is changed. A paid rejection retains the existing accounting semantics.

For distinct legal Deflector tiles, their closed squares have toroidal L-infinity
separation at leastQ. After the first redirect the maximum coordinate speed isD,
so different successive Deflector contacts are separated by at leastQ/D ticks.
For a repeated contact with the same tile, the outgoing normal points away. To
return, that coordinate must reverse at a different parallel grid line at leastQ
away and then return: at least2Q/D ticks. A perpendicular wall can reverse only
the tangent, not the outward normal. A corner uses the existing blocked-vertex
response and cannot create another same-time ordinary impact. Thus there are at
most floor(DT/Q)+2 ordinary Deflector contacts in any window of durationT.

Between those contacts, each coordinate has constant component magnitudeD and
can reverse only on its own grid crossings. Each full cell consumesQ coordinate
travel. A Deflector can reverse its tangent strictly inside a cell, introducing
at most one additional partial-cell crossing. Counting both axes therefore gives
at most2DT/Q+R+4 boundary motions after the first redirect, with R as above.
Before the first redirect, the launch-speed bound gives summed axis rates less
than45/tick. Splitting at that first redirect yields the conservative total
**72T+8 motions per ball**, for integer windows0<T<=1. Simultaneous axes count
as one motion. This bounds work without forbidding legitimate collision counts,
modifying outgoing headings or weakening the existing event/deadline limits.

Canonical sidedness keeps the outside source cell. On an ordinary hit its normal
next crossing is a full cell away; the tangent starts strictly inside its interval.
Consequently the next event is strictly later. Arbitrarily short near-corner pairs
are possible, but their total frequency is bounded by the argument above. Equal
ball times retain existing canonical owner/ball ordering and frozen intent handling;
occupancy is revalidated after topology changes. Capture/annihilation and pending
strike ordering are unchanged. Removed structures cannot resolve stale intents.

## Serialization and bounded operating allowance

The successor accepts at most **one logical tick per publication**. Prepare and
commit require the stored operating allowance already be at most1; they never
silently alter it. Old identities and historic output limits remain unchanged.
This allowance is provisional and requires a separate future operating decision.
The earlier8-tick and2-tick experiments exceeded existing structural/byte bounds.
Their failures remain evidence; no output limit or deadline was raised.

Schema7 motion wire is
`[0, sequence, [time_num,time_den], ball_id, from_cell, track, contact, vertex]`,
where `track=[cell,x0_num,y0_num,vx,vy,den]` and contact is null or
`[structure_id,orientation_index,face_index,0,front_boolean]`. Orientation order
is NE/SE/SW/NW; face order N/E/S/W. The only contact kind is0, redirect. Exact
integer/rational components are canonical decimal strings, with bounded lengths
and no plus, leading zeros or negative zero. Owner is immutable for a ball ID and
is reconstructed from the authenticated initial state or authenticated spawn.
The decoder expands this new versioned wire before ordering/trajectory/endpoint
checks. Historic audit bytes and private durable event fields are unchanged.

Executed current full-kernel stress restores its cursor every third bounded
17-unit step. At64 balls and logical horizon10^9, the legal two-Deflector corridor
produces4161 events,1408 genuine redirects and566136 event bytes. The immutable
four-direction diamond produces2817 events,960 redirects and385333 bytes. All
contacts obey orientation/face. These fit existing1MiB/event limits and prove
progress for those stress cases; they are not a universal financial/topology byte
bound or installed subnet instruction/cycle measurement. Installed maximum-capacity
and paid-command qualification remain separate requirements.

## Evidence scope

Python Fraction supplies an independent160-case contact oracle. JS and Rust run
all canonical launch headings, long algebraic chains, full-kernel immutable diamond
chains, cursor restoration and shared public-output vectors. Record actual completed
counts/hashes in the closeout report; a started or running job is not a pass.
Native arithmetic and software-rendered captures do not imply IC certification,
physical-phone performance, subjective audio acceptance or completed hosted CI.

The owner explicitly confirmed the corrected compass table on2026-11-17.
`config/rules/v12-boundary-deflector.json` is the one authoritative mapping;
`generate_playability.mjs` pins generated JS and Rust orientation tables shared
by parsing, execution and rendering. Cannon/Fire and historical heading semantics
are unchanged. Actual renderer matrix regressions check the wedge's local+X tip
projects along the intended outgoing world vector for all four directions.
