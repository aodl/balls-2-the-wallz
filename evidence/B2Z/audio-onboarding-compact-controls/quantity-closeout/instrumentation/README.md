# Raw executed instrumentation

These runners were executed from `.work/quantity-closeout/` at the repository root;
relative imports and retained raw-output paths intentionally reflect that execution.
They are audit material, not a replacement qualification framework. Restore them to
that location (using fresh output directories) before replaying them. The unchanged
negative planner can be recovered with `git show fc2d9e1:apps/b2z-observer/quantity-placement.mjs`.
Keep prior outputs; each browser runner rejects an existing output directory.

The portable maintained acceptance entry points are:

```sh
node --test tests/js/quantity-dock.test.mjs
python -B tools/verify_quantity_browser.py --output .work/new-quantity-acceptance
python -B tools/verify_refinement_browser.py --output .work/new-refinement --video
```

Use the pinned browser environment and setup in the operator documentation. The
retained canonical scene proves rendering/composer/input behavior, not IC authenticity.
`frozen-readiness-settled.py` serves the exact retained freeze against read-only
mainnet and blocks update endpoints. `native-tabs.py` uses ordinary sandboxed
Chromium with real same-window tab visibility; it does not run the audio engine or
prove physical-device output. No runner authorises deployment, funding or payments.
