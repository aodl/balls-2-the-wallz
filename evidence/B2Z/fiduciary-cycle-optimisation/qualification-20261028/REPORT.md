# A2 qualification closure — release remains gated

This bounded continuation preserves the selected implementation and measured
savings. No new scoring, physics, persistence, batching or cache optimisation was
introduced. The paid mainnet backend, observer, controllers and 34-node fiduciary
subnet were not changed. Remote reads were performed; no remote Git write occurred.

Starting B2Z HEAD: `adb0be6212494c01c70b9f79c00191fc7aa2039d`, clean research
branch. Work is isolated on `qualification/b2z-fiduciary-a2`. The implementation
pair remains B2Z `d6c2e593e90fd75d64ed8b6d8b4e39da56a35165` with local DTR
`77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`. The new commits change qualification
tooling, CI provenance guards and evidence only. They do not produce a newly
Git-pinned release binary. The machine-readable [acceptance ledger](acceptance.json)
separates each decision.

The new independent read-only snapshot is
`/home/codexdev/b2z-release-evidence/a2-qualification-20261028`: **935 files
re-read and verified**, manifest SHA-256
`fa5d2eec6e7fe527a0f5be765b5bab589da4c0a52744a245d85c5a5a1c0f06d8`.
It contains the normal A0/A1/A2 copies, all new raw successes/failures/resources,
portable DTR source review, exact native test executables, and the immutable
qualification-tooling source/history. Dependency/build caches and identity
material are excluded. [Evidence index and verification commands](raw-evidence.json).

**09:30:54 UTC production:** 2.245111T liquid / 2.391969T total, Reserve Protection,
zero supported ticks and stationary paid-v8 gameplay. Source polling and the
official Index continue; treasury is Idle, actual Ledger balance zero. Net cycle
movement between 08:02 and 09:07 was **+0.197297T**, with no treasury-reported
credit. Its origin remains unassigned. The subsequent 22.96-minute interval has
0.008147T net debit, approximately **0.021293T/hour maintenance-only**. This is
not gross active-game consumption or an upper bound. The protected 3T reserve is
short by 0.754889T **before** any release allowance.

## Preserved performance and artifact evidence

The original independent snapshot
`/home/codexdev/b2z-release-evidence/fiduciary-cycle-optimisation-20261027` was
actually checked: **7,255 checksum entries PASS**, manifest
`2e2482f5d4f380836aa172c8214e213ed67df715cc34f1b6584873b8ef608288`.
Its successes, historical FAILs, rejected experiments, diagnostic modules and
source provenance remain immutable. A0/A1/A2 were verified separately and were
not overwritten or recompiled during this continuation.

| Anchor | Exact normal Wasm SHA-256 | Actual paid-v8 64-tick cycles |
| --- | --- | ---: |
| A0 installed predecessor | `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51` | 182,308,539,204 |
| A1 operation cache | `fec372ec5afe5787e5fa5573c18b1d5d16201166d244a9602b276e7cee88c03b` | 105,499,077,279 |
| A2 research pair | `0d86ac6414a8c921f8b1eb0c53890503815b643a0510adeeaa60aeb56d537f7d` | 58,269,955,217 |

Incremental A1→A2 saving is **44.77%**; aggregate A0→A2 saving is **68.04%**.
These are whole-operation local fiduciary-fixture charges, already using its
34-node schedule. **Do not multiply by 34/13 again.** They are not observed
mainnet A2 burn. The preserved differential/recovery evidence demonstrates exact
public outputs and source/financial/retained-state equality for its named cases;
it does not establish every population/ownership shape has this cost ratio.

Successful prior cost and recovery experiments were not repeated wholesale to
diagnose browser delivery. The new matched timer experiment explicitly invokes
the ignored recovery case with checksum-pinned **normal** binaries. New fault
receipts distinguish diagnostic/test-hook execution from normal artifacts; the
historical misleading wrapper labels are retained with their existing correction.

## Delivery and recovery

[Request-level diagnosis and its limits](DELIVERY.md) reconstruct the original
900.031-second failure before the predeclared matched control. Four sampled
non-playing episodes, five resync increments and seven retention-expiry replies
replace the misleading interpretation of 14 independent incidents. Upstream
header waits reach 14.447 s; historical resource and exact verification/admission
timestamps are unavailable. This is an unresolved delivery failure, not an
established A2 defect or an established environment-only explanation.

The new sequential A0/A2 comparison preserves the full 900-second Normal gate and
its assertions, exact binaries, frontend bytes and diagnostics. Its actual outcome
and predeclared resource prerequisite are recorded in `acceptance.json` and the
new immutable raw snapshot. A host prerequisite rejection does not qualify either
binary. A genuine paid-v8 browser/reconnect check is separately identified there;
the historical v6-genesis fixture is never renamed as v8 coverage.

**Matched comparison: BLOCKED before either case started.** The one predeclared
20-minute prerequisite attempt collected 239 samples across 1,204 seconds and
75 rejection records, with no accepted prerequisite. CPU idle median was 6.16%
(maximum 28.59%); CPU-pressure avg10 median 64.83%; I/O full-pressure median
3.74%. Available memory stayed at least 3.16 GiB, with no swap-out. Other compiler
and PocketIC work remained active. Exposed root-cgroup throttling was zero;
`cpu.max` was unavailable. No other process was killed and no screen was revised.
These contemporary samples cannot retroactively assign the old failure's cause.
The required discriminator remains a quiet-host sequential A0/A2 comparison;
there is no new sustained A0 or A2 result and no automatic retry.

Fresh matched normal-Wasm timer-trap results: **PASS for A0 and A2**. A disposable
2.5 MiB canister Wasm-memory limit forces an IC0539 timer trap; restoring that
disposable setting leaves paid v8/source/treasury/retained bytes intact. Both
normal modules remain stationary after idempotent start, then recover with an
explicit local pause/start and produce matching authenticated outputs. This
establishes unchanged controlled recovery for this tested trap, not unattended
liveness. No production setting was touched and no watchdog was added.

The new browser fixture's failed preparations are retained individually: missing
proxy metadata/root files; a future-dated certificate after accelerated recovery
cooldowns; and a rejected two-hour initial offset that made an earlier checkpoint
stale. All failed **before steady browser playback**. The offset experiment was
rejected and reverted. The final focused `--mode v8-browser` runs the existing
paid transition fixture directly with normal A2, before recovery cooldowns. It
uses the same strict SDK/browser verifiers, waits at most 120 real seconds for
wall time to catch up if needed, advances IC time only forward, and checks the
paused paid publication is unchanged. No browser clock, certificate limit or
acceptance assertion is modified. This separate scene is not an A0→A2 recovery
control; the genuine exact-A0 recovery evidence remains separately identified.

**Genuine paid-v8 browser/reconnect: PASS for the research artifact.** Normal
module `0d86ac64…` is independently attested by local management status. The
1,000×1,000 scene has one paid cannon/one ball; sandboxed Chromium 153.0.8010.12
at 1440×900 authenticates 190 captured current v8/epoch-2 catalogs. Two 30-second
samples remain in PLAYING/DEGRADED_BUFFER without a resync increment: heads
106→134, then 152→182 after a cold reload. Final independent SDK root/artifact
verification passes. The real alignment wait was 114.198 seconds; no freshness
override or backward IC-clock change occurred. [Actual playing scene](paid-v8-playing.png)
and [cold reconnect](paid-v8-reconnect.png) are captured after steady PLAYING,
not merely initial catch-up. [Exact scope and commands](browser-v8.json) exclude
any claim of a completed 900-second comparison or final Git-built artifact.

## DTR review, provenance and CI

[The generic implementation review](DTR_REVIEW.md) exposes the complete E1→77
source/diff in an independently verifiable portable bundle. Fresh DTR workspace
Rust tests, formatting, Clippy, original JS tests and separate unrelated Rust +
old-JS consumers pass. Public auto traits and poison/unwind compatibility remain.
No new DTR implementation correction was required by this review.

Research CI [40651755603](https://github.com/aodl/balls-2-the-wallz/actions/runs/40651755603)
passed **all six substantive jobs** on `adb0be6…`. However, its downloaded,
checksum-verified Wasm evidence explicitly resolves **E1** and records normal
Wasm `a861b12b5bbaed5ba942b5dc8cfb06705c0f581711d833320b6ea7cd1166b7d0`.
That is a successful **hybrid build**, not DTR77 or the measured A2 artifact.
A1 run `40555604193` remains separate evidence. The informational inventory job
is not an approval. New workflow guards assert exact DTR77 across locks/resolved
graphs and the unchanged JS archive; E1/path/mixed-revision graphs fail closed.

DTR77 was still unavailable at the **10:01 UTC** final check (GitHub 422: no
commit found; [recorded result](publication-status.json)). Its user-owned publication,
deliberate B2Z Rust pin/lock update, clean remote consumer, actual final normal
Wasm and exact final six-job CI are **BLOCKED**, not passed by old green CI.
The current B2Z E1 locks are left honest and unchanged. No temporary path override
was silently converted into a release dependency. [Exact publication steps and
guarded continuation](FUTURE_RELEASE.md) preserve this ordering.

## Instruction and workload limits

The measured runtime driver counter is read **after `persist_inner`**, including
its stable image/artifact preparation and writes, but before driver accounting,
some timer handling, function return and object destruction. Per-phase counters
omit restoration before their start and tails after their end. These are measured
driver peaks, **not complete replica whole-message instruction totals**. Actual
cycle debits include the whole measured operations; they must not be reconstructed
by adding overlapping instruction scopes.

| Preserved valid workload | A0 driver peak | A1 peak | A2 peak |
| --- | ---: | ---: | ---: |
| Representative captured 3-ball, 8 ticks | 768,702,951 | 604,267,875 | 334,014,536 |
| Paid-v8 3-ball, 64 ticks | 862,906,643 | 622,186,434 | 329,854,742 |
| 3 balls / 2,048 overrides | 1,471,281,076 | 1,326,259,825 | 883,617,712 |
| 3 balls / 8,192 overrides | 4,470,795,578 | 4,475,907,902 | 2,472,299,874 |
| 8 balls | 821,304,653 | 960,850,765 | 674,551,955 |
| 64 balls | 5,323,203,156 | 5,367,627,785 | 2,083,192,728 |

These fixture images are admitted by the preserved normal runtime; renderer-only
over-wire-cap examples are excluded. The 600M trigger is tested **between
actions**, not a hard bound on an indivisible Step or its persistence/destructor
tail. Step remains 512, MAX_WORK 2048, MAX_ACTIONS 8. Strict whole-message <600M
for all valid stress shapes is **not established**. No cap was changed to conceal
this limit and no universal one-tick/s capacity claim is made. See original
`measurements.json` and new `raw/instruction-headroom.json` for memory/output/work
details. This remains an operational limitation requiring explicit release review.

## Tests, scope and operational boundary

New qualification checks include exact normal module attestation in the browser
fixture, complete local frontend asset matching, a predeclared sequential runner,
bounded resource sampling, certificate/admission diagnostics, genuine paid-v8
browser entry and normal-module timer control. Source conformance, Python/JS
regressions and harness Clippy results are indexed in `tests.json`.

An existing proxy **test** read its trace before the handler's final write. The
initial source gate failed; the test now waits on completed writes. All 17 proxy
tests and the full source gate then pass. The proxy implementation, network
behaviour and playback acceptance rules did not change. Failed initial logs and
parser attempts remain in the new raw evidence.

A later full source run exposed a second test-only race: the upstream flush event
did not prove that the proxy had received the headers. The recorded difference
was 0.64 ms. The test now observes real body-read entry after header timing is
recorded; its original ordering assertions remain. All 17 proxy tests and five
focused repeats pass. That failed full run is retained; the subsequent full gate
is separately named `raw/source-final-3/` rather than rewriting its result.

The final corrected full source run passes **1,389 JavaScript and 162 Python
tests**, together with the unchanged reference/canonical/documentation checks.
The final Rust test harness builds and passes Clippy/formatting. No normal
backend Wasm was rebuilt by these native-harness changes.

Production observations and the provisional release-budget calculation are in
`production.json`. Reserve Protection is stationary paid gameplay, even when
`running=true`; source/treasury maintenance is assessed separately. Positive
balance movement without a treasury credit is not negative consumption. Funding
does not block disposable diagnosis, but it blocks any production release.

An **illustrative**, not deployment-approved, complete allowance is 4.417202T:
3T protected reserve + 0.110671T for two measured local research-A2 upgrade debits
plus 0.511031T for 24 hours at the latest short net maintenance-only rate + 0.5455T
for 30 minutes at the cautious modelled Conserve rate + 0.25T extra verification/
recovery margin. This is 2.172091T above the last observed liquid balance. The
final Git-built artifact/current image and actual recent maintenance debit must
still be measured; these measured/extrapolated/modelled components are not safe upper
bounds. Every extra 0.01T/h maintenance adds 0.24T to the 24-hour allowance. No
top-up amount is authorized or a future treasury conversion assumed, and time to
zero is not represented as safe operating availability.

No mainnet update, financial action, controller/settings change, gameplay pause,
world transition, production frontend artifact replacement/deployment, master merge or remote Git write was
performed. Local test frontend builds use the existing explicitly local adapter;
they do not replace the approved live frontend. Deployed visual source ancestry
is preserved; its separate master-integration housekeeping remains user-owned.
