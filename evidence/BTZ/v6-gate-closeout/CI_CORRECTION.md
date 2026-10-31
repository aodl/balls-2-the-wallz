# Definitive CI failure — two stale installed-test expectations

[CI 41205667919](https://github.com/aodl/balls-2-the-wallz/actions/runs/41205667919)
finished **FAIL** on exact published head `3bddd886…`. Source, Native, Wasm,
Browser HTTP/Web Crypto and clean-consumer jobs passed. The installed-IC job
records **49 PASS / 2 FAIL**, with all other substantive checks retaining their
original results. Its complete 26 MB artifact was downloaded and verified against
GitHub's published SHA-256 `ef227935ef988237a1e13bbbeb4eb60505d55f7465bda380fb419176d09c6366`.

The two actual failures were:

1. `deployed_bundle_live_index_payments_reconnect_and_upgrade` passed certified
   join, receipt and no-refresh presentation, then expected `Add a ball` at
   `#prepared-action`. The current observer deliberately renders `Fire balls`.
2. `public_runtime_health_is_bounded_operational_and_anonymous` passed its health
   checks, then expected phrases from the old API document. The current bounded
   document explicitly distinguishes uncertified typed replies, operational
   health, external-wallet payments and absence of player controller operations.

Only these test expectations change. The browser now checks `Fire balls`; the
document check retains its 4,096-byte bound and checks the current explicit
uncertified/operational/read-only statements. No application code, lockfile,
public method, Wasm, frontend, transport timeout or v6 receipt/capture assertion
changes. The rebuilt native harness is
`7b2d6efdd9dce0a67171a9ad7694044008306f04b6f4c3a9435556e6a408d009`.
Rust formatting and four representative-playback helper tests pass. The affected
installed health/API-document test passes using exact frozen normal Wasm
`b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e`.
The corrected default browser flow still requires the applicable new CI result;
no local PASS is invented for it.

The ordinary integration artifact explicitly lists
`playability_installed::paid_island_upgrade_rehearsal` as **ignored**. Its workflow
does not enable `B2Z_PLAYABILITY_BROWSER=1`. Thus no complete equivalent final v6
browser case executed in that CI run. The ordinary CI normal module is separately
identified as `216ba07e1a116bab2d580196823e2c310b460d5148bea5e38b2211884ba62e96`;
it is not substituted for the frozen deployment module. Its production app
does match the proposed `ba2c8478…` byte-for-byte.

The existing full v6 scenario, with paid-v5 preservation, transition, same-page
actions/receipts, 45-second representative playback, elapsed expiry, complete wire
capture, independent replay and reconnect, has **not** been rerun yet. The prior
head-34→64 receipt-loss FAIL remains unchanged. All assets were prebuilt through
the existing supported path; any further builds must finish before that execution.

Four companion sessions acknowledged a compute hold. Their holds were explicitly
released when the ordinary CI failure required further diagnosis/building. A
separate active Jupiter validation chain remains outside those sessions' ownership;
the operator was asked to coordinate it, rather than killing unrelated tests.
That build-free interval still needs to be arranged before the next full case.

Insufficient mainnet funding gates deployment only. No new live query, update,
financial operation or funding request occurred in this continuation. Existing
cost/capacity/historical evidence is reused. This correction is not a v6 GO or a
claim that ordinary green jobs replace the required paid/browser gate.

[Machine-readable review](ci-correction.json) and `CI_CORRECTION_SHA256SUMS`
preserve final CI metadata, original failed logs and focused correction results.
