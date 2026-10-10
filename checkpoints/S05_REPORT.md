# S05 — Atomic orchestration and observation

20 September 2026. Delivered as a **source-and-conformance checkpoint**. Promotion remains **BLOCKED**. No deployment or real-funds authorization.

The supplied S04 archive was extracted and every payload hash verified before copying it into a new tree. All previous source and evidence are retained. The predecessor archive identity is recorded in CHECKPOINT.json; no conversation-only or hidden Git state is needed to continue.

## Delivered

1. An executed generic atomic coordinator combining prefix ingestion, input reservation, kernel staging, completed publication and source retirement. The public head and source acknowledgement cannot be durably separated. Life and BTZ share it.
2. A matching authored native `dtr-host` module with a game-independent trait, canonical seals/manifests/images, and BTZ-side adapter. Native compilation/equivalence is still unverified, rather than inferred from JS tests.
3. Five complete host-operation fixture workloads, saved-image resumption tests and a real native gate for intermediate bytes and both directions of continuation. Six toy-kernel native unit tests are authored, not counted as executed.
4. A bounded publication catalog and independently constructed Python reference. The browser-compatible assembler verifies ordered chunk identities and complete artifact hashes before returning data. Pending cursor/board data is not published.
5. A fail-closed certificate-verification dependency contract. Tests exercise deployment, time, root and mutable-buffer handling with labelled stubs; **no actual IC signature/certificate verification is claimed**. Offline demo tickets explicitly say `offline-pinned-content`.
6. A shared presentation clock with initial headroom, bounded speed/slew correction, exhaustion clamping, recovery, gap rejection and bounded tab-resume catch-up. No rendered BTZ browser application is claimed yet.
7. A new controller-only source IC runtime laboratory integrating native coordinator state, stable chunks, public committed artifacts and actual certification API calls. This is uncompiled synthetic-input infrastructure, not production ledger authority.
8. Separate-process demonstration/tests for source sealing and atomic publication with lost acknowledgement. A repeated publication reconciles without new purchases or revision changes. Documentation, authority boundaries, gates and complete packaging discipline are updated.

## Executed evidence

The final source suite records **1,236 Node tests and 47 Python tests**, with zero Node failures/skips/cancellations. These totals retain earlier checks and add 128 Node and eight Python tests; they are not native or IC counts.

New fixture coverage includes 40 saved-host-image continuations (five workloads), 29 coordinator tests, 41 observation/integrity/sequence tests, 13 playout tests and five independent publication cases. Categories are included in the total, not additional test totals.

The authored native host runner expects 60 comparison lines and four native-to-JS continuations. Existing native gameplay/numeric/cursor gates remain. They have not executed without Cargo/rustc.

See [machine-readable verification](../evidence/S05/verification/verification.json), environment and adjacent logs. The full gate reports source checks separately from BLOCKED native/IC/release checks. Archive-specific fresh extraction, manifest/source rerun and repeated-byte equality are recorded in the external release verification JSON.

## Design consequences and qualifications

**Atomic publication/retirement:** the old separate primitives remain useful and tested, but the new coordinator owns their atomic connection. Failed kernel initialization cannot leave an orphan reservation. Inputs arriving after a seal survive for a later segment. Stale proposals cannot erase a newer source/host state.

**Full-prefix seals:** the coordinator uses the complete currently supplied verified prefix. It does not invent an anchor for an arbitrary interior cutoff. This makes replay explicit but does not settle production checkpoint timing/fairness. Laboratory controllers supply synthetic inputs and seals, which is not a public-payment protocol.

**Content vs authentication:** one bounded publication digest covers a flat list of artifact hashes. At <=1 MiB per artifact, this is simpler than another Merkle framework. Real IC authenticity requires the missing audited certificate dependency and actual integration tests. Mutable transport bytes are copied before awaits; duplicate chunks, stale catalogs, rollback and sequence gaps are tested.

**Storage and costs:** whole-image clone/hash/serialization remains bounded but inefficient. The JS/native coordinator model cap is 8 MiB; the IC lab caps each artifact/image at 1 MiB and its root at 64 KiB. Public chunk queries read the small root and one output chunk, not a hidden full cursor. None of these limits or local tests establishes an IC instruction/cycle budget. Metrics remain unmeasured/null.

**Upgrade posture:** runtime-lab is a distinct version-5 laboratory, not an untested v4 migration. Its source validates before no-await writes, verifies existing state on upgrade and reinstates certified data. Actual rollback, permission and recertification behavior remains a PocketIC/IC gate.

## What did not change or ship

No BTZ rule, price, spawning/annihilation mechanism or v3 output codec was changed. No real ledger/archive calls, payment destination, wallet integration, certificate SDK, rendered browser game, payout/financial liability service, actual cycle telemetry or production release was introduced. Rust source may still contain compiler or semantic defects; successful native/Wasm execution is not inferred from source inventories.

## Next substantial checkpoint

Prioritize running and repairing the native gameplay/host conformance gates in an authorized toolchain-capable environment. Connect authenticated replicated ledger/archive reads and explicit checkpoint timing to the durable coordinator; exercise stale callbacks, traps and upgrades in PocketIC. Integrate a real certificate SDK against laboratory responses and then build the renderer/history retrieval on verified artifacts. Keep settlement and real funds gated behind source authority, durable liabilities, review and operational measurements.
