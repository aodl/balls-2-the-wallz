# Captured verification methods

These are the operator-side harnesses used for this release. Their relative paths assume a copy in `.work/european-rules12-release` and execution from the repository root. Capture scripts use the reviewed DTR/IC SDK packages. Certificate freshness was checked during capture. To replay stored artifacts offline independently of certificate expiration, run the two `verify-*.mjs` scripts against the stored directories under `../wire`. Use the ready status for the corresponding epoch from `../signed-queries`.

`verify-segments.mjs` uses the JS B2Z kernel and the authenticated lifecycle timestamp recorded in each segment. It compares exact state, events, and scores. `verify-epoch.mjs` independently recomputes the application transition metadata and verifies exact predecessor bytes or reverse projection. Certificate paths and retention links were verified by `snapshot.mjs` at capture. The browser harnesses blocked outgoing IC ingress other than the query and read-state methods. Clipboard paste targets were local text fields.

`call-controller.sh` is retained to document the exact calls made during authorised maintenance. Several methods are state-changing. The evidence can be reviewed and replayed without running that script against production. Browser artifacts contain screenshots and summaries, and exclude browser profiles.
