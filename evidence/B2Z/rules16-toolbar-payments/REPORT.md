# Rules16 frontend release

Released on 2026-11-22 to the existing European frontend `s2jxj-liaaa-aaaas-amynq-cai`.

- Qualified source `0b520b781448b364f6926029a86b516790ca4474`
- Certified installed embedded Wasm `8cb0d9e375d84c7ca969fbcbc1a9ba2404e9d55afc3d728283ecf723a10e034d`, 77,140,775 bytes
- Recovery frontend Wasm `a9e40a917f8ec45513824b1c2751cf2cac3bd36f5a303a05ba98575ed779d5a6`
- [Hosted source, browser and reproducibility qualification](https://github.com/aodl/balls-2-the-wallz/actions/runs/45039264796)

The five-button empty-tile toolbar includes a 44px Build Reservoir control with a monochrome droplet and accessible name. Cannon is the initial selection. Explicit Reservoir selection stays active across tiles. Choosing another tile or action immediately prepares the corresponding proposal under verified Rules16, while old copied instructions remain visible in Account history. Invalid proposals clear the payment fields and disable Copy. Move arrows use the board geometry and retain their length underneath the HTML panel.

Hosted Chromium passed the 1440px, 390px and 320px Reservoir and Move cases, keyboard contraction, exact native clipboard, manual fallback, invalid sites, account history and restored authority. The Move fixtures covered Cannon and Diverter with a real overlay intersection, all four orientations and an offscreen source. The original browser fixture timeout came from mapping successive cells to the same desktop click coordinates. Distinct desktop clicks and native mobile taps preserved the exact-cell assertions. The account-history test now checks the original memo bytes after reload and confirms a new selection opens a fresh proposal. Two local and two hosted Wasm builds matched. The installed disposable also passed the official Ledger/Index receipt test with nine independently replayed publications using the unchanged backend.

Live Chromium passed the toolbar, consecutive Reservoir, native clipboard, history and Cannon Move checks at all three widths. It copied `RESERVOIR 999999`, then `RESERVOIR 999`, as well as the exact `0.01` amount and recipient. Diverter Move overlap was exercised in the hosted fixture because the authenticated live world contained no Diverter. The live HTTP verification authenticated 87 assets, six gzip variants and 28 alternate GET/HEAD cases, including branded 404 and rejection of altered proof data. Audio hashes matched the previous release.

- [Fixture screenshots](visual/README.md)
- [Live desktop](production/1440-toolbar-and-quote.png), [390px](production/390-toolbar-and-quote.png), [320px](production/320-toolbar-and-quote.png)
- [Live browser results](production/browser.json), [certified HTTP results](production/certification.json), [backend and resource measurements](production/preservation.json), [independent live replay](production/replay.json)

The frontend-only upgrade drew 184,123,893,187 cycles across the immediate balance samples. The post-installation balance was 1,161,922,660,102 cycles with a modeled freezing floor of 202,793,003,670 cycles. After a 190B compatible recovery upgrade, 64B temporary chunk allowance and 50B contingency, 655,129,656,432 cycles remained above the budget. The existing recovery Wasm is retained and the frontend has zero snapshots.

The certified backend module remained `a5889a92ce936b035d02632588b75ae7f66ddfda73398177dd79cba2b5b48dcd`, with Rules16, Schema8, Adapter10 and one-tick Trickle. The Ledger cursor stayed at 40640535 and retained payment history and received amount stayed unchanged. Independent replay reproduced the next certified publication byte for byte. No production payments, funding, snapshots or backend writes were performed.
