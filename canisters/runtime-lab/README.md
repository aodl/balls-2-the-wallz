# Current runtime laboratory — local test infrastructure / do not send ICP

`runtime-lab` is the only current IC host. It uses the existing native coordinator and BTZ adapter and publishes the unchanged v6 flat catalog. It is not a production arena, payment destination, wallet, payout service or mainnet deployment.

The five initialization arguments are genesis state, synthetic source ID, source cursor, logical start and an optional `LedgerConfig`. Without the option it retains the controller-only synthetic path. With the option it requires network `pocketic-local` and fixes the trusted ledger principal, recipient account, page bound, fallback interval and optional hint caller. Ledger-fed mode rejects generic `apply(Ingest)` so an external caller cannot bypass source validation.

The ledger path calls the pinned ICP ledger's typed `query_blocks` method and only follows bounded `get_blocks` callbacks supplied by that ledger. It validates operation shape, account identifiers, direct funding account, configured destination, transferred amount and numeric/blob memo rules before constructing the existing `BTZPAY02` envelope. Mint, burn, approve, self/outbound and unrelated records advance the contiguous source cursor without creating game inputs. Delegated transfers and conflicting/invalid memos cannot issue commands. Gaps, overlaps, malformed/rejected replies and out-of-range archive responses retain the cursor for retry.

Hints contain no ledger data and grant no authority. They set one durable dirty bit and coalesce. Each one-shot fallback timer arms its successor before the bounded external await, so a callback trap cannot abandon scheduling and missed intervals do not queue an unbounded timer burst. The call timeout is 30 seconds; after a further 15-second grace period, an ordinary scan may replace a canceled or stuck durable lease. Ledger identity, source generation, nonce and cursor fence every completion, so a late response cannot mutate or clear its replacement. Upgrade invalidates any old lease and reinstalls certification and scheduling state.

`apply` remains controller-only for seal/step/publish and synthetic tests. Sealing uses the verified cursor visible to the controller and records the actual source watermark; it does not claim a fair production wall-clock cutoff. `controller_work` is controller-only. Public `lab_status` exposes mode and watermark but not pending input bytes or the private work cursor.

Memory 0 contains the bounded root and memory 1 bounded chunks. Slot 0 is the hidden coordinator image; slots 1/2/3 are committed state/events/scores. Each artifact is capped at 1 MiB and the root at 64 KiB. Publication/input retirement and certified-data replacement occur in one update message. Upgrade validates the host and every committed artifact, restores certified data, and traps on incompatible durable bytes instead of installing genesis. The `test-hooks` feature adds focused rollback, scan-capacity, post-response trap and stale-completion fault injection; the normal Wasm exports none of those endpoints.

`observation` returns the flat canonical publication and the system certificate. `artifact_chunk` requires the current catalog root. The S09 harness verifies this with exact standard agent libraries in Rust and Chromium using a root deliberately obtained from the same disposable PocketIC instance. No client automatically fetches or trusts a replacement root.

Run the complete local slice from a Python 3.11 Playwright environment:

```sh
python -B tools/verify_s09_local.py --output .work/s09/final
```

The command checksum-validates pinned PocketIC/upstream ledger artifacts outside the checkout, builds normal and test-hook Wasm separately, runs install/authorization/trap/upgrade/ledger/archive/fallback/recovery/native-equivalence/certificate tests, then runs the existing observer through loopback HTTP and browser-native Web Crypto. Raw results stay under `.work/`.

This establishes only the named local correctness behaviors. Full-ledger scan cost, production index strategy, endpoint/root policy, mainnet finality, cycle capacity, reproducible Wasm, wallets, real funds and settlement remain open gates.
