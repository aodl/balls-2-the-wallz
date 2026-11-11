# Populated application review

These are actual maintained observer components and canonical disposable fixtures,
served over loopback and rendered by Chromium 153/ANGLE SwiftShader. No generated
mock-ups or real payments. Emulated viewport/DPR is not a physical phone or GPU.
The final financial text is 14px; browser assertions verify its rendered size.

- `before-*`: starting ordinary runtime inputs at 5279625, identical to deployed 662f905.
- `after-*`, `refinement-*`: final runtime feb2ed6 (all app inputs in the frozen manifest).
  Desktop, 390×844 and 320×640 recordings use real mouse/touch events, including
  immediate selection/conditional Focus, fixed toolbar expansion/switching,
  original-tile preservation/cancellation, Build ghost, exact native copy and
  Update/Keep, immediate verified-ball follow, max-zoom no-op, rapid wheel input,
  waiting, precision/caret retention, contracted viewport and reduced motion.
- `*-fire.png` shows the top of the settled action. `*-refined-payment.png` is
  intentionally scrolled to the fee/risk section; it is not a clipped empty form.
  `*-stable-build.png` follows an optional precision selection and may retain its
  deliberate scroll position. One scroll exposes every amount/recipient/memo/payer.
- `slow-*` footage compares actual wall-time 0.01/0.05/1supported-rate fixtures,
  following the same displayed ball to keep it visible. Normal uses the existing
  verified warm-resume path. Source timestamps and actual displayed logical advance
  are recorded in `motion-visibility.json`; this is not production cadence evidence.

Browser video can omit the native OS cursor. Shared cursor/hover input and local
reticle asset remain tested; no fake in-app pointer was added. Genuine rendered
hidden-tab execution, native mobile keyboard, hardware performance, real wallet
and assistive-technology usability were not established here. Controlled CSS
animation timestamps are separate from the recorded unmodified transitions.

Every file is SHA-256 indexed in [index.json](index.json). The release report maps
these media to exact source/artifact/test identities and records all failures.
