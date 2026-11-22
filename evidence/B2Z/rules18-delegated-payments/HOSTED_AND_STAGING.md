# Rules18 hosted qualification and European frontend staging

The qualified source is `351d96d7059f7f84957af1470c86a7028c588392`.

| Artifact | SHA-256 |
| --- | --- |
| Embedded frontend | `da3fccaaec5d2c1828a9ca53bdf979cd6d8a95be9398b8c4ad17ee8d53d49b55` |
| Normal backend | `43095677376fe4f3c66185b1cf185ef9e161b5c44320609b93e134a771f4bf59` |

All seven standard jobs passed, including the historical installed-IC suite
and its official Ledger/Index pricing test. The standard and dedicated
financial jobs used identical backend bytes. The hosted embedded frontend
also matched the independent local build byte-for-byte.
[Standard verification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109997)

Both delegated jobs passed. The disposable official Ledger accepted the
funding owner's approval and separately ordered grant. The browser SDK
signer spent against its allowance and the game attributed the receipt to
the funding account. The exact retry recovered one lost response as a
duplicate. The game rejected the unrelated spender and the transfer after
revocation. The Ledger rejected a stale expected allowance. A manual
payment succeeded afterward. Independent authenticated replay matched all
17 captured publications, including state, events and scores.
[Delegated qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45077109925)

## Live staged frontend

The exact embedded module was installed on `s2jxj-liaaa-aaaas-amynq-cai`
on 22 November 2026. Fresh signed IC HTTP v2 responses verified 89 assets,
six gzip variants, 60 FLAC files, 28 alternate GET/HEAD responses, branded
404 responses and rejection of a modified response body and status.
One initial probe rejected a cached certificate older than the permitted
five-minute limit. Fresh requests passed with that same limit.
[Certification summary](staging.json)

Fresh Chromium accepted the sign-in entry and native manual Copy at 1440,
390 and 320 px. The exact copied memo was `FIRE 1 37.5 1` in each viewport.
[Browser results](staged-browser.json) · [1440 px](staged-ii-1440.png) ·
[390 px](staged-ii-390.png) · [320 px](staged-ii-320.png)

The authenticated backend remained on Rules17 with Schema9 and Adapter11.
Payment admission remained open in one-tick Trickle. The paid world still
had four Reservoirs, two Cannons, two Balls and one Diverter, with
108,100,000 e8s received and cursor 40,647,923. Independent replay from
the certified pre-installation checkpoint reproduced state, event and score
bytes for all three captured successors with the same Ledger cursor.
Backend liquid cycles were
1,958.887B at the staged-world check. The frontend upgrade window used
184.519B cycles and left 99.764B above the freezing floor and the combined
304B compatible recovery, staging and contingency allowance. Both canisters
follow the zero-snapshot policy.

The owner-controlled Internet Identity ceremony on the European origin is
pending. The staged frontend supports a signed read-only Ledger fee query.
Production delegated payments remain gated until real sign-in succeeds and
the [state-preserving backend release](RELEASE_SEQUENCE.md) completes.
