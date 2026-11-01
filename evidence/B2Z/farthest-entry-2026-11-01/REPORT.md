# B2Z farthest-entry fix — qualified locally, production activation pending

First joins can now acquire a safe 3×3 patch on coloured territory. Its centre
maximises distance to the nearest retained cannon using exact squared toroidal
distance; ties use the lowest row-major cell. Cannons, closed ball occupancy and
existing island connectivity are protected. Only the nine seed cells transfer.
The first/new-cannon prices, batch rules, account authority, capacities, physics,
credits and 24-hour lifecycle are unchanged. Additional cannons still use adjacency.

This is rules 7 with **unchanged world schema 6 and memo adapter 4**. Historical
v6 retains neutral-only placement. There are no DTR changes, historical-golden
rewrites, payment/source resets or new gameplay canisters.
[Exact rule and activation contract](../../../docs/specs/B2Z_ENTRY_RULES_7.md).

## Candidate and actual production baseline

- Rules implementation/build: `de34a68529b8d3a724e2c4b174d2d8c51f1f9f33`.
- Local-server correction: `64b3c3c66d5adc7b87382659c8934c549d774dc8`.
- Qualified client/replay correction: `9bd1935` (full commit in qualification JSON).
- Frozen normal backend: `cfcf6130432a040a40738627df65da65d0d5c57195c04d3bb147a848af6d8303`.
- Prepared production app: `ddebfaf3fbc43b3d0b0eb1139c5e35ce0e8d5a3077bdb9f226393c5e2edd778a`.
- Entry rules: `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`.
- Entry configuration: `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`.
- Preserved schema: `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
- Unchanged DTR: `282d709143dacb4bca769a4d6e72b97fc93ef518`.

The 20:59:22 UTC read-only IC certificate check still reports production backend
`b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e`,
observer module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`,
the original two controllers and the 34-node fiduciary subnet. This task has not
published the new assets, upgraded production or activated rules 7.
[Certified metadata result](production-readonly.json).

## Executed qualification

**PASS:** 1,633 JavaScript tests on the implementation before the final six-line
client checkpoint correction; 43 affected entry/presentation tests and 18
checkpoint/history replay tests pass with that correction (overlapping suites).
The final correction adds two tests. Rust host 48 tests pass, including the
fourth authenticated epoch branch and preserved paid/source/deadline fields.
Native Rust/JS exact comparison passes all nine new vectors, including the
128th cannon and four sequential new players. Existing native recovery/session
checks pass. Source structure and all 194 Python tool tests pass after correcting
the explicit source export inventory; the plan-specific tests also pass.

**PASS:** `entry_installed::full_world_upgrade_and_first_entry`, explicitly run
with `--ignored --exact --nocapture --test-threads=1`, finishes in **220.444s**.
All compiler builds finish before execution; both asset builds precede Chromium.
The owned PocketIC uses a 34-node fiduciary subnet and checksum-pinned upstream
valueless ICP Ledger/Index. The initial fully owned world is explicitly synthetic
setup. Test hooks are removed before qualified payment/actions by installing the
exact production predecessor normal module. No real ICP or player key is used.

The case proves an existing paid FIRE, unfinished operation preservation through
the exact normal-module upgrade, rejected non-controller cutover calls, source
fencing, exact complete-world/financial-state preservation at activation and
idempotent matching transition retry. In one already-open authenticated browser,
the old full-board quote is blocked, the new rule becomes available without
camera movement, and `NEW 0 2` quotes exactly **1.1 ICP excluding fee**. Real
valueless transfer position 3 receives a genuine **applied, 2/2 balls, 1.1 ICP
used, zero retained** receipt. The browser displays two cannons/six balls and
selects the new own cannon, with **zero navigation/reloads** and no page errors.

Receipt observation takes **48.477s** from reading the Ledger-accepted position
signal, including ordinary Index/source discovery. The subsequent **19.876s** is
an upper bound through the visible-count checks, UI interaction and screenshots;
it must not be presented as an exact rendering-latency measurement. The browser
head list includes a 62→88 catch-up jump, so this is not evidence of receiving
every intermediate publication. The required purchase receipt is actually
observed and asserted; entities alone are never treated as a receipt.

Complete browser capture finalization passes at head 129, with no pending bodies.
Independent JS replay matches **131 exact publications, 130 gameplay segments,
one application checkpoint and exactly two assigned payment positions (2,3)**.
This installed fixture starts with schema-6 genesis and therefore exercises its
first DTR epoch. Production has retained earlier epochs; the native fourth-epoch
branch and first/subsequent checkpoint content cases cover that distinction.
Previously qualified historical migration/cost evidence is reused, not rerun.

The measured local cycle window uses **117,540,005,428 cycles**, including upgrade,
cutover, simulation, source and artifact operations. This is not isolated join
cost, a billed mainnet rate or a runway claim. The 127-cannon pure screen takes
5,438 bounded work units; it is not a new maximum-population throughput claim.

[Structured results and preserved failure hashes](qualification.json).
[Prepared production frontend files](prepared-frontend-manifest.json).
Raw results remain in `.work/b2z-entry/`.

## Failures diagnosed and retained

1. `installed-fail-configuration-asset`: local server returned HTTP 404 for the
   new configuration. The narrow allowlist correction and 18 HTTP tests pass.
2. `installed-fail-checkpoint`: observer misclassified the entry-rule checkpoint
   as lifecycle expiry, resynchronised and missed the receipt. The client now
   checks the exact identities, committed complete metadata and byte-identical
   preserved world. Self-consistent changes to paid state, elapsed time, source,
   memo adapter, identity or cutover data remain failures. Independent replay
   also handles the fixture's first epoch. Authentication is unchanged.
3. CI `41349167166`, published head `64b3c3c`, has a source-job **FAIL**. The local
   source check reproduces `application export drift`: its explicit inventory
   omitted the three new controller-only transition methods. The corrected check
   passes without widening the interface allowlist to arbitrary methods. Public
   job-log download returned 403, so other CI failures are not ruled out solely
   from annotations. Final updated-head CI still needs publication.

No failed receipt assertion was removed, no missing events were manufactured and
no waits or certificate rules were relaxed.

## Working checks and release boundary

```sh
node tools/entry_vectors.mjs --check
node --test --test-concurrency=1 tests/js/entry-v7.test.mjs tests/js/observer-checkpoint-v9.test.mjs tests/js/replay-playability-history.test.mjs
cargo test --manifest-path native/Cargo.toml -p b2z-native --test entry --locked --offline
python3.11 -B tools/check_source.py
```

The complete installed case is deliberately ignored by ordinary CI. Compilation,
ordinary green jobs and a source inventory check are not substitutes for the
explicit execution recorded above. The final CI/evidence changes do not alter
the qualified backend or frontend bytes.

Remaining: publish the final branch, require successful applicable CI/review,
then separately authorise the production backend upgrade and authenticated entry
activation under the current agent mandate. Use the existing gameplay-only
pause/source fence/preservation/upgrade/client/epoch/resume sequence. Check fresh
cycles and the retained recovery guard at that stage; no stale funding amount
is quoted here. Remote Git remains user-owned under the supplied AGENTS.md.

No funded test-account play or ICP transfer has occurred. Campaign spending and
its aftermath policy still require explicit approval after production is ready.

## Screenshots — disposable arena only

[Before join / quote](before-join-desktop.png) ·
[After join desktop](after-join-desktop.png) ·
[After join mobile](after-join-mobile.png)
