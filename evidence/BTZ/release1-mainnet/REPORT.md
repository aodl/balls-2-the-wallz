# BTZ prelaunch release 1 — installed and running

On 30 October 2026, the authorised state-preserving upgrade and frontend upload
completed on the existing canisters. Gameplay resumed with the recorded settings
and naturally selected **Conserve, 0.2 ticks/s**, with no performance limiting.
No financial transfer, controller/subnet change, world reset, rules transition,
external-service deployment or Git merge was performed.

## Exact identities and CI

| Item | Identity |
|---|---|
| Application source | `6f847b0a92566b8973fdae36d482c40a13f6c251` |
| Published harness correction / CI head | `a8bce5fa28854ee793a0cc486a59c2b3bb5469dd` |
| Installed normal backend Wasm | `c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526` |
| Public app | `9d50b86a9a9ad16f73f9d226d66468be0a3a44965071ec292c7c41b59da52bf8` |
| Public stylesheet | `1b69b82f407d1374cd1cf0cd52b04c0339fe9d166886c5231324b4bcdac5a2cb` |
| Unchanged observer Wasm | `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` |
| Unchanged Rust DTR | `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68` |
| Unchanged npm DTR archive | `ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc` |

Both [push run 41103639507](https://github.com/aodl/balls-2-the-wallz/actions/runs/41103639507)
and [PR run 41103647264](https://github.com/aodl/balls-2-the-wallz/actions/runs/41103647264)
finished with **all six substantive jobs PASS** on the exact correction commit.
The production-inventory job is informational. Each integration artifact has
51 passing check entries, including 43 installed test entries. Their sustained
Normal windows were 900.447400 and 900.497400 seconds, respectively, with all
seven strict assertions PASS. Their Normal/Economy/Lifeline/reconnect closeout,
error-free wire capture and independent replay also pass; each sustained replay
reconstructed 1,045 segments. These are the ordinary CI tests' documented local
profiles, not a new claim about the historical frozen fiduciary comparison.

The duplicate run was left to finish at the user's request. A future branch
concurrency correction is staged separately. Original failed CI runs
41085634240 and 41085986302, the historical A0/A2 pair FAIL and all prior
BLOCKED attempts remain unchanged.

## Actual production operations and preservation

Backend `s34gv-3qaaa-aaaar-qcifa-cai` and observer
`s45ab-wiaaa-aaaar-qcifq-cai` remain on the same 34-node fiduciary subnet
`pzp6e-ekpqk-3c5x7-2h6so-njoeq-mt45d-h3h6c-q3mxf-vpeq5-fk5o7-yae`.
Genuine IC-root verification confirmed both unchanged controllers:

- `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`
- `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`

The pre-upgrade liquid balance was **6,088,320,757,890 cycles**, total
6,236,767,691,280. Gameplay was paused once and the committed head 71646
captured. Source and treasury maintenance continued. One install, using upgrade
mode, the frozen normal artifact and empty `()`, succeeded at 19:16:50 UTC.
Post-install liquid was **6,053,636,546,795**, total 6,198,004,055,765.
The observed total debit includes the upgrade, maintenance and reservation
movement; it is not an isolated gross upgrade bill.

Paused-to-installed publication, paid state, events, scores, configuration and
source descriptor are **byte-identical**. All 16 retained publication catalogs
and their artifact chunk digests match. Paid receipts, cumulative financial
counters/obligations and source account/cursor preserve. Treasury re-arming
legitimately advanced its nonce 2092→2093; it was Idle without an error. Runtime
instruction counters reset on upgrade. Neither transient change alters paid
history. World v5, publication v8 and the existing epoch remain active.

The asset-only upload completed at 19:19:52 UTC using `--no-asset-upgrade` and
`--no-wallet`. Public downloads match the frozen app/style hashes above; the
observer module is unchanged. Original autonomous settings resumed once at
19:22:21 UTC: `segment_ticks=1`, `pacing_seconds=1`, `work_budget=512`.

## Shipped scope and explicit limits

Release 1 ships the authenticated-stale-response recovery/diagnostics,
account declarations and deterministic account colours, reactive board action
controls, camera coverage/Overview, BTZ branding, conservation messages,
confirmed-receipt versus buffered-presentation feedback, and bounded public
`runtime_health` / `get_api_doc` operational queries. Identify is a local
preference, never login, payment authority or wallet execution.

The liquid-cycle hysteresis thresholds now are:

| Mode | ticks/s | Enter T | Exit below T |
|---|---:|---:|---:|
| Normal | 1 | 40 | 30 |
| Cruise | .75 | 30 | 24 |
| Economy | .5 | 20 | 16 |
| Steady | .3 | 15 | 12 |
| Conserve | .2 | 5 | 4 |
| Survival | .1 | 3.5 | 3 |
| Lifeline | .05 | 3 | 2.5 |

Reserve Protection, logical velocities, Index floor, treasury safety reserve,
performance envelope and work budgets retain their prior behaviour.

**The versioned gameplay release is not active.** Existing v5 limits remain
32 cannons / 64 balls / 32 balls per cannon and one cannon per account. Batch
purchases, shared territory/multiple cannons, 24-hour dormancy, revised capture
outcomes, expanded capacity, v6 transition and their richer APIs still require
implementation and consolidated qualification. No new-rule price example is
claimed as a current production purchase. Event Horizon remains disabled with
the existing 60-second independent official Index fallback; no compatible live
subscription/cadence-health interface was verified. MCP opt-in is not activated;
ordinary queries do not provide financial execution or accept external terms.

## Live browser and operating observations

One sandboxed, genuine-certificate production observer session navigated once,
without reload, and accepted every consecutive head **71710–71738** monotonically.
Across 120 samples spanning 135.764 seconds it progressed from initial buffering
to PLAYING; the final display had consumed 25.886 newly verified ticks, with no
page exception, resynchronisation or performance limiting. Four authentic stale
observations were rejected and recovered; all four historical diagnostics remain
recorded while current delivery error/failure count returned to zero.

**Its raw wire capture remains FAIL:** a real
`observation_bundle` request failed with `net::ERR_NETWORK_CHANGED`. All dispatched
body callbacks drained, but capture finalisation correctly retained that error.
No error-free mainnet capture or replay claim is made, and this canary was not
repeated to obtain a clean capture. The mandatory complete capture/replay gates
passed in the qualified CI/local evidence. A separate read-only attempt to
enumerate the moving 16-publication retention range also failed when its oldest
entry expired; preserve its log. The fresh current-head-only certified
publication/artifact observation succeeded separately. The complete paused and
installed retained-history checkpoints are unaffected.

Separate preferences/navigation checks confirm existing-player identification,
selection, camera centring and reachability of all eight Play/View actions on
390×844. Mobile controls scroll within the compact toolbar; this layout remains
crowded. The first screenshots include normal startup buffering; separately
labelled ready-state screenshots show PLAYING. No production payment was made.
The original production browser FAIL is not relabelled.

At the later controller observation, liquid was **5,930,865,231,396 cycles**,
total **6,079,042,454,166**, Conserve at 0.2 ticks/s, no limiter, healthy source
with zero pending records and no source/runtime error, Idle treasury and no
unresolved new financial transaction. In 259.160 seconds, completed segments
advanced 71710→71762 (0.20065/s). Net total and liquid decline were both
51,734,578,139 cycles, approximately **0.719T/h**. The comparable paused
242.981-second interval retained the same gameplay head and declined
904,724,823 cycles, approximately **0.0134T/h**. Known treasury credit counters
and the reservation gap were unchanged within each pair.

These short operational samples include calls/storage/refunds and verification
traffic, with query-timing and execution-reservation uncertainty. Their
difference is only approximate gameplay attribution, not a gross billed meter.
The live tooltip identifies net-rate sample age/discontinuities; the display
can return to Measuring after positive balance/refund movements and showed a
short volatile estimate in the controls snapshot. Do not infer future income,
a precise gameplay bill or days of runway from these readings.

## Evidence custody and screenshots

Complete new CI ZIPs/extractions and independent manifests remain under
`.work/btz-prelaunch/ci-{41103639507,41103647264}/`. Full mainnet commands,
outputs, certificates, catalogs/artifacts, controller snapshots, raw browser
responses, failed measurements and independent manifest remain under
`.work/btz-prelaunch/release1-mainnet/`. Reviewed JSON and manifest digests
accompany this report. No private key, seed or credential was collected.

- [Before desktop](before-1440x900.png) / [before mobile](before-390x844.png)
- [After desktop, identified and centred](after-1440x900.png)
- [After mobile](after-390x844.png) / [scrolled mobile View controls](after-390x844-view.png)

This is the first of at most two authorised runtime releases. It is deployed;
the remaining v6 release is separate unfinished work. Remote Git publication
and merging still require the user's authenticated session because the available
Git connections lack repository write access. Do not repush the unchanged CI
head or repeat a sustained trial for this evidence-only record.
