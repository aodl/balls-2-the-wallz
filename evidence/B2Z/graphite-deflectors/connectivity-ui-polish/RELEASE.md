# Exact connectivity and graphite release

| Identity | SHA or Git commit |
|---|---|
| Clean frontend build source | `475158995f739a4d81ea725541a64acd69c181b3` |
| Exact hosted qualification source | `a9f453974d0051317186b2d0060f29f2e330267b` |
| Complete 81-file inventory | `557569b78dbf49052d3990bd68253cbb68c23e034d47f49565a65080b3a8301d` |
| JavaScript | `f15de5448fb260a0a7495f659495fd6755e080116ecd473635367c9e0c5bf4d0` |
| Stylesheet | `f7f0ff1a3a79a0f96e008adda116bc3ba44c69e8971ca24d0e0670d1072aedbb` |
| Unchanged audio manifest | `76ed1de786dfa2be2aaf71838b73ce93b73f463df846281df8a0569f80edf20c` |
| Independently verified recovery inventory | `3ea59d7c6d8df7a2f1aa7bb2ce27e7e48243e021dca4abcadaea1dd85cd3c909` |

The freeze changes the observer bundle, index markup, stylesheet and
provenance manifest. Every other asset matches the recovery set, including
the upload policy and all 61 audio files. There is no change to the renderer
models, source protocol, canister Wasm or deployment policy.

The candidate stage is `.work/connectivity-ui/final/stage`. It maps only
observer `s2jxj-liaaa-aaaas-amynq-cai`. The existing exact recovery project is
`.work/premium-graphite/combined/stage`. A separate retrieval verifies the
old 80 public assets, signed inventory and certificates. The recovery asset
set remains independent of the new stage.

The scoped operation uses `dfx deploy observer --network ic --no-wallet
--no-asset-upgrade` from the isolated project with `DFX_IDENTITY=codex_local`
and `NPM_CONFIG_IF_PRESENT=true`. No backend, Ledger, funding or operating
operation is part of this work.

[Exact hosted qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/44507600639) ·
[Artifact inventory](artifacts/frontend-inventory.json) ·
[Input provenance](artifacts/provenance.json)

The first hosted run failed the installed-IC qualification in the
million-cell timing evidence reader. The backend was still running Normal
pace. After the 900-second browser measurement the reader opened the timing
JSON during the writer's truncate-and-replace window and received an empty
file. The next source publishes timing snapshots by atomic rename on the same
filesystem. A Rust regression opens the first snapshot, publishes the next
snapshot, and requires the in-flight reader and new opener to each read a
complete version. Duration, playback checks, required assertions and frozen
asset bytes are unchanged. The failed run was never used for deployment.

[Initial hosted failure](results/first-installed-gate-failure.json) ·
[Verified prior frontend recovery](results/verified-recovery.json) ·
[Exact frozen-byte reproduction](results/exact-freeze-parity.json)

Reprocessing the first run's archived complete timing and browser samples
after the failure found 900.15 s of continuous playback. It showed 1,730
PLAYING samples, no resynchronisation and an average 1.000 displayed tick/s.
This diagnoses the timing handoff independently. That reconstruction does
not substitute for rerunning all six hosted gates. The local Rust test also
passed the new open-file replacement regression.

[Independent timing reconstruction](results/first-installed-posthoc-playback.json) ·
[Local atomic replacement test](results/atomic-timing-regression.log)

## Production result

The six substantive hosted gates passed on
`a9f453974d0051317186b2d0060f29f2e330267b`. The separately labelled production
inventory job is informational. The exact assets-only upload started at
11:52:56 UTC on 2026-11-19. The scoped stage mapped only the observer.
The frontend asset module remained
`04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.

Fresh checks verified 80 public files against the frozen bodies, lengths and
expected headers. The signed inventory matched. Each public path and all
four registered gzip representations passed IC HTTP v2 witness validation
against the pinned mainnet root. The compressed representations decoded to
the expected asset hashes. All 61 audio files matched the independent
recovery inventory.

The Rules12 backend module remained
`2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13`.
Authenticated head 12347 descended from the exact before-release head 12346.
World structure records, received total and source cursor `40180669` matched.
There were zero new receipts between the verified heads. Operational queries
showed Trickle, one tick per publication, admission open, healthy source and
zero pending records. Natural gameplay progress accounts for the change in
world hash. There was no backend installation, rule change, payment, funding
or operating-setting operation.

[Hosted gate results](results/hosted-candidate-gates.json) ·
[Verified public assets](results/live-served-assets.json) ·
[Signed asset list](results/live-signed-inventory.json) ·
[IC-v2 bodies and headers](results/live-http-v2.json) ·
[IC-v2 gzip variants](results/live-gzip-http-v2.json) ·
[Certified before and after](results/live-certified-before-after.json) ·
[Paid state and authenticated history](results/paid-state-invariants.json)

Production browser acceptance passed for the 325-second read-only watch,
the 320×640 degraded-delivery probe, the desktop and mobile pasted-value
checks, and native tab-return audio. The previous 81-file recovery package
was retained and no rollback was required.

[Production functional acceptance](FUNCTIONAL_ACCEPTANCE.md) ·
[Normal-size comparison](VISUAL_COMPARISON.md) ·
[Measured performance](PERFORMANCE.md) ·
[Connectivity diagnosis](ROOT_CAUSE.md) ·
[Local control and Copy matrix](INTERACTION_SAFETY.md)
