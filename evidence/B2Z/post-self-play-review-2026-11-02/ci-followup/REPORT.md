# Exact-commit CI prerequisite correction

Run 41436115233 tested pushed source
`d7b7ee1ef319d926558765d654744c97b7023195` and failed Native conformance.
Its public native-evidence archive was retrieved through
https://nightly.link/aodl/balls-2-the-wallz/actions/runs/41436115233/native-evidence.zip
(the direct unauthenticated GitHub logs endpoint returned 403).

The definitive artifact identifies exactly one failed native subcheck:
`agent-native-forecast-equality`. Node could not import the installed DTR
canonical module because the native workflow never ran npm installation. All
other eleven native subchecks passed, including Rust tests, public byte checks,
formatting and clippy. This is a CI dependency prerequisite defect, not a failed
gameplay equality assertion. The original failure is preserved alongside this report.

The correction adds `npm ci --ignore-scripts` after Node setup in the native job,
using the unchanged committed lockfile and vendored DTR archive. No game, agent,
backend, dependency version or authenticated identity changes.

Local verification: the twelve-check native CI suite completed OVERALL PASS.
A fresh locked npm installation succeeded, then all twenty exact fixture/forecast
comparisons, work-limit handling and artifact-mismatch rejection passed again.

The corrective workflow commit still requires operator push and successful
exact-commit CI. These local results do not turn the failed remote run into PASS.
No spending, deployment or campaign restart occurred.
