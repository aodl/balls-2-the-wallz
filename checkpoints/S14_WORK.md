# S14 implementation record

Baseline: BTZ `c75192cb2e4c33a04675b57abfd4d42121255bfd`; DTR checkout `436ec0f940f1179710b6a596d5b64d22f306fba5`, implementation pin `71e59e93cf49a3656689679b538b4c3f138787f8`. Both worktrees were clean. All publication and real-money operations remain user-owned.

## DTR_CHANGES (notice before shared edits)

DTR-A: dense `Ingest` assigns `start + offset`, although existing inputs and seals support gaps. Add `IngestOrdered { start, end, inputs, anchor }`, sharing admission validation with dense ingestion. Source ranges describe adapter progress, not independent inspection of omitted global records. Test sparse gaps, invalid ordering/ranges/overflow, capacity atomicity, interruption recovery and unchanged dense/Life behavior. Public encodings remain unchanged.

DTR-B: `localCertificateVerifier` and `localLiveClient` restrict network to `pocketic-local`. Generalize the same implementation to explicit local configuration and `ic` with the SDK mainnet root, retaining compatibility wrappers. Test root-policy rejection, network/canister binding and existing certificate, chaining, anti-rollback and artifact checks. No payment/index/poke types enter DTR.

Each change receives a separate DTR commit and standalone tests. BTZ development uses explicit temporary local dependency overrides; remote-pinned validation waits for user publication.

## Deletion / retention map

| Remove from active application | Retain / replace |
|---|---|
| Global ledger `query_blocks`, archive traversal and global scan benchmarks as release gates | One official ICP account-index reconciliation adapter; historical evidence remains historical |
| `ledger_hint`, controller synthetic ingestion and manual Seal/Step/Publish production methods | Exact authenticated target-bearing `poke`, independent fallback, authorized pause/resume |
| Local-only client policy | One network-configured SDK verifier/transport with local wrappers |
| Old disposable-source upgrade requirement | New index-source progress, pending-range and game upgrade recovery |
| Alternative source modes and notification routes | One receiving account and one coalesced reconciliation |

Preserve kernels, prices/memos, deterministic outputs, scores, publication v6, animation v1, bounded retention, Life, replay and certificate safety tests. No payout implementation or public paid launch is included.
