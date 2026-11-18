# One-tick operating cost and throughput

At the observed European **Trickle** rate, the stored allowance change from two to one has no direct scheduling effect. The effective allowance is already one. In faster modes, it changes the publication boundary and should be treated as a real operating policy change. Rules12 relies on this limit for bounded output and work. Release economics depend on the activity and pace selected by actual resource health.

## Scheduler and reason for the limit

The stored `RunState.segment_ticks` limits the logical interval sealed for each next publication. `Clock::publication_ticks` uses `min(configured, 1)` in Survival, Lifeline and Trickle. Conserve, Steady, Economy, Cruise and Normal can use the full configured allowance. The period is `ticks × 1e12 / supported_milliticks_per_second` nanoseconds. At 10 milliticks/s, one tick is due every 100 wall seconds. At Normal, two ticks are due every two seconds or one tick every second. World simulation still advances by its original logical ticks and velocities. The selected nominal pace is a funding policy and the supported pace can fall under repeated measured work overruns.

The autonomous timer can wake for intermediate continuation work. It enforces one driver, bounded work and instructions per callback, and completion of any already sealed work before opening the next interval. It re-arms a continuation before work, and due time rebases if more than two configured periods behind. A long pause or interruption therefore does not accrue a debt of all missed wall ticks. A short late arrival can still have pending work, and durable admitted work must be finished with its originally sealed bounds. Transition maintenance has its own bounded wake-up path and cutoff requirements. Empty idle worlds retain their publication. Independent 60-second source reconciliation and funding work have separate timers.

At a mode that uses two ticks, one-tick publication increases fixed costs per completed logical tick. There can be two seals, manifest/artifact assemblies, retained catalog writes and certification commits for a simulated period that previously used one. Stable persistence can also occur on unfinished stages. This is distinct from per-motion and per-purchase work and from source polling. Where both maintain nominal pace, shorter publications reduce the maximum ordinary wait for the next completed publication. Inputs admitted after a seal still wait for the next seal, and a heavily loaded driver can slow or spread work across additional callbacks. One tick does not double polling, create a second driver or increase the nominal simulation rate.

Rules12 uses exact bounded rational redirect trajectories. The existing publication caps and scheduler bounds are part of its qualification. Earlier two-/eight-tick stress attempts exceeded existing structural or byte limits. Spacing also prevents the measured adjacent trap of 195,494 contacts in one tick. Those are different constraints. Neither a lighter ordinary workload nor current one-tick Trickle behaviour justifies enabling an invalid stored allowance. [Numerical proof and negative controls](../NUMERICAL_PROOF.md).

## Measurements and assumptions

The disposable comparison uses retained exact normal Wasms, official pinned PocketIC/Ledger/Index and existing read-only runtime metrics. The test changes are held in the [measurement harness](matched-cost.rs), [Trickle setup variant](matched-cost-trickle.rs), [reflection setup variant](matched-cost-reflections.rs) and [temporary harness patch](matched-cost-harness.patch). The tracked integration test and executable inputs have been restored to the qualified source. Test hooks initialise disposable fixtures. Recorded costing starts with the selected normal executable after startup. A is Rules11/2, B Rules11/1, C Rules12/1. The idle case has no active gameplay. The quiet active case has one player, cannon and ball with no Deflector. The large time-gap scenario pauses replica progress for a 600-second simulated gap, then resumes scheduler rounds. Scenario-specific setup and state identity distinguish sizing comparisons from strict matched pairs. Dense cases are stress evidence and the official paid acceptance is a separate measured batch.

| Disposable case | Rules/limit | Ticks | Publ. | Total cycles | Cycles/tick | Cycles/publ. | Work units | Events | Output bytes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Idle | R11/2 | 0 | 0 | 302,334,808 | — | — | 0 | 0 | 0 |
| Idle | R11/1 | 0 | 0 | 302,334,808 | — | — | 0 | 0 | 0 |
| Idle | R12/1 | 0 | 0 | 216,163,011 | — | — | 0 | 0 | 0 |
| Trickle | R11/2 | 4 | 4 | 1,082,359,861 | 270,589,965 | 270,589,965 | 902 | 182 | 75,416 |
| Trickle | R11/1 | 4 | 4 | 1,082,359,861 | 270,589,965 | 270,589,965 | 902 | 182 | 75,416 |
| Trickle | R12/1 | 4 | 4 | 1,021,688,719 | 255,422,180 | 255,422,180 | 902 | 182 | 45,752 |
| Gap | R11/2 | 4 | 4 | 1,050,191,668 | 262,547,917 | 262,547,917 | 902 | 182 | 75,416 |
| Gap | R11/1 | 4 | 4 | 1,050,191,668 | 262,547,917 | 262,547,917 | 902 | 182 | 75,416 |
| Gap | R12/1 | 4 | 4 | 1,004,190,201 | 251,047,550 | 251,047,550 | 902 | 182 | 45,752 |
| Normal | R11/2 | 4 | 2 | 541,603,010 | 135,400,752 | 270,801,505 | 896 | 180 | 60,641 |
| Normal | R11/1 | 4 | 4 | 730,208,310 | 182,552,078 | 182,552,078 | 902 | 182 | 75,441 |
| Normal | R12/1 | 4 | 4 | 655,161,793 | 163,790,448 | 163,790,448 | 902 | 182 | 45,777 |
| Small | R12/1 | 4 | 4 | 861,711,856 | 215,427,964 | 215,427,964 | 892 | 180 | 36,859 |
| Diamond | R12/1 | 2 | 2 | 317,205,806 | 158,602,903 | 158,602,903 | 446 | 90 | 20,902 |
| Moderate | R12/1 | 2 | 2 | 3,031,859,763 | 1,515,929,882 | 1,515,929,882 | 844 | 1,218 | 153,009 |
| Capacity | R12/1 | 2 | 2 | 54,348,392,929 | 27,174,196,464 | 27,174,196,464 | 632 | 5,714 | 670,427 |
| Reflections | R11/2 | 4 | 2 | 442,893,167 | 110,723,292 | 221,446,584 | 631 | 127 | 45,849 |
| Reflections | R11/1 | 4 | 4 | 631,936,190 | 157,984,048 | 157,984,048 | 637 | 129 | 61,355 |
| Reflections | R12/1 | 4 | 4 | 585,423,941 | 146,355,985 | 146,355,985 | 637 | 129 | 40,599 |

Costs are backend cycle debits over each measured window, including scheduled
source calls and startup command overhead. Output bytes sum the publication
catalog and three artifact bodies. They exclude protocol and wire overhead.
Read-only controller counters separate seal, kernel Step, publication and
persistence instructions. The [per-case JSON](results/) also includes Index
calls, callback count, the initial state hash and times of every publication.
The maximum callback instruction count includes work outside the four phase
sums. Source, fee handling and IC message/allocation costs cannot be precisely
backed out of a balance delta.

- **Idle.** A and B both used 302,334,808 cycles for 180 virtual seconds,
  four Index calls and zero gameplay callbacks. C was also idle with four
  Index calls. Its synthetic schema7 genesis lacked the earlier epoch
  history, so its lower absolute idle cost does not isolate a module saving.
- **Quiet Trickle.** A and B had exactly identical initial world bytes and
  identical results for every reported metric apart from the stored setting.
  Four ticks and four publications cost 1,082,359,861 cycles, including five
  Index calls. C also published four ticks with identical work units and events.
  Its approved schema7 representation produced 45,752 bytes versus 75,416.
  The C debit was 5.6% lower in this controlled window. This is a successor
  comparison including different schema and epoch history, not a cap effect.
- **Trickle interruption.** A and B had identical output, costs and timing
  through the 600-second stopped-round gap. The first resumed publication
  completed on the harness's first eligible round and the next two arrived
  100 seconds apart. There was no six-tick catch-up burst. C matched the
  publication timing. This tests elapsed downtime with no pending payments.
  Previously qualified admitted-stage recovery separately demonstrates that
  preserved financial work resumes exactly once.
- **Quiet Normal.** The same Rules11 world took two publications at allowance
  two and four at allowance one. Cost per logical tick rose **34.8%** while
  cost per publication fell. Measured total cycles were 541,603,010 and
  730,208,310, respectively. The same one Index call occurred in each run.
  Seal, publish and persist instructions totalled 143.9 million at A versus
  210.3 million at B. Step instructions were 182.7 and 202.6 million.
  Inter-publication intervals were roughly two seconds versus one. The initial
  publication is due immediately, so dividing the whole short window by its
  tick count would overstate steady throughput. C cost 655,161,793 cycles
  over four publications. No sustained Normal throughput proof follows from
  this short comparison.
- **Ordinary cannon reflections.** The focused Normal comparison placed one
  ball between cannon tiles with zero Deflectors. Each arm recorded 125
  actual velocity reversals over four ticks. Rules11 allowance one cost
  **42.7% more per tick** than allowance two (631,936,190 versus
  442,893,167 total cycles) with four versus two publications.
  Rules12 cost 585,423,941 cycles with four publications. The
  same normal publication spacing held over this short window.
  [Fixture and counts](results/cost-reflections.json).
- **Deflectors and activity.** A small two-device legal layout, the four-device
  redirect diamond, 16 cannons/16 balls/32 devices, and 16 cannons/64 balls/256
  devices all progressed. The 256-device full two-tick window debited 54.35
  billion cycles. Its most expensive observed callback used 3.13 billion
  instructions. The 600-million-instruction yield is checked between actions
  and therefore does not cap any one completed action at that value. The
  earlier exact-source paid capacity test measured 5.02 billion cycles for
  the *remaining* controller/publication work after recovery. Its measurement
  boundary differs. The hosted paid batch also measured 470,548,858 cycles
  including game/controller work, official disposable Ledger admissions and
  receipt processing. These are neither recurring quiet costs nor matched
  continuous-payment-load trials. [Installed paid batch](../results/qualification-f819257/installed/boundary-deflector/result.json).
- **Adversarial corridor.** The qualified bounded two-device stress used 64
  balls, 4,161 events, 1,408 actual redirects and 566,136 event bytes in one
  logical tick. The authoritative JS/native long-chain and resume checks
  completed; there is no isolated exact-module cycle debit for that particular
  corridor. The installed diamond and capacity rows above provide additional
  cycle and work measurements, with their own actual layouts.
  [Qualified corridor/diamond evidence](../NUMERICAL_PROOF.md).

At a constant 10 milliticks per second with an active game, 86,400 seconds
contains 864 logical ticks and approximately 864 completed one-tick
publications. Applying the measured quiet full-window rates gives
`864 × 1,082,359,861 / 4 ≈ 0.234 trillion cycles/day` for Rules11 and
`864 × 1,021,688,719 / 4 ≈ 0.221 trillion cycles/day` for Rules12 with zero
Deflectors, on these disposable samples only. Startup and source reconciliation
are already included in those short-window rates. Applying them to 864 ticks
assumes similar world, negligible long interruptions, and comparable residual
overhead. It is an illustrative cycle estimate with no statistical confidence
interval and no claim about sustained traffic on a shared subnet.

Initial local harness trials were replaced after a test-only call was
unavailable on the exact normal module, the fixture's default cycle grant
selected the wrong band, or a synthetic empty predecessor lacked a required
sealed Rules11 interval. Slow shared-host runs were capped or superseded.
A/B/C quiet Trickle used explicitly funded disposable instance creation and
advanced the paused virtual clock across old due times during setup. No
runtime guard or production behaviour was changed. [Attempt records](results/cost-attempts.json).

**Release assessment.** The allowance itself has no material cost or throughput
penalty under observed Trickle conditions. The measured 34.8% Normal increase
and dense-load debit are material. Treat faster-mode or sustained dense Rules12
operation as blocked until the owner accepts an operating budget supported by
longer representative evidence. A quiet, monitored Trickle prelaunch trial
can be considered after the backend prerequisites and separate owner approvals.
Pace is resource-selected and can change with liquid balance, so the trial
needs observation of actual pace, debit, pending source work and publication
progress. A healthy current low-rate snapshot cannot justify unrestricted
economic acceptance. This backend issue does not block the separate static
graphite frontend decision under Rules7.



The nearest observed European comparison is a short, read-only **Rules7** window. From approximately 09:30:40 to 09:42:42 UTC on 18 November, total cycles fell from 1,727,915,756,480 to 1,724,923,058,551, a net change of 2,992,697,929 cycles over about 722 seconds. The runtime recorded seven additional driver messages. Extending this quiet-window rate mechanically gives approximately **0.36 trillion cycles/day**. This is a net-balance calculation under the installed predecessor, reflecting everything that affected the canister balance during the sample. It is not an isolated simulation charge, gross burn, production Rules12 forecast or treasury-runway estimate. The previous funding outcome and later Index/treasury states have their own timestamps. A future release should measure its actual sustained load and liquid-cycle policy on the European subnet. No currency conversion is justified by these samples.

## Separate setting decision

The management control is the application canister's controller-only `start_autonomous(record { segment_ticks : nat64; pacing_seconds : nat32; work_budget : nat32 })`. It is separate from IC settings and there is no dedicated setter. The current controller query reports pacing_seconds 1 and work_budget 512. Re-read those fields before any action. A running call with a changed setting rejects. A paused call persists the requested values, increments the autonomous generation, sets running, installs the timer and requests source reconciliation. Changing this field **also starts the driver**, so a pause/start/pause sequence cannot guarantee zero gameplay or admissions on a live subnet. The disposable setup can execute that sequence without a new publication, which does not guarantee the same timing on mainnet.

Require a separate approval explicitly covering the controlled resume needed for this change, with Rules11 active and the successor transition still unprepared. If the owner approves both the Rules11 resume and the new allowance, that resume can carry the new value and avoid another short run solely to change it. Verify the resulting normal Rules11 operation before scheduling the later successor pause. Record original controller settings and original head, confirm healthy resource policy, pause under separate authority, verify actual paused browser readiness and confirm no staged segment remains before starting with the changed allowance. With approval, the exact Candid argument for the observed values is:

```candid
(record { segment_ticks = 1 : nat64; pacing_seconds = 1 : nat32; work_budget = 512 : nat32 })
```

Verify immediately through `lab_status()` and `controller_work()`, read any new certified publication and admissions under Rules11, and re-pause under the planned maintenance approval before successor preparation. Drain eligible inputs under Rules11 using the reviewed transition flow. On an ambiguous reply, inspect state and generation before retrying. A separately approved restoration to 2 is possible while still on compatible Rules11 without an active successor preparation. It uses the same pause and controlled resume, preserving the original other fields. Once the successor boundary is prepared, changing the stored allowance back would violate cutover preconditions. After Rules12 activation it is rejected at start. An unexplained cursor, financial, mode or state change blocks maintenance. [Transition readiness](BACKEND_TRANSITION_READINESS.md).
