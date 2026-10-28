# DTR77 implementation review — 28 October 2026

Reviewed pair: E1 `e1bfcf25071d11190d14f461288e12a21ca26cf8` →
`77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`, tree
`068c66829619741b6784306929b51e292cb58bcf`, Rust `0.14.1-cost.1`.
The candidate remains unpublished at the recorded remote checks. This is a local
implementation review, not upstream publication or release approval.

The independently readable bundle is
`/home/codexdev/b2z-release-evidence/a2-dtr77-review-20261028/`.
Its `SHA256SUMS` hash is
`7f7762d5761ca22667daad016f1bb7773c4458056a1da909b973648709a25235`;
all 147 entries were checked. It contains **complete E1 and DTR77 source trees**,
their portable tar archives, `E1-to-DTR77.patch`, five ordered commit patches,
`DTR77.bundle` with its explicit public-E1 prerequisite, and the unchanged npm
archive. The B2Z source archive alone was insufficient; this bundle supplies the
actual implementation without dependence on an earlier chat workspace.

The complete diff changes six files: workspace version/lock, `dtr-wire` canonical
writer/hex, `dtr-host` private validation proofs, and their generic regressions.
No B2Z kernel, IC call, payment rule, epoch wire format or npm source is added.

| Review boundary | Finding and evidence |
| --- | --- |
| Canonical writer | `dtr-wire/src/lib.rs` validates the same `Value` first, recursively emits explicit sorted keys, and delegates primitive/string escaping to the same serde implementation. The old sorted-tree writer remains a test oracle. Decode still parses, re-encodes and compares the **complete input bytes**, then performs typed decoding. |
| Hex | Preallocated lowercase lookup preserves all byte values, empty input and large fields. `unhex` retains lowercase-only and length rejection. Capacity overflow/allocation remains a trap, not a newly successful malformed input. |
| Complete record proof | `checked_record` requires deep equality of the whole `Record`, not revision equality. A mutated public record, including same-revision mutation, misses. The original validation path checks schema, source, reservations, cursor, ready output and image size before installing a proof. |
| Head proof | Key includes complete Head, Identity, optional Epoch and acknowledgement. State digest, manifest, epoch and acknowledgement checks remain on every miss. Matching a revision alone cannot authorize a changed head. |
| Restore/trust boundary | Restore still checks the externally supplied expected hash and size, canonical decoding, full validation and snapshot equality. Each fresh Coordinator starts with empty proofs. No public trusted-byte token or cross-canister trust shortcut was introduced. |
| Errors and proposals | Proposals work on a cloned record; ordinary `Err` does not install partial authoritative state. Failed record validation clears the optional proofs. Snapshot bytes are cloned; modifying an exported copy does not modify cached bytes. |
| Bounds and fallback | Record/head proofs are optional and gated by 256 KiB **encoded** size. Oversize objects take the original path. Typed heap objects, Vec capacity, strings and copies can exceed this encoded size; this is not a 256 KiB physical-heap guarantee. Full normal-Wasm memory measurements remain separate. |
| Lock scope | Mutex guards cover equality/copy/proof replacement only. They are dropped before kernel callbacks and validation work that can invoke a kernel. There is no guard spanning an IC await. Native concurrent `&self` use can duplicate validation work, but cannot make a mismatched public record trusted. Poisoned optional proofs are cleared before fallback. |
| Native compatibility | `Send`, `Sync`, `UnwindSafe`, `RefUnwindSafe` compile assertions pass for an eligible pure kernel. The earlier RefCell variant is not the selected implementation. Poison/unwind regressions also pass. |

Fresh commands in `/home/codexdev/src/dtr-b2z-cost-sync` all exited zero:

```sh
cargo test --workspace --locked --offline
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked --offline -- -D warnings
npm test
```

The Rust tests include same-revision corruptions, bad acknowledgement/source/
identity/epoch, output-copy isolation, failed proposal reuse, oversized fallback,
canonical bytes/rejections and poison recovery. The canonical corpus covers
duplicate/unsorted keys, whitespace/escape variants, negative zero, reserved keys,
malformed UTF-8, depth/node limits and lowercase hex. This is finite regression
evidence, not a proof for every allocation failure or every possible native kernel.

A fresh **unrelated Rust consumer** was built from the checksum-verified DTR77
tree with a deliberate new isolated consumer lock, then `cargo run --locked
--offline`. A separate JS consumer used `npm ci --ignore-scripts` and `npm test`
with the original npm 0.14.0 archive. Both passed, as did the DTR JS suite. The
archive SHA-256 remains
`ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`.
These source-tree consumer checks are explicitly **not a remotely resolved Git
consumer test**. That gate requires user-owned publication first.

A second independent generic consumer ran against **both E1 and DTR77**: eight
native threads each perform 50 validation/snapshot/proposal iterations, with a
kernel callback that re-enters its owner's read-only snapshot API. Both finish
without blocking. A deliberately panicking kernel callback is caught; subsequent
snapshot and proposal bytes remain unchanged. Both implementations produce the
same snapshot digest `68097d7398e034dc91b2cee5ab06f2e066159eb4fa4db57df5e0fda1377e0816`
and proposal digest `572b9107a48a8b6ceb919e90eaf2186f957df5d0cb846c65af3ef8a91cbdd5d0`.
`raw/thread-main.rs`, the two consumer directories, per-command logs and
`raw/thread-equivalence.json` preserve this bounded concurrency/reentrancy/unwind
experiment. Its initial Python-driver syntax error occurred before compilation;
the failed log and corrected driver are both retained. No DTR source was edited.

No new defect requiring a DTR implementation change was established. Preserve the
reviewed 77 revision. The immutable Rust pin, clean remote consumer, resulting
normal B2Z artifact, exact-artifact qualification and final exact-commit CI remain
separate gates; see [the guarded continuation](FUTURE_RELEASE.md).

Raw commands, exit codes and logs: new independent qualification snapshot
`raw/dtr-tests.json`, `raw/dtr-*.log`, `raw/clean-consumer.json`,
`raw/clean-consumer/`, plus the original immutable snapshot's generic concurrency
and cross-language differential evidence. No npm rebuild or frontend publication
is needed for a Rust-only implementation change with these unchanged JS bytes.
