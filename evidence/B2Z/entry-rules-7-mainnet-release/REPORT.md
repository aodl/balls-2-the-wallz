# B2Z entry rules 7 — deployed and resumed

The authorized first-entry fix is live on the existing backend and public site.
A new player can acquire the safe 3×3 patch furthest from the nearest retained
cannon on the 1000×1000 torus, regardless of territory colour. Cannons, closed
ball occupancy and existing island connectivity remain protected; only the nine
seed cells transfer. Ties use the lowest row-major centre. Historical v6 entry
keeps its original meaning. Additional cannons still require legal adjacency.

## Exact deployed identities

- Qualified published source: `d242d3098b1a0bdbce016f5cf091a40e0971005e`.
- CI [41350813269](https://github.com/aodl/balls-2-the-wallz/actions/runs/41350813269): **PASS** on that exact source.
- Backend `s34gv-3qaaa-aaaar-qcifa-cai`, normal Wasm:
  `cfcf6130432a040a40738627df65da65d0d5c57195c04d3bb147a848af6d8303`.
- Public app SHA-256:
  `ddebfaf3fbc43b3d0b0eb1139c5e35ce0e8d5a3077bdb9f226393c5e2edd778a`.
- Observer `s45ab-wiaaa-aaaar-qcifq-cai`, unchanged asset-canister module:
  `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Entry rules hash:
  `982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f`.
- Configuration:
  `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80`.
- **Epoch index 4**:
  `4fb7adbb6e71fa4b0333988167d5e13c1a41c14173f154cdba1aafba9c0cd7a4`.
- Activation publication **81224**, logical boundary **135375**.
- World schema remains **6**, schema hash
  `b1ebc114f7d06be5e170cb75ffdc3dee148b7e3a9cb24b563a4401adb69cd790`.
- Memo adapter remains **4**; DTR remains
  `282d709143dacb4bca769a4d6e72b97fc93ef518`.

The frozen normal module was built at `de34a68`; subsequent client/test changes
and CI-qualified source are recorded in the local qualification report. Later
commits contain release evidence only. The operator explicitly authorized release
before the later user-owned PR #6 merge. No remote Git operation was performed.

## Executed release and preservation

The operator's top-up was confirmed by a fresh **4.764523630778T liquid** reading,
above the retained **3.357988370090T** release/recovery guard. Gameplay alone was
paused. Source/treasury maintenance continued under its captured settings.
The exact frozen normal Wasm was installed in **upgrade** mode with `()`.

Genuine IC certificate verification confirms the expected old/new modules,
original two controllers and existing **34-node fiduciary subnet**. All **89**
captured publication/artifact/source/configuration files survived the code
upgrade byte-for-byte. Fresh certificates are independently verified, rather
than compared for equality because their observation times legitimately differ.
Treasury durable fields/plans, totals, receiving account, source cursor and
historical publications remain intact.

After publishing the exact compatible frontend, the public browser authenticated
the old-rule world. The backend independently measured Ledger watermark
**39,963,385** and Index synchronization **39,963,386**, drained the source fence,
and committed against predecessor manifest
`94cc41e707bf2ff0470a3c50b10c7cd34a1c74c4366ee318c7d03b2cc1755788`.
The complete world is byte-identical at activation, with state hash
`6441220bc20a32d40de31abddd4acd0da9e0f80c3a012ee848cc1e732b449e85`.
The cannon, three balls, both credit records, deadlines and **620,000,000 e8s**
received accounting are preserved. Source cursor remains **39,711,127**; it is
not replaced with the global Ledger watermark. Epoch 3 remains the predecessor.
The independently checked client checkpoint content binds all cutover facts.

Captured run configuration was restored (one logical tick per publication,
pacing setting 1, work budget 512). The actual natural selection is **Survival,
0.10 ticks/s**, with no performance limitation or source/treasury error. Gameplay
is running. No reinstall, reset, controller/subnet change, downgrade, transfer,
manual payment replay or cycles purchase was performed.

[Upgrade preservation](upgrade-preservation.json) · [Activation proof](activation.json) ·
[Certified module/controller/subnet checks](certified-modules.json).

## Public browser and quote

**PASS:** one existing public page accepted **12 consecutive authenticated heads,
81223–81234**, through the new epoch and resumed play. There were **zero reloads,
resyncs, delivery failures and page errors**. The final phase is PLAYING; complete
wire capture finalized at head 81234 with no pending response bodies. This is a
short production canary, not a repetition of the local sustained qualification.

**PASS:** an anonymous `New {angle:0, quantity:2, cell:none}` quote for the public
expander account returns **110,000,000 e8s / 1.1 ICP excluding fee**, maximum fill
2, exact memo bytes `c6000002ffffff00`, no price reservation. The typed reply is
explicitly uncertified; its publication/state reference and amount/memo/destination
are independently matched against the authenticated snapshot at head 81229.
The board is fully coloured. No payment was submitted to demonstrate this.
[Exact public quote evidence](public-quote.json).

Prices/capacities remain unchanged: first cannon 1 ICP with its first ball;
additional balls use sequential 0.1 ICP × max(1,pool)²; additional cannons cost
1 ICP × (retained cannon count+1)². Actual limits remain 128 cannons, 64 total
balls, 64 per island pool and 16 retained cannons per paying account.

## Cycles, validation and remaining boundaries

At **22:25:03 UTC, 1 November 2026**, liquid cycles are **4.694313569926T**.
The comparable query window declines **7,378,704,033 cycles over 73.20117s**,
equivalent to about **0.363T/h net** for that short interval. This includes
maintenance/call effects and is neither gross billed burn nor a runway estimate.
The separate initial callback meter reports about 6.85T/h from two samples that
include release work/current-message reservation effects; that transient readout
must not be treated as a steady operating-cost measurement. Raw health/sample
boundaries and the short query comparison are retained for diagnosis.

The exact 220.444s disposable-IC upgrade/first-entry/browser rehearsal and independent
131-publication/two-payment replay remain PASS. Its two earlier failed attempts
are preserved; the local asset allowlist and actual observer checkpoint defect
were fixed before production. Relevant Rust/JS, source, Candid, browser and final
CI evidence is reused within its executed scope. No broad qualification was
restarted on mainnet. [Local qualification](../farthest-entry-2026-11-01/REPORT.md).

EH remains disabled with the existing 60-second independent Index fallback.
MCP discovery/terms opt-in remains inactive; no connector payment workaround was
introduced. Ordinary agent APIs remain read-only convenience replies bound by
independent authenticated inspection.

**No real ICP was spent by test players.** The new entry rule is ready for their
ordinary use, but campaign funding, explicit spending caps and the aftermath
choice remain separate requirements before autonomous paid play. No player
identity was installed as a backend controller. PR merge and remote publication
of this evidence remain operator-owned.

[Release verification and cycle observations](verification.json) ·
[Before desktop](before-desktop.png) · [After desktop](after-desktop.png) ·
[After mobile](after-mobile.png).
