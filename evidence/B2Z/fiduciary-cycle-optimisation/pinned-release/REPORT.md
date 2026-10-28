# Published DTR77 / pinned A2 release-artifact qualification

**DTR publication and immutable pinning are complete. Release remains NO-GO:
the strict matched delivery gate is environmentally BLOCKED and final B2Z CI
requires user-owned publication.** No account audit or reset decision was repeated.
No mainnet action, funding action or B2Z remote write occurred.

## Exact published dependency and build

[DTR77 on GitHub](https://github.com/aodl/dtr/commit/77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68)
resolves to reviewed tree `068c66829619741b6784306929b51e292cb58bcf` on
`review/b2z-fiduciary-dtr77`. GitHub REST and an independent Git fetch agree;
the fetched object descends from E1. No replacement commit or master change was made.
[Published DTR CI 40763780824](https://github.com/aodl/dtr/actions/runs/40763780824)
passed its standalone job.

The four B2Z Rust manifests/locks and the separate Rust-consumer fixture now pin
`77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`, Rust version `0.14.1-cost.1`.
Every unrelated package name/version/source/checksum tuple is unchanged in all
five lock graphs. The initial broad Cargo update proposed unrelated native-lock
changes; it was rejected and replaced by targeted updates, with the failed log
retained. Consumer/source/freezer provenance anchors now require 77. Guards remain
enabled and the resolved-graph check passes. No path patch, development override
or Git URL rewrite is used.

The original npm **0.14.0** archive remains byte-identical:
`ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`.
A fresh ordinary Git Rust consumer, immutable-source archiving, all 23 npm payload
entries, reproducible npm pack and independent JS consumer passed. E1 remains the
historical origin of the unchanged JS archive, explicitly separate from Rust77.

**Normal release-candidate Wasm:**
`2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb`
(2,800,907 bytes). No test/benchmark exports. An empty-target normal build matches
byte-for-byte; the ordinary Wasm/Candid gate independently reproduces this hash.

Initial pin/build source: `3f71a5acaffc8069668547229c339d93f6176cc9`.
Reproduced normal build source: `ac65063eff989e2e1de346b9f6ab36f2e3178ad3`.
Later handoff changes are reviewed qualification evidence only. Backend source,
wire interfaces and locks remain identical to that reproduced build. The original
B2Z functional D6 implementation is unchanged. A0, A1 and research A2 `0d86ac64…`
remain separate immutable baselines; this new Git-built artifact is not relabelled
as the research binary.

## Actual matched normal-Wasm measurements

All costs below are **billion actual local fiduciary cycles per completed tick**;
the charges already reflect the fixture's 34-node tariff. No second 34/13
multiplier is applied. They are not measured mainnet candidate burn.

| Fixture | Ticks | A0 | A1 | Pinned A2 |
| --- | ---: | ---: | ---: | ---: |
| 2 balls, fixed | 8 | 1.234662 | 0.843425 | 0.532806 |
| 3 balls, fixed | 8 | 2.249651 | 1.532517 | 0.879016 |
| 4 balls, fixed | 8 | 3.528516 | 1.937161 | 1.118600 |
| Captured 3-ball world | 8 | 2.861076 | 1.620462 | 0.932874 |
| 3 balls / 2,048 overrides | 2 | 10.983300 | 8.154198 | 4.489459 |
| 64 balls / 2 cannons | 1 | 38.673751 | 37.703030 | 17.445001 |
| Genuine paid-v8 paused upgrade | 8 | 2.338747 | 1.629753 | 0.915304 |

For the fixed 2/3/4-ball cases, A0/A1 costs exactly match the preserved research
controls and final publication/artifact commitments match research A2. New A2
costs differ by less than 0.08%, all slightly lower. Thus the pin/build change
preserves demonstrated savings; different fixture windows do not justify applying
the earlier 64-tick 68.04% saving universally. The original 64-tick research
measurement remains intact, not presented as a new release-binary measurement.

The raw measurements retain per-tick cold/warm debits, driver message counts,
source calls, memory, phase instructions, output sizes and commitments. Driver
counts are not a full replica callback census. Maximum recorded A2 driver work
is about 874M instructions in the fragmentation case and 2.083B for 64 balls.
The 600M trigger remains a between-action yield, not a hard whole-message limit;
final destructor/timer tails are outside that counter. No work cap, pacing,
scoring, arithmetic, retention or publication behaviour changed. No universal
one-tick/s capacity claim is made.

## Executed qualification

**Nine focused normal-Wasm cases PASS:** fixed 2/3/4-ball costs, captured world,
fragmentation, population, paid-v8 paused upgrade, unfinished-phase/torn-image
recovery, forced normal-module timer trap, genuine v8 browser/reconnect, and
pending treasury notification recovery. Cost profiles are v5 worlds with v6
genesis; genuine paid-v8 recovery/browser evidence is separately labelled.

Recovery uses exact frozen A0 and matched A1 controls. State/events/scores,
seals/manifests, retained artifacts, source progress and complete financial state
match. Torn stable data is rejected. Pending treasury callbacks resume correctly
after preservation. Conversion credits in that callback test are not counted as
cycle savings. Timer-trap recovery remains controlled pause/start in disposable
IC, not unattended liveness. Actual installed normal bytes are the pinned A2
artifact; the separately checksum-pinned native E1 harness is intentionally an
independent differential oracle, not the production dependency graph.

**Local gates PASS:** source conformance; native conformance; normal Wasm,
generated Candid, format and Clippy; real HTTP/Web Crypto browser; packaged DTR
and clean consumers. The initial source gate correctly rejected its stale E1
allowlist; the exact source/freezer anchors were updated to 77 and the corrected
gate passed. One captured-state invocation incorrectly supplied observation JSON
and was rejected before module execution; the original failure remains, and the
canonical recorded state bytes passed in a new output directory. No runtime
failure or acceptance predicate was suppressed.

## Delivery and CI remain independent gates

After all builds/tests stopped, the reviewed 65-second resource prerequisite
collected 13 samples. It rejected median idle **52.6%**, I/O full-pressure peak
**11.95%**, and another process exceeding 0.25 core. The original requirements
(median idle ≥70%, minimum ≥40%, CPU PSI ≤10%, I/O full PSI ≤2%, ≥2 GiB memory,
no swap/throttling or competing heavy work) remain unchanged. Neither 900-second
window started. Short certified v8 playback does not replace this gate. Historical
delivery FAILs and uncertainty about their cause are preserved.

On a dedicated/quiet host, run the sequential A0/final-A2 comparison with explicit
`--a2-sha256 2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb`.
The runner now accepts an explicit checksum-pinned release artifact while retaining
the old research hash as default. Its 900-second assertions, frontend equality,
authentication, buffer accounting and zero-stall/zero-resync criteria are unchanged.
Do not count test-hook modules used by subsequent fault phases as Normal binaries.

All six substantive GitHub B2Z jobs must pass on the **final newly published
handoff commit**, with DTR77-resolution evidence. No B2Z push was authorised or
performed. The old E1 build's CI does not qualify this artifact. The full installed
suite and ignored-case receipts remain separately identified; the nine explicitly
executed cases above are not inferred from generic CI.

## Handoff boundary

The user may publish the reviewed local branch after checking its exact final
handoff SHA and clean worktree:

```sh
cd /home/codexdev/src/b2z
git rev-parse HEAD
git status --short
git push origin HEAD:refs/heads/qualification/b2z-a2-pinned
```

No master merge, force push, frontend deployment or production operation is included.
After quiet-host delivery and exact-commit CI pass, refresh production module,
controllers, authenticated state, treasury/source status and the complete upgrade/
recovery/maintenance/funding budget. The accepted path is the existing v5→v5
state-preserving upgrade with empty arguments, requiring fresh explicit mainnet
approval. Existing frontend and 34-node fiduciary placement remain fixed.

[Machine-readable results](qualification.json) and [independent raw-evidence manifest](raw-evidence.json)
identify the exact artifacts, commands, failed invocations and resource evidence.
