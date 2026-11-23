# Rules18 and temporary Full Speed mainline qualification

The branch ancestry checked before integration was `master` at
`0b4f8f5daf3360373a8a519c526ecedf2dd4fa49`, then the Rules18 branch
at `366b6954cc0df7dba75cd70318fdaf3072430914`, then the developer-speed
branch at `f130868c518c2c0f5af512310976674e8e9f86ba`. Git verified both
ancestor relationships. Advancing mainline in that order requires only
fast-forwards. The final speed runtime qualified at
`c4bbc077a0be393d1c99f49f064e795dfaceafd3`. The commits after that revision
and before this CI integration contain only
[evidence changes](https://github.com/aodl/balls-2-the-wallz/compare/c4bbc077a0be393d1c99f49f064e795dfaceafd3...f130868c518c2c0f5af512310976674e8e9f86ba).
The first integration changed only workflows, verification tooling, predecessor
fixtures and documentation. Its full installed-IC run found seven browser
failures, including three reports of `targetPresentationRate is not defined`.
The smoothing release had replaced that helper, leaving its warm-return caller
behind. Commit `53e737c382e0cc0299cf8c35dd5e2449cc78ce70` routes warm return
through the shared rate controller. This is the integration's only runtime
source change. The candidate therefore has a new frontend Wasm.
The developer backend still reproduces the live-qualified Wasm.
[Installed-IC failure evidence](https://github.com/aodl/balls-2-the-wallz/actions/runs/45239563719/job/137922316837)

The standard workflow previously validated Rules18's historical frozen inputs
against the newer developer-speed checkout. Source, Wasm, browser and embedded
frontend qualification failed at the historical freeze check.
[Previous verification run](https://github.com/aodl/balls-2-the-wallz/actions/runs/45131205716)

The historical verifier still checks the exact Rules18 freeze, now in a
detached checkout of its qualified source `351d96d7059f7f84957af1470c86a7028c588392`.
The mainline workflow separately checks the reviewed integration inputs,
reproduces both historical and current public embedded frontend builds, and
matches the current normal runtime Wasm to the executable used for installed-IC
acceptance. The Wasm gate, Candid verification and normal installed build all
select the same `public-launch` Cargo feature. The developer and fault-test
modules remain separate. The standard, financial and developer workflows all run on pushes
to `master` and pull requests targeting it. The developer run rehearses both
exact predecessor upgrades, official disposable Ledger inputs and independent
replay. Its candidate builds must match the pinned frontend candidate and live backend digests. The two
original Rules18 workflows remain historical qualification evidence.
[Standard Rules18](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109997) ·
[Rules18 financial](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109925) ·
[Qualified live Full Speed](https://github.com/aodl/balls-2-the-wallz/actions/runs/45154201076)

The public runtime build fails if the developer and public Cargo features are
enabled together. Its Candid export test rejects each of the three developer
methods. The ordinary embedded frontend rejects developer assets, and the
current public observer inventory is independently checked for their absence.
The installed developer qualification uses the explicit developer build.

A read-only IC certificate check on 2026-11-23 matched both installed Wasm
digests to the qualified speed release. The production report records 102 ticks
in the 120-second window, a 1.176-second median sampled publication gap and no
stalls across 566 Chromium playback samples. That is the measured rate of
roughly 0.85 tick/s under those conditions. Sustained wall-clock 1 tick/s is
still an open performance target. These measurements do not separate timer
dispatch, replica scheduling and checkpoint execution time or establish a
throughput ceiling. [Measurements and module identities](SMOOTHNESS.md)
