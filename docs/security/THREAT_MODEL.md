# S01 threat and authority boundaries

This checkpoint is test-only. It cannot receive player commands on-chain and has no payment destination or settlement implementation.

| Threat | Present evidence or design | Remaining gate |
|---|---|---|
| Browser changes its own simulation | Observer is non-authoritative by design | Certified retrieval and deployed arena absent |
| Malformed memo / u64 rounding | Exact-size/version/reserved-bit tests; numeric helper outputs strings | Real wallet transport tests |
| Allowance spender moves owner's cannon | Delegated Transfer rejected by classifier | Wire adapter and canister integration |
| Duplicate/gapped/source pages | Pure contiguous-prefix tests, archive-route validation | Real replicated ledger/archive reads and stable atomicity |
| Stale callback overwrites newer cursor | Lease-generation model tests | Upgrade/delayed-call PocketIC tests |
| Hint spam drains cycles | Coalescing, minimum spacing, optional sender allowlist model | Actual canister ingress/callback costs; no zero-cost promise |
| A partial segment leaks as truth | Generic runner commits only complete output | Stable staged-state publication/certification |
| Different work slices change results | Independent Life vectors and interruption tests | Native/Wasm/target runtime verification |
| Forged snapshot | Hash check against an externally trusted expected hash + strict decoder | Certificate verifier and replay distribution |
| Read-ahead bots | Explicitly accepted; no claim that buffering removes them | Game economic analysis |
| A timer stall changes accounting days | Logical time distinct from UTC operational periods | Period/settlement implementation |
| Upgrade erases money/state | No funds used; durable architecture required | Arena migration tests and earned-obligation journal |

Do not apply a 'donation' policy to corrupt/unrecognized ledger wire data: that is an ingestion fault, not evidence that a valid game command was underfunded. Decoder uncertainty must not silently consume a payment's chance to act.

No live cycles balance or fabricated 'cycles burned' estimate is exposed. Future telemetry records provenance, covered canisters, UTC interval and measurement quality; it stays outside deterministic scoring. Any ETH-equivalent comparison remains disabled until its denominator/methodology is explicitly chosen.


## S02 additions and non-claims

The host tests late proposals, atomic cursor/effect replacement, idempotent publication, staged-state invisibility, reserved-input retention and lost acknowledgement. Internal proposal/storage methods are trusted host code, not unauthenticated remote methods. The demo's local checksum is not a public proof. Kernel schemas reject noncanonical byte forms; authentication still needs a trusted digest/root.

Snapshot tests include interruption during a partially transferred territory. Such scratch must never be served as the public board. Scores survive cannon elimination, but this is not yet monetary settlement. S02 fixture accounts are synthetic; its normalized envelope has no independent source proof.

Existing hard limits bound the reference, not a production DoS assessment. Known cost risks include full-board event scans, exact-fraction scoring and whole-document snapshot rewrites. No real cycles balance/consumption, secure public observation, lock-free multi-process service, spawn grinding defense or time-window fairness claim is made.


## S04 additions and non-claims

The chunk-backed journal tests generation fencing, corrupt/reordered chunks, committed-root protection, orphan collection, capacity backpressure and explicit partial-upload recovery. A storage image hash requires trusted metadata. A malicious party supplying both image and hash is not authenticated. The local demo refuses silent corruption recovery or stale-lock takeover.

The new native dependencies are direct-pinned, not transitively locked/audited. The complete Rust source is uncompiled; parser/type/ownership/API errors and untested semantic divergences remain risks. Canonical key sorting is explicit and does not rely on default serde_json map features surviving dependency unification. Numeric precision retains protocol caps; unlimited bignum growth is not admitted.

The IC laboratory is privileged synthetic-input test infrastructure, not the game's authority. Its only mutating endpoints are controller-gated source with revision checks. It has no ledger, transfer, funding, randomness, timer, arbitrary-call or upgrade-controller method. The guard has not been executed under PocketIC. No public certification is claimed. Mutations validate before stable writes and do not await; unsupported upgrade roots trap rather than resetting to genesis. Actual trap/upgrade/storage high-water behavior remains a mandatory gate.

S04 has not reduced the risks around legal/economic mechanics, paid rejection races, public look-ahead optimization, admission grinding, source completeness, treasury liabilities or controller upgrades. No real-funds release is authorized.

## S05 additions and non-claims

The combined coordinator removes the model-level gap between publishing output and retiring its source reservation. Native source implements the same contract but remains uncompiled. Source ingestion is still a trusted-adapter input in JS and controller-supplied synthetic data in the new IC lab; an arbitrary source anchor is not proof of ledger completeness.

Public catalogs contain no pending cursor. Content verification checks bounded, position-bound catalogs and complete artifacts. Certificate authentication is an explicit missing dependency, not implemented with a callback returning an unexamined true/false. The wrapper checks supplied verifier results, deployment and certificate time, but its stub-based tests do not establish BLS validity. The application must supply an audited verifier and pinned network trust root before production. No key is learned from an untrusted replica.

Mutable transport buffers are copied before async hashing, catalogs are frozen, and anti-rollback/chain checks precede continued observation. An offline root stored beside a file remains only a local integrity aid. Anyone who controls both can rewrite both. Certified data proves what the canister published, not that the deployed rules, controller policy or input cutoff is fair.

S05 still has whole-image serialization, latest-only catalogs and no real cycle-drain measurement. Early controller checks do not make malicious ingress free. All resource/admission claims remain bounded reference limits; no public-money or availability guarantee is added.
